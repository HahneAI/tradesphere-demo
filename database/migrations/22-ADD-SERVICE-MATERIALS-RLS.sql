-- =====================================================
-- Migration: Add Row-Level Security Policies for Service & Materials Tables
-- Created: 2025-10-23
-- Purpose: Enable RLS and create multi-tenant isolation policies for:
--   - svc_pricing_configs
--   - svc_material_categories
--   - svc_materials
-- =====================================================

-- =====================================================
-- 1. ENABLE ROW-LEVEL SECURITY
-- =====================================================

ALTER TABLE svc_pricing_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE svc_material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE svc_materials ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. DROP EXISTING POLICIES (if any)
-- =====================================================

DROP POLICY IF EXISTS "Users can view their company's pricing configs" ON svc_pricing_configs;
DROP POLICY IF EXISTS "Owners can insert pricing configs" ON svc_pricing_configs;
DROP POLICY IF EXISTS "Owners can update pricing configs" ON svc_pricing_configs;
DROP POLICY IF EXISTS "Owners can delete pricing configs" ON svc_pricing_configs;

DROP POLICY IF EXISTS "Users can view their company's material categories" ON svc_material_categories;
DROP POLICY IF EXISTS "Owners can insert material categories" ON svc_material_categories;
DROP POLICY IF EXISTS "Owners can update material categories" ON svc_material_categories;
DROP POLICY IF EXISTS "Owners can delete material categories" ON svc_material_categories;

DROP POLICY IF EXISTS "Users can view their company's materials" ON svc_materials;
DROP POLICY IF EXISTS "Owners can insert materials" ON svc_materials;
DROP POLICY IF EXISTS "Owners can update materials" ON svc_materials;
DROP POLICY IF EXISTS "Owners can delete materials" ON svc_materials;

-- =====================================================
-- 3. SVC_PRICING_CONFIGS POLICIES
-- =====================================================

-- SELECT: All authenticated users can view their company's pricing configs
CREATE POLICY "Users can view their company's pricing configs"
ON svc_pricing_configs
FOR SELECT
USING (
  company_id IN (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
  )
);

-- INSERT: Only owners and admins can create pricing configs
CREATE POLICY "Owners can insert pricing configs"
ON svc_pricing_configs
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
    AND (is_owner = true OR is_admin = true)
  )
);

-- UPDATE: Only owners and admins can update pricing configs
CREATE POLICY "Owners can update pricing configs"
ON svc_pricing_configs
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
    AND (is_owner = true OR is_admin = true)
  )
);

-- DELETE: Only owners can delete pricing configs
CREATE POLICY "Owners can delete pricing configs"
ON svc_pricing_configs
FOR DELETE
USING (
  company_id IN (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
    AND is_owner = true
  )
);

-- =====================================================
-- 4. SVC_MATERIAL_CATEGORIES POLICIES
-- =====================================================

-- SELECT: All authenticated users can view their company's material categories
CREATE POLICY "Users can view their company's material categories"
ON svc_material_categories
FOR SELECT
USING (
  company_id IN (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
  )
);

-- INSERT: Only owners and admins can create material categories
CREATE POLICY "Owners can insert material categories"
ON svc_material_categories
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
    AND (is_owner = true OR is_admin = true)
  )
);

-- UPDATE: Only owners and admins can update material categories
CREATE POLICY "Owners can update material categories"
ON svc_material_categories
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
    AND (is_owner = true OR is_admin = true)
  )
);

-- DELETE: Only owners can delete material categories
CREATE POLICY "Owners can delete material categories"
ON svc_material_categories
FOR DELETE
USING (
  company_id IN (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
    AND is_owner = true
  )
);

-- =====================================================
-- 5. SVC_MATERIALS POLICIES
-- =====================================================

-- SELECT: All authenticated users can view their company's materials
CREATE POLICY "Users can view their company's materials"
ON svc_materials
FOR SELECT
USING (
  company_id IN (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
  )
);

-- INSERT: Only owners and admins can create materials
CREATE POLICY "Owners can insert materials"
ON svc_materials
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
    AND (is_owner = true OR is_admin = true)
  )
);

-- UPDATE: Only owners and admins can update materials
CREATE POLICY "Owners can update materials"
ON svc_materials
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
    AND (is_owner = true OR is_admin = true)
  )
);

-- DELETE: Only owners can delete materials
CREATE POLICY "Owners can delete materials"
ON svc_materials
FOR DELETE
USING (
  company_id IN (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
    AND is_owner = true
  )
);

-- =====================================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index on company_id for efficient filtering
CREATE INDEX IF NOT EXISTS idx_svc_pricing_configs_company_id ON svc_pricing_configs(company_id);
CREATE INDEX IF NOT EXISTS idx_svc_material_categories_company_id ON svc_material_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_svc_materials_company_id ON svc_materials(company_id);

-- Index on service_config_id for efficient joins
CREATE INDEX IF NOT EXISTS idx_svc_material_categories_service_config_id ON svc_material_categories(service_config_id);
CREATE INDEX IF NOT EXISTS idx_svc_materials_service_config_id ON svc_materials(service_config_id);

-- Composite index for common queries (company_id + is_active)
CREATE INDEX IF NOT EXISTS idx_svc_pricing_configs_company_active ON svc_pricing_configs(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_svc_material_categories_company_active ON svc_material_categories(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_svc_materials_company_active ON svc_materials(company_id, is_active);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON POLICY "Users can view their company's pricing configs" ON svc_pricing_configs IS
  'Multi-tenant isolation: Users can only view pricing configs from their own company';

COMMENT ON POLICY "Users can view their company's material categories" ON svc_material_categories IS
  'Multi-tenant isolation: Users can only view material categories from their own company';

COMMENT ON POLICY "Users can view their company's materials" ON svc_materials IS
  'Multi-tenant isolation: Users can only view materials from their own company';
