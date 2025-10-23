-- ============================================================================
-- PHASE 5: MIGRATE DWOLLA TO STRIPE ACH PAYMENT SYSTEM
-- ============================================================================
--
-- Purpose: Replace Dwolla payment infrastructure with Stripe ACH + Plaid
-- Status: Pre-production migration (required for Stripe integration)
-- Strategy: Drop all Dwolla-specific fields and replace with Stripe equivalents
--
-- IMPORTANT: This migration is IRREVERSIBLE - Dwolla data will be permanently removed
-- BACKUP: Ensure full database backup exists before running this migration
-- Estimated time: ~5 minutes
-- ============================================================================

-- ============================================================================
-- MIGRATION OVERVIEW
-- ============================================================================
--
-- COMPANIES TABLE CHANGES:
-- - DROP: dwolla_customer_url (varchar 500)
-- - DROP: dwolla_funding_source_id (text)
-- - ADD: stripe_customer_id (text) - Stripe Customer ID (cus_xxx)
-- - ADD: stripe_payment_method_id (text) - Stripe PaymentMethod ID (pm_xxx) for ACH
-- - ADD: stripe_setup_intent_id (text) - Stripe SetupIntent ID (seti_xxx) for Plaid flow
-- - KEEP: All generic payment fields (payment_method_status, billing_email, etc.)
--
-- PAYMENTS TABLE CHANGES:
-- - DROP: dwolla_customer_id (varchar 255)
-- - DROP: dwolla_funding_source_id (varchar 255)
-- - DROP: dwolla_transfer_id (varchar 255)
-- - DROP: dwolla_transfer_url (text)
-- - ADD: stripe_payment_intent_id (text) - Stripe PaymentIntent ID (pi_xxx)
-- - ADD: stripe_charge_id (text) - Stripe Charge ID (ch_xxx)
-- - KEEP: ach_status (Stripe also uses ACH terminology)
--
-- TABLE RENAME:
-- - payment_webhooks → stripe_webhooks (semantic clarity)
--
-- INDEXES:
-- - DROP: All Dwolla-related indexes
-- - ADD: Optimized indexes for Stripe webhook processing
--
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP DWOLLA INDEXES FROM COMPANIES TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_companies_dwolla_customer;
DROP INDEX IF EXISTS idx_companies_dwolla_funding_source;

-- ============================================================================
-- STEP 2: DROP DWOLLA INDEXES FROM PAYMENTS TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_payments_dwolla_customer;
DROP INDEX IF EXISTS idx_payments_dwolla_transfer_url;

-- ============================================================================
-- STEP 3: ADD STRIPE FIELDS TO COMPANIES TABLE
-- ============================================================================

-- Add Stripe Customer ID (created during website onboarding)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

COMMENT ON COLUMN companies.stripe_customer_id IS 'Stripe Customer ID (cus_xxx). Created during website onboarding when user submits email. Used for all payment operations.';

-- Add Stripe PaymentMethod ID (verified via Plaid instant verification)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT;

COMMENT ON COLUMN companies.stripe_payment_method_id IS 'Stripe PaymentMethod ID (pm_xxx) for verified ACH bank account. Attached via Plaid instant verification flow. Used for subscription billing.';

-- Add Stripe SetupIntent ID (used during Plaid verification flow)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS stripe_setup_intent_id TEXT;

COMMENT ON COLUMN companies.stripe_setup_intent_id IS 'Stripe SetupIntent ID (seti_xxx) used for Plaid instant verification flow. Created when user begins bank account connection process.';

-- ============================================================================
-- STEP 4: ADD STRIPE FIELDS TO PAYMENTS TABLE
-- ============================================================================

-- Add Stripe PaymentIntent ID (for subscription charges)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

COMMENT ON COLUMN payments.stripe_payment_intent_id IS 'Stripe PaymentIntent ID (pi_xxx) for subscription payments. Created when charging customer for monthly billing.';

-- Add Stripe Charge ID (for completed payments)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT;

