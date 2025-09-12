-- Customer List Database Integration Schema
-- This file contains the SQL schema for customer list functionality with smart ordering

-- ========================================
-- CREATE TABLES
-- ========================================

-- Customer Interactions Tracking Table
CREATE TABLE IF NOT EXISTS customer_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_tech_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    session_id TEXT,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'edit', 'load')),
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_interactions_tech_customer 
ON customer_interactions(user_tech_id, customer_name);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_viewed_at 
ON customer_interactions(viewed_at DESC);

-- Add missing columns to existing VC USAGE table (if they don't exist)
ALTER TABLE "VC USAGE" 
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ========================================
-- CREATE OPTIMIZED INDEXES
-- ========================================

-- Primary index for customer list queries
CREATE INDEX IF NOT EXISTS idx_vc_usage_customer_list 
ON "VC USAGE"(user_tech_id, customer_name, interaction_number DESC);

-- Search index for customer filtering
CREATE INDEX IF NOT EXISTS idx_vc_usage_search 
ON "VC USAGE"(user_tech_id, customer_name, customer_email, customer_phone, customer_address);

-- Recently viewed index
CREATE INDEX IF NOT EXISTS idx_vc_usage_recent_activity 
ON "VC USAGE"(user_tech_id, last_viewed_at DESC NULLS LAST, created_at DESC);

-- Conversation history index
CREATE INDEX IF NOT EXISTS idx_vc_usage_conversation 
ON "VC USAGE"(user_tech_id, customer_name, interaction_number DESC)
WHERE user_input IS NOT NULL AND ai_response IS NOT NULL;

-- ========================================
-- CREATE MATERIALIZED VIEW
-- ========================================

-- Customer List Optimized View with Smart Ordering
CREATE MATERIALIZED VIEW IF NOT EXISTS customer_list_view AS
WITH customer_stats AS (
    SELECT 
        v.user_tech_id,
        v.customer_name,
        MAX(v.session_id) AS latest_session_id,
        MAX(v.customer_address) AS customer_address,
        MAX(v.customer_email) AS customer_email,
        MAX(v.customer_phone) AS customer_phone,
        MAX(v.customer_number) AS customer_number,
        MAX(v.interaction_summary) AS interaction_summary,
        MAX(v.created_at) AS last_interaction_at,
        MAX(v.last_viewed_at) AS last_viewed_at,
        COUNT(*) AS interaction_count,
        COALESCE(MAX(v.view_count), 0) AS view_count
    FROM "VC USAGE" v
    WHERE v.customer_name IS NOT NULL
    GROUP BY v.user_tech_id, v.customer_name
),
recent_interactions AS (
    SELECT 
        ci.user_tech_id,
        ci.customer_name,
        MAX(ci.viewed_at) AS most_recent_interaction
    FROM customer_interactions ci
    WHERE ci.viewed_at >= NOW() - INTERVAL '30 days'
    GROUP BY ci.user_tech_id, ci.customer_name
)
SELECT 
    cs.customer_name,
    cs.user_tech_id,
    cs.latest_session_id,
    cs.customer_address,
    cs.customer_email,
    cs.customer_phone,
    cs.customer_number,
    cs.interaction_summary,
    cs.last_interaction_at,
    cs.last_viewed_at,
    cs.interaction_count,
    cs.view_count,
    -- Smart sorting priority calculation
    CASE 
        -- Recently interacted customers (within 7 days) get highest priority
        WHEN ri.most_recent_interaction IS NOT NULL 
             AND ri.most_recent_interaction >= NOW() - INTERVAL '7 days' THEN 1000
        -- Recently viewed customers (within 30 days) get medium-high priority  
        WHEN cs.last_viewed_at IS NOT NULL 
             AND cs.last_viewed_at >= NOW() - INTERVAL '30 days' THEN 500
        -- Customers with recent conversation activity get medium priority
        WHEN cs.last_interaction_at >= NOW() - INTERVAL '90 days' THEN 100
        -- All other customers get base priority
        ELSE 1
    END +
    -- Boost for view count (more viewed customers appear higher)
    LEAST(cs.view_count * 2, 50) +
    -- Boost for interaction count (more active customers appear higher)
    LEAST(cs.interaction_count, 25) AS sort_priority
FROM customer_stats cs
LEFT JOIN recent_interactions ri ON cs.user_tech_id = ri.user_tech_id 
                                 AND cs.customer_name = ri.customer_name;

-- Index the materialized view for optimal performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_list_view_primary 
ON customer_list_view(user_tech_id, customer_name);

CREATE INDEX IF NOT EXISTS idx_customer_list_view_sort 
ON customer_list_view(user_tech_id, sort_priority DESC, last_interaction_at DESC, customer_name);

-- Search index for the view
CREATE INDEX IF NOT EXISTS idx_customer_list_view_search 
ON customer_list_view USING gin((customer_name || ' ' || 
                                COALESCE(customer_email, '') || ' ' || 
                                COALESCE(customer_phone, '') || ' ' ||
                                COALESCE(customer_number, '') || ' ' ||
                                COALESCE(customer_address, '')));

-- ========================================
-- CREATE REFRESH FUNCTIONS
-- ========================================

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_customer_list_view()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY customer_list_view;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically refresh the view when data changes
CREATE OR REPLACE TRIGGER trigger_refresh_customer_view_on_vc_usage
    AFTER INSERT OR UPDATE OR DELETE ON "VC USAGE"
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_customer_list_view();

CREATE OR REPLACE TRIGGER trigger_refresh_customer_view_on_interactions
    AFTER INSERT OR UPDATE OR DELETE ON customer_interactions
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_customer_list_view();

-- ========================================
-- CREATE UTILITY FUNCTIONS
-- ========================================

-- Function to track customer interaction (called from application)
CREATE OR REPLACE FUNCTION track_customer_interaction(
    p_tech_id TEXT,
    p_customer_name TEXT,
    p_session_id TEXT DEFAULT NULL,
    p_interaction_type TEXT DEFAULT 'view'
)
RETURNS VOID AS $$
BEGIN
    -- Insert interaction record
    INSERT INTO customer_interactions (
        user_tech_id, 
        customer_name, 
        session_id, 
        interaction_type,
        viewed_at
    ) VALUES (
        p_tech_id, 
        p_customer_name, 
        p_session_id, 
        p_interaction_type,
        NOW()
    );
    
    -- Update view count and last viewed timestamp in VC USAGE
    UPDATE "VC USAGE" 
    SET 
        last_viewed_at = NOW(),
        view_count = COALESCE(view_count, 0) + 1,
        updated_at = NOW()
    WHERE user_tech_id = p_tech_id 
      AND customer_name = p_customer_name;
      
    -- Refresh the materialized view (async)
    PERFORM pg_notify('refresh_customer_view', '');
END;
$$ LANGUAGE plpgsql;

-- Function to get optimized customer list with search
CREATE OR REPLACE FUNCTION get_customer_list(
    p_tech_id TEXT,
    p_search_query TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    customer_name TEXT,
    latest_session_id TEXT,
    customer_address TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    customer_number TEXT,
    interaction_summary TEXT,
    last_interaction_at TIMESTAMPTZ,
    last_viewed_at TIMESTAMPTZ,
    interaction_count INTEGER,
    view_count INTEGER,
    sort_priority INTEGER
) AS $$
BEGIN
    IF p_search_query IS NOT NULL AND p_search_query != '' THEN
        RETURN QUERY
        SELECT 
            clv.customer_name,
            clv.latest_session_id,
            clv.customer_address,
            clv.customer_email,
            clv.customer_phone,
            clv.customer_number,
            clv.interaction_summary,
            clv.last_interaction_at,
            clv.last_viewed_at,
            clv.interaction_count,
            clv.view_count,
            clv.sort_priority
        FROM customer_list_view clv
        WHERE clv.user_tech_id = p_tech_id
          AND (
              clv.customer_name ILIKE '%' || p_search_query || '%' OR
              clv.customer_email ILIKE '%' || p_search_query || '%' OR
              clv.customer_phone ILIKE '%' || p_search_query || '%' OR
              clv.customer_number ILIKE '%' || p_search_query || '%' OR
              clv.customer_address ILIKE '%' || p_search_query || '%'
          )
        ORDER BY clv.sort_priority DESC, clv.last_interaction_at DESC, clv.customer_name
        LIMIT p_limit OFFSET p_offset;
    ELSE
        RETURN QUERY
        SELECT 
            clv.customer_name,
            clv.latest_session_id,
            clv.customer_address,
            clv.customer_email,
            clv.customer_phone,
            clv.customer_number,
            clv.interaction_summary,
            clv.last_interaction_at,
            clv.last_viewed_at,
            clv.interaction_count,
            clv.view_count,
            clv.sort_priority
        FROM customer_list_view clv
        WHERE clv.user_tech_id = p_tech_id
        ORDER BY clv.sort_priority DESC, clv.last_interaction_at DESC, clv.customer_name
        LIMIT p_limit OFFSET p_offset;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- INITIAL DATA SETUP
-- ========================================

-- Populate missing data for existing customers
UPDATE "VC USAGE" 
SET view_count = 0, 
    updated_at = created_at 
WHERE view_count IS NULL;

-- Initial refresh of the materialized view
REFRESH MATERIALIZED VIEW customer_list_view;

-- ========================================
-- PERFORMANCE MONITORING
-- ========================================

-- Create a function to monitor query performance
CREATE OR REPLACE FUNCTION analyze_customer_queries()
RETURNS TABLE(
    query_type TEXT,
    avg_duration_ms NUMERIC,
    total_calls BIGINT
) AS $$
BEGIN
    -- This would integrate with pg_stat_statements if available
    RETURN QUERY
    SELECT 
        'customer_list'::TEXT as query_type,
        0::NUMERIC as avg_duration_ms,
        0::BIGINT as total_calls;
    -- Add actual performance monitoring here if needed
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- CLEANUP AND MAINTENANCE
-- ========================================

-- Function to clean up old interaction records (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_interactions(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM customer_interactions 
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Refresh materialized view after cleanup
    REFRESH MATERIALIZED VIEW customer_list_view;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule periodic cleanup (if using pg_cron extension)
-- SELECT cron.schedule('cleanup-customer-interactions', '0 2 * * 0', 'SELECT cleanup_old_interactions(365);');

COMMENT ON MATERIALIZED VIEW customer_list_view IS 
'Optimized customer list with smart ordering based on recent interactions, views, and activity. 
Automatically refreshes when underlying data changes.';

COMMENT ON FUNCTION track_customer_interaction IS 
'Tracks customer interactions for smart ordering. Call this from application when users view/edit/load customers.';

COMMENT ON FUNCTION get_customer_list IS 
'Optimized function to retrieve customer list with optional search filtering and smart ordering.';