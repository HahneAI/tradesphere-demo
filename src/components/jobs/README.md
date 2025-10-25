# Job Creation Wizard - Implementation Guide

## Overview

The Job Creation Wizard is a production-ready, 5-step guided workflow for creating jobs in the TradeSphere CRM. It provides an intuitive interface for customer selection, job configuration, service pricing, review, and optional crew scheduling.

## Features

- **5-Step Workflow**: Customer → Details → Services → Review → Schedule
- **State Management**: Uses `useJobCreationWizard` hook with LocalStorage persistence
- **Validation**: Multi-layer validation with inline error display
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation
- **Service Integration**:
  - AI Chat for intelligent pricing
  - Quick Calculator for formula-based pricing
  - Manual entry for custom services
- **Conflict Detection**: Schedule conflict warnings for crew assignments
- **Dark Mode**: Full dark mode support

## File Structure

```
src/components/jobs/
├── JobCreationWizard.tsx           # Main container component
├── WIZARD_USAGE_EXAMPLE.tsx        # Integration examples
├── README.md                        # This file
└── wizard/
    ├── index.ts                     # Export file
    ├── WizardProgressIndicator.tsx  # Step progress display
    ├── WizardNavigation.tsx         # Navigation controls
    ├── CustomerSelectionStep.tsx    # Step 1: Customer selection
    ├── JobDetailsStep.tsx           # Step 2: Job information
    ├── ServicesStep.tsx             # Step 3: Service configuration
    ├── ReviewStep.tsx               # Step 4: Review summary
    ├── ScheduleStep.tsx             # Step 5: Crew scheduling
    └── components/
        ├── CustomerCard.tsx         # Customer selection card
        ├── PrioritySelector.tsx     # Priority level selector
        ├── ServiceLineItem.tsx      # Service table row
        └── ConflictWarning.tsx      # Schedule conflict display
```

## Quick Start

### Basic Usage

```tsx
import React, { useState } from 'react';
import { JobCreationWizard } from '@/components/jobs/JobCreationWizard';

const JobsPage: React.FC = () => {
  const [showWizard, setShowWizard] = useState(false);

  // Get from your auth context
  const { companyId, userId } = useAuth();

  return (
    <div>
      <button onClick={() => setShowWizard(true)}>
        Create Job
      </button>

      <JobCreationWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        companyId={companyId}
        userId={userId}
      />
    </div>
  );
};
```

### With Pre-selected Customer

```tsx
<JobCreationWizard
  isOpen={showWizard}
  onClose={() => setShowWizard(false)}
  companyId={companyId}
  userId={userId}
  initialCustomerId="customer-uuid"  // Pre-select customer
/>
```

## Component Documentation

### JobCreationWizard (Main Container)

**Props:**
```typescript
interface JobCreationWizardProps {
  isOpen: boolean;              // Control visibility
  onClose: () => void;          // Called when wizard closes
  companyId: string;            // Company context
  userId: string;               // User performing action
  initialCustomerId?: string;   // Optional: pre-select customer
}
```

**State Management:**
- Uses `useJobCreationWizard` hook
- Auto-saves progress to LocalStorage
- Validates each step before progression
- Supports back navigation with state preservation

**Key Features:**
- Close confirmation when unsaved changes exist
- Real-time validation feedback
- Loading states during submission
- Error recovery with detailed messages

### Step 1: CustomerSelectionStep

**Features:**
- Debounced search (300ms delay)
- Recent customers display
- Customer creation inline (no wizard dismissal)
- Auto-population of address to Step 2

**Integration:**
```tsx
const handleCustomerSelect = (customer: CustomerProfile) => {
  wizard.setCustomer(customer);
  wizard.nextStep(); // Auto-advance to Step 2
};
```

### Step 2: JobDetailsStep

**Features:**
- Job title, address, city, state, ZIP
- Description (500 character limit)
- Priority selector (Low/Normal/High/Urgent)
- Requested start date
- Address auto-populated from customer

**Validation:**
- Title: Required, min 3 characters
- Address: Required
- Priority: Required (default: Normal)

### Step 3: ServicesStep

**Service Input Methods:**
1. **AI Chat**: Describe project, AI calculates pricing
2. **Quick Calculator**: Formula-based pricing (integrated with MasterPricingEngine)
3. **Manual Entry**: Direct input of service details

**Features:**
- Services table with add/remove functionality
- Real-time total calculation
- Source tracking (AI/Calculator/Manual)
- Empty state messaging

**Integration Points:**
```tsx
// AI Chat integration (optional)
onOpenAIChat={() => {
  // Open ChatInterface component
  // On completion, extract services and add to wizard
}}

// Quick Calculator integration (optional)
onOpenCalculator={() => {
  // Open pricing calculator
  // On completion, add calculated service to wizard
}}
```

### Step 4: ReviewStep

**Features:**
- Collapsible sections for Customer, Details, Services
- Edit buttons to return to previous steps
- Total pricing summary
- Two action options:
  - Save as Quote (skip scheduling)
  - Schedule Job (proceed to Step 5)

**Data Display:**
- Customer: Name, email, phone
- Job: Title, address, priority, requested date
- Services: List with quantities and prices

### Step 5: ScheduleStep

**Features:**
- Crew selection dropdown
- Start/end date-time pickers
- Estimated hours input
- Assignment notes
- Conflict detection with visual warnings
- Skip scheduling option

**Conflict Detection:**
- Real-time conflict checking
- Display conflicting job details
- Allow proceeding despite conflicts

**Empty State:**
- "No crews available" message
- Skip scheduling button
- Link to crew creation (optional)

## State Management

### useJobCreationWizard Hook

