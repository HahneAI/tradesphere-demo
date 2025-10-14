-- ============================================================================
-- 04-FIX-TEST-CUSTOMERS.sql
-- Manual Fix: Populate Missing Trigger Data for Test Customers
-- ============================================================================
--
-- PURPOSE:
-- The test customers were inserted directly into the customers table, but
-- the sync triggers only fire on UPDATE (not INSERT). This script manually
-- creates the missing trigger data that would have been auto-generated.
--
-- WHAT THIS FIXES:
-- 1. customer_matching_keys - Normalized search keys for duplicate detection
-- 2. customer_metrics - Initial metrics records for LEFT JOIN queries
-- 3. customer_events - Audit trail for customer creation events
--
-- RUN AFTER: TEST-CUSTOMER-DATA.sql
-- ============================================================================

-- ============================================================================
-- STEP 1: Create customer_matching_keys for Fuzzy Matching
-- ============================================================================
-- These keys enable duplicate detection via normalized email/phone/name

-- Sarah Johnson (Prospect)
INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
SELECT
    c.id,
    'email',
    c.customer_email,
    'sarah.johnson@email.com' -- Already lowercase
FROM customers c
WHERE c.customer_email = 'sarah.johnson@email.com'
  AND c.company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid
ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;

INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
SELECT
    c.id,
    'phone',
    c.customer_phone,
    '5551234567' -- Digits only
FROM customers c
WHERE c.customer_phone = '(555) 123-4567'
  AND c.company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid
ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;

INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
SELECT
    c.id,
    'name',
    c.customer_name,
    'sarah johnson' -- Lowercase, single space
FROM customers c
WHERE c.customer_name = 'Sarah Johnson'
  AND c.company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid
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
  AND c.company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid
ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;

INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
SELECT
    c.id,
    'phone',
    c.customer_phone,
    '5559876543'
FROM customers c
WHERE c.customer_phone = '(555) 987-6543'
  AND c.company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid
ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;

INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
SELECT
    c.id,
    'name',
    c.customer_name,
    'michael chen'
FROM customers c
WHERE c.customer_name = 'Michael Chen'
  AND c.company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid
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
  AND c.company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid
ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;

INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
SELECT
    c.id,
    'phone',
    c.customer_phone,
    '5552468135'
FROM customers c
WHERE c.customer_phone = '(555) 246-8135'
  AND c.company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid
ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;

INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
SELECT
    c.id,
    'name',
    c.customer_name,
    'emily rodriguez'
FROM customers c
WHERE c.customer_name = 'Emily Rodriguez'
  AND c.company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid
ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;

-- ============================================================================
-- STEP 2: Refresh customer_metrics Materialized View
-- ============================================================================
-- customer_metrics is a materialized view, not a regular table
-- We refresh it to include the new test customers

REFRESH MATERIALIZED VIEW CONCURRENTLY customer_metrics;

-- ============================================================================
-- STEP 3: Create customer_events for Audit Trail
-- ============================================================================
-- Log creation events that would have been auto-generated by triggers

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
  AND c.company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid
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
  AND c.company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid
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
  AND c.company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid
  AND NOT EXISTS (
      SELECT 1 FROM customer_events ce
      WHERE ce.customer_id = c.id AND ce.event_type = 'created'
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check matching_keys created (should be 9 total: 3 customers × 3 keys each)
SELECT
    'Matching Keys' as check_type,
    COUNT(*) as total_records,
    COUNT(DISTINCT customer_id) as unique_customers
FROM customer_matching_keys
WHERE company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid;

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
    COUNT(DISTINCT cmk.id) as matching_keys_count,
    CASE WHEN cm.customer_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_metrics,
    COUNT(DISTINCT ce.id) as event_count
FROM customers c
LEFT JOIN customer_matching_keys cmk ON cmk.customer_id = c.id
LEFT JOIN customer_metrics cm ON cm.customer_id = c.id
LEFT JOIN customer_events ce ON ce.customer_id = c.id
WHERE c.company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid
GROUP BY c.customer_name, c.lifecycle_stage, c.source, cm.customer_id
ORDER BY c.created_at;

-- ============================================================================
-- SUCCESS CRITERIA
-- ============================================================================
-- ✅ 9 matching_keys records (3 per customer: email, phone, name)
-- ✅ 3 customer_metrics records
-- ✅ 3 customer_events records (event_type='created')
-- ✅ Final query shows all 3 customers with matching_keys_count=3, has_metrics='Yes', event_count=1
