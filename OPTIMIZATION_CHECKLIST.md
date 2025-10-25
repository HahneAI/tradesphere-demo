# Job Creation Wizard: Database Optimization Checklist

**Project:** Tradosphere Pricing Tool CRM
**Component:** 5-Step Job Creation Wizard
**Database:** PostgreSQL 15+ (Supabase)
**Status:** Ready for Implementation

---

## Pre-Implementation Review

- [ ] Read `docs/OPTIMIZATION_SUMMARY.md` (5 min)
- [ ] Review `docs/DATABASE_OPTIMIZATION.md` for detailed analysis (15 min)
- [ ] Understand migration file: `migrations/002_database_optimization_indexes.sql` (10 min)
- [ ] Review optimized query service: `src/services/OptimizedJobQueries.ts` (15 min)
- [ ] Total prep time: ~45 minutes

---

## Phase 1: Database Migration (1 hour)

### Step 1.1: Backup Current Database
- [ ] Create snapshot in Supabase dashboard (Settings > Backups)
- [ ] Wait for backup to complete
- [ ] Note backup ID for rollback reference
- [ ] Estimate: 5 minutes

### Step 1.2: Run Migration Script
- [ ] Open Supabase SQL Editor
- [ ] Copy full contents of `migrations/002_database_optimization_indexes.sql`
- [ ] Paste into new query
- [ ] Click "RUN"
- [ ] Wait for completion (should be < 30 seconds)
- [ ] Estimate: 5 minutes

### Step 1.3: Verify Migration
- [ ] Check job_number_counters table exists:
  ```sql
  SELECT * FROM job_number_counters LIMIT 1;
  ```
- [ ] Check functions created:
  ```sql
  SELECT proname FROM pg_proc
  WHERE proname IN ('generate_job_number_safe', 'create_job_with_services');
  ```
- [ ] Check indexes exist:
  ```sql
  SELECT COUNT(*) FROM pg_indexes
  WHERE indexname LIKE '%_trgm' OR indexname LIKE '%_brin';
  ```
- [ ] Test job number generation:
  ```sql
  SELECT generate_job_number_safe('00000000-0000-0000-0000-000000000001'::uuid);
  -- Should return: JOB-2025-0001 (or similar)
  ```
- [ ] Estimate: 10 minutes

### Step 1.4: Initialize Data
- [ ] Populate job_number_counters for existing companies:
  ```sql
  INSERT INTO job_number_counters (company_id, year, next_number)
  SELECT DISTINCT company_id, EXTRACT(YEAR FROM NOW())::integer, 1
  FROM ops_jobs
  ON CONFLICT (company_id) DO NOTHING;
  ```
- [ ] Verify records created:
  ```sql
  SELECT COUNT(*) FROM job_number_counters;
  ```
- [ ] Estimate: 5 minutes

**Phase 1 Total: ~45 minutes**

---

## Phase 2: Application Code Updates (2 hours)

### Step 2.1: Create/Update OptimizedJobQueries Service

- [ ] Copy provided `src/services/OptimizedJobQueries.ts` to your project
  - Location: `/src/services/OptimizedJobQueries.ts`
  - Status: **Ready to use, no modifications needed**
  - Contains: All optimized query hooks and functions
  - Estimate: 5 minutes

### Step 2.2: Update Customer Selection Component

**File:** `src/components/jobs/wizard/CustomerSelectionStep.tsx`

- [ ] Import optimized hooks:
  ```typescript
  import {
    useOptimizedCustomerSearch,
    useRecentCustomers
  } from '../../../services/OptimizedJobQueries';
  ```

- [ ] Replace `loadRecentCustomers` function:
  ```typescript
  // OLD: Sequential fetch with SELECT *
  // NEW: Uses useRecentCustomers hook with 5-minute cache
  const { data: recentCustomers, isLoading } = useRecentCustomers(companyId);
  ```

- [ ] Replace `searchCustomers` function:
  ```typescript
  // OLD: Supabase query with SELECT *
  // NEW: Uses useOptimizedCustomerSearch hook
  const { data: searchResults } = useOptimizedCustomerSearch(companyId, searchQuery);
  ```

- [ ] Update displayed customers:
  ```typescript
  const displayCustomers = searchQuery.trim() ? searchResults : recentCustomers;
  ```

- [ ] Test: Search for customer by name, email, phone
- [ ] Estimate: 20 minutes

### Step 2.3: Update Service Selection Component

**File:** `src/components/jobs/wizard/ServiceSelectionStep.tsx`

- [ ] Import service config hook:
  ```typescript
  import { useServiceConfigs } from '../../../services/OptimizedJobQueries';
  ```

- [ ] Replace service loading:
  ```typescript
  // OLD: Direct Supabase query
  // NEW: React Query hook with 24-hour cache
  const { data: services, isLoading, error } = useServiceConfigs(companyId);
  ```

- [ ] Verify service cards render correctly
- [ ] Test: Load step multiple times (should use cache)
- [ ] Estimate: 15 minutes

### Step 2.4: Update Crew Assignment Component

**File:** `src/components/jobs/wizard/CrewAssignmentStep.tsx`

