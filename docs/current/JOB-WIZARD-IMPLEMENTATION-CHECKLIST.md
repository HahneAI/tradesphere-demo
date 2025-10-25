# Job Wizard Implementation Checklist

Step-by-step checklist for implementing the 5-step Job Creation Wizard using the provided type system.

---

## Prerequisites

- [ ] TypeScript 5.0+ installed
- [ ] Zod package installed (`npm install zod`)
- [ ] Review `JOB-WIZARD-README.md` for complete documentation
- [ ] Review `job-wizard.examples.ts` for usage patterns
- [ ] Understand existing CRM types in `src/types/crm.ts`

---

## Phase 1: Setup & Infrastructure

### 1.1 Install Dependencies

- [ ] Verify zod is installed: `npm list zod`
- [ ] If not installed: `npm install zod`
- [ ] Verify TypeScript version: `npx tsc --version`

### 1.2 Import Types

- [ ] Import wizard types in your component:
  ```typescript
  import {
    JobWizardState,
    CustomerSelectionData,
    JobDetailsData,
    ServicesData,
    ReviewData,
    ScheduleData,
    generateTempId,
    calculateProgress,
    canNavigateToStep,
  } from '@/types/job-wizard';
  ```

- [ ] Import validation schemas:
  ```typescript
  import {
    validateStepData,
    safeParse,
  } from '@/types/job-wizard-schemas';
  ```

- [ ] Import examples for reference:
  ```typescript
  import { examples } from '@/types/job-wizard.examples';
  ```

### 1.3 State Management Setup

- [ ] Choose state management solution (React Context, Zustand, Redux, etc.)
- [ ] Create wizard state store/context
- [ ] Initialize wizard state with `createNewWizardSession()`
- [ ] Set up state persistence (optional - localStorage, sessionStorage)

---

## Phase 2: Step 1 - Customer Selection

### 2.1 UI Components

- [ ] Create `CustomerSelectionStep.tsx` component
- [ ] Add mode selector (existing | create-new | from-chat)
- [ ] Create customer search UI (for 'existing' mode)
- [ ] Create customer creation form (for 'create-new' mode)
- [ ] Create chat import UI (for 'from-chat' mode)

### 2.2 Data Handling

- [ ] Implement customer search functionality
- [ ] Integrate with `CustomerManagementService`
- [ ] Handle duplicate customer detection
- [ ] Implement chat data import from `ChatInterface`
- [ ] Show recently viewed customers

### 2.3 Validation

- [ ] Validate on mode change
- [ ] Validate required fields based on mode
- [ ] Show field-level validation errors
- [ ] Disable "Next" button if invalid
- [ ] Use `validateStepData<CustomerSelectionData>(1, data)`

### 2.4 Example Implementation

```typescript
const handleNext = () => {
  const result = validateStepData<CustomerSelectionData>(1, customerData);

  if (result.success) {
    updateWizardState({
      customerData: result.data,
      currentStep: 2,
    });
  } else {
    setValidationErrors(result.errors);
  }
};
```

---

## Phase 3: Step 2 - Job Details

### 3.1 UI Components

- [ ] Create `JobDetailsStep.tsx` component
- [ ] Add job title input (required, min 3 chars)
- [ ] Add description textarea (optional)
- [ ] Add priority selector (low | normal | high | urgent)
- [ ] Add tags input (multi-select or chips)

### 3.2 Location Section

- [ ] Add "Use customer address" checkbox
- [ ] Add service address fields (street, city, state, zip)
- [ ] Add location notes textarea
- [ ] Add map integration (optional)
- [ ] Auto-populate from customer address if checkbox enabled

### 3.3 Scheduling Section

- [ ] Add requested start date picker
- [ ] Add scheduled start date picker
- [ ] Add scheduled end date picker
- [ ] Add quote validity date picker
- [ ] Add scheduling notes textarea
- [ ] Validate end date is after start date

### 3.4 Validation

- [ ] Validate required fields (title, priority)
- [ ] Validate date ranges
- [ ] Validate address if not using customer address
- [ ] Show real-time validation feedback
- [ ] Use `validateStepData<JobDetailsData>(2, data)`

### 3.5 Priority Conversion

- [ ] Convert priority label to numeric (0-10) for database
- [ ] Use `getPriorityNumber()` helper
- [ ] Store both `priority` and `priorityNumeric` in state

---

## Phase 4: Step 3 - Services Configuration

