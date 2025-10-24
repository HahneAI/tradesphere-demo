# Job Wizard Type Architecture

Visual architecture diagrams for the Job Creation Wizard type system.

---

## Type System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      JobWizardState                             │
│  (Root state container for entire wizard)                      │
├─────────────────────────────────────────────────────────────────┤
│  • currentStep: 1 | 2 | 3 | 4 | 5                              │
│  • isComplete: boolean                                          │
│  • validationErrors: ValidationErrors | null                   │
│  • isSaving: boolean                                            │
│  • metadata: WizardMetadata                                     │
└─────────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ customerData │  │jobDetailsData│  │ servicesData │
│ (Step 1)     │  │ (Step 2)     │  │ (Step 3)     │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  reviewData  │  │ scheduleData │  │              │
│  (Step 4)    │  │ (Step 5)     │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Step 1: Customer Selection (Discriminated Union)

```
CustomerSelectionData
         │
         │ selectionMode: 'existing' | 'create-new' | 'from-chat'
         │
    ┌────┴────┬────────────┬────────────┐
    │         │            │            │
    ▼         ▼            ▼            ▼
┌─────────────────────────────────────────────────────┐
│ Mode: 'existing'                                    │
├─────────────────────────────────────────────────────┤
│ • selectedCustomer: CustomerProfile                 │
│ • searchQuery?: string                              │
│ • recentCustomers?: CustomerProfile[]               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Mode: 'create-new'                                  │
├─────────────────────────────────────────────────────┤
│ • newCustomerData: CreateCustomerInput              │
│   - customer_name: string                           │
│   - customer_email?: string                         │
│   - customer_phone?: string                         │
│   - customer_address?: string                       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Mode: 'from-chat'                                   │
├─────────────────────────────────────────────────────┤
│ • chatImportData: ChatCustomerImport                │
│   - sessionId: string                               │
│   - customerName: string                            │
│   - extractionConfidence: number (0-1)              │
│   - conversationSummary?: string                    │
└─────────────────────────────────────────────────────┘
```

---

## Step 2: Job Details

```
JobDetailsData
     │
     ├─► title: string (min 3 chars)
     ├─► description?: string
     ├─► priority: 'low' | 'normal' | 'high' | 'urgent'
     ├─► priorityNumeric: 0-10
     ├─► tags: string[]
     │
     ├─► location: JobLocationData
     │         │
     │         ├─► serviceAddress?: string
     │         ├─► serviceCity?: string
     │         ├─► serviceState?: string
     │         ├─► serviceZip?: string
     │         ├─► locationNotes?: string
     │         ├─► useCustomerAddress: boolean
     │         └─► coordinates?: { lat, lng }
     │
     └─► scheduling: JobSchedulingData
               │
               ├─► requestedStartDate?: ISO date
               ├─► scheduledStartDate?: ISO date
               ├─► scheduledEndDate?: ISO date
               ├─► quoteValidUntil?: ISO date
               ├─► schedulingNotes?: string
               └─► estimatedDurationDays?: number
```

---

## Step 3: Services Configuration

```
ServicesData
     │
     ├─► services: ServiceLineItem[]
     │         │
     │         ├─► [0] ServiceLineItem
     │         │      │
     │         │      ├─► tempId: string
     │         │      ├─► serviceConfigId: UUID
     │         │      ├─► serviceName: string
     │         │      ├─► quantity: number
     │         │      ├─► unitPrice: number
     │         │      ├─► totalPrice: number
     │         │      ├─► source: 'ai-chat' | 'quick-calculator' | 'manual' | 'template'
     │         │      ├─► isOptional: boolean
     │         │      │
     │         │      └─► calculation: ServiceCalculation
     │         │             │
     │         │             ├─► calculationMethod: CalculationMethod
     │         │             ├─► calculationData: ServiceCalculationData
     │         │             │      │
     │         │             │      ├─► tier1Results (labor hours)
     │         │             │      │      ├─► baseHours
     │         │             │      │      ├─► adjustedHours
     │         │             │      │      ├─► totalManHours
     │         │             │      │      └─► breakdown: string[]
     │         │             │      │
     │         │             │      └─► tier2Results (costs)
     │         │             │             ├─► laborCost
     │         │             │             ├─► materialCostBase
     │         │             │             ├─► totalMaterialCost
     │         │             │             ├─► profit
     │         │             │             └─► total
     │         │             │
     │         │             ├─► pricingVariables: PricingVariables
     │         │             │      │
     │         │             │      ├─► paverPatio?: PaverPatioValues
     │         │             │      └─► excavation?: ExcavationValues
     │         │             │
     │         │             ├─► confidence: 0-1
     │         │             └─► calculatedAt: ISO timestamp
     │         │
     │         └─► [1..n] More ServiceLineItems
     │
     ├─► totalEstimated: number
     ├─► totalLaborCost: number
     ├─► totalMaterialCost: number
     │
     └─► calculationSummary: ServicesCalculationSummary
               ├─► serviceCount
               ├─► totalLaborHours
               ├─► totalProfit
               ├─► overallProfitMargin
               └─► grandTotal
```

