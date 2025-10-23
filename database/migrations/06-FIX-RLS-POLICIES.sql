-- ============================================================================
-- FIX RLS POLICIES FOR FRONTEND APPLICATION ACCESS
-- ============================================================================
--
-- Purpose: Update RLS policies to use Supabase auth.uid() instead of
--          current_setting('app.current_company_id') which is incompatible
--          with frontend applications.
--
-- Issue: The original RLS policies require session variables that are only
--        available in SQL Editor/backend contexts, causing ALL customer
--        queries to fail from the frontend application.
--
-- Solution: Use auth.uid() to get current user's company_id from users table.
--           This works seamlessly with Supabase JWT authentication.
--
-- Run this: In Supabase SQL Editor
-- Estimated time: <1 minute
-- ============================================================================

-- ============================================================================
-- STEP 1: UPDATE CUSTOMERS TABLE RLS POLICY
-- ============================================================================

-- Drop old policy that requires current_setting
DROP POLICY IF EXISTS customers_company_isolation ON customers;

-- Create new policy using auth.uid()
CREATE POLICY customers_company_isolation ON customers
FOR ALL
USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND deleted_at IS NULL
);

COMMENT ON POLICY customers_company_isolation ON customers IS
'Multi-tenant isolation using Supabase auth. Users see only active customers from their company. Works with frontend applications.';

-- ============================================================================
-- STEP 2: UPDATE CUSTOMER_MATCHING_KEYS RLS POLICY
-- ============================================================================

DROP POLICY IF EXISTS matching_keys_isolation ON customer_matching_keys;

CREATE POLICY matching_keys_isolation ON customer_matching_keys
FOR ALL
USING (
    customer_id IN (
        SELECT id FROM customers
        WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
        AND deleted_at IS NULL
    )
);

COMMENT ON POLICY matching_keys_isolation ON customer_matching_keys IS
'Inherit isolation from parent customer record using auth.uid().';

-- ============================================================================
-- STEP 3: UPDATE CUSTOMER_CONVERSATION_SUMMARIES RLS POLICY
-- ============================================================================

DROP POLICY IF EXISTS summaries_isolation ON customer_conversation_summaries;

CREATE POLICY summaries_isolation ON customer_conversation_summaries
FOR ALL
USING (
    customer_id IN (
        SELECT id FROM customers
        WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
        AND deleted_at IS NULL
    )
);

COMMENT ON POLICY summaries_isolation ON customer_conversation_summaries IS
'Inherit isolation from parent customer record using auth.uid().';

-- ============================================================================
-- STEP 4: UPDATE CUSTOMER_EVENTS RLS POLICY
-- ============================================================================

DROP POLICY IF EXISTS events_isolation ON customer_events;

CREATE POLICY events_isolation ON customer_events
FOR ALL
USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    )
);

COMMENT ON POLICY events_isolation ON customer_events IS
'Company isolation using auth.uid(). Direct company_id check since events table has company_id column.';

-- ============================================================================
-- STEP 5: UPDATE CUSTOMER_AUDIT_LOG RLS POLICY
-- ============================================================================

DROP POLICY IF EXISTS audit_log_isolation ON customer_audit_log;

CREATE POLICY audit_log_isolation ON customer_audit_log
FOR SELECT
USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    )
);

COMMENT ON POLICY audit_log_isolation ON customer_audit_log IS
'Company isolation for audit logs using auth.uid(). Read-only access.';

-- ============================================================================
-- STEP 6: UPDATE CUSTOMER_MERGE_LOG RLS POLICY
-- ============================================================================

DROP POLICY IF EXISTS merge_log_isolation ON customer_merge_log;

CREATE POLICY merge_log_isolation ON customer_merge_log
FOR SELECT
USING (
    target_customer_id IN (
        SELECT id FROM customers
        WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    )
);

COMMENT ON POLICY merge_log_isolation ON customer_merge_log IS
'Company isolation for merge logs using auth.uid(). Can see merged customers for audit purposes.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all policies are updated
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN (
    'customers',
    'customer_matching_keys',
    'customer_conversation_summaries',
    'customer_events',
    'customer_audit_log',
    'customer_merge_log'
)
ORDER BY tablename, policyname;

-- Verify RLS is still enabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN (
    'customers',
    'customer_matching_keys',
    'customer_conversation_summaries',
    'customer_events',
    'customer_audit_log',
    'customer_merge_log'
)
ORDER BY tablename;

-- ============================================================================
-- TEST QUERIES (Run as authenticated user to verify access)
-- ============================================================================

-- These should now work from the frontend application:
-- SELECT * FROM customers WHERE deleted_at IS NULL LIMIT 5;
-- UPDATE customers SET customer_notes = 'Test update' WHERE id = '<some-customer-id>';
-- SELECT * FROM customer_events WHERE customer_id = '<some-customer-id>' LIMIT 10;

-- ============================================================================
-- SUCCESS CRITERIA
-- ============================================================================
--
-- After running this migration:
-- ✅ All 6 policies should show using auth.uid() in pg_policies view
-- ✅ Customer queries should work from frontend (no more "Failed to fetch customer")
-- ✅ Multi-tenancy is maintained via user's company_id lookup
-- ✅ Soft-deleted customers remain hidden (deleted_at IS NULL check)
--
-- ============================================================================
-- END OF RLS POLICY FIX
-- ============================================================================
