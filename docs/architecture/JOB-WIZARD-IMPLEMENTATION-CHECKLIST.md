# Job Creation Wizard - Implementation Checklist

**Version:** 1.0
**Date:** October 24, 2025

This checklist guides the complete implementation of the Job Creation Wizard from architecture to production deployment.

---

## Phase 1: Foundation (Week 1)

### 1.1 Core State Management ✅ COMPLETE

- [x] Create `useJobCreationWizard.ts` hook
- [x] Implement state initialization
- [x] Implement step navigation (forward/backward)
- [x] Implement validation per step
- [x] Implement LocalStorage persistence
- [x] Add TypeScript interfaces for all state types
- [x] Document hook API

**Files Created:**
- `src/hooks/useJobCreationWizard.ts`

---

### 1.2 Service Layer Extensions ✅ COMPLETE

- [x] Create `JobServiceExtensions.ts`
- [x] Implement `createJobFromWizard()` method
- [x] Implement `generateJobNumber()` method
- [x] Implement `checkScheduleConflicts()` method
- [x] Implement `validateWizardData()` method
- [x] Add transaction rollback logic
- [x] Add comprehensive error handling

**Files Created:**
- `src/services/JobServiceExtensions.ts`

---

### 1.3 Architecture Documentation ✅ COMPLETE

- [x] Create complete architecture document
- [x] Create quick reference guide
- [x] Create visual summary with diagrams
- [x] Create implementation checklist (this document)
- [x] Document all integration patterns
- [x] Document validation strategies
- [x] Document error handling approaches

**Files Created:**
- `docs/architecture/JOB-WIZARD-ARCHITECTURE.md`
- `docs/architecture/JOB-WIZARD-QUICK-REFERENCE.md`
- `docs/architecture/JOB-WIZARD-VISUAL-SUMMARY.md`
- `docs/architecture/JOB-WIZARD-IMPLEMENTATION-CHECKLIST.md`

---

### 1.4 Main Wizard Container ⏳ TODO

- [ ] Create `JobCreationWizard.tsx` component
- [ ] Implement wizard modal/container layout
- [ ] Add progress indicator (steps 1-5)
- [ ] Add navigation buttons (Back/Next/Submit)
- [ ] Integrate useJobCreationWizard hook
- [ ] Add keyboard navigation support (Tab, Enter, Esc)
- [ ] Add loading states
- [ ] Add success/error toast notifications

**File to Create:**
```
src/components/jobs/JobCreationWizard.tsx
```

**Component Structure:**
```typescript
import { useJobCreationWizard } from '@/hooks/useJobCreationWizard';

export const JobCreationWizard = ({ onClose, onSuccess }) => {
  const wizard = useJobCreationWizard({ ... });

  return (
    <Modal>
      <WizardProgressBar currentStep={wizard.currentStep} />

      {wizard.currentStep === 1 && <CustomerSelectionStep wizard={wizard} />}
      {wizard.currentStep === 2 && <JobDetailsStep wizard={wizard} />}
      {wizard.currentStep === 3 && <ServicesStep wizard={wizard} />}
      {wizard.currentStep === 4 && <ReviewStep wizard={wizard} />}
      {wizard.currentStep === 5 && <ScheduleStep wizard={wizard} />}

      <WizardNavigationButtons wizard={wizard} />
    </Modal>
  );
};
```

---

### 1.5 Step Components ⏳ TODO

#### Step 1: Customer Selection

- [ ] Create `CustomerSelectionStep.tsx`
- [ ] Add customer search with autocomplete
- [ ] Add recent customers list
- [ ] Add "Create New Customer" button
- [ ] Integrate CustomerModal (inline)
- [ ] Add customer card display
- [ ] Add validation error display

**File to Create:**
```
src/components/jobs/wizard/CustomerSelectionStep.tsx
```

**Key Features:**
```typescript
• Search: customerManagementService.searchCustomers()
• Create: Inline CustomerModal
• Auto-advance: wizard.nextStep() after selection
• Address auto-fill: wizard.updateJobDetails({ service_address })
```

---