### 4.1 UI Components

- [ ] Create `ServicesStep.tsx` component
- [ ] Add "Add Service" button
- [ ] Create service line item component
- [ ] Add service source indicator (AI Chat | Quick Calculator | Manual)
- [ ] Add service quantity, price inputs
- [ ] Add optional checkbox for each service
- [ ] Add drag-to-reorder functionality

### 4.2 Service Addition Methods

**From Quick Calculator:**
- [ ] Integrate with Quick Calculator component
- [ ] Get `PricingEngineResult` from `MasterPricingEngine`
- [ ] Convert to `ServiceLineItem` format
- [ ] Set `source: 'quick-calculator'`
- [ ] Set `calculationMethod: 'master-pricing-engine'`

**From AI Chat:**
- [ ] Extract services from `ChatInterfaceResult`
- [ ] Convert `ChatServiceExtraction` to `ServiceLineItem`
- [ ] Set `source: 'ai-chat'`
- [ ] Set `calculationMethod: 'ai-estimation'`

**Manual Entry:**
- [ ] Allow manual price entry
- [ ] Set `source: 'manual'`
- [ ] Set `calculationMethod: 'manual-entry'`

### 4.3 Calculation Integration

- [ ] Call `MasterPricingEngine.calculatePricing()` for each service
- [ ] Store complete `ServiceCalculationData` in `calculationData` field
- [ ] Store input values in `pricingVariables` field
- [ ] Preserve calculation metadata (confidence, timestamp)
- [ ] Show calculation breakdown to user

### 4.4 Services Summary

- [ ] Calculate `totalEstimated` (sum of all service totals)
- [ ] Calculate `totalLaborCost` (sum of all labor costs)
- [ ] Calculate `totalMaterialCost` (sum of all material costs)
- [ ] Create `ServicesCalculationSummary` object
- [ ] Display summary to user

### 4.5 Validation

- [ ] Validate at least one service exists
- [ ] Validate each service has valid pricing
- [ ] Validate total matches sum of services
- [ ] Use `validateStepData<ServicesData>(3, data)`

### 4.6 Temporary IDs

- [ ] Use `generateTempId()` for new services
- [ ] Track services by tempId until database insert
- [ ] Convert tempId to real ID after submission

---

## Phase 5: Step 4 - Review & Confirmation

### 5.1 UI Components

- [ ] Create `ReviewStep.tsx` component
- [ ] Display customer summary (read-only)
- [ ] Display job details summary (read-only)
- [ ] Display services list with pricing (read-only)
- [ ] Display pricing breakdown (read-only)
- [ ] Add "Edit" buttons for each section

### 5.2 Review Summaries

**Customer Summary:**
- [ ] Show customer name, email, phone, address
- [ ] Show "New Customer" badge if applicable
- [ ] Link to Step 1 for editing

**Job Summary:**
- [ ] Show job title, priority, service address
- [ ] Show scheduled dates
- [ ] Show tags
- [ ] Link to Step 2 for editing

**Services Summary:**
- [ ] Show each service with name, quantity, price
- [ ] Mark optional services
- [ ] Show subtotals
- [ ] Link to Step 3 for editing

**Pricing Summary:**
- [ ] Show labor cost
- [ ] Show material cost
- [ ] Show other costs (obstacles, equipment)
- [ ] Show subtotal
- [ ] Show profit amount and margin %
- [ ] Show grand total
- [ ] Show estimated duration in days

### 5.3 Confirmations (Required)

- [ ] Add "Pricing is accurate" checkbox (required)
- [ ] Add "Customer information is correct" checkbox (required)
- [ ] Add "Scope of work is correct" checkbox (required)
- [ ] Add "Send quote to customer" checkbox (optional)
- [ ] Disable "Next" button until all required confirmations checked
- [ ] Use Zod literal `true` validation to enforce

### 5.4 Additional Notes

- [ ] Add textarea for additional notes
- [ ] Show character count
- [ ] Max 2000 characters

### 5.5 Validation

- [ ] Validate all confirmations are true
- [ ] Use `validateStepData<ReviewData>(4, data)`
- [ ] Show error if confirmations not checked

---

## Phase 6: Step 5 - Schedule & Crew Assignment (Optional)

### 6.1 UI Components

- [ ] Create `ScheduleStep.tsx` component
- [ ] Add "Schedule now" checkbox
- [ ] Create crew assignment form (shown if "Schedule now" checked)
- [ ] Add crew selector dropdown
- [ ] Add date/time pickers for start and end
- [ ] Add estimated hours input
- [ ] Add assignment notes textarea

