# Job Creation Wizard - Visual Architecture Summary

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                  FRONTEND LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐        │
│  │  Step 1: Customer  │───▶│ Step 2: Job Details│───▶│ Step 3: Services   │        │
│  │  - Search          │    │ - Title            │    │ - AI Chat          │        │
│  │  - Create New      │    │ - Address          │    │ - Quick Calculator │        │
│  └────────────────────┘    │ - Priority         │    │ - Manual Entry     │        │
│           │                └────────────────────┘    └────────────────────┘        │
│           │                         │                         │                      │
│           │                         │                         │                      │
│  ┌────────────────────┐    ┌────────────────────┐           │                      │
│  │  Step 5: Schedule  │◀───│  Step 4: Review    │◀──────────┘                      │
│  │  - Select Crew     │    │  - Verify Details  │                                  │
│  │  - Set Dates       │    │  - Quote/Schedule  │                                  │
│  │  - Conflict Check  │    └────────────────────┘                                  │
│  └────────────────────┘                                                             │
│           │                                                                          │
│           └──────────────────────┐                                                  │
│                                  │                                                   │
│                          ┌───────▼──────────┐                                       │
│                          │  useJobCreation  │                                       │
│                          │   Wizard Hook    │◀────────────┐                        │
│                          └───────┬──────────┘              │                        │
│                                  │                         │                        │
│                                  │                   ┌─────┴────────┐              │
│                                  │                   │ LocalStorage │              │
│                                  │                   │ (Auto-save)  │              │
│                                  │                   └──────────────┘              │
└──────────────────────────────────┼──────────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼──────────────────────────────────────────────────┐
│                           INTEGRATION LAYER                                          │
├──────────────────────────────────┼──────────────────────────────────────────────────┤
│                                  │                                                   │
│  ┌────────────────────┐    ┌─────▼──────────┐    ┌────────────────────┐           │
│  │  ChatInterface     │───▶│ JobService     │◀───│ Customer Service   │           │
│  │  Integration       │    │ Extensions     │    │ Integration        │           │
│  │  - AI Pricing      │    │ - Create Job   │    │ - Inline Create    │           │
│  │  - Service Extract │    │ - Validate     │    │ - Address Fill     │           │
│  └────────────────────┘    │ - Conflict Chk │    └────────────────────┘           │
│           │                └─────┬──────────┘             │                         │
│           │                      │                        │                         │
│  ┌────────▼──────────┐          │                        │                         │
│  │  MasterPricing    │          │                        │                         │
│  │  Engine           │──────────┘                        │                         │
│  │  - Calculate      │                                   │                         │
│  │  - Config Load    │                                   │                         │
│  └───────────────────┘                                   │                         │
└──────────────────────────────────┬──────────────────────┬────────────────────────────┘
                                   │                      │
┌──────────────────────────────────┼──────────────────────┼────────────────────────────┐
│                              DATABASE LAYER             │                            │
├──────────────────────────────────┼──────────────────────┼────────────────────────────┤
│                                  │                      │                            │
│  ┌────────────────┐    ┌─────────▼───────────┐    ┌────▼──────────────┐           │
│  │ svc_pricing_   │    │    ops_jobs         │    │  crm_customers    │           │
│  │ configs        │    │  - job_number       │    │  - customer_name  │           │
│  │ - service_name │    │  - title            │    │  - address        │           │
│  │ - variables    │    │  - status           │    │  - email/phone    │           │
│  └────────────────┘    │  - estimated_total  │    └───────────────────┘           │
│                        └─────────┬───────────┘                                      │
│                                  │                                                   │
│  ┌────────────────┐    ┌─────────▼───────────┐    ┌───────────────────┐           │
│  │  ops_crews     │    │ ops_job_services    │    │ ops_job_          │           │
│  │  - crew_name   │───▶│  - service_name     │    │ assignments       │           │
│  │  - max_capacity│    │  - quantity         │◀───│  - crew_id        │           │
│  │  - color_code  │    │  - unit_price       │    │  - scheduled_*    │           │
│  └────────────────┘    │  - total_price      │    │  - status         │           │
│                        │  - calculation_data │    └───────────────────┘           │
│                        │  - pricing_variables│                                      │
│                        └─────────────────────┘                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Complete Wizard Execution

