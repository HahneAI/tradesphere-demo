-- ============================================================================
-- 05-ADD-MISSING-TRIGGERS.sql
-- Add INSERT Triggers for Manual Customer Creation
-- ============================================================================
--
-- PURPOSE:
-- The original triggers only fired on UPDATE (sync_customer_matching_keys) or
-- via VC Usage table (find_or_create_customer_from_chat). This caused issues
-- when customers were manually inserted directly into the customers table.
--
-- This migration adds INSERT triggers to handle:
-- 1. Manual INSERT via SQL (test data, bulk imports)
-- 2. Manual creation via UI forms (CustomerCreateWizard)
-- 3. Direct API calls to customers table
--
-- WHAT THIS ADDS:
-- - INSERT trigger to create matching_keys when customer is created
-- - INSERT trigger to initialize customer_metrics entry
-- - INSERT trigger to log creation event
--
-- RUN AFTER: 04-FIX-TEST-CUSTOMERS.sql
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Matching Keys on INSERT
-- ============================================================================

-- New function: Initialize matching keys for newly inserted customers
CREATE OR REPLACE FUNCTION initialize_customer_matching_keys()
RETURNS TRIGGER AS $$
BEGIN
    -- Create email matching key
    IF NEW.customer_email IS NOT NULL AND TRIM(NEW.customer_email) != '' THEN
        INSERT INTO customer_matching_keys (
            customer_id,
            key_type,
            key_value,
            normalized_value,
            created_at
        )
        VALUES (
            NEW.id,
            'email',
            NEW.customer_email,
            normalize_email(NEW.customer_email),
            NOW()
        )
        ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;
    END IF;

    -- Create phone matching key
    IF NEW.customer_phone IS NOT NULL AND TRIM(NEW.customer_phone) != '' THEN
        INSERT INTO customer_matching_keys (
            customer_id,
            key_type,
            key_value,
            normalized_value,
            created_at
        )
        VALUES (
            NEW.id,
            'phone',
            NEW.customer_phone,
            normalize_phone(NEW.customer_phone),
            NOW()
        )
        ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;
    END IF;

    -- Create name matching key (always present due to NOT NULL constraint)
    INSERT INTO customer_matching_keys (
        customer_id,
        key_type,
        key_value,
        normalized_value,
        created_at
    )
    VALUES (
        NEW.id,
        'name',
        NEW.customer_name,
        normalize_name(NEW.customer_name),
        NOW()
    )
    ON CONFLICT (customer_id, key_type, normalized_value) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION initialize_customer_matching_keys IS 'Trigger function: Create matching keys when customer is manually inserted';

-- Create INSERT trigger for matching keys
DROP TRIGGER IF EXISTS trg_customers_matching_keys_insert ON customers;
CREATE TRIGGER trg_customers_matching_keys_insert
    AFTER INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION initialize_customer_matching_keys();

COMMENT ON TRIGGER trg_customers_matching_keys_insert ON customers IS 'INSERT trigger: Auto-create matching keys for new customers';

-- ============================================================================
-- STEP 2: Refresh Customer Metrics on INSERT
-- ============================================================================
-- NOTE: customer_metrics is a MATERIALIZED VIEW, not a table
-- We can't INSERT into it, so we need to REFRESH it instead
-- This is handled via a trigger function that refreshes the view

-- New function: Refresh customer_metrics materialized view after customer insert
CREATE OR REPLACE FUNCTION refresh_customer_metrics_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Refresh the materialized view to include the new customer
    -- Using CONCURRENTLY to avoid locking the view during refresh
    REFRESH MATERIALIZED VIEW CONCURRENTLY customer_metrics;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_customer_metrics_on_insert IS 'Trigger function: Refresh customer_metrics materialized view when customer is created';

