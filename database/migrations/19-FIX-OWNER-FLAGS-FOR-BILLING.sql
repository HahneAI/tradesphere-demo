-- ============================================================================
-- MIGRATION 19: FIX OWNER FLAGS FOR BILLING TAB VISIBILITY
-- ============================================================================
--
-- Purpose: Synchronize is_owner flags with companies.owner_id for billing access
--
-- Problem:
-- - Billing tab in hamburger menu only shows when user.is_owner = true
-- - Test users have is_owner = false even though they should be owners
-- - Companies table has owner_id = NULL (not set during early testing)
--
-- Solution:
-- 1. Set companies.owner_id for existing test company
-- 2. Update users.is_owner to true for the designated owner
-- 3. Create helper function to keep is_owner in sync with owner_id
--
-- Status: Pre-production fix (required for billing UI access)
-- Estimated time: ~2 minutes
-- ============================================================================

-- ============================================================================
-- STEP 1: SET OWNER FOR TEST COMPANY
-- ============================================================================

-- Set Anthony as the owner of the test company
-- (Anthony has is_admin=true, making him the logical owner)
UPDATE companies
SET
    owner_id = 'cd7ad550-37f3-477a-975e-a34b226b7332',  -- Anthony's user ID
    updated_at = NOW()
WHERE id = '08f0827a-608f-485a-a19f-e0c55ecf6484'
AND owner_id IS NULL;  -- Only update if not already set

-- ============================================================================
-- STEP 2: UPDATE IS_OWNER FLAGS BASED ON OWNER_ID
-- ============================================================================

-- Set is_owner = true for users who match their company's owner_id
UPDATE users u
SET
    is_owner = true,
    updated_at = NOW()
FROM companies c
WHERE u.company_id = c.id
AND c.owner_id = u.id
AND u.is_owner = false;  -- Only update if currently false

-- Set is_owner = false for users who don't match their company's owner_id
UPDATE users u
SET
    is_owner = false,
    updated_at = NOW()
FROM companies c
WHERE u.company_id = c.id
AND c.owner_id IS NOT NULL
AND c.owner_id != u.id
AND u.is_owner = true;  -- Only update if currently true

-- ============================================================================
-- STEP 3: CREATE HELPER FUNCTION TO SYNC IS_OWNER
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_user_is_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- When company.owner_id changes, update all users for that company
    IF TG_OP = 'UPDATE' AND (OLD.owner_id IS DISTINCT FROM NEW.owner_id) THEN
        -- Set is_owner = true for the new owner
        IF NEW.owner_id IS NOT NULL THEN
            UPDATE users
            SET is_owner = true, updated_at = NOW()
            WHERE id = NEW.owner_id AND is_owner = false;
        END IF;

        -- Set is_owner = false for the old owner (if different)
        IF OLD.owner_id IS NOT NULL AND OLD.owner_id != NEW.owner_id THEN
            UPDATE users
            SET is_owner = false, updated_at = NOW()
            WHERE id = OLD.owner_id AND is_owner = true;
        END IF;

        -- Set is_owner = false for all other users in this company
        UPDATE users
        SET is_owner = false, updated_at = NOW()
        WHERE company_id = NEW.id
        AND id != NEW.owner_id
        AND is_owner = true;
    END IF;

    -- When company is created with owner_id, set is_owner for that user
    IF TG_OP = 'INSERT' AND NEW.owner_id IS NOT NULL THEN
        UPDATE users
        SET is_owner = true, updated_at = NOW()
        WHERE id = NEW.owner_id AND is_owner = false;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION sync_user_is_owner IS 'Automatically synchronizes users.is_owner flag when companies.owner_id changes. Ensures only the designated owner has is_owner=true.';

-- ============================================================================
-- STEP 4: CREATE TRIGGER ON COMPANIES TABLE
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_sync_user_is_owner ON companies;

CREATE TRIGGER trigger_sync_user_is_owner
    AFTER INSERT OR UPDATE OF owner_id
    ON companies
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_is_owner();

COMMENT ON TRIGGER trigger_sync_user_is_owner ON companies IS 'Keeps users.is_owner in sync with companies.owner_id for billing tab access';

