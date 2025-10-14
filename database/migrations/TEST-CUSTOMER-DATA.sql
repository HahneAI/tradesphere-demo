-- ============================================================================
-- TEST CUSTOMER DATA - Phase 3 Integration Testing
-- ============================================================================
--
-- Purpose: Create 3 test customers to verify CustomersTab integration
-- Status: Test data for development/staging only
--
-- ✅ READY TO RUN - UUIDs Already Populated!
-- Company ID: 08f0827a-608f-485a-a19f-e0c55ecf6484
-- User ID: cd7ad550-37f3-477a-975e-a34b226b7332
--
-- Simply copy the 3 INSERT statements below and run in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- TEST CUSTOMER 1: Sarah Johnson (Prospect from Chat)
-- ============================================================================
-- Scenario: Customer who came from AI chat, new prospect, no email yet
INSERT INTO customers (
  company_id,
  customer_name,
  customer_email,
  customer_phone,
  customer_address,
  customer_notes,
  created_by_user_id,
  created_by_user_name,
  status,
  lifecycle_stage,
  tags,
  source,
  source_campaign,
  created_at,
  updated_at
) VALUES (
  '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid,  -- Your company_id
  'Sarah Johnson',
  'sarah.johnson@email.com',
  '(555) 123-4567',
  '123 Maple Street, Springfield, IL 62701',
  'Interested in 500 sq ft paver patio with outdoor kitchen. Budget: $15,000-$20,000',
  'cd7ad550-37f3-477a-975e-a34b226b7332'::uuid,  -- Your user_id
  'Test User',
  'active',
  'prospect',
  ARRAY['VIP', 'high-budget', 'paver-patio'],
  'chat',
  'Spring 2025 Promotion',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
);

-- ============================================================================
-- TEST CUSTOMER 2: Michael Chen (Lead - Manual Entry)
-- ============================================================================
-- Scenario: Manually entered customer, already a lead, has full contact info
INSERT INTO customers (
  company_id,
  customer_name,
  customer_email,
  customer_phone,
  customer_address,
  customer_notes,
  created_by_user_id,
  created_by_user_name,
  status,
  lifecycle_stage,
  tags,
  source,
  source_campaign,
  created_at,
  updated_at
) VALUES (
  '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid,  -- Your company_id
  'Michael Chen',
  'mchen@business.com',
  '(555) 987-6543',
  '456 Oak Avenue, Unit 12, Chicago, IL 60601',
  'Commercial property manager. Needs retaining wall repair (100 linear feet). Follow up next week.',
  'cd7ad550-37f3-477a-975e-a34b226b7332'::uuid,  -- Your user_id
  'Test User',
  'active',
  'lead',
  ARRAY['commercial', 'retaining-wall', 'follow-up'],
  'manual',
  NULL,
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '2 days'
);

