-- Migration: Add missing columns to card_sales and credit_sales tables
-- Run this in Supabase SQL Editor

-- ============================================================================
-- credit_sales table
-- ============================================================================

-- Add nozzle_id column (nullable, references nozzles)
ALTER TABLE credit_sales 
ADD COLUMN IF NOT EXISTS nozzle_id VARCHAR(50) REFERENCES nozzles(nozzle_id) ON DELETE RESTRICT;

-- Add notes column (nullable text)
ALTER TABLE credit_sales 
ADD COLUMN IF NOT EXISTS notes TEXT;


-- ============================================================================
-- card_sales table
-- ============================================================================

-- Add nozzle_id column (nullable, references nozzles)
ALTER TABLE card_sales 
ADD COLUMN IF NOT EXISTS nozzle_id VARCHAR(50) REFERENCES nozzles(nozzle_id) ON DELETE RESTRICT;

-- Add batch_number column (nullable string)
ALTER TABLE card_sales 
ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);

-- Add invoice_number column (nullable string)
ALTER TABLE card_sales 
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);

-- Add invoice_datetime column (nullable timestamp)
ALTER TABLE card_sales 
ADD COLUMN IF NOT EXISTS invoice_datetime TIMESTAMP WITH TIME ZONE;


-- ============================================================================
-- Verification: Check the updated schema
-- ============================================================================
-- After running the above, you can verify with:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'credit_sales';
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'card_sales';
