-- ============================================================================
-- PHASE 3A: UNIFIED CUSTOMER DATA MODEL - FULL IMPLEMENTATION
-- ============================================================================
--
-- Purpose: Complete customer management system with advanced features
-- Status: Pre-release (no existing data to migrate)
-- Strategy: Full feature set implementation with real-time sync
--
-- IMPORTANT: Run this FIRST before any other customer migrations
-- Estimated time: ~5 minutes (no data backfill needed)
-- ============================================================================

-- ============================================================================
-- STEP 1: ENABLE REQUIRED EXTENSIONS
-- ============================================================================

-- Enable fuzzy text matching (for customer deduplication)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
COMMENT ON EXTENSION pg_trgm IS 'Fuzzy text matching for customer name deduplication';

-- Enable UUID generation (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
COMMENT ON EXTENSION "uuid-ossp" IS 'UUID generation functions';

-- ============================================================================
-- STEP 2: UPDATE CUSTOMERS TABLE (Add New Columns)
-- ============================================================================

-- Add soft delete support
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN customers.deleted_at IS 'Soft delete timestamp. NULL = active, NOT NULL = deleted (hidden from company view but preserved in database)';

-- Add customer merge tracking
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS merged_into_customer_id uuid REFERENCES customers(id);

COMMENT ON COLUMN customers.merged_into_customer_id IS 'If customer was merged into another, this points to the target customer';

-- Add customer status tracking
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'merged', 'deleted'));

COMMENT ON COLUMN customers.status IS 'Customer lifecycle status. Used for filtering and reporting';

-- Add flexible metadata storage
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN customers.metadata IS 'Flexible JSON storage for custom fields, integrations, tags, etc.';

-- Add lifecycle tracking
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS lifecycle_stage varchar(50) DEFAULT 'prospect' CHECK (lifecycle_stage IN ('prospect', 'lead', 'customer', 'churned'));

COMMENT ON COLUMN customers.lifecycle_stage IS 'Sales pipeline stage for customer lifecycle management';

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS lifecycle_updated_at timestamptz DEFAULT NOW();

COMMENT ON COLUMN customers.lifecycle_updated_at IS 'When lifecycle_stage was last changed';

-- Add tagging support
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

COMMENT ON COLUMN customers.tags IS 'Array of tags for categorizing customers (e.g., ["vip", "referral", "wholesale"])';

-- Add source tracking
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS source varchar(100);

COMMENT ON COLUMN customers.source IS 'Where customer came from (e.g., "chat", "import", "manual", "api")';

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS source_campaign varchar(200);

COMMENT ON COLUMN customers.source_campaign IS 'Marketing campaign that brought this customer';

-- ============================================================================
-- STEP 3: UPDATE VC USAGE TABLE (Add Customer Link)
-- ============================================================================

-- Add customer_id foreign key
ALTER TABLE "VC Usage"
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;

COMMENT ON COLUMN "VC Usage".customer_id IS 'Links chat conversation to customer record. NULL = not yet linked, NOT NULL = linked to customer';

-- Add sync tracking metadata
ALTER TABLE "VC Usage"
ADD COLUMN IF NOT EXISTS customer_linked_at timestamptz;

COMMENT ON COLUMN "VC Usage".customer_linked_at IS 'Timestamp when customer_id was first linked (for audit trail)';

ALTER TABLE "VC Usage"
ADD COLUMN IF NOT EXISTS customer_link_source varchar(50);

COMMENT ON COLUMN "VC Usage".customer_link_source IS 'How customer was linked: auto_sync, manual_link, import, trigger';

-- ============================================================================
-- STEP 4: CREATE CUSTOMER MATCHING KEYS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_matching_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    key_type varchar(50) NOT NULL CHECK (key_type IN ('email', 'phone', 'name')),
    key_value varchar(255) NOT NULL,
    normalized_value varchar(255) NOT NULL,
    created_at timestamptz DEFAULT NOW(),

    CONSTRAINT unique_customer_key UNIQUE(customer_id, key_type, normalized_value)
);

