# Job Creation Wizard - Quick Reference Guide

**Version:** 1.0
**Date:** October 24, 2025

---

## Component Overview

```
Job Creation Wizard
├── State Management: useJobCreationWizard Hook
├── Service Layer: JobServiceExtensions
├── Integration Points:
│   ├── ChatInterface (AI Pricing)
│   ├── MasterPricingEngine (Quick Calculator)
│   └── CustomerManagementService (Customer CRUD)
└── Database: Supabase (PostgreSQL + RLS)
```

---

## Wizard Flow (5 Steps)

```
┌─────────────────────────────────────────────────────────┐
│ Step 1: Customer Selection                              │
│ ─────────────────────────────                          │
│ • Search existing customers                             │
│ • Create new customer (inline modal)                    │
│ • Auto-populate address from customer                   │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│ Step 2: Job Details                                     │
│ ───────────────────                                     │
│ • Job title (required)                                  │
│ • Service address (required)                            │
│ • Priority: 0-10 scale (default: 5)                     │
│ • Requested start date (optional)                       │
│ • Description, tags, location notes                     │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│ Step 3: Services & Pricing                              │
│ ──────────────────────                                  │
│ • Option A: AI Chat (ChatInterface)                     │
│   - Conversational pricing                              │
│   - Auto-generate service line items                    │
│                                                          │
│ • Option B: Quick Calculator                            │
│   - Select service from dropdown                        │
│   - Input pricing variables                             │
│   - Calculate via MasterPricingEngine                   │
│                                                          │
│ • Option C: Manual Entry                                │
│   - Add services with custom pricing                    │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│ Step 4: Review & Create                                 │
│ ───────────────────────                                 │
│ • Review all details                                    │
│ • Estimated total calculation                           │
│ • Decision:                                             │
│   - "Save as Quote" → status='quote'                    │
│   - "Schedule Job" → Go to Step 5                       │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│ Step 5: Schedule & Assign (Optional)                    │
│ ────────────────────────────                            │
│ • Select crew (dropdown)                                │
│ • Scheduled start & end dates                           │
│ • Estimated hours (auto-calculated)                     │
│ • Conflict detection (warn if overlaps)                 │
│ • Create job with status='scheduled'                    │
└─────────────────────────────────────────────────────────┘
              ↓
      [Job Created Successfully]
```

---

## State Management Hook

### Usage

```typescript
import { useJobCreationWizard } from '@/hooks/useJobCreationWizard';

const JobWizardComponent = () => {
  const wizard = useJobCreationWizard({
    companyId: 'your-company-uuid',
    userId: 'current-user-uuid',
    enableLocalStorage: true,          // Auto-save progress
    validateOnStepChange: true,         // Validate before navigation
    requireScheduling: false            // Step 5 optional
  });

  // Access state
  console.log('Current step:', wizard.currentStep);
  console.log('Customer:', wizard.customer);
  console.log('Services:', wizard.services);
  console.log('Estimated total:', wizard.estimatedTotal);

  // Navigation
  wizard.nextStep();
  wizard.prevStep();
  wizard.goToStep(3);

  // Update state
  wizard.setCustomer(selectedCustomer);
  wizard.updateJobDetails({ title: 'New Job' });
  wizard.addService(serviceItem);

  // Submit
  const handleSubmit = async () => {
    const input = buildWizardInput(wizard.state);
    const result = await jobService.createJobFromWizard(input);

    if (result.success) {
      wizard.markCompleted(result.data.job.id);
      router.push(`/jobs/${result.data.job.id}`);
    }
  };

  return (
    <WizardUI wizard={wizard} onSubmit={handleSubmit} />
  );
};
```

### Key Properties

| Property | Type | Description |
|----------|------|-------------|
| `currentStep` | `1-5` | Current wizard step |
| `customer` | `CustomerProfile \| null` | Selected customer |
| `jobDetails` | `JobDetailsData` | Job information |
| `services` | `ServiceLineItem[]` | Service line items |
| `schedule` | `ScheduleData \| null` | Crew assignment data |
| `estimatedTotal` | `number` | Calculated from services |
| `canGoNext` | `boolean` | Can advance to next step |
| `canGoBack` | `boolean` | Can return to previous step |
| `errors` | `Record<string, string>` | Validation errors |

