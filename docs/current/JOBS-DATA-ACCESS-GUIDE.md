# Jobs Data Access Guide - Technical Implementation

## Overview
This guide provides technical details for frontend developers to correctly query and display jobs data while working with RLS-protected tables.

---

## Database Structure Summary

### Primary Tables
1. **ops_jobs** - Core job records (4 test records)
2. **ops_job_services** - Services associated with jobs (8 test records)
3. **ops_job_notes** - Notes/comments on jobs (8 test records)
4. **ops_job_assignments** - Crew assignments (ready for future use)

### Key IDs for Testing
```
Company ID: 08f0827a-608f-485a-a19f-e0c55ecf6484
Test User ID: 50dfad12-a6bc-42cd-a77a-1679fb9619a1

Test Jobs:
- JOB-2025-001: Backyard Paver Patio (quote)
- JOB-2025-002: Front Walkway (scheduled)
- JOB-2025-003: Office Courtyard (in_progress)
- JOB-2025-004: Driveway Extension (completed)
```

---

## RLS Policy Architecture

### How RLS Works
```
User requests job data
    ↓
Supabase checks auth.uid()
    ↓
RLS policy evaluates: company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    ↓
Only matching records returned (or error if no match)
```

### Critical Requirements
1. **User must be authenticated** - RLS requires valid auth.uid()
2. **User must have company_id** - User record must exist in users table with correct company
3. **Job must match company_id** - Job's company_id must match user's company_id

---

## Code Examples

### 1. Load Jobs List (with Related Data)

