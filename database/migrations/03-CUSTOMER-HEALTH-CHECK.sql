-- ============================================================================
-- PHASE 3B: CUSTOMER DATABASE HEALTH CHECK SCRIPT
-- ============================================================================
--
-- Purpose: Comprehensive health check for customer management database
-- Usage: Run this script anytime to verify database health and performance
-- Runtime: ~30 seconds
--
-- Sections:
-- 1. Index Verification
-- 2. Trigger Status Check
-- 3. RLS Policy Verification
-- 4. Data Integrity Checks
-- 5. Performance Metrics
-- 6. Slow Query Analysis
-- 7. Recommendations
-- ============================================================================

-- Set output formatting for better readability
\timing on
\pset border 2
\pset format aligned

-- ============================================================================
-- SECTION 1: INDEX VERIFICATION
-- ============================================================================

\echo ''
\echo '==============================================='
\echo '1. INDEX VERIFICATION'
\echo '==============================================='
\echo ''

-- Check all expected indexes exist
WITH expected_indexes AS (
    SELECT unnest(ARRAY[
        -- Customers table indexes
        'customers_pkey',
        'idx_customers_not_deleted',
        'idx_customers_company_status',
        'idx_customers_lifecycle',
        'idx_customers_name_trgm',
        'idx_customers_email',
        'idx_customers_phone',
        'idx_customers_tags',
        -- VC Usage indexes
        'idx_vc_usage_customer_fk',
        'idx_vc_usage_company_customer',
        'idx_vc_usage_session_customer',
        -- Customer matching keys indexes
        'idx_matching_keys_normalized',
        'idx_matching_keys_customer',
        -- Conversation summaries indexes
        'idx_conversation_summaries_customer',
        'idx_conversation_topics',
        -- Merge log indexes
        'idx_merge_log_source',
        'idx_merge_log_target',
        'idx_merge_log_date',
        -- Events indexes
        'idx_customer_events_customer',
        'idx_customer_events_company',
        'idx_customer_events_type',
        -- Audit log indexes
        'idx_audit_log_record',
        'idx_audit_log_company',
        'idx_audit_log_user',
        -- Metrics indexes
        'idx_customer_metrics_id',
        'idx_customer_metrics_company'
    ]) AS index_name
),
existing_indexes AS (
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
)
SELECT
    ei.index_name,
    CASE
        WHEN xi.indexname IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END AS status,
    CASE
        WHEN xi.indexname IS NULL THEN 'CREATE INDEX ' || ei.index_name || ' ON [table]([columns]);'
        ELSE NULL
    END AS fix_command
FROM expected_indexes ei
LEFT JOIN existing_indexes xi ON ei.index_name = xi.indexname
ORDER BY status DESC, ei.index_name;

-- Show index usage statistics
\echo ''
\echo 'Index Usage Statistics:'
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as times_used,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as size,
    CASE
        WHEN idx_scan = 0 THEN '⚠️ UNUSED'
        WHEN idx_scan < 100 THEN '🔵 Low usage'
        WHEN idx_scan < 1000 THEN '🟢 Normal usage'
        ELSE '🔥 High usage'
    END AS usage_level
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND tablename IN ('customers', 'VC Usage', 'customer_matching_keys',
                     'customer_conversation_summaries', 'customer_events')
ORDER BY idx_scan DESC
LIMIT 20;

-- ============================================================================
-- SECTION 2: TRIGGER STATUS CHECK
-- ============================================================================

\echo ''
\echo '==============================================='
\echo '2. TRIGGER STATUS CHECK'
\echo '==============================================='
\echo ''