- [ ] Import crew hooks:
  ```typescript
  import {
    useCrewsList,
    useScheduleConflictCheck
  } from '../../../services/OptimizedJobQueries';
  ```

- [ ] Replace crew loading:
  ```typescript
  // OLD: Direct Supabase query
  // NEW: React Query hook with 30-minute cache
  const { data: crews, isLoading } = useCrewsList(companyId);
  ```

- [ ] Add schedule conflict detection:
  ```typescript
  const { data: conflicts } = useScheduleConflictCheck(
    selectedCrewId,
    scheduledStart,
    scheduledEnd
  );
  ```

- [ ] Display conflict warnings if any:
  ```typescript
  {conflicts && conflicts.length > 0 && (
    <ConflictWarning conflicts={conflicts} />
  )}
  ```

- [ ] Test: Select crew, check for conflict warnings
- [ ] Estimate: 20 minutes

### Step 2.5: Update Job Service

**File:** `src/services/JobServiceExtensions.ts` (or your main JobService)

- [ ] Update imports:
  ```typescript
  import {
    createJobWithServices,
    validateWizardInput
  } from './OptimizedJobQueries';
  ```

- [ ] Replace `generateJobNumber()`:
  ```typescript
  // OLD: 50-100ms string search
  // NEW: <5ms atomic function
  async generateJobNumber(companyId: string): Promise<string> {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('generate_job_number_safe', {
      p_company_id: companyId
    });
    if (error) throw error;
    return data;
  }
  ```

- [ ] Replace `createJobFromWizard()`:
  ```typescript
  // OLD: 4-5 sequential database calls
  // NEW: Single atomic RPC call
  async createJobFromWizard(input: WizardJobInput) {
    try {
      const result = await createJobWithServices(input);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  ```

- [ ] Add validation helper:
  ```typescript
  // Validate before submission
  const validation = await validateWizardInput(wizardInput);
  if (!validation.valid) {
    // Handle errors
  }
  ```

- [ ] Test: Create multiple jobs, verify no duplicates
- [ ] Estimate: 30 minutes

### Step 2.6: Setup React Query Provider

**File:** `src/components/jobs/wizard/JobWizard.tsx` or your root app

- [ ] Install React Query (if not already):
  ```bash
  npm install @tanstack/react-query
  ```

- [ ] Create QueryClient:
  ```typescript
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,  // 5 minutes
        gcTime: 30 * 60 * 1000,    // 30 minutes garbage collect
        retry: 1,
        refetchOnWindowFocus: false
      }
    }
  });
  ```

- [ ] Wrap component with provider:
  ```typescript
  <QueryClientProvider client={queryClient}>
    <JobWizard {...props} />
  </QueryClientProvider>
  ```

- [ ] Estimate: 10 minutes

### Step 2.7: Setup Realtime Subscriptions (Optional)

**File:** `src/components/jobs/wizard/JobWizard.tsx`

- [ ] Import setup function:
  ```typescript
  import { setupWizardRealtimeSubscriptions } from '../../../services/OptimizedJobQueries';
  ```

- [ ] Setup subscriptions in useEffect:
  ```typescript
  useEffect(() => {
    const cleanup = setupWizardRealtimeSubscriptions(companyId, queryClient);
    return cleanup; // Cleanup on unmount
  }, [companyId, queryClient]);
  ```

- [ ] Test: Update service config in database, verify cache invalidates
- [ ] Estimate: 15 minutes

**Phase 2 Total: ~2 hours**

---

## Phase 3: Testing & Validation (1 hour)

### Step 3.1: Unit Tests

- [ ] Test customer search:
  ```typescript
  const { data } = await useOptimizedCustomerSearch('company-id', 'test');
  expect(data).toBeDefined();
  expect(data?.length).toBeLessThanOrEqual(20);
  ```

- [ ] Test service configs:
  ```typescript
  const { data } = await useServiceConfigs('company-id');
  expect(data?.every(s => s.is_active)).toBe(true);
  ```

- [ ] Test crew list:
  ```typescript
  const { data } = await useCrewsList('company-id');
  expect(data?.every(c => c.id)).toBe(true);
  ```

- [ ] Test job number generation:
  ```typescript
  const num1 = await generateJobNumber('company-id');
  const num2 = await generateJobNumber('company-id');
  expect(num1).not.toBe(num2);
  expect(num1).toMatch(/JOB-\d{4}-\d{4}/);
  ```

- [ ] Estimate: 20 minutes

### Step 3.2: Integration Tests

- [ ] Test complete wizard flow:
  - [ ] Select customer
  - [ ] Select services (verify pricing configs loaded)
  - [ ] Set schedule
  - [ ] Select crew (verify conflicts checked)
  - [ ] Review and create job
  - [ ] Verify job created successfully
  - Estimate: 20 minutes

- [ ] Test concurrent job creation:
  ```bash
  # Simulate 10 concurrent wizard completions
  for i in {1..10}; do
    # Call create job API in parallel
  done

  # Verify:
  # - All 10 jobs created
  # - All have unique job numbers
  # - No conflicts detected on same crew
  ```
  - Estimate: 10 minutes

