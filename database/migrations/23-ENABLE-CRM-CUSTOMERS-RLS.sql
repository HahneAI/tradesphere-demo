-- =====================================================
-- Migration: Enable RLS on crm_customers table
-- Created: 2025-10-24
-- Purpose: Enable Row-Level Security that was missing on crm_customers
-- =====================================================

-- Enable RLS on crm_customers table
-- Note: Policies already exist but RLS was not enabled
ALTER TABLE crm_customers ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
-- Run this to check: SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'crm_customers';
