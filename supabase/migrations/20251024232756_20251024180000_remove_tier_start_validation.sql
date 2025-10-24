/*
  # Remove Price Tier Start Validation

  ## Problem
  The trigger function `validate_all_price_tiers_for_product()` still enforces:
  1. Tiers must start at quantity 1
  2. Tiers cannot have gaps

  This prevents users from creating flexible tier structures like:
  - 10-30 units
  - 50-100 units
  - 100+ units

  ## Solution
  Update the trigger validation function to remove these two checks while
  maintaining all other validations:
  - At least one tier exists
  - Only last tier can have unlimited max_quantity
  - No overlapping ranges
  - Valid min < max for each tier
  - All prices > 0
  - Discounted price < unit price
*/

-- Replace the validation function with updated logic
CREATE OR REPLACE FUNCTION validate_all_price_tiers_for_product()
RETURNS TRIGGER AS $$
DECLARE
  product_record RECORD;
  tier_count integer;
  null_max_count integer;
  has_overlaps boolean;
BEGIN
  -- Get all unique product_ids from the operation
  FOR product_record IN
    SELECT DISTINCT product_id
    FROM product_price_tiers
    WHERE product_id IN (
      SELECT DISTINCT product_id FROM product_price_tiers
    )
  LOOP
    -- Get tier count for this product
    SELECT COUNT(*) INTO tier_count
    FROM product_price_tiers
    WHERE product_id = product_record.product_id;

    -- Skip if no tiers (product was deleted)
    IF tier_count = 0 THEN
      CONTINUE;
    END IF;

    -- Check that only one tier has NULL max_quantity
    SELECT COUNT(*) INTO null_max_count
    FROM product_price_tiers
    WHERE product_id = product_record.product_id AND max_quantity IS NULL;

    IF null_max_count > 1 THEN
      RAISE EXCEPTION 'Only the last tier can have unlimited (NULL) max_quantity for product %',
        product_record.product_id;
    END IF;

    -- Check for overlaps (CRITICAL: must not have overlapping ranges)
    SELECT EXISTS (
      SELECT 1
      FROM product_price_tiers t1
      JOIN product_price_tiers t2 ON t1.product_id = t2.product_id AND t1.id != t2.id
      WHERE t1.product_id = product_record.product_id
        AND (
          (t1.min_quantity <= COALESCE(t2.max_quantity, 999999) AND
           COALESCE(t1.max_quantity, 999999) >= t2.min_quantity)
        )
    ) INTO has_overlaps;

    IF has_overlaps THEN
      RAISE EXCEPTION 'Price tiers cannot have overlapping quantity ranges for product %',
        product_record.product_id;
    END IF;

    -- Validate that min_quantity < max_quantity for each tier
    IF EXISTS (
      SELECT 1
      FROM product_price_tiers
      WHERE product_id = product_record.product_id
        AND max_quantity IS NOT NULL
        AND min_quantity >= max_quantity
    ) THEN
      RAISE EXCEPTION 'Each tier must have min_quantity < max_quantity for product %',
        product_record.product_id;
    END IF;

    -- Validate that all prices are positive
    IF EXISTS (
      SELECT 1
      FROM product_price_tiers
      WHERE product_id = product_record.product_id
        AND (unit_price <= 0 OR (discounted_unit_price IS NOT NULL AND discounted_unit_price <= 0))
    ) THEN
      RAISE EXCEPTION 'All prices must be greater than zero for product %',
        product_record.product_id;
    END IF;

    -- Validate that discounted price is less than unit price
    IF EXISTS (
      SELECT 1
      FROM product_price_tiers
      WHERE product_id = product_record.product_id
        AND discounted_unit_price IS NOT NULL
        AND discounted_unit_price >= unit_price
    ) THEN
      RAISE EXCEPTION 'Discounted price must be less than unit price for product %',
        product_record.product_id;
    END IF;

  END LOOP;

  RETURN NULL; -- For AFTER trigger, return value is ignored
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_all_price_tiers_for_product IS
  'Validates price tiers with flexible quantity ranges (no requirement to start at 1 or have no gaps)';