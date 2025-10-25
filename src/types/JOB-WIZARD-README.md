# Job Wizard Type System Documentation

Comprehensive TypeScript type definitions for the 5-step Job Creation Wizard. This type system provides strict type safety, runtime validation, and seamless integration with existing CRM types.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [File Structure](#file-structure)
- [Type Definitions](#type-definitions)
- [Runtime Validation](#runtime-validation)
- [Usage Examples](#usage-examples)
- [Integration Guide](#integration-guide)
- [Best Practices](#best-practices)

---

## Overview

The Job Wizard type system provides:

- **Type Safety**: Strict TypeScript types with no `any` types
- **Runtime Validation**: Zod schemas for all wizard steps
- **Extensibility**: Generic types and discriminated unions
- **Integration**: Seamless integration with existing CRM, Customer, and Pricing types
- **Documentation**: Comprehensive JSDoc comments and examples

### Key Features

- ✅ 5-step wizard state management
- ✅ Discriminated unions for type-safe step data
- ✅ Zod schemas for runtime validation
- ✅ Type guards for safe type narrowing
- ✅ Helper functions for common operations
- ✅ Integration with MasterPricingEngine
- ✅ ChatInterface result extraction types
- ✅ CustomerManagementService response types

---

## Architecture

### Wizard Flow

```
Step 1: Customer Selection
    ↓
Step 2: Job Details
    ↓
Step 3: Services Configuration
    ↓
Step 4: Review & Confirmation
    ↓
Step 5: Schedule & Crew Assignment (Optional)
    ↓
Submit → Create Job
```

### Type Hierarchy

```
JobWizardState
├── CustomerSelectionData (discriminated union)
│   ├── existing
│   ├── create-new
│   └── from-chat
├── JobDetailsData
│   ├── JobLocationData
│   └── JobSchedulingData
├── ServicesData
│   └── ServiceLineItem[]
│       └── ServiceCalculation
├── ReviewData
│   ├── CustomerReviewSummary
│   ├── JobReviewSummary
│   ├── ServicesReviewSummary
│   └── PricingReviewSummary
└── ScheduleData
    └── CrewAssignmentData[]
```

---

## File Structure

```
src/types/
├── job-wizard.ts              # Main type definitions
├── job-wizard-schemas.ts      # Zod validation schemas
├── job-wizard.examples.ts     # Usage examples and fixtures
└── JOB-WIZARD-README.md       # This documentation file
```

### `job-wizard.ts`

**Main type definitions file** containing:

- Wizard state interfaces
- Step data interfaces
- Validation types
- Integration types
- Type guards
- Helper functions

### `job-wizard-schemas.ts`

**Runtime validation schemas** using Zod:

- Step validation schemas
- Custom validation refinements
- Error message definitions
- Validation helper functions

### `job-wizard.examples.ts`

**Comprehensive examples** demonstrating:

- Creating wizard sessions
- Each step's data structure
- Validation scenarios
- Error handling
- Complete wizard flow

---

## Type Definitions

### Core Wizard State

```typescript
interface JobWizardState {
  currentStep: WizardStep;              // 1 | 2 | 3 | 4 | 5
  isComplete: boolean;
  customerData: CustomerSelectionData | null;
  jobDetailsData: JobDetailsData | null;
  servicesData: ServicesData | null;
  reviewData: ReviewData | null;
  scheduleData: ScheduleData | null;
  validationErrors: ValidationErrors | null;
  isSaving: boolean;
  saveError: string | null;
  metadata: WizardMetadata;
}
```

### Step 1: Customer Selection

**Discriminated union** supporting three modes:

```typescript
type CustomerSelectionMode = 'existing' | 'create-new' | 'from-chat';

interface CustomerSelectionData {
  selectionMode: CustomerSelectionMode;
  selectedCustomer?: CustomerProfile | null;     // For 'existing'
  newCustomerData?: CreateCustomerInput | null;  // For 'create-new'
  chatImportData?: ChatCustomerImport | null;    // For 'from-chat'
  searchQuery?: string;
  recentCustomers?: CustomerProfile[];
}
```

**Type Safety Example:**

```typescript
// TypeScript enforces correct fields based on selectionMode
if (data.selectionMode === 'existing') {
  // TypeScript knows selectedCustomer must exist
  const customerId = data.selectedCustomer.id; // ✅ Type-safe
}

if (data.selectionMode === 'create-new') {
  // TypeScript knows newCustomerData must exist
  const customerName = data.newCustomerData.customer_name; // ✅ Type-safe
}
```

### Step 2: Job Details

```typescript
interface JobDetailsData {
  title: string;
  description?: string | null;
  priority: JobPriority;              // 'low' | 'normal' | 'high' | 'urgent'
  priorityNumeric: number;            // 0-10 for database
  location: JobLocationData;
  scheduling: JobSchedulingData;
  tags: string[];
  customFields?: Record<string, unknown>;
}
```

**Location Data:**

```typescript
interface JobLocationData {
  serviceAddress?: string | null;
  serviceCity?: string | null;
  serviceState?: string | null;
  serviceZip?: string | null;
  locationNotes?: string | null;
  useCustomerAddress: boolean;
  coordinates?: { latitude: number; longitude: number } | null;
}
```

**Scheduling Data:**

```typescript
interface JobSchedulingData {
  requestedStartDate?: string | null;     // ISO 8601 date
  scheduledStartDate?: string | null;
  scheduledEndDate?: string | null;
  quoteValidUntil?: string | null;
  schedulingNotes?: string | null;
  estimatedDurationDays?: number | null;
}
```

### Step 3: Services Configuration

```typescript
interface ServicesData {
  services: ServiceLineItem[];
  totalEstimated: number;
  totalLaborCost: number;
  totalMaterialCost: number;
  calculationSummary: ServicesCalculationSummary;
  serviceNotes?: string | null;
}
```

**Service Line Item:**

```typescript
interface ServiceLineItem {
  tempId: string;                      // Temporary ID for wizard
  serviceConfigId: string;             // FK to svc_pricing_configs
  serviceName: string;
  serviceDescription?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  source: ServiceSource;               // How service was added
  calculation: ServiceCalculation;     // Pricing calculation details
  notes?: string | null;
  isOptional: boolean;
  displayOrder: number;
}
```

**Service Calculation:**

```typescript
interface ServiceCalculation {
  calculationMethod: CalculationMethod;
  calculationData: ServiceCalculationData;     // Matches ops_job_services.calculation_data
  pricingVariables: PricingVariables;          // Matches ops_job_services.pricing_variables
  squareFootage?: number | null;
  laborHours?: number | null;
  laborCost?: number | null;
  materialCost?: number | null;
  profitMargin?: number | null;
  pricePerSqft?: number | null;
  confidence: number;                          // 0-1
  calculatedAt: string;                        // ISO 8601 timestamp
}
```

**Calculation Method:**

```typescript
type CalculationMethod =
  | 'master-pricing-engine'  // MasterPricingEngine calculation
  | 'ai-estimation'          // AI Chat estimation
  | 'manual-entry'           // User manually entered
  | 'template-based';        // From saved template
```

**Service Source:**

```typescript
type ServiceSource =
  | 'ai-chat'           // Added from AI chat conversation
  | 'quick-calculator'  // Added from Quick Calculator tool
  | 'manual'            // Manually added in wizard
  | 'template';         // Added from job template
```

### Step 4: Review & Confirmation

```typescript
interface ReviewData {
  customerSummary: CustomerReviewSummary;
  jobSummary: JobReviewSummary;
  servicesSummary: ServicesReviewSummary;
  pricingSummary: PricingReviewSummary;
  confirmations: ReviewConfirmations;
  additionalNotes?: string | null;
}
```

**Required Confirmations:**

```typescript
interface ReviewConfirmations {
  pricingConfirmed: boolean;         // Must be true to submit
  customerInfoConfirmed: boolean;    // Must be true to submit
  scopeConfirmed: boolean;           // Must be true to submit
  sendQuoteToCustomer: boolean;      // Optional flag
}
```

### Step 5: Schedule & Crew Assignment

```typescript
interface ScheduleData {
  scheduleNow: boolean;                  // Whether to schedule immediately
  crewAssignments: CrewAssignmentData[]; // Empty if scheduleNow is false
  schedulingNotes?: string | null;
}

interface CrewAssignmentData {
  tempId: string;
  crewId: string;
  crewName: string;
  scheduledStart: string;      // ISO 8601 timestamp
  scheduledEnd: string;        // ISO 8601 timestamp
  estimatedHours?: number | null;
  assignmentNotes?: string | null;
  workDescription?: string | null;
}
```

---

## Runtime Validation

### Zod Schema Usage

Each step has a corresponding Zod schema for runtime validation:

```typescript
import {
  customerSelectionDataSchema,
  jobDetailsDataSchema,
  servicesDataSchema,
  reviewDataSchema,
  scheduleDataSchema,
  validateStepData,
} from './job-wizard-schemas';
```

### Validating Step Data

```typescript
// Validate specific step
const result = validateStepData<JobDetailsData>(2, jobDetailsData);

if (result.success) {
  console.log('✅ Valid:', result.data);
} else {
  console.error('❌ Errors:', result.errors);
}
```

### Safe Parsing with Error Handling

```typescript
import { safeParse } from './job-wizard-schemas';

const result = safeParse(servicesDataSchema, inputData);

if (result.success) {
  // result.data is typed as ServicesData
  processServices(result.data);
} else {
  // result.errors contains field-level errors
  displayErrors(result.errors);
}
```

### Custom Validation Rules

**Future dates only:**

```typescript
const schedulingSchema = z.object({
  scheduledStartDate: z.string().date().refine(
    (date) => isFutureDate(date),
    { message: 'Start date must be in the future' }
  ),
});
```

**Cross-field validation:**

```typescript
const servicesSchema = z.object({
  services: z.array(serviceSchema),
  totalEstimated: z.number(),
}).refine(
  (data) => {
    const sum = data.services.reduce((acc, s) => acc + s.totalPrice, 0);
    return Math.abs(data.totalEstimated - sum) <= 0.01;
  },
  { message: 'Total must equal sum of services' }
);
```

---

## Usage Examples

### Example 1: Initialize Wizard

```typescript
import { createNewWizardSession } from './job-wizard.examples';

const wizardState = createNewWizardSession(userId, companyId);

console.log(wizardState.currentStep); // 1
console.log(wizardState.metadata.sessionId); // UUID
```

### Example 2: Select Existing Customer

```typescript
import { CustomerSelectionData } from './job-wizard';

const customerData: CustomerSelectionData = {
  selectionMode: 'existing',
  selectedCustomer: {
    id: 'customer-uuid',
    customer_name: 'John Smith',
    customer_email: 'john@example.com',
    // ... other fields
  },
  searchQuery: 'john smith',
};

// Validate
const result = safeParse(customerSelectionDataSchema, customerData);
```

### Example 3: Add Service from Quick Calculator

```typescript
import { ServiceLineItem, generateTempId } from './job-wizard';

const service: ServiceLineItem = {
  tempId: generateTempId(),
  serviceConfigId: 'config-uuid',
  serviceName: 'Paver Patio Installation',
  quantity: 1,
  unitPrice: 7250.00,
  totalPrice: 7250.00,
  source: 'quick-calculator',
  calculation: {
    calculationMethod: 'master-pricing-engine',
    calculationData: pricingEngineResult, // From MasterPricingEngine
    pricingVariables: { paverPatio: paverPatioValues },
    confidence: 0.95,
    calculatedAt: new Date().toISOString(),
  },
  isOptional: false,
  displayOrder: 1,
};
```

### Example 4: Convert to Job Input

```typescript
import { convertWizardStateToJobInput } from './job-wizard';

const jobInput = convertWizardStateToJobInput(
  wizardState,
  customerId,
  companyId,
  userId
);

// jobInput is typed as CreateJobInput
// Ready to submit to database
await jobService.createJob(jobInput);
```

### Example 5: Type Guards

```typescript
import { isCustomerSelectionData, isServicesData } from './job-wizard';

if (isCustomerSelectionData(data)) {
  // TypeScript knows data is CustomerSelectionData
  console.log(data.selectionMode);
}

if (isServicesData(data)) {
  // TypeScript knows data is ServicesData
  console.log(data.services.length);
}
```

---

## Integration Guide

### MasterPricingEngine Integration

```typescript
import { masterPricingEngine } from '../pricing-system/core/calculations/master-pricing-engine';
import { ServiceLineItem, ServiceCalculation } from './job-wizard';

// Calculate pricing using MasterPricingEngine
const calculationResult = await masterPricingEngine.calculatePricing(
  paverPatioValues,
  sqft,
  'paver_patio_sqft',
  companyId
);

// Convert to ServiceCalculation
const serviceCalculation: ServiceCalculation = {
  calculationMethod: 'master-pricing-engine',
  calculationData: {
    tier1Results: calculationResult.tier1Results,
    tier2Results: calculationResult.tier2Results,
    breakdown: calculationResult.tier2Results.breakdown,
    sqft: calculationResult.sqft,
    confidence: calculationResult.confidence,
    calculationDate: calculationResult.calculationDate,
  },
  pricingVariables: {
    paverPatio: calculationResult.inputValues,
  },
  squareFootage: sqft,
  laborHours: calculationResult.tier1Results.totalManHours,
  laborCost: calculationResult.tier2Results.laborCost,
  materialCost: calculationResult.tier2Results.totalMaterialCost,
  profitMargin: 0.20,
  pricePerSqft: calculationResult.tier2Results.pricePerSqft,
  confidence: calculationResult.confidence,
  calculatedAt: new Date().toISOString(),
};
```

### ChatInterface Integration

```typescript
import { ChatInterfaceResult, ChatServiceExtraction } from './job-wizard';

// Extract structured data from AI chat
const chatResult: ChatInterfaceResult = await chatInterface.extractStructuredData(
  sessionId
);

// Use extracted customer data
if (chatResult.customer) {
  const customerData: CustomerSelectionData = {
    selectionMode: 'from-chat',
    chatImportData: chatResult.customer,
  };
}

// Use extracted services
chatResult.services.forEach((service: ChatServiceExtraction) => {
  // Add service to wizard
  addServiceFromChat(service);
});
```

### CustomerManagementService Integration

```typescript
import { CustomerManagementResponse } from './job-wizard';

// Create or find customer
const response: CustomerManagementResponse = await customerManagementService.createOrFind(
  newCustomerData
);

if (response.success && response.customer) {
  // Use customer in wizard
  updateWizardState({
    customerData: {
      selectionMode: 'existing',
      selectedCustomer: response.customer,
    },
  });
}

// Handle duplicates
if (response.duplicates && response.duplicates.length > 0) {
  // Show duplicate resolution UI
  showDuplicateResolutionDialog(response.duplicates);
}
```

---

## Best Practices

### 1. Always Validate Step Data

```typescript
// ✅ Good: Validate before saving
const result = validateStepData<ServicesData>(3, servicesData);
if (result.success) {
  saveStepData(result.data);
}

// ❌ Bad: No validation
saveStepData(servicesData);
```

### 2. Use Type Guards for Safe Narrowing

```typescript
// ✅ Good: Type-safe access
if (customerData.selectionMode === 'existing' && customerData.selectedCustomer) {
  const customerId = customerData.selectedCustomer.id;
}

// ❌ Bad: Unsafe access
const customerId = customerData.selectedCustomer?.id; // May be undefined
```

### 3. Handle Validation Errors Gracefully

```typescript
// ✅ Good: User-friendly error messages
const result = safeParse(jobDetailsSchema, data);
if (!result.success) {
  result.errors?.forEach((error) => {
    showFieldError(error.field, error.message);
  });
}

// ❌ Bad: Generic error message
if (!result.success) {
  alert('Invalid data');
}
```

### 4. Use Discriminated Unions Correctly

```typescript
// ✅ Good: TypeScript narrows types automatically
switch (data.selectionMode) {
  case 'existing':
    // data.selectedCustomer is guaranteed to exist
    console.log(data.selectedCustomer.id);
    break;
  case 'create-new':
    // data.newCustomerData is guaranteed to exist
    console.log(data.newCustomerData.customer_name);
    break;
}

// ❌ Bad: Manual type checking
if (data.selectedCustomer) {
  console.log(data.selectedCustomer.id);
}
```

### 5. Track Wizard Metadata

```typescript
// ✅ Good: Update metadata on each step
const updateMetadata = (updates: Partial<WizardMetadata>) => {
  setWizardState((prev) => ({
    ...prev,
    metadata: {
      ...prev.metadata,
      ...updates,
      lastModifiedAt: new Date().toISOString(),
    },
  }));
};

// Track back navigation
if (direction === 'previous') {
  updateMetadata({
    backNavigationCount: metadata.backNavigationCount + 1,
  });
}
```

### 6. Generate Unique Temporary IDs

```typescript
// ✅ Good: Use helper function
import { generateTempId } from './job-wizard';

const serviceItem: ServiceLineItem = {
  tempId: generateTempId(), // Guaranteed unique
  // ... other fields
};

// ❌ Bad: Manual ID generation (may conflict)
const serviceItem = {
  tempId: `temp_${Date.now()}`, // Not guaranteed unique
};
```

### 7. Preserve Calculation Data

```typescript
// ✅ Good: Store complete calculation result
const serviceItem: ServiceLineItem = {
  calculation: {
    calculationMethod: 'master-pricing-engine',
    calculationData: fullCalculationResult, // Complete data
    pricingVariables: inputVariables,       // All inputs
    confidence: 0.95,
    calculatedAt: new Date().toISOString(),
  },
};

// ❌ Bad: Only store final price (loses audit trail)
const serviceItem = {
  totalPrice: 7250.00,
};
```

### 8. Handle Optional Steps Correctly

```typescript
// ✅ Good: Schedule step is truly optional
const submitJob = async (state: JobWizardState) => {
  const jobInput = convertWizardStateToJobInput(state, customerId, companyId, userId);

  const job = await createJob(jobInput);

  // Schedule is optional - only create if provided
  if (state.scheduleData?.scheduleNow && state.scheduleData.crewAssignments.length > 0) {
    await createCrewAssignments(job.id, state.scheduleData.crewAssignments);
  }

  return job;
};
```

---

## TypeScript Configuration

Ensure your `tsconfig.json` has these settings for optimal type checking:

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

---

## API Reference

### Helper Functions

```typescript
// Generate unique temporary ID
generateTempId(): string

// Calculate wizard progress percentage
calculateProgress(state: JobWizardState): number

// Get step completion status
getStepCompletionStatus(state: JobWizardState): StepCompletionStatus

// Check if can navigate to step
canNavigateToStep(targetStep: WizardStep, currentState: JobWizardState): boolean

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

### Type Guards

```typescript
isCustomerSelectionData(obj: unknown): obj is CustomerSelectionData
isJobDetailsData(obj: unknown): obj is JobDetailsData
isServicesData(obj: unknown): obj is ServicesData
isReviewData(obj: unknown): obj is ReviewData
isScheduleData(obj: unknown): obj is ScheduleData
isValidationSuccess<T>(result: ValidationResult<T>): result is ValidationResult<T> & { isValid: true; data: T }
```

---

## Troubleshooting

### Issue: Validation errors not showing

**Solution**: Ensure you're using `safeParse` and displaying field-level errors:

```typescript
const result = safeParse(schema, data);
if (!result.success) {
  result.errors?.forEach((error) => {
    console.error(`${error.field}: ${error.message}`);
  });
}
```

### Issue: Type narrowing not working

**Solution**: Use discriminated union properly:

```typescript
// ✅ Correct
if (data.selectionMode === 'existing') {
  // TypeScript knows selectedCustomer exists
  const id = data.selectedCustomer.id;
}

// ❌ Incorrect
if (data.selectedCustomer) {
  // TypeScript can't narrow based on this
}
```

### Issue: Zod validation too strict

**Solution**: Use `.optional()` and `.nullable()` appropriately:

```typescript
const schema = z.object({
  field: z.string().optional().nullable(), // Allows string, undefined, or null
});
```

---

## Future Enhancements

- [ ] Add support for multi-location jobs
- [ ] Enhanced material selection with database integration
- [ ] Template-based job creation
- [ ] Recurring job scheduling
- [ ] Advanced crew optimization algorithms
- [ ] Real-time collaboration on job creation
- [ ] Mobile app wizard optimization

---

## Support

For questions or issues:

1. Review the examples in `job-wizard.examples.ts`
2. Check existing CRM types in `src/types/crm.ts`
3. Review Zod documentation: https://zod.dev
4. Contact the development team

---

**Last Updated**: January 2025
**Version**: 1.0.0
**TypeScript**: 5.0+
**Zod**: 3.22+
