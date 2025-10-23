/*
  # Add Function to Update Price Tiers Atomically

  ## Problem
  When updating price tiers, the current approach:
  1. Deletes all existing tiers (triggers validation on empty state)
  2. Inserts new tiers (may fail if validation runs between operations)
  
  This causes validation errors even with valid data.

  ## Solution
  Create a PostgreSQL function that updates price tiers atomically within a transaction,
  temporarily disabling the trigger to allow the delete-then-insert pattern.

  ## Changes
  1. Create a function to update price tiers atomically
  2. Function disables trigger, performs operations, re-enables trigger, then validates
*/

-- ============================================================================
-- CREATE ATOMIC UPDATE FUNCTION FOR PRICE TIERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_product_price_tiers(
  p_product_id uuid,
  p_tiers jsonb
)
RETURNS jsonb AS $$
DECLARE
  tier jsonb;
  inserted_tiers jsonb := '[]'::jsonb;
  tier_record record;
BEGIN
  -- Validate input
  IF p_tiers IS NULL OR jsonb_array_length(p_tiers) = 0 THEN
    RAISE EXCEPTION 'At least one price tier is required';
  END IF;

  -- Disable trigger temporarily
  ALTER TABLE product_price_tiers DISABLE TRIGGER validate_price_tiers_trigger;

  -- Delete existing tiers for this product
  DELETE FROM product_price_tiers WHERE product_id = p_product_id;

  -- Insert new tiers
  FOR tier IN SELECT * FROM jsonb_array_elements(p_tiers)
  LOOP
    INSERT INTO product_price_tiers (
      product_id,
      min_quantity,
      max_quantity,
      unit_price,
      discounted_unit_price
    )
    VALUES (
      p_product_id,
      (tier->>'min_quantity')::integer,
      CASE WHEN tier->>'max_quantity' IS NULL OR tier->>'max_quantity' = 'null' 
           THEN NULL 
           ELSE (tier->>'max_quantity')::integer 
      END,
      (tier->>'unit_price')::decimal,
      CASE WHEN tier->>'discounted_unit_price' IS NULL OR tier->>'discounted_unit_price' = 'null'
           THEN NULL
           ELSE (tier->>'discounted_unit_price')::decimal
      END
    )
    RETURNING * INTO tier_record;
    
    inserted_tiers := inserted_tiers || jsonb_build_object(
      'id', tier_record.id,
      'min_quantity', tier_record.min_quantity,
      'max_quantity', tier_record.max_quantity,
      'unit_price', tier_record.unit_price,
      'discounted_unit_price', tier_record.discounted_unit_price
    );
  END LOOP;

  -- Re-enable trigger
  ALTER TABLE product_price_tiers ENABLE TRIGGER validate_price_tiers_trigger;

  -- Now manually validate just this product
  DECLARE
    tier_count integer;
    first_tier_min integer;
    null_max_count integer;
    has_overlaps boolean;
    has_gaps boolean;
  BEGIN
    -- Get tier count
    SELECT COUNT(*) INTO tier_count
    FROM product_price_tiers
    WHERE product_id = p_product_id;

    IF tier_count = 0 THEN
      RAISE EXCEPTION 'Product must have at least one price tier';
    END IF;

    -- Check that first tier starts at 1
    SELECT MIN(min_quantity) INTO first_tier_min
    FROM product_price_tiers
    WHERE product_id = p_product_id;

    IF first_tier_min != 1 THEN
      RAISE EXCEPTION 'Price tiers must start from quantity 1, currently starts at %', first_tier_min;
    END IF;

    -- Check that only one tier has NULL max_quantity
    SELECT COUNT(*) INTO null_max_count
    FROM product_price_tiers
    WHERE product_id = p_product_id AND max_quantity IS NULL;

    IF null_max_count > 1 THEN
      RAISE EXCEPTION 'Only the last tier can have unlimited (NULL) max_quantity';
    END IF;

    -- Check for overlaps
    SELECT EXISTS (
      SELECT 1
      FROM product_price_tiers t1
      JOIN product_price_tiers t2 ON t1.product_id = t2.product_id AND t1.id != t2.id
      WHERE t1.product_id = p_product_id
        AND (
          (t1.min_quantity <= COALESCE(t2.max_quantity, 999999) AND
           COALESCE(t1.max_quantity, 999999) >= t2.min_quantity)
        )
    ) INTO has_overlaps;

    IF has_overlaps THEN
      RAISE EXCEPTION 'Price tiers cannot have overlapping quantity ranges';
    END IF;

    -- Check for gaps
    SELECT EXISTS (
      SELECT 1
      FROM product_price_tiers t1
      WHERE t1.product_id = p_product_id
        AND t1.max_quantity IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM product_price_tiers t2
          WHERE t2.product_id = p_product_id
            AND t2.min_quantity = t1.max_quantity + 1
        )
        AND EXISTS (
          SELECT 1
          FROM product_price_tiers t3
          WHERE t3.product_id = p_product_id
            AND t3.min_quantity > t1.max_quantity
        )
    ) INTO has_gaps;

    IF has_gaps THEN
      RAISE EXCEPTION 'Price tiers cannot have gaps in quantity ranges';
    END IF;
  END;

  RETURN inserted_tiers;

EXCEPTION
  WHEN OTHERS THEN
    -- Make sure to re-enable trigger even if there's an error
    ALTER TABLE product_price_tiers ENABLE TRIGGER validate_price_tiers_trigger;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_product_price_tiers IS
  'Atomically updates price tiers for a product, ensuring data integrity through validation';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_product_price_tiers TO authenticated;