# Test Job Records Migration

## Overview
This migration creates 4 realistic job records connected to your 3 existing customers for testing the Jobs UI.

## Migration File
**File:** `24-ADD-TEST-JOB-RECORDS-SIMPLE.sql` ✅ **USE THIS ONE**

**Note:** This is the Supabase-compatible version using DO blocks instead of psql variables.

## What Gets Created

### 4 Jobs with Different Statuses

1. **JOB-2025-001** - Sarah Johnson (QUOTE)
   - **Title:** Backyard Paver Patio Installation
   - **Value:** $38,650
   - **Status:** Quote (awaiting approval)
   - **Priority:** Normal (5)
   - **Description:** 360 sq ft patio with fire pit area
   - **Services:** 2 (Paver installation + Excavation)
   - **Notes:** 1 (Initial discussion)

2. **JOB-2025-002** - Sarah Johnson (SCHEDULED)
   - **Title:** Front Walkway Paver Installation
   - **Value:** $12,450
   - **Status:** Scheduled (approved and scheduled for Jan 27-28)
   - **Priority:** High (8)
   - **Description:** Replace concrete walkway with pavers
   - **Services:** 2 (Walkway + Concrete removal)
   - **Notes:** 2 (Approval + Scheduling)

3. **JOB-2025-003** - Michael Chen (IN PROGRESS)
   - **Title:** Office Building Courtyard Patio
   - **Value:** $89,750
   - **Status:** In Progress (currently being worked on)
   - **Priority:** Urgent (10)
   - **Description:** Commercial 850 sq ft high-traffic patio
   - **Services:** 2 (Commercial pavers + Site prep)
   - **Notes:** 2 (Kickoff + Progress update)

4. **JOB-2025-004** - Emily Rodriguez (COMPLETED)
   - **Title:** Driveway Extension with Pavers
   - **Value:** $16,250 (actual) / $16,800 (estimated)
   - **Status:** Completed
   - **Priority:** Normal (5)
   - **Description:** 200 sq ft driveway extension
   - **Services:** 2 (Driveway pavers + Base prep - both marked complete)
   - **Notes:** 3 (Sourcing + Completion + Customer feedback)

### Customer Distribution
- **Sarah Johnson:** 2 jobs (1 quote, 1 scheduled)
- **Michael Chen:** 1 job (in progress)
- **Emily Rodriguez:** 1 job (completed)

### Data Created Per Job
Each job includes:
- ✅ Job record in `ops_jobs` table
- ✅ 2 service line items in `ops_job_services` table
- ✅ 1-3 notes in `ops_job_notes` table
- ✅ Realistic pricing and descriptions
- ✅ Various statuses, priorities, and dates
- ✅ Tags for categorization

## How to Run This Migration

### Option 1: Supabase SQL Editor (Recommended)
1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `24-ADD-TEST-JOB-RECORDS-SIMPLE.sql`
5. Click **Run** (or press Ctrl/Cmd + Enter)
6. You should see 4 "NOTICE" messages confirming each job was created
7. Scroll down to see the verification query results showing all 4 jobs

### Option 2: psql Command Line
```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run the migration file
\i database/migrations/24-ADD-TEST-JOB-RECORDS.sql
```

### Option 3: Using Supabase CLI
```bash
supabase db push
```

## Verification

After running the migration, verify the data was created:

### Check Jobs
```sql
SELECT
  job_number,
  title,
  status,
  estimated_total,
  priority
FROM ops_jobs
ORDER BY job_number;
```

**Expected Result:** 4 jobs (JOB-2025-001 through JOB-2025-004)

### Check Jobs with Customers
```sql
SELECT
  j.job_number,
  c.customer_name,
  j.status,
  j.estimated_total
FROM ops_jobs j
JOIN crm_customers c ON j.customer_id = c.id
ORDER BY j.job_number;
```

**Expected Result:** Jobs linked to Sarah Johnson (2), Michael Chen (1), Emily Rodriguez (1)

