-- ============================================================================
-- Fix: Excavation Service Zero Values Display
-- ============================================================================
-- Purpose: Update excavation_removal service to have 0 values for
--          labor/material settings that are not used in its calculations.
--          These should display as "—" (em dash) in the Services Database UI.
--
-- Background: Excavation service uses tier-based calculations with
--             variables_config.calculationSettings for its pricing.
--             Base settings (hourly_labor_rate, optimal_team_size, etc.)
--             are not used, so they should be 0 to indicate "N/A".
--
-- Date: 2025-10-08
-- ============================================================================

-- Check current values BEFORE update
SELECT
  company_id,
  service_name,
  hourly_labor_rate,
  optimal_team_size,
  base_productivity,
  base_material_cost,
  profit_margin,
  updated_at
FROM service_pricing_configs
WHERE service_name = 'excavation_removal'
  AND is_active = true;

-- Update excavation_removal to have 0 values for unused settings
UPDATE service_pricing_configs
SET
  -- hourly_labor_rate KEPT AS-IS (this IS used - represents price per cubic yard)
  optimal_team_size = 0,        -- Not used in calculation (show as "—")
  base_productivity = 0,        -- Not used in calculation (show as "—")
  base_material_cost = 0,       -- Not used in calculation (show as "—")
  -- profit_margin stays as-is (this IS used in the calculation)
  updated_at = NOW()
WHERE service_name = 'excavation_removal'
  AND is_active = true;

-- Verify the update
SELECT
  company_id,
  service_name,
  hourly_labor_rate as rate_per_cubic_yard_KEEP,
  optimal_team_size as team_size_should_be_0,
  base_productivity as productivity_should_be_0,
  base_material_cost as material_cost_should_be_0,
  profit_margin as profit_KEEP,
  updated_at
FROM service_pricing_configs
WHERE service_name = 'excavation_removal'
  AND is_active = true;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- After running this script, the Services Database UI should show:
--   - Base Rate: [actual $/yd³ value] (KEPT - this IS used as price per cubic yard)
--   - Optimal Team Size: —  (set to 0 - not used)
--   - Base Productivity: —  (set to 0 - not used)
--   - Base Material Cost: —  (set to 0 - not used)
--   - Profit Margin Target: [actual percentage value] (KEPT - this IS used)
--
-- The hourly_labor_rate field has been repurposed for excavation:
--   - Label: "Price per Cubic Yard" (not "Hourly Labor Rate")
--   - Unit: "$ per cubic yard" (not "$/hour/person")
--   - This value IS synced to the excavation formula calculations
-- ============================================================================