---

## Step 4: Review & Confirmation

```
ReviewData
     │
     ├─► customerSummary: CustomerReviewSummary
     │         ├─► customerId?: UUID
     │         ├─► customerName: string
     │         ├─► customerEmail?: string
     │         ├─► customerPhone?: string
     │         └─► isNewCustomer: boolean
     │
     ├─► jobSummary: JobReviewSummary
     │         ├─► title: string
     │         ├─► priority: JobPriority
     │         ├─► serviceAddress: string
     │         ├─► scheduledStartDate?: ISO date
     │         └─► tags: string[]
     │
     ├─► servicesSummary: ServicesReviewSummary
     │         ├─► services: Array<{ name, price, isOptional }>
     │         └─► totalServices: number
     │
     ├─► pricingSummary: PricingReviewSummary
     │         ├─► totalLaborCost
     │         ├─► totalMaterialCost
     │         ├─► profit
     │         ├─► profitMarginPercentage
     │         └─► grandTotal
     │
     └─► confirmations: ReviewConfirmations ⚠️ Required
               ├─► pricingConfirmed: true (literal)
               ├─► customerInfoConfirmed: true (literal)
               ├─► scopeConfirmed: true (literal)
               └─► sendQuoteToCustomer: boolean
```

---

## Step 5: Schedule & Crew Assignment (Optional)

```
ScheduleData
     │
     ├─► scheduleNow: boolean
     │
     └─► crewAssignments: CrewAssignmentData[]
               │
               ├─► [0] CrewAssignmentData
               │      ├─► tempId: string
               │      ├─► crewId: UUID
               │      ├─► crewName: string
               │      ├─► scheduledStart: ISO timestamp
               │      ├─► scheduledEnd: ISO timestamp
               │      ├─► estimatedHours?: number
               │      ├─► assignmentNotes?: string
               │      └─► workDescription?: string
               │
               └─► [1..n] More CrewAssignments

Note: If scheduleNow === true, crewAssignments must have length > 0
      If scheduleNow === false, crewAssignments can be empty
```

---

