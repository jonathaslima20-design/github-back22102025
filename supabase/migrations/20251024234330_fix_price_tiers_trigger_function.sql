/*
  # Fix Price Tiers Trigger to Use Updated Validation Function
  
  ## Problem
  The trigger `validate_price_tiers_trigger` is still calling the old function 
  `validate_price_tiers_after_change()` which enforces:
  - Tiers must start at quantity 1
  - Tiers cannot have gaps
  
  ## Solution
  1. Drop the old validation function
  2. Update the trigger to use `validate_all_price_tiers_for_product()`
  3. This allows flexible tier structures like 10-30, 50-100, 100+ units
  
  ## Validations Maintained
  - At least one tier exists
  - Only last tier can have unlimited max_quantity
  - No overlapping ranges
  - Valid min < max for each tier
  - All prices > 0
  - Discounted price < unit price
*/

-- Drop the old trigger
DROP TRIGGER IF EXISTS validate_price_tiers_trigger ON product_price_tiers;

-- Drop the old validation function
DROP FUNCTION IF EXISTS validate_price_tiers_after_change();

-- Recreate the trigger using the updated validation function
CREATE TRIGGER validate_price_tiers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON product_price_tiers
  FOR EACH STATEMENT
  EXECUTE FUNCTION validate_all_price_tiers_for_product();

COMMENT ON TRIGGER validate_price_tiers_trigger ON product_price_tiers IS
  'Validates price tiers after any insert/update/delete operation with flexible quantity ranges';
