-- =====================================================================
-- Initialize Excavation Service with Standardized JSONB Structure
-- =====================================================================
-- This script populates the excavation_removal service with the proper
-- variables_config JSONB structure matching the standardized format.
--
-- Run this once per company that needs excavation service initialized.
-- =====================================================================

UPDATE service_pricing_configs
SET variables_config = '{
  "formulaType": "volume_based",
  "formulaDescription": "Volume calculation with progressive labor hours: $25/yd³ + 5% profit",

  "calculationSettings": {
    "label": "Calculation Settings",
    "description": "Core calculation parameters for excavation",
    "defaultDepth": {
      "type": "number",
      "label": "Default Excavation Depth",
      "description": "Standard excavation depth for most jobs",
      "default": 11,
      "min": 1,
      "max": 36,
      "unit": "inches",
      "adminEditable": true
    },
    "wasteFactor": {
      "type": "number",
      "label": "Waste Factor",
      "description": "Additional material to account for settling and spillage",
      "default": 10,
      "min": 0,
      "max": 50,
      "unit": "%",
      "adminEditable": true
    },
    "compactionFactor": {
      "type": "number",
      "label": "Compaction Factor",
      "description": "Volume increase due to material expansion when excavated",
      "default": 0,
      "min": 0,
      "max": 30,
      "unit": "%",
      "adminEditable": true
    },
    "roundingRule": {
      "type": "select",
      "label": "Cubic Yard Rounding",
      "description": "How to round final cubic yard calculation",
      "default": "up_whole",
      "options": {
        "up_whole": {
          "label": "Round up to nearest whole yard",
          "value": 0
        },
        "up_half": {
          "label": "Round up to nearest 0.5 yard",
          "value": 0
        },
        "exact": {
          "label": "Use exact calculation",
          "value": 0
        }
      }
    }
  }
}'::jsonb,
updated_at = NOW()
WHERE service_name = 'excavation_removal';

-- Verify the update
SELECT
  service_name,
  company_id,
  variables_config->>'formulaType' as formula_type,
  variables_config->'calculationSettings' as calculation_settings,
  updated_at
FROM service_pricing_configs
WHERE service_name = 'excavation_removal';
