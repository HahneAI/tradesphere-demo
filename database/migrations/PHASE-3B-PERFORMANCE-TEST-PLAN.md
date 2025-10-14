# Phase 3B: Customer Management Performance Test Plan

**Date**: 2025-10-13
**Status**: Pre-release (Awaiting AI chat fix for full testing)
**Purpose**: Comprehensive performance testing plan for customer management system

---

## Test Environment Requirements

### Database Setup
- **Supabase PostgreSQL**: Production-equivalent instance
- **Data Volume**: 10,000+ customers, 50,000+ conversations
- **Multi-tenancy**: 10+ companies with varying data volumes
- **Connection Pool**: Configured for 100 concurrent connections

### Test Data Generation Script
```sql
-- Generate test data for performance testing
-- WARNING: Run only on staging/test environment

-- Function to generate random customer data
CREATE OR REPLACE FUNCTION generate_test_customers(
    p_company_id UUID,
    p_count INTEGER,
    p_user_id UUID
)
RETURNS void AS $$
DECLARE
    i INTEGER;
    v_customer_id UUID;
    v_tags TEXT[];
    v_lifecycle_stages TEXT[] := ARRAY['prospect', 'lead', 'customer', 'churned'];
BEGIN
    FOR i IN 1..p_count LOOP
        -- Random tags
        v_tags := CASE
            WHEN random() < 0.1 THEN ARRAY['vip', 'referral']
            WHEN random() < 0.3 THEN ARRAY['referral']
            WHEN random() < 0.5 THEN ARRAY['wholesale']
            ELSE ARRAY[]::TEXT[]
        END;

        -- Insert customer
        INSERT INTO customers (
            company_id,
            customer_name,
            customer_email,
            customer_phone,
            customer_address,
            status,
            lifecycle_stage,
            tags,
            source,
            created_by_user_id,
            created_at
        ) VALUES (
            p_company_id,
            'Test Customer ' || i || ' ' || substr(md5(random()::text), 1, 6),
            CASE WHEN random() < 0.8 THEN 'customer' || i || '@example.com' ELSE NULL END,
            CASE WHEN random() < 0.7 THEN '+1555' || LPAD(i::text, 7, '0') ELSE NULL END,
            CASE WHEN random() < 0.6 THEN i || ' Test Street, City, State 12345' ELSE NULL END,
            'active',
            v_lifecycle_stages[1 + floor(random() * 4)::int],
            v_tags,
            CASE
                WHEN random() < 0.5 THEN 'chat'
                WHEN random() < 0.8 THEN 'manual'
                ELSE 'import'
            END,
            p_user_id,
            NOW() - (random() * INTERVAL '365 days')
        )
        RETURNING id INTO v_customer_id;

        -- Create matching keys
        INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
        VALUES
            (v_customer_id, 'name', 'Test Customer ' || i, LOWER('Test Customer ' || i)),
            (v_customer_id, 'email', 'customer' || i || '@example.com', LOWER('customer' || i || '@example.com')),
            (v_customer_id, 'phone', '+1555' || LPAD(i::text, 7, '0'), '1555' || LPAD(i::text, 7, '0'));

        -- Generate random conversations (3-10 per customer)
        FOR j IN 1..(3 + floor(random() * 8)::int) LOOP
            INSERT INTO "VC Usage" (
                company_id,
                user_id,
                customer_id,
                customer_name,
                session_id,
                interaction_number,
                user_message,
                ai_response,
                created_at
            ) VALUES (
                p_company_id,
                p_user_id,
                v_customer_id,
                'Test Customer ' || i,
                'session_' || v_customer_id || '_' || j,
                j,
                'Test question about ' || CASE
                    WHEN random() < 0.3 THEN 'paver patio'
                    WHEN random() < 0.6 THEN 'retaining wall'
                    ELSE 'landscaping'
                END,
                'AI response with pricing details...',
                NOW() - (random() * INTERVAL '90 days')
            );
        END LOOP;

        -- Add some events
        INSERT INTO customer_events (
            customer_id,
            company_id,
            event_type,
            event_data,
            created_at
        )
        SELECT
            v_customer_id,
            p_company_id,
            CASE
                WHEN random() < 0.3 THEN 'created'
                WHEN random() < 0.6 THEN 'updated'
                ELSE 'stage_changed'
            END,
            '{"test": true}'::jsonb,
            NOW() - (random() * INTERVAL '30 days')
        FROM generate_series(1, 3 + floor(random() * 5)::int);

        -- Log progress every 100 customers
        IF i % 100 = 0 THEN
            RAISE NOTICE 'Generated % customers', i;
        END IF;
    END LOOP;

    -- Refresh materialized view
    REFRESH MATERIALIZED VIEW customer_metrics;

    RAISE NOTICE 'Successfully generated % customers for company %', p_count, p_company_id;
END;
$$ LANGUAGE plpgsql;

-- Usage:
-- SELECT generate_test_customers('company_id'::uuid, 1000, 'user_id'::uuid);
```

