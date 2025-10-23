/*
  # Fix Price Tiers Validation Trigger

  ## Problem
  The existing trigger validates tiers AFTER each row insertion, causing issues when
  inserting multiple tiers at once. The first tier inserted triggers validation
  before other tiers are inserted, leading to false errors.

  ## Solution
  Change the trigger to execute AFTER the entire statement completes (FOR EACH STATEMENT)
  instead of after each row (FOR EACH ROW). This allows all tiers to be inserted first,
  then validation runs once on the complete set.

  ## Changes
  1. Drop the existing row-level trigger
  2. Create a new statement-level trigger that validates after all inserts/updates complete
  3. Update the validation function to work with statement-level triggers
*/

-- ============================================================================
-- 1. DROP EXISTING TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS validate_price_tiers_trigger ON product_price_tiers;

-- ============================================================================
-- 2. CREATE NEW VALIDATION FUNCTION FOR STATEMENT-LEVEL TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_all_price_tiers_for_product()
RETURNS TRIGGER AS $$
DECLARE
  product_record RECORD;
  tier_count integer;
  first_tier_min integer;
  null_max_count integer;
  has_overlaps boolean;
  has_gaps boolean;
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

    -- Check that first tier starts at 1
    SELECT MIN(min_quantity) INTO first_tier_min
    FROM product_price_tiers
    WHERE product_id = product_record.product_id;

    IF first_tier_min != 1 THEN
      RAISE EXCEPTION 'Price tiers must start from quantity 1 for product %, currently starts at %',
        product_record.product_id, first_tier_min;
    END IF;

    -- Check that only one tier has NULL max_quantity
    SELECT COUNT(*) INTO null_max_count
    FROM product_price_tiers
    WHERE product_id = product_record.product_id AND max_quantity IS NULL;

    IF null_max_count > 1 THEN
      RAISE EXCEPTION 'Only the last tier can have unlimited (NULL) max_quantity for product %',
        product_record.product_id;
    END IF;

    -- Check for overlaps
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

    -- Check for gaps
    SELECT EXISTS (
      SELECT 1
      FROM product_price_tiers t1
      WHERE t1.product_id = product_record.product_id
        AND t1.max_quantity IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM product_price_tiers t2
          WHERE t2.product_id = product_record.product_id
            AND t2.min_quantity = t1.max_quantity + 1
        )
        AND NOT EXISTS (
          SELECT 1
          FROM product_price_tiers t3
          WHERE t3.product_id = product_record.product_id
            AND t3.max_quantity IS NULL
            AND t3.min_quantity = t1.max_quantity + 1
        )
    ) INTO has_gaps;

    IF has_gaps THEN
      RAISE EXCEPTION 'Price tiers cannot have gaps in quantity ranges for product %',
        product_record.product_id;
    END IF;

  END LOOP;

  RETURN NULL; -- For AFTER trigger, return value is ignored
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_all_price_tiers_for_product IS
  'Validates all price tiers after a complete INSERT/UPDATE statement completes';

-- ============================================================================
-- 3. CREATE NEW STATEMENT-LEVEL TRIGGER
-- ============================================================================

CREATE TRIGGER validate_price_tiers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON product_price_tiers
  FOR EACH STATEMENT
  EXECUTE FUNCTION validate_all_price_tiers_for_product();

COMMENT ON TRIGGER validate_price_tiers_trigger ON product_price_tiers IS
  'Validates price tier integrity after each statement (not per row)';
