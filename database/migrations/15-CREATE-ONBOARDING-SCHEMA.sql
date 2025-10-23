/**
 * PHASE 4C: ONBOARDING SCHEMA
 *
 * Purpose: Add onboarding tracking and session management
 *
 * Changes:
 * 1. Add onboarding fields to companies table
 * 2. Create onboarding_sessions table for secure token management
 * 3. Add RLS policies for security
 * 4. Create helper functions for token validation
 *
 * Migration: 15-CREATE-ONBOARDING-SCHEMA.sql
 * Dependencies: Requires companies table from previous migrations
 */

-- ============================================================================
-- STEP 1: ADD ONBOARDING FIELDS TO COMPANIES TABLE
-- ============================================================================

-- Add onboarding tracking flag
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add AI personality configuration (JSONB for flexibility)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS ai_personality_config JSONB DEFAULT '{
  "tone": "professional",
  "formality": "balanced",
  "industry_language": "standard",
  "sales_approach": "consultative"
}'::jsonb;

-- Add branding configuration (JSONB for flexibility)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS branding_config JSONB DEFAULT '{
  "logo_url": null,
  "primary_color": "#3B82F6",
  "business_address": null,
  "business_phone": null
}'::jsonb;

-- Add onboarding completion timestamp
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Add index for onboarding status queries
CREATE INDEX IF NOT EXISTS idx_companies_onboarding_status
ON companies(onboarding_completed)
WHERE onboarding_completed = false;

COMMENT ON COLUMN companies.onboarding_completed IS 'Flag indicating if owner has completed onboarding wizard';
COMMENT ON COLUMN companies.ai_personality_config IS 'AI pricing assistant personality settings (tone, formality, style)';
COMMENT ON COLUMN companies.branding_config IS 'Company branding settings (logo, colors, contact info)';

-- ============================================================================
-- STEP 2: CREATE ONBOARDING SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Token and expiration
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),

  -- Associated user and company
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Usage tracking
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,

  -- Security tracking
  created_ip_address TEXT,
  created_user_agent TEXT,
  used_ip_address TEXT,
  used_user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_token
ON onboarding_sessions(token)
WHERE used = false AND expires_at > NOW();

CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_user
ON onboarding_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_company
ON onboarding_sessions(company_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_expiration
ON onboarding_sessions(expires_at)
WHERE used = false;

-- Comments
COMMENT ON TABLE onboarding_sessions IS 'One-time session tokens for auto-authenticating owners after email signup';
COMMENT ON COLUMN onboarding_sessions.token IS 'Cryptographically secure 32-byte token for one-time authentication';
COMMENT ON COLUMN onboarding_sessions.expires_at IS 'Token expiration (24 hours from creation)';
COMMENT ON COLUMN onboarding_sessions.used IS 'Flag indicating if token has been consumed';

-- ============================================================================
-- STEP 3: CREATE HELPER FUNCTIONS
-- ============================================================================

/**
 * Validate onboarding token and return session info
 * Returns NULL if token is invalid, expired, or already used
 */
CREATE OR REPLACE FUNCTION validate_onboarding_token(token_input TEXT)
RETURNS TABLE (
  session_id UUID,
  user_id UUID,
  company_id UUID,
  company_name TEXT,
  user_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    os.id AS session_id,
    os.user_id,
    os.company_id,
    c.name AS company_name,
    au.email AS user_email
  FROM onboarding_sessions os
  JOIN companies c ON c.id = os.company_id
  JOIN auth.users au ON au.id = os.user_id
  WHERE os.token = token_input
    AND os.used = false
    AND os.expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_onboarding_token IS 'Validates onboarding token and returns session details';

/**
 * Mark onboarding token as used
 */
CREATE OR REPLACE FUNCTION mark_onboarding_token_used(
  token_input TEXT,
  ip_address_input TEXT DEFAULT NULL,
  user_agent_input TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE onboarding_sessions
  SET
    used = true,
    used_at = NOW(),
    used_ip_address = ip_address_input,
    used_user_agent = user_agent_input,
    updated_at = NOW()
  WHERE token = token_input
    AND used = false
    AND expires_at > NOW();

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  RETURN rows_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_onboarding_token_used IS 'Marks onboarding token as used (one-time consumption)';

/**
 * Complete onboarding for a company
 */
CREATE OR REPLACE FUNCTION complete_company_onboarding(
  company_id_input UUID,
  ai_config_input JSONB DEFAULT NULL,
  branding_config_input JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE companies
  SET
    onboarding_completed = true,
    onboarding_completed_at = NOW(),
    ai_personality_config = COALESCE(ai_config_input, ai_personality_config),
    branding_config = COALESCE(branding_config_input, branding_config),
    updated_at = NOW()
  WHERE id = company_id_input
    AND onboarding_completed = false;  -- Only allow first completion

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  RETURN rows_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION complete_company_onboarding IS 'Marks company onboarding as completed and saves final configuration';

/**
 * Auto-update trigger for onboarding_sessions updated_at
 */
CREATE OR REPLACE FUNCTION update_onboarding_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER onboarding_sessions_updated_at_trigger
    BEFORE UPDATE ON onboarding_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_onboarding_sessions_updated_at();

-- ============================================================================
-- STEP 4: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on onboarding_sessions table
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own onboarding sessions
CREATE POLICY onboarding_sessions_select_own
ON onboarding_sessions
FOR SELECT
USING (user_id = auth.uid());

-- Policy: Only system/service role can create onboarding sessions (via Netlify functions)
CREATE POLICY onboarding_sessions_insert_service
ON onboarding_sessions
FOR INSERT
WITH CHECK (false);  -- Prevent direct inserts from client

-- Policy: Users can mark their own tokens as used
CREATE POLICY onboarding_sessions_update_own
ON onboarding_sessions
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- No DELETE policy - tokens should never be deleted, only marked as used

COMMENT ON POLICY onboarding_sessions_select_own ON onboarding_sessions IS 'Users can only view their own onboarding sessions';
COMMENT ON POLICY onboarding_sessions_insert_service ON onboarding_sessions IS 'Only service role can create sessions';
COMMENT ON POLICY onboarding_sessions_update_own ON onboarding_sessions IS 'Users can update their own sessions';

-- ============================================================================
-- STEP 5: CLEANUP OLD EXPIRED TOKENS (MAINTENANCE)
-- ============================================================================

/**
 * Function to cleanup expired onboarding tokens
 * Should be called periodically (daily via cron job or scheduled function)
 */
CREATE OR REPLACE FUNCTION cleanup_expired_onboarding_tokens()
RETURNS INTEGER AS $$
DECLARE
  rows_deleted INTEGER;
BEGIN
  DELETE FROM onboarding_sessions
  WHERE expires_at < NOW() - INTERVAL '7 days';  -- Keep for 7 days after expiration for audit

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;

  RETURN rows_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_onboarding_tokens IS 'Deletes expired onboarding tokens older than 7 days (maintenance)';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify companies table has new columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies'
    AND column_name = 'onboarding_completed'
  ) THEN
    RAISE EXCEPTION 'Migration failed: onboarding_completed column not added to companies table';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'onboarding_sessions'
  ) THEN
    RAISE EXCEPTION 'Migration failed: onboarding_sessions table not created';
  END IF;

  RAISE NOTICE '✅ Migration 15 completed successfully';
  RAISE NOTICE '   - Added onboarding fields to companies table';
  RAISE NOTICE '   - Created onboarding_sessions table';
  RAISE NOTICE '   - Created helper functions for token validation';
  RAISE NOTICE '   - Applied RLS policies';
END $$;
