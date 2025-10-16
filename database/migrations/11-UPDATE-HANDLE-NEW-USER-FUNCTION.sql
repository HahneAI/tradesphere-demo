-- ============================================================================
-- PHASE 4A: DUAL SIGNUP FLOW FOR HANDLE_NEW_USER()
-- ============================================================================
--
-- Purpose: Update handle_new_user() trigger to support TWO distinct signup flows:
--   1. Owner Signup: From company website, includes company_id in metadata
--   2. Invited User Signup: From app invitation link, includes invitation_token
--
-- Status: Pre-release (critical for billing integration)
-- Strategy: Replace hardcoded company_id with dynamic flow detection
--
-- IMPORTANT: This enables both owner-initiated and team-invitation signups
-- Estimated time: ~3 minutes
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP EXISTING HANDLE_NEW_USER() FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- ============================================================================
-- STEP 2: CREATE NEW DUAL-FLOW HANDLE_NEW_USER() FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_company_id UUID;
    user_role TEXT;
    user_is_owner BOOLEAN := false;
    user_is_manager BOOLEAN := false;
    user_is_analyst BOOLEAN := false;
    user_is_sales BOOLEAN := false;
    user_is_field_tech BOOLEAN := false;
    invitation_token TEXT;
    invitation_record RECORD;
BEGIN
    -- ========================================================================
    -- FLOW DETECTION: Check metadata to determine signup source
    -- ========================================================================

    -- Extract invitation_token from metadata (app-side invited user signup)
    invitation_token := NEW.raw_user_meta_data->>'invitation_token';

    -- Extract company_id from metadata (website-side owner signup)
    IF invitation_token IS NULL THEN
        user_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
    END IF;

    -- ========================================================================
    -- FLOW 1: INVITED USER SIGNUP (from app invitation link)
    -- ========================================================================

    IF invitation_token IS NOT NULL THEN
        -- Validate invitation token
        SELECT
            company_id,
            role_type,
            email,
            used,
            expires_at
        INTO invitation_record
        FROM invitations
        WHERE token = invitation_token
        LIMIT 1;

        -- Check invitation validity
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Invalid invitation token';
        END IF;

        IF invitation_record.used = true THEN
            RAISE EXCEPTION 'Invitation already used';
        END IF;

        IF invitation_record.expires_at < NOW() THEN
            RAISE EXCEPTION 'Invitation expired';
        END IF;

        IF invitation_record.email != NEW.email THEN
            RAISE EXCEPTION 'Email does not match invitation';
        END IF;

        -- Extract company and role from invitation
        user_company_id := invitation_record.company_id;
        user_role := invitation_record.role_type;

        -- Set role flags based on invitation
        CASE invitation_record.role_type
            WHEN 'manager' THEN
                user_is_manager := true;
            WHEN 'analyst' THEN
                user_is_analyst := true;
            WHEN 'sales' THEN
                user_is_sales := true;
            WHEN 'field_tech' THEN
                user_is_field_tech := true;
            ELSE
                RAISE EXCEPTION 'Invalid role type in invitation: %', invitation_record.role_type;
        END CASE;

        -- Mark invitation as used
        UPDATE invitations
        SET
            used = true,
            used_at = NOW()
        WHERE token = invitation_token;

    -- ========================================================================
    -- FLOW 2: OWNER SIGNUP (from company website)
    -- ========================================================================

    ELSIF user_company_id IS NOT NULL THEN
        -- Owner signup from website
        user_role := 'owner';
        user_is_owner := true;

    -- ========================================================================
    -- FLOW 3: FALLBACK (legacy/development - hardcoded company)
    -- ========================================================================

    ELSE
        -- Fallback for development/testing (use default company)
        user_company_id := '08f0827a-608f-485a-a19f-e0c55ecf6484';
        user_role := 'owner';
        user_is_owner := true;

        RAISE WARNING 'No invitation_token or company_id in metadata. Using fallback company_id for development.';
    END IF;

    -- ========================================================================
    -- CREATE USER RECORD
    -- ========================================================================

    INSERT INTO public.users (
        id,
        email,
        name,
        company_id,
        role,
        is_admin,
        is_developer,
        is_owner,
        is_manager,
        is_analyst,
        is_sales,
        is_field_tech,
        user_icon,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        user_company_id,
        user_role,
        false,                  -- is_admin (reserved for TradeSphere admins)
        false,                  -- is_developer (reserved for TradeSphere developers)
        user_is_owner,          -- Dynamic based on signup flow
        user_is_manager,        -- Dynamic based on invitation
        user_is_analyst,        -- Dynamic based on invitation
        user_is_sales,          -- Dynamic based on invitation
        user_is_field_tech,     -- Dynamic based on invitation
        'User',
        NOW(),
        NOW()
    );

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_new_user IS 'Dual-flow user creation: (1) Owner signup from website with company_id metadata, (2) Invited user signup from app with invitation_token metadata. Validates tokens and assigns roles dynamically.';

-- ============================================================================
-- STEP 3: RECREATE TRIGGER ON AUTH.USERS
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to call handle_new_user() on new auth signups
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Automatically creates public.users record when new auth.users record is created. Supports owner and invited user signup flows.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify function exists
SELECT
    routine_name,
    routine_type,
    routine_definition LIKE '%invitation_token%' as supports_invitations
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';

-- Verify trigger exists
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- ============================================================================
-- TESTING GUIDE
-- ============================================================================

-- Test Flow 1: Invited User Signup
-- 1. Create invitation: INSERT INTO invitations (company_id, email, role_type, invited_by) VALUES (...)
-- 2. Get token: SELECT token FROM invitations WHERE email = 'test@example.com'
-- 3. Signup with metadata: { "invitation_token": "abc123..." }
-- 4. Verify: SELECT * FROM users WHERE email = 'test@example.com'
-- 5. Check invitation marked used: SELECT used, used_at FROM invitations WHERE token = 'abc123...'

-- Test Flow 2: Owner Signup
-- 1. Website creates company, gets company_id
-- 2. Signup with metadata: { "company_id": "uuid-here" }
-- 3. Verify: SELECT * FROM users WHERE email = 'owner@example.com'
-- 4. Check is_owner = true

-- ============================================================================
-- NEXT STEPS
-- ============================================================================

-- After running this migration:
-- 1. Run 12-ENHANCE-COMPANIES-PAYMENT-FIELDS.sql (add Dwolla payment tracking)
-- 2. Test both signup flows (owner + invited user)
-- 3. Verify invitation validation (expired, already used, wrong email)
-- 4. Update app signup forms to include appropriate metadata

-- ============================================================================
-- END OF HANDLE_NEW_USER UPDATE
-- ============================================================================
