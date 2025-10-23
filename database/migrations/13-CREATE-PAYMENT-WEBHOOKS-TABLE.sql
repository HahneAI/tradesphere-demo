-- ============================================================================
-- PHASE 4A: PAYMENT WEBHOOKS EVENT LOG
-- ============================================================================
--
-- Purpose: Create audit log for all Dwolla webhook events
-- Status: Pre-release (foundational for billing system)
-- Strategy: Store raw webhook payloads for debugging, replay, and audit trail
--
-- IMPORTANT: Captures ALL webhook events from Dwolla for payment processing
-- Estimated time: ~2 minutes
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE PAYMENT_WEBHOOKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE payment_webhooks IS 'Audit log of all Dwolla webhook events. Stores raw payloads for debugging, idempotency, and replay capability.';
COMMENT ON COLUMN payment_webhooks.event_type IS 'Dwolla event type (e.g., customer_funding_source_verified, customer_transfer_completed, customer_transfer_failed)';
COMMENT ON COLUMN payment_webhooks.payload IS 'Full JSON payload from Dwolla webhook for audit trail and debugging';
COMMENT ON COLUMN payment_webhooks.company_id IS 'Linked company if event relates to a company customer (extracted from payload)';
COMMENT ON COLUMN payment_webhooks.payment_id IS 'Linked payment record if event relates to a transfer (extracted from payload)';
COMMENT ON COLUMN payment_webhooks.processed IS 'True if webhook was successfully processed and side effects applied';
COMMENT ON COLUMN payment_webhooks.processed_at IS 'Timestamp when webhook processing completed';
COMMENT ON COLUMN payment_webhooks.error IS 'Error message if webhook processing failed (for debugging and retry logic)';
COMMENT ON COLUMN payment_webhooks.retry_count IS 'Number of times webhook processing has been retried';

-- ============================================================================
-- STEP 2: CREATE INDEXES FOR WEBHOOK QUERIES
-- ============================================================================

-- Index for unprocessed webhooks (background job processing)
CREATE INDEX IF NOT EXISTS idx_webhooks_unprocessed
ON payment_webhooks(created_at)
WHERE processed = false;

COMMENT ON INDEX idx_webhooks_unprocessed IS 'Find unprocessed webhooks for background job queue';

-- Index for event type analytics
CREATE INDEX IF NOT EXISTS idx_webhooks_event_type
ON payment_webhooks(event_type, created_at DESC);

COMMENT ON INDEX idx_webhooks_event_type IS 'Analyze webhook event patterns and frequencies';

-- Index for company webhook history
CREATE INDEX IF NOT EXISTS idx_webhooks_company
ON payment_webhooks(company_id, created_at DESC)
WHERE company_id IS NOT NULL;

COMMENT ON INDEX idx_webhooks_company IS 'View all webhook events for a specific company';

-- Index for payment webhook history
CREATE INDEX IF NOT EXISTS idx_webhooks_payment
ON payment_webhooks(payment_id, created_at DESC)
WHERE payment_id IS NOT NULL;

COMMENT ON INDEX idx_webhooks_payment IS 'View all webhook events for a specific payment';

-- Index for failed webhooks (need retry)
CREATE INDEX IF NOT EXISTS idx_webhooks_failed
ON payment_webhooks(retry_count, created_at)
WHERE processed = false AND error IS NOT NULL;

COMMENT ON INDEX idx_webhooks_failed IS 'Identify webhooks that failed processing and need retry';

-- GIN index for payload searching
CREATE INDEX IF NOT EXISTS idx_webhooks_payload
ON payment_webhooks USING gin(payload);

COMMENT ON INDEX idx_webhooks_payload IS 'Enable fast JSON searching within webhook payloads (e.g., find all events for a Dwolla customer URL)';

-- ============================================================================
-- STEP 3: CREATE WEBHOOK EVENT TYPES ENUM (for validation)
-- ============================================================================

-- Common Dwolla webhook event types we expect to receive:
-- Reference: https://developers.dwolla.com/docs/balance/webhooks

COMMENT ON TABLE payment_webhooks IS 'Common Dwolla webhook event types:
- customer_created: New Dwolla customer created
- customer_verified: Customer identity verification completed
- customer_funding_source_added: Bank account linked to customer
- customer_funding_source_verified: Bank account micro-deposit verification completed
- customer_funding_source_removed: Bank account unlinked
- customer_transfer_created: ACH transfer initiated
- customer_transfer_completed: ACH transfer successfully completed
- customer_transfer_failed: ACH transfer failed (insufficient funds, etc.)
- customer_transfer_cancelled: ACH transfer cancelled
- customer_bank_transfer_created: Bank-to-bank transfer initiated
- customer_bank_transfer_completed: Bank-to-bank transfer completed
- customer_bank_transfer_failed: Bank-to-bank transfer failed';

-- ============================================================================
-- STEP 4: CREATE HELPER FUNCTION TO EXTRACT COMPANY FROM WEBHOOK
-- ============================================================================