### Check Services Per Job
```sql
SELECT
  j.job_number,
  j.title,
  COUNT(s.id) as service_count,
  SUM(s.total_price) as services_total
FROM ops_jobs j
LEFT JOIN ops_job_services s ON j.id = s.job_id
GROUP BY j.job_number, j.title
ORDER BY j.job_number;
```

**Expected Result:** Each job should have 2 services

### Check Notes Per Job
```sql
SELECT
  j.job_number,
  j.title,
  COUNT(n.id) as note_count
FROM ops_jobs j
LEFT JOIN ops_job_notes n ON j.id = n.job_id
GROUP BY j.job_number, j.title
ORDER BY j.job_number;
```

**Expected Result:**
- JOB-2025-001: 1 note
- JOB-2025-002: 2 notes
- JOB-2025-003: 2 notes
- JOB-2025-004: 3 notes

## What You'll See in the Jobs UI

### Kanban View
- **Quote Column:** 1 job (Sarah's backyard patio)
- **Scheduled Column:** 1 job (Sarah's front walkway)
- **In Progress Column:** 1 job (Michael's commercial patio)
- **Completed Column:** 1 job (Emily's driveway)

### List/Table View
- All 4 jobs sortable by any column
- Different priority indicators (normal, high, urgent)
- Status badges with appropriate colors

### Calendar View
- Jobs with scheduled dates will appear (when calendar is fully implemented)
- Currently just shows job counts and totals

## Important Notes

### Crews Not Assigned
Since the Crews feature isn't fully implemented yet, these jobs do NOT have crew assignments. You'll see:
- No crew avatars on job cards
- No entries in `ops_job_assignments` table
- Calendar view won't show crew rows yet

**This is expected!** Once you implement the Crews feature, you can:
1. Create crew records in `ops_crews` table
2. Assign jobs to crews via the UI
3. Create entries in `ops_job_assignments` table

### Realistic Data
All data is based on realistic landscaping/hardscaping scenarios:
- Accurate service pricing (based on your existing pricing configs)
- Real-world project descriptions
- Typical timeline progressions
- Common customer communication notes

### Test Scenarios Covered
✅ Quote stage (awaiting customer approval)
✅ Scheduled job (approved, dates set)
✅ Active job (work in progress)
✅ Completed job (finished, customer happy)
✅ Multiple jobs for same customer
✅ Different priority levels
✅ Various price ranges ($12k - $90k)
✅ Residential and commercial projects

## Rollback (If Needed)

If you need to remove the test data:

```sql
-- Delete in reverse order (foreign key constraints)
DELETE FROM ops_job_notes
WHERE job_id IN (
  SELECT id FROM ops_jobs
  WHERE job_number LIKE 'JOB-2025-00%'
);

DELETE FROM ops_job_services
WHERE job_id IN (
  SELECT id FROM ops_jobs
  WHERE job_number LIKE 'JOB-2025-00%'
);

DELETE FROM ops_jobs
WHERE job_number LIKE 'JOB-2025-00%';
```

## Next Steps

After running this migration:

1. **Test the Jobs UI:**
   - Open the Jobs page
   - Switch between Kanban, List, and Calendar views
   - Try dragging jobs between Kanban columns
   - Search for customers and job numbers
   - Sort the table by different columns

2. **Create More Jobs:**
   - Use the "+ Create Job" button (when wizard is implemented)
   - Or duplicate this migration pattern for more test data

3. **Add Crews:**
   - When Crews feature is ready, create crew records
   - Assign these jobs to crews
   - Test the Calendar view with assignments

4. **Test Job Detail Modal:**
   - Click on job cards to view details (when implemented)
   - Add more notes
   - Edit services
   - View activity timeline

## Support

If you encounter any errors:
1. Check that you're connected to the correct database
2. Verify your company_id matches (08f0827a-608f-485a-a19f-e0c55ecf6484)
3. Ensure customer records exist (3 customers)
4. Check that service configs exist (paver_patio_sqft, excavation_removal)
5. Verify RLS policies allow these operations

---

**Ready to test!** Run the migration and enjoy your populated Jobs UI! 🎉
