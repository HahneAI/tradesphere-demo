-- ============================================================================
-- PHASE 4A: COMPANIES TABLE PAYMENT FIELDS (DWOLLA)
-- ============================================================================
--
-- Purpose: Add Dwolla payment tracking fields to companies table
-- Status: Pre-release (foundational for billing system)
-- Strategy: Track Dwolla customer URLs and funding sources for ACH payments
--
-- IMPORTANT: Uses DWOLLA for bank transfers, NOT Stripe
-- Estimated time: ~2 minutes
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD DWOLLA PAYMENT FIELDS TO COMPANIES TABLE
-- ============================================================================

-- Add Dwolla customer URL (already exists in database, but ensure it's present)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS dwolla_customer_url TEXT;

COMMENT ON COLUMN companies.dwolla_customer_url IS 'Dwolla customer resource URL (e.g., https://api.dwolla.com/customers/uuid). Created during owner signup payment flow.';

-- Add Dwolla funding source ID (for verified bank account)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS dwolla_funding_source_id TEXT;

COMMENT ON COLUMN companies.dwolla_funding_source_id IS 'Dwolla funding source ID for primary bank account. Used for monthly ACH debits.';

-- Add payment method status tracking
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS payment_method_status TEXT DEFAULT 'pending'
CHECK (payment_method_status IN ('pending', 'verified', 'failed', 'suspended'));

COMMENT ON COLUMN companies.payment_method_status IS 'Status of primary payment method: pending (awaiting bank verification), verified (ready for charges), failed (verification failed), suspended (payment issues)';

-- Add payment method last verified timestamp
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS payment_method_verified_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN companies.payment_method_verified_at IS 'When bank account was last successfully verified via Dwolla micro-deposits';

-- Add billing contact information
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS billing_email TEXT;

COMMENT ON COLUMN companies.billing_email IS 'Email for billing notifications and invoices. Defaults to company email if not specified.';

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS billing_name TEXT;

COMMENT ON COLUMN companies.billing_name IS 'Name on billing account. Defaults to company name if not specified.';

-- Add subscription tier tracking
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'standard'
CHECK (subscription_tier IN ('trial', 'standard', 'pro', 'enterprise'));

COMMENT ON COLUMN companies.subscription_tier IS 'Subscription tier: trial (14 days free), standard ($2000/mo), pro ($3500/mo), enterprise (custom pricing)';

-- Add subscription start date
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN companies.subscription_started_at IS 'When paid subscription began (after trial or upgrade)';

-- Add billing cycle anchor day (1-28)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS billing_cycle_day INTEGER DEFAULT 1
CHECK (billing_cycle_day >= 1 AND billing_cycle_day <= 28);

COMMENT ON COLUMN companies.billing_cycle_day IS 'Day of month for billing (1-28). Charges occur on this day each month.';

-- Add payment failure tracking
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS last_payment_failed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN companies.last_payment_failed_at IS 'Timestamp of most recent failed payment attempt. NULL if no failures.';

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS payment_failure_count INTEGER DEFAULT 0;

COMMENT ON COLUMN companies.payment_failure_count IS 'Number of consecutive failed payment attempts. Reset to 0 on successful payment.';

-- Add cancellation tracking
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN companies.cancelled_at IS 'When subscription was cancelled. NULL = active subscription.';

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

COMMENT ON COLUMN companies.cancellation_reason IS 'Reason provided for subscription cancellation (for analytics and win-back campaigns)';

-- ============================================================================
-- STEP 2: CREATE INDEXES FOR PAYMENT QUERIES
-- ============================================================================

-- Index for Dwolla customer lookup
CREATE INDEX IF NOT EXISTS idx_companies_dwolla_customer
ON companies(dwolla_customer_url)
WHERE dwolla_customer_url IS NOT NULL;

COMMENT ON INDEX idx_companies_dwolla_customer IS 'Fast lookup of companies by Dwolla customer URL (used in webhook processing)';

-- Index for funding source lookup
CREATE INDEX IF NOT EXISTS idx_companies_dwolla_funding_source
ON companies(dwolla_funding_source_id)
WHERE dwolla_funding_source_id IS NOT NULL;

-- Index for subscription status queries
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status
ON companies(subscription_status, next_billing_date)
WHERE subscription_status != 'cancelled';

COMMENT ON INDEX idx_companies_subscription_status IS 'Efficient queries for billing runs (find all companies due for payment)';

-- Index for payment failures
CREATE INDEX IF NOT EXISTS idx_companies_payment_failures
ON companies(payment_failure_count, last_payment_failed_at)
WHERE payment_failure_count > 0;

COMMENT ON INDEX idx_companies_payment_failures IS 'Identify companies with payment issues for dunning workflows';

-- Index for billing cycle processing
CREATE INDEX IF NOT EXISTS idx_companies_billing_cycle
ON companies(billing_cycle_day, subscription_status)
WHERE subscription_status IN ('active', 'past_due');

COMMENT ON INDEX idx_companies_billing_cycle IS 'Daily batch job to process companies with billing due on current day';

-- ============================================================================
-- STEP 3: UPDATE EXISTING SUBSCRIPTION STATUS VALUES
-- ============================================================================

-- Ensure subscription_status uses consistent values
-- Current possible values: 'trial', 'active', 'past_due', 'suspended', 'cancelled'

-- Add constraint if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.constraint_column_usage
        WHERE table_name = 'companies'
        AND constraint_name LIKE '%subscription_status%'
    ) THEN
        ALTER TABLE companies
        ADD CONSTRAINT companies_subscription_status_check
        CHECK (subscription_status IN ('trial', 'active', 'past_due', 'suspended', 'cancelled'));
    END IF;
