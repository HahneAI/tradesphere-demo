-- ============================================================================
-- 04-FIX-TEST-CUSTOMERS-WITH-BYPASS.sql
-- Manual Fix with RLS Bypass: Populate Missing Trigger Data
-- ============================================================================
--
-- PURPOSE:
-- This script bypasses RLS policies that would block the SQL Editor
-- by using a DO block that temporarily sets the app context
--
-- IMPORTANT: Run this in Supabase SQL Editor (has service role permissions)
-- ============================================================================

DO $$
DECLARE
    v_company_id uuid := '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid;
BEGIN
    -- Set app context to bypass RLS policies
    PERFORM set_config('app.current_company_id', v_company_id::text, false);

    -- ============================================================================
    -- STEP 1: Create customer_matching_keys for Fuzzy Matching
    -- ============================================================================

    -- Sarah Johnson (Prospect)
    INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
    SELECT
        c.id,
        'email',
        c.customer_email,
        'sarah.johnson@email.com'
    FROM customers c
    WHERE c.customer_email = 'sarah.johnson@email.com'
      AND c.company_id = v_company_id
    ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;

    INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
    SELECT
        c.id,
        'phone',
        c.customer_phone,
        '5551234567'
    FROM customers c
    WHERE c.customer_phone = '(555) 123-4567'
      AND c.company_id = v_company_id
    ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;

    INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
    SELECT
        c.id,
        'name',
        c.customer_name,
        'sarah johnson'
    FROM customers c
    WHERE c.customer_name = 'Sarah Johnson'
      AND c.company_id = v_company_id
    ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;

    -- Michael Chen (Lead)
    INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
    SELECT
        c.id,
        'email',
        c.customer_email,
        'michael.chen@business.com'
    FROM customers c
    WHERE c.customer_email = 'michael.chen@business.com'
      AND c.company_id = v_company_id
    ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;

    INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
    SELECT
        c.id,
        'phone',
        c.customer_phone,
        '5559876543'
    FROM customers c
    WHERE c.customer_phone = '(555) 987-6543'
      AND c.company_id = v_company_id
    ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;

    INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
    SELECT
        c.id,
        'name',
        c.customer_name,
        'michael chen'
    FROM customers c
    WHERE c.customer_name = 'Michael Chen'
      AND c.company_id = v_company_id
    ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;

    -- Emily Rodriguez (Customer)
    INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
    SELECT
        c.id,
        'email',
        c.customer_email,
        'emily.rodriguez@home.com'
    FROM customers c
    WHERE c.customer_email = 'emily.rodriguez@home.com'
      AND c.company_id = v_company_id
    ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;

    INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
    SELECT
        c.id,
        'phone',
        c.customer_phone,
        '5552468135'
    FROM customers c
    WHERE c.customer_phone = '(555) 246-8135'
      AND c.company_id = v_company_id
    ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;

    INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
    SELECT
        c.id,
        'name',
        c.customer_name,
        'emily rodriguez'
    FROM customers c
    WHERE c.customer_name = 'Emily Rodriguez'
      AND c.company_id = v_company_id
    ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;

    RAISE NOTICE '✅ Created matching_keys for 3 customers';

    -- ============================================================================
    -- STEP 2: Refresh customer_metrics Materialized View
    -- ============================================================================

    REFRESH MATERIALIZED VIEW CONCURRENTLY customer_metrics;
    RAISE NOTICE '✅ Refreshed customer_metrics view';

    -- ============================================================================
    -- STEP 3: Create customer_events for Audit Trail
    -- ============================================================================

    -- Sarah Johnson creation event
    INSERT INTO customer_events (
        customer_id,
        company_id,
        event_type,
        event_data,
        created_by_user_id,
        created_at
    )
    SELECT
        c.id,
        c.company_id,
        'created',
        jsonb_build_object(
            'source', c.source,
            'lifecycle_stage', c.lifecycle_stage,
            'tags', c.tags,
            'method', 'manual_sql_insert'
        ),
        c.created_by_user_id,
        c.created_at
    FROM customers c
    WHERE c.customer_name = 'Sarah Johnson'
      AND c.company_id = v_company_id
      AND NOT EXISTS (
          SELECT 1 FROM customer_events ce
          WHERE ce.customer_id = c.id AND ce.event_type = 'created'
      );

    -- Michael Chen creation event
    INSERT INTO customer_events (
        customer_id,
        company_id,
        event_type,
        event_data,
        created_by_user_id,
        created_at
    )
    SELECT
        c.id,
        c.company_id,
        'created',
        jsonb_build_object(
            'source', c.source,
            'lifecycle_stage', c.lifecycle_stage,
            'tags', c.tags,
            'method', 'manual_sql_insert'
        ),
        c.created_by_user_id,
        c.created_at
    FROM customers c
    WHERE c.customer_name = 'Michael Chen'
      AND c.company_id = v_company_id
      AND NOT EXISTS (
          SELECT 1 FROM customer_events ce
          WHERE ce.customer_id = c.id AND ce.event_type = 'created'
      );

    -- Emily Rodriguez creation event
    INSERT INTO customer_events (
        customer_id,
        company_id,
        event_type,
        event_data,
        created_by_user_id,
        created_at
    )
    SELECT
        c.id,
        c.company_id,
        'created',
        jsonb_build_object(
            'source', c.source,
            'lifecycle_stage', c.lifecycle_stage,
            'tags', c.tags,
            'method', 'manual_sql_insert'
        ),
        c.created_by_user_id,
        c.created_at
    FROM customers c
    WHERE c.customer_name = 'Emily Rodriguez'
      AND c.company_id = v_company_id
      AND NOT EXISTS (
          SELECT 1 FROM customer_events ce
          WHERE ce.customer_id = c.id AND ce.event_type = 'created'
      );

    RAISE NOTICE '✅ Created customer_events for 3 customers';

END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check matching_keys created (should be 9 total: 3 customers × 3 keys each)
SELECT
    'Matching Keys' as check_type,
    COUNT(*) as total_records,
    COUNT(DISTINCT customer_id) as unique_customers
FROM customer_matching_keys cmk
WHERE customer_id IN (
    SELECT id FROM customers WHERE company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid
);

-- Check metrics created (should be 3)
SELECT
    'Customer Metrics' as check_type,
    COUNT(*) as total_records
FROM customer_metrics
WHERE company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid;

-- Check events created (should be 3)
SELECT
    'Customer Events' as check_type,
    COUNT(*) as total_records
FROM customer_events
WHERE company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid
  AND event_type = 'created';

-- Full customer profile check
SELECT
    c.customer_name,
    c.lifecycle_stage,
    c.source,
    (SELECT COUNT(*) FROM customer_matching_keys cmk WHERE cmk.customer_id = c.id) as matching_keys_count,
    CASE WHEN EXISTS(SELECT 1 FROM customer_metrics cm WHERE cm.customer_id = c.id) THEN 'Yes' ELSE 'No' END as has_metrics,
    (SELECT COUNT(*) FROM customer_events ce WHERE ce.customer_id = c.id) as event_count
FROM customers c
WHERE c.company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid
ORDER BY c.created_at;

-- ============================================================================
-- SUCCESS CRITERIA
-- ============================================================================
-- ✅ 9 matching_keys records (3 per customer: email, phone, name)
-- ✅ 3 customer_metrics records (in materialized view)
-- ✅ 3 customer_events records (event_type='created')
-- ✅ Final query shows all 3 customers with matching_keys_count=3, has_metrics='Yes', event_count >=1