#### Step 2: Job Details

- [ ] Create `JobDetailsStep.tsx`
- [ ] Add job title input (required)
- [ ] Add service address inputs (address, city, state, zip)
- [ ] Add priority selector (0-10 or Low/Normal/High/Urgent)
- [ ] Add requested start date picker
- [ ] Add description textarea
- [ ] Add tags input (multi-select)
- [ ] Add location notes textarea
- [ ] Add field-level validation

**File to Create:**
```
src/components/jobs/wizard/JobDetailsStep.tsx
```

**Form Fields:**
```typescript
• title: Text input (required, 3-100 chars)
• service_address: Text input (required)
• service_city: Text input
• service_state: Dropdown (US states)
• service_zip: Text input (5 digits)
• priority: Radio buttons or slider (0-10)
• requested_start_date: Date picker
• description: Textarea (optional)
• tags: Multi-select input
```

---

#### Step 3: Services & Pricing

- [ ] Create `ServicesStep.tsx`
- [ ] Add service input method selector (AI Chat / Calculator / Manual)
- [ ] Integrate ChatInterface (embedded mode)
- [ ] Create QuickCalculator component
- [ ] Create ServiceLineItemsTable component
- [ ] Add service edit/remove actions
- [ ] Add estimated total display (real-time)
- [ ] Add validation (at least one service)

**Files to Create:**
```
src/components/jobs/wizard/ServicesStep.tsx
src/components/jobs/wizard/QuickCalculator.tsx
src/components/jobs/wizard/ServiceLineItemsTable.tsx
```

**Integration Points:**
```typescript
• AI Chat: <ChatInterface mode="embedded" onComplete={handleChatComplete} />
• Calculator: masterPricingEngine.calculatePricing(...)
• Manual: Direct wizard.addService({ ... })
```

---

#### Step 4: Review

- [ ] Create `ReviewStep.tsx`
- [ ] Display customer information (read-only)
- [ ] Display job details (read-only)
- [ ] Display service line items table (read-only)
- [ ] Display estimated total (prominent)
- [ ] Add "Save as Quote" button
- [ ] Add "Schedule Job" button
- [ ] Add "Edit" buttons for each section (go back to step)

**File to Create:**
```
src/components/jobs/wizard/ReviewStep.tsx
```

**Layout Sections:**
```
┌─────────────────────────────────────┐
│ Customer                [Edit Step 1]│
│ • Name, Address, Contact            │
├─────────────────────────────────────┤
│ Job Details             [Edit Step 2]│
│ • Title, Address, Priority          │
├─────────────────────────────────────┤
│ Services                [Edit Step 3]│
│ • Service Line Items Table          │
│ • Estimated Total: $XX,XXX.XX       │
├─────────────────────────────────────┤
│ [Save as Quote]  [Schedule Job →]   │
└─────────────────────────────────────┘
```

---

#### Step 5: Schedule & Assign

- [ ] Create `ScheduleStep.tsx`
- [ ] Add crew selection dropdown
- [ ] Add start date picker
- [ ] Add end date picker
- [ ] Add estimated hours input (auto-calculated)
- [ ] Add assignment notes textarea
- [ ] Integrate conflict detection
- [ ] Create ConflictWarning component
- [ ] Add date validation (end > start)
- [ ] Add skip option (make optional)

**Files to Create:**
```
src/components/jobs/wizard/ScheduleStep.tsx
src/components/jobs/wizard/ConflictWarning.tsx
```

**Conflict Detection:**
```typescript
const checkConflicts = async () => {
  const conflicts = await jobService.checkScheduleConflicts(
    selectedCrew,
    startDate,
    endDate
  );

  if (conflicts.data.length > 0) {
    // Show <ConflictWarning conflicts={conflicts.data} />
  }
};
```

---

### 1.6 Supporting Components ⏳ TODO

#### Wizard Progress Bar

- [ ] Create `WizardProgressBar.tsx`
- [ ] Show steps 1-5 with labels
- [ ] Highlight current step
- [ ] Show checkmarks for completed steps
- [ ] Allow click to jump to previous steps