## Data Flow & Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                      External Systems                           │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ChatInterface │    │ MasterPricing│    │  Customer    │
│              │    │    Engine    │    │ Management   │
└──────────────┘    └──────────────┘    └──────────────┘
         │                    │                    │
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Job Wizard                               │
│                                                                 │
│  Step 1 → Step 2 → Step 3 → Step 4 → Step 5                   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ Validation Layer (Zod Schemas)                       │     │
│  │  • customerSelectionDataSchema                       │     │
│  │  • jobDetailsDataSchema                              │     │
│  │  • servicesDataSchema                                │     │
│  │  • reviewDataSchema                                  │     │
│  │  • scheduleDataSchema                                │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ Type Conversion Layer                                │     │
│  │  • convertWizardStateToJobInput()                    │     │
│  │  • convertServiceLineItemToJobServiceInput()         │     │
│  └──────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
         │
         │ JobWizardState → CreateJobInput
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Database                                 │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │  ops_jobs   │  │ops_job_     │  │ops_job_     │           │
│  │             │  │  services   │  │ assignments │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Type Safety Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Input (any)                                             │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ Runtime Validation
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Zod Schema Validation                                        │
│    safeParse(schema, input)                                     │
│                                                                 │
│    ✅ Success → Typed data                                      │
│    ❌ Failure → ValidationError[]                               │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ if success
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Typed Data (CustomerSelectionData | JobDetailsData | ...)   │
│    TypeScript guarantees type safety                            │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ Type Guards & Discriminated Unions
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Type-Safe Operations                                         │
│    if (data.selectionMode === 'existing') {                    │
│      // TypeScript knows selectedCustomer exists               │
│      const id = data.selectedCustomer.id; ✅                    │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ Type Conversion
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Database Types (CreateJobInput)                             │
│    convertWizardStateToJobInput()                               │
│    → Matches database schema exactly                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Validation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Validation Layers                            │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Field-Level Validation
┌──────────────────────────────────────┐
│ Zod Schema Validators                │
│  • Type checking                     │
│  • Format validation (email, UUID)   │
│  • Range validation (min/max)        │
│  • Required/optional                 │
└──────────────────────────────────────┘
         │
         ▼
Layer 2: Cross-Field Validation
┌──────────────────────────────────────┐
│ Zod Refinements                      │
│  • End date after start date         │
│  • Total equals sum of services      │
│  • Crew assignments if scheduleNow   │
└──────────────────────────────────────┘
         │
         ▼
Layer 3: Business Logic Validation
┌──────────────────────────────────────┐
│ Custom Validators                    │
│  • Duplicate customer detection      │
│  • Service config availability       │
│  • Crew schedule conflicts           │
└──────────────────────────────────────┘
         │
         ▼
Layer 4: Step Progression Validation
┌──────────────────────────────────────┐
│ canNavigateToStep()                  │
│  • Previous steps complete           │
│  • Required data present             │
│  • No validation errors              │
└──────────────────────────────────────┘
```

---

## Service Calculation Data Structure

```
ServiceLineItem
     │
     └─► calculation: ServiceCalculation
               │
               ├─► calculationData: ServiceCalculationData (JSONB)
               │         │
               │         │ For Paver Patio Service:
               │         ├─► tier1Results
               │         │      ├─► baseHours: 48.0
               │         │      ├─► adjustedHours: 57.6
               │         │      ├─► paverPatioHours: 48.0
               │         │      ├─► excavationHours: 12.0
               │         │      └─► breakdown: string[]
               │         │
               │         ├─► tier2Results
               │         │      ├─► laborCost: 1440.00
               │         │      ├─► materialCostBase: 2920.00
               │         │      ├─► totalMaterialCost: 3066.00
               │         │      ├─► excavationCost: 1200.00
               │         │      ├─► profit: 1450.00
               │         │      └─► total: 8450.00
               │         │
               │         └─► sqft: 500
               │
               └─► pricingVariables: PricingVariables (JSONB)
                         │
                         │ For Paver Patio Service:
                         └─► paverPatio: PaverPatioValues
                                   ├─► siteAccess
                                   │      ├─► accessDifficulty: 'moderate'
                                   │      └─► obstacleRemoval: 'minor'
                                   ├─► materials
                                   │      ├─► paverStyle: 'premium'
                                   │      └─► cuttingComplexity: 'moderate'
                                   ├─► labor
                                   │      └─► teamSize: 'threePlus'
                                   └─► complexity
                                          └─► overallComplexity: 1.1

Note: This JSONB structure exactly matches ops_job_services table columns:
      • calculation_data → ServiceCalculationData
      • pricing_variables → PricingVariables
```

---

## Database Schema Mapping

```
JobWizardState
     │
     │ convertWizardStateToJobInput()
     │
     ▼
CreateJobInput
     │
     ├─► INSERT INTO ops_jobs
     │         ├─► id (generated)
     │         ├─► company_id
     │         ├─► customer_id
     │         ├─► title
     │         ├─► service_address
     │         ├─► scheduled_start_date
     │         ├─► estimated_total
     │         ├─► priority
     │         └─► tags
     │
     ├─► INSERT INTO ops_job_services (for each service)
     │         ├─► id (generated)
     │         ├─► job_id (FK)
     │         ├─► service_config_id (FK)
     │         ├─► service_name
     │         ├─► unit_price
     │         ├─► total_price
     │         ├─► calculation_data (JSONB) ← ServiceCalculationData
     │         ├─► pricing_variables (JSONB) ← PricingVariables
     │         └─► metadata
     │
     └─► INSERT INTO ops_job_assignments (if scheduled)
               ├─► id (generated)
               ├─► job_id (FK)
               ├─► crew_id (FK)
               ├─► scheduled_start
               ├─► scheduled_end
               └─► estimated_hours
```

---

## Error Handling Flow

```
User Input
     │
     ▼
┌──────────────────────────────────────┐
│ validateStepData(step, data)         │
└──────────────────────────────────────┘
     │
     ├─► ✅ Valid
     │        │
     │        └─► ValidationResult<T>
     │                  ├─► isValid: true
     │                  └─► data: T (typed)
     │
     └─► ❌ Invalid
              │
              └─► ValidationResult
                        ├─► isValid: false
                        └─► errors: ValidationError[]
                                  ├─► field: 'job.title'
                                  ├─► message: 'Title must be at least 3 characters'
                                  └─► code: 'INVALID_FORMAT'

Display Errors to User:
     │
     └─► Field-Level Errors
              ├─► Inline error below field
              ├─► Red border on input
              └─► Toast notification (optional)
```

---

## Type Guard Usage

```
Discriminated Union: CustomerSelectionData
     │
     │ selectionMode: 'existing' | 'create-new' | 'from-chat'
     │
     ├─► if (data.selectionMode === 'existing') {
     │        // TypeScript narrows type automatically
     │        data.selectedCustomer.id  ✅ Type-safe!
     │   }
     │
     ├─► if (data.selectionMode === 'create-new') {
     │        data.newCustomerData.customer_name  ✅ Type-safe!
     │   }
     │
     └─► if (data.selectionMode === 'from-chat') {
              data.chatImportData.sessionId  ✅ Type-safe!
         }

Type Guards:
     │
     ├─► if (isCustomerSelectionData(data)) {
     │        // data is CustomerSelectionData
     │   }
     │
     ├─► if (isServicesData(data)) {
     │        // data is ServicesData
     │   }
     │
     └─► if (isValidationSuccess(result)) {
              // result.data is guaranteed to exist and be typed
         }
```

---

## Files Architecture

```
src/types/
├── crm.ts                          # Existing CRM types (1,365 lines)
│   ├── Job, JobService, Crew
│   └── Integration point for wizard
│
├── customer.ts                     # Existing customer types (443 lines)
│   ├── CustomerProfile
│   └── CustomerManagementResponse
│
├── job-wizard.ts                   # Main wizard types (1,300+ lines)
│   ├── JobWizardState
│   ├── Step data interfaces
│   ├── Validation types
│   ├── Integration types
│   ├── Type guards
│   └── Helper functions
│
├── job-wizard-schemas.ts           # Validation schemas (700+ lines)
│   ├── Zod schemas for each step
│   ├── Custom validation refinements
│   └── Validation helpers
│
├── job-wizard.examples.ts          # Usage examples (900+ lines)
│   ├── Example data for each step
│   ├── Validation scenarios
│   └── Integration examples
│
├── job-wizard.test.ts              # Test suite (850+ lines)
│   ├── Type compilation tests
│   ├── Validation tests
│   ├── Helper function tests
│   └── Integration tests
│
├── index.ts                        # Central export point
│   └── Re-exports all types for convenience
│
└── docs/
    ├── JOB-WIZARD-README.md        # Complete documentation (650+ lines)
    ├── JOB-WIZARD-SUMMARY.md       # Implementation summary
    ├── JOB-WIZARD-QUICK-REFERENCE.md # Quick reference card
    └── JOB-WIZARD-TYPE-ARCHITECTURE.md # This file

Total: 4,400+ lines of production-ready TypeScript
```

---

**Created:** January 2025
**Last Updated:** January 2025
**TypeScript Version:** 5.0+
**Zod Version:** 3.22+
