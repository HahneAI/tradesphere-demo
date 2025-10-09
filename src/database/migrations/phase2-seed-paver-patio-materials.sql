-- =====================================================================
-- Phase 2: Seed Paver Patio Materials System
-- =====================================================================
-- This script populates the materials system with initial categories
-- and materials for the paver_patio_sqft service.
--
-- Run this in Supabase SQL Editor after tables are created.
-- =====================================================================

-- Demo Company ID (from AuthContext DEMO_USER)
-- Company: 08f0827a-608f-485a-a19f-e0c55ecf6484
-- User: cd7ad550-37f3-477a-975e-a34b226b7332

-- First, get the service_config_id for paver_patio_sqft
-- We'll use this in subsequent inserts
DO $$
DECLARE
  v_service_config_id UUID;
  v_company_id UUID := '08f0827a-608f-485a-a19f-e0c55ecf6484';
  v_user_id UUID := 'cd7ad550-37f3-477a-975e-a34b226b7332';
BEGIN
  -- Get the service config ID
  SELECT id INTO v_service_config_id
  FROM service_pricing_configs
  WHERE company_id = v_company_id
    AND service_name = 'paver_patio_sqft'
  LIMIT 1;

  IF v_service_config_id IS NULL THEN
    RAISE EXCEPTION 'Service config for paver_patio_sqft not found. Please ensure service_pricing_configs has paver_patio_sqft record for company.';
  END IF;

  RAISE NOTICE 'Using service_config_id: %', v_service_config_id;

  -- ===================================================================
  -- STEP 1: Insert Material Categories
  -- ===================================================================

  -- Category 1: Base Rock (Class II Road Base)
  INSERT INTO service_material_categories (
    company_id,
    service_config_id,
    category_key,
    category_label,
    category_description,
    sort_order,
    is_required,
    calculation_method,
    default_depth_inches,
    is_active
  ) VALUES (
    v_company_id,
    v_service_config_id,
    'base_rock',
    'Base Rock (Class II Road Base)',
    'Compacted gravel base layer providing structural foundation',
    1,
    true,
    'volume_depth',
    6.0,  -- 6 inch standard depth
    true
  ) ON CONFLICT DO NOTHING;

  -- Category 2: Clean Rock (Leveling Layer)
  INSERT INTO service_material_categories (
    company_id,
    service_config_id,
    category_key,
    category_label,
    category_description,
    sort_order,
    is_required,
    calculation_method,
    default_depth_inches,
    is_active
  ) VALUES (
    v_company_id,
    v_service_config_id,
    'clean_rock',
    'Clean Rock (Leveling Layer)',
    'Clean crushed stone for bedding and leveling pavers',
    2,
    true,
    'volume_depth',
    2.0,  -- 2 inch standard depth
    true
  ) ON CONFLICT DO NOTHING;

  -- Category 3: Landscape Fabric
  INSERT INTO service_material_categories (
    company_id,
    service_config_id,
    category_key,
    category_label,
    category_description,
    sort_order,
    is_required,
    calculation_method,
    default_depth_inches,
    is_active
  ) VALUES (
    v_company_id,
    v_service_config_id,
    'fabric',
    'Landscape Fabric',
    'Geotextile fabric for weed barrier and separation',
    3,
    true,
    'area_coverage',
    NULL,  -- Not used for area coverage
    true
  ) ON CONFLICT DO NOTHING;

  -- Category 4: Paver Blocks
  INSERT INTO service_material_categories (
    company_id,
    service_config_id,
    category_key,
    category_label,
    category_description,
    sort_order,
    is_required,
    calculation_method,
    default_depth_inches,
    is_active
  ) VALUES (
    v_company_id,
    v_service_config_id,
    'pavers',
    'Paver Blocks',
    'Interlocking concrete or natural stone pavers',
    4,
    true,
    'area_coverage',
    NULL,
    true
  ) ON CONFLICT DO NOTHING;

  -- Category 5: Edging
  INSERT INTO service_material_categories (
    company_id,
    service_config_id,
    category_key,
    category_label,
    category_description,
    sort_order,
    is_required,
    calculation_method,
    default_depth_inches,
    is_active
  ) VALUES (
    v_company_id,
    v_service_config_id,
    'edging',
    'Edging Restraint',
    'Paver edging to secure perimeter and prevent shifting',
    5,
    true,
    'linear_perimeter',
    NULL,
    true
  ) ON CONFLICT DO NOTHING;

  -- Category 6: Polymeric Sand
  INSERT INTO service_material_categories (
    company_id,
    service_config_id,
    category_key,
    category_label,
    category_description,
    sort_order,
    is_required,
    calculation_method,
    default_depth_inches,
    is_active
  ) VALUES (
    v_company_id,
    v_service_config_id,
    'polymeric_sand',
    'Polymeric Sand',
    'Polymeric jointing sand for paver gaps - hardens when wet',
    6,
    true,
    'area_coverage',
    NULL,
    true
  ) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Material categories created successfully';

  -- ===================================================================
  -- STEP 2: Insert Materials
  -- ===================================================================

  -- BASE ROCK MATERIALS
  INSERT INTO service_materials (
    company_id,
    service_config_id,
    material_name,
    material_category,
    material_description,
    supplier_name,
    unit_type,
    price_per_unit,
    units_per_package,
    coverage_per_unit,
    coverage_depth_inches,
    waste_factor_percentage,
    compaction_factor_percentage,
    is_active,
    is_default,
    material_grade,
    color,
    created_by,
    updated_by
  ) VALUES (
    v_company_id,
    v_service_config_id,
    'Bulk Limestone Class II Road Base',
    'base_rock',
    '3/4 minus crushed limestone aggregate, excellent compaction properties',
    'SiteOne Landscape Supply',
    'cubic_yard',
    36.75,
    NULL,  -- Sold in bulk
    NULL,  -- Volume calculation doesn''t use coverage
    6.0,   -- Standard 6 inch depth
    10.0,  -- 10% waste factor
    20.0,  -- 20% compaction factor (base materials settle)
    true,
    true,  -- DEFAULT material for base_rock
    'Standard',
    'Gray',
    v_user_id,
    v_user_id
  ) ON CONFLICT DO NOTHING;

  INSERT INTO service_materials (
    company_id,
    service_config_id,
    material_name,
    material_category,
    material_description,
    supplier_name,
    unit_type,
    price_per_unit,
    units_per_package,
    coverage_per_unit,
    coverage_depth_inches,
    waste_factor_percentage,
    compaction_factor_percentage,
    is_active,
    is_default,
    material_grade,
    color,
    created_by,
    updated_by
  ) VALUES (
    v_company_id,
    v_service_config_id,
    'Premium Recycled Concrete Base',
    'base_rock',
    'Eco-friendly recycled concrete aggregate, LEED certified',
    'Home Depot',
    'cubic_yard',
    42.00,
    NULL,
    NULL,
    6.0,
    10.0,
    20.0,
    true,
    false,
    'Premium',
    'Light Gray',
    v_user_id,
    v_user_id
  ) ON CONFLICT DO NOTHING;

  -- CLEAN ROCK MATERIALS
  INSERT INTO service_materials (
    company_id,
    service_config_id,
    material_name,
    material_category,
    material_description,
    supplier_name,
    unit_type,
    price_per_unit,
    units_per_package,
    coverage_per_unit,
    coverage_depth_inches,
    waste_factor_percentage,
    compaction_factor_percentage,
    is_active,
    is_default,
    material_grade,
    color,
    created_by,
    updated_by
  ) VALUES (
    v_company_id,
    v_service_config_id,
    'Clean Crushed Stone 3/4-1 inch',
    'clean_rock',
    'Washed angular crushed stone for bedding layer',
    'SiteOne Landscape Supply',
    'cubic_yard',
    19.90,
    NULL,
    NULL,
    2.0,   -- 2 inch depth standard
    10.0,
    0.0,   -- No compaction for bedding layer
    true,
    true,  -- DEFAULT
    'Standard',
    'Beige',
    v_user_id,
    v_user_id
  ) ON CONFLICT DO NOTHING;

  -- FABRIC MATERIALS
  INSERT INTO service_materials (
    company_id,
    service_config_id,
    material_name,
    material_category,
    material_description,
    supplier_name,
    unit_type,
    price_per_unit,
    units_per_package,
    coverage_per_unit,
    coverage_depth_inches,
    waste_factor_percentage,
    compaction_factor_percentage,
    is_active,
    is_default,
    material_grade,
    color,
    created_by,
    updated_by
  ) VALUES (
    v_company_id,
    v_service_config_id,
    'Commercial Grade Geotextile Fabric',
    'fabric',
    'Professional grade woven geotextile, 4oz weight, 12.5ft x 300ft roll',
    'SiteOne Landscape Supply',
    'square_foot',
    0.53,  -- $199.66 per roll ÷ 375 sqft = $0.53/sqft
    1,     -- Sold per roll
    375.0, -- 12.5ft x 30ft = 375 sqft per roll
    NULL,
    15.0,  -- 15% waste for overlap
    0.0,
    true,
    true,  -- DEFAULT
    'Commercial',
    'Black',
    v_user_id,
    v_user_id
  ) ON CONFLICT DO NOTHING;

  -- PAVER MATERIALS
  INSERT INTO service_materials (
    company_id,
    service_config_id,
    material_name,
    material_category,
    material_description,
    supplier_name,
    unit_type,
    price_per_unit,
    units_per_package,
    coverage_per_unit,
    coverage_depth_inches,
    waste_factor_percentage,
    compaction_factor_percentage,
    is_active,
    is_default,
    material_grade,
    color,
    created_by,
    updated_by
  ) VALUES (
    v_company_id,
    v_service_config_id,
    'Standard Concrete Paver 4x8',
    'pavers',
    'Holland pattern concrete paver, 4" x 8" x 2.375", 4.5 per sqft',
    'SiteOne Landscape Supply',
    'square_foot',
    5.17,
    1,
    1.0,   -- 1:1 coverage (sold per sqft)
    NULL,
    10.0,  -- 10% waste for cuts
    0.0,
    true,
    true,  -- DEFAULT
    'Standard',
    'Charcoal Gray',
    v_user_id,
    v_user_id
  ) ON CONFLICT DO NOTHING;

  INSERT INTO service_materials (
    company_id,
    service_config_id,
    material_name,
    material_category,
    material_description,
    supplier_name,
    unit_type,
    price_per_unit,
    units_per_package,
    coverage_per_unit,
    coverage_depth_inches,
    waste_factor_percentage,
    compaction_factor_percentage,
    is_active,
    is_default,
    material_grade,
    color,
    created_by,
    updated_by
  ) VALUES (
    v_company_id,
    v_service_config_id,
    'Premium Tumbled Paver',
    'pavers',
    'Tumbled finish concrete paver for aged look, 6" x 9"',
    'Belgard',
    'square_foot',
    7.50,
    1,
    1.0,
    NULL,
    15.0,  -- Higher waste for irregular pattern
    0.0,
    true,
    false,
    'Premium',
    'Autumn Blend',
    v_user_id,
    v_user_id
  ) ON CONFLICT DO NOTHING;

  INSERT INTO service_materials (
    company_id,
    service_config_id,
    material_name,
    material_category,
    material_description,
    supplier_name,
    unit_type,
    price_per_unit,
    units_per_package,
    coverage_per_unit,
    coverage_depth_inches,
    waste_factor_percentage,
    compaction_factor_percentage,
    is_active,
    is_default,
    material_grade,
    color,
    created_by,
    updated_by
  ) VALUES (
    v_company_id,
    v_service_config_id,
    'Natural Stone Travertine Paver',
    'pavers',
    'Imported travertine natural stone, 12" x 12" x 1.25"',
    'MSI Surfaces',
    'square_foot',
    12.99,
    1,
    1.0,
    NULL,
    20.0,  -- Higher waste for natural stone
    0.0,
    true,
    false,
    'Luxury',
    'Ivory',
    v_user_id,
    v_user_id
  ) ON CONFLICT DO NOTHING;

  -- EDGING MATERIALS
  INSERT INTO service_materials (
    company_id,
    service_config_id,
    material_name,
    material_category,
    material_description,
    supplier_name,
    unit_type,
    price_per_unit,
    units_per_package,
    coverage_per_unit,
    coverage_depth_inches,
    waste_factor_percentage,
    compaction_factor_percentage,
    is_active,
    is_default,
    material_grade,
    color,
    created_by,
    updated_by
  ) VALUES (
    v_company_id,
    v_service_config_id,
    'Aluminum Paver Edging',
    'edging',
    'Professional grade aluminum edging, 4" height, 8ft sections',
    'SiteOne Landscape Supply',
    'linear_foot',
    1.24,
    1,
    8.0,   -- 8ft per section
    NULL,
    10.0,  -- 10% waste for cuts and corners
    0.0,
    true,
    true,  -- DEFAULT
    'Commercial',
    'Black',
    v_user_id,
    v_user_id
  ) ON CONFLICT DO NOTHING;

  INSERT INTO service_materials (
    company_id,
    service_config_id,
    material_name,
    material_category,
    material_description,
    supplier_name,
    unit_type,
    price_per_unit,
    units_per_package,
    coverage_per_unit,
    coverage_depth_inches,
    waste_factor_percentage,
    compaction_factor_percentage,
    is_active,
    is_default,
    material_grade,
    color,
    created_by,
    updated_by
  ) VALUES (
    v_company_id,
    v_service_config_id,
    'Steel Paver Restraint',
    'edging',
    'Heavy-duty galvanized steel edging, 5" height',
    'Pave Edge',
    'linear_foot',
    1.85,
    1,
    10.0,  -- 10ft per section
    NULL,
    10.0,
    0.0,
    true,
    false,
    'Premium',
    'Galvanized Silver',
    v_user_id,
    v_user_id
  ) ON CONFLICT DO NOTHING;

  -- POLYMERIC SAND MATERIALS
  INSERT INTO service_materials (
    company_id,
    service_config_id,
    material_name,
    material_category,
    material_description,
    supplier_name,
    unit_type,
    price_per_unit,
    units_per_package,
    coverage_per_unit,
    coverage_depth_inches,
    waste_factor_percentage,
    compaction_factor_percentage,
    is_active,
    is_default,
    material_grade,
    color,
    created_by,
    updated_by
  ) VALUES (
    v_company_id,
    v_service_config_id,
    'Alliance Gator Dust Bond',
    'polymeric_sand',
    'Premium polymeric sand, binds when activated with water, 50lb bag',
    'SiteOne Landscape Supply',
    'square_foot',
    0.38,  -- $37.60 per 50lb bag, covers ~100 sqft = $0.38/sqft
    1,     -- Sold per bag
    100.0, -- 100 sqft coverage per bag
    NULL,
    10.0,  -- 10% waste
    0.0,
    true,
    true,  -- DEFAULT
    'Premium',
    'Beige',
    v_user_id,
    v_user_id
  ) ON CONFLICT DO NOTHING;

  INSERT INTO service_materials (
    company_id,
    service_config_id,
    material_name,
    material_category,
    material_description,
    supplier_name,
    unit_type,
    price_per_unit,
    units_per_package,
    coverage_per_unit,
    coverage_depth_inches,
    waste_factor_percentage,
    compaction_factor_percentage,
    is_active,
    is_default,
    material_grade,
    color,
    created_by,
    updated_by
  ) VALUES (
    v_company_id,
    v_service_config_id,
    'Techniseal HP NextGel',
    'polymeric_sand',
    'High-performance polymeric sand, 40lb bag, rain-safe in 15 minutes',
    'Home Depot',
    'square_foot',
    0.42,  -- $42.00 per bag, ~100 sqft coverage
    1,
    100.0,
    NULL,
    10.0,
    0.0,
    true,
    false,
    'Premium',
    'Tan',
    v_user_id,
    v_user_id
  ) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Materials inserted successfully';

