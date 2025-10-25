# Job Wizard Types - Quick Reference Card

## Import Types

```typescript
import {
  // State Management
  JobWizardState,
  WizardStep,
  WizardMetadata,

  // Step Data
  CustomerSelectionData,
  JobDetailsData,
  ServicesData,
  ReviewData,
  ScheduleData,

  // Service Types
  ServiceLineItem,
  ServiceCalculation,
  PricingVariables,

  // Validation
  ValidationResult,
  ValidationError,

  // Helper Functions
  generateTempId,
  calculateProgress,
  canNavigateToStep,
  convertWizardStateToJobInput,

  // Type Guards
  isCustomerSelectionData,
  isServicesData,
  isReviewData,
} from './job-wizard';

// Validation Schemas
import {
  customerSelectionDataSchema,
  jobDetailsDataSchema,
  servicesDataSchema,
  reviewDataSchema,
  scheduleDataSchema,
  validateStepData,
  safeParse,
} from './job-wizard-schemas';

// Examples
import {
  examples,
  createNewWizardSession,
} from './job-wizard.examples';
```

## Common Patterns

### Initialize Wizard

```typescript
const wizardState = createNewWizardSession(userId, companyId);
```

### Validate Step

```typescript
const result = validateStepData<JobDetailsData>(2, data);
if (result.success) {
  // ✅ Valid
  saveStepData(result.data);
} else {
  // ❌ Invalid
  showErrors(result.errors);
}
```

### Check Navigation

```typescript
if (canNavigateToStep(3, wizardState)) {
  navigateToStep(3);
}
```

### Generate Temp ID

```typescript
const serviceItem = {
  tempId: generateTempId(),
  // ... other fields
};
```

### Convert to Job Input

```typescript
const jobInput = convertWizardStateToJobInput(
  wizardState,
  customerId,
  companyId,
  userId
);
```

## Type Signatures

### Step 1: Customer Selection

```typescript
type CustomerSelectionMode = 'existing' | 'create-new' | 'from-chat';

interface CustomerSelectionData {
  selectionMode: CustomerSelectionMode;
  selectedCustomer?: CustomerProfile;      // For 'existing'
  newCustomerData?: CreateCustomerInput;   // For 'create-new'
  chatImportData?: ChatCustomerImport;     // For 'from-chat'
}
```

### Step 2: Job Details

```typescript
interface JobDetailsData {
  title: string;
  priority: JobPriority;
  priorityNumeric: number;
  location: JobLocationData;
  scheduling: JobSchedulingData;
  tags: string[];
}
```

### Step 3: Services

```typescript
interface ServicesData {
  services: ServiceLineItem[];
  totalEstimated: number;
  calculationSummary: ServicesCalculationSummary;
}

interface ServiceLineItem {
  tempId: string;
  serviceConfigId: string;
  serviceName: string;
  unitPrice: number;
  totalPrice: number;
  source: 'ai-chat' | 'quick-calculator' | 'manual' | 'template';
  calculation: ServiceCalculation;
}
```

### Step 4: Review

```typescript
interface ReviewData {
  customerSummary: CustomerReviewSummary;
  jobSummary: JobReviewSummary;
  servicesSummary: ServicesReviewSummary;
  pricingSummary: PricingReviewSummary;
  confirmations: ReviewConfirmations;
}

interface ReviewConfirmations {
  pricingConfirmed: true;        // Must be true
  customerInfoConfirmed: true;   // Must be true
  scopeConfirmed: true;          // Must be true
  sendQuoteToCustomer: boolean;
}
```

### Step 5: Schedule

```typescript
interface ScheduleData {
  scheduleNow: boolean;
  crewAssignments: CrewAssignmentData[];
}
```

## Validation Examples

### Step 1: Customer

