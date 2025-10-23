# CRM Integration Architecture

## Overview

This document explains how the CRM system integrates with the existing Tradesphere pricing and AI engines, and details the data flow between frontend components, services, and the database.

**Last Updated:** 2025-01-23
**Status:** Phase 1 Complete (Dashboard + Skeleton Tabs)

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
├─────────────────────────────────────────────────────────────┤
│  Dashboard Home (Landing)                                   │
│  ├── KPI Metrics Display                                    │
│  ├── Recent Activity Feed                                   │
│  ├── Quick Actions Panel ─────────────┐                     │
│  └── Upcoming Jobs List               │                     │
│                                        │                     │
│  ┌─────────────────────────────────────▼──────────────┐     │
│  │ Tab Modals (Full-Screen)                          │     │
│  │ ├── Jobs Tab (Skeleton - 25% complete)            │     │
│  │ ├── Schedule Tab (Skeleton - 20% complete)        │     │
│  │ └── Crews Tab (Skeleton - 30% complete)           │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                          │
├─────────────────────────────────────────────────────────────┤
│  JobService          CrewService        ScheduleService     │
│  DashboardService    JobNotesService                        │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Pricing      │    │ Supabase DB  │    │ AI Engine    │
│ Engine       │    │ (PostgreSQL) │    │ (Future)     │
│              │    │              │    │              │
│ - Calculate  │    │ - jobs       │    │ - Schedule   │
│   estimates  │    │ - job_svcs   │    │   optimizer  │
│ - Material   │    │ - crews      │    │ - Job        │
│   costs      │    │ - assignments│    │   insights   │
│ - Labor      │    │ - job_notes  │    │              │
│   rates      │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## Integration Points

### 1. Pricing Engine Integration

**Location:** JobService.ts

**Purpose:** Auto-calculate job estimates when services are selected

**Data Flow:**
```
User selects services in Job Create Wizard
       ↓
ServiceSelector component calls JobService.addServiceToJob()
       ↓
JobService.calculateJobEstimate(services[])
       ↓
FOR EACH service:
  masterPricingEngine.calculateService(serviceId, variables, companyId)
       ↓
Pricing results stored in job_services.calculation_data (JSONB)
       ↓
Total calculated and displayed in wizard
       ↓
Job created with complete pricing breakdown
```

**Implementation Status:**
- ✅ Database schema ready (job_services.calculation_data JSONB field)
- ✅ Service method signatures defined with TODO comments
- ⏳ Frontend integration (ServiceSelector component - skeleton only)
- ⏳ Pricing engine connection (TODO placeholder in JobService.ts)

**Code Reference:**
```typescript
// src/services/JobService.ts (Lines 380-420)
async calculateJobEstimate(services: JobServiceInput[]): Promise<ServiceResponse<CalculationResult>> {
  // TODO: PRICING ENGINE INTEGRATION
  // For each service:
  //   1. Call masterPricingEngine.calculateService(serviceId, variables, companyId)
  //   2. Extract PricingResult from engine
  //   3. Store in calculation_data JSONB field
  //   4. Sum totals for job estimate

  // PLACEHOLDER: Return mock structure
  return {
    success: true,
    data: {
      services: services.map(s => ({
        serviceId: s.service_config_id,
        calculationData: {}, // Will contain full pricing breakdown
        totalPrice: s.total_price
      })),
      totalEstimate: services.reduce((sum, s) => sum + s.total_price, 0),
      breakdown: {
        subtotal: 0,
        tax: 0,
        total: 0
      }
    }
  };
}
```

**Next Steps:**
1. Import `masterPricingEngine` from `src/pricing-system/core/calculations/master-pricing-engine.ts`
2. Call engine for each service with proper variables
3. Map PricingResult to CalculationResult format
4. Handle pricing engine errors gracefully
5. Update UI to display pricing breakdown with engine badge

---

### 2. AI Engine Integration

**Location:** Multiple points

#### 2.1 Schedule Optimization

**Location:** ScheduleService.ts

**Purpose:** Suggest optimal crew assignments based on job requirements, crew availability, and constraints

