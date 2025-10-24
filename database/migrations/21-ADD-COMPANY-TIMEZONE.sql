-- =====================================================================
-- MIGRATION 21: Add Company Timezone Setting
-- =====================================================================
-- Purpose: Add timezone configuration to companies table for company-wide time display
-- Dependencies: Companies table must exist
-- Estimated time: < 1 minute
-- =====================================================================

-- =====================================================================
-- Add timezone column to companies table
-- =====================================================================

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'America/Chicago';

-- Add index for timezone lookups
CREATE INDEX IF NOT EXISTS idx_companies_timezone ON companies(timezone);

-- Add comment for documentation
COMMENT ON COLUMN companies.timezone IS 'Company timezone in IANA format (e.g., America/Chicago, America/New_York). Affects all time displays for company users including dashboard clock, job scheduling, and timestamps.';

-- =====================================================================
-- Migration complete
-- =====================================================================
--
-- Usage: Users can now set their company timezone in Company Settings
-- All time displays (dashboard clock, job times, etc.) will use this timezone
-- Default timezone is America/Chicago (Central Time)
--
-- Common US Timezones:
--   America/New_York (Eastern)
--   America/Chicago (Central)
--   America/Denver (Mountain)
--   America/Phoenix (MST - no DST)
--   America/Los_Angeles (Pacific)
--   America/Anchorage (Alaska)
--   Pacific/Honolulu (Hawaii)
-- =====================================================================