```
┌───────────┐
│   USER    │
└─────┬─────┘
      │
      │ 1. Opens Wizard
      ▼
┌───────────────────────────┐
│ Initialize Hook           │
│ - Load from LocalStorage  │
│ - Restore or create fresh │
└─────┬─────────────────────┘
      │
      │ STEP 1: CUSTOMER
      ▼
┌───────────────────────────┐
│ Search Customers          │◀──────────┐
│ - Query crm_customers     │           │
│ - Display results         │           │
└─────┬─────────────────────┘           │
      │                                 │
      │ Customer not found?             │
      │                                 │
      ▼                                 │
┌───────────────────────────┐           │
│ Create New Customer       │           │
│ - Modal opens (inline)    │           │
│ - Save to DB              │           │
│ - Auto-select & advance   │───────────┘
└─────┬─────────────────────┘
      │
      │ STEP 2: JOB DETAILS
      ▼
┌───────────────────────────┐
│ Fill Job Information      │
│ - Title (required)        │
│ - Address (auto-filled)   │
│ - Priority (default: 5)   │
│ - Dates, notes, tags      │
└─────┬─────────────────────┘
      │
      │ STEP 3: SERVICES
      ▼
┌───────────────────────────┐
│ Choose Input Method       │
└─────┬─────────────────────┘
      │
      ├─────── Option A: AI Chat ───────────┐
      │                                      │
      │       ┌───────────────────────────┐ │
      │       │ ChatInterface             │ │
      │       │ - Describe project        │ │
      │       │ - AI generates pricing    │ │
      │       │ - Extract services        │ │
      │       │ - Return to wizard        │ │
      │       └──────────┬────────────────┘ │
      │                  │                   │
      ├─────── Option B: Quick Calculator ──┤
      │                  │                   │
      │       ┌──────────▼────────────────┐ │
      │       │ MasterPricingEngine       │ │
      │       │ - Select service          │ │
      │       │ - Input variables         │ │
      │       │ - Calculate pricing       │ │
      │       │ - Add to services list    │ │
      │       └──────────┬────────────────┘ │
      │                  │                   │
      ├─────── Option C: Manual Entry ──────┤
      │                  │                   │
      │       ┌──────────▼────────────────┐ │
      │       │ Manual Service Entry      │ │
      │       │ - Custom name/price       │ │
      │       │ - Add to list             │ │
      │       └──────────┬────────────────┘ │
      │                  │                   │
      └──────────────────┴───────────────────┘
                         │
      │ STEP 4: REVIEW
      ▼
┌───────────────────────────┐
│ Review All Details        │
│ - Customer info           │
│ - Job details             │
│ - Services list           │
│ - Estimated total         │
└─────┬─────────────────────┘
      │
      │ Decision Point
      │
      ├─── Save as Quote ─────────┐
      │                            │
      │                    ┌───────▼────────────┐
      │                    │ Create Job         │
      │                    │ status = 'quote'   │
      │                    └───────┬────────────┘
      │                            │
      └─── Schedule Job ──────┐   │
                              │   │
      │ STEP 5: SCHEDULE      │   │
      ▼                       │   │
┌───────────────────────────┐│   │
│ Assign Crew & Dates       ││   │
│ - Select crew             ││   │
│ - Set start/end dates     ││   │
│ - Check conflicts         ││   │
│ - Estimated hours         ││   │
└─────┬─────────────────────┘│   │
      │                      │   │
      │ Conflict Detection   │   │
      ▼                      │   │
┌───────────────────────────┐│   │
│ Query Assignments         ││   │
│ - Same crew_id            ││   │
│ - Overlapping dates       ││   │
│ - Display warnings        ││   │
└─────┬─────────────────────┘│   │
      │                      │   │
      │ Create with Schedule │   │
      ▼                      │   │
┌───────────────────────────┐│   │
│ Create Job                ││   │
│ status = 'scheduled'      ││   │
└─────┬─────────────────────┘│   │
      │                      │   │
      └──────────────────────┴───┘
                             │
      │ TRANSACTION COMMIT
      ▼
┌────────────────────────────────────┐
│ JobService.createJobFromWizard()   │
│                                    │
│ BEGIN TRANSACTION                  │
│ ├─ Generate Job Number             │
│ ├─ INSERT ops_jobs                 │
│ ├─ INSERT ops_job_services (batch) │
│ ├─ INSERT ops_job_assignments      │
│ │   (if scheduled)                 │
│ └─ COMMIT                          │
│                                    │
│ (Rollback on any failure)          │
└───────────┬────────────────────────┘
            │
            │ Success
            ▼
┌───────────────────────────┐
│ Mark Wizard Complete      │
│ - Clear LocalStorage      │
│ - Show success toast      │
│ - Redirect to Job Detail  │
└───────────────────────────┘
            │
            ▼
┌───────────────────────────┐
│ Job Detail View           │
│ - Display created job     │
│ - Show job number         │
│ - Display all services    │
└───────────────────────────┘
```