---

## Test Scenarios

### Test Scenario 1: Load Test - 1000 Customers, 5000 Conversations

#### Setup
```sql
-- Create test company and user
INSERT INTO companies (id, name) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Load Test Company');

INSERT INTO users (id, email, company_id) VALUES
    ('22222222-2222-2222-2222-222222222222', 'loadtest@example.com',
     '11111111-1111-1111-1111-111111111111');

-- Generate 1000 customers with conversations
SELECT generate_test_customers(
    '11111111-1111-1111-1111-111111111111'::uuid,
    1000,
    '22222222-2222-2222-2222-222222222222'::uuid
);
```

#### Test Queries
```sql
-- Test 1.1: Customer list pagination
EXPLAIN (ANALYZE, BUFFERS)
SELECT c.*, m.total_conversations
FROM customers c
LEFT JOIN customer_metrics m ON c.id = m.customer_id
WHERE c.company_id = '11111111-1111-1111-1111-111111111111'
    AND c.deleted_at IS NULL
ORDER BY c.created_at DESC
LIMIT 50 OFFSET 0;

-- Success Criteria: <50ms execution time

-- Test 1.2: Customer count with filters
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE lifecycle_stage = 'prospect') as prospects,
    COUNT(*) FILTER (WHERE lifecycle_stage = 'customer') as customers,
    COUNT(*) FILTER (WHERE 'vip' = ANY(tags)) as vip_customers
FROM customers
WHERE company_id = '11111111-1111-1111-1111-111111111111'
    AND deleted_at IS NULL;

-- Success Criteria: <30ms execution time

-- Test 1.3: Load customer with all relations
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    c.*,
    array_agg(DISTINCT cs.session_id) as sessions,
    COUNT(DISTINCT vc.id) as conversation_count,
    json_agg(DISTINCT e.*) as recent_events
FROM customers c
LEFT JOIN "VC Usage" vc ON c.id = vc.customer_id
LEFT JOIN customer_conversation_summaries cs ON c.id = cs.customer_id
LEFT JOIN customer_events e ON c.id = e.customer_id
WHERE c.id = (
    SELECT id FROM customers
    WHERE company_id = '11111111-1111-1111-1111-111111111111'
    LIMIT 1
)
GROUP BY c.id;

-- Success Criteria: <100ms execution time
```

#### Performance Metrics to Capture
- Query execution time (ms)
- Buffer cache hit ratio (%)
- Disk I/O operations
- Memory usage (work_mem)
- Index scans vs sequential scans

---

### Test Scenario 2: Search Test - Full-text Search Across All Fields

#### Test Data Preparation
```sql
-- Add specific searchable customers
INSERT INTO customers (company_id, customer_name, customer_email, customer_phone, created_by_user_id)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'John Smith', 'john.smith@example.com', '+1-555-123-4567', '22222222-2222-2222-2222-222222222222'),
    ('11111111-1111-1111-1111-111111111111', 'Johnny Smithson', 'johnny@example.com', '+1-555-123-4568', '22222222-2222-2222-2222-222222222222'),
    ('11111111-1111-1111-1111-111111111111', 'Jon Smythe', 'jon.smythe@example.com', '+1-555-123-4569', '22222222-2222-2222-2222-222222222222'),
    ('11111111-1111-1111-1111-111111111111', 'Jane Johnson', 'jane@example.com', '+1-555-987-6543', '22222222-2222-2222-2222-222222222222');
```