### 6.2 Skip Scheduling Option

- [ ] Allow user to skip scheduling (uncheck "Schedule now")
- [ ] Clear crew assignments if unchecked
- [ ] Show message: "Job will be created without crew assignment"
- [ ] Allow proceeding to submission

### 6.3 Crew Assignment

- [ ] Load available crews from database
- [ ] Check crew availability during selected time
- [ ] Detect schedule conflicts
- [ ] Allow multiple crew assignments (multi-day jobs)
- [ ] Calculate total estimated hours
- [ ] Generate temporary IDs for assignments

### 6.4 Validation

- [ ] If `scheduleNow === true`, require at least one crew assignment
- [ ] Validate scheduled end is after start
- [ ] Validate estimated hours is positive
- [ ] Use `validateStepData<ScheduleData>(5, data)`

---

## Phase 7: Submission & Database Integration

### 7.1 Pre-Submission Validation

- [ ] Validate all steps are complete
- [ ] Run final validation on complete wizard state
- [ ] Show summary of what will be created
- [ ] Add confirmation dialog

### 7.2 Customer Creation (if new)

- [ ] Check if customer needs to be created (`selectionMode === 'create-new'`)
- [ ] Call `CustomerManagementService.create()`
- [ ] Handle duplicate detection
- [ ] Get created customer ID
- [ ] Update wizard state with customer ID

### 7.3 Job Creation

- [ ] Convert wizard state to `CreateJobInput`
  ```typescript
  const jobInput = convertWizardStateToJobInput(
    wizardState,
    customerId,
    companyId,
    userId
  );
  ```
- [ ] Submit to database (Supabase `ops_jobs` table)
- [ ] Get created job ID

### 7.4 Service Creation

- [ ] For each service in `servicesData.services`:
  - [ ] Convert to `CreateJobServiceInput`
  - [ ] Set `job_id` to created job ID
  - [ ] Insert into `ops_job_services` table
  - [ ] Preserve `calculation_data` JSONB field
  - [ ] Preserve `pricing_variables` JSONB field

### 7.5 Crew Assignment Creation (if scheduled)

- [ ] Check if `scheduleData.scheduleNow === true`
- [ ] For each crew assignment:
  - [ ] Convert to database format
  - [ ] Set `job_id` to created job ID
  - [ ] Insert into `ops_job_assignments` table

### 7.6 Success Handling

- [ ] Show success message
- [ ] Redirect to job details page
- [ ] Clear wizard state
- [ ] Optionally send quote email to customer

### 7.7 Error Handling

- [ ] Catch database errors
- [ ] Show user-friendly error messages
- [ ] Allow user to retry or go back
- [ ] Preserve wizard state on error
- [ ] Log errors for debugging

---

## Phase 8: Polish & UX

### 8.1 Progress Indicator

- [ ] Show step progress (Step 1 of 5)
- [ ] Show percentage complete
- [ ] Use `calculateProgress(wizardState)`
- [ ] Highlight current step
- [ ] Show completed steps with checkmarks

### 8.2 Navigation

- [ ] Add "Back" button (disabled on step 1)
- [ ] Add "Next" button (disabled if validation fails)
- [ ] Add "Submit" button (only on step 5)
- [ ] Allow clicking on completed steps to jump back
- [ ] Prevent skipping incomplete steps
- [ ] Use `canNavigateToStep()` helper

### 8.3 Validation Feedback

- [ ] Show inline error messages below fields
- [ ] Add red border to invalid fields
- [ ] Show success checkmarks on valid fields
- [ ] Add toast notifications for step completion
- [ ] Clear errors when field is corrected

### 8.4 Autosave (Optional)

- [ ] Save wizard state to localStorage after each step
- [ ] Restore wizard state on page reload
- [ ] Show "Draft saved" indicator
- [ ] Add "Discard draft" option
- [ ] Clear draft after successful submission

### 8.5 Mobile Optimization

- [ ] Make wizard responsive
- [ ] Stack form fields vertically on mobile
- [ ] Use mobile-friendly date/time pickers
- [ ] Add swipe gestures for navigation (optional)
- [ ] Test on various screen sizes

### 8.6 Accessibility

- [ ] Add ARIA labels to all form inputs
- [ ] Add keyboard navigation support
- [ ] Add focus management (focus first field on step load)
- [ ] Add screen reader announcements for step changes
- [ ] Test with screen readers