**File to Create:**
```
src/components/jobs/wizard/WizardProgressBar.tsx
```

**Visual Design:**
```
1. Customer  2. Details  3. Services  4. Review  5. Schedule
   [✓]    →    [✓]    →    [●]    →    [ ]    →    [ ]
```

---

#### Service Line Items Table

- [ ] Create `ServiceLineItemsTable.tsx`
- [ ] Display service name, quantity, unit price, total
- [ ] Add edit button per row
- [ ] Add remove button per row
- [ ] Add subtotal row
- [ ] Add estimated total row (bold)
- [ ] Make responsive (mobile: stack columns)

**File to Create:**
```
src/components/jobs/wizard/ServiceLineItemsTable.tsx
```

**Table Columns:**
```
| Service Name | Quantity | Unit Price | Total | Actions |
|--------------|----------|------------|-------|---------|
| Paver Patio  | 1        | $85.00/sf  |$30,600| [Edit] [Remove] |
| Excavation   | 50 hrs   | $150/hr    | $7,500| [Edit] [Remove] |
|--------------|----------|------------|-------|---------|
| Estimated Total                      |$38,100|         |
```

---

#### Quick Calculator

- [ ] Create `QuickCalculator.tsx`
- [ ] Add service dropdown (load from svc_pricing_configs)
- [ ] Add dynamic pricing variables form
- [ ] Integrate MasterPricingEngine
- [ ] Add "Calculate & Add" button
- [ ] Show calculation breakdown (optional)
- [ ] Add loading state during calculation

**File to Create:**
```
src/components/jobs/wizard/QuickCalculator.tsx
```

**Flow:**
```
Select Service → Fill Variables → Calculate → Add to List
```

---

#### Conflict Warning

- [ ] Create `ConflictWarning.tsx`
- [ ] Display conflict alert (yellow banner)
- [ ] List conflicting jobs (job number, title, dates)
- [ ] Add "View Job" link for each conflict
- [ ] Add "Continue Anyway" button
- [ ] Add "Change Crew/Dates" button

**File to Create:**
```
src/components/jobs/wizard/ConflictWarning.tsx
```

**Example:**
```
⚠ Schedule Conflict Detected
────────────────────────────
Crew Alpha is already assigned to:
• JOB-2025-0038: Driveway Repair (Feb 3-4)
• JOB-2025-0041: Patio Extension (Feb 4-5)

[Change Crew/Dates]  [Continue Anyway]
```

---

## Phase 2: Integration (Week 2)

### 2.1 AI Chat Integration ⏳ TODO

- [ ] Import existing ChatInterface component
- [ ] Implement embedded mode rendering in ServicesStep
- [ ] Create transformation function: ChatResult → ServiceLineItem[]
- [ ] Add chat completion handler
- [ ] Add chat cancel handler
- [ ] Test service extraction accuracy
- [ ] Add error handling for chat failures

**Integration Code:**
```typescript
const handleChatComplete = (chatResult: ChatResult) => {
  const services = transformChatResultToServices(chatResult);
  wizard.setServices(services);
  setShowChat(false);
  toast.success(`Added ${services.length} service(s) from AI chat`);
};
```

**Testing:**
- [ ] Test simple service request
- [ ] Test multiple services request
- [ ] Test complex pricing scenarios
- [ ] Test error cases (invalid input, timeout)

---

### 2.2 Pricing Engine Integration ⏳ TODO

- [ ] Import MasterPricingEngine
- [ ] Load service configs from database
- [ ] Create dynamic pricing variables form
- [ ] Implement calculation handler
- [ ] Map calculation result to ServiceLineItem
- [ ] Add calculation breakdown display (optional)
- [ ] Test all available service types

**Integration Code:**
```typescript
const handleCalculate = async () => {
  const result = await masterPricingEngine.calculatePricing(
    variables,
    variables.sqft,
    serviceName,
    companyId,
    serviceConfigId
  );

  wizard.addService({
    service_config_id: serviceConfigId,
    service_name: serviceName,
    unit_price: result.tier2Results.total,
    total_price: result.tier2Results.total,
    calculation_data: { ... },
    pricing_variables: variables
  });
};
```