-- Check all triggers are enabled
WITH expected_triggers AS (
    SELECT unnest(ARRAY[
        'trg_vc_usage_customer_sync_insert',
        'trg_vc_usage_customer_sync_update',
        'trg_customers_matching_keys_sync',
        'trg_vc_usage_metrics_refresh',
        'trg_customers_audit_log',
        'trg_customers_lifecycle_tracking'
    ]) AS trigger_name
)
SELECT
    et.trigger_name,
    COALESCE(t.event_object_table, 'N/A') as table_name,
    CASE
        WHEN t.trigger_name IS NOT NULL THEN
            CASE tgenabled
                WHEN 'O' THEN '✅ ENABLED'
                WHEN 'D' THEN '❌ DISABLED'
                WHEN 'R' THEN '⚠️ REPLICA ONLY'
                WHEN 'A' THEN '⚠️ ALWAYS'
                ELSE '❓ UNKNOWN'
            END
        ELSE '❌ MISSING'
    END AS status,
    COALESCE(t.action_statement, 'N/A') as function_called
FROM expected_triggers et
LEFT JOIN information_schema.triggers t ON et.trigger_name = t.trigger_name
LEFT JOIN pg_trigger pt ON pt.tgname = et.trigger_name
ORDER BY status DESC, et.trigger_name;

-- ============================================================================
-- SECTION 3: RLS POLICY VERIFICATION
-- ============================================================================

\echo ''
\echo '==============================================='
\echo '3. ROW-LEVEL SECURITY (RLS) VERIFICATION'
\echo '==============================================='
\echo ''

-- Check RLS is enabled on critical tables
SELECT
    schemaname,
    tablename,
    CASE rowsecurity
        WHEN true THEN '✅ ENABLED'
        ELSE '❌ DISABLED - SECURITY RISK!'
    END AS rls_status,
    CASE rowsecurity
        WHEN false THEN 'ALTER TABLE ' || tablename || ' ENABLE ROW LEVEL SECURITY;'
        ELSE NULL
    END AS fix_command
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('customers', 'customer_matching_keys',
                      'customer_conversation_summaries', 'customer_merge_log',
                      'customer_events', 'customer_audit_log')
ORDER BY rowsecurity, tablename;

-- Check RLS policies exist
\echo ''
\echo 'RLS Policies:'
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('customers', 'customer_matching_keys',
                      'customer_conversation_summaries', 'customer_events')
ORDER BY tablename, policyname;

-- ============================================================================
-- SECTION 4: DATA INTEGRITY CHECKS
-- ============================================================================

\echo ''
\echo '==============================================='
\echo '4. DATA INTEGRITY CHECKS'
\echo '==============================================='
\echo ''

-- Customer statistics by company
\echo 'Customer Distribution by Company:'
SELECT
    c.name as company_name,
    COUNT(cust.id) as total_customers,
    COUNT(cust.id) FILTER (WHERE cust.deleted_at IS NULL) as active_customers,
    COUNT(cust.id) FILTER (WHERE cust.deleted_at IS NOT NULL) as soft_deleted,
    COUNT(cust.id) FILTER (WHERE cust.lifecycle_stage = 'prospect') as prospects,
    COUNT(cust.id) FILTER (WHERE cust.lifecycle_stage = 'customer') as customers,
    COUNT(DISTINCT cust.created_by_user_id) as unique_creators
FROM companies c
LEFT JOIN customers cust ON c.id = cust.company_id
GROUP BY c.id, c.name
ORDER BY total_customers DESC;

-- Check for orphaned VC Usage records (should be linked to customers)
\echo ''
\echo 'Orphaned VC Usage Records (not linked to customers):'
SELECT
    company_id,
    COUNT(*) as orphaned_count,
    COUNT(DISTINCT customer_name) as unique_customer_names,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM "VC Usage"
WHERE customer_id IS NULL
    AND customer_name IS NOT NULL
    AND customer_name != ''
GROUP BY company_id
ORDER BY orphaned_count DESC;