```typescript
// Valid: Existing customer
const data1: CustomerSelectionData = {
  selectionMode: 'existing',
  selectedCustomer: customer,
};

// Valid: New customer
const data2: CustomerSelectionData = {
  selectionMode: 'create-new',
  newCustomerData: {
    company_id: 'uuid',
    customer_name: 'John Doe',
    customer_email: 'john@example.com',
    created_by_user_id: 'uuid',
  },
};

// Validate
const result = safeParse(customerSelectionDataSchema, data1);
```

### Step 2: Job Details

```typescript
const jobDetails: JobDetailsData = {
  title: 'Backyard Paver Patio',
  priority: 'high',
  priorityNumeric: 7,
  location: {
    serviceAddress: '123 Main St',
    serviceCity: 'Springfield',
    serviceState: 'IL',
    serviceZip: '62701',
    useCustomerAddress: true,
  },
  scheduling: {
    scheduledStartDate: '2025-04-20',
    scheduledEndDate: '2025-04-22',
  },
  tags: ['paver-patio', 'residential'],
};

// Validate
const result = validateStepData<JobDetailsData>(2, jobDetails);
```

### Step 3: Services

```typescript
const service: ServiceLineItem = {
  tempId: generateTempId(),
  serviceConfigId: 'service-uuid',
  serviceName: 'Paver Patio Installation',
  quantity: 1,
  unitPrice: 7250.00,
  totalPrice: 7250.00,
  source: 'quick-calculator',
  calculation: {
    calculationMethod: 'master-pricing-engine',
    calculationData: pricingResult,
    pricingVariables: { paverPatio: inputValues },
    confidence: 0.95,
    calculatedAt: new Date().toISOString(),
  },
  isOptional: false,
  displayOrder: 1,
};

const servicesData: ServicesData = {
  services: [service],
  totalEstimated: 7250.00,
  totalLaborCost: 1440.00,
  totalMaterialCost: 3066.00,
  calculationSummary: {
    serviceCount: 1,
    grandTotal: 7250.00,
    // ... other summary fields
  },
};

// Validate
const result = validateStepData<ServicesData>(3, servicesData);
```

### Step 4: Review

```typescript
const reviewData: ReviewData = {
  customerSummary: {
    customerName: 'John Smith',
    isNewCustomer: false,
  },
  jobSummary: {
    title: 'Backyard Paver Patio',
    priority: 'high',
    serviceAddress: '123 Main St, Springfield, IL 62701',
  },
  servicesSummary: {
    services: [/* ... */],
    totalServices: 1,
  },
  pricingSummary: {
    grandTotal: 7250.00,
    profitMarginPercentage: 20.0,
  },
  confirmations: {
    pricingConfirmed: true,
    customerInfoConfirmed: true,
    scopeConfirmed: true,
    sendQuoteToCustomer: true,
  },
};

// Validate
const result = validateStepData<ReviewData>(4, reviewData);
```

### Step 5: Schedule

```typescript
const scheduleData: ScheduleData = {
  scheduleNow: true,
  crewAssignments: [
    {
      tempId: generateTempId(),
      crewId: 'crew-uuid',
      crewName: 'Crew A',
      scheduledStart: '2025-04-20T07:00:00Z',
      scheduledEnd: '2025-04-20T16:00:00Z',
      estimatedHours: 12.0,
    },
  ],
};

// Validate
const result = validateStepData<ScheduleData>(5, scheduleData);
```

## Error Handling

### Validation Errors

```typescript
const result = safeParse(schema, data);

if (!result.success) {
  result.errors?.forEach((error) => {
    console.error(`${error.field}: ${error.message}`);
    // Display field-level error to user
    showFieldError(error.field, error.message);
  });
}
```

### Type Guards

```typescript
if (customerData.selectionMode === 'existing') {
  // TypeScript knows selectedCustomer exists
  const customerId = customerData.selectedCustomer.id; // ✅
}

if (isServicesData(data)) {
  // TypeScript knows data is ServicesData
  console.log(data.services.length); // ✅
}
```