---

## State Persistence Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     STATE LIFECYCLE                             │
└─────────────────────────────────────────────────────────────────┘

  User Opens Wizard
         │
         ▼
  ┌─────────────────┐
  │ Check           │
  │ LocalStorage    │
  │ for saved state │
  └────┬────────────┘
       │
       ├── Found saved state ──┐
       │                       │
       │                       ▼
       │              ┌────────────────┐
       │              │ Restore State  │
       │              │ - Parse JSON   │
       │              │ - Validate     │
       │              │ - Load into UI │
       │              └────────────────┘
       │
       └── No saved state ────┐
                              │
                              ▼
                   ┌──────────────────┐
                   │ Create Fresh     │
                   │ Initial State    │
                   └──────┬───────────┘
                          │
  ┌───────────────────────┴───────────────────────┐
  │                                                │
  │         User Interacts with Wizard            │
  │         (Every state change triggers save)    │
  │                                                │
  └───────────────────┬───────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │ Auto-save to           │
         │ LocalStorage           │
         │ (Debounced 500ms)      │
         └────────┬───────────────┘
                  │
                  │ Repeated for each step
                  │ until completion
                  │
                  ▼
         ┌────────────────────────┐
         │ Job Created            │
         │ Successfully           │
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │ Clear LocalStorage     │
         │ - Remove saved state   │
         │ - Prevent re-load      │
         └────────────────────────┘


  STORAGE KEY FORMAT:
  ────────────────────────────────────────────────
  job-wizard-state-{companyId}

  STORED DATA STRUCTURE:
  ────────────────────────────────────────────────
  {
    "currentStep": 3,
    "customer": {
      "id": "uuid",
      "customer_name": "John Smith",
      "customer_address": "123 Main St"
    },
    "jobDetails": {
      "title": "Paver Patio Installation",
      "service_address": "123 Main St",
      "priority": 5
    },
    "services": [
      {
        "service_name": "Paver Patio",
        "unit_price": 85.00,
        "total_price": 30600.00,
        "calculation_data": { ... }
      }
    ],
    "saveAsQuote": true,
    "schedule": null,
    "isCompleted": false,
    "timestamp": "2025-10-24T14:30:00Z"
  }
