-- ============================================================================
-- PHASE 3A: CUSTOMER MANAGEMENT - TRIGGER FUNCTIONS & HELPERS
-- ============================================================================
--
-- Purpose: Auto-sync triggers and helper functions for customer management
-- Status: Pre-release (no existing data)
-- Dependencies: Requires 01-CUSTOMER-SCHEMA-SETUP.sql to be run first
--
-- IMPORTANT: Run this AFTER 01-CUSTOMER-SCHEMA-SETUP.sql
-- Estimated time: ~2 minutes
-- ============================================================================

-- ============================================================================
-- STEP 1: NORMALIZATION HELPER FUNCTIONS
-- ============================================================================

-- Normalize email for matching (lowercase, trim)
CREATE OR REPLACE FUNCTION normalize_email(email text)
RETURNS text AS $$
BEGIN
    IF email IS NULL OR TRIM(email) = '' THEN
        RETURN NULL;
    END IF;
    RETURN LOWER(TRIM(email));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION normalize_email IS 'Normalize email for fuzzy matching: lowercase and trim whitespace';

-- Normalize phone for matching (remove all non-digits)
CREATE OR REPLACE FUNCTION normalize_phone(phone text)
RETURNS text AS $$
BEGIN
    IF phone IS NULL OR TRIM(phone) = '' THEN
        RETURN NULL;
    END IF;
    -- Remove all non-digit characters
    RETURN REGEXP_REPLACE(phone, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION normalize_phone IS 'Normalize phone for fuzzy matching: keep only digits (removes spaces, dashes, parentheses)';

-- Normalize name for matching (lowercase, trim, remove extra spaces)
CREATE OR REPLACE FUNCTION normalize_name(name text)
RETURNS text AS $$
BEGIN
    IF name IS NULL OR TRIM(name) = '' THEN
        RETURN NULL;
    END IF;
    -- Lowercase, trim, collapse multiple spaces to single space
    RETURN LOWER(REGEXP_REPLACE(TRIM(name), '\s+', ' ', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION normalize_name IS 'Normalize name for fuzzy matching: lowercase, trim, collapse spaces';

-- ============================================================================
-- STEP 2: CUSTOMER MATCHING HELPER FUNCTION
-- ============================================================================

-- Find existing customer by email, phone, or name similarity
CREATE OR REPLACE FUNCTION find_customer_by_matching_keys(
    p_company_id uuid,
    p_customer_name text,
    p_customer_email text DEFAULT NULL,
    p_customer_phone text DEFAULT NULL
)
RETURNS TABLE(
    customer_id uuid,
    match_type text,
    confidence_score numeric
) AS $$
BEGIN
    -- Priority 1: Email match (confidence = 1.0)
    IF p_customer_email IS NOT NULL AND TRIM(p_customer_email) != '' THEN
        RETURN QUERY
        SELECT
            cmk.customer_id,
            'email'::text as match_type,
            1.0::numeric as confidence_score
        FROM customer_matching_keys cmk
        INNER JOIN customers c ON cmk.customer_id = c.id
        WHERE cmk.key_type = 'email'
            AND cmk.normalized_value = normalize_email(p_customer_email)
            AND c.company_id = p_company_id
            AND c.deleted_at IS NULL
        LIMIT 1;

        -- If email match found, return immediately
        IF FOUND THEN
            RETURN;
        END IF;
    END IF;

    -- Priority 2: Phone match (confidence = 0.9)
    IF p_customer_phone IS NOT NULL AND TRIM(p_customer_phone) != '' THEN
        RETURN QUERY
        SELECT
            cmk.customer_id,
            'phone'::text as match_type,
            0.9::numeric as confidence_score
        FROM customer_matching_keys cmk
        INNER JOIN customers c ON cmk.customer_id = c.id
        WHERE cmk.key_type = 'phone'
            AND cmk.normalized_value = normalize_phone(p_customer_phone)
            AND c.company_id = p_company_id
            AND c.deleted_at IS NULL
        LIMIT 1;

        -- If phone match found, return immediately
        IF FOUND THEN
            RETURN;
        END IF;
    END IF;

    -- Priority 3: Name similarity match (confidence = 0.7+, using trigram similarity)
    IF p_customer_name IS NOT NULL AND TRIM(p_customer_name) != '' THEN
        RETURN QUERY
        SELECT
            cmk.customer_id,
            'name'::text as match_type,
            SIMILARITY(cmk.normalized_value, normalize_name(p_customer_name))::numeric as confidence_score
        FROM customer_matching_keys cmk
        INNER JOIN customers c ON cmk.customer_id = c.id
        WHERE cmk.key_type = 'name'
            AND c.company_id = p_company_id
            AND c.deleted_at IS NULL
            AND SIMILARITY(cmk.normalized_value, normalize_name(p_customer_name)) >= 0.7
        ORDER BY confidence_score DESC
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_customer_by_matching_keys IS 'Find existing customer using fuzzy matching. Priority: email (1.0) > phone (0.9) > name similarity (0.7+)';

-- ============================================================================
-- STEP 3: CREATE OR UPDATE CUSTOMER HELPER FUNCTION
-- ============================================================================

-- Find or create customer from chat data
CREATE OR REPLACE FUNCTION find_or_create_customer_from_chat(
    p_company_id uuid,
    p_customer_name text,
    p_customer_email text DEFAULT NULL,
    p_customer_phone text DEFAULT NULL,
    p_customer_address text DEFAULT NULL,
    p_source text DEFAULT 'chat',
    p_user_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    v_customer_id uuid;
    v_match_type text;
    v_confidence_score numeric;
    v_existing_record RECORD;
BEGIN
    -- Validate required fields
    IF p_company_id IS NULL THEN
        RAISE EXCEPTION 'company_id cannot be null';
    END IF;

    IF p_customer_name IS NULL OR TRIM(p_customer_name) = '' THEN
        RAISE EXCEPTION 'customer_name cannot be null or empty';
    END IF;

    -- Try to find existing customer using matching keys
    SELECT customer_id, match_type, confidence_score
    INTO v_customer_id, v_match_type, v_confidence_score
    FROM find_customer_by_matching_keys(
        p_company_id,
        p_customer_name,
        p_customer_email,
        p_customer_phone
    )
    LIMIT 1;

    -- If existing customer found, update with any new information
    IF v_customer_id IS NOT NULL THEN
        -- Get current customer data
        SELECT * INTO v_existing_record
        FROM customers
        WHERE id = v_customer_id;

        -- Update customer with any new non-null values
        UPDATE customers
        SET
            customer_name = COALESCE(p_customer_name, customer_name),
            customer_email = CASE
                WHEN p_customer_email IS NOT NULL AND TRIM(p_customer_email) != ''
                THEN p_customer_email
                ELSE customer_email
            END,
            customer_phone = CASE
                WHEN p_customer_phone IS NOT NULL AND TRIM(p_customer_phone) != ''
                THEN p_customer_phone
                ELSE customer_phone
            END,
            customer_address = CASE
                WHEN p_customer_address IS NOT NULL AND TRIM(p_customer_address) != ''
                THEN p_customer_address
                ELSE customer_address
            END,
            updated_at = NOW()
        WHERE id = v_customer_id;

        -- Log customer update event
        INSERT INTO customer_events (
            customer_id,
            company_id,
            event_type,
            event_data,
            created_by_user_id
        ) VALUES (
            v_customer_id,
            p_company_id,
            'updated',
            jsonb_build_object(
                'source', 'auto_sync',
                'match_type', v_match_type,
                'confidence_score', v_confidence_score,
                'updated_fields', jsonb_build_object(
                    'name', p_customer_name != v_existing_record.customer_name,
                    'email', p_customer_email IS NOT NULL AND p_customer_email != v_existing_record.customer_email,
                    'phone', p_customer_phone IS NOT NULL AND p_customer_phone != v_existing_record.customer_phone,
                    'address', p_customer_address IS NOT NULL AND p_customer_address != v_existing_record.customer_address
                )
            ),
            p_user_id
        );

        RETURN v_customer_id;
    END IF;

    -- No existing customer found - create new one
    INSERT INTO customers (
        company_id,
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        status,
        lifecycle_stage,
        source,
        created_at,
        updated_at
    ) VALUES (
        p_company_id,
        p_customer_name,
        NULLIF(TRIM(p_customer_email), ''),
        NULLIF(TRIM(p_customer_phone), ''),
        NULLIF(TRIM(p_customer_address), ''),
        'active',
        'prospect', -- New customers from chat start as prospects
        p_source,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_customer_id;

    -- Create matching keys for new customer
    -- Email key
    IF p_customer_email IS NOT NULL AND TRIM(p_customer_email) != '' THEN
        INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
        VALUES (v_customer_id, 'email', p_customer_email, normalize_email(p_customer_email))
        ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;
    END IF;

    -- Phone key
    IF p_customer_phone IS NOT NULL AND TRIM(p_customer_phone) != '' THEN
        INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
        VALUES (v_customer_id, 'phone', p_customer_phone, normalize_phone(p_customer_phone))
        ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;
    END IF;

    -- Name key
    INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
    VALUES (v_customer_id, 'name', p_customer_name, normalize_name(p_customer_name))
    ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;

    -- Log customer creation event
    INSERT INTO customer_events (
        customer_id,
        company_id,
        event_type,
        event_data,
        created_by_user_id
    ) VALUES (
        v_customer_id,
        p_company_id,
        'created',
        jsonb_build_object(
            'source', p_source,
            'has_email', p_customer_email IS NOT NULL,
            'has_phone', p_customer_phone IS NOT NULL,
            'has_address', p_customer_address IS NOT NULL
        ),
        p_user_id
    );

    RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_or_create_customer_from_chat IS 'Find existing customer or create new one from chat data. Handles fuzzy matching and auto-sync.';

-- ============================================================================
-- STEP 4: VC USAGE AUTO-SYNC TRIGGER
-- ============================================================================

-- Trigger function: Auto-link VC Usage to customers table
CREATE OR REPLACE FUNCTION sync_customer_from_vc_usage()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_id uuid;
BEGIN
    -- Only process if customer_name is present and customer_id is not already set
    IF NEW.customer_name IS NOT NULL
        AND TRIM(NEW.customer_name) != ''
        AND NEW.customer_id IS NULL
    THEN
        -- Find or create customer
        v_customer_id := find_or_create_customer_from_chat(
            NEW.company_id,
            NEW.customer_name,
            NEW.customer_email,
            NEW.customer_phone,
            NEW.customer_address,
            'chat',
            NEW.user_id
        );

        -- Link VC Usage record to customer
        NEW.customer_id := v_customer_id;
        NEW.customer_linked_at := NOW();
        NEW.customer_link_source := 'auto_sync';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_customer_from_vc_usage IS 'Trigger function: Auto-link VC Usage records to customers table when customer_name is present';

-- Create trigger on VC Usage INSERT
DROP TRIGGER IF EXISTS trg_vc_usage_customer_sync_insert ON "VC Usage";
CREATE TRIGGER trg_vc_usage_customer_sync_insert
    BEFORE INSERT ON "VC Usage"
    FOR EACH ROW
    EXECUTE FUNCTION sync_customer_from_vc_usage();

COMMENT ON TRIGGER trg_vc_usage_customer_sync_insert ON "VC Usage" IS 'Auto-sync trigger: Link new VC Usage records to customers on INSERT';

-- Create trigger on VC Usage UPDATE
DROP TRIGGER IF EXISTS trg_vc_usage_customer_sync_update ON "VC Usage";
CREATE TRIGGER trg_vc_usage_customer_sync_update
    BEFORE UPDATE ON "VC Usage"
    FOR EACH ROW
    WHEN (
        -- Only trigger if customer_name changed or customer_id is NULL but customer_name exists
        (OLD.customer_name IS DISTINCT FROM NEW.customer_name)
        OR (NEW.customer_id IS NULL AND NEW.customer_name IS NOT NULL)
    )
    EXECUTE FUNCTION sync_customer_from_vc_usage();

COMMENT ON TRIGGER trg_vc_usage_customer_sync_update ON "VC Usage" IS 'Auto-sync trigger: Re-link VC Usage records to customers when customer_name changes';

-- ============================================================================
-- STEP 5: CUSTOMER MATCHING KEYS SYNC TRIGGER
-- ============================================================================

-- Trigger function: Sync matching keys when customer data changes
CREATE OR REPLACE FUNCTION sync_customer_matching_keys()
RETURNS TRIGGER AS $$
BEGIN
    -- Update email key if changed
    IF OLD.customer_email IS DISTINCT FROM NEW.customer_email THEN
        -- Delete old email key
        IF OLD.customer_email IS NOT NULL AND TRIM(OLD.customer_email) != '' THEN
            DELETE FROM customer_matching_keys
            WHERE customer_id = NEW.id
                AND key_type = 'email'
                AND normalized_value = normalize_email(OLD.customer_email);
        END IF;

        -- Insert new email key
        IF NEW.customer_email IS NOT NULL AND TRIM(NEW.customer_email) != '' THEN
            INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
            VALUES (NEW.id, 'email', NEW.customer_email, normalize_email(NEW.customer_email))
            ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;
        END IF;
    END IF;

    -- Update phone key if changed
    IF OLD.customer_phone IS DISTINCT FROM NEW.customer_phone THEN
        -- Delete old phone key
        IF OLD.customer_phone IS NOT NULL AND TRIM(OLD.customer_phone) != '' THEN
            DELETE FROM customer_matching_keys
            WHERE customer_id = NEW.id
                AND key_type = 'phone'
                AND normalized_value = normalize_phone(OLD.customer_phone);
        END IF;

        -- Insert new phone key
        IF NEW.customer_phone IS NOT NULL AND TRIM(NEW.customer_phone) != '' THEN
            INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
            VALUES (NEW.id, 'phone', NEW.customer_phone, normalize_phone(NEW.customer_phone))
            ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;
        END IF;
    END IF;

    -- Update name key if changed
    IF OLD.customer_name IS DISTINCT FROM NEW.customer_name THEN
        -- Delete old name key
        DELETE FROM customer_matching_keys
        WHERE customer_id = NEW.id
            AND key_type = 'name'
            AND normalized_value = normalize_name(OLD.customer_name);

        -- Insert new name key
        INSERT INTO customer_matching_keys (customer_id, key_type, key_value, normalized_value)
        VALUES (NEW.id, 'name', NEW.customer_name, normalize_name(NEW.customer_name))
        ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_customer_matching_keys IS 'Trigger function: Keep matching keys in sync when customer email/phone/name changes';

-- Create trigger on customers UPDATE
DROP TRIGGER IF EXISTS trg_customers_matching_keys_sync ON customers;
CREATE TRIGGER trg_customers_matching_keys_sync
    AFTER UPDATE ON customers
    FOR EACH ROW
    WHEN (
        OLD.customer_email IS DISTINCT FROM NEW.customer_email
        OR OLD.customer_phone IS DISTINCT FROM NEW.customer_phone
        OR OLD.customer_name IS DISTINCT FROM NEW.customer_name
    )
    EXECUTE FUNCTION sync_customer_matching_keys();

COMMENT ON TRIGGER trg_customers_matching_keys_sync ON customers IS 'Sync trigger: Update matching keys when customer contact info changes';

-- ============================================================================
-- STEP 6: CUSTOMER METRICS MATERIALIZED VIEW REFRESH TRIGGERS
-- ============================================================================

-- Function: Refresh customer metrics for specific customer
CREATE OR REPLACE FUNCTION refresh_customer_metrics(p_customer_id uuid)
RETURNS void AS $$
BEGIN
    -- Delete old metrics
    DELETE FROM customer_metrics WHERE customer_id = p_customer_id;

    -- Insert updated metrics
    INSERT INTO customer_metrics
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
    WHERE c.id = p_customer_id
        AND c.deleted_at IS NULL
    GROUP BY c.id, c.company_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_customer_metrics IS 'Refresh materialized view metrics for a specific customer';

-- Trigger function: Refresh metrics when VC Usage changes
CREATE OR REPLACE FUNCTION trigger_refresh_customer_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Refresh metrics for affected customer
    IF TG_OP = 'DELETE' THEN
        IF OLD.customer_id IS NOT NULL THEN
            PERFORM refresh_customer_metrics(OLD.customer_id);
        END IF;
    ELSE
        IF NEW.customer_id IS NOT NULL THEN
            PERFORM refresh_customer_metrics(NEW.customer_id);
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trigger_refresh_customer_metrics IS 'Trigger function: Refresh customer metrics when VC Usage changes';

-- Create trigger on VC Usage for metrics refresh
DROP TRIGGER IF EXISTS trg_vc_usage_metrics_refresh ON "VC Usage";
CREATE TRIGGER trg_vc_usage_metrics_refresh
    AFTER INSERT OR UPDATE OR DELETE ON "VC Usage"
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_customer_metrics();

COMMENT ON TRIGGER trg_vc_usage_metrics_refresh ON "VC Usage" IS 'Real-time refresh: Update customer metrics when VC Usage changes';

-- ============================================================================
-- STEP 7: CUSTOMER AUDIT LOG TRIGGER
-- ============================================================================

-- Trigger function: Log all customer changes to audit log
CREATE OR REPLACE FUNCTION log_customer_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_old_values jsonb;
    v_new_values jsonb;
    v_changed_by_user_id uuid;
BEGIN
    -- Extract user_id from app context if available
    BEGIN
        v_changed_by_user_id := current_setting('app.current_user_id', true)::uuid;
    EXCEPTION WHEN OTHERS THEN
        v_changed_by_user_id := NULL;
    END;

    -- Build old/new value snapshots
    IF TG_OP = 'DELETE' THEN
        v_old_values := to_jsonb(OLD);
        v_new_values := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        v_old_values := NULL;
        v_new_values := to_jsonb(NEW);
    END IF;

    -- Insert audit log entry
    INSERT INTO customer_audit_log (
        table_name,
        record_id,
        company_id,
        action,
        old_values,
        new_values,
        changed_by_user_id,
        changed_at
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.company_id, OLD.company_id),
        TG_OP,
        v_old_values,
        v_new_values,
        v_changed_by_user_id,
        NOW()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_customer_changes IS 'Trigger function: Log all customer data changes to audit log';

-- Create audit triggers on customers table
DROP TRIGGER IF EXISTS trg_customers_audit_log ON customers;
CREATE TRIGGER trg_customers_audit_log
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION log_customer_changes();

COMMENT ON TRIGGER trg_customers_audit_log ON customers IS 'Audit trigger: Log all changes to customers table';

-- ============================================================================
-- STEP 8: LIFECYCLE STAGE CHANGE TRIGGER
-- ============================================================================

-- Trigger function: Track lifecycle stage changes
CREATE OR REPLACE FUNCTION track_lifecycle_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track if lifecycle_stage actually changed
    IF OLD.lifecycle_stage IS DISTINCT FROM NEW.lifecycle_stage THEN
        -- Update lifecycle_updated_at timestamp
        NEW.lifecycle_updated_at := NOW();

        -- Log lifecycle change event
        INSERT INTO customer_events (
            customer_id,
            company_id,
            event_type,
            event_data,
            created_by_user_id
        ) VALUES (
            NEW.id,
            NEW.company_id,
            'stage_changed',
            jsonb_build_object(
                'old_stage', OLD.lifecycle_stage,
                'new_stage', NEW.lifecycle_stage,
                'timestamp', NOW()
            ),
            -- Try to get current user from app context
            (SELECT current_setting('app.current_user_id', true)::uuid)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION track_lifecycle_changes IS 'Trigger function: Track customer lifecycle stage changes';

-- Create trigger on customers UPDATE
DROP TRIGGER IF EXISTS trg_customers_lifecycle_tracking ON customers;
CREATE TRIGGER trg_customers_lifecycle_tracking
    BEFORE UPDATE ON customers
    FOR EACH ROW
    WHEN (OLD.lifecycle_stage IS DISTINCT FROM NEW.lifecycle_stage)
    EXECUTE FUNCTION track_lifecycle_changes();

COMMENT ON TRIGGER trg_customers_lifecycle_tracking ON customers IS 'Lifecycle trigger: Track stage changes and update timestamp';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all triggers are created
SELECT
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('customers', 'VC Usage')
    AND trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Verify all functions are created
SELECT
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name LIKE '%customer%'
ORDER BY routine_name;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================

-- After running this migration:
-- 1. Test customer auto-creation from chat:
--    - Insert a record into "VC Usage" with customer_name
--    - Verify customer is auto-created in customers table
--    - Verify customer_id is linked in "VC Usage"
--
-- 2. Test fuzzy matching:
--    - Insert another "VC Usage" record with same email
--    - Verify it links to existing customer (no duplicate created)
--
-- 3. Test customer update:
--    - Update customer email in customers table
--    - Verify matching_keys table is updated
--    - Verify audit_log entry is created
--
-- 4. Test metrics refresh:
--    - Insert multiple "VC Usage" records for one customer
--    - Verify customer_metrics view updates in real-time
--
-- 5. Test lifecycle tracking:
--    - Update customer lifecycle_stage from 'prospect' to 'customer'
--    - Verify customer_events log entry is created
--    - Verify lifecycle_updated_at timestamp is updated

-- ============================================================================
-- END OF TRIGGER FUNCTIONS & HELPERS
-- ============================================================================
