/*
  # Add has_tiered_pricing Column to Products Table

  ## Overview
  This migration adds the `has_tiered_pricing` boolean column to the products table,
  which is required for the tiered pricing system to function properly.

  ## Changes

  ### products table modifications:
  - Add `has_tiered_pricing` (boolean, default false) - Flag indicating if product uses tiered pricing
  - Add index on `has_tiered_pricing` for query performance

  ## Purpose
  - Enable products to use either simple pricing (single price) or tiered pricing (quantity-based pricing)
  - Provide a clear flag to determine which pricing model to use when displaying products
  - Support backward compatibility: existing products default to simple pricing (false)

  ## Important Notes
  - This column must exist BEFORE the product_price_tiers table is created
  - When `has_tiered_pricing = true`, the product uses quantity-based pricing from product_price_tiers
  - When `has_tiered_pricing = false`, the product uses the regular `price` column
  - Default value is `false` to maintain backward compatibility with existing products
*/

-- Add has_tiered_pricing column to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'has_tiered_pricing'
  ) THEN
    ALTER TABLE products ADD COLUMN has_tiered_pricing boolean DEFAULT false;
  END IF;
END $$;

-- Add index for better query performance when filtering by pricing mode
CREATE INDEX IF NOT EXISTS idx_products_has_tiered_pricing
  ON products(has_tiered_pricing);

-- Add comment to document the column
COMMENT ON COLUMN products.has_tiered_pricing IS
  'Flag indicating if product uses tiered pricing (true) or simple pricing (false). When true, pricing comes from product_price_tiers table.';