CREATE OR REPLACE FUNCTION extract_company_from_webhook(payload_input JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    dwolla_customer_url TEXT;
    company_uuid UUID;
BEGIN
    -- Extract Dwolla customer URL from webhook payload
    -- Dwolla payloads have structure: { "_links": { "customer": { "href": "url" } } }
    dwolla_customer_url := payload_input->'_links'->'customer'->>'href';

    -- Look up company by Dwolla customer URL
    IF dwolla_customer_url IS NOT NULL THEN
        SELECT id INTO company_uuid
        FROM companies
        WHERE dwolla_customer_url = dwolla_customer_url
        LIMIT 1;
    END IF;

    RETURN company_uuid;
END;
$$;

COMMENT ON FUNCTION extract_company_from_webhook IS 'Extracts company_id from Dwolla webhook payload by matching dwolla_customer_url';

-- ============================================================================
-- STEP 5: CREATE HELPER FUNCTION TO MARK WEBHOOK PROCESSED
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_webhook_processed(
    webhook_id_input UUID,
    success BOOLEAN DEFAULT true,
    error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF success THEN
        UPDATE payment_webhooks
        SET
            processed = true,
            processed_at = NOW(),
            error = NULL
        WHERE id = webhook_id_input;
    ELSE
        UPDATE payment_webhooks
        SET
            processed = false,
            error = error_message,
            retry_count = retry_count + 1
        WHERE id = webhook_id_input;
    END IF;
END;
$$;

COMMENT ON FUNCTION mark_webhook_processed IS 'Marks webhook as processed (success) or failed (for retry). Increments retry_count on failure.';

-- ============================================================================
-- STEP 6: ENABLE ROW-LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see webhooks from their own company
DROP POLICY IF EXISTS webhooks_company_isolation ON payment_webhooks;
CREATE POLICY webhooks_company_isolation ON payment_webhooks
FOR SELECT
USING (
    company_id IN (
        SELECT company_id FROM users
        WHERE id = auth.uid()
    )
    OR
    -- Allow system/admin access for unprocessed webhooks
    company_id IS NULL
);

COMMENT ON POLICY webhooks_company_isolation ON payment_webhooks IS 'Multi-tenant isolation: Users only see webhooks from their company. System can access all webhooks.';

-- ============================================================================
-- STEP 7: CREATE TRIGGER TO AUTO-EXTRACT COMPANY_ID FROM PAYLOAD
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_extract_company_from_webhook()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- If company_id not manually set, try to extract from payload
    IF NEW.company_id IS NULL THEN
        NEW.company_id := extract_company_from_webhook(NEW.payload);
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER before_insert_webhook_extract_company
    BEFORE INSERT ON payment_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION auto_extract_company_from_webhook();

COMMENT ON TRIGGER before_insert_webhook_extract_company ON payment_webhooks IS 'Automatically extracts company_id from webhook payload on insert';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table created
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'payment_webhooks') as column_count
FROM information_schema.tables
WHERE table_name = 'payment_webhooks';

-- Verify indexes created
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE tablename = 'payment_webhooks'
ORDER BY indexname;

-- Verify RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'payment_webhooks';

-- Verify helper functions created
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name IN (
    'extract_company_from_webhook',
    'mark_webhook_processed',
    'auto_extract_company_from_webhook'
)
ORDER BY routine_name;

-- Verify trigger created
SELECT
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'before_insert_webhook_extract_company';

-- ============================================================================
-- TESTING GUIDE
-- ============================================================================

-- Test webhook insertion with auto-extraction:
-- INSERT INTO payment_webhooks (event_type, payload) VALUES (
--     'customer_funding_source_verified',
--     '{"_links": {"customer": {"href": "https://api.dwolla.com/customers/uuid-here"}}}'::jsonb
-- );
-- SELECT * FROM payment_webhooks ORDER BY created_at DESC LIMIT 1;

-- Test marking webhook processed:
-- SELECT mark_webhook_processed('webhook-uuid-here', true);
-- SELECT processed, processed_at FROM payment_webhooks WHERE id = 'webhook-uuid-here';

-- Test marking webhook failed:
-- SELECT mark_webhook_processed('webhook-uuid-here', false, 'Connection timeout');
-- SELECT retry_count, error FROM payment_webhooks WHERE id = 'webhook-uuid-here';

-- ============================================================================
-- NEXT STEPS
-- ============================================================================

-- After running this migration:
-- 1. Implement webhook endpoint in backend API (POST /api/webhooks/dwolla)
-- 2. Register webhook URL with Dwolla dashboard
-- 3. Implement webhook processing background job
-- 4. Add Dwolla webhook signature verification
-- 5. Test webhook delivery with Dwolla sandbox events
-- 6. Set up monitoring/alerting for failed webhooks

-- ============================================================================
-- END OF PAYMENT WEBHOOKS TABLE
-- ============================================================================