**Data Flow:**
```
User clicks "Get AI Recommendations" button in Schedule Tab
       ↓
ScheduleService.getOptimalSchedule(unassignedJobs, availableCrews)
       ↓
AI analyzes:
  - Job priority and duration
  - Crew specializations and capacity
  - Current assignments and conflicts
  - Travel time between locations
  - Historical performance data
       ↓
Returns optimized schedule with confidence scores
       ↓
User reviews and applies recommendations
       ↓
Assignments created via ScheduleService.createAssignment()
```

**Implementation Status:**
- ✅ Database schema supports all required data
- ✅ Service method defined with TODO placeholder
- ⏳ Frontend button in ScheduleTab skeleton
- ⏳ AI engine connection (future)

**Code Reference:**
```typescript
// src/services/ScheduleService.ts (Lines 340-380)
async getOptimalSchedule(jobs: Job[], crews: Crew[]): Promise<ServiceResponse<ScheduleRecommendation>> {
  // TODO: AI ENGINE INTEGRATION
  // Call AI scheduling service with:
  //   - unassignedJobs: Job requirements and constraints
  //   - availableCrews: Crew capabilities and current schedule
  //   - preferences: User scheduling preferences

  // AI analyzes and returns:
  //   - Optimized assignments (job → crew → time slot)
  //   - Confidence scores for each assignment
  //   - Alternative options
  //   - Conflict warnings

  // PLACEHOLDER: Return empty recommendations
  return {
    success: true,
    data: {
      recommendations: [],
      confidence: 0,
      alternativeOptions: []
    }
  };
}
```

#### 2.2 Job Insights & Recommendations

**Location:** JobNotesService.ts

**Purpose:** Generate AI-powered insights about job complexity, resource requirements, and potential risks

**Data Flow:**
```
User views job detail → Clicks "Generate AI Insights"
       ↓
JobNotesService.createAIInsight(jobId, context)
       ↓
AI analyzes:
  - Job scope and services
  - Similar past jobs
  - Resource requirements
  - Timeline feasibility
  - Potential risks
       ↓
Generates insight note with confidence score
       ↓
Stored in job_notes with is_ai_generated = true
       ↓
Displayed with "AI" badge in notes feed
```

**Implementation Status:**
- ✅ Database schema ready (job_notes.is_ai_generated, ai_confidence_score, ai_metadata)
- ✅ Service method defined with TODO placeholder
- ⏳ Frontend integration in JobDetailModal (future)
- ⏳ AI engine connection (future)

**Code Reference:**
```typescript
// src/services/JobNotesService.ts (Lines 180-220)
async createAIInsight(jobId: string, input: AIInsightInput): Promise<ServiceResponse<JobNote>> {
  // TODO: AI ENGINE INTEGRATION
  // Call AI service to analyze job and generate insights
  // Input: job details, historical data, resource constraints
  // Output: structured insight with confidence score

  // PLACEHOLDER: Create manual note
  const note = await this.createNote(jobId, {
    subject: 'AI Insight',
    content: input.context || 'AI analysis will appear here',
    note_type: 'ai_insight',
    is_ai_generated: true,
    ai_confidence_score: 0.75,
    ai_metadata: { source: 'placeholder' }
  });

  return note;
}
```

---

### 3. Customer System Integration

**Existing Integration:** Jobs link to customers table

**Data Flow:**
```
Customer exists in customers table
       ↓
User creates job from Dashboard → Select Customer step
       ↓
Job.customer_id references customers.id (FK constraint)
       ↓
Job inherits: customer_name, service_address, contact info
       ↓
Customer detail modal shows all related jobs
```

**Tables:**
- `customers` (existing)
- `jobs.customer_id` → `customers.id` (new FK)

**Service Integration:**
- CustomerService provides customer lookup for job creation
- JobService queries customer data for job context
- CustomerDetailModal displays job history

---

### 4. Service Pricing Configs Integration

**Existing Integration:** Jobs link to service configurations

