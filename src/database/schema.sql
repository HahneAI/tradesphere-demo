-- ============================================================================
-- TRADESPHERE DATABASE SCHEMA DOCUMENTATION
-- ============================================================================
--
-- SCHEMA ORGANIZATION & RELATIONSHIPS
--
-- This database supports a multi-tenant SaaS platform for trade businesses.
-- The schema centers around COMPANIES, with all other entities linked via company_id.
--
-- ============================================================================
-- CORE ENTITY HIERARCHY
-- ============================================================================
--
-- 1. COMPANIES (Root Entity)
--    - Primary identifier: id (UUID)
--    - Secondary identifier: company_id (varchar, generated via generate_company_id())
--    - Purpose: Represents individual trade businesses using the platform
--    - Contains: billing info, branding (color_theme, ai_personality), subscription status
--    - Referenced by: ALL other tables via company_id foreign key
--
-- 2. USERS (Authentication & Authorization)
--    - Primary identifier: id (UUID, defaults to auth.uid() from Supabase Auth)
--    - Links to: companies table via company_id
--    - Purpose: Represents authenticated users in Supabase auth system
--    - Note: This is for RLS policies - linked to Supabase's auth.users
--    - Contains: email, role, title, is_head_user flag
--    - IMPORTANT: Used by RLS policies to enforce data isolation
--
-- 3. BETA_USERS (Application-Level Users)
--    - Primary identifier: id (UUID)
--    - Unique identifiers: email, tech_uuid
--    - Links to: companies via company_id, beta_codes via beta_code_used
--    - Purpose: Application user accounts (separate from Supabase auth)
--    - Contains: first_name, full_name, job_title, is_admin, user_icon
--    - Note: Currently used for login/session management via localStorage
--    - Relationship: May or may not have corresponding entry in users table
--
-- ============================================================================
-- AUTHENTICATION MODEL (CURRENT STATE)
-- ============================================================================
--
-- DUAL AUTHENTICATION SYSTEM:
--
-- A) Application-Level (beta_users table):
--    - Users log in with first_name + beta_code_id
--    - Credentials stored in beta_users table
--    - Session persisted in localStorage as 'tradesphere_beta_user'
--    - Contains company_id for multi-tenancy
--
-- B) Supabase Auth-Level (users table + auth.users):
--    - Required for RLS policies to work
--    - Anonymous auth sessions created during login
--    - Links auth.uid() to company via users table
--    - PROBLEM: Anonymous auth users NOT in users table → RLS fails
--
-- RLS POLICY PATTERN:
--    Most tables use: "WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())"
--    This requires authenticated user to exist in users table with company_id
--
-- ============================================================================
-- DATA MODEL RELATIONSHIPS
-- ============================================================================
--
-- SERVICE PRICING SYSTEM:
--    service_pricing_configs
--    ├── Belongs to: companies (via company_id)
--    ├── Updated by: users (via updated_by)
--    ├── Purpose: Store customizable pricing formulas per company per service
--    ├── Key fields: hourly_labor_rate, profit_margin, variables_config (JSONB)
--    └── Unique constraint: (company_id, service_name)
--
-- CUSTOMER INTERACTION TRACKING:
--    "VC Usage" (demo_messages alternative name)
--    ├── Belongs to: companies (via company_id)
--    ├── Linked by: user_tech_id (references beta_users.tech_uuid)
--    ├── Purpose: Store AI chat conversations with customers
--    ├── Contains: user_input, ai_response, customer details, pricing calculations
--    └── Used for: Customer list, conversation history, analytics
--
--    customer_interactions
--    ├── Belongs to: companies (via company_id)
--    ├── Tracks: view/edit/load actions on customer records
--    ├── Purpose: Power "smart ordering" of customer list by recency
--    └── Linked by: user_tech_id, customer_name
--
-- BETA CODE SYSTEM:
--    beta_codes
--    ├── Purpose: Invitation-only registration codes
--    ├── Referenced by: beta_users.beta_code_used
--    ├── Tracks: usage (used, used_by_email, used_at)
--    └── Expires: 30 days after creation (expires_at)
--
-- PAYMENT SYSTEM:
--    payments
--    ├── Belongs to: companies (via company_id)
--    ├── Purpose: Track subscription payments via Dwolla ACH
--    ├── Contains: Dwolla IDs, bank account info, payment status
--    └── Links to: companies.dwolla_customer_url
--
-- ============================================================================
-- IMPORTANT TABLES DETAILS
-- ============================================================================
--
-- service_pricing_configs:
--    - Enables dynamic per-company pricing configuration
--    - variables_config (JSONB): Complex nested pricing rules
--      ├── labor: team size multipliers
--      ├── materials: paver styles, cutting complexity, waste percentages
--      ├── excavation: equipment costs, tearout complexity
--      ├── siteAccess: access difficulty, obstacle removal costs
--      └── complexity: overall project complexity multipliers
--    - default_variables (JSONB): Default selections for calculations
--    - version: Schema version for config format (currently '2.0.0')
--    - RLS: Likely enforces company isolation via users table
--
-- "VC Usage":
--    - Stores complete AI conversation threads
--    - Performance metrics: processing_time_ms, ai_generation_time_ms, tokens
--    - Customer data: name, email, phone, address (extracted from conversation)
--    - Pricing data: services_count, confidence_score
--    - View tracking: last_viewed_at, view_count (for smart ordering)
--    - NOTE: Space in table name requires quotes in queries
--
-- beta_users:
--    - company_id: Links user to their company (NULL = no company assigned)
--    - is_admin: Grants access to admin features (Services tab, settings)
--    - user_icon: Lucide icon name for avatar display
--    - tech_uuid: Unique generated ID (format: TECH-XXXXXXXX-XXXX-XXXX)
--    - Constraints: email UNIQUE, tech_uuid UNIQUE
--
-- companies:
--    - Dual ID system: id (UUID primary key), company_id (varchar unique)
--    - generate_company_id(): Function that creates human-readable IDs
--    - subscription_status: 'trial' | 'active' | 'cancelled' | etc.
--    - trial_end_date: Defaults to 14 days from creation
--    - color_theme (JSONB): Custom branding colors
--    - ai_personality: Customizes AI agent tone/style
--
-- ============================================================================
-- RLS SECURITY MODEL
-- ============================================================================
--
-- Row Level Security (RLS) is enabled on most tables to enforce multi-tenancy.
-- Pattern: Users can only access data from their own company.
--
-- Typical RLS Policy Structure:
--    FOR SELECT USING (
--      company_id IN (
--        SELECT company_id FROM users WHERE id = auth.uid()
--      )
--    )
--
-- This requires:
--    1. User authenticated with Supabase (auth.uid() returns valid UUID)
--    2. User exists in users table
--    3. User has company_id set
--    4. Record's company_id matches user's company_id
--
-- CURRENT CHALLENGE:
--    - beta_users used for login, but may not have corresponding users entry
--    - Anonymous auth creates auth.uid() but user not in users table
--    - RLS policies block queries because subquery returns no rows
--    - Solution needed: Link beta_users login to users table OR modify RLS
--
-- ============================================================================
-- FOREIGN KEY RELATIONSHIPS (Visual Map)
-- ============================================================================
--
--   companies (id)
--   ├─→ beta_users.company_id
--   ├─→ users.company_id
--   ├─→ service_pricing_configs.company_id
--   ├─→ "VC Usage".company_id
--   ├─→ customer_interactions.company_id
--   ├─→ demo_messages.company_id
--   └─→ payments.company_id
--
--   users (id)
--   └─→ service_pricing_configs.updated_by
--
--   beta_codes (code)
--   └─→ beta_users.beta_code_used
--
-- ============================================================================
-- CUSTOMER LIST FUNCTIONALITY
-- ============================================================================
--
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

-- Add missing columns to existing VC Usage table (if they don't exist)
ALTER TABLE "VC Usage" 
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ========================================
-- CREATE OPTIMIZED INDEXES
-- ========================================

-- Primary index for customer list queries
CREATE INDEX IF NOT EXISTS idx_vc_usage_customer_list 
ON "VC Usage"(user_tech_id, customer_name, interaction_number DESC);

-- Search index for customer filtering
CREATE INDEX IF NOT EXISTS idx_vc_usage_search 
ON "VC Usage"(user_tech_id, customer_name, customer_email, customer_phone, customer_address);

-- Recently viewed index
CREATE INDEX IF NOT EXISTS idx_vc_usage_recent_activity 
ON "VC Usage"(user_tech_id, last_viewed_at DESC NULLS LAST, created_at DESC);

-- Conversation history index
CREATE INDEX IF NOT EXISTS idx_vc_usage_conversation 
ON "VC Usage"(user_tech_id, customer_name, interaction_number DESC)
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
    FROM "VC Usage" v
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