## Helper Functions

```typescript
// Generate unique temporary ID
generateTempId(): string

// Calculate wizard progress (0-100)
calculateProgress(state: JobWizardState): number

// Get step completion status
getStepCompletionStatus(state: JobWizardState): StepCompletionStatus

// Check if can navigate to step
canNavigateToStep(target: WizardStep, state: JobWizardState): boolean

// Convert wizard state to job input
convertWizardStateToJobInput(
  state: JobWizardState,
  customerId: string,
  companyId: string,
  userId: string
): CreateJobInput

// Get step label
getStepLabel(step: WizardStep): string

// Get step description
getStepDescription(step: WizardStep): string
```

## Integration Examples

### MasterPricingEngine

```typescript
const result = await masterPricingEngine.calculatePricing(
  paverPatioValues,
  sqft,
  'paver_patio_sqft',
  companyId
);

const calculation: ServiceCalculation = {
  calculationMethod: 'master-pricing-engine',
  calculationData: {
    tier1Results: result.tier1Results,
    tier2Results: result.tier2Results,
    sqft: result.sqft,
    confidence: result.confidence,
  },
  pricingVariables: {
    paverPatio: result.inputValues,
  },
  confidence: result.confidence,
  calculatedAt: new Date().toISOString(),
};
```

### ChatInterface

```typescript
const chatResult: ChatInterfaceResult = await chatInterface.extractStructuredData(
  sessionId
);

if (chatResult.customer) {
  const customerData: CustomerSelectionData = {
    selectionMode: 'from-chat',
    chatImportData: chatResult.customer,
  };
}
```

### CustomerManagementService

```typescript
const response: CustomerManagementResponse = await customerManagementService.createOrFind(
  newCustomerData
);

if (response.success && response.customer) {
  updateWizardState({
    customerData: {
      selectionMode: 'existing',
      selectedCustomer: response.customer,
    },
  });
}
```

## Common Gotchas

### 1. Discriminated Unions

```typescript
// ✅ Correct: TypeScript narrows type
if (data.selectionMode === 'existing') {
  const id = data.selectedCustomer.id;
}

// ❌ Incorrect: May be undefined
const id = data.selectedCustomer?.id;
```

### 2. Validation Required

```typescript
// ✅ Correct: Validate before using
const result = validateStepData<ServicesData>(3, data);
if (result.success) {
  useData(result.data);
}

// ❌ Incorrect: No validation
useData(data);
```

### 3. Temporary IDs

```typescript
// ✅ Correct: Use helper function
const service = {
  tempId: generateTempId(), // Guaranteed unique
  // ...
};

// ❌ Incorrect: Manual generation
const service = {
  tempId: `temp_${Date.now()}`, // May conflict
};
```

### 4. Optional Step 5

```typescript
// ✅ Correct: Check scheduleNow
if (scheduleData.scheduleNow && scheduleData.crewAssignments.length > 0) {
  createAssignments(scheduleData.crewAssignments);
}

// ❌ Incorrect: Assumes assignments exist
createAssignments(scheduleData.crewAssignments);
```

## Files Reference

| File | Purpose |
|------|---------|
| `job-wizard.ts` | Main type definitions |
| `job-wizard-schemas.ts` | Zod validation schemas |
| `job-wizard.examples.ts` | Usage examples |
| `job-wizard.test.ts` | Test suite |
| `JOB-WIZARD-README.md` | Complete documentation |
| `JOB-WIZARD-SUMMARY.md` | Implementation summary |
| `JOB-WIZARD-QUICK-REFERENCE.md` | This file |

## Need Help?

1. Check `job-wizard.examples.ts` for complete examples
2. Review `JOB-WIZARD-README.md` for detailed documentation
3. Run tests in `job-wizard.test.ts` for usage patterns
4. Review existing CRM types in `crm.ts`

---

**Last Updated:** January 2025