COMMENT ON COLUMN payments.stripe_charge_id IS 'Stripe Charge ID (ch_xxx) for completed payments. Set when PaymentIntent succeeds and funds are captured.';

-- ============================================================================
-- STEP 5: CREATE OPTIMIZED INDEXES FOR STRIPE LOOKUPS
-- ============================================================================

-- Companies table: Index for webhook processing (lookup by stripe_customer_id)
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer
ON companies(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

COMMENT ON INDEX idx_companies_stripe_customer IS 'Fast lookup of companies by Stripe Customer ID (used in webhook processing for customer.* events)';

-- Companies table: Index for payment method queries
CREATE INDEX IF NOT EXISTS idx_companies_stripe_payment_method
ON companies(stripe_payment_method_id)
WHERE stripe_payment_method_id IS NOT NULL;

COMMENT ON INDEX idx_companies_stripe_payment_method IS 'Fast lookup of companies by Stripe PaymentMethod ID (used in webhook processing for payment_method.* events)';

-- Payments table: Index for PaymentIntent webhooks (high-frequency lookups)
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent
ON payments(stripe_payment_intent_id)
WHERE stripe_payment_intent_id IS NOT NULL;

COMMENT ON INDEX idx_payments_stripe_payment_intent IS 'Fast lookup of payments by Stripe PaymentIntent ID (used in webhook processing for payment_intent.* events). Critical for webhook performance.';

-- Payments table: Index for Charge webhooks
CREATE INDEX IF NOT EXISTS idx_payments_stripe_charge
ON payments(stripe_charge_id)
WHERE stripe_charge_id IS NOT NULL;

COMMENT ON INDEX idx_payments_stripe_charge IS 'Fast lookup of payments by Stripe Charge ID (used in webhook processing for charge.* events)';

-- ============================================================================
-- STEP 6: DROP OLD WEBHOOK TRIGGERS AND FUNCTIONS (BEFORE TABLE RENAME)
-- ============================================================================

-- IMPORTANT: Drop trigger BEFORE dropping functions it depends on
DROP TRIGGER IF EXISTS before_insert_webhook_extract_company ON payment_webhooks;

-- Drop old Dwolla-specific functions
DROP FUNCTION IF EXISTS extract_company_from_webhook(JSONB);
DROP FUNCTION IF EXISTS auto_extract_company_from_webhook();

-- ============================================================================
-- STEP 7: RENAME PAYMENT_WEBHOOKS TABLE TO STRIPE_WEBHOOKS
-- ============================================================================

-- Rename table for semantic clarity (payment_webhooks → stripe_webhooks)
ALTER TABLE IF EXISTS payment_webhooks
RENAME TO stripe_webhooks;

COMMENT ON TABLE stripe_webhooks IS 'Audit log of all Stripe webhook events. Stores raw payloads for debugging, idempotency, and replay capability. Renamed from payment_webhooks for clarity.';

-- Update column comments to reflect Stripe instead of Dwolla
COMMENT ON COLUMN stripe_webhooks.event_type IS 'Stripe event type (e.g., customer.created, payment_intent.succeeded, payment_method.attached, charge.failed)';
COMMENT ON COLUMN stripe_webhooks.payload IS 'Full JSON payload from Stripe webhook for audit trail and debugging. Includes all event data and metadata.';
COMMENT ON COLUMN stripe_webhooks.company_id IS 'Linked company if event relates to a company customer (extracted from payload metadata)';
COMMENT ON COLUMN stripe_webhooks.payment_id IS 'Linked payment record if event relates to a PaymentIntent (extracted from payload)';
COMMENT ON COLUMN stripe_webhooks.processed IS 'True if webhook was successfully processed and side effects applied (e.g., payment status updated)';
COMMENT ON COLUMN stripe_webhooks.processed_at IS 'Timestamp when webhook processing completed successfully';
COMMENT ON COLUMN stripe_webhooks.error IS 'Error message if webhook processing failed (for debugging and retry logic)';
COMMENT ON COLUMN stripe_webhooks.retry_count IS 'Number of times webhook processing has been retried (max 3 before manual intervention required)';

-- ============================================================================
-- STEP 8: DROP DWOLLA COLUMNS FROM COMPANIES TABLE
-- ============================================================================
-- NOTE: This step is AFTER creating new columns to allow for data migration if needed

ALTER TABLE companies
DROP COLUMN IF EXISTS dwolla_customer_url;

ALTER TABLE companies
DROP COLUMN IF EXISTS dwolla_funding_source_id;

-- ============================================================================
-- STEP 9: DROP DWOLLA COLUMNS FROM PAYMENTS TABLE
-- ============================================================================
-- NOTE: This step is AFTER creating new columns to allow for data migration if needed

ALTER TABLE payments
DROP COLUMN IF EXISTS dwolla_customer_id;

ALTER TABLE payments
DROP COLUMN IF EXISTS dwolla_funding_source_id;

ALTER TABLE payments
DROP COLUMN IF EXISTS dwolla_transfer_id;

ALTER TABLE payments
DROP COLUMN IF EXISTS dwolla_transfer_url;

-- ============================================================================
-- STEP 10: CREATE NEW STRIPE HELPER FUNCTIONS
-- ============================================================================

-- Create new Stripe-specific function to extract company from webhook
CREATE OR REPLACE FUNCTION extract_company_from_stripe_webhook(payload_input JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stripe_customer_id_extracted TEXT;
    company_uuid UUID;
BEGIN
    -- Extract Stripe customer ID from webhook payload
    -- Stripe payloads have structure: { "data": { "object": { "customer": "cus_xxx" } } }
    -- OR for customer events: { "data": { "object": { "id": "cus_xxx" } } }

    -- Try to get customer ID from nested object first
    stripe_customer_id_extracted := payload_input->'data'->'object'->>'customer';

    -- If not found, check if this IS a customer object
    IF stripe_customer_id_extracted IS NULL THEN
        stripe_customer_id_extracted := payload_input->'data'->'object'->>'id';
        -- Only use if it starts with 'cus_'
        IF stripe_customer_id_extracted IS NOT NULL AND NOT stripe_customer_id_extracted LIKE 'cus_%' THEN
            stripe_customer_id_extracted := NULL;
        END IF;
    END IF;

    -- Look up company by Stripe customer ID
    IF stripe_customer_id_extracted IS NOT NULL THEN
        SELECT id INTO company_uuid
        FROM companies
        WHERE stripe_customer_id = stripe_customer_id_extracted
        LIMIT 1;
    END IF;

    RETURN company_uuid;
END;
$$;

COMMENT ON FUNCTION extract_company_from_stripe_webhook IS 'Extracts company_id from Stripe webhook payload by matching stripe_customer_id. Handles both nested customer references and direct customer objects.';

-- Create trigger function to auto-extract company from Stripe webhooks
CREATE OR REPLACE FUNCTION auto_extract_company_from_stripe_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If company_id not manually set, try to extract from payload
    IF NEW.company_id IS NULL THEN
        NEW.company_id := extract_company_from_stripe_webhook(NEW.payload);
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_extract_company_from_stripe_webhook IS 'Trigger function that automatically extracts company_id from Stripe webhook payload on insert';

-- Create new trigger on stripe_webhooks table
CREATE TRIGGER before_insert_stripe_webhook_extract_company
    BEFORE INSERT ON stripe_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION auto_extract_company_from_stripe_webhook();

COMMENT ON TRIGGER before_insert_stripe_webhook_extract_company ON stripe_webhooks IS 'Automatically extracts company_id from Stripe webhook payload on insert';

-- ============================================================================
-- STEP 11: UPDATE RLS POLICIES FOR RENAMED TABLE
-- ============================================================================

-- Drop old policy on payment_webhooks (if table was renamed, policies carry over)
-- But we'll recreate them for clarity and to ensure correct naming

DROP POLICY IF EXISTS webhooks_company_isolation ON stripe_webhooks;
DROP POLICY IF EXISTS "Only service role can access webhooks" ON stripe_webhooks;

-- Policy: Only service role can access webhook data (webhooks are internal only)
CREATE POLICY "Only service role can access stripe webhooks"
ON stripe_webhooks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "Only service role can access stripe webhooks" ON stripe_webhooks IS 'Stripe webhooks are internal system data - only service role (backend API) can access for processing';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify new columns added to companies table
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'companies'
AND column_name IN (
    'stripe_customer_id',
    'stripe_payment_method_id',
    'stripe_setup_intent_id'
)
ORDER BY ordinal_position;

-- Verify Dwolla columns removed from companies table
SELECT
    column_name
FROM information_schema.columns
WHERE table_name = 'companies'
AND (column_name LIKE '%dwolla%')
ORDER BY column_name;
-- Expected result: 0 rows (all Dwolla columns should be gone)

-- Verify new columns added to payments table
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'payments'
AND column_name IN (
    'stripe_payment_intent_id',
    'stripe_charge_id'
)
ORDER BY ordinal_position;

-- Verify Dwolla columns removed from payments table
SELECT
    column_name
FROM information_schema.columns
WHERE table_name = 'payments'
AND (column_name LIKE '%dwolla%')
ORDER BY column_name;
-- Expected result: 0 rows (all Dwolla columns should be gone)

-- Verify stripe_webhooks table exists (renamed from payment_webhooks)
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'stripe_webhooks') as column_count
FROM information_schema.tables
WHERE table_name = 'stripe_webhooks';
-- Expected: 1 row with column_count = 10

-- Verify payment_webhooks table no longer exists
SELECT
    table_name
FROM information_schema.tables
WHERE table_name = 'payment_webhooks';
-- Expected result: 0 rows (table should be renamed)

-- Verify new indexes created
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE (
    indexname LIKE '%stripe%'
    OR tablename = 'stripe_webhooks'
)
AND tablename IN ('companies', 'payments', 'stripe_webhooks')
ORDER BY tablename, indexname;

-- Verify Dwolla indexes removed
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE indexname LIKE '%dwolla%'
AND tablename IN ('companies', 'payments');
-- Expected result: 0 rows (all Dwolla indexes should be gone)

-- Verify helper functions updated
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name IN (
    'extract_company_from_stripe_webhook',
    'auto_extract_company_from_stripe_webhook'
)
ORDER BY routine_name;
-- Expected: 2 rows

-- Verify old Dwolla functions removed
SELECT
    routine_name
FROM information_schema.routines
WHERE routine_name LIKE '%dwolla%'
OR routine_name IN ('extract_company_from_webhook', 'auto_extract_company_from_webhook');
-- Expected result: 0 rows (old functions should be gone)

-- Verify trigger updated on stripe_webhooks table
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'stripe_webhooks'
AND trigger_name LIKE '%stripe%'
ORDER BY trigger_name;

-- Verify RLS policies updated
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'stripe_webhooks'
ORDER BY policyname;

-- ============================================================================
-- TESTING GUIDE
-- ============================================================================

-- Test 1: Verify Stripe customer ID lookup works
-- INSERT INTO companies (name, stripe_customer_id) VALUES ('Test Company', 'cus_test123');
-- SELECT id, name, stripe_customer_id FROM companies WHERE stripe_customer_id = 'cus_test123';

-- Test 2: Verify webhook company extraction works
-- INSERT INTO stripe_webhooks (event_type, payload) VALUES (
--     'customer.created',
--     '{"data": {"object": {"id": "cus_test123"}}}'::jsonb
-- );
-- SELECT id, event_type, company_id FROM stripe_webhooks ORDER BY created_at DESC LIMIT 1;
-- (company_id should be auto-populated from stripe_customer_id lookup)

-- Test 3: Verify payment intent tracking works
-- INSERT INTO payments (company_id, amount, stripe_payment_intent_id, status)
-- VALUES ('company-uuid-here', 200000, 'pi_test123', 'succeeded');
-- SELECT id, stripe_payment_intent_id, status FROM payments WHERE stripe_payment_intent_id = 'pi_test123';

-- Test 4: Verify indexes are being used (check query plans)
-- EXPLAIN ANALYZE SELECT * FROM companies WHERE stripe_customer_id = 'cus_test123';
-- (should show "Index Scan using idx_companies_stripe_customer")

-- CLEANUP TEST DATA:
-- DELETE FROM stripe_webhooks WHERE event_type = 'customer.created';
-- DELETE FROM payments WHERE stripe_payment_intent_id = 'pi_test123';
-- DELETE FROM companies WHERE name = 'Test Company';

-- ============================================================================
-- ROLLBACK PLAN (IF NEEDED)
-- ============================================================================
--
-- IMPORTANT: This migration is designed to be IRREVERSIBLE in production
-- because Dwolla data is deleted. However, if you need to rollback immediately
-- after running this migration (before Stripe integration goes live):
--
-- 1. Restore from database backup taken before migration
-- 2. OR manually recreate Dwolla columns:
--
-- ALTER TABLE companies ADD COLUMN dwolla_customer_url VARCHAR(500);
-- ALTER TABLE companies ADD COLUMN dwolla_funding_source_id TEXT;
-- ALTER TABLE payments ADD COLUMN dwolla_customer_id VARCHAR(255);
-- ALTER TABLE payments ADD COLUMN dwolla_funding_source_id VARCHAR(255);
-- ALTER TABLE payments ADD COLUMN dwolla_transfer_id VARCHAR(255);
-- ALTER TABLE payments ADD COLUMN dwolla_transfer_url TEXT;
-- ALTER TABLE stripe_webhooks RENAME TO payment_webhooks;
--
-- 3. Restore Dwolla indexes (see migration 12-14 for exact definitions)
-- 4. Restore Dwolla helper functions (see migration 13 for definitions)
--
-- WARNING: This rollback will NOT restore actual Dwolla data - only schema
--
-- ============================================================================

-- ============================================================================
-- NEXT STEPS AFTER RUNNING THIS MIGRATION
-- ============================================================================
--
-- 1. BACKEND API UPDATES:
--    - Update StripeService.ts to use new column names
--    - Update stripe-webhook.ts handler to use stripe_webhooks table
--    - Remove all DwollaService.ts references from codebase
--    - Update payment processing logic to use Stripe PaymentIntents
--
-- 2. FRONTEND UPDATES:
--    - Update onboarding flow to integrate Plaid + Stripe
--    - Remove any Dwolla micro-deposit verification UI
--    - Update billing settings to show Stripe PaymentMethod details
--
-- 3. STRIPE SETUP:
--    - Configure Stripe webhook endpoints in dashboard
--    - Add webhook secret to environment variables
--    - Test webhook delivery with Stripe CLI
--    - Enable Plaid integration in Stripe dashboard
--
-- 4. TESTING:
--    - Test full onboarding flow: email → Stripe Customer → Plaid → PaymentMethod
--    - Test subscription billing: create PaymentIntent → charge → webhook processing
--    - Test webhook idempotency (duplicate webhook events)
--    - Test payment failures and retry logic
--
-- 5. MONITORING:
--    - Set up alerts for failed webhook processing
--    - Monitor stripe_webhooks table for unprocessed events
--    - Track payment success/failure rates
--    - Monitor Stripe dashboard for ACH return codes
--
-- 6. CLEANUP (AFTER STRIPE FULLY DEPLOYED):
--    - Remove Dwolla credentials from environment variables
--    - Archive old Dwolla documentation
--    - Update billing FAQ/help docs for Plaid instant verification
--
-- ============================================================================
-- END OF DWOLLA TO STRIPE MIGRATION
-- ============================================================================