**Testing:**
- [ ] Test paver patio calculation
- [ ] Test excavation calculation
- [ ] Test bundled services
- [ ] Test edge cases (zero values, very large values)

---

### 2.3 Customer Service Integration ⏳ TODO

- [ ] Import CustomerManagementService
- [ ] Create inline CustomerModal component
- [ ] Implement customer creation handler
- [ ] Implement auto-selection after creation
- [ ] Implement address auto-fill
- [ ] Add customer search with debouncing
- [ ] Add recent customers list

**Integration Code:**
```typescript
const handleCustomerCreated = async (customerData) => {
  const result = await customerManagementService.createCustomer({
    company_id: companyId,
    created_by_user_id: userId,
    ...customerData
  });

  if (result.success) {
    wizard.setCustomer(result.customer);
    wizard.updateJobDetails({
      service_address: result.customer.customer_address
    });
    wizard.nextStep();
  }
};
```

**Testing:**
- [ ] Test customer creation flow
- [ ] Test address auto-fill
- [ ] Test customer search
- [ ] Test error handling (duplicate customer)

---

### 2.4 Conflict Detection UI ⏳ TODO

- [ ] Implement conflict check on crew/date change
- [ ] Create ConflictWarning component
- [ ] Add conflict resolution options
- [ ] Add "View Conflicting Job" links
- [ ] Test conflict detection accuracy
- [ ] Add loading state during conflict check

**Testing:**
- [ ] Create overlapping test assignments
- [ ] Test conflict detection edge cases
- [ ] Test no conflict scenario
- [ ] Test multiple conflicts

---

## Phase 3: Testing & Polish (Week 3)

### 3.1 Unit Tests ⏳ TODO

#### Hook Tests

- [ ] Test state initialization
- [ ] Test step navigation (forward/backward)
- [ ] Test validation per step
- [ ] Test customer selection
- [ ] Test job details update
- [ ] Test service CRUD operations
- [ ] Test schedule data update
- [ ] Test LocalStorage persistence
- [ ] Test reset functionality

**File to Create:**
```
src/hooks/__tests__/useJobCreationWizard.test.ts
```

---

#### Service Tests

- [ ] Test `createJobFromWizard` success case
- [ ] Test `createJobFromWizard` rollback on failure
- [ ] Test `generateJobNumber` sequential generation
- [ ] Test `generateJobNumber` concurrent calls
- [ ] Test `checkScheduleConflicts` with overlaps
- [ ] Test `checkScheduleConflicts` with no conflicts
- [ ] Test `validateWizardData` validation rules

**File to Create:**
```
src/services/__tests__/JobServiceExtensions.test.ts
```

---

### 3.2 Integration Tests ⏳ TODO

- [ ] Test complete wizard flow (customer → schedule)
- [ ] Test customer selection → address auto-fill
- [ ] Test AI chat → services extraction
- [ ] Test quick calculator → pricing calculation
- [ ] Test inline customer creation
- [ ] Test transaction rollback scenarios
- [ ] Test conflict detection integration
- [ ] Test LocalStorage persistence across refreshes

**File to Create:**
```
src/components/jobs/__tests__/JobCreationWizard.integration.test.tsx
```

**Test Scenarios:**
```typescript
describe('Job Creation Wizard Integration', () => {
  test('Complete flow: customer → job → services → schedule', async () => {
    // ... full wizard execution test
  });

  test('Rollback on service creation failure', async () => {
    // ... rollback test
  });

  test('Schedule conflict detection', async () => {
    // ... conflict test
  });
});
```

---

### 3.3 E2E Tests (Playwright) ⏳ TODO

- [ ] Test wizard open/close
- [ ] Test customer selection flow
- [ ] Test job details entry
- [ ] Test AI chat integration
- [ ] Test quick calculator
- [ ] Test review step
- [ ] Test schedule step with conflicts
- [ ] Test successful job creation
- [ ] Test error scenarios
- [ ] Test mobile responsive behavior