### Key Methods

| Method | Description |
|--------|-------------|
| `nextStep()` | Advance to next step (validates first) |
| `prevStep()` | Go back one step |
| `goToStep(step)` | Jump to specific step |
| `setCustomer(customer)` | Set selected customer |
| `updateJobDetails(updates)` | Update job details |
| `addService(service)` | Add service line item |
| `updateService(index, updates)` | Update service at index |
| `removeService(index)` | Remove service at index |
| `setSchedule(schedule)` | Set crew assignment |
| `validateCurrentStep()` | Validate current step data |
| `markCompleted(jobId)` | Mark wizard as complete |
| `reset()` | Reset to initial state |

---

## Service Layer Methods

### JobServiceExtensions

#### `createJobFromWizard`

**Purpose:** Atomically create job, services, and optional assignment

```typescript
import { jobServiceWizardExtensions } from '@/services/JobServiceExtensions';

const result = await jobServiceWizardExtensions.createJobFromWizard({
  company_id: 'uuid',
  customer_id: 'uuid',
  title: 'Paver Patio Installation',
  service_address: '123 Main St',
  priority: 5,
  status: 'quote', // or 'approved'
  services: [
    {
      service_config_id: 'uuid',
      service_name: 'Paver Patio',
      quantity: 1,
      unit_price: 85.00,
      total_price: 30600.00,
      calculation_data: { ... },
      pricing_variables: { sqft: 360 },
      added_by_user_id: 'uuid'
    }
  ],
  assignment: { // Optional
    crew_id: 'uuid',
    scheduled_start: '2025-02-01T08:00:00Z',
    scheduled_end: '2025-02-05T17:00:00Z',
    assigned_by_user_id: 'uuid'
  },
  created_by_user_id: 'uuid'
});

if (result.success) {
  console.log('Job created:', result.data.job.job_number);
  console.log('Services:', result.data.services); // Array of IDs
  console.log('Assignment:', result.data.assignmentId);
}
```

#### `generateJobNumber`

**Purpose:** Generate sequential job number: `JOB-{YEAR}-{SEQUENCE}`

```typescript
const jobNumber = await jobServiceWizardExtensions.generateJobNumber('company-uuid');
// Returns: "JOB-2025-0042"
```

#### `checkScheduleConflicts`

**Purpose:** Detect crew scheduling conflicts

```typescript
const conflicts = await jobServiceWizardExtensions.checkScheduleConflicts(
  'crew-uuid',
  '2025-02-01T08:00:00Z',
  '2025-02-05T17:00:00Z'
);

if (conflicts.success && conflicts.data.length > 0) {
  console.log('Conflicts found:');
  conflicts.data[0].conflicting_assignments.forEach(conflict => {
    console.log(`  - ${conflict.job_number}: ${conflict.job_title}`);
  });
}
```

---

## Integration Patterns

### 1. AI Chat Integration (Step 3)

```typescript
const ServicesStep = () => {
  const wizard = useJobCreationWizard(config);
  const [showChat, setShowChat] = useState(false);

  const handleChatComplete = (chatResult) => {
    // Transform chat result to service line items
    const services = chatResult.services.map(svc => ({
      service_config_id: svc.serviceConfigId,
      service_name: svc.serviceName,
      quantity: 1,
      unit_price: svc.unitPrice,
      total_price: svc.totalPrice,
      calculation_data: svc.calculationData,
      pricing_variables: svc.pricingVariables
    }));

    wizard.setServices(services);
    setShowChat(false);
  };

  return (
    <>
      {showChat ? (
        <ChatInterface
          mode="embedded"
          customerId={wizard.customer.id}
          onComplete={handleChatComplete}
          onCancel={() => setShowChat(false)}
        />
      ) : (
        <button onClick={() => setShowChat(true)}>
          Use AI Chat
        </button>
      )}
    </>
  );
};
```

### 2. Pricing Engine Integration (Step 3)

