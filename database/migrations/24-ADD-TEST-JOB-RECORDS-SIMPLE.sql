-- Migration: Add Test Job Records (Supabase Compatible)
-- Purpose: Create 4 realistic job records with services for testing the Jobs UI
-- Date: October 24, 2025
--
-- INSTRUCTIONS: Copy this entire file and paste into Supabase SQL Editor, then click RUN

-- ============================================================================
-- JOB 1: Sarah Johnson - Backyard Paver Patio (QUOTE STATUS)
-- ============================================================================

-- Insert Job 1
DO $$
DECLARE
  v_job_1_id UUID;
BEGIN
  -- Create the job
  INSERT INTO ops_jobs (
    id,
    company_id,
    customer_id,
    job_number,
    title,
    description,
    status,
    service_address,
    service_city,
    service_state,
    service_zip,
    requested_start_date,
    priority,
    estimated_total,
    quote_valid_until,
    tags,
    created_by_user_id,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    '08f0827a-608f-485a-a19f-e0c55ecf6484',
    '208a273a-bc07-41df-bc46-497e2eca2af0',
    'JOB-2025-001',
    'Backyard Paver Patio Installation',
    'Customer wants a beautiful 360 sq ft paver patio in their backyard with a fire pit area. Requires excavation and leveling. Customer prefers Belgard Cambridge Cobble pavers in Desert Tan color.',
    'quote',
    '123 Maple Street',
    'Springfield',
    'IL',
    '62701',
    '2025-02-15',
    5,
    38650.00,
    '2025-02-14',
    ARRAY['patio', 'hardscape', 'backyard'],
    '50dfad12-a6bc-42cd-a77a-1679fb9619a1',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
  ) RETURNING id INTO v_job_1_id;

  -- Insert Job 1 Services
  INSERT INTO ops_job_services (
    id,
    job_id,
    service_config_id,
    service_name,
    service_description,
    quantity,
    unit_price,
    total_price,
    calculation_data,
    pricing_variables,
    added_by_user_id,
    created_at
  ) VALUES
  (
    gen_random_uuid(),
    v_job_1_id,
    '25b669b3-cd3f-4541-8c31-57244f38742e',
    'Paver Patio Installation',
    '360 sq ft paver patio with Belgard Cambridge Cobble pavers',
    360,
    85.00,
    30600.00,
    '{"laborHours": 48, "materialCost": 5.84, "laborCost": 4800.00}'::jsonb,
    '{"paverType": "belgard_cambridge", "color": "desert_tan", "pattern": "herringbone"}'::jsonb,
    '50dfad12-a6bc-42cd-a77a-1679fb9619a1',
    NOW() - INTERVAL '3 days'
  ),
  (
    gen_random_uuid(),
    v_job_1_id,
    'f06533a1-9fa2-4bdd-93d7-cbabcef4ce46',
    'Site Excavation & Prep',
    'Excavate 6 inches, level base, compact gravel',
    360,
    22.50,
    8050.00,
    '{"laborHours": 16, "equipmentCost": 450.00}'::jsonb,
    '{"depth": 6, "includesGravel": true}'::jsonb,
    '50dfad12-a6bc-42cd-a77a-1679fb9619a1',
    NOW() - INTERVAL '3 days'
  );

  -- Insert Job 1 Note
  INSERT INTO ops_job_notes (
    id,
    job_id,
    note_type,
    subject,
    content,
    is_ai_generated,
    is_internal,
    created_by_user_id,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_job_1_id,
    'general',
    'Initial quote discussion',
    'Customer is very interested in the patio. Mentioned they are planning to host outdoor parties this summer. Wants to see material samples before approving.',
    false,
    true,
    '50dfad12-a6bc-42cd-a77a-1679fb9619a1',
    NOW() - INTERVAL '2 days'
  );

  RAISE NOTICE 'Job 1 created: JOB-2025-001 (ID: %)', v_job_1_id;
END $$;

-- ============================================================================
-- JOB 2: Sarah Johnson - Front Walkway Pavers (SCHEDULED)
-- ============================================================================

DO $$
DECLARE
  v_job_2_id UUID;