#### React Hook Pattern
```typescript
import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';

export function useJobs() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session?.user?.id) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    const fetchJobs = async () => {
      try {
        setLoading(true);
        const { data, error: queryError } = await supabase
          .from('ops_jobs')
          .select(`
            id,
            job_number,
            title,
            status,
            description,
            company_id,
            customer_id,
            estimated_total,
            actual_total,
            priority,
            requested_start_date,
            scheduled_start_date,
            actual_start_date,
            actual_end_date,
            created_at,
            updated_at,
            ops_job_services(
              id,
              service_name,
              service_description,
              quantity,
              unit_price,
              total_price,
              is_completed
            ),
            ops_job_notes(
              id,
              subject,
              content,
              note_type,
              is_internal,
              is_pinned,
              created_at
            )
          `)
          .order('created_at', { ascending: false });

        if (queryError) {
          console.error('RLS Error:', queryError);
          setError(`Failed to load jobs: ${queryError.message}`);
          return;
        }

        setJobs(data || []);
      } catch (err) {
        setError(`Unexpected error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [session?.user?.id, supabase]);

  return { jobs, loading, error };
}
```

#### Usage in Component
```typescript
function JobsList() {
  const { jobs, loading, error } = useJobs();

  if (loading) return <div>Loading jobs...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {jobs.map(job => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}

function JobCard({ job }) {
  return (
    <div className="job-card">
      <h3>{job.job_number}: {job.title}</h3>
      <p>Status: {job.status}</p>
      <p>Services: {job.ops_job_services?.length || 0}</p>
      <p>Notes: {job.ops_job_notes?.length || 0}</p>
      <p>Estimated: ${job.estimated_total}</p>
    </div>
  );
}
```

### 2. Load Single Job with Full Details

```typescript
async function getJobWithDetails(jobId) {
  const supabase = useSupabaseClient();

  const { data, error } = await supabase
    .from('ops_jobs')
    .select(`
      *,
      ops_job_services(
        *,
        ops_service_configs(
          id,
          service_name,
          category
        )
      ),
      ops_job_notes(
        *,
        created_by:users(id, user_name)
      )
    `)
    .eq('id', jobId)
    .single();

  if (error) {
    console.error('Error loading job:', error);
    return null;
  }

  return data;
}
```

### 3. Create New Job

```typescript
async function createJob(jobData) {
  const supabase = useSupabaseClient();
  const session = useSession();

  // Verify user is authenticated
  if (!session?.user?.id) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('ops_jobs')
    .insert([
      {
        job_number: jobData.jobNumber,
        title: jobData.title,
        description: jobData.description,
        customer_id: jobData.customerId,
        company_id: jobData.companyId, // CRITICAL: Must match user's company
        status: 'quote',
        service_address: jobData.serviceAddress,
        service_city: jobData.serviceCity,
        service_state: jobData.serviceState,
        service_zip: jobData.serviceZip,
        estimated_total: jobData.estimatedTotal,
        created_by_user_id: session.user.id,
        tags: jobData.tags || [],
        priority: jobData.priority || 0,
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating job:', error);
    throw error;
  }

  return data;
}
```

### 4. Add Service to Job

```typescript
async function addServiceToJob(jobId, serviceData) {
  const supabase = useSupabaseClient();
  const session = useSession();

  const { data, error } = await supabase
    .from('ops_job_services')
    .insert([
      {
        job_id: jobId,
        service_config_id: serviceData.serviceConfigId,
        service_name: serviceData.serviceName,
        service_description: serviceData.description,
        quantity: serviceData.quantity,
        unit_price: serviceData.unitPrice,
        total_price: serviceData.quantity * serviceData.unitPrice,
        calculation_data: serviceData.calculationData || {},
        pricing_variables: serviceData.pricingVariables || {},
        added_by_user_id: session.user.id,
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error adding service:', error);
    throw error;
  }

  return data;
}
```

### 5. Add Note to Job

```typescript
async function addNoteToJob(jobId, noteData) {
  const supabase = useSupabaseClient();
  const session = useSession();

  const { data, error } = await supabase
    .from('ops_job_notes')
    .insert([
      {
        job_id: jobId,
        subject: noteData.subject,
        content: noteData.content,
        note_type: noteData.noteType || 'general',
        is_internal: noteData.isInternal || false,
        is_pinned: noteData.isPinned || false,
        created_by_user_id: session.user.id,
        attachments: noteData.attachments || [],
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error adding note:', error);
    throw error;
  }

  return data;
}
```

### 6. Update Job Status

```typescript
async function updateJobStatus(jobId, newStatus) {
  const supabase = useSupabaseClient();
  const session = useSession();

  const { data, error } = await supabase
    .from('ops_jobs')
    .update({
      status: newStatus,
      updated_by_user_id: session.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .select()
    .single();

  if (error) {
    console.error('Error updating job:', error);
    throw error;
  }

  return data;
}
```

### 7. Filter Jobs by Status

```typescript
async function getJobsByStatus(status) {
  const supabase = useSupabaseClient();

  const { data, error } = await supabase
    .from('ops_jobs')
    .select(`
      *,
      ops_job_services(id, service_name),
      ops_job_notes(id)
    `)
    .eq('status', status)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching jobs by status:', error);
    return [];
  }

  return data || [];
}
```

### 8. Search Jobs

```typescript
async function searchJobs(searchTerm) {
  const supabase = useSupabaseClient();

  const { data, error } = await supabase
    .from('ops_jobs')
    .select(`
      *,
      ops_job_services(id),
      ops_job_notes(id)
    `)
    .or(
      `job_number.ilike.%${searchTerm}%,` +
      `title.ilike.%${searchTerm}%,` +
      `description.ilike.%${searchTerm}%`
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error searching jobs:', error);
    return [];
  }

  return data || [];
}
```

---

## Troubleshooting RLS Issues

### Issue: "Permission denied" Error

**Root Cause:** User's company_id doesn't match job's company_id

**Diagnosis:**
```javascript
// Check authenticated user
const session = await supabase.auth.getSession();
console.log('User ID:', session.user.id);

// Check user's company in database
const { data: user } = await supabase
  .from('users')
  .select('company_id')
  .eq('id', session.user.id)
  .single();

console.log('User Company ID:', user?.company_id);
// Should be: 08f0827a-608f-485a-a19f-e0c55ecf6484
```

**Solution:**
```sql
-- Update user's company if incorrect
UPDATE users
SET company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'
WHERE id = 'USER_ID';
```

### Issue: Jobs List is Empty

**Root Cause:** User not authenticated or no jobs for their company

**Diagnosis:**
```javascript
// Check authentication status
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  console.error('User not authenticated');
  // Redirect to login
}

// Check if jobs exist for company
const { count } = await supabase
  .from('ops_jobs')
  .select('*', { count: 'exact' })
  .eq('company_id', '08f0827a-608f-485a-a19f-e0c55ecf6484');

console.log('Total jobs:', count);
```

### Issue: Services/Notes Not Loading

**Root Cause:** Missing data in relationships or RLS on joined tables

**Diagnosis:**
```javascript
// Load jobs first
const { data: jobs } = await supabase
  .from('ops_jobs')
  .select('id, job_number')
  .limit(1);

// Try separate query for services
if (jobs.length > 0) {
  const { data: services, error } = await supabase
    .from('ops_job_services')
    .select('*')
    .eq('job_id', jobs[0].id);

  console.log('Services error:', error);
  console.log('Services count:', services?.length);
}
```

---

## Performance Tips

### 1. Selective Field Loading
```typescript
// BAD - loads all columns
const { data } = await supabase
  .from('ops_jobs')
  .select('*');

// GOOD - loads only needed columns
const { data } = await supabase
  .from('ops_jobs')
  .select('id, job_number, title, status, priority, created_at');
```

### 2. Pagination
```typescript
const PAGE_SIZE = 10;

async function getJobsPage(pageNumber) {
  const startIndex = (pageNumber - 1) * PAGE_SIZE;

  const { data } = await supabase
    .from('ops_jobs')
    .select('*')
    .range(startIndex, startIndex + PAGE_SIZE - 1)
    .order('created_at', { ascending: false });

  return data;
}
```

### 3. Real-time Subscriptions
```typescript
function useJobsRealtime() {
  const supabase = useSupabaseClient();
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    // Initial load
    const loadJobs = async () => {
      const { data } = await supabase
        .from('ops_jobs')
        .select('*');
      setJobs(data);
    };

    loadJobs();

    // Subscribe to changes
    const subscription = supabase
      .channel('ops_jobs_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ops_jobs' },
        (payload) => {
          // Handle insertions, updates, deletions
          console.log('Job changed:', payload);
          // Update local state
          loadJobs();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return jobs;
}
```

---

## Testing Your Implementation

### 1. Test Authentication
```javascript
// Verify user is logged in
const { data: { user } } = await supabase.auth.getUser();
console.assert(user !== null, 'User must be logged in');
```

### 2. Test Data Access
```javascript
// Should return 4 jobs
const { data } = await supabase
  .from('ops_jobs')
  .select('id')
  .eq('company_id', '08f0827a-608f-485a-a19f-e0c55ecf6484');

console.assert(data.length === 4, `Expected 4 jobs, got ${data.length}`);
```

### 3. Test Relationships
```javascript
// Load job with all relationships
const { data: job } = await supabase
  .from('ops_jobs')
  .select(`
    id,
    job_number,
    ops_job_services(id),
    ops_job_notes(id)
  `)
  .eq('job_number', 'JOB-2025-001')
  .single();

console.assert(job.ops_job_services.length === 2, 'Should have 2 services');
console.assert(job.ops_job_notes.length === 1, 'Should have 1 note');
```

### 4. Test RLS Filtering
```javascript
// Create test user with different company
// Verify they cannot see these jobs
const { data, error } = await supabase
  .from('ops_jobs')
  .select('id');

if (error?.code === 'PGRST100') {
  console.log('RLS correctly blocked access');
}
```

---

## Common Gotchas

1. **Forgetting to Check Authentication**
   - Always verify session before loading data
   - RLS silently returns empty if user not authenticated

2. **Hard-coding Company ID**
   - Company ID should come from user context, not hard-coded
   - Use: `supabase.auth.getUser()` then lookup company from users table

3. **Not Handling Null Values**
   - Service dates might be null for quotes
   - Use optional chaining: `job?.scheduled_start_date`

4. **Missing Error Handling**
   - Always catch RLS permission errors
   - Log errors for debugging

5. **Loading Related Data Inefficiently**
   - Use single query with joins instead of N+1 queries
   - Limit nested data with select clauses

---

## Database Connection Info

```
Provider: Supabase (PostgreSQL)
Project: Tradesphere
Tables: public.ops_*
Authentication: JWT via Supabase Auth
RLS: Enabled on all tables
```

---

## Support References

- Supabase Docs: https://supabase.com/docs
- Row Level Security: https://supabase.com/docs/guides/auth/row-level-security
- JavaScript Client: https://supabase.com/docs/reference/javascript
- RLS Best Practices: https://supabase.com/docs/guides/auth/row-level-security/policy-examples
