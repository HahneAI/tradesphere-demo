-- ============================================================================
-- PHASE 4A: TEAM INVITATIONS SYSTEM
-- ============================================================================
--
-- Purpose: Create token-based team invitation system for multi-user companies
-- Status: Pre-release (foundational for billing system)
-- Strategy: Secure invitation tokens with 7-day expiration and single-use enforcement
--
-- IMPORTANT: This enables invited user signup flow separate from owner signup
-- Estimated time: ~2 minutes
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE INVITATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role_type TEXT NOT NULL CHECK (role_type IN ('manager', 'analyst', 'sales', 'field_tech')),
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    used BOOLEAN NOT NULL DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE invitations IS 'Team invitation system. Tokens are 32-byte hex strings, expire in 7 days, and are single-use.';
COMMENT ON COLUMN invitations.company_id IS 'Company extending the invitation';
COMMENT ON COLUMN invitations.email IS 'Email address of invited user';
COMMENT ON COLUMN invitations.role_type IS 'Role to assign upon signup: manager, analyst, sales, or field_tech';
COMMENT ON COLUMN invitations.invited_by IS 'User who created the invitation (for audit trail)';
COMMENT ON COLUMN invitations.token IS 'Secure 32-byte hex token. Included in invitation link: /signup?token=XXX';
COMMENT ON COLUMN invitations.expires_at IS 'Token expiration timestamp. Default 7 days from creation.';
COMMENT ON COLUMN invitations.used IS 'True once invitation is accepted and user account created';
COMMENT ON COLUMN invitations.used_at IS 'Timestamp when invitation was accepted';

-- ============================================================================
-- STEP 2: CREATE INDEXES FOR INVITATION LOOKUPS
-- ============================================================================

-- Partial unique index: only one active invitation per email per company
-- Note: Cannot include expires_at > NOW() in index predicate (NOW() is not immutable)
-- Expiration validation happens in application logic and validate_invitation_token() function
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_unique_company_email_active
ON invitations(company_id, email)
WHERE used = false;

COMMENT ON INDEX idx_invitations_unique_company_email_active IS 'Ensures only one unused invitation per email per company. Expiration checked in app logic.';

-- Token lookup (most common query during signup)
CREATE INDEX IF NOT EXISTS idx_invitations_token
ON invitations(token)
WHERE used = false;

COMMENT ON INDEX idx_invitations_token IS 'Fast lookup of active invitation tokens during signup flow';

-- Company management views (list pending invitations)
CREATE INDEX IF NOT EXISTS idx_invitations_company_pending
ON invitations(company_id, created_at DESC)
WHERE used = false;

COMMENT ON INDEX idx_invitations_company_pending IS 'List pending invitations for company admin UI';

-- Email lookup (prevent duplicate invitations)
CREATE INDEX IF NOT EXISTS idx_invitations_email
ON invitations(company_id, email)
WHERE used = false;

-- Inviter audit trail
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by
ON invitations(invited_by, created_at DESC);

-- ============================================================================
-- STEP 3: ENABLE ROW-LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see invitations from their own company
DROP POLICY IF EXISTS invitations_company_isolation ON invitations;
CREATE POLICY invitations_company_isolation ON invitations
FOR ALL
USING (
    company_id IN (
        SELECT company_id FROM users
        WHERE id = auth.uid()
    )
);

COMMENT ON POLICY invitations_company_isolation ON invitations IS 'Multi-tenant isolation: Users only see invitations from their company';

-- ============================================================================
-- STEP 4: CREATE HELPER FUNCTION TO VALIDATE INVITATION TOKENS
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_invitation_token(token_input TEXT)
RETURNS TABLE(
    invitation_id UUID,
    company_id UUID,
    email TEXT,
    role_type TEXT,
    is_valid BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id,
        i.company_id,
        i.email,
        i.role_type,
        CASE
            WHEN i.id IS NULL THEN false
            WHEN i.used = true THEN false
            WHEN i.expires_at < NOW() THEN false
            ELSE true
        END as is_valid,
        CASE
            WHEN i.id IS NULL THEN 'Invalid invitation token'
            WHEN i.used = true THEN 'Invitation already used'
            WHEN i.expires_at < NOW() THEN 'Invitation expired'
            ELSE NULL
        END as error_message
    FROM invitations i
    WHERE i.token = token_input
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION validate_invitation_token IS 'Validates invitation token and returns company/role details for signup flow';

-- ============================================================================
-- STEP 5: CREATE FUNCTION TO MARK INVITATION AS USED
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_invitation_used(token_input TEXT, user_id_input UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE invitations
    SET
        used = true,
        used_at = NOW()
    WHERE
        token = token_input
        AND used = false
        AND expires_at > NOW();

    GET DIAGNOSTICS updated_count = ROW_COUNT;

    RETURN updated_count > 0;
END;
$$;

COMMENT ON FUNCTION mark_invitation_used IS 'Marks invitation as used during user signup. Returns true if successful.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table created
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'invitations') as column_count
FROM information_schema.tables
WHERE table_name = 'invitations';

-- Verify indexes created
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE tablename = 'invitations'
ORDER BY indexname;

-- Verify RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'invitations';

-- ============================================================================
-- NEXT STEPS
-- ============================================================================

-- After running this migration:
-- 1. Run 11-UPDATE-HANDLE-NEW-USER-FUNCTION.sql (add dual signup flow support)
-- 2. Test invitation creation from admin UI
-- 3. Test token validation during signup
-- 4. Verify invitation expiration and single-use enforcement

-- ============================================================================
-- END OF INVITATIONS TABLE SETUP
-- ============================================================================
