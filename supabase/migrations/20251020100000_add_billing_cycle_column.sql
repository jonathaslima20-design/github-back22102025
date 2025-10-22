/*
  # Add billing_cycle column to subscriptions table

  1. Changes
    - Add billing_cycle column to subscriptions table with enum type
    - Set default value to 'monthly'
    - Update existing records to have 'monthly' as default

  2. Details
    - billing_cycle: Defines the billing period (monthly, quarterly, semiannually, annually)
    - Uses enum type for data validation
*/

-- Create billing_cycle_type enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_cycle_type') THEN
    CREATE TYPE billing_cycle_type AS ENUM ('monthly', 'quarterly', 'semiannually', 'annually');
  END IF;
END $$;

-- Add billing_cycle column to subscriptions table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name = 'billing_cycle'
  ) THEN
    ALTER TABLE public.subscriptions
    ADD COLUMN billing_cycle billing_cycle_type NOT NULL DEFAULT 'monthly';
  END IF;
END $$;