#### Search Performance Tests
```sql
-- Test 2.1: Fuzzy name search
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM customers
WHERE company_id = '11111111-1111-1111-1111-111111111111'
    AND deleted_at IS NULL
    AND customer_name % 'john'  -- Trigram similarity
ORDER BY SIMILARITY(customer_name, 'john') DESC
LIMIT 10;

-- Success Criteria: <30ms for fuzzy match on 1000+ customers

-- Test 2.2: Email exact match
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM customers
WHERE company_id = '11111111-1111-1111-1111-111111111111'
    AND deleted_at IS NULL
    AND customer_email = 'john.smith@example.com';

-- Success Criteria: <5ms for exact match

-- Test 2.3: Phone number search (normalized)
EXPLAIN (ANALYZE, BUFFERS)
SELECT c.* FROM customers c
JOIN customer_matching_keys mk ON c.id = mk.customer_id
WHERE c.company_id = '11111111-1111-1111-1111-111111111111'
    AND c.deleted_at IS NULL
    AND mk.key_type = 'phone'
    AND mk.normalized_value = '15551234567';

-- Success Criteria: <10ms for normalized phone match

-- Test 2.4: Combined OR search (most complex)
EXPLAIN (ANALYZE, BUFFERS)
WITH search_term AS (SELECT 'john' as term)
SELECT DISTINCT c.*
FROM customers c, search_term
WHERE c.company_id = '11111111-1111-1111-1111-111111111111'
    AND c.deleted_at IS NULL
    AND (
        customer_name ILIKE '%' || term || '%'
        OR customer_email ILIKE '%' || term || '%'
        OR EXISTS (
            SELECT 1 FROM customer_matching_keys mk
            WHERE mk.customer_id = c.id
            AND mk.normalized_value LIKE '%' || LOWER(term) || '%'
        )
    )
LIMIT 20;

-- Success Criteria: <50ms for combined search
```

---

### Test Scenario 3: Trigger Test - Bulk Insert 100 Chat Conversations

#### Bulk Insert Test
```sql
-- Test 3.1: Measure auto-sync trigger performance
DO $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
BEGIN
    v_start_time := clock_timestamp();

    -- Bulk insert 100 chat conversations
    INSERT INTO "VC Usage" (
        company_id,
        user_id,
        customer_name,
        customer_email,
        customer_phone,
        session_id,
        interaction_number,
        user_message,
        ai_response
    )
    SELECT
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        'Bulk Customer ' || i,
        'bulk' || i || '@example.com',
        '+1555' || LPAD(i::text, 7, '0'),
        'bulk_session_' || i,
        1,
        'Bulk test message',
        'Bulk test response'
    FROM generate_series(1, 100) i;

    v_end_time := clock_timestamp();

    RAISE NOTICE 'Bulk insert took: % ms',
        EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time));
END $$;

-- Success Criteria: <1000ms total (avg 10ms per trigger)

-- Test 3.2: Verify all customers were created
SELECT COUNT(DISTINCT customer_id) as customers_created
FROM "VC Usage"
WHERE session_id LIKE 'bulk_session_%'
    AND customer_id IS NOT NULL;

-- Expected: 100 customers created

-- Test 3.3: Verify matching keys were created
SELECT COUNT(*) as matching_keys_created
FROM customer_matching_keys mk
JOIN customers c ON mk.customer_id = c.id
WHERE c.customer_name LIKE 'Bulk Customer %';

-- Expected: 300 matching keys (3 per customer)

-- Test 3.4: Verify metrics were updated
SELECT COUNT(*) as metrics_updated
FROM customer_metrics m
JOIN customers c ON m.customer_id = c.id
WHERE c.customer_name LIKE 'Bulk Customer %';

-- Expected: 100 metrics records
```

---

### Test Scenario 4: Soft Delete Test

#### Setup Soft Delete Test Data
```sql
-- Create 100 customers to delete
INSERT INTO customers (company_id, customer_name, created_by_user_id)
SELECT
    '11111111-1111-1111-1111-111111111111',
    'Delete Test Customer ' || i,
    '22222222-2222-2222-2222-222222222222'
FROM generate_series(1, 100) i;
```

