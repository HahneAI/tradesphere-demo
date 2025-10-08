-- =====================================================================
-- Update Excavation Default Depth from 12 to 11 inches
-- =====================================================================
-- This updates the defaultDepth value in the variables_config JSONB
-- Run this in Supabase SQL Editor for all companies with excavation service
-- =====================================================================

UPDATE service_pricing_configs
SET
  variables_config = jsonb_set(
    variables_config,
    '{calculationSettings,defaultDepth,default}',
    '11'::jsonb
  ),
  updated_at = NOW()
WHERE
  service_name = 'excavation_removal'
  AND variables_config->'calculationSettings'->'defaultDepth'->>'default' = '12';

-- Verify the update
SELECT
  service_name,
  company_id,
  variables_config->'calculationSettings'->'defaultDepth'->>'default' as default_depth,
  updated_at
FROM service_pricing_configs
WHERE service_name = 'excavation_removal';