END $$;

-- ============================================================================
-- STEP 4: CREATE HELPER FUNCTION FOR PAYMENT FAILURE TRACKING
-- ============================================================================

CREATE OR REPLACE FUNCTION record_payment_failure(company_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE companies
    SET
        payment_failure_count = payment_failure_count + 1,
        last_payment_failed_at = NOW(),
        subscription_status = CASE
            WHEN payment_failure_count + 1 >= 3 THEN 'suspended'
            ELSE 'past_due'
        END
    WHERE id = company_id_input;
END;
$$;

COMMENT ON FUNCTION record_payment_failure IS 'Increments payment failure count and updates subscription status. Suspends account after 3 failures.';

-- ============================================================================
-- STEP 5: CREATE HELPER FUNCTION FOR PAYMENT SUCCESS TRACKING
-- ============================================================================

CREATE OR REPLACE FUNCTION record_payment_success(company_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE companies
    SET
        payment_failure_count = 0,
        last_payment_failed_at = NULL,
        subscription_status = 'active',
        next_billing_date = CASE
            -- If current billing date is in the past, calculate next from today
            WHEN next_billing_date < CURRENT_DATE THEN
                (CURRENT_DATE + INTERVAL '1 month')::DATE
            -- Otherwise, advance by 1 month
            ELSE
                (next_billing_date + INTERVAL '1 month')::DATE
        END
    WHERE id = company_id_input;
END;
$$;

COMMENT ON FUNCTION record_payment_success IS 'Resets payment failure tracking and advances next billing date by 1 month';

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
WHERE table_name = 'companies'
AND column_name IN (
    'dwolla_customer_url',
    'dwolla_funding_source_id',
    'payment_method_status',
    'payment_method_verified_at',
    'billing_email',
    'billing_name',
    'subscription_tier',
    'subscription_started_at',
    'billing_cycle_day',
    'last_payment_failed_at',
    'payment_failure_count',
    'cancelled_at',
    'cancellation_reason'
)
ORDER BY ordinal_position;

-- Verify indexes created
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE tablename = 'companies'
AND indexname LIKE '%dwolla%' OR indexname LIKE '%payment%' OR indexname LIKE '%billing%'
ORDER BY indexname;

-- Verify helper functions created
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name IN ('record_payment_failure', 'record_payment_success')
ORDER BY routine_name;

-- ============================================================================
-- TESTING GUIDE
-- ============================================================================

-- Test payment failure tracking:
-- SELECT record_payment_failure('company-uuid-here');
-- SELECT payment_failure_count, subscription_status FROM companies WHERE id = 'company-uuid-here';

-- Test payment success tracking:
-- SELECT record_payment_success('company-uuid-here');
-- SELECT payment_failure_count, next_billing_date FROM companies WHERE id = 'company-uuid-here';

-- ============================================================================
-- NEXT STEPS
-- ============================================================================

-- After running this migration:
-- 1. Run 13-CREATE-PAYMENT-WEBHOOKS-TABLE.sql (webhook event logging)
-- 2. Implement DwollaService.ts for customer and funding source creation
-- 3. Update company onboarding flow to collect bank account details
-- 4. Set up Dwolla webhook endpoints to process payment events
-- 5. Implement monthly billing cron job

-- ============================================================================
-- END OF COMPANIES PAYMENT FIELDS
-- ============================================================================