BEGIN
  INSERT INTO ops_jobs (
    id,
    company_id,
    customer_id,
    job_number,
    title,
    description,
    status,
    service_address,
    service_city,
    service_state,
    service_zip,
    requested_start_date,
    scheduled_start_date,
    scheduled_end_date,
    priority,
    estimated_total,
    quote_approved_at,
    tags,
    created_by_user_id,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    '08f0827a-608f-485a-a19f-e0c55ecf6484',
    '208a273a-bc07-41df-bc46-497e2eca2af0',
    'JOB-2025-002',
    'Front Walkway Paver Installation',
    'Replace existing concrete walkway with Cambridge pavers. 120 sq ft from driveway to front door. Customer approved quote and scheduled for next week.',
    'scheduled',
    '123 Maple Street',
    'Springfield',
    'IL',
    '62701',
    '2025-01-30',
    '2025-01-27',
    '2025-01-28',
    8,
    12450.00,
    NOW() - INTERVAL '5 days',
    ARRAY['walkway', 'hardscape', 'front-yard'],
    '50dfad12-a6bc-42cd-a77a-1679fb9619a1',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '2 days'
  ) RETURNING id INTO v_job_2_id;

  INSERT INTO ops_job_services (
    id,
    job_id,
    service_config_id,
    service_name,
    service_description,
    quantity,
    unit_price,
    total_price,
    calculation_data,
    pricing_variables,
    added_by_user_id,
    created_at
  ) VALUES
  (
    gen_random_uuid(),
    v_job_2_id,
    '25b669b3-cd3f-4541-8c31-57244f38742e',
    'Paver Walkway Installation',
    '120 sq ft paver walkway with Cambridge pavers',
    120,
    78.00,
    9360.00,
    '{"laborHours": 18, "materialCost": 5.84, "laborCost": 1800.00}'::jsonb,
    '{"paverType": "belgard_cambridge", "color": "charcoal", "pattern": "running_bond"}'::jsonb,
    '50dfad12-a6bc-42cd-a77a-1679fb9619a1',
    NOW() - INTERVAL '10 days'
  ),
  (
    gen_random_uuid(),
    v_job_2_id,
    'f06533a1-9fa2-4bdd-93d7-cbabcef4ce46',
    'Concrete Removal & Excavation',
    'Remove existing concrete walkway, excavate, prep base',
    120,
    25.75,
    3090.00,
    '{"laborHours": 8, "disposalCost": 350.00}'::jsonb,
    '{"depth": 6, "concreteRemoval": true}'::jsonb,
    '50dfad12-a6bc-42cd-a77a-1679fb9619a1',
    NOW() - INTERVAL '10 days'
  );

  INSERT INTO ops_job_notes (
    id,
    job_id,
    note_type,
    subject,
    content,
    is_ai_generated,
    is_internal,
    created_by_user_id,
    created_at
  ) VALUES
  (
    gen_random_uuid(),
    v_job_2_id,
    'customer_communication',
    'Quote approved',
    'Customer approved the quote via email. Very happy with the pricing. Ready to schedule.',
    false,
    false,
    '50dfad12-a6bc-42cd-a77a-1679fb9619a1',
    NOW() - INTERVAL '5 days'
  ),
  (
    gen_random_uuid(),
    v_job_2_id,
    'schedule_change',
    'Job scheduled for Jan 27-28',
    'Scheduled with customer for next Monday-Tuesday. Customer will be home both days and will move cars from driveway.',
    false,
    true,
    '50dfad12-a6bc-42cd-a77a-1679fb9619a1',
    NOW() - INTERVAL '2 days'
  );

  RAISE NOTICE 'Job 2 created: JOB-2025-002 (ID: %)', v_job_2_id;
END $$;

-- ============================================================================
-- JOB 3: Michael Chen - Commercial Patio (IN PROGRESS)
-- ============================================================================

DO $$
DECLARE
  v_job_3_id UUID;