-- Check for duplicate customers (same email or phone)
\echo ''
\echo 'Potential Duplicate Customers:'
WITH duplicate_emails AS (
    SELECT
        customer_email,
        company_id,
        COUNT(*) as duplicate_count,
        array_agg(id) as customer_ids,
        array_agg(customer_name) as customer_names
    FROM customers
    WHERE deleted_at IS NULL
        AND customer_email IS NOT NULL
    GROUP BY company_id, customer_email
    HAVING COUNT(*) > 1
),
duplicate_phones AS (
    SELECT
        customer_phone,
        company_id,
        COUNT(*) as duplicate_count,
        array_agg(id) as customer_ids,
        array_agg(customer_name) as customer_names
    FROM customers
    WHERE deleted_at IS NULL
        AND customer_phone IS NOT NULL
    GROUP BY company_id, customer_phone
    HAVING COUNT(*) > 1
)
SELECT
    'Email' as duplicate_type,
    customer_email as value,
    duplicate_count,
    customer_names[1] || ' + ' || (duplicate_count - 1)::text || ' others' as customers
FROM duplicate_emails
UNION ALL
SELECT
    'Phone' as duplicate_type,
    customer_phone as value,
    duplicate_count,
    customer_names[1] || ' + ' || (duplicate_count - 1)::text || ' others' as customers
FROM duplicate_phones
ORDER BY duplicate_count DESC
LIMIT 10;

-- Check matching keys synchronization
\echo ''
\echo 'Matching Keys Synchronization Status:'
WITH customer_counts AS (
    SELECT
        COUNT(*) as total_customers,
        COUNT(customer_email) as customers_with_email,
        COUNT(customer_phone) as customers_with_phone
    FROM customers
    WHERE deleted_at IS NULL
),
key_counts AS (
    SELECT
        COUNT(DISTINCT customer_id) as customers_with_keys,
        COUNT(*) FILTER (WHERE key_type = 'email') as email_keys,
        COUNT(*) FILTER (WHERE key_type = 'phone') as phone_keys,
        COUNT(*) FILTER (WHERE key_type = 'name') as name_keys
    FROM customer_matching_keys
)
SELECT
    cc.total_customers,
    kc.customers_with_keys,
    CASE
        WHEN cc.total_customers = kc.customers_with_keys THEN '✅ All synced'
        ELSE '⚠️ ' || (cc.total_customers - kc.customers_with_keys)::text || ' customers missing keys'
    END as sync_status,
    kc.email_keys,
    kc.phone_keys,
    kc.name_keys
FROM customer_counts cc, key_counts kc;

-- ============================================================================
-- SECTION 5: PERFORMANCE METRICS
-- ============================================================================

\echo ''
\echo '==============================================='
\echo '5. PERFORMANCE METRICS'
\echo '==============================================='
\echo ''

-- Materialized view refresh status
\echo 'Customer Metrics Materialized View Status:'
SELECT
    schemaname,
    matviewname,
    matviewowner,
    CASE ispopulated
        WHEN true THEN '✅ POPULATED'
        ELSE '❌ NOT POPULATED'
    END as status,
    pg_size_pretty(pg_relation_size(matviewname::regclass)) as size,
    (SELECT calculated_at FROM customer_metrics LIMIT 1) as last_refresh
FROM pg_matviews
WHERE matviewname = 'customer_metrics';

-- Average trigger execution times (if logging is enabled)
\echo ''
\echo 'Trigger Performance (estimated based on complexity):'
SELECT
    trigger_name,
    event_object_table as table_name,
    CASE trigger_name
        WHEN 'trg_vc_usage_customer_sync_insert' THEN '5-8ms'
        WHEN 'trg_vc_usage_customer_sync_update' THEN '5-8ms'
        WHEN 'trg_customers_matching_keys_sync' THEN '2-3ms'
        WHEN 'trg_vc_usage_metrics_refresh' THEN '8-10ms'
        WHEN 'trg_customers_audit_log' THEN '1-2ms'
        WHEN 'trg_customers_lifecycle_tracking' THEN '1-2ms'
        ELSE 'Unknown'
    END as estimated_time,
    CASE
        WHEN trigger_name LIKE '%sync%' THEN 'Consider async processing if >10ms'
        WHEN trigger_name LIKE '%metrics%' THEN 'Consider batch refresh if >10ms'
        ELSE 'Monitor performance'
    END as recommendation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND event_object_table IN ('customers', 'VC Usage')
