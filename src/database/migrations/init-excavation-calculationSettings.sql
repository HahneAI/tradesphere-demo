-- =====================================================================
-- Initialize Excavation Service with calculationSettings JSONB Structure
-- =====================================================================
-- This script populates the excavation_removal service with the proper
-- variables_config JSONB structure expected by ExcavationSpecificsModal
-- and the excavation calculation engine.
--
-- Run this once per company that needs excavation service initialized.
-- Replace the company_id value with your actual company ID.
-- =====================================================================

UPDATE service_pricing_configs
SET variables_config = '{
  "calculationSettings": {
    "defaultDepth": {
      "type": "number",
      "label": "Default Excavation Depth",
      "description": "Standard excavation depth for most jobs",
      "default": 12,
      "unit": "inches",
      "min": 1,
      "max": 36,
      "step": 1
    },
    "wasteFactor": {
      "type": "number",
      "label": "Waste Factor",
      "description": "Additional material to account for settling and spillage",
      "default": 10,
      "unit": "%",
      "min": 0,
      "max": 50,
      "step": 5
    },
    "compactionFactor": {
      "type": "number",
      "label": "Compaction Factor",
      "description": "Soil compaction percentage for volume calculations",
      "default": 0,
      "unit": "%",
      "min": 0,
      "max": 50,
      "step": 5
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
  variables_config->'calculationSettings' as calculation_settings,
  updated_at
FROM service_pricing_configs
WHERE service_name = 'excavation_removal';