**Configuration:**
```typescript
const wizard = useJobCreationWizard({
  companyId: string;              // Required
  userId: string;                 // Required
  enableLocalStorage: true;       // Default: false
  validateOnStepChange: true;     // Default: true
  requireScheduling: false;       // Default: false
});
```

**API:**
```typescript
// Navigation
wizard.nextStep();
wizard.prevStep();
wizard.goToStep(stepNumber);

// Data Management
wizard.setCustomer(customer);
wizard.updateJobDetails(updates);
wizard.addService(service);
wizard.removeService(index);
wizard.setSchedule(schedule);

// Computed Values
wizard.estimatedTotal;
wizard.serviceCount;
wizard.canGoNext;
wizard.canGoBack;

// Validation
wizard.validateCurrentStep();
wizard.errors;

// Completion
wizard.markCompleted(jobId);
wizard.reset();
```

## Service Layer Integration

### Job Creation

The wizard uses `JobServiceExtensions.createJobFromWizard()` for atomic job creation:

```typescript
// Executed when user clicks "Create Job"
const result = await jobServiceWizardExtensions.createJobFromWizard({
  company_id,
  customer_id,
  title,
  service_address,
  priority,
  status: 'quote' | 'approved' | 'scheduled',
  services: [...],
  assignment: {...}, // Optional
  created_by_user_id
});

// Returns: { job, services, assignmentId }
```

**Atomic Transaction:**
1. Validates customer exists
2. Generates job number (JOB-2025-0042)
3. Creates job record
4. Creates all service records
5. Creates assignment (if provided)
6. **Rollback on any failure**

### Schedule Conflict Detection

```typescript
const conflicts = await jobServiceWizardExtensions.checkScheduleConflicts(
  crewId,
  scheduledStart,
  scheduledEnd
);

// Returns array of conflicting assignments
```

## Styling & Theming

### Tailwind Classes

The wizard uses a consistent design system:

```tsx
// Primary Colors
bg-blue-500          // Primary actions
bg-green-500         // Success/completed
bg-orange-500        // Warnings/conflicts
bg-red-500           // Errors/urgent

// Layout
rounded-lg           // Standard border radius
shadow-md            // Standard elevation
border-gray-200      // Standard borders
```

### Dark Mode

All components support dark mode via `dark:` prefixes:

```tsx
className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
```

## Validation Rules

### Step 1 (Customer)
- Customer must be selected
- Cannot proceed without selection

### Step 2 (Job Details)
- Title: Required, min 3 characters
- Service Address: Required
- Priority: Required (0-10)

### Step 3 (Services)
- At least one service required
- Each service must have:
  - Name (required)
  - Valid unit price (> 0)
  - Valid total price (> 0)

### Step 4 (Review)
- Always valid (informational only)

### Step 5 (Schedule)
- Optional step
- If scheduling:
  - Crew required
  - Start date required
  - End date required
  - End must be after start

## Accessibility Features

### Keyboard Navigation
- **Tab**: Navigate between fields
- **Enter**: Submit current step / Select item
- **Escape**: Close wizard (with confirmation)
- **Arrow Keys**: Navigate priority options

### Screen Reader Support
- ARIA labels on all interactive elements
- Role attributes for navigation
- Live regions for status updates
- Descriptive button labels

### Focus Management
- Focus trap within modal
- Restore focus on close
- Visible focus indicators

## Error Handling

### Validation Errors
```tsx
// Displayed inline below fields
{errors.title && (
  <p className="text-sm text-red-600">
    {errors.title}
  </p>
)}
```

### Service Errors
```tsx
// Displayed in error banner
{submitError && (
  <div className="bg-red-50 border border-red-200 p-4">
    <p className="text-red-800">{submitError}</p>
  </div>
)}
```

### Network Errors
- Retry button on failures
- Detailed error messages
- Loading states during operations

## Performance Optimization

### Debouncing
- Customer search: 300ms
- Service total calculation: Memoized

### Code Splitting
- Wizard loads only when opened
- ChatInterface lazy-loaded (if used)

### Memoization
```typescript
const estimatedTotal = useMemo(() => {
  return services.reduce((sum, svc) => sum + svc.total_price, 0);
}, [services]);
```

## Testing

### Unit Tests
```bash
# Component tests
npm test src/components/jobs/wizard

# Hook tests
npm test src/hooks/useJobCreationWizard
```

### Integration Tests
```bash
# Full wizard flow
npm test src/components/jobs/JobCreationWizard.integration.test.tsx
```

### E2E Tests (Playwright)
```bash
# Wizard user flows
npx playwright test wizard
```

## Troubleshooting

### Wizard doesn't open
- Check `isOpen` prop is `true`
- Verify z-index not conflicting with other modals

### Services not saving
- Check `companyId` and `userId` are valid UUIDs
- Verify JobServiceExtensions is properly imported
- Check Supabase connection

### Validation errors
- Review step validation logic in `useJobCreationWizard`
- Check error messages in `wizard.errors`

### Dark mode issues
- Ensure `dark` class on root element
- Check Tailwind dark mode configuration

## Future Enhancements

### Planned Features
- [ ] Template-based job creation
- [ ] Bulk service import from CSV
- [ ] Recurring job scheduling
- [ ] Multiple crew assignments
- [ ] Customer approval workflow
- [ ] Quote PDF generation
- [ ] Email notifications

### Integration Opportunities
- Calendar view for scheduling
- Document attachments
- Before/after photos
- Customer portal integration

## Support

For issues or questions:
1. Check existing documentation
2. Review WIZARD_USAGE_EXAMPLE.tsx
3. Consult JOB-WIZARD-ARCHITECTURE.md
4. Contact development team

## License

Internal use only - TradeSphere CRM
