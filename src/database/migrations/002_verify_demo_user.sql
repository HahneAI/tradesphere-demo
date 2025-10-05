-- ============================================================================
-- DEMO USER VERIFICATION AND SETUP
-- ============================================================================
--
-- This script verifies and sets up the demo user account for testing
-- Run this in Supabase SQL Editor to ensure DEMO_MODE authentication works
--
-- ============================================================================

-- STEP 1: Verify company exists
SELECT 'Company Check:' as step,
       id,
       name,
       email
FROM public.companies
WHERE id = '08f0827a-608f-485a-a19f-e0c55ecf6484';

-- If company doesn't exist, create it:
INSERT INTO public.companies (id, company_id, name, email, subscription_status)
VALUES (
  '08f0827a-608f-485a-a19f-e0c55ecf6484',
  'DEMO_COMPANY_001',
  'Demo Company',
  'demo@tradesphere.ai',
  'trial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email;

-- STEP 2: Verify user exists in users table
SELECT 'Users Table Check:' as step,
       id,
       email,
       name,
       company_id,
       is_admin,
       role
FROM public.users
WHERE id = 'cd7ad550-37f3-477a-975e-a34b226b7332';

-- If user doesn't exist in users table, create it:
INSERT INTO public.users (
  id,
  company_id,
  email,
  name,
  role,
  title,
  is_admin,
  is_head_user,
  user_icon
)
VALUES (
  'cd7ad550-37f3-477a-975e-a34b226b7332',
  '08f0827a-608f-485a-a19f-e0c55ecf6484',
  'anthony@test.com',
  'Anthony',
  'admin',
  'Owner',
  true,
  true,
  'User'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  company_id = EXCLUDED.company_id,
  is_admin = EXCLUDED.is_admin,
  is_head_user = EXCLUDED.is_head_user;

-- STEP 3: Check Supabase Auth user
-- NOTE: This query may fail if you don't have access to auth schema
-- That's OK - just means you need to create the auth user manually
SELECT 'Auth User Check:' as step,
       id,
       email,
       created_at
FROM auth.users
WHERE email = 'anthony@test.com';

-- STEP 4: Verify service_pricing_configs exists for this company
SELECT 'Service Config Check:' as step,
       id,
       company_id,
       service_name,
       hourly_labor_rate,
       base_productivity,
       profit_margin,
       updated_at
FROM public.service_pricing_configs
WHERE company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'
  AND service_name = 'paver_patio_sqft';

-- STEP 5: Check RLS policies on service_pricing_configs
SELECT 'RLS Policies Check:' as step,
       schemaname,
       tablename,
       policyname,
       permissive,
       roles,
       cmd,
       qual
FROM pg_policies
WHERE tablename = 'service_pricing_configs';

-- STEP 6: Check if RLS is enabled on the table
SELECT 'RLS Enabled Check:' as step,
       schemaname,
       tablename,
       rowsecurity
FROM pg_tables
WHERE tablename = 'service_pricing_configs';

-- ============================================================================
-- MANUAL STEPS IF AUTH USER DOESN'T EXIST
-- ============================================================================
--
-- If auth.users query fails or returns no rows, you need to:
--
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" (or "Invite User")
-- 3. Enter:
--    - Email: anthony@test.com
--    - Password: 99
--    - Auto Confirm: YES (check this box)
--    - User ID: cd7ad550-37f3-477a-975e-a34b226b7332 (if possible to set manually)
--
-- If you can't set the user ID manually:
-- 1. Create the user with email/password
-- 2. Note the generated UUID
-- 3. Update DEMO_USER in src/context/AuthContext.tsx with the new UUID
-- 4. Update this script's user INSERT with the new UUID
--
-- ============================================================================

-- FINAL VERIFICATION: Test the full flow
SELECT
  'Final Verification:' as step,
  u.id as user_id,
  u.email,
  u.company_id,
  c.name as company_name,
  u.is_admin,
  COUNT(spc.id) as config_count
FROM public.users u
JOIN public.companies c ON u.company_id = c.id
LEFT JOIN public.service_pricing_configs spc ON spc.company_id = u.company_id
WHERE u.email = 'anthony@test.com'
GROUP BY u.id, u.email, u.company_id, c.name, u.is_admin;
