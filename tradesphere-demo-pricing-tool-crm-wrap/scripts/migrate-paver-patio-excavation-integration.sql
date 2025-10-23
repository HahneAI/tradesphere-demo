-- ============================================================================
-- Migration: Paver Patio Excavation Integration
-- ============================================================================
-- Purpose: Remove excavation category variables from paver_patio_sqft and
--          add serviceIntegrations with excavation bundling toggle
--
-- Changes:
-- 1. REMOVE variables_config.excavation (tearoutComplexity, equipmentRequired)
-- 2. ADD variables_config.serviceIntegrations.includeExcavation
--
-- Date: 2025-10-09
-- ============================================================================

-- Update all paver_patio_sqft service configurations
UPDATE service_pricing_configs
SET
  variables_config = (
    -- Remove the excavation category entirely
    variables_config - 'excavation'
  ) ||
  -- Add serviceIntegrations section
  jsonb_build_object(
    'serviceIntegrations',
    jsonb_build_object(
      'label', 'Bundled Services',
      'description', 'Automatically include related service calculations',
      'includeExcavation', jsonb_build_object(
        'type', 'toggle',
        'label', 'Include Excavation',
        'default', true,
        'description', 'Auto-calculate excavation cost and time based on patio square footage',
        'linkedService', 'excavation_removal'
      )
    )
  ),
  updated_at = NOW()
WHERE service_name = 'paver_patio_sqft'
  AND is_active = true;

-- Verification query - check results
SELECT
  company_id,
  service_name,
  variables_config -> 'excavation' as excavation_removed,  -- Should be NULL
  variables_config -> 'serviceIntegrations' as service_integrations,  -- Should have includeExcavation
  updated_at
FROM service_pricing_configs
WHERE service_name = 'paver_patio_sqft'
  AND is_active = true;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- WARNING: This rollback assumes you have a backup of the original excavation
-- category structure. If you don't have a backup, this cannot be fully reversed.
--
-- To rollback this migration:
-- 1. Restore from backup before running this migration
-- 2. OR manually recreate excavation category structure from JSON file
-- ============================================================================

/*
-- ROLLBACK EXAMPLE (use with caution):
UPDATE service_pricing_configs
SET
  variables_config = (
    variables_config - 'serviceIntegrations'
  ) ||
  jsonb_build_object(
    'excavation',
    jsonb_build_object(
      'label', 'Excavation & Site Preparation',
      'description', 'Variables affecting excavation and site preparation',
      'tearoutComplexity', jsonb_build_object(
        'label', 'Tearout Complexity',
        'description', 'Multiplier based on what needs to be removed',
        'type', 'select',
        'default', 'grass',
        'calculationTier', 1,
        'effectType', 'labor_time_percentage',
        'options', jsonb_build_object(
          'grass', jsonb_build_object('label', 'Grass/Sod Only', 'value', 0, 'multiplier', 1.0),
          'concrete', jsonb_build_object('label', 'Concrete/Pavement', 'value', 20, 'multiplier', 1.2),
          'asphalt', jsonb_build_object('label', 'Heavy Asphalt', 'value', 30, 'multiplier', 1.3)
        )
      ),
      'equipmentRequired', jsonb_build_object(
        'label', 'Equipment Required',
        'type', 'select',
        'default', 'handTools',
        'calculationTier', 2,
        'effectType', 'daily_equipment_cost',
        'options', jsonb_build_object(
          'handTools', jsonb_build_object('label', 'Hand Tools Only', 'value', 0),
          'attachments', jsonb_build_object('label', 'Attachments/Jackhammers', 'value', 125),
          'lightMachinery', jsonb_build_object('label', 'Light Machinery', 'value', 250),
          'heavyMachinery', jsonb_build_object('label', 'Heavy Machinery', 'value', 350)
        )
      )
    )
  ),
  updated_at = NOW()
WHERE service_name = 'paver_patio_sqft'
  AND is_active = true;
*/
