-- =====================================================
-- Migration: CLEAN and Fix RLS Policies for Service Tables
-- Created: 2025-10-23
-- Purpose: Remove ALL existing duplicate policies and create clean RLS
-- =====================================================

-- =====================================================
-- 1. DROP ALL EXISTING POLICIES (COMPLETE CLEANUP)
-- =====================================================

-- Drop all svc_pricing_configs policies
DROP POLICY IF EXISTS "Users can view their company's pricing configs" ON svc_pricing_configs;
DROP POLICY IF EXISTS "Owners can insert pricing configs" ON svc_pricing_configs;
DROP POLICY IF EXISTS "Owners can update pricing configs" ON svc_pricing_configs;
DROP POLICY IF EXISTS "Owners can delete pricing configs" ON svc_pricing_configs;
DROP POLICY IF EXISTS "Users can read own company configs" ON svc_pricing_configs;
DROP POLICY IF EXISTS "Admins can manage company configs" ON svc_pricing_configs;
DROP POLICY IF EXISTS "pricing_configs_select_company" ON svc_pricing_configs;
DROP POLICY IF EXISTS "pricing_configs_admin_insert" ON svc_pricing_configs;
DROP POLICY IF EXISTS "pricing_configs_admin_update" ON svc_pricing_configs;
DROP POLICY IF EXISTS "pricing_configs_admin_delete" ON svc_pricing_configs;

-- Drop all svc_material_categories policies
DROP POLICY IF EXISTS "Users can view their company's material categories" ON svc_material_categories;
DROP POLICY IF EXISTS "Owners can insert material categories" ON svc_material_categories;
DROP POLICY IF EXISTS "Owners can update material categories" ON svc_material_categories;
DROP POLICY IF EXISTS "Owners can delete material categories" ON svc_material_categories;
DROP POLICY IF EXISTS "Users can view material categories from their company" ON svc_material_categories;
DROP POLICY IF EXISTS "Edit roles can create categories" ON svc_material_categories;
DROP POLICY IF EXISTS "Edit roles can update categories" ON svc_material_categories;
DROP POLICY IF EXISTS "Edit roles can delete categories" ON svc_material_categories;

-- Drop all svc_materials policies
DROP POLICY IF EXISTS "Users can view their company's materials" ON svc_materials;
DROP POLICY IF EXISTS "Owners can insert materials" ON svc_materials;
DROP POLICY IF EXISTS "Owners can update materials" ON svc_materials;
DROP POLICY IF EXISTS "Owners can delete materials" ON svc_materials;
DROP POLICY IF EXISTS "Users can view materials from their company" ON svc_materials;
DROP POLICY IF EXISTS "Edit roles can create materials" ON svc_materials;
DROP POLICY IF EXISTS "Edit roles can update materials" ON svc_materials;
DROP POLICY IF EXISTS "Edit roles can delete materials" ON svc_materials;

-- =====================================================
-- 2. CREATE CLEAN RLS POLICIES (ONE PER OPERATION)
-- =====================================================

-- ============ SVC_PRICING_CONFIGS ============

CREATE POLICY "users_select_pricing_configs"
ON svc_pricing_configs
FOR SELECT
USING (
  company_id IN (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "admins_insert_pricing_configs"
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

CREATE POLICY "admins_update_pricing_configs"
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

CREATE POLICY "owners_delete_pricing_configs"
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

-- ============ SVC_MATERIAL_CATEGORIES ============

CREATE POLICY "users_select_material_categories"
ON svc_material_categories
FOR SELECT
USING (
  company_id IN (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "admins_insert_material_categories"
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

CREATE POLICY "admins_update_material_categories"
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

CREATE POLICY "owners_delete_material_categories"
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

-- ============ SVC_MATERIALS ============

CREATE POLICY "users_select_materials"
ON svc_materials
FOR SELECT
USING (
  company_id IN (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "admins_insert_materials"
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

CREATE POLICY "admins_update_materials"
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

CREATE POLICY "owners_delete_materials"
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
-- 3. CREATE INDEXES FOR PERFORMANCE (IF NOT EXISTS)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_svc_pricing_configs_company_id ON svc_pricing_configs(company_id);
CREATE INDEX IF NOT EXISTS idx_svc_material_categories_company_id ON svc_material_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_svc_materials_company_id ON svc_materials(company_id);

CREATE INDEX IF NOT EXISTS idx_svc_material_categories_service_config_id ON svc_material_categories(service_config_id);
CREATE INDEX IF NOT EXISTS idx_svc_materials_service_config_id ON svc_materials(service_config_id);

CREATE INDEX IF NOT EXISTS idx_svc_pricing_configs_company_active ON svc_pricing_configs(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_svc_material_categories_company_active ON svc_material_categories(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_svc_materials_company_active ON svc_materials(company_id, is_active);

-- =====================================================
-- 4. VERIFY RLS IS ENABLED
-- =====================================================

ALTER TABLE svc_pricing_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE svc_material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE svc_materials ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. VERIFICATION QUERIES
-- =====================================================

-- Run these after the migration to verify success:

-- Check RLS is enabled (should show true for all):
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('svc_pricing_configs', 'svc_material_categories', 'svc_materials');

-- Check exactly 4 policies per table (12 total):
-- SELECT tablename, COUNT(*) as policy_count FROM pg_policies WHERE tablename IN ('svc_pricing_configs', 'svc_material_categories', 'svc_materials') GROUP BY tablename ORDER BY tablename;

-- List all policies:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('svc_pricing_configs', 'svc_material_categories', 'svc_materials') ORDER BY tablename, policyname;