```typescript
import { masterPricingEngine } from '@/pricing-system/core/calculations/master-pricing-engine';

const handleQuickCalculate = async (serviceName, variables) => {
  const result = await masterPricingEngine.calculatePricing(
    variables,
    variables.sqft,
    serviceName,
    companyId,
    serviceConfigId
  );

  const newService = {
    service_config_id: serviceConfigId,
    service_name: serviceName,
    quantity: 1,
    unit_price: result.tier2Results.total,
    total_price: result.tier2Results.total,
    calculation_data: {
      tier1Results: result.tier1Results,
      tier2Results: result.tier2Results,
      sqft: result.sqft,
      inputValues: variables,
      confidence: result.confidence
    },
    pricing_variables: variables
  };

  wizard.addService(newService);
};
```

### 3. Customer Management Integration (Step 1)

```typescript
import { customerManagementService } from '@/services/customerManagementService';

const handleCreateCustomer = async (customerData) => {
  const result = await customerManagementService.createCustomer({
    company_id: companyId,
    created_by_user_id: userId,
    ...customerData
  });

  if (result.success) {
    // Auto-select customer
    wizard.setCustomer(result.customer);

    // Auto-populate address
    wizard.updateJobDetails({
      service_address: result.customer.customer_address
    });

    // Advance to Step 2
    wizard.nextStep();
  }
};
```

---

## Validation Rules

### Step 1: Customer
- ✅ Customer must be selected

### Step 2: Job Details
- ✅ Title required (3-100 characters)
- ✅ Service address required
- ✅ Priority must be 0-10

### Step 3: Services
- ✅ At least one service required
- ✅ Each service must have valid name, unit price, total price

### Step 4: Review
- ✅ Always valid (informational only)

### Step 5: Schedule (if enabled)
- ✅ Crew selection required
- ✅ Start date required
- ✅ End date required (must be after start)
- ⚠️ Conflict warning (not blocking)

---

## Error Handling

### Client-Side Errors

```typescript
// Field validation errors
<Input
  value={jobDetails.title}
  error={errors.title}
  onChange={(e) => wizard.updateJobDetails({ title: e.target.value })}
/>
```

### Service Errors

```typescript
const result = await jobService.createJobFromWizard(input);

if (!result.success) {
  if (result.error === 'Customer not found') {
    toast.error('Customer no longer exists');
    wizard.goToStep(1);
  } else {
    toast.error(`Error: ${result.error}`);
  }
}
```

### Transaction Rollback

```typescript
// JobService handles rollback automatically
// If services fail to insert, created job is deleted
// CASCADE DELETE removes related records
```

---

## Database Schema

### Tables Used

| Table | Purpose |
|-------|---------|
| `ops_jobs` | Main job record |
| `ops_job_services` | Service line items |
| `ops_job_assignments` | Crew assignments |
| `crm_customers` | Customer data |
| `ops_crews` | Crew definitions |
| `svc_pricing_configs` | Pricing configuration |

### Foreign Key Relationships

```
ops_jobs
├── customer_id → crm_customers(id)
├── created_by_user_id → users(id)
└── updated_by_user_id → users(id)

ops_job_services
├── job_id → ops_jobs(id) ON DELETE CASCADE
├── service_config_id → svc_pricing_configs(id)
└── added_by_user_id → users(id)

ops_job_assignments
├── job_id → ops_jobs(id) ON DELETE CASCADE
├── crew_id → ops_crews(id)
└── assigned_by_user_id → users(id)
```

---

## Testing Checklist

### Unit Tests
- [ ] Hook initialization
- [ ] Step navigation (forward/backward)
- [ ] Validation logic per step
- [ ] Service CRUD operations
- [ ] LocalStorage persistence
- [ ] Job number generation
- [ ] Conflict detection

### Integration Tests
- [ ] Complete wizard flow
- [ ] Customer selection → address auto-fill
- [ ] AI chat → services transformation
- [ ] Quick calculator → pricing calculation
- [ ] Transaction rollback on failure
- [ ] Schedule conflict detection