#### Soft Delete Performance Tests
```sql
-- Test 4.1: Perform bulk soft delete
EXPLAIN (ANALYZE, BUFFERS)
UPDATE customers
SET deleted_at = NOW()
WHERE company_id = '11111111-1111-1111-1111-111111111111'
    AND customer_name LIKE 'Delete Test Customer %';

-- Success Criteria: <50ms for 100 records

-- Test 4.2: Query performance with soft-deleted records
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*) as active_customers
FROM customers
WHERE company_id = '11111111-1111-1111-1111-111111111111'
    AND deleted_at IS NULL;

-- Success Criteria: Same performance as before delete (<30ms)
-- Verify: Partial index is used (idx_customers_not_deleted)

-- Test 4.3: Verify soft-deleted customers are hidden
SELECT COUNT(*) as should_be_zero
FROM customers
WHERE company_id = '11111111-1111-1111-1111-111111111111'
    AND customer_name LIKE 'Delete Test Customer %'
    AND deleted_at IS NULL;

-- Expected: 0 records

-- Test 4.4: Verify RLS hides soft-deleted records
SET app.current_company_id = '11111111-1111-1111-1111-111111111111';
SELECT COUNT(*) as visible_customers
FROM customers
WHERE customer_name LIKE 'Delete Test Customer %';

-- Expected: 0 records (RLS should filter them)
```

---

### Test Scenario 5: Multi-Tenant Test - 10 Companies, 1000 Customers Each

#### Setup Multi-Tenant Test Data
```sql
-- Create 10 test companies
DO $$
BEGIN
    FOR i IN 1..10 LOOP
        -- Create company
        INSERT INTO companies (id, name)
        VALUES (
            ('aaaaaaaa-aaaa-aaaa-aaaa-' || LPAD(i::text, 12, '0'))::uuid,
            'Test Company ' || i
        );

        -- Create user for company
        INSERT INTO users (id, email, company_id)
        VALUES (
            ('bbbbbbbb-bbbb-bbbb-bbbb-' || LPAD(i::text, 12, '0'))::uuid,
            'user' || i || '@company' || i || '.com',
            ('aaaaaaaa-aaaa-aaaa-aaaa-' || LPAD(i::text, 12, '0'))::uuid
        );

        -- Generate 1000 customers per company
        PERFORM generate_test_customers(
            ('aaaaaaaa-aaaa-aaaa-aaaa-' || LPAD(i::text, 12, '0'))::uuid,
            1000,
            ('bbbbbbbb-bbbb-bbbb-bbbb-' || LPAD(i::text, 12, '0'))::uuid
        );
    END LOOP;
END $$;
```

#### Multi-Tenant Isolation Tests
```sql
-- Test 5.1: Verify data isolation (Company 1 cannot see Company 2 data)
SET app.current_company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001';

SELECT COUNT(*) as company_1_customers
FROM customers
WHERE deleted_at IS NULL;

-- Expected: 1000 (only Company 1's customers)

-- Test 5.2: Performance with 10,000 total customers
EXPLAIN (ANALYZE, BUFFERS)
SELECT c.*, m.total_conversations
FROM customers c
LEFT JOIN customer_metrics m ON c.id = m.customer_id
WHERE c.company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000005'
    AND c.deleted_at IS NULL
ORDER BY c.created_at DESC
LIMIT 50;

-- Success Criteria: <50ms (same as single company)

-- Test 5.3: Cross-tenant query prevention
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Try to query another company's data
    SET app.current_company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001';

    SELECT COUNT(*) INTO v_count
    FROM customers
    WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002';

    IF v_count > 0 THEN
        RAISE EXCEPTION 'RLS FAILURE: Company 1 can see Company 2 data!';
    ELSE
        RAISE NOTICE 'RLS SUCCESS: No cross-tenant data leakage';
    END IF;
END $$;

-- Expected: "RLS SUCCESS" message

-- Test 5.4: Concurrent updates from multiple companies
-- This would be run from multiple connections simultaneously
-- Connection 1:
BEGIN;
UPDATE customers SET customer_notes = 'Company 1 update'
WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'
    AND deleted_at IS NULL
    LIMIT 10;
-- Hold transaction open...

-- Connection 2:
BEGIN;
UPDATE customers SET customer_notes = 'Company 2 update'
WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002'
    AND deleted_at IS NULL
    LIMIT 10;
-- Should not block - different companies

-- Both connections:
COMMIT;

-- Success Criteria: No blocking between different companies
```

---

## Success Criteria Summary

### Performance Targets
| Operation | Target | Acceptable | Failed |
|-----------|--------|------------|--------|
| Customer list (50 records) | <50ms | <100ms | >100ms |
| Customer search (fuzzy) | <30ms | <50ms | >50ms |
| Customer detail load | <100ms | <150ms | >150ms |
| Bulk trigger execution | <10ms/record | <15ms/record | >15ms/record |
| Soft delete operation | <50ms | <100ms | >100ms |
| Multi-tenant isolation | 0 leaks | 0 leaks | Any leak |