-- ============================================================================
-- TEST CUSTOMER 3: Emily Rodriguez (Existing Customer)
-- ============================================================================
-- Scenario: Repeat customer, completed previous project, now requesting new quote
INSERT INTO customers (
  company_id,
  customer_name,
  customer_email,
  customer_phone,
  customer_address,
  customer_notes,
  created_by_user_id,
  created_by_user_name,
  status,
  lifecycle_stage,
  tags,
  source,
  source_campaign,
  created_at,
  updated_at
) VALUES (
  '08f0827a-608f-485a-a19f-e0c55ecf6484'::uuid,  -- Your company_id
  'Emily Rodriguez',
  'emily.r@homemail.com',
  '(555) 246-8135',
  '789 Pine Drive, Naperville, IL 60540',
  'Completed paver patio last year (2024). Very satisfied. Now wants pool deck (400 sq ft) and walkway.',
  'cd7ad550-37f3-477a-975e-a34b226b7332'::uuid,  -- Your user_id
  'Test User',
  'active',
  'customer',
  ARRAY['repeat-customer', 'satisfied', 'referral-source'],
  'chat',
  'Referral Program',
  NOW() - INTERVAL '365 days',
  NOW() - INTERVAL '1 day'
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- After running the inserts above, verify the data was created:

-- 1. Check customers were created
SELECT
  id,
  customer_name,
  customer_email,
  lifecycle_stage,
  tags,
  source,
  created_at
FROM customers
WHERE customer_name IN ('Sarah Johnson', 'Michael Chen', 'Emily Rodriguez')
ORDER BY created_at DESC;

-- 2. Check customer_matching_keys were auto-created by triggers
SELECT
  cmk.key_type,
  cmk.key_value,
  cmk.normalized_value,
  c.customer_name
FROM customer_matching_keys cmk
JOIN customers c ON cmk.customer_id = c.id
WHERE c.customer_name IN ('Sarah Johnson', 'Michael Chen', 'Emily Rodriguez')
ORDER BY c.customer_name, cmk.key_type;

-- 3. Check customer_events were logged
SELECT
  ce.event_type,
  ce.event_data,
  ce.created_at,
  c.customer_name
FROM customer_events ce
JOIN customers c ON ce.customer_id = c.id
WHERE c.customer_name IN ('Sarah Johnson', 'Michael Chen', 'Emily Rodriguez')
ORDER BY ce.created_at DESC;

-- 4. Check customer_metrics materialized view (may be empty until VC Usage linked)
SELECT
  cm.total_conversations,
  cm.total_interactions,
  cm.total_views,
  c.customer_name
FROM customer_metrics cm
JOIN customers c ON cm.customer_id = c.id
WHERE c.customer_name IN ('Sarah Johnson', 'Michael Chen', 'Emily Rodriguez');

-- ============================================================================
-- HOW TO USE THIS FILE
-- ============================================================================

-- STEP 1: Find your company_id and user_id
-- Run these queries in Supabase SQL Editor:
--
-- SELECT id, name FROM companies LIMIT 1;
-- SELECT id, email FROM users LIMIT 1;

-- STEP 2: Replace UUIDs
-- Replace all instances of 'YOUR_COMPANY_ID' with your actual company UUID
-- Replace all instances of 'YOUR_USER_ID' with your actual user UUID

-- STEP 3: Run the INSERT statements
-- Copy the 3 INSERT statements above and run them in Supabase SQL Editor

-- STEP 4: Verify with the queries
-- Run the verification queries at the bottom to confirm everything worked

-- STEP 5: Test in CustomersTab
-- Open your app → CustomersTab
-- You should see 3 customers:
-- - Sarah Johnson (Prospect, from chat, 3 tags)
-- - Michael Chen (Lead, manual entry, 3 tags)
-- - Emily Rodriguez (Customer, repeat customer, 3 tags)

-- ============================================================================
-- CLEANUP (Optional)
-- ============================================================================

-- To remove test customers when done testing:
/*
DELETE FROM customer_matching_keys
WHERE customer_id IN (
  SELECT id FROM customers
  WHERE customer_name IN ('Sarah Johnson', 'Michael Chen', 'Emily Rodriguez')
);

DELETE FROM customer_events
WHERE customer_id IN (
  SELECT id FROM customers
  WHERE customer_name IN ('Sarah Johnson', 'Michael Chen', 'Emily Rodriguez')
);

DELETE FROM customer_audit_log
WHERE record_id IN (
  SELECT id FROM customers
  WHERE customer_name IN ('Sarah Johnson', 'Michael Chen', 'Emily Rodriguez')
);

DELETE FROM customers
WHERE customer_name IN ('Sarah Johnson', 'Michael Chen', 'Emily Rodriguez');
*/

-- ============================================================================
-- EXPECTED RESULTS IN CUSTOMERSTAB
-- ============================================================================

-- Customer 1: Sarah Johnson
-- - Lifecycle Badge: Blue "Prospect"
-- - Source Badge: Chat icon
-- - Tags: VIP, high-budget, paver-patio
-- - Metrics: 0 conversations (until VC Usage linked)
-- - Created: 3 days ago

-- Customer 2: Michael Chen
-- - Lifecycle Badge: Yellow "Lead"
-- - Source Badge: User icon (manual)
-- - Tags: commercial, retaining-wall, follow-up
-- - Metrics: 0 conversations
-- - Created: 7 days ago

-- Customer 3: Emily Rodriguez
-- - Lifecycle Badge: Green "Customer"
-- - Source Badge: Chat icon
-- - Tags: repeat-customer, satisfied, referral-source
-- - Metrics: 0 conversations
-- - Created: 365 days ago (1 year)

-- ============================================================================
-- END OF TEST DATA
-- ============================================================================