---

## Phase 9: Testing

### 9.1 Unit Tests

- [ ] Test wizard state initialization
- [ ] Test step data validation
- [ ] Test helper functions (generateTempId, calculateProgress, etc.)
- [ ] Test type guards
- [ ] Test conversion functions (convertWizardStateToJobInput)
- [ ] Run: `npm test src/types/job-wizard.test.ts`

### 9.2 Integration Tests

- [ ] Test complete wizard flow (Step 1 → 5)
- [ ] Test each customer selection mode
- [ ] Test service addition from different sources
- [ ] Test schedule skip vs. schedule now
- [ ] Test validation at each step
- [ ] Test database submission

### 9.3 Edge Cases

- [ ] Test with missing optional fields
- [ ] Test with maximum field lengths
- [ ] Test with special characters in inputs
- [ ] Test with invalid dates (past dates, end before start)
- [ ] Test with 0 services (should fail validation)
- [ ] Test with duplicate services
- [ ] Test with crew schedule conflicts

### 9.4 User Acceptance Testing

- [ ] Test with real users
- [ ] Gather feedback on UX
- [ ] Test on different devices
- [ ] Test on different browsers
- [ ] Verify all happy paths work
- [ ] Verify error handling works

---

## Phase 10: Documentation & Deployment

### 10.1 Code Documentation

- [ ] Add JSDoc comments to wizard components
- [ ] Document custom hooks
- [ ] Document validation logic
- [ ] Document integration points

### 10.2 User Documentation

- [ ] Create user guide for wizard
- [ ] Add tooltips to form fields
- [ ] Add help text for complex fields
- [ ] Create video tutorial (optional)

### 10.3 Deployment Checklist

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No console errors/warnings
- [ ] Accessibility audit passed
- [ ] Performance audit passed
- [ ] Database migrations applied
- [ ] Environment variables configured

### 10.4 Monitoring

- [ ] Add analytics tracking for each step
- [ ] Track wizard completion rate
- [ ] Track abandonment at each step
- [ ] Track validation errors
- [ ] Track submission errors
- [ ] Set up error monitoring (Sentry, etc.)

---

## Quick Reference Commands

```bash
# Install dependencies
npm install zod

# Type check
npx tsc --noEmit

# Run tests
npm test src/types/job-wizard.test.ts

# Build project
npm run build

# Start dev server
npm run dev
```

---

## Example Component Structure

```typescript
// src/components/JobWizard/JobWizard.tsx
import { useState } from 'react';
import { JobWizardState, createNewWizardSession } from '@/types/job-wizard';

export function JobWizard() {
  const [wizardState, setWizardState] = useState<JobWizardState>(
    createNewWizardSession(userId, companyId)
  );

  const handleNext = () => {
    // Validate current step
    // Update state
    // Navigate to next step
  };

  return (
    <div>
      <ProgressIndicator state={wizardState} />

      {wizardState.currentStep === 1 && (
        <CustomerSelectionStep
          data={wizardState.customerData}
          onNext={handleNext}
        />
      )}

      {wizardState.currentStep === 2 && (
        <JobDetailsStep
          data={wizardState.jobDetailsData}
          onNext={handleNext}
        />
      )}

      {/* ... other steps ... */}
    </div>
  );
}
```

---

## Resources

### Documentation
- `JOB-WIZARD-README.md` - Complete documentation
- `JOB-WIZARD-QUICK-REFERENCE.md` - Quick reference
- `JOB-WIZARD-TYPE-ARCHITECTURE.md` - Architecture diagrams
- `JOB-WIZARD-SUMMARY.md` - Implementation summary

### Code Files
- `job-wizard.ts` - Type definitions
- `job-wizard-schemas.ts` - Validation schemas
- `job-wizard.examples.ts` - Usage examples
- `job-wizard.test.ts` - Test suite

### External Dependencies
- Zod documentation: https://zod.dev
- TypeScript documentation: https://www.typescriptlang.org/docs/

---

## Support

If you encounter issues:

1. Review the examples in `job-wizard.examples.ts`
2. Check the README for detailed explanations
3. Run the test suite to verify type system works
4. Review existing CRM types for integration patterns
5. Contact the development team

---

**Good luck with your implementation!**

This checklist represents approximately 40-60 hours of development work for a complete, production-ready Job Creation Wizard.
