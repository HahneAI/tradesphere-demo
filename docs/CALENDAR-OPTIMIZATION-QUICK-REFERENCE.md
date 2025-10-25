# Calendar Optimization - Quick Reference Guide

**Date:** 2025-10-24
**For:** ScheduleTab Development Team
**Duration:** 5-minute read

---

## Critical Summary

### Three Tables Drive the Calendar
1. **ops_crews** (14 cols) - Crew rows in calendar
2. **ops_job_assignments** (19 cols) - Job blocks, dates, crew links
3. **ops_jobs** (35 cols) - Job details, customer, status

### Key Fields for Calendar
| Table | Field | Purpose |
|-------|-------|---------|
| ops_crews | crew_name, color_code | Crew row display |
| ops_crews | max_capacity | Utilization % calculation |
| ops_job_assignments | scheduled_start, scheduled_end | Job block position |
| ops_job_assignments | estimated_hours | Crew utilization calc |
| ops_job_assignments | status | Job block color |
| ops_job_assignments | completion_percentage | Progress bar |
| ops_jobs | job_number, title | Job block text |
| ops_jobs | priority | Priority indicator |
| ops_job_services | calculation_data.tier1Results | **SOURCE: estimated_hours** |

### Critical Data Flow
```
Pricing Engine (total_man_hours)
    ↓
ops_job_services.calculation_data.tier1Results.totalManHours
    ↓
ops_job_assignments.estimated_hours = totalManHours
```

---

## Performance Problems & Solutions

### Problem 1: Calendar Takes 1-2 Seconds to Load

**Root Cause:** Missing indexes + N+1 queries

**Fix (Priority Order):**
1. **Add 8 indexes** (1 hour, 3-4x improvement)
   - See: CALENDAR-QUERY-IMPLEMENTATIONS.md, Section 1.1

2. **Implement React Query caching** (2 hours, 75-80% reduction in DB load)
   - Stale time: 2-5 minutes for calendar data
   - Cache invalidation: Realtime subscriptions

3. **Prevent N+1 queries** (1 hour, 10-40x improvement)
   - Always use eager loading: `.select('*, job:ops_jobs(...), crew:ops_crews(...)')`
   - Never fetch jobs separately from assignments

**Expected After Fix:**
- First load: 200-400ms (was 1-2s)
- Subsequent loads: 50-100ms (was 1-2s)
- 5-10x faster experience

---

### Problem 2: Drag-Drop Takes 500-1000ms

**Root Cause:** Conflict checks are sequential

**Fix:**
1. **Use optimistic updates** (instant feedback)
   ```typescript
   // Update UI immediately
   queryClient.setQueryData(['calendarWeek'], (old) => [...old, newAssignment]);
   // Verify in background
   ```

2. **Use database function** (atomic operation)
   ```sql
   SELECT assign_job_to_crew(job_id, crew_id, start, end, hours, user_id, company_id);
   ```

3. **Implement server-side transaction** (prevents race conditions)

**Expected After Fix:**
- User sees assignment instantly (optimistic)
- Actual creation: 30-50ms (was 500-1000ms)
- No race conditions from concurrent users

---

### Problem 3: Concurrent Users Cause Conflicts

**Root Cause:** No transaction safety

**Fix:**
- Use database function `assign_job_to_crew()` which includes:
  - Conflict check
  - Assignment creation
  - Job status update
  - All in single atomic transaction

**Result:** Multiple users can schedule simultaneously without conflicts

---

## Queries to Use (Copy-Paste Ready)

### Query 1: Fetch Crews with Utilization

```typescript
// Use database function (fastest, most optimized)
const { data: crews } = await supabase
  .rpc('get_crew_utilization', { p_company_id: companyId });

// Or direct query with proper relationships
const { data } = await supabase
  .from('ops_crews')
  .select(`
    id, crew_name, color_code, max_capacity,
    assignments:ops_job_assignments(
      id, estimated_hours, status
    )
  `)
  .eq('company_id', companyId)
  .eq('is_active', true);
```

### Query 2: Fetch Calendar Week

```typescript
// Single query with ALL relationships (no N+1!)
const { data: assignments } = await supabase
  .from('ops_job_assignments')
  .select(`
    id, job_id, crew_id, scheduled_start, scheduled_end,
    status, completion_percentage, estimated_hours,
    job:ops_jobs(
      id, job_number, title, priority, estimated_total,
      customer:crm_customers(customer_name)
    ),
    crew:ops_crews(id, crew_name, color_code)
  `)
  .eq('company_id', companyId)
  .gte('scheduled_end', weekStart)
  .lte('scheduled_start', weekEnd);
```