COMMENT ON TABLE customer_matching_keys IS 'Normalized keys for customer deduplication. Enables fast fuzzy matching by email, phone, and name.';
COMMENT ON COLUMN customer_matching_keys.key_type IS 'Type of matching key: email, phone, or name';
COMMENT ON COLUMN customer_matching_keys.key_value IS 'Original value as entered';
COMMENT ON COLUMN customer_matching_keys.normalized_value IS 'Normalized for matching (lowercase, no spaces, etc.)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_matching_keys_normalized
ON customer_matching_keys(key_type, normalized_value);

CREATE INDEX IF NOT EXISTS idx_matching_keys_customer
ON customer_matching_keys(customer_id);

-- ============================================================================
-- STEP 5: CREATE CUSTOMER CONVERSATION SUMMARIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_conversation_summaries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    session_id text NOT NULL,
    summary text,
    extracted_topics jsonb DEFAULT '[]'::jsonb,
    conversation_date timestamptz,
    created_at timestamptz DEFAULT NOW(),

    CONSTRAINT unique_customer_session UNIQUE(customer_id, session_id)
);

COMMENT ON TABLE customer_conversation_summaries IS 'Aggregated summaries of customer conversations. One record per session, extracted from VC Usage.';
COMMENT ON COLUMN customer_conversation_summaries.extracted_topics IS 'JSON array of topics discussed (e.g., ["paver patio", "excavation", "pricing"])';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_customer
ON customer_conversation_summaries(customer_id, conversation_date DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_topics
ON customer_conversation_summaries USING gin(extracted_topics);

-- ============================================================================
-- STEP 6: CREATE CUSTOMER MERGE LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_merge_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_customer_id uuid NOT NULL,
    target_customer_id uuid NOT NULL REFERENCES customers(id),
    merged_by_user_id uuid REFERENCES users(id),
    merge_details jsonb,
    merged_at timestamptz DEFAULT NOW()
);

COMMENT ON TABLE customer_merge_log IS 'Audit trail of customer merges. Preserves full history of which customers were combined.';
COMMENT ON COLUMN customer_merge_log.source_customer_id IS 'Customer that was merged (now deleted/inactive)';
COMMENT ON COLUMN customer_merge_log.target_customer_id IS 'Customer that absorbed the source (active)';
COMMENT ON COLUMN customer_merge_log.merge_details IS 'JSON snapshot of both customer records before merge';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_merge_log_source
ON customer_merge_log(source_customer_id);

CREATE INDEX IF NOT EXISTS idx_merge_log_target
ON customer_merge_log(target_customer_id);

CREATE INDEX IF NOT EXISTS idx_merge_log_date
ON customer_merge_log(merged_at DESC);

-- ============================================================================
-- STEP 7: CREATE CUSTOMER EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES companies(id),
    event_type varchar(100) NOT NULL CHECK (event_type IN ('created', 'updated', 'merged', 'deleted', 'stage_changed', 'tag_added', 'tag_removed', 'note_added')),
    event_data jsonb,
    created_by_user_id uuid REFERENCES users(id),
    created_at timestamptz DEFAULT NOW()
);