### Trigger Performance Requirements
- Individual trigger execution: <10ms
- No cascade failures
- No infinite loops
- Proper error handling
- Transaction safety

### Data Integrity Requirements
- No duplicate customers from same source
- All FK constraints maintained
- Soft deletes properly hidden
- Audit trail complete
- Matching keys synchronized

### Multi-Tenant Requirements
- Complete data isolation
- No performance degradation with multiple companies
- RLS policies enforced at all levels
- No cross-tenant data leakage

---

## Load Testing Tools

### pgbench Configuration
```bash
# Create custom pgbench script: customer_load_test.sql
\set company_id 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'
\set search_term 'john'

-- Customer list query
SELECT c.*, m.total_conversations
FROM customers c
LEFT JOIN customer_metrics m ON c.id = m.customer_id
WHERE c.company_id = :'company_id'::uuid
    AND c.deleted_at IS NULL
ORDER BY c.created_at DESC
LIMIT 50;

-- Customer search query
SELECT * FROM customers
WHERE company_id = :'company_id'::uuid
    AND deleted_at IS NULL
    AND customer_name % :'search_term'
LIMIT 10;

# Run load test
pgbench -c 10 -j 2 -t 100 -f customer_load_test.sql your_database

# -c 10: 10 concurrent clients
# -j 2: 2 worker threads
# -t 100: 100 transactions per client
```

### JMeter Test Plan
```xml
<!-- Save as customer_performance_test.jmx -->
<jmeterTestPlan version="1.2">
  <hashTree>
    <TestPlan>
      <stringProp name="TestPlan.name">Customer Management Performance Test</stringProp>
      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments">
        <collectionProp name="Arguments.arguments">
          <elementProp name="BASE_URL" elementType="Argument">
            <stringProp name="Argument.name">BASE_URL</stringProp>
            <stringProp name="Argument.value">https://your-api.supabase.co</stringProp>
          </elementProp>
        </collectionProp>
      </elementProp>
    </TestPlan>

    <ThreadGroup>
      <stringProp name="ThreadGroup.name">Customer API Users</stringProp>
      <intProp name="ThreadGroup.num_threads">50</intProp>
      <intProp name="ThreadGroup.ramp_time">10</intProp>
      <intProp name="ThreadGroup.duration">300</intProp>

      <HTTPSamplerProxy>
        <stringProp name="HTTPSampler.path">/rest/v1/customers</stringProp>
        <stringProp name="HTTPSampler.method">GET</stringProp>
        <HeaderManager>
          <collectionProp name="HeaderManager.headers">
            <elementProp name="apikey">
              <stringProp name="Header.name">apikey</stringProp>
              <stringProp name="Header.value">${SUPABASE_ANON_KEY}</stringProp>
            </elementProp>
          </collectionProp>
        </HeaderManager>
      </HTTPSamplerProxy>

      <ResponseAssertion>
        <collectionProp name="Asserion.test_strings">
          <stringProp name="49586">200</stringProp>
        </collectionProp>
        <intProp name="Assertion.test_type">1</intProp>
      </ResponseAssertion>

      <DurationAssertion>
        <longProp name="DurationAssertion.duration">100</longProp>
      </DurationAssertion>
    </ThreadGroup>

    <ResultCollector>
      <stringProp name="filename">customer_test_results.csv</stringProp>
    </ResultCollector>
  </hashTree>
</jmeterTestPlan>
```

---

## Monitoring During Tests

### Real-time Query Monitoring
```sql
-- Monitor active queries during load test
SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '100 milliseconds'
    AND state != 'idle'
ORDER BY duration DESC;

-- Monitor lock waits
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### Performance Metrics Collection
```sql
-- Create performance metrics table
CREATE TABLE IF NOT EXISTS performance_test_results (
    test_name VARCHAR(100),
    test_timestamp TIMESTAMPTZ DEFAULT NOW(),
    query_type VARCHAR(50),
    execution_time_ms NUMERIC,
    rows_returned INTEGER,
    cache_hit_ratio NUMERIC,
    notes TEXT
);