### Query 3: Detect Conflicts

```typescript
// Use database function (prevents race conditions)
const { data: conflicts } = await supabase
  .rpc('check_crew_conflicts', {
    p_crew_id: crewId,
    p_scheduled_start: startDate,
    p_scheduled_end: endDate
  });
```

### Query 4: Create Assignment

```typescript
// Use database function (atomic, safe)
const { data } = await supabase
  .rpc('assign_job_to_crew', {
    p_job_id: jobId,
    p_crew_id: crewId,
    p_scheduled_start: scheduledStart,
    p_scheduled_end: scheduledEnd,
    p_estimated_hours: estimatedHours,
    p_user_id: currentUserId,
    p_company_id: companyId
  });

if (data?.success) {
  // Assignment created successfully
}
```

---

## React Query Setup

### Cache Configuration

```typescript
// Hook for crews
const useCrews = (companyId: string) => {
  return useQuery({
    queryKey: ['crews', companyId],
    queryFn: () => fetchCrews(companyId),
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 15 * 60 * 1000      // 15 minutes
  });
};

// Hook for calendar week
const useCalendarWeek = (companyId: string, weekStart: Date) => {
  return useQuery({
    queryKey: ['calendarWeek', companyId, formatDate(weekStart)],
    queryFn: () => fetchWeekAssignments(companyId, weekStart),
    staleTime: 2 * 60 * 1000,   // 2 minutes
    gcTime: 10 * 60 * 1000      // 10 minutes
  });
};
```

### Realtime Invalidation

```typescript
// Setup once in component
useEffect(() => {
  const subscription = supabase
    .channel(`assignments-${companyId}`)
    .on('postgres_changes',
      {
        event: '*',
        table: 'ops_job_assignments',
        filter: `company_id=eq.${companyId}`
      },
      () => {
        // Invalidate calendar cache when assignments change
        queryClient.invalidateQueries({
          queryKey: ['calendarWeek', companyId]
        });
      }
    )
    .subscribe();

  return () => supabase.removeChannel(subscription);
}, [companyId]);
```

---

## Database Indexes (Must-Have)

Copy-paste into production database:

```sql
-- Run these 8 commands
CREATE INDEX IF NOT EXISTS idx_ops_crews_company_active_name
ON ops_crews(company_id, is_active, crew_name) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ops_job_assignments_crew_status
ON ops_job_assignments(crew_id, status, scheduled_start, scheduled_end)
WHERE status IN ('scheduled', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_ops_job_assignments_date_range
ON ops_job_assignments(scheduled_start, scheduled_end)
INCLUDE (job_id, crew_id, status, completion_percentage)
WHERE status IN ('scheduled', 'in_progress', 'completed');

CREATE INDEX IF NOT EXISTS idx_ops_jobs_company_status
ON ops_jobs(company_id, status)
INCLUDE (job_number, title, priority, estimated_total);

CREATE INDEX IF NOT EXISTS idx_ops_job_services_job_id
ON ops_job_services(job_id)
INCLUDE (calculation_data, total_price);

CREATE INDEX IF NOT EXISTS idx_crm_customers_company
ON crm_customers(company_id);

CREATE INDEX IF NOT EXISTS idx_ops_job_assignments_conflict
ON ops_job_assignments(crew_id, scheduled_start DESC, scheduled_end DESC)
WHERE status IN ('scheduled', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_ops_job_assignments_job_id
ON ops_job_assignments(job_id)
INCLUDE (crew_id, status);

-- Finalize
ANALYZE;
```

---

## Common Mistakes to Avoid

### MISTAKE 1: Fetching jobs separately from assignments
```typescript
// BAD - This causes N+1
const assignments = await fetch_assignments();
for (const a of assignments) {
  const job = await fetch_job(a.job_id); // N queries!
}

// GOOD - Single query with relationships
const assignments = await supabase
  .from('ops_job_assignments')
  .select('*, job:ops_jobs(id, title, ...)');
```

### MISTAKE 2: Not using database functions for multi-step operations
```typescript
// BAD - Race condition possible
const conflicts = await check_conflicts(...);
if (conflicts.length === 0) {
  await create_assignment(...);  // Another process could create conflict here!
}

// GOOD - Atomic operation
await supabase.rpc('assign_job_to_crew', {...});
```

