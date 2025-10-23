-- ============================================================================
-- PHASE 4B: PAYMENT TRACKING FIELDS (CRITICAL FIX)
-- ============================================================================
--
-- Purpose: Add missing Dwolla payment tracking fields to payments table
-- Status: Critical fix for webhook handler compatibility
-- Strategy: Add fields required by dwolla-webhook.ts handler
--
-- IMPORTANT: This fixes database schema mismatch found in payment-integration review
-- Estimated time: ~2 minutes
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD MISSING PAYMENT TRACKING FIELDS
-- ============================================================================

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS dwolla_transfer_url TEXT,
ADD COLUMN IF NOT EXISTS failure_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS failure_message TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

COMMENT ON COLUMN payments.dwolla_transfer_url IS 'Full Dwolla transfer resource URL (e.g., https://api.dwolla.com/transfers/uuid). Used for webhook event matching.';
COMMENT ON COLUMN payments.failure_code IS 'Machine-readable error code for failed payments (e.g., transfer_failed, insufficient_funds)';
COMMENT ON COLUMN payments.failure_message IS 'Human-readable error message displayed to users when payment fails';
COMMENT ON COLUMN payments.updated_at IS 'Auto-updated timestamp tracking when payment record was last modified';

-- ============================================================================
-- STEP 2: CREATE INDEX FOR WEBHOOK PROCESSING
-- ============================================================================

-- Critical: Webhook handler queries by dwolla_transfer_url
CREATE INDEX IF NOT EXISTS idx_payments_dwolla_transfer_url
ON payments(dwolla_transfer_url)
WHERE dwolla_transfer_url IS NOT NULL;

COMMENT ON INDEX idx_payments_dwolla_transfer_url IS 'Fast lookup of payments by Dwolla transfer URL during webhook processing';

-- ============================================================================
-- STEP 3: ADD AUTO-UPDATE TRIGGER FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER payments_updated_at_trigger
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

COMMENT ON FUNCTION update_payments_updated_at IS 'Auto-updates updated_at timestamp whenever payment record is modified';
COMMENT ON TRIGGER payments_updated_at_trigger ON payments IS 'Ensures updated_at is refreshed on every payment update';

-- ============================================================================
-- STEP 4: ADD CONSTRAINTS FOR DATA INTEGRITY
-- ============================================================================

-- Ensure payment status uses valid enum values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'payments' AND constraint_name = 'payments_status_check'
    ) THEN
        ALTER TABLE payments
        ADD CONSTRAINT payments_status_check
        CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'));
    END IF;
END $$;

-- Ensure payment type uses valid enum values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'payments' AND constraint_name = 'payments_type_check'
    ) THEN
        ALTER TABLE payments
        ADD CONSTRAINT payments_type_check
        CHECK (payment_type IN ('monthly_subscription', 'setup_fee', 'addon', 'refund'));
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify new columns added
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'payments'
AND column_name IN ('dwolla_transfer_url', 'failure_code', 'failure_message', 'updated_at')
ORDER BY ordinal_position;

-- Verify index created
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE tablename = 'payments'
AND indexname = 'idx_payments_dwolla_transfer_url';

-- Verify trigger created
SELECT
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'payments'
AND trigger_name = 'payments_updated_at_trigger';

-- Verify constraints added
SELECT
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'payments'
AND constraint_name IN ('payments_status_check', 'payments_type_check');

-- ============================================================================
-- NEXT STEPS
-- ============================================================================

-- After running this migration:
-- 1. Webhook handler (dwolla-webhook.ts) will work correctly
-- 2. Payment records can track Dwolla transfer URLs
-- 3. Failed payments will have detailed error information
-- 4. updated_at will auto-refresh on every change
-- 5. Data integrity constraints prevent invalid status values

-- ============================================================================
-- END OF PAYMENT TRACKING FIELDS MIGRATION
-- ============================================================================