-- Create INSERT trigger for customer metrics refresh
DROP TRIGGER IF EXISTS trg_customers_metrics_refresh ON customers;
CREATE TRIGGER trg_customers_metrics_refresh
    AFTER INSERT ON customers
    FOR EACH STATEMENT  -- Statement-level trigger (fires once per INSERT, not per row)
    EXECUTE FUNCTION refresh_customer_metrics_on_insert();

COMMENT ON TRIGGER trg_customers_metrics_refresh ON customers IS 'INSERT trigger: Refresh customer_metrics for new customers';

-- ============================================================================
-- STEP 3: Log Creation Event on INSERT
-- ============================================================================

-- New function: Log customer creation event
CREATE OR REPLACE FUNCTION log_customer_creation()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Try to get user_id from app context first
    BEGIN
        v_user_id := current_setting('app.current_user_id', true)::uuid;
    EXCEPTION WHEN OTHERS THEN
        -- Fall back to created_by_user_id column if app context not set
        v_user_id := NEW.created_by_user_id;
    END;

    -- Log customer creation event
    INSERT INTO customer_events (
        customer_id,
        company_id,
        event_type,
        event_data,
        created_by_user_id,
        created_at
    )
    VALUES (
        NEW.id,
        NEW.company_id,
        'created',
        jsonb_build_object(
            'source', NEW.source,
            'lifecycle_stage', NEW.lifecycle_stage,
            'tags', NEW.tags,
            'has_email', NEW.customer_email IS NOT NULL,
            'has_phone', NEW.customer_phone IS NOT NULL,
            'has_address', NEW.customer_address IS NOT NULL,
            'method', CASE
                WHEN NEW.source = 'chat' THEN 'auto_sync_from_chat'
                WHEN NEW.source = 'manual' THEN 'manual_creation'
                WHEN NEW.source = 'import' THEN 'bulk_import'
                ELSE 'unknown'
            END
        ),
        v_user_id,
        NEW.created_at -- Use customer's created_at timestamp
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_customer_creation IS 'Trigger function: Log customer creation event to customer_events';

-- Create INSERT trigger for creation events
DROP TRIGGER IF EXISTS trg_customers_creation_event ON customers;
CREATE TRIGGER trg_customers_creation_event
    AFTER INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION log_customer_creation();

COMMENT ON TRIGGER trg_customers_creation_event ON customers IS 'INSERT trigger: Log creation event for new customers';

-- ============================================================================
-- STEP 4: Update Existing UPDATE Trigger
-- ============================================================================

-- Update the sync_customer_matching_keys trigger to handle INSERT as well
-- (This was previously UPDATE-only, causing the original issue)

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

COMMENT ON TRIGGER trg_customers_matching_keys_sync ON customers IS 'UPDATE trigger: Sync matching keys when customer contact info changes';

-- Note: We keep sync_customer_matching_keys() for UPDATE events (handles changes)
-- and use initialize_customer_matching_keys() for INSERT events (handles creation)
-- This separation allows for different logic depending on the operation type

-- ============================================================================
-- STEP 5: Verification Queries
-- ============================================================================

-- Show all triggers on customers table
SELECT
    trigger_name,
    event_manipulation as trigger_event,
    action_timing as when_fires,
    action_statement as calls_function
FROM information_schema.triggers
WHERE event_object_table = 'customers'
    AND trigger_schema = 'public'
ORDER BY
    CASE event_manipulation
        WHEN 'INSERT' THEN 1
        WHEN 'UPDATE' THEN 2
        WHEN 'DELETE' THEN 3
    END,
    action_timing,
    trigger_name;

-- Test INSERT trigger by creating a test customer (will be rolled back)
DO $$
DECLARE
    v_test_customer_id uuid;
    v_matching_keys_count int;
    v_metrics_exists boolean;
    v_event_exists boolean;
    v_company_id uuid := '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid;
    v_user_id uuid := 'cd7ad550-37f3-477a-975e-a34b226b7332'::uuid;
BEGIN
    -- Set app context for RLS policies
    PERFORM set_config('app.current_company_id', v_company_id::text, true);
    PERFORM set_config('app.current_user_id', v_user_id::text, true);

    -- Create test customer
    INSERT INTO customers (
        company_id,
        customer_name,
        customer_email,
        customer_phone,
        status,
        lifecycle_stage,
        source,
        created_by_user_id,
        created_at,
        updated_at
    )
    VALUES (
        v_company_id,
        'Trigger Test Customer',
        'test@trigger.com',
        '(555) 000-0000',
        'active',
        'prospect',
        'manual',
        v_user_id,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_test_customer_id;

    -- Verify matching keys were created
    SELECT COUNT(*) INTO v_matching_keys_count
    FROM customer_matching_keys
    WHERE customer_id = v_test_customer_id;

    -- Verify metrics entry was created
    SELECT EXISTS(
        SELECT 1 FROM customer_metrics WHERE customer_id = v_test_customer_id
    ) INTO v_metrics_exists;

    -- Verify creation event was logged
    SELECT EXISTS(
        SELECT 1 FROM customer_events
        WHERE customer_id = v_test_customer_id AND event_type = 'created'
    ) INTO v_event_exists;

    -- Display results
    RAISE NOTICE '=== INSERT Trigger Verification ===';
    RAISE NOTICE 'Test Customer ID: %', v_test_customer_id;
    RAISE NOTICE 'Matching Keys Created: % (expected: 3)', v_matching_keys_count;
    RAISE NOTICE 'Metrics Entry Created: % (expected: true)', v_metrics_exists;
    RAISE NOTICE 'Creation Event Logged: % (expected: true)', v_event_exists;

    -- Verify expected results
    IF v_matching_keys_count != 3 THEN
        RAISE EXCEPTION 'INSERT trigger test FAILED: Expected 3 matching keys, got %', v_matching_keys_count;
    END IF;

    IF NOT v_metrics_exists THEN
        RAISE EXCEPTION 'INSERT trigger test FAILED: Metrics entry not created';
    END IF;

    IF NOT v_event_exists THEN
        RAISE EXCEPTION 'INSERT trigger test FAILED: Creation event not logged';
    END IF;

    RAISE NOTICE '✅ All INSERT triggers working correctly!';

    -- Clean up test customer
    DELETE FROM customers WHERE id = v_test_customer_id;
    RAISE NOTICE '🧹 Test customer cleaned up';

END $$;

-- ============================================================================
-- TESTING INSTRUCTIONS
-- ============================================================================

-- To test INSERT triggers with real data:
--
-- 1. Insert a customer:
--    INSERT INTO customers (company_id, customer_name, customer_email, ...)
--    VALUES ('your-company-id', 'Test Customer', 'test@email.com', ...);
--
-- 2. Verify matching keys:
--    SELECT * FROM customer_matching_keys WHERE customer_id = 'new-customer-id';
--    -- Should return 3 rows (email, phone, name)
--
-- 3. Verify metrics:
--    SELECT * FROM customer_metrics WHERE customer_id = 'new-customer-id';
--    -- Should return 1 row with zero values
--
-- 4. Verify events:
--    SELECT * FROM customer_events WHERE customer_id = 'new-customer-id';
--    -- Should return 1 row with event_type='created'

-- ============================================================================
-- SUCCESS CRITERIA
-- ============================================================================
-- ✅ 3 new functions created: initialize_customer_matching_keys, refresh_customer_metrics_on_insert, log_customer_creation
-- ✅ 3 new INSERT triggers created on customers table
-- ✅ Existing UPDATE trigger preserved for sync_customer_matching_keys
-- ✅ Test query passes verification checks
-- ✅ Future manual customer INSERTs will auto-create matching_keys, refresh metrics view, and log events

-- ============================================================================
-- END OF INSERT TRIGGERS MIGRATION
-- ============================================================================
