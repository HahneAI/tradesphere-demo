-- Check RLS status and policies for service_pricing_configs table

-- 1. Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'service_pricing_configs';

-- 2. List all policies on the table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'service_pricing_configs'
ORDER BY policyname;

-- 3. Check what the current user can see
SELECT
    id,
    company_id,
    service_name,
    profit_margin,
    updated_at
FROM service_pricing_configs
WHERE company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'
LIMIT 5;