-- Function to log test results
CREATE OR REPLACE FUNCTION log_performance_test(
    p_test_name VARCHAR,
    p_query_type VARCHAR,
    p_execution_time_ms NUMERIC,
    p_rows_returned INTEGER,
    p_notes TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO performance_test_results (
        test_name,
        query_type,
        execution_time_ms,
        rows_returned,
        notes
    ) VALUES (
        p_test_name,
        p_query_type,
        p_execution_time_ms,
        p_rows_returned,
        p_notes
    );
END;
$$ LANGUAGE plpgsql;

-- Query to analyze test results
SELECT
    test_name,
    query_type,
    COUNT(*) as test_runs,
    AVG(execution_time_ms)::numeric(10,2) as avg_ms,
    MIN(execution_time_ms)::numeric(10,2) as min_ms,
    MAX(execution_time_ms)::numeric(10,2) as max_ms,
    STDDEV(execution_time_ms)::numeric(10,2) as stddev_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms)::numeric(10,2) as p95_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY execution_time_ms)::numeric(10,2) as p99_ms
FROM performance_test_results
WHERE test_timestamp > NOW() - INTERVAL '1 hour'
GROUP BY test_name, query_type
ORDER BY test_name, query_type;
```

---

## Test Execution Checklist

### Pre-Test Checklist
- [ ] Backup production database
- [ ] Create isolated test environment
- [ ] Generate test data (10,000+ customers)
- [ ] Clear query cache (DISCARD ALL)
- [ ] Reset pg_stat_statements
- [ ] Enable query logging
- [ ] Start monitoring tools

### During Test Checklist
- [ ] Monitor CPU usage (<80%)
- [ ] Monitor memory usage (<90%)
- [ ] Monitor disk I/O
- [ ] Check for lock waits
- [ ] Watch for slow queries
- [ ] Capture EXPLAIN plans
- [ ] Log anomalies

### Post-Test Checklist
- [ ] Analyze query statistics
- [ ] Review slow query log
- [ ] Calculate success metrics
- [ ] Document failures
- [ ] Generate performance report
- [ ] Clean up test data
- [ ] Restore settings

---

## Expected Results Summary

### Baseline Performance (Current State)
- Customer list: 500ms
- Customer search: 300ms
- Customer detail: 400ms
- No auto-sync from chat
- No materialized metrics

### Target Performance (After Optimization)
- Customer list: <50ms (10x improvement)
- Customer search: <30ms (10x improvement)
- Customer detail: <100ms (4x improvement)
- Auto-sync: <10ms per trigger
- Instant metrics via materialized view

### Risk Factors
- Trigger cascade under high load
- Materialized view refresh bottleneck
- Index bloat over time
- Connection pool exhaustion
- Lock contention on hot records

---

## Remediation Plans

### If Performance Targets Not Met

#### Slow Query Remediation
1. Analyze EXPLAIN plan
2. Check index usage
3. Update table statistics (ANALYZE)
4. Consider query rewrite
5. Add missing indexes
6. Tune work_mem if needed

#### Trigger Performance Issues
1. Disable non-critical triggers temporarily
2. Convert to async processing (LISTEN/NOTIFY)
3. Batch operations where possible
4. Optimize trigger function logic
5. Consider queue-based approach

#### Multi-Tenant Issues
1. Verify RLS policies
2. Check for missing company_id filters
3. Add company_id to all indexes
4. Review connection pooling settings
5. Consider sharding if needed

---

## Reporting Template

### Performance Test Report

**Test Date**: [DATE]
**Environment**: [Staging/Production]
**Data Volume**: [X customers, Y conversations]

#### Executive Summary
- Overall Result: [PASS/FAIL]
- Critical Issues: [List any blockers]
- Performance Improvement: [X% faster]

#### Detailed Results
| Test Scenario | Target | Actual | Status |
|--------------|--------|--------|--------|
| Customer List | <50ms | XXms | PASS/FAIL |
| Customer Search | <30ms | XXms | PASS/FAIL |
| Customer Detail | <100ms | XXms | PASS/FAIL |
| Trigger Performance | <10ms | XXms | PASS/FAIL |
| Multi-tenant Isolation | 0 leaks | X leaks | PASS/FAIL |

#### Recommendations
1. [Specific optimization needed]
2. [Configuration changes required]
3. [Index additions/removals]
4. [Code changes needed]

#### Next Steps
- [ ] Implement recommendations
- [ ] Re-test problem areas
- [ ] Schedule production deployment
- [ ] Plan monitoring strategy

---

**Document Status**: Complete
**Last Updated**: 2025-10-13
**Next Action**: Execute tests when AI chat system is restored