### E2E Tests
- [ ] Create job as quote
- [ ] Create job with scheduling
- [ ] Customer inline creation
- [ ] AI chat integration
- [ ] Quick calculator integration
- [ ] Validation error display
- [ ] Success redirect

---

## Performance Considerations

### Optimization Strategies

1. **Debounced Auto-Save**
   ```typescript
   useEffect(() => {
     const timer = setTimeout(() => {
       wizard.saveProgress();
     }, 500); // Debounce 500ms

     return () => clearTimeout(timer);
   }, [wizard.state]);
   ```

2. **Memoized Calculations**
   ```typescript
   const estimatedTotal = useMemo(() => {
     return services.reduce((sum, svc) => sum + svc.total_price, 0);
   }, [services]);
   ```

3. **Lazy Component Loading**
   ```typescript
   const ChatInterface = lazy(() => import('@/components/ChatInterface'));
   ```

4. **Batch Service Inserts**
   ```typescript
   // Insert all services in single query
   await supabase.from('ops_job_services').insert(serviceInserts);
   ```

---

## Security Considerations

### Row-Level Security (RLS)

```sql
-- Ensure company isolation
CREATE POLICY "company_isolation_ops_jobs"
  ON ops_jobs
  FOR ALL
  USING (company_id = current_setting('app.current_company_id')::uuid);

CREATE POLICY "company_isolation_ops_job_services"
  ON ops_job_services
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ops_jobs
      WHERE ops_jobs.id = ops_job_services.job_id
        AND ops_jobs.company_id = current_setting('app.current_company_id')::uuid
    )
  );
```

### Input Sanitization

```typescript
// Trim and sanitize user inputs
const sanitizedTitle = input.title.trim();

// Validate against SQL injection (Supabase parameterized queries)
// Validate against XSS (React escapes by default)
```

---

## Troubleshooting

### Common Issues

**Issue:** Wizard state not persisting
- **Solution:** Check `enableLocalStorage: true` in config
- **Solution:** Verify localStorage quota not exceeded
- **Solution:** Check browser privacy settings

**Issue:** Job number collision
- **Solution:** Database ordering handles concurrency
- **Solution:** Check `job_number` index exists
- **Solution:** Verify company_id filtering

**Issue:** Schedule conflicts not detected
- **Solution:** Verify assignment status != 'cancelled'
- **Solution:** Check timestamp format (ISO 8601)
- **Solution:** Validate crew_id exists

**Issue:** Transaction rollback not working
- **Solution:** Verify CASCADE DELETE on foreign keys
- **Solution:** Check error handling in createJobFromWizard
- **Solution:** Review Supabase RLS policies

---

## Quick Commands

### Reset Wizard State

```typescript
wizard.reset();
wizard.clearSavedProgress();
```

### Pre-populate Wizard (Edit Mode)

```typescript
const wizard = useJobCreationWizard(config);

// Load existing job data
useEffect(() => {
  if (editJobId) {
    const job = await jobService.getJobWithDetails(editJobId, companyId);
    wizard.setCustomer(job.customer);
    wizard.setJobDetails({
      title: job.title,
      service_address: job.service_address,
      priority: job.priority
      // ... other fields
    });
    wizard.setServices(job.services);
  }
}, [editJobId]);
```

### Export Job Data

```typescript
const exportData = {
  customer: wizard.customer,
  jobDetails: wizard.jobDetails,
  services: wizard.services,
  estimatedTotal: wizard.estimatedTotal
};

const json = JSON.stringify(exportData, null, 2);
downloadFile('job-export.json', json);
```

---

## Files Reference

| File | Path | Purpose |
|------|------|---------|
| **Hook** | `src/hooks/useJobCreationWizard.ts` | State management |
| **Service** | `src/services/JobServiceExtensions.ts` | Backend methods |
| **Architecture** | `docs/architecture/JOB-WIZARD-ARCHITECTURE.md` | Full design doc |
| **Quick Ref** | `docs/architecture/JOB-WIZARD-QUICK-REFERENCE.md` | This document |

---

**Last Updated:** October 24, 2025
**Version:** 1.0
