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
  hourly_labor_rate = 0,        -- Not used (uses calculationSettings.baseRatePerCubicYard instead)
  optimal_team_size = 0,        -- Not used in calculation
  base_productivity = 0,        -- Not used (excavation is tier-based on sqft)
  base_material_cost = 0,       -- Not used
  -- profit_margin stays as-is (this IS used in the calculation)
  updated_at = NOW()
WHERE service_name = 'excavation_removal'
  AND is_active = true;

-- Verify the update
SELECT
  company_id,
  service_name,
  hourly_labor_rate as labor_rate_should_be_0,
  optimal_team_size as team_size_should_be_0,
  base_productivity as productivity_should_be_0,
  base_material_cost as material_cost_should_be_0,
  profit_margin as profit_stays_same,
  variables_config -> 'calculationSettings' -> 'baseRatePerCubicYard' as actual_rate_used,
  updated_at
FROM service_pricing_configs
WHERE service_name = 'excavation_removal'
  AND is_active = true;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- After running this script, the Services Database UI should show:
--   - Base Rate: —  (instead of showing a value)
--   - Optimal Team Size: —
--   - Base Productivity: —
--   - Base Material Cost: —
--   - Profit Margin Target: [actual percentage value]
--
-- The actual excavation rate is stored in:
--   variables_config.calculationSettings.baseRatePerCubicYard.default
-- ============================================================================