```

---

## Transaction Rollback Strategy

```
┌────────────────────────────────────────────────────────────────┐
│              ATOMIC JOB CREATION TRANSACTION                   │
└────────────────────────────────────────────────────────────────┘

  Start Transaction
        │
        ▼
  ┌─────────────────────┐
  │ Step 1:             │
  │ Validate Customer   │
  │ - Check exists      │
  │ - Verify company    │
  └─────┬───────────────┘
        │
        ├── Invalid ──────────┐
        │                     │
        │ Valid               ▼
        ▼            ┌────────────────┐
  ┌─────────────────────┐    │ ERROR Response │
  │ Step 2:             │    │ - No DB changes│
  │ Generate Job Number │    └────────────────┘
  │ - Query max number  │
  │ - Increment         │
  └─────┬───────────────┘
        │
        ▼
  ┌─────────────────────┐
  │ Step 3:             │
  │ INSERT ops_jobs     │◀───── Store job.id
  │                     │       for rollback
  └─────┬───────────────┘
        │
        ├── Error ────────────┐
        │                     │
        │ Success             ▼
        ▼            ┌────────────────┐
  ┌─────────────────────┐    │ ROLLBACK       │
  │ Step 4:             │    │ (No-op, job    │
  │ INSERT services     │    │  not created)  │
  │ (Batch insert)      │    └────────────────┘
  └─────┬───────────────┘
        │
        ├── Error ────────────┐
        │                     │
        │ Success             ▼
        ▼            ┌────────────────────┐
  ┌─────────────────────┐    │ ROLLBACK           │
  │ Step 5: (Optional)  │    │ DELETE ops_jobs    │
  │ INSERT assignment   │    │ WHERE id = job.id  │
  │                     │    │ (CASCADE deletes   │
  └─────┬───────────────┘    │  services)         │
        │                    └────────────────────┘
        ├── Error ────────────┐
        │                     │
        │ Success             │ Assignment failure
        │                     │ does NOT rollback
        │                     │ (warning only)
        │                     │
        ▼                     ▼
  ┌─────────────────────┬───────────────────────┐
  │ COMMIT              │ PARTIAL SUCCESS       │
  │ - Job created       │ - Job & services OK   │
  │ - Services created  │ - Assignment failed   │
  │ - Assignment created│ - Return warning      │
  └─────────────────────┴───────────────────────┘


  CASCADE DELETE ENSURES CLEANUP:
  ────────────────────────────────────────────────
  ops_jobs (parent)
    │
    ├── ON DELETE CASCADE ──▶ ops_job_services
    │                         (auto-deleted)
    │
    └── ON DELETE CASCADE ──▶ ops_job_assignments
                              (auto-deleted)
```

---

## Validation Layers

```
┌────────────────────────────────────────────────────────────────┐
│                  MULTI-LAYER VALIDATION                        │
└────────────────────────────────────────────────────────────────┘

  User Input
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Real-time Field Validation                         │
│ ─────────────────────────────────────────                   │
│ • Triggered: onChange, onBlur                               │
│ • Location: Input components                                │
│ • Examples:                                                  │
│   - Title: 3-100 characters                                 │
│   - Email: valid format                                     │
│   - Priority: 0-10 range                                    │
│ • Display: Inline error below field (red text)             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Step-Level Validation                              │
│ ──────────────────────────────                              │
│ • Triggered: On "Next" button click                         │
│ • Location: useJobCreationWizard hook                       │
│ • Examples:                                                  │
│   - Step 1: Customer selected                               │
│   - Step 2: All required fields filled                      │
│   - Step 3: At least one service                            │
│ • Display: Alert banner at top + block navigation           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Pre-Submission Validation                          │
│ ────────────────────────────────────                        │
│ • Triggered: Before createJobFromWizard()                   │
│ • Location: JobService.validateWizardData()                 │
│ • Examples:                                                  │
│   - Customer exists in database                             │
│   - Services have valid config IDs                          │
│   - Schedule has no conflicts                               │
│ • Display: Toast notification + error summary               │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Database Constraints                               │
│ ─────────────────────────────                               │
│ • Triggered: On INSERT/UPDATE                               │
│ • Location: PostgreSQL constraints                          │
│ • Examples:                                                  │
│   - NOT NULL constraints                                    │
│   - CHECK constraints (priority 0-10)                       │
│   - FOREIGN KEY constraints                                 │
│   - UNIQUE constraints (job_number per company)             │
│ • Display: Service error response + rollback                │
└─────────────────────────────────────────────────────────────┘


  VALIDATION ERROR DISPLAY:
  ────────────────────────────────────────────────

  Field Level (Layer 1):
  ┌─────────────────────────────┐
  │ Job Title                   │
  │ ┌─────────────────────────┐ │
  │ │ Pa                      │ │
  │ └─────────────────────────┘ │
  │ ⚠ Title must be at least   │
  │   3 characters              │
  └─────────────────────────────┘

  Step Level (Layer 2):
  ┌─────────────────────────────────────┐
  │ ⚠ Please fix the following errors: │
  │ • Service address is required       │
  │ • Priority must be between 0-10     │
  └─────────────────────────────────────┘

  Pre-Submission (Layer 3):
  ┌─────────────────────────────────────┐
  │ 🚫 Validation Failed                │
  │ • Customer no longer exists         │
  │ • Schedule conflict with Job-0038   │
  │                                     │
  │ [Fix Errors]  [Cancel]              │
  └─────────────────────────────────────┘

  Database (Layer 4):
  ┌─────────────────────────────────────┐
  │ 🚫 Error Creating Job               │
  │ A database error occurred.          │
  │ The operation has been rolled back. │
  │                                     │
  │ [Contact Support]  [Try Again]      │
  └─────────────────────────────────────┘