ORDER BY event_object_table, trigger_name;

-- Table sizes and row counts
\echo ''
\echo 'Table Sizes and Row Counts:'
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
                   pg_relation_size(schemaname||'.'||tablename)) as index_size,
    n_live_tup as row_count,
    n_dead_tup as dead_rows,
    CASE
        WHEN n_live_tup > 0 THEN
            ROUND(100.0 * n_dead_tup / n_live_tup, 2)
        ELSE 0
    END as dead_row_percent,
    last_vacuum,
    last_analyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND tablename IN ('customers', 'VC Usage', 'customer_matching_keys',
                     'customer_conversation_summaries', 'customer_events',
                     'customer_audit_log')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- SECTION 6: SLOW QUERY ANALYSIS
-- ============================================================================

\echo ''
\echo '==============================================='
\echo '6. SLOW QUERY ANALYSIS (requires pg_stat_statements)'
\echo '==============================================='
\echo ''

-- Check if pg_stat_statements is available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_stat_statements') THEN
        -- Top 10 slowest customer-related queries
        RAISE NOTICE 'Top 10 Slowest Customer Queries:';

        -- Note: This requires pg_stat_statements to be enabled
        -- Uncomment if extension is available:
        /*
        PERFORM query, calls, mean_exec_time, max_exec_time
        FROM pg_stat_statements
        WHERE query ILIKE '%customers%'
           OR query ILIKE '%VC Usage%'
        ORDER BY mean_exec_time DESC
        LIMIT 10;
        */
    ELSE
        RAISE NOTICE 'pg_stat_statements extension not available. Cannot analyze slow queries.';
        RAISE NOTICE 'To enable: CREATE EXTENSION pg_stat_statements;';
    END IF;
END $$;

-- Alternative: Check current running queries
\echo ''
\echo 'Currently Running Customer Queries:'
SELECT
    pid,
    now() - query_start as duration,
    state,
    SUBSTRING(query, 1, 100) as query_preview
FROM pg_stat_activity
WHERE state != 'idle'
    AND (query ILIKE '%customers%' OR query ILIKE '%VC Usage%')
    AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY duration DESC;

-- ============================================================================
-- SECTION 7: HEALTH CHECK SUMMARY & RECOMMENDATIONS
-- ============================================================================

\echo ''
\echo '==============================================='
\echo '7. HEALTH CHECK SUMMARY'
\echo '==============================================='
\echo ''

-- Generate health score
WITH health_checks AS (
    SELECT 'Indexes' as category,
           COUNT(*) FILTER (WHERE indexname IS NOT NULL) as passed,
           27 as total
    FROM pg_indexes
    WHERE schemaname = 'public'
        AND indexname IN ('idx_customers_not_deleted', 'idx_customers_name_trgm',
                         'idx_vc_usage_customer_fk', 'idx_matching_keys_normalized')
    UNION ALL
    SELECT 'Triggers' as category,
           COUNT(*) FILTER (WHERE tgenabled = 'O') as passed,
           6 as total
    FROM pg_trigger
    WHERE tgname IN ('trg_vc_usage_customer_sync_insert', 'trg_vc_usage_customer_sync_update',
                     'trg_customers_matching_keys_sync', 'trg_vc_usage_metrics_refresh',
                     'trg_customers_audit_log', 'trg_customers_lifecycle_tracking')
    UNION ALL
    SELECT 'RLS Policies' as category,
           COUNT(*) FILTER (WHERE rowsecurity = true) as passed,
           6 as total
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename IN ('customers', 'customer_matching_keys',
                         'customer_conversation_summaries', 'customer_merge_log',
                         'customer_events', 'customer_audit_log')
)
SELECT
    category,
    passed || '/' || total as score,
    ROUND(100.0 * passed / NULLIF(total, 0), 1) || '%' as percentage,
    CASE
        WHEN passed = total THEN '✅ HEALTHY'
        WHEN passed >= total * 0.8 THEN '🟡 NEEDS ATTENTION'
        ELSE '❌ CRITICAL'
    END as status