-- ============================================================================
-- STEP 5: UPDATE COMPLETE_COMPANY_ONBOARDING TO SET OWNER_ID AND IS_OWNER
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_company_onboarding(
  company_id_input UUID,
  ai_config_input JSONB DEFAULT NULL,
  branding_config_input JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  rows_updated INTEGER;
  session_user_id UUID;
BEGIN
  -- Get the user_id from the most recent onboarding session for this company
  SELECT user_id INTO session_user_id
  FROM onboarding_sessions
  WHERE company_id = company_id_input
  ORDER BY created_at DESC
  LIMIT 1;

  -- Update company: set owner_id and mark onboarding complete
  UPDATE companies
  SET
    owner_id = COALESCE(owner_id, session_user_id),  -- Set owner_id if not already set
    onboarding_completed = true,
    onboarding_completed_at = NOW(),
    ai_personality_config = COALESCE(ai_config_input, ai_personality_config),
    branding_config = COALESCE(branding_config_input, branding_config),
    updated_at = NOW()
  WHERE id = company_id_input
    AND onboarding_completed = false;  -- Only allow first completion

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  -- Sync is_owner flag for the owner user (trigger will handle this, but explicit for safety)
  IF session_user_id IS NOT NULL AND rows_updated > 0 THEN
    UPDATE users
    SET is_owner = true, updated_at = NOW()
    WHERE id = session_user_id AND is_owner = false;
  END IF;

  RETURN rows_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION complete_company_onboarding IS 'Marks company onboarding as completed, sets owner_id from session, syncs is_owner flag, and saves final configuration';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify owner_id is set for test company
SELECT
    id,
    name,
    owner_id,
    onboarding_completed
FROM companies
WHERE id = '08f0827a-608f-485a-a19f-e0c55ecf6484';

-- Verify is_owner flags are correct
SELECT
    u.id,
    u.email,
    u.name,
    u.is_owner,
    u.company_id,
    c.owner_id,
    CASE
        WHEN u.id = c.owner_id THEN 'MATCH ✅'
        ELSE 'MISMATCH ❌'
    END as owner_status
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'
ORDER BY u.is_owner DESC, u.email;

-- Verify trigger was created
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_sync_user_is_owner';

-- Verify function exists
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name = 'sync_user_is_owner';

-- ============================================================================
-- TESTING GUIDE
-- ============================================================================

-- Test 1: Verify billing tab shows for owner
-- 1. Login as anthony@test.com in the app
-- 2. Open hamburger menu
-- 3. Should see "Billing & Subscription" menu item
-- Expected: Billing tab visible ✅

-- Test 2: Verify billing tab hidden for non-owners
-- 1. Login as tom@test.com or devon@test.com
-- 2. Open hamburger menu
-- 3. Should NOT see "Billing & Subscription" menu item
-- Expected: Billing tab hidden ✅

-- Test 3: Test owner transfer
-- UPDATE companies SET owner_id = '50dfad12-a6bc-42cd-a77a-1679fb9619a1' WHERE id = '08f0827a-608f-485a-a19f-e0c55ecf6484';
-- -- Anthony's is_owner should become false, Devon's should become true

-- Test 4: Test new company onboarding
-- 1. Complete onboarding wizard for a new company
-- 2. Verify owner_id is set to the user who completed onboarding
-- 3. Verify that user has is_owner = true
-- 4. Verify other users in that company have is_owner = false

-- ============================================================================
-- ROLLBACK PLAN
-- ============================================================================

-- If needed, rollback by:
-- 1. DROP TRIGGER trigger_sync_user_is_owner ON companies;
-- 2. DROP FUNCTION sync_user_is_owner();
-- 3. Restore original complete_company_onboarding function from migration 17
-- 4. Manually reset is_owner flags if needed

-- ============================================================================
-- NEXT STEPS AFTER RUNNING THIS MIGRATION
-- ============================================================================

-- 1. Login as anthony@test.com to verify billing tab is visible
-- 2. Test payment method updates in billing tab
-- 3. Verify subscription status displays correctly
-- 4. Test with other users (tom@test.com, devon@test.com) to confirm billing tab is hidden

-- ============================================================================
-- END OF OWNER FLAGS FIX
-- ============================================================================