**File to Create:**
```
e2e/job-wizard.spec.ts
```

**Key Test Cases:**
```typescript
test('Create job via AI chat', async ({ page }) => {
  await page.goto('/jobs');
  await page.click('[data-testid="create-job-button"]');
  // ... complete wizard flow
  await expect(page).toHaveURL(/\/jobs\/JOB-2025-\d{4}/);
});
```

---

### 3.4 Accessibility Audit ⏳ TODO

- [ ] Run axe DevTools on all wizard steps
- [ ] Ensure keyboard navigation works (Tab, Enter, Esc)
- [ ] Add ARIA labels to all interactive elements
- [ ] Test with screen reader (NVDA/JAWS)
- [ ] Ensure focus management between steps
- [ ] Add skip links where appropriate
- [ ] Ensure color contrast meets WCAG AA (4.5:1)
- [ ] Test with keyboard-only navigation

**WCAG 2.1 Level AA Checklist:**
- [ ] 1.1.1 Non-text Content (alt text)
- [ ] 1.3.1 Info and Relationships (semantic HTML)
- [ ] 2.1.1 Keyboard (full keyboard access)
- [ ] 2.4.3 Focus Order (logical tab order)
- [ ] 2.4.7 Focus Visible (clear focus indicators)
- [ ] 3.2.2 On Input (no unexpected changes)
- [ ] 3.3.1 Error Identification (clear error messages)
- [ ] 3.3.2 Labels or Instructions (all inputs labeled)
- [ ] 4.1.2 Name, Role, Value (ARIA attributes)

---

### 3.5 Performance Optimization ⏳ TODO

- [ ] Implement debounced auto-save (500ms)
- [ ] Memoize calculated values (estimatedTotal)
- [ ] Lazy load ChatInterface component
- [ ] Lazy load QuickCalculator component
- [ ] Optimize service line items rendering (React.memo)
- [ ] Add request deduplication for conflict checks
- [ ] Profile with React DevTools
- [ ] Measure Lighthouse score (target: 90+)

**Performance Targets:**
- Wizard load time: < 1 second
- Step navigation: < 100ms
- Auto-save delay: 500ms (debounced)
- Job creation: < 3 seconds

---

### 3.6 Error Handling & Edge Cases ⏳ TODO

- [ ] Test network failure scenarios
- [ ] Test concurrent job number generation
- [ ] Test invalid customer ID
- [ ] Test duplicate job creation
- [ ] Test browser back button behavior
- [ ] Test page refresh mid-wizard
- [ ] Test LocalStorage quota exceeded
- [ ] Test very large service lists (100+ items)

**Error Scenarios:**
```
• Network timeout during job creation
• Customer deleted mid-wizard
• Crew deleted mid-scheduling
• Invalid pricing calculation result
• Database constraint violation
```

---

## Phase 4: Production Preparation (Week 4)

### 4.1 Database Setup ⏳ TODO

- [ ] Verify `ops_jobs` table exists with correct schema
- [ ] Verify `ops_job_services` table with CASCADE DELETE
- [ ] Verify `ops_job_assignments` table with CASCADE DELETE
- [ ] Create index on `job_number` for performance
- [ ] Create index on `company_id` for RLS
- [ ] Verify RLS policies for all tables
- [ ] Test RLS policies with different user roles

**SQL Verification:**
```sql
-- Check foreign key constraints
SELECT * FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_name IN ('ops_job_services', 'ops_job_assignments');

-- Check indexes
SELECT * FROM pg_indexes
WHERE tablename IN ('ops_jobs', 'ops_job_services', 'ops_job_assignments');

-- Check RLS policies
SELECT * FROM pg_policies
WHERE tablename IN ('ops_jobs', 'ops_job_services', 'ops_job_assignments');
```

---

### 4.2 Security Review ⏳ TODO

- [ ] Review RLS policies for data isolation
- [ ] Test company_id filtering in all queries
- [ ] Validate input sanitization
- [ ] Check for SQL injection vulnerabilities
- [ ] Review CORS settings
- [ ] Test authentication requirements
- [ ] Review authorization checks
- [ ] Add rate limiting for job creation (if needed)