```

---

## Component File Structure

```
src/
├── hooks/
│   └── useJobCreationWizard.ts          ✅ Created (State management)
│
├── services/
│   ├── JobService.ts                    ✅ Exists (Base service)
│   └── JobServiceExtensions.ts          ✅ Created (Wizard methods)
│
├── components/
│   └── jobs/
│       ├── JobCreationWizard.tsx        ⏳ To Create (Main wizard container)
│       │
│       └── wizard/
│           ├── CustomerSelectionStep.tsx  ⏳ To Create (Step 1)
│           ├── JobDetailsStep.tsx         ⏳ To Create (Step 2)
│           ├── ServicesStep.tsx           ⏳ To Create (Step 3)
│           ├── ReviewStep.tsx             ⏳ To Create (Step 4)
│           ├── ScheduleStep.tsx           ⏳ To Create (Step 5)
│           │
│           ├── ServiceLineItemsTable.tsx  ⏳ To Create (Services table)
│           ├── QuickCalculator.tsx        ⏳ To Create (Calculator UI)
│           ├── ConflictWarning.tsx        ⏳ To Create (Schedule conflicts)
│           └── WizardProgressBar.tsx      ⏳ To Create (Step indicator)
│
├── types/
│   └── crm.ts                           ✅ Exists (Type definitions)
│
└── docs/
    └── architecture/
        ├── JOB-WIZARD-ARCHITECTURE.md     ✅ Created (Full architecture)
        ├── JOB-WIZARD-QUICK-REFERENCE.md  ✅ Created (Quick guide)
        └── JOB-WIZARD-VISUAL-SUMMARY.md   ✅ Created (This document)
```

---

## Implementation Priority

### Phase 1: Core Foundation (Week 1)
```
✅ State Management Hook           (useJobCreationWizard.ts)
✅ Service Layer Extensions         (JobServiceExtensions.ts)
✅ Architecture Documentation       (All docs/)
⏳ Main Wizard Container           (JobCreationWizard.tsx)
⏳ Step Components (1-5)           (wizard/*.tsx)
```

### Phase 2: Integration (Week 2)
```
⏳ AI Chat Integration             (ChatInterface hookup)
⏳ Pricing Engine Integration      (MasterPricingEngine hookup)
⏳ Customer Service Integration    (Inline create modal)
⏳ Conflict Detection UI           (ConflictWarning.tsx)
```

### Phase 3: Testing & Polish (Week 3)
```
⏳ Unit Tests                      (Hook + Service tests)
⏳ Integration Tests               (Full wizard flow)
⏳ E2E Tests (Playwright)          (User scenarios)
⏳ Accessibility Audit             (WCAG 2.1 AA)
⏳ Performance Optimization        (Debouncing, memoization)
```

---

## Key Success Metrics

### Functionality
- [ ] Complete wizard flow without errors
- [ ] State persists across page refreshes
- [ ] Customer inline creation works
- [ ] AI Chat integration extracts services correctly
- [ ] Quick Calculator calculates accurately
- [ ] Schedule conflict detection works
- [ ] Transaction rollback prevents orphaned data

### Performance
- [ ] Wizard loads in < 1 second
- [ ] Step navigation feels instant
- [ ] Auto-save doesn't block UI (debounced)
- [ ] Job creation completes in < 3 seconds

### Usability
- [ ] Clear validation messages at each step
- [ ] Can navigate backward without data loss
- [ ] Progress indicator shows current step
- [ ] Estimated total updates in real-time
- [ ] Success message with job number displayed

### Reliability
- [ ] No data loss on browser crash (LocalStorage)
- [ ] Rollback works on any step failure
- [ ] Conflict warnings are accurate
- [ ] No duplicate job numbers generated

---

**Document Version:** 1.0
**Last Updated:** October 24, 2025
**Status:** ✅ Architecture Complete / ⏳ Implementation Ready
