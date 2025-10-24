/*
  # Permitir Faixas de Preço com Início Flexível

  ## Mudanças
  1. Remove a validação que obriga a primeira faixa começar em quantidade 1
  2. Remove a validação de gaps entre faixas (permite faixas descontínuas)
  3. Mantém validações de:
     - Pelo menos uma faixa de preço
     - Sem sobreposições
     - Apenas a última faixa pode ter quantidade ilimitada
     - Preços válidos (maiores que 0)
     - Quantidade mínima deve ser menor que máxima

  ## Exemplos Permitidos
  - 10-30 unidades
  - 50-100 unidades
  - 100+ unidades

  ## Notas de Segurança
  - Mantém RLS policies existentes
  - Mantém validações de integridade de dados
  - Operação continua sendo atômica
*/

-- Drop the old function
DROP FUNCTION IF EXISTS update_product_price_tiers(uuid, jsonb);

-- Create updated function with flexible validation
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
    null_max_count integer;
    has_overlaps boolean;
  BEGIN
    -- Get tier count
    SELECT COUNT(*) INTO tier_count
    FROM product_price_tiers
    WHERE product_id = p_product_id;

    IF tier_count = 0 THEN
      RAISE EXCEPTION 'Product must have at least one price tier';
    END IF;

    -- Check that only one tier has NULL max_quantity
    SELECT COUNT(*) INTO null_max_count
    FROM product_price_tiers
    WHERE product_id = p_product_id AND max_quantity IS NULL;

    IF null_max_count > 1 THEN
      RAISE EXCEPTION 'Only the last tier can have unlimited (NULL) max_quantity';
    END IF;

    -- Check for overlaps (CRITICAL: must not have overlapping ranges)
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

    -- Validate that min_quantity < max_quantity for each tier
    IF EXISTS (
      SELECT 1
      FROM product_price_tiers
      WHERE product_id = p_product_id
        AND max_quantity IS NOT NULL
        AND min_quantity >= max_quantity
    ) THEN
      RAISE EXCEPTION 'Each tier must have min_quantity < max_quantity';
    END IF;

    -- Validate that all prices are positive
    IF EXISTS (
      SELECT 1
      FROM product_price_tiers
      WHERE product_id = p_product_id
        AND (unit_price <= 0 OR discounted_unit_price <= 0)
    ) THEN
      RAISE EXCEPTION 'All prices must be greater than zero';
    END IF;

    -- Validate that discounted price is less than unit price
    IF EXISTS (
      SELECT 1
      FROM product_price_tiers
      WHERE product_id = p_product_id
        AND discounted_unit_price IS NOT NULL
        AND discounted_unit_price >= unit_price
    ) THEN
      RAISE EXCEPTION 'Discounted price must be less than unit price';
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
  'Atomically updates price tiers for a product with flexible quantity ranges (no requirement to start at 1)';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_product_price_tiers TO authenticated;