COMMENT ON TABLE customer_events IS 'Timeline of customer lifecycle events. Used for activity tracking and audit trail.';
COMMENT ON COLUMN customer_events.event_type IS 'Type of event that occurred';
COMMENT ON COLUMN customer_events.event_data IS 'JSON details of what changed (e.g., {"old_stage": "prospect", "new_stage": "customer"})';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_events_customer
ON customer_events(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_events_company
ON customer_events(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_events_type
ON customer_events(event_type, created_at DESC);

-- ============================================================================
-- STEP 8: CREATE CUSTOMER AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name varchar(100) NOT NULL,
    record_id uuid NOT NULL,
    company_id uuid NOT NULL,
    action varchar(50) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values jsonb,
    new_values jsonb,
    changed_by_user_id uuid,
    changed_at timestamptz DEFAULT NOW(),
    ip_address inet,
    user_agent text
);

COMMENT ON TABLE customer_audit_log IS 'Complete audit trail of all customer data changes. Tracks who, what, when, and from where.';
COMMENT ON COLUMN customer_audit_log.old_values IS 'JSON snapshot of record before change';
COMMENT ON COLUMN customer_audit_log.new_values IS 'JSON snapshot of record after change';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_record
ON customer_audit_log(table_name, record_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_company
ON customer_audit_log(company_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_user
ON customer_audit_log(changed_by_user_id, changed_at DESC);

-- ============================================================================
-- STEP 9: CREATE INDEXES FOR SOFT DELETE FILTERING
-- ============================================================================

-- Critical: Index on deleted_at for soft delete queries
-- All customer queries will use WHERE deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_customers_not_deleted
ON customers(company_id, deleted_at)
WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_customers_not_deleted IS 'Critical index for filtering out soft-deleted customers. Used in every customer list query.';

-- Status index for filtering
CREATE INDEX IF NOT EXISTS idx_customers_company_status
ON customers(company_id, status)
WHERE deleted_at IS NULL;

-- Lifecycle index
CREATE INDEX IF NOT EXISTS idx_customers_lifecycle
ON customers(company_id, lifecycle_stage)
WHERE deleted_at IS NULL;

-- Name index for search (case-insensitive with trigram)
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm
ON customers USING gin(customer_name gin_trgm_ops)
WHERE deleted_at IS NULL;

-- Email and phone indexes
CREATE INDEX IF NOT EXISTS idx_customers_email
ON customers(company_id, customer_email)
WHERE deleted_at IS NULL AND customer_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_phone
ON customers(company_id, customer_phone)
WHERE deleted_at IS NULL AND customer_phone IS NOT NULL;

-- Tags index (GIN for array containment queries)
CREATE INDEX IF NOT EXISTS idx_customers_tags
ON customers USING gin(tags)
WHERE deleted_at IS NULL;

-- ============================================================================
-- STEP 10: CREATE VC USAGE INDEXES FOR CUSTOMER LINK
-- ============================================================================

-- FK index for joining VC Usage → customers
CREATE INDEX IF NOT EXISTS idx_vc_usage_customer_fk
ON "VC Usage"(customer_id)
WHERE customer_id IS NOT NULL;

-- Composite index for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_vc_usage_company_customer
ON "VC Usage"(company_id, customer_id, created_at DESC)
WHERE customer_id IS NOT NULL;

-- Session index for conversation loading
CREATE INDEX IF NOT EXISTS idx_vc_usage_session_customer
ON "VC Usage"(session_id, customer_id);

-- ============================================================================
-- STEP 11: CREATE MATERIALIZED VIEW FOR CUSTOMER METRICS
-- ============================================================================

-- Materialized view for fast customer metrics queries
CREATE MATERIALIZED VIEW IF NOT EXISTS customer_metrics AS
SELECT
    c.id as customer_id,
    c.company_id,
    COUNT(DISTINCT vc.session_id) as total_conversations,
    COUNT(vc.id) as total_interactions,
    SUM(vc.view_count) as total_views,
    MIN(vc.created_at) as first_interaction_at,
    MAX(vc.created_at) as last_interaction_at,
    AVG(LENGTH(vc.ai_response)) as avg_interaction_length,
    jsonb_build_object(
        'sessions', array_agg(DISTINCT vc.session_id ORDER BY vc.session_id),
        'interaction_count', COUNT(vc.id)
    ) as interaction_summary_stats,
    NOW() as calculated_at
FROM customers c
LEFT JOIN "VC Usage" vc ON c.id = vc.customer_id
WHERE c.deleted_at IS NULL  -- Only active customers
GROUP BY c.id, c.company_id;

COMMENT ON MATERIALIZED VIEW customer_metrics IS 'Pre-computed customer engagement metrics. Refreshed in real-time via triggers.';

-- Unique index for fast refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_metrics_id
ON customer_metrics(customer_id);

-- Company index for multi-tenant filtering
CREATE INDEX IF NOT EXISTS idx_customer_metrics_company
ON customer_metrics(company_id);

-- ============================================================================
-- STEP 12: ENABLE ROW-LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all customer tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_matching_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_merge_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_audit_log ENABLE ROW LEVEL SECURITY;

-- Customer table RLS policy (filters by company_id AND deleted_at)
DROP POLICY IF EXISTS customers_company_isolation ON customers;
CREATE POLICY customers_company_isolation ON customers
FOR ALL
USING (
    company_id = current_setting('app.current_company_id', true)::uuid
    AND deleted_at IS NULL  -- CRITICAL: Hide soft-deleted customers
);

COMMENT ON POLICY customers_company_isolation ON customers IS 'Multi-tenant isolation + soft delete filtering. Users only see active customers from their company.';

-- Matching keys inherit from customer
DROP POLICY IF EXISTS matching_keys_isolation ON customer_matching_keys;
CREATE POLICY matching_keys_isolation ON customer_matching_keys
FOR ALL
USING (
    customer_id IN (
        SELECT id FROM customers
        WHERE company_id = current_setting('app.current_company_id', true)::uuid
        AND deleted_at IS NULL
    )
);

-- Conversation summaries inherit from customer
DROP POLICY IF EXISTS summaries_isolation ON customer_conversation_summaries;
CREATE POLICY summaries_isolation ON customer_conversation_summaries
FOR ALL
USING (
    customer_id IN (
        SELECT id FROM customers
        WHERE company_id = current_setting('app.current_company_id', true)::uuid
        AND deleted_at IS NULL
    )
);

-- Merge log (can see deleted customers for audit purposes)
DROP POLICY IF EXISTS merge_log_isolation ON customer_merge_log;
CREATE POLICY merge_log_isolation ON customer_merge_log
FOR SELECT
USING (
    target_customer_id IN (
        SELECT id FROM customers
        WHERE company_id = current_setting('app.current_company_id', true)::uuid
    )
);

-- Events inherit from customer
DROP POLICY IF EXISTS events_isolation ON customer_events;
CREATE POLICY events_isolation ON customer_events
FOR ALL
USING (
    company_id = current_setting('app.current_company_id', true)::uuid
);

-- Audit log
DROP POLICY IF EXISTS audit_log_isolation ON customer_audit_log;
CREATE POLICY audit_log_isolation ON customer_audit_log
FOR SELECT
USING (
    company_id = current_setting('app.current_company_id', true)::uuid
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify schema changes
SELECT
    'customers' as table_name,
    COUNT(*) FILTER (WHERE column_name = 'deleted_at') as has_deleted_at,
    COUNT(*) FILTER (WHERE column_name = 'customer_id') as has_customer_id_link,
    COUNT(*) FILTER (WHERE column_name = 'lifecycle_stage') as has_lifecycle
FROM information_schema.columns
WHERE table_name IN ('customers', 'VC Usage')
GROUP BY table_name;

-- Verify indexes created
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE tablename IN ('customers', 'VC Usage', 'customer_matching_keys')
ORDER BY tablename, indexname;

-- Verify RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('customers', 'customer_matching_keys', 'customer_conversation_summaries')
ORDER BY tablename;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================

-- After running this migration:
-- 1. Run 02-CUSTOMER-FUNCTIONS.sql (helper functions and triggers)
-- 2. Test customer creation from UI
-- 3. Test customer creation from chat (auto-sync)
-- 4. Verify soft delete hiding in all queries
-- 5. Test customer merge workflow

-- ============================================================================
-- END OF SCHEMA SETUP
-- ============================================================================