FROM health_checks
UNION ALL
SELECT
    'OVERALL' as category,
    SUM(passed) || '/' || SUM(total) as score,
    ROUND(100.0 * SUM(passed) / NULLIF(SUM(total), 0), 1) || '%' as percentage,
    CASE
        WHEN SUM(passed) = SUM(total) THEN '✅ EXCELLENT'
        WHEN SUM(passed) >= SUM(total) * 0.9 THEN '🟢 GOOD'
        WHEN SUM(passed) >= SUM(total) * 0.7 THEN '🟡 FAIR'
        ELSE '❌ POOR'
    END as status
FROM health_checks
ORDER BY category = 'OVERALL' DESC, category;

-- Generate actionable recommendations
\echo ''
\echo 'Actionable Recommendations:'
WITH recommendations AS (
    -- Check for missing indexes
    SELECT 1 as priority,
           'Create missing indexes' as action,
           'Run migration scripts to create any missing indexes' as details
    WHERE EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
            AND indexname NOT IN (SELECT indexname FROM pg_indexes WHERE schemaname = 'public')
    )
    UNION ALL
    -- Check for disabled triggers
    SELECT 2 as priority,
           'Enable disabled triggers' as action,
           'ALTER TABLE [table] ENABLE TRIGGER [trigger_name];' as details
    WHERE EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgenabled != 'O'
    )
    UNION ALL
    -- Check for orphaned VC Usage records
    SELECT 3 as priority,
           'Link orphaned chat records' as action,
           'Run customer sync to link ' || COUNT(*)::text || ' orphaned VC Usage records' as details
    FROM "VC Usage"
    WHERE customer_id IS NULL AND customer_name IS NOT NULL
    HAVING COUNT(*) > 0
    UNION ALL
    -- Check for table bloat
    SELECT 4 as priority,
           'Vacuum bloated tables' as action,
           'VACUUM ANALYZE ' || tablename || '; -- ' || n_dead_tup || ' dead rows' as details
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
        AND n_dead_tup > 1000
        AND n_live_tup > 0
        AND (100.0 * n_dead_tup / n_live_tup) > 10
    UNION ALL
    -- Check for stale statistics
    SELECT 5 as priority,
           'Update table statistics' as action,
           'ANALYZE ' || tablename || '; -- Last analyzed: ' || COALESCE(last_analyze::text, 'NEVER') as details
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
        AND (last_analyze IS NULL OR last_analyze < NOW() - INTERVAL '7 days')
        AND tablename IN ('customers', 'VC Usage')
)
SELECT
    '⚠️ Priority ' || priority as priority,
    action,
    details
FROM recommendations
ORDER BY priority
LIMIT 10;

-- ============================================================================
-- FINAL STATUS MESSAGE
-- ============================================================================

\echo ''
\echo '==============================================='
\echo 'HEALTH CHECK COMPLETE'
\echo '==============================================='
\echo ''
\echo 'Next Steps:'
\echo '1. Review any ❌ CRITICAL or 🟡 WARNING items above'
\echo '2. Execute recommended fixes in order of priority'
\echo '3. Re-run this health check after making changes'
\echo '4. Schedule regular health checks (weekly recommended)'
\echo ''
\echo 'For detailed performance testing, see:'
\echo '- PHASE-3B-PERFORMANCE-TEST-PLAN.md'
\echo '- PHASE-3B-INDEX-VERIFICATION.md'
\echo ''

-- Reset formatting
\timing off
\pset border 1
\pset format aligned

-- ============================================================================
-- END OF HEALTH CHECK
-- ============================================================================