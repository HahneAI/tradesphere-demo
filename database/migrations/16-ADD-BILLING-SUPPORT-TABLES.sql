-- =====================================================================
-- PHASE 4D: Billing & Subscription Management Support Tables
-- =====================================================================
-- Migration 16: Add billing support infrastructure
-- - cancellation_feedback column to companies table
-- - customer_feedback table for general feedback collection
-- - audit_logs table for security and debugging
-- - payment_webhooks table for Dwolla webhook idempotency
-- - Helper functions for ownership verification and payment tracking

-- =====================================================================
-- 1. Add cancellation_feedback column to companies table
-- =====================================================================
-- This column stores detailed feedback when users cancel their subscription.
-- It's valuable for product improvement and understanding churn reasons.
-- NOTE: owner_id is added in migration 17

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS cancellation_feedback TEXT;

COMMENT ON COLUMN companies.cancellation_feedback IS 'Optional detailed feedback provided when subscription is canceled';

-- =====================================================================
-- 2. Create customer_feedback table for general feedback collection
-- =====================================================================
-- This table stores all types of customer feedback, not just cancellations

CREATE TABLE IF NOT EXISTS customer_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('cancellation', 'feature_request', 'bug_report', 'general', 'support')),
  reason TEXT,
  feedback_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes separately (PostgreSQL doesn't support inline INDEX in CREATE TABLE)
CREATE INDEX IF NOT EXISTS idx_customer_feedback_company ON customer_feedback(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_type ON customer_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_created ON customer_feedback(created_at DESC);

-- Add RLS policies for customer_feedback table
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert feedback for their own company (owner only)
CREATE POLICY "Users can insert feedback for their company"
  ON customer_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.owner_id = auth.uid()
    )
  );

-- Policy: Users can view feedback for their company (owner only)
CREATE POLICY "Users can view their company feedback"
  ON customer_feedback
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.owner_id = auth.uid()
    )
  );

-- Policy: Service role can do everything (for admin dashboards)
CREATE POLICY "Service role has full access to feedback"
  ON customer_feedback
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================================
-- 3. Create audit_logs table for security and debugging
-- =====================================================================
-- This table tracks all important actions (payment verification, cancellations, etc.)

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes separately
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Add RLS policies for audit_logs table
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view audit logs for their company (owner only)
CREATE POLICY "Users can view their company audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.owner_id = auth.uid()
    )
  );

-- Policy: Service role can do everything
CREATE POLICY "Service role has full audit access"
  ON audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================================
-- 4. Create payment_webhooks table for Dwolla webhook idempotency
-- =====================================================================
-- This table stores all Dwolla webhook events to prevent duplicate processing

CREATE TABLE IF NOT EXISTS payment_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes separately
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_company ON payment_webhooks(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_payment ON payment_webhooks(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_event_type ON payment_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed ON payment_webhooks(processed);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_created ON payment_webhooks(created_at DESC);

-- Unique constraint on Dwolla event ID for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_webhooks_dwolla_id ON payment_webhooks((payload->>'id'));

-- Add RLS policies for payment_webhooks table
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access webhook data
CREATE POLICY "Only service role can access webhooks"
  ON payment_webhooks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================================
-- 5. Helper function to get company owner
-- =====================================================================
-- This function helps verify ownership in serverless functions

CREATE OR REPLACE FUNCTION get_company_owner(company_id_input UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT owner_id
    FROM companies
    WHERE id = company_id_input
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_company_owner TO authenticated;

-- =====================================================================
-- 6. Helper function to check if user is company owner
-- =====================================================================

CREATE OR REPLACE FUNCTION is_company_owner(
  user_id_input UUID,
  company_id_input UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM companies
    WHERE id = company_id_input
    AND owner_id = user_id_input
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_company_owner TO authenticated;

-- =====================================================================
-- 7. Function to record successful payment and advance billing date
-- =====================================================================

CREATE OR REPLACE FUNCTION record_payment_success(company_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE companies
  SET
    subscription_status = 'active',
    payment_failure_count = 0,
    last_payment_failed_at = NULL,
    next_billing_date = CASE
      WHEN next_billing_date IS NOT NULL THEN
        next_billing_date + INTERVAL '1 month'
      ELSE
        CURRENT_DATE + INTERVAL '1 month'
    END
  WHERE id = company_id_input;
END;
$$;

-- =====================================================================
-- 8. Function to record payment failure and increment failure count
-- =====================================================================
-- After 3 failures, subscription status changes to 'past_due'

CREATE OR REPLACE FUNCTION record_payment_failure(company_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_failure_count INTEGER;
BEGIN
  -- Get current failure count
  SELECT payment_failure_count
  INTO current_failure_count
  FROM companies
  WHERE id = company_id_input;

  -- Increment failure count
  current_failure_count := COALESCE(current_failure_count, 0) + 1;

  -- Update company record
  UPDATE companies
  SET
    payment_failure_count = current_failure_count,
    last_payment_failed_at = NOW(),
    subscription_status = CASE
      WHEN current_failure_count >= 3 THEN 'past_due'
      ELSE subscription_status
    END
  WHERE id = company_id_input;
END;
$$;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION record_payment_success TO service_role;
GRANT EXECUTE ON FUNCTION record_payment_failure TO service_role;

-- =====================================================================
-- Migration Complete
-- =====================================================================
-- This migration adds all necessary infrastructure for Phase 4D billing:
-- - Cancellation feedback tracking
-- - General customer feedback collection
-- - Security audit logging
-- - Dwolla webhook processing with idempotency
-- - Helper functions for ownership verification and payment tracking