END $$;

-- ===================================================================
-- VERIFICATION QUERIES
-- ===================================================================

-- Count categories
SELECT
  'Categories Created' as check_type,
  COUNT(*) as count
FROM service_material_categories
WHERE company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'
  AND service_config_id IN (
    SELECT id FROM service_pricing_configs
    WHERE service_name = 'paver_patio_sqft'
  );

-- Count materials per category
SELECT
  material_category,
  COUNT(*) as material_count,
  COUNT(*) FILTER (WHERE is_default = true) as default_count
FROM service_materials
WHERE company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'
  AND service_config_id IN (
    SELECT id FROM service_pricing_configs
    WHERE service_name = 'paver_patio_sqft'
  )
GROUP BY material_category
ORDER BY material_category;

-- Show all categories with their materials
SELECT
  smc.sort_order,
  smc.category_key,
  smc.category_label,
  smc.calculation_method,
  COUNT(sm.id) as material_count
FROM service_material_categories smc
LEFT JOIN service_materials sm ON sm.material_category = smc.category_key
  AND sm.company_id = smc.company_id
  AND sm.service_config_id = smc.service_config_id
WHERE smc.company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'
  AND smc.service_config_id IN (
    SELECT id FROM service_pricing_configs
    WHERE service_name = 'paver_patio_sqft'
  )
GROUP BY smc.id, smc.sort_order, smc.category_key, smc.category_label, smc.calculation_method
ORDER BY smc.sort_order;

RAISE NOTICE 'Phase 2 materials seeding complete!';