### Step 3.3: Performance Validation

- [ ] Measure customer search speed:
  - [ ] First load: Should be ~20-50ms
  - [ ] Cached loads: Should be <5ms
  - Estimate: 5 minutes

- [ ] Measure job creation speed:
  - [ ] Single job: Should be <50ms
  - [ ] Multiple concurrent: Should average <50ms each
  - Estimate: 5 minutes

- [ ] Measure service config load:
  - [ ] First load: ~10-20ms
  - [ ] Cached: <1ms
  - Estimate: 5 minutes

**Phase 3 Total: ~1 hour**

---

## Phase 4: Deployment (30 minutes)

### Step 4.1: Code Review
- [ ] Have team member review code changes
- [ ] Verify no breaking changes
- [ ] Check error handling
- [ ] Estimate: 15 minutes

### Step 4.2: Deploy to Staging
- [ ] Deploy to staging environment
- [ ] Run full test suite
- [ ] Perform manual testing
- [ ] Monitor for errors (5 min)
- [ ] Estimate: 10 minutes

### Step 4.3: Deploy to Production
- [ ] Schedule deployment during low-traffic window
- [ ] Deploy to production
- [ ] Monitor metrics (response times, errors)
- [ ] Have rollback plan ready
- [ ] Estimate: 5 minutes

**Phase 4 Total: ~30 minutes**

---

## Post-Implementation Verification

### Week 1: Monitoring
- [ ] Track query response times (should improve)
- [ ] Verify no duplicate job numbers
- [ ] Check cache hit rates (should be high)
- [ ] Monitor error logs (should be clean)
- [ ] Gather user feedback

### Week 2: Optimization
- [ ] Review performance metrics
- [ ] Adjust cache TTLs if needed
- [ ] Fine-tune queries if needed
- [ ] Document any learnings

### Ongoing: Maintenance
- [ ] Monitor slow query log (pg_stat_statements)
- [ ] Refresh materialized view monthly
- [ ] Check index bloat quarterly
- [ ] Plan for scale (watch job number sequence)

---

## Rollback Plan (If Needed)

### Quick Rollback
If experiencing issues, revert application code:
```bash
git revert <commit-hash>
git push
```

### Database Rollback
If migration caused issues:
```sql
-- Restore from backup in Supabase dashboard
-- Or manually drop new objects:
DROP FUNCTION IF EXISTS create_job_with_services CASCADE;
DROP FUNCTION IF EXISTS generate_job_number_safe CASCADE;
DROP TABLE IF EXISTS job_number_counters CASCADE;
```

---

## Success Criteria Checklist

After implementation, verify:

### Performance
- [ ] Job creation completes in <50ms
- [ ] Customer search returns in <10ms (with cache)
- [ ] All wizard steps load instantly (cached data)
- [ ] Load test passes (100+ concurrent)

### Reliability
- [ ] Zero duplicate job numbers generated
- [ ] Zero job creation failures
- [ ] Schedule conflicts detected accurately
- [ ] All realtime updates working

### Scalability
- [ ] Performance maintained with 10K+ customers
- [ ] Performance maintained with 50K+ jobs
- [ ] No issues with concurrent wizard sessions

### User Experience
- [ ] Instant search results (cached)
- [ ] Smooth wizard progression
- [ ] No loading spinners on repeated steps
- [ ] Conflict alerts in real-time

---

## Support & Resources

### Documentation Files
1. **OPTIMIZATION_SUMMARY.md** - Executive overview
2. **DATABASE_OPTIMIZATION.md** - Detailed technical analysis
3. **OPTIMIZATION_IMPLEMENTATION_GUIDE.md** - Step-by-step guide
4. **OptimizedJobQueries.ts** - Ready-to-use query service

### Key Contacts
- [ ] Database Admin: [Name]
- [ ] DevOps/Deployment: [Name]
- [ ] Team Lead: [Name]

### Troubleshooting
- See "Troubleshooting" section in OPTIMIZATION_IMPLEMENTATION_GUIDE.md
- Check pg_stat_statements for slow queries
- Review application logs for errors
- Test with simpler data first

---

## Timeline Summary

| Phase | Task | Duration | Owner |
|-------|------|----------|-------|
| 1 | Database Migration | 1 hour | DBA |
| 2 | Code Updates | 2 hours | Backend Dev |
| 3 | Testing | 1 hour | QA |
| 4 | Deployment | 30 min | DevOps |
| **Total** | **Implementation** | **~4.5 hours** | **Team** |

---

## Sign-Off

- [ ] Implementation completed: ______________ (Date)
- [ ] Testing completed: ______________ (Date)
- [ ] Deployed to production: ______________ (Date)
- [ ] Verified in production: ______________ (Date)

**Completed By:** ____________________
**Verified By:** ____________________
**Team Lead:** ____________________

---

## Notes & Observations

(Space for team to document learnings, issues, and solutions)

```
[Implementation notes go here]
```

---

**Ready to begin? Start with Phase 1, Step 1.1**

For questions, refer to the comprehensive documentation files or contact your database optimization expert.

Good luck with the optimization! 🚀
