/*
  # Add billing_cycle column to subscriptions table

  1. New Columns
    - `billing_cycle` (text) - Defines the billing frequency (monthly, quarterly, semiannually, annually)

  2. Changes
    - Add billing_cycle column with default value 'monthly'
    - Add check constraint to ensure valid billing cycle values
    - Update existing records to have 'monthly' as default billing cycle

  3. Security
    - No changes to RLS policies needed
*/

-- Add billing_cycle column to subscriptions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'billing_cycle'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN billing_cycle text DEFAULT 'monthly' NOT NULL;
  END IF;
END $$;

-- Add check constraint for valid billing cycle values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'subscriptions_billing_cycle_check'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_billing_cycle_check 
    CHECK (billing_cycle IN ('monthly', 'quarterly', 'semiannually', 'annually'));
  END IF;
END $$;

-- Update any existing records to have 'monthly' as default (if they somehow don't have it)
UPDATE subscriptions 
SET billing_cycle = 'monthly' 
WHERE billing_cycle IS NULL;