-- =====================================================================
-- PHASE 4D: Company Owner Tracking
-- =====================================================================
-- Migration 17: Add owner_id to companies table and update onboarding flow
--
-- This migration:
-- 1. Adds owner_id column to companies table (references auth.users)
-- 2. Updates complete_company_onboarding() to set owner_id from onboarding session
-- 3. Backfills existing companies' owner_id from their onboarding sessions
--
-- Dependencies: Migration 15 (onboarding_sessions table must exist)

-- =====================================================================
-- 1. Add owner_id column to companies table
-- =====================================================================

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for owner lookups
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON companies(owner_id);

-- Add comment for documentation
COMMENT ON COLUMN companies.owner_id IS 'Reference to auth.users - the company owner who signed up via onboarding';

-- =====================================================================
-- 2. Update complete_company_onboarding function to set owner_id
-- =====================================================================

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

  RETURN rows_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION complete_company_onboarding IS 'Marks company onboarding as completed, sets owner_id from session, and saves final configuration';

-- =====================================================================
-- 3. Backfill owner_id for existing companies
-- =====================================================================
-- This updates any existing companies that don't have an owner_id set
-- by looking up their onboarding session

DO $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE companies c
  SET owner_id = (
    SELECT os.user_id
    FROM onboarding_sessions os
    WHERE os.company_id = c.id
    ORDER BY os.created_at DESC
    LIMIT 1
  )
  WHERE c.owner_id IS NULL
    AND EXISTS (
      SELECT 1 FROM onboarding_sessions os
      WHERE os.company_id = c.id
    );

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  IF rows_updated > 0 THEN
    RAISE NOTICE '✅ Backfilled owner_id for % existing companies', rows_updated;
  ELSE
    RAISE NOTICE '✅ No companies needed owner_id backfill';
  END IF;
END $$;

-- =====================================================================
-- 4. Verification
-- =====================================================================

DO $$
BEGIN
  -- Verify owner_id column was added
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies'
    AND column_name = 'owner_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: owner_id column not added to companies table';
  END IF;

  -- Verify index was created
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'companies'
    AND indexname = 'idx_companies_owner_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: idx_companies_owner_id index not created';
  END IF;

  RAISE NOTICE '✅ Migration 17 completed successfully';
  RAISE NOTICE '   - Added owner_id column to companies table';
  RAISE NOTICE '   - Updated complete_company_onboarding() function';
  RAISE NOTICE '   - Backfilled owner_id for existing companies';
END $$;
