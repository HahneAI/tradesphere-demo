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
-- 2. USERS (Authentication & Authorization) ✅ ACTIVE
--    - Primary identifier: id (UUID, defaults to auth.uid() from Supabase Auth)
--    - Links to: companies table via company_id
--    - Purpose: Represents authenticated users in Supabase auth system
--    - Contains: email, name, role, title, is_head_user, is_admin, user_icon
--    - IMPORTANT: Used by RLS policies to enforce data isolation
--    - Authentication: Email/password via supabase.auth.signInWithPassword()
--
-- 3. BETA_USERS (DEPRECATED - Legacy table)
--    - Status: Replaced by Supabase Auth + users table
--    - Primary identifier: id (UUID)
--    - Unique identifiers: email, tech_uuid
--    - Contains: first_name, full_name, job_title, is_admin, user_icon
--    - Migration: All fields migrated to users table or deprecated
--      • tech_uuid → users.id (auth.uid())
--      • first_name → users.name
--      • job_title → users.title
--      • beta_code_id → deprecated (manual account creation)
--
-- ============================================================================
-- AUTHENTICATION MODEL (MIGRATED TO SUPABASE AUTH)
-- ============================================================================
--
-- ✅ CURRENT SYSTEM: Supabase Auth (email/password)
--
-- Authentication Flow:
--    1. User logs in with email/password via supabase.auth.signInWithPassword()
--    2. Supabase Auth creates authenticated session with auth.uid()
--    3. Application fetches user record from users table (WHERE id = auth.uid())
--    4. User object contains: id, email, name, role, title, company_id, is_admin, is_head_user
--    5. Session persisted automatically by Supabase (no localStorage needed)
--
-- Users Table Structure:
--    - id: UUID (defaults to auth.uid() from Supabase Auth)
--    - email: User's login email
--    - name: Display name (migrated from beta_users.first_name)
--    - role: 'office_staff' | 'field_tech' (permission category)
--    - title: Job title display (migrated from beta_users.job_title)
--    - company_id: Links to companies table
--    - is_admin: Admin privileges flag
--    - is_head_user: Company owner flag (grants edit access to services database)
--    - user_icon: Lucide icon name for avatar
--
-- RLS POLICY PATTERN:
--    Most tables use: "WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())"
--    This enforces multi-tenant data isolation per company
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
--    ├── Linked by: user_tech_id (stores auth.uid() for new records)
--    ├── Purpose: Store AI chat conversations with customers
--    ├── Contains: user_input, ai_response, customer details, pricing calculations
--    └── Used for: Customer list, conversation history, analytics
--    └── Migration: user_tech_id column name unchanged, values now auth.uid()
--
--    customer_interactions
--    ├── id: UUID (NOT NULL, DEFAULT gen_random_uuid()) - PRIMARY KEY
--    ├── user_tech_id: text (NOT NULL) - stores auth.uid()
--    ├── customer_name: text (NOT NULL)
--    ├── session_id: text (nullable)
--    ├── interaction_type: text (NOT NULL, CHECK IN ('view', 'edit', 'load'))
--    ├── viewed_at: timestamp with time zone (DEFAULT now())
--    ├── created_at: timestamp with time zone (DEFAULT now())
--    ├── company_id: UUID (nullable, FOREIGN KEY → companies.id)
--    ├── Tracks: view/edit/load actions on customer records
--    └── Purpose: Power "smart ordering" of customer list by recency
--
-- BETA CODE SYSTEM (DEPRECATED):
--    beta_codes
--    ├── id: integer (NOT NULL, DEFAULT nextval('beta_codes_id_seq')) - PRIMARY KEY
--    ├── code: character varying (NOT NULL, UNIQUE)
--    ├── used: boolean (DEFAULT false)
--    ├── used_by_email: character varying (nullable)
--    ├── used_by_user_id: text (nullable)
--    ├── used_at: timestamp without time zone (nullable)
--    ├── created_at: timestamp without time zone (DEFAULT now())
--    ├── expires_at: timestamp without time zone (DEFAULT now() + 30 days)
--    ├── Status: No longer used (admin accounts created manually)
--    ├── Purpose: Invitation-only registration codes (legacy)
--    ├── Referenced by: beta_users.beta_code_used
--    └── Migration: Manual account creation via Supabase Dashboard
--
-- PAYMENT SYSTEM:
--    payments
--    ├── id: UUID (NOT NULL, DEFAULT gen_random_uuid()) - PRIMARY KEY
--    ├── company_id: UUID (nullable, FOREIGN KEY → companies.id)
--    ├── amount: numeric (NOT NULL)
--    ├── status: character varying (NOT NULL) - payment processing status
--    ├── payment_type: character varying (DEFAULT 'monthly_subscription')
--    ├── processed_at: timestamp without time zone (nullable)
--    ├── created_at: timestamp without time zone (DEFAULT now())
--    ├── Dwolla integration fields:
--    │   ├── dwolla_customer_id: character varying (nullable)
--    │   ├── dwolla_funding_source_id: character varying (nullable)
--    │   ├── dwolla_transfer_id: character varying (nullable)
--    │   └── ach_status: character varying (nullable)
--    ├── Bank account info:
--    │   ├── bank_account_name: character varying (nullable)
--    │   └── bank_account_last4: character varying (nullable)
--    ├── Subscription tracking:
--    │   ├── subscription_period_start: date (nullable)
--    │   └── subscription_period_end: date (nullable)
--    └── Links to: companies.dwolla_customer_url
--
-- ============================================================================
-- IMPORTANT TABLES DETAILS
-- ============================================================================
--
-- service_pricing_configs:
--    - id: UUID (NOT NULL, DEFAULT gen_random_uuid()) - PRIMARY KEY
--    - company_id: UUID (NOT NULL, FOREIGN KEY → companies.id)
--    - service_name: character varying (NOT NULL)
--    - hourly_labor_rate: numeric (NOT NULL, DEFAULT 25.00)
--    - optimal_team_size: integer (NOT NULL, DEFAULT 3)
--    - base_productivity: numeric (NOT NULL, DEFAULT 50.00)
--    - base_material_cost: numeric (NOT NULL, DEFAULT 5.84)
--    - profit_margin: numeric (NOT NULL, DEFAULT 0.20)
--    - variables_config: jsonb (NOT NULL) - Complex nested pricing rules:
--      ├── labor: team size multipliers (threePlus, twoPerson)
--      ├── materials: paver styles (premium, standard), cutting complexity (complex, moderate, minimal)
--      ├── excavation: equipment costs (handTools, attachments, lightMachinery, heavyMachinery)
--      ├── siteAccess: access difficulty (easy, moderate, difficult), obstacle removal costs
--      └── complexity: overall project complexity multipliers (min, max, step, default)
--    - default_variables: jsonb (NOT NULL) - Default selections for calculations
--    - is_active: boolean (DEFAULT true)
--    - version: character varying (DEFAULT '2.0.0') - config format version
--    - created_at: timestamp without time zone (DEFAULT now())
--    - updated_at: timestamp without time zone (DEFAULT now())
--    - updated_by: UUID (nullable, FOREIGN KEY → users.id)
--    - CONSTRAINT: UNIQUE(company_id, service_name)
--    - RLS: Enforces company isolation via users table
--
-- "VC Usage":
--    - id: integer (NOT NULL, PRIMARY KEY)
--    - user_name: character varying (NOT NULL)
--    - user_tech_id: character varying (NOT NULL) - stores auth.uid() for new records
--    - session_id: character varying (NOT NULL)
--    - beta_code_id: integer (nullable, deprecated)
--    - user_input: text (NOT NULL)
--    - ai_response: text (NOT NULL)
--    - interaction_number: integer (NOT NULL)
--    - scenario_name: character varying (DEFAULT 'TradeSphere_AI_Agent')
--    - total_tokens: integer (nullable)
--    - interaction_summary: text (nullable)
--    - message_type: character varying (DEFAULT 'chat')
--    - success: boolean (DEFAULT true)
--    - error_message: text (nullable)
--    - created_at: timestamp with time zone (DEFAULT now())
--    - updated_at: timestamp with time zone (DEFAULT now())
--    - Customer data fields (extracted from conversation):
--      • customer_name: character varying (nullable)
--      • customer_address: text (nullable)
--      • customer_email: character varying (nullable)
--      • customer_phone: character varying (nullable)
--    - Performance metrics:
--      • processing_time_ms: numeric (nullable)
--      • ai_model: character varying (nullable)
--      • prompt_tokens: integer (nullable)
--      • completion_tokens: integer (nullable)
--      • response_length: integer (nullable)
--      • services_count: integer (nullable)
--      • confidence_score: numeric (nullable)
--      • gpt_splitting_time_ms: numeric (nullable)
--      • parameter_collection_time_ms: numeric (nullable)
--      • pricing_calculation_time_ms: numeric (nullable)
--      • ai_generation_time_ms: numeric (nullable)
--    - View tracking (for smart customer ordering):
--      • last_viewed_at: timestamp with time zone (nullable)
--      • view_count: integer (DEFAULT 0)
--    - company_id: UUID (nullable, FOREIGN KEY → companies.id)
--    - NOTE: Space in table name requires quotes in queries
--
-- users: (ACTIVE - Current authentication table)
--    - id: UUID (NOT NULL, defaults to auth.uid() from Supabase Auth) - PRIMARY KEY
--    - company_id: UUID (NOT NULL, links to companies.id) - FOREIGN KEY
--    - email: character varying (NOT NULL)
--    - name: character varying (NOT NULL, DEFAULT 'User') - replaces beta_users.first_name
--    - role: character varying (NOT NULL) - 'office_staff' | 'field_tech'
--    - title: character varying (nullable) - replaces beta_users.job_title
--    - is_admin: boolean (DEFAULT false)
--    - is_head_user: boolean (DEFAULT false) - company owner flag (grants services database edit access)
--    - user_icon: character varying (NOT NULL, DEFAULT 'User') - Lucide icon name
--    - created_at: timestamp without time zone (DEFAULT now())
--    - updated_at: timestamp without time zone (DEFAULT now())
--
-- beta_users: (DEPRECATED - Legacy table kept for data migration reference)
--    - id: UUID (PRIMARY KEY, DEFAULT gen_random_uuid())
--    - tech_uuid: character varying (NOT NULL, UNIQUE) - Replaced by users.id (auth.uid())
--    - email: character varying (UNIQUE)
--    - first_name: character varying - Replaced by users.name
--    - full_name: character varying
--    - job_title: character varying - Replaced by users.title
--    - beta_code_id: integer - Deprecated (manual account creation)
--    - beta_code_used: character varying (FOREIGN KEY → beta_codes.code)
--    - company_id: UUID (FOREIGN KEY → companies.id)
--    - is_admin: boolean (DEFAULT false)
--    - is_active: boolean (DEFAULT true)
--    - user_icon: character varying (NOT NULL, DEFAULT 'User')
--    - created_at: timestamp without time zone (DEFAULT now())
--    - updated_at: timestamp without time zone (DEFAULT now())
--
-- companies:
--    - id: UUID (NOT NULL, DEFAULT gen_random_uuid()) - PRIMARY KEY
--    - company_id: character varying (NOT NULL, UNIQUE, DEFAULT generate_company_id())
--    - name: character varying (NOT NULL)
--    - email: character varying (NOT NULL)
--    - website_url: text (nullable)
--    - ai_personality: character varying (nullable) - Customizes AI agent tone/style
--    - color_theme: jsonb (nullable) - Custom branding colors
--    - subscription_status: character varying (DEFAULT 'trial') - 'trial' | 'active' | 'cancelled'
--    - trial_end_date: date (DEFAULT CURRENT_DATE + 14 days)
--    - next_billing_date: date (nullable)
--    - dwolla_customer_url: character varying (nullable)
--    - monthly_amount: numeric (DEFAULT 2000.00)
--    - created_at: timestamp without time zone (DEFAULT now())
--    - updated_at: timestamp without time zone (DEFAULT now())
--
-- ============================================================================
-- RLS SECURITY MODEL (UPDATED FOR SUPABASE AUTH)
-- ============================================================================
--
-- Row Level Security (RLS) is enabled on most tables to enforce multi-tenancy.
-- Pattern: Users can only access data from their own company.
--
-- Authentication: Supabase Auth with email/password
-- Users table: Links auth.uid() to company_id
--
-- Typical RLS Policy Structure:
--    FOR SELECT USING (
--      company_id IN (
--        SELECT company_id FROM users WHERE id = auth.uid()
--      )
--    )
--
-- This requires:
--    1. User authenticated with Supabase Auth (email/password)
--    2. auth.uid() matches users.id
--    3. User has company_id set
--    4. Record's company_id matches user's company_id
--
-- AUTHENTICATION FLOW:
--    - User logs in with email/password via supabase.auth.signInWithPassword()
--    - Supabase Auth creates session with auth.uid()
--    - Application fetches user record from users table
--    - RLS policies use auth.uid() to enforce company isolation
--
-- DEPRECATED TABLES:
--    - beta_users: Replaced by Supabase Auth + users table
--    - beta_codes: No longer used (admin accounts created manually)
--
-- ============================================================================
-- FOREIGN KEY RELATIONSHIPS (Visual Map)
-- ============================================================================
--
--   companies (id: UUID)
--   ├─→ beta_users.company_id (UUID, FOREIGN KEY)
--   ├─→ users.company_id (UUID, NOT NULL, FOREIGN KEY)
--   ├─→ service_pricing_configs.company_id (UUID, NOT NULL, FOREIGN KEY)
--   ├─→ "VC Usage".company_id (UUID, FOREIGN KEY)
--   ├─→ customer_interactions.company_id (UUID, FOREIGN KEY)
--   ├─→ demo_messages.company_id (UUID, FOREIGN KEY)
--   └─→ payments.company_id (UUID, FOREIGN KEY)
--
--   users (id: UUID, DEFAULT auth.uid())
--   └─→ service_pricing_configs.updated_by (UUID, FOREIGN KEY)
--
--   beta_codes (code: character varying, UNIQUE)
--   └─→ beta_users.beta_code_used (character varying, FOREIGN KEY)
--
-- ============================================================================
-- ADDITIONAL TABLES
-- ============================================================================
--
-- demo_messages:
--    - id: bigint (NOT NULL, DEFAULT nextval('demo_messages_id_seq')) - PRIMARY KEY
--    - session_id: text (NOT NULL)
--    - message_text: text (NOT NULL)
--    - sender: text (NOT NULL) - 'user' | 'ai'
--    - tech_id: text (nullable) - stores auth.uid()
--    - message_source: character varying (DEFAULT 'make_com') - 'make_com' | 'native_pricing_agent'
--    - created_at: timestamp with time zone (DEFAULT now())
--    - company_id: UUID (nullable, FOREIGN KEY → companies.id)
--    - Purpose: Real-time message polling for AI chat interface
--
-- feedback:
--    - id: bigint (NOT NULL, DEFAULT nextval('feedback_id_seq')) - PRIMARY KEY
--    - user_name: text (NOT NULL)
--    - feedback_text: text (NOT NULL)
--    - created_at: timestamp with time zone (DEFAULT now())
--    - updated_at: timestamp with time zone (DEFAULT now())
--    - Purpose: User feedback collection
--
-- company_notes:
--    - id: bigint (NOT NULL) - PRIMARY KEY
--    - notes_content: text (DEFAULT '')
--    - updated_by: text (nullable)
--    - created_at: timestamp with time zone (DEFAULT now())
--    - updated_at: timestamp with time zone (DEFAULT now())
--    - Purpose: Company-level notes storage
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