**Security Checklist:**
- [ ] All queries filter by company_id
- [ ] User permissions validated server-side
- [ ] Sensitive data not exposed in client state
- [ ] No raw SQL queries (parameterized only)
- [ ] File upload validation (if added later)

---

### 4.3 Documentation ⏳ TODO

- [ ] Add JSDoc comments to all public methods
- [ ] Create user guide (how to use wizard)
- [ ] Create developer guide (how to extend)
- [ ] Document API endpoints
- [ ] Create troubleshooting guide
- [ ] Add inline code comments for complex logic
- [ ] Update README with wizard information

**Documentation Files:**
- `docs/user-guide/JOB-CREATION-WIZARD.md`
- `docs/developer-guide/EXTENDING-JOB-WIZARD.md`
- `docs/troubleshooting/COMMON-ISSUES.md`

---

### 4.4 Deployment Preparation ⏳ TODO

- [ ] Create feature flag for wizard (gradual rollout)
- [ ] Set up error monitoring (Sentry)
- [ ] Set up analytics tracking (key events)
- [ ] Create rollback plan
- [ ] Prepare deployment checklist
- [ ] Test in staging environment
- [ ] Perform load testing (concurrent users)

**Analytics Events:**
```typescript
• wizard_opened
• wizard_step_completed (step_number)
• wizard_abandoned (step_number)
• job_created_via_wizard (method: 'ai-chat' | 'calculator' | 'manual')
• wizard_error (error_type, step_number)
```

---

### 4.5 User Acceptance Testing ⏳ TODO

- [ ] Create test scenarios for stakeholders
- [ ] Conduct UAT sessions with 3-5 users
- [ ] Collect feedback on usability
- [ ] Fix critical issues identified
- [ ] Validate business requirements met
- [ ] Get sign-off from product owner

**Test Scenarios:**
```
1. Create a simple quote (1 service)
2. Create a complex job with AI chat (multiple services)
3. Schedule a job with crew assignment
4. Handle schedule conflicts
5. Create customer inline and assign to job
6. Edit services and recalculate totals
7. Navigate backward and change details
8. Abandon wizard and restore from draft
```

---

## Phase 5: Launch & Monitor (Week 5)

### 5.1 Gradual Rollout ⏳ TODO

- [ ] Deploy to staging
- [ ] Enable feature flag for internal team (5% users)
- [ ] Monitor error rates and performance
- [ ] Collect feedback from internal users
- [ ] Fix any critical bugs
- [ ] Expand to 25% of users
- [ ] Monitor for 1 week
- [ ] Expand to 100% (full rollout)

**Rollout Plan:**
```
Week 1: Internal team only (5 users)
Week 2: Beta users (25%)
Week 3: Half of users (50%)
Week 4: All users (100%)
```

---

### 5.2 Monitoring & Alerts ⏳ TODO

- [ ] Set up error rate alerts (> 5%)
- [ ] Set up performance alerts (load time > 2s)
- [ ] Set up success rate tracking
- [ ] Set up user funnel analytics
- [ ] Create dashboard for wizard metrics
- [ ] Set up Slack notifications for errors

**Key Metrics:**
- Jobs created per day
- Wizard completion rate (% who finish)
- Average time to complete wizard
- Step abandonment rates
- Error rate per step
- AI chat success rate
- Calculator usage vs manual entry

---

### 5.3 Post-Launch Support ⏳ TODO

- [ ] Create support documentation
- [ ] Train support team on wizard features
- [ ] Set up feedback collection mechanism
- [ ] Monitor user feedback channels
- [ ] Create bug triage process
- [ ] Plan iteration 1 features (based on feedback)

**Support Resources:**
- In-app help tooltips
- Video tutorial (screen recording)
- FAQ document
- Support ticket system integration

---

## Success Criteria

### Functionality ✅ Definition of Done

- [ ] All 5 wizard steps functional
- [ ] Customer selection with inline creation works
- [ ] AI Chat integration extracts services correctly
- [ ] Quick Calculator calculates accurately
- [ ] Schedule conflict detection works
- [ ] Transaction rollback prevents orphaned data
- [ ] LocalStorage persistence works across refreshes