BEGIN
  INSERT INTO ops_jobs (
    id,
    company_id,
    customer_id,
    job_number,
    title,
    description,
    status,
    service_address,
    service_city,
    service_state,
    service_zip,
    requested_start_date,
    scheduled_start_date,
    scheduled_end_date,
    actual_start_date,
    priority,
    estimated_total,
    quote_approved_at,
    tags,
    created_by_user_id,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    '08f0827a-608f-485a-a19f-e0c55ecf6484',
    '5d4c0f52-a321-427a-9130-52b28bcf2c7f',
    'JOB-2025-003',
    'Office Building Courtyard Patio',
    'Commercial project - 850 sq ft patio for office building courtyard. High-traffic commercial grade pavers required. Project currently in progress.',
    'in_progress',
    '456 Oak Avenue, Unit 12',
    'Chicago',
    'IL',
    '60601',
    '2025-01-15',
    '2025-01-20',
    '2025-01-26',
    NOW() - INTERVAL '3 days',
    10,
    89750.00,
    NOW() - INTERVAL '20 days',
    ARRAY['commercial', 'patio', 'hardscape', 'high-traffic'],
    '50dfad12-a6bc-42cd-a77a-1679fb9619a1',
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '3 days'
  ) RETURNING id INTO v_job_3_id;

  INSERT INTO ops_job_services (
    id,
    job_id,
    service_config_id,
    service_name,
    service_description,
    quantity,
    unit_price,
    total_price,
    calculation_data,
    pricing_variables,
    added_by_user_id,
    created_at
  ) VALUES
  (
    gen_random_uuid(),
    v_job_3_id,
    '25b669b3-cd3f-4541-8c31-57244f38742e',
    'Commercial Paver Patio Installation',
    '850 sq ft commercial-grade paver installation with heavy-duty base',
    850,
    92.00,
    78200.00,
    '{"laborHours": 96, "materialCost": 7.25, "laborCost": 9600.00}'::jsonb,
    '{"paverType": "commercial_grade", "color": "graphite_gray", "pattern": "basketweave", "trafficRating": "heavy"}'::jsonb,
    '50dfad12-a6bc-42cd-a77a-1679fb9619a1',
    NOW() - INTERVAL '25 days'
  ),
  (
    gen_random_uuid(),
    v_job_3_id,
    'f06533a1-9fa2-4bdd-93d7-cbabcef4ce46',
    'Commercial Site Preparation',
    'Excavation, engineered base, compaction for heavy traffic',
    850,
    13.50,
    11550.00,
    '{"laborHours": 32, "equipmentCost": 850.00, "materialCost": 3200.00}'::jsonb,
    '{"depth": 8, "baseType": "engineered_aggregate", "compactionRequired": true}'::jsonb,
    '50dfad12-a6bc-42cd-a77a-1679fb9619a1',
    NOW() - INTERVAL '25 days'
  );

  INSERT INTO ops_job_notes (
    id,
    job_id,
    note_type,
    subject,
    content,
    is_ai_generated,
    is_internal,
    created_by_user_id,
    created_at
  ) VALUES
  (
    gen_random_uuid(),
    v_job_3_id,
    'general',
    'Project kickoff',
    'Met with property manager on-site. Discussed access requirements and working hours (7am-4pm only). Need to coordinate with building security for equipment access.',
    false,
    true,
    '50dfad12-a6bc-42cd-a77a-1679fb9619a1',
    NOW() - INTERVAL '4 days'
  ),
  (
    gen_random_uuid(),
    v_job_3_id,
    'general',
    'Base work completed',
    'Excavation and base prep finished today. Passing compaction tests. Ready to start paver installation tomorrow morning.',
    false,
    true,
    '50dfad12-a6bc-42cd-a77a-1679fb9619a1',
    NOW() - INTERVAL '1 day'
  );

  RAISE NOTICE 'Job 3 created: JOB-2025-003 (ID: %)', v_job_3_id;
END $$;

-- ============================================================================
-- JOB 4: Emily Rodriguez - Driveway Extension (COMPLETED)
-- ============================================================================

DO $$
DECLARE
  v_job_4_id UUID;
