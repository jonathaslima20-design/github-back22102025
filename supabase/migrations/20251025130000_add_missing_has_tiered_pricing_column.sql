/*
  # Add Missing has_tiered_pricing Column to Products Table

  ## Problem
  The application code references `products.has_tiered_pricing` column that doesn't exist
  in the database schema, causing "column does not exist" errors when updating products.

  ## Solution
  Add the missing `has_tiered_pricing` boolean column to the products table with proper
  defaults and indexing.

  ## Changes

  1. New Column in `products` table:
     - `has_tiered_pricing` (boolean, default false) - Flag indicating if product uses tiered pricing

  2. Index:
     - Add index on `has_tiered_pricing` for query performance

  3. Data Updates:
     - Set `has_tiered_pricing = true` for any products that already have price tiers
     - Ensures data integrity between products and product_price_tiers tables

  ## Backward Compatibility
  - Default value is `false`, so existing products continue using simple pricing
  - No breaking changes to existing functionality
  - Products can be gradually migrated to use tiered pricing

  ## Important Notes
  - When `has_tiered_pricing = true`, product uses quantity-based pricing from product_price_tiers
  - When `has_tiered_pricing = false`, product uses the regular `price` column
  - This migration is safe to run multiple times (idempotent)
*/

-- Add has_tiered_pricing column to products table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'has_tiered_pricing'
  ) THEN
    ALTER TABLE products ADD COLUMN has_tiered_pricing boolean DEFAULT false NOT NULL;

    RAISE NOTICE 'Added has_tiered_pricing column to products table';
  ELSE
    RAISE NOTICE 'Column has_tiered_pricing already exists, skipping';
  END IF;
END $$;

-- Add index for better query performance when filtering by pricing mode
CREATE INDEX IF NOT EXISTS idx_products_has_tiered_pricing
  ON products(has_tiered_pricing)
  WHERE has_tiered_pricing = true;

-- Add comment to document the column
COMMENT ON COLUMN products.has_tiered_pricing IS
  'Flag indicating if product uses tiered pricing (true) or simple pricing (false). When true, pricing comes from product_price_tiers table instead of the price column.';

-- Update existing products that have price tiers to set has_tiered_pricing = true
DO $$
BEGIN
  -- Only run if product_price_tiers table exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'product_price_tiers'
  ) THEN
    UPDATE products
    SET has_tiered_pricing = true
    WHERE id IN (
      SELECT DISTINCT product_id
      FROM product_price_tiers
    )
    AND has_tiered_pricing = false;

    RAISE NOTICE 'Updated existing products with price tiers';
  END IF;
END $$;