### Performance ✅ Definition of Done

- [ ] Wizard loads in < 1 second (p95)
- [ ] Step navigation feels instant (< 100ms)
- [ ] Job creation completes in < 3 seconds (p95)
- [ ] Auto-save doesn't block UI (debounced 500ms)
- [ ] No memory leaks (tested with long sessions)

### Usability ✅ Definition of Done

- [ ] Validation messages clear and actionable
- [ ] Backward navigation preserves all data
- [ ] Progress indicator always visible
- [ ] Estimated total updates in real-time
- [ ] Success message displays job number
- [ ] Mobile responsive (works on phone/tablet)

### Reliability ✅ Definition of Done

- [ ] No data loss on browser crash
- [ ] Rollback works on any step failure
- [ ] Conflict warnings are accurate (< 1% false positives)
- [ ] No duplicate job numbers generated (tested with 100 concurrent creates)
- [ ] Error rate < 1% in production

### Accessibility ✅ Definition of Done

- [ ] WCAG 2.1 Level AA compliant
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces all changes
- [ ] Focus management between steps correct
- [ ] Color contrast meets 4.5:1 ratio

---

## Risk Management

### High Risk Items 🔴

1. **Transaction Rollback Failures**
   - Risk: Job created but services fail, leaving orphaned record
   - Mitigation: Extensive testing, CASCADE DELETE constraints, rollback logic
   - Status: Mitigated ✅

2. **Schedule Conflict False Positives**
   - Risk: Incorrectly detecting conflicts, blocking valid schedules
   - Mitigation: Thorough testing of overlap logic, user override option
   - Status: To Test ⏳

3. **Performance Issues with Large Service Lists**
   - Risk: UI becomes slow with 100+ services
   - Mitigation: Virtualization, pagination, memoization
   - Status: To Test ⏳

### Medium Risk Items 🟡

4. **LocalStorage Quota Exceeded**
   - Risk: Can't save wizard state, user loses progress
   - Mitigation: Compress JSON, clear old drafts, fallback to IndexedDB
   - Status: To Implement ⏳

5. **Concurrent Job Number Generation**
   - Risk: Two jobs get same number
   - Mitigation: Database-level ordering, unique constraint
   - Status: Mitigated ✅

### Low Risk Items 🟢

6. **Browser Back Button Behavior**
   - Risk: Unexpected navigation breaks wizard flow
   - Mitigation: History API management, confirmation prompt
   - Status: To Implement ⏳

---

## Next Steps (Immediate)

1. ✅ **Complete Phase 1: Foundation**
   - State management hook ✅
   - Service layer extensions ✅
   - Architecture documentation ✅

2. ⏳ **Start Phase 2: UI Implementation**
   - Create main wizard container
   - Implement Step 1 (Customer Selection)
   - Implement Step 2 (Job Details)

3. ⏳ **Begin Testing Framework**
   - Set up Jest + React Testing Library
   - Write first unit tests for hook
   - Set up Playwright for E2E

---

## Resources

### Architecture Documents ✅
- `docs/architecture/JOB-WIZARD-ARCHITECTURE.md` (Complete design)
- `docs/architecture/JOB-WIZARD-QUICK-REFERENCE.md` (Quick guide)
- `docs/architecture/JOB-WIZARD-VISUAL-SUMMARY.md` (Visual diagrams)

### Implementation Files ✅
- `src/hooks/useJobCreationWizard.ts` (State management)
- `src/services/JobServiceExtensions.ts` (Backend methods)

### Testing Resources ⏳
- Jest documentation: https://jestjs.io/
- React Testing Library: https://testing-library.com/react
- Playwright: https://playwright.dev/

### Accessibility Resources ⏳
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
- axe DevTools: https://www.deque.com/axe/devtools/
- ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/

---

**Document Status:** ✅ Complete
**Last Updated:** October 24, 2025
**Next Review:** Start of Phase 2 Implementation