**Data Flow:**
```
Service defined in service_pricing_configs table
       ↓
User adds service to job
       ↓
job_services.service_config_id → service_pricing_configs.id (FK)
       ↓
Pricing engine calculates based on service variables_config
       ↓
Result stored in job_services.calculation_data
```

**Tables:**
- `service_pricing_configs` (existing)
- `job_services.service_config_id` → `service_pricing_configs.id` (new FK)

---

## Data Flow Examples

### Example 1: Creating a Job with Pricing

```typescript
// Step-by-step data flow

// 1. User fills Job Create Wizard
const jobInput: CreateJobInput = {
  company_id: user.company_id,
  customer_id: selectedCustomer.id,
  title: "Kitchen Renovation",
  description: "Full kitchen remodel",
  status: 'quote',
  priority: 8,
  created_by_user_id: user.id
};

// 2. User selects services (Step 3 of wizard)
const selectedServices: JobServiceInput[] = [
  { service_config_id: 'svc_123', quantity: 150 }, // sqft
  { service_config_id: 'svc_456', quantity: 1 }
];

// 3. Frontend calls pricing calculation
const pricingResult = await JobService.calculateJobEstimate(selectedServices);

// 4. JobService calls pricing engine (TODO: implement)
for (const service of selectedServices) {
  const engineResult = await masterPricingEngine.calculateService(
    service.service_config_id,
    { sqft: service.quantity },
    user.company_id
  );

  // Store calculation in JSONB
  service.calculation_data = {
    engineResult,
    timestamp: new Date(),
    version: '1.0'
  };
}

// 5. Job created with full pricing breakdown
const job = await JobService.createJob({
  ...jobInput,
  estimated_total: pricingResult.data.totalEstimate
});

// 6. Services added to job
for (const service of selectedServices) {
  await JobService.addServiceToJob(job.id, service);
}

// 7. Job appears in Dashboard "Upcoming Jobs" list
```

### Example 2: Scheduling a Job

```typescript
// Step-by-step scheduling flow

// 1. User opens Schedule Tab
const schedule = await ScheduleService.getSchedule(
  user.company_id,
  { start: '2025-01-20', end: '2025-01-27' }
);

// 2. User drags job to crew lane
const assignment: CreateAssignmentInput = {
  job_id: job.id,
  crew_id: selectedCrew.id,
  scheduled_start: '2025-01-22T09:00:00Z',
  scheduled_end: '2025-01-22T17:00:00Z',
  estimated_hours: 8
};

// 3. System checks for conflicts
const conflicts = await ScheduleService.checkScheduleConflicts(
  selectedCrew.id,
  assignment.scheduled_start,
  assignment.scheduled_end
);

if (conflicts.data.length > 0) {
  // Show conflict warning
  showConflictDialog(conflicts.data);
  return;
}

// 4. Assignment created
const result = await ScheduleService.createAssignment(assignment);

// 5. Job status auto-updated to 'scheduled'
await JobService.updateJobStatus(job.id, 'scheduled');

// 6. Calendar refreshes showing new assignment
```

---

## Multi-Tenant Isolation

**Pattern:** All data access filtered by `company_id`

**Enforcement Layers:**
1. **Database RLS Policies:** Row-level security on all tables
2. **Service Layer:** All queries include company_id filter
3. **Frontend:** User context provides company_id from auth

**Example RLS Policy:**
```sql
-- Jobs table SELECT policy
CREATE POLICY "Users can view jobs from their company" ON jobs
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));
```

**Service Layer Pattern:**
```typescript
// All service methods accept company_id
async getJobs(companyId: string, filters?: JobSearchFilters): Promise<PaginatedResponse<Job>> {
  const { data, error } = await this.supabase
    .from('jobs')
    .select('*')
    .eq('company_id', companyId) // ✅ Multi-tenant filter
    .order('created_at', { ascending: false });

  // ...
}
```

---

## Authentication & Authorization

**Auth Flow:**
```
User logs in via Supabase Auth
       ↓
auth.uid() set in session
       ↓
Frontend calls getUserProfile() → users table
       ↓
User object contains: id, company_id, role flags
       ↓
Services use company_id for all queries
       ↓
RLS policies validate access at database level
```