BEGIN
  INSERT INTO ops_jobs (
    id,
    company_id,
    customer_id,
    job_number,
    title,
    description,
    status,
    service_address,
    service_city,
    service_state,
    service_zip,
    requested_start_date,
    scheduled_start_date,
    scheduled_end_date,
    actual_start_date,
    actual_end_date,
    priority,
    estimated_total,
    actual_total,
    labor_cost,
    material_cost,
    quote_approved_at,
    tags,
    created_by_user_id,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    '08f0827a-608f-485a-a19f-e0c55ecf6484',
    '235fc55a-adce-4569-99f2-521abaa655b3',
    'JOB-2025-004',
    'Driveway Extension with Pavers',
    'Extend existing driveway by 200 sq ft using matching pavers. Customer needed extra parking space. Project completed successfully.',
    'completed',
    '789 Pine Drive',
    'Naperville',
    'IL',
    '60540',
    '2025-01-08',
    '2025-01-10',
    '2025-01-12',
    NOW() - INTERVAL '14 days 8 hours',
    NOW() - INTERVAL '12 days 7 hours 30 minutes',
    5,
    16800.00,
    16250.00,
    6200.00,
    8950.00,
    NOW() - INTERVAL '18 days',
    ARRAY['driveway', 'hardscape', 'parking'],
    '50dfad12-a6bc-42cd-a77a-1679fb9619a1',
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '12 days'
  ) RETURNING id INTO v_job_4_id;

  INSERT INTO ops_job_services (
    id,
    job_id,
    service_config_id,
    service_name,
    service_description,
    quantity,
    unit_price,
    total_price,
    calculation_data,
    pricing_variables,
    is_completed,
    completed_at,
    added_by_user_id,
    created_at
  ) VALUES
  (
    gen_random_uuid(),
    v_job_4_id,
    '25b669b3-cd3f-4541-8c31-57244f38742e',
    'Driveway Paver Extension',
    '200 sq ft driveway extension with Holland Stone pavers',
    200,
    68.00,
    13600.00,
    '{"laborHours": 24, "materialCost": 5.20, "laborCost": 2400.00}'::jsonb,
    '{"paverType": "holland_stone", "color": "pewter_blend", "pattern": "running_bond"}'::jsonb,
    true,
    NOW() - INTERVAL '12 days',
    '50dfad12-a6bc-42cd-a77a-1679fb9619a1',
    NOW() - INTERVAL '20 days'
  ),
  (
    gen_random_uuid(),
    v_job_4_id,
    'f06533a1-9fa2-4bdd-93d7-cbabcef4ce46',
    'Driveway Base Preparation',
    'Excavate extension area, match existing grade, compact base',
    200,
    13.25,
    2650.00,
    '{"laborHours": 10, "equipmentCost": 200.00}'::jsonb,
    '{"depth": 6, "matchExisting": true}'::jsonb,
    true,
    NOW() - INTERVAL '12 days',
    '50dfad12-a6bc-42cd-a77a-1679fb9619a1',
    NOW() - INTERVAL '20 days'
  );

  INSERT INTO ops_job_notes (
    id,
    job_id,
    note_type,
    subject,
    content,
    is_ai_generated,
    is_internal,
    created_by_user_id,
    created_at
  ) VALUES
  (
    gen_random_uuid(),
    v_job_4_id,
    'general',
    'Matching pavers sourced',
    'Found matching Holland Stone pavers in pewter blend. Customer came by to verify color match - approved.',
    false,
    true,
    '50dfad12-a6bc-42cd-a77a-1679fb9619a1',
    NOW() - INTERVAL '16 days'
  ),
  (
    gen_random_uuid(),
    v_job_4_id,
    'general',
    'Project completed',
    'Driveway extension completed. Perfect match with existing pavers. Customer very happy with the result. Cleanup completed.',
    false,
    true,
    '50dfad12-a6bc-42cd-a77a-1679fb9619a1',
    NOW() - INTERVAL '12 days'
  ),
  (
    gen_random_uuid(),
    v_job_4_id,
    'customer_communication',
    'Customer feedback',
    'Customer called to say thank you. Loves the extra parking space and how seamlessly it blends with the existing driveway. Will refer us to neighbors.',
    false,
    false,
    '50dfad12-a6bc-42cd-a77a-1679fb9619a1',
    NOW() - INTERVAL '10 days'
  );

  RAISE NOTICE 'Job 4 created: JOB-2025-004 (ID: %)', v_job_4_id;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that all jobs were created
SELECT
  job_number,
  title,
  status,
  estimated_total,
  (SELECT customer_name FROM crm_customers WHERE id = ops_jobs.customer_id) as customer
FROM ops_jobs
WHERE job_number LIKE 'JOB-2025-00%'
ORDER BY job_number;