### MISTAKE 3: Not caching calendar data
```typescript
// BAD - Refetches on every render
const assignments = await fetch_assignments();

// GOOD - Cached, refetches only when needed
const { data: assignments } = useQuery({
  queryKey: ['calendarWeek'],
  queryFn: fetch_assignments,
  staleTime: 2 * 60 * 1000
});
```

### MISTAKE 4: Separate queries for each crew
```typescript
// BAD - N queries
for (const crew of crews) {
  const utilization = await get_crew_utilization(crew.id);
}

// GOOD - Single query
await supabase.rpc('get_crew_utilization', {p_company_id});
```

---

## Performance Expectations

### With Optimization

| Operation | Time | Status |
|-----------|------|--------|
| Calendar initial load | 200-400ms | GOOD |
| Week navigation | 50-100ms | EXCELLENT |
| Conflict detection | 8-15ms | EXCELLENT |
| Drag-drop (perceived) | 0ms | INSTANT (optimistic) |
| Drag-drop (actual) | 30-50ms | GOOD |
| Crew utilization | 0-5ms | CACHED |

### Without Optimization

| Operation | Time | Status |
|-----------|------|--------|
| Calendar initial load | 1-2s | SLOW |
| Week navigation | 500-800ms | SLOW |
| Conflict detection | 40-80ms | SLOW |
| Drag-drop | 500-1000ms | VERY SLOW |
| Crew utilization | 100-200ms | SLOW |

---

## Implementation Timeline

### Day 1: Setup Indexes (1 hour)
1. Copy 8 index creation scripts
2. Run in production database
3. Verify with EXPLAIN ANALYZE
4. Commit to repository

### Day 2: Update Service Layer (2 hours)
1. Update ScheduleService to use database functions
2. Add React Query hooks
3. Setup realtime subscriptions
4. Test basic calendar loading

### Day 3: Component Integration (2 hours)
1. Update ScheduleTab component
2. Implement optimistic updates
3. Add conflict detection UI
4. End-to-end testing

### Day 4: Testing & Monitoring (2 hours)
1. Performance testing (should be 3-5x faster)
2. Setup query monitoring
3. Test with 10+ concurrent users
4. Deploy to production

**Total Time:** 7 hours, 3-4x performance improvement

---

## Monitoring (Post-Deployment)

### Check Query Performance

```sql
-- Run periodically to spot slow queries
SELECT
  query,
  calls,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query LIKE '%ops_job_assignments%'
  OR query LIKE '%ops_crews%'
ORDER BY mean_time DESC
LIMIT 10;

-- Alert if mean_time > 50ms for calendar queries
```

### Check Cache Hit Rate

```typescript
// Add to analytics
if (data?.isFromCache) {
  analytics.track('calendar_cache_hit');
} else {
  analytics.track('calendar_cache_miss');
}

// Should see 75-80% cache hit rate
```

### Monitor Index Usage

```sql
-- Check if indexes are being used
SELECT
  schemaname,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN ('ops_crews', 'ops_job_assignments', 'ops_jobs')
ORDER BY idx_scan DESC;

-- All indexes should have idx_scan > 0
-- If idx_scan = 0, index is unused, can be dropped
```

---

## Key Files Reference

| File | Purpose | Time |
|------|---------|------|
| DATABASE-OPTIMIZATION-SCHEDULE-CALENDAR.md | Complete analysis | 30 min read |
| CALENDAR-QUERY-IMPLEMENTATIONS.md | SQL + TypeScript code | 20 min read |
| PROFIT-PIPELINE-MASTER-FLOW.md | Table schemas & flows | Reference |
| SCHEDULING_CALENDAR_IMPLEMENTATION.md | UI implementation plan | Reference |

---

## Quick Decision Tree

**Is calendar slow?**
- Yes → Do you have indexes? → No → Add indexes (Day 1)
- Yes → Do you use React Query? → No → Add caching (Day 2)
- Yes → Do you use database functions? → No → Add functions (Day 2)

**Is drag-drop slow?**
- Yes → Add optimistic updates
- Still slow? → Use database function for atomic operation
- Still slow? → Profile with DevTools (likely network latency)

**Multiple users conflicts?**
- Yes → Use database function for atomic assignment
- No → Monitoring working correctly

---

**Remember:** The key to calendar performance is **indexes + caching + database functions**. Each component alone is 2-3x improvement; together they're 5-10x.

---

**Document Version:** 1.0
**Last Updated:** 2025-10-24
**Status:** Quick Reference - Ready to Use