**Role-Based Features:**
- `is_owner`: Full access to all CRM features, can delete jobs/crews
- `is_manager`: Can create/edit jobs, assign crews, view all data
- `is_sales`: Can create quotes, view customer data, limited edit
- `is_field_tech`: View assigned jobs, update status, log hours

**Implementation:**
```typescript
// Frontend checks role for conditional features
const { user } = useAuth();

{user.is_owner && (
  <button onClick={handleDeleteJob}>Delete Job</button>
)}
```

---

## Performance Considerations

### 1. Materialized View: job_metrics

**Purpose:** Pre-aggregate dashboard metrics for fast loading

**Refresh Strategy:**
- Cron job every 6 hours
- Manual refresh button in Dashboard
- Incremental updates on job status changes

**Query Performance:**
```sql
-- Fast dashboard load (single query)
SELECT * FROM job_metrics WHERE company_id = $1 AND status = 'in_progress';

-- vs. Raw aggregation (slow)
SELECT COUNT(*), SUM(estimated_total) FROM jobs WHERE company_id = $1 AND status = 'in_progress';
```

### 2. Indexes

**Strategic indexes on common query patterns:**
- `idx_jobs_company_status` - Dashboard filtering
- `idx_job_assignments_schedule` - Calendar queries
- `idx_crews_company_active` - Crew availability
- `idx_job_notes_created_at` - Activity feed

### 3. Pagination

**All list endpoints support pagination:**
```typescript
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

---

## Error Handling Strategy

### Service Layer
```typescript
try {
  const { data, error } = await this.supabase.from('jobs').select('*');
  if (error) throw error;
  return { success: true, data };
} catch (error: any) {
  console.error('[JobService] Error:', error);
  return {
    success: false,
    error: 'Failed to load jobs. Please try again.'
  };
}
```

### Frontend
```typescript
const response = await JobService.getJobs(user.company_id);

if (!response.success) {
  setError(response.error);
  showToast(response.error, 'error');
  return;
}

setJobs(response.data.items);
```

---

## Future Enhancements

### Phase 2: Complete Tab Implementation
- [ ] Jobs Tab: Full wizard, list, detail, filters
- [ ] Schedule Tab: Drag-drop calendar, conflict detection
- [ ] Crews Tab: Member management, performance tracking

### Phase 3: Advanced Features
- [ ] Real-time updates via Supabase Realtime subscriptions
- [ ] WebSocket for live schedule conflict notifications
- [ ] File attachments for jobs (invoices, photos)
- [ ] Mobile app (React Native) using same services

### Phase 4: AI Integration
- [ ] Connect pricing engine to job service calculation
- [ ] Implement AI schedule optimizer
- [ ] Add AI job insights generator
- [ ] Predictive analytics for resource planning

---

## Deployment Checklist

### Database
- [ ] Run migration 20-CREATE-CRM-TABLES.sql
- [ ] Verify RLS policies active
- [ ] Set up cron job for job_metrics refresh
- [ ] Test multi-tenant isolation

### Services
- [ ] Deploy Netlify functions (if using serverless)
- [ ] Configure environment variables
- [ ] Test all service endpoints
- [ ] Set up error logging (Sentry, etc.)

### Frontend
- [ ] Build and deploy React app
- [ ] Test Dashboard on production
- [ ] Verify navigation flow
- [ ] Mobile responsive testing

---

## Support & Troubleshooting

### Common Issues

**Issue:** Dashboard metrics not loading
**Solution:** Check job_metrics view exists and is refreshed

**Issue:** Can't create job
**Solution:** Verify user has company_id set and RLS policies enabled

**Issue:** Pricing calculation fails
**Solution:** Check pricing engine import and service configuration

**Issue:** Schedule conflicts not detected
**Solution:** Verify ScheduleService.checkConflicts() logic

---

**Document Version:** 1.0
**Last Updated:** 2025-01-23
**Contact:** Development Team
