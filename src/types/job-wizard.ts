/**
 * Job Creation Wizard Type Definitions
 *
 * Comprehensive type system for the 5-step job creation wizard.
 * Integrates with existing CRM types, pricing engine, and customer management.
 *
 * @module job-wizard
 */

import { z } from 'zod';
import {
  Job,
  CreateJobInput,
  JobService,
  CreateJobServiceInput,
  JobPriority,
  JobStatus,
  ServiceCalculationData,
} from './crm';
import { CustomerProfile, CreateCustomerInput } from './customer';
import { PaverPatioCalculationResult, PaverPatioValues } from '../pricing-system/core/master-formula/formula-types';

// ============================================================================
// Wizard Step Enumeration
// ============================================================================

/**
 * Wizard step numbers as literal union type
 * Ensures type-safe step navigation
 */
export type WizardStep = 1 | 2 | 3 | 4 | 5;

/**
 * Step identifiers for discriminated unions
 */
export type StepIdentifier =
  | 'customer-selection'
  | 'job-details'
  | 'services'
  | 'review'
  | 'schedule';

// ============================================================================
// Wizard State Management
// ============================================================================

/**
 * Complete wizard state containing all step data
 * Tracks progression through the 5-step creation process
 */
export interface JobWizardState {
  /** Current active step (1-5) */
  currentStep: WizardStep;

  /** Whether wizard is complete and ready for submission */
  isComplete: boolean;

  /** Step 1: Customer selection/creation data */
  customerData: CustomerSelectionData | null;

  /** Step 2: Job details and metadata */
  jobDetailsData: JobDetailsData | null;

  /** Step 3: Service line items with pricing */
  servicesData: ServicesData | null;

  /** Step 4: Review and confirmation data */
  reviewData: ReviewData | null;

  /** Step 5: Optional crew scheduling */
  scheduleData: ScheduleData | null;

  /** Validation errors for current step */
  validationErrors: ValidationErrors | null;

  /** Whether wizard is currently saving */
  isSaving: boolean;

  /** Save error message if any */
  saveError: string | null;

  /** Metadata for tracking wizard session */
  metadata: WizardMetadata;
}

/**
 * Wizard session metadata
 * Tracks analytics and debugging information
 */
export interface WizardMetadata {
  /** Unique session ID for this wizard instance */
  sessionId: string;

  /** Timestamp when wizard was initiated */
  startedAt: string;

  /** Timestamp of last modification */
  lastModifiedAt: string;

  /** User ID who initiated the wizard */
  initiatedByUserId: string;

  /** Company ID context */
  companyId: string;

  /** Source of wizard initiation */
  source: WizardSource;

  /** Number of times user returned to previous steps */
  backNavigationCount: number;

  /** Total time spent in wizard (seconds) */
  totalTimeSpent?: number;
}

/**
 * Source of wizard initiation
 * Tracks how users enter the job creation flow
 */
export type WizardSource =
  | 'dashboard-quick-action'
  | 'jobs-list-button'
  | 'customer-profile-action'
  | 'ai-chat-handoff'
  | 'quick-calculator-convert'
  | 'calendar-schedule'
  | 'mobile-app';

// ============================================================================
// Step 1: Customer Selection
// ============================================================================

/**
 * Customer selection step data
 * Supports selecting existing customer, creating new, or importing from chat
 */
export interface CustomerSelectionData {
  /** Selection mode chosen by user */
  selectionMode: CustomerSelectionMode;

  /** Selected existing customer (if mode is 'existing') */
  selectedCustomer?: CustomerProfile | null;

  /** New customer data (if mode is 'create-new') */
  newCustomerData?: CreateCustomerInput | null;

  /** Chat session data (if mode is 'from-chat') */
  chatImportData?: ChatCustomerImport | null;

  /** Search query used to find customer */
  searchQuery?: string;

  /** List of recently viewed customers for quick selection */
  recentCustomers?: CustomerProfile[];
}

/**
 * Customer selection mode discriminated union
 */
export type CustomerSelectionMode =
  | 'existing'        // Select from existing customers
  | 'create-new'      // Create new customer in wizard
  | 'from-chat';      // Import from AI chat conversation

/**
 * Customer data imported from AI chat session
 * Extracts customer info from chat interaction
 */
export interface ChatCustomerImport {
  /** Chat session ID */
  sessionId: string;

  /** Extracted customer name */
  customerName: string;

  /** Extracted email (if available) */
  customerEmail?: string | null;

  /** Extracted phone (if available) */
  customerPhone?: string | null;

  /** Extracted address (if available) */
  customerAddress?: string | null;

  /** Chat conversation summary */
  conversationSummary?: string;

  /** Confidence score of extraction (0-1) */
  extractionConfidence: number;

  /** Timestamp of chat session */
  chatTimestamp: string;
}

// ============================================================================
// Step 2: Job Details
// ============================================================================

/**
 * Job details step data
 * Core job information, location, and scheduling
 */
export interface JobDetailsData {
  /** Job title/name */
  title: string;

  /** Optional job description */
  description?: string | null;

  /** Job priority level */
  priority: JobPriority;

  /** Numeric priority (0-10 for database) */
  priorityNumeric: number;

  /** Service location information */
  location: JobLocationData;

  /** Scheduling information */
  scheduling: JobSchedulingData;

  /** Optional tags for organization */
  tags: string[];

  /** Custom metadata fields */
  customFields?: Record<string, unknown>;
}

/**
 * Job location information
 * Service address where work will be performed
 */
export interface JobLocationData {
  /** Street address */
  serviceAddress?: string | null;

  /** City */
  serviceCity?: string | null;

  /** State/province */
  serviceState?: string | null;

  /** ZIP/postal code */
  serviceZip?: string | null;

  /** Special location notes or access instructions */
  locationNotes?: string | null;

  /** Whether to use customer's primary address */
  useCustomerAddress: boolean;

  /** Coordinates (future: for map integration) */
  coordinates?: {
    latitude: number;
    longitude: number;
  } | null;
}

/**
 * Job scheduling information
 * Requested and estimated dates
 */
export interface JobSchedulingData {
  /** Customer's requested start date */
  requestedStartDate?: string | null;  // ISO 8601 date

  /** Estimated/scheduled start date */
  scheduledStartDate?: string | null;  // ISO 8601 date

  /** Estimated/scheduled end date */
  scheduledEndDate?: string | null;    // ISO 8601 date

  /** Quote validity period */
  quoteValidUntil?: string | null;     // ISO 8601 date

  /** Scheduling notes */
  schedulingNotes?: string | null;

  /** Estimated duration in days (auto-calculated from services) */
  estimatedDurationDays?: number | null;
}

// ============================================================================
// Step 3: Services Configuration
// ============================================================================

/**
 * Services step data
 * Collection of service line items with pricing calculations
 */
export interface ServicesData {
  /** Array of service line items */
  services: ServiceLineItem[];

  /** Total estimated cost (sum of all services) */
  totalEstimated: number;

  /** Total labor cost */
  totalLaborCost: number;

  /** Total material cost */
  totalMaterialCost: number;

  /** Calculation summary */
  calculationSummary: ServicesCalculationSummary;

  /** Service notes visible to customer */
  serviceNotes?: string | null;
}

/**
 * Individual service line item
 * Represents a single service with pricing calculation
 */
export interface ServiceLineItem {
  /** Temporary ID for wizard (before database insert) */
  tempId: string;

  /** Service configuration ID (from svc_pricing_configs table) */
  serviceConfigId: string;

  /** Service name */
  serviceName: string;

  /** Service description */
  serviceDescription?: string | null;

  /** Quantity (typically 1 for area-based services) */
  quantity: number;

  /** Unit price (calculated or manual) */
  unitPrice: number;

  /** Total price for this line item */
  totalPrice: number;

  /** Source of this service */
  source: ServiceSource;

  /** Pricing calculation details */
  calculation: ServiceCalculation;

  /** Service-specific notes */
  notes?: string | null;

  /** Whether this service is marked as optional */
  isOptional: boolean;

  /** Display order in list */
  displayOrder: number;
}

/**
 * Source of service line item
 * Tracks how the service was added
 */
export type ServiceSource =
  | 'ai-chat'           // Added from AI chat conversation
  | 'quick-calculator'  // Added from Quick Calculator tool
  | 'manual'            // Manually added in wizard
  | 'template';         // Added from job template

/**
 * Service calculation details
 * Contains pricing engine calculation results
 */
export interface ServiceCalculation {
  /** Calculation method used */
  calculationMethod: CalculationMethod;

  /** Complete calculation data (JSONB for database) */
  calculationData: ServiceCalculationData;

  /** Pricing input variables */
  pricingVariables: PricingVariables;

  /** Square footage (for area-based services) */
  squareFootage?: number | null;

  /** Linear footage (for perimeter-based services) */
  linearFootage?: number | null;

  /** Calculated labor hours */
  laborHours?: number | null;

  /** Calculated labor cost */
  laborCost?: number | null;

  /** Calculated material cost */
  materialCost?: number | null;

  /** Profit margin applied */
  profitMargin?: number | null;

  /** Price per square foot */
  pricePerSqft?: number | null;

  /** Calculation confidence score (0-1) */
  confidence: number;

  /** Timestamp of calculation */
  calculatedAt: string;  // ISO 8601
}

/**
 * Calculation method discriminated union
 */
export type CalculationMethod =
  | 'master-pricing-engine'  // MasterPricingEngine calculation
  | 'ai-estimation'          // AI Chat estimation
  | 'manual-entry'           // User manually entered
  | 'template-based';        // From saved template

/**
 * Pricing variables for service calculation
 * Generic record type that maps to specific service types
 */
export interface PricingVariables {
  /** For paver patio service */
  paverPatio?: PaverPatioValues;

  /** For excavation service */
  excavation?: {
    area_sqft: number;
    depth_inches: number;
  };

  /** For future services - extensible structure */
  [serviceType: string]: unknown;
}

/**
 * Services calculation summary
 * Aggregated pricing breakdown
 */
export interface ServicesCalculationSummary {
  /** Total number of services */
  serviceCount: number;

  /** Number of optional services */
  optionalServiceCount: number;

  /** Total labor hours across all services */
  totalLaborHours: number;

  /** Total labor cost */
  totalLaborCost: number;

  /** Total material cost */
  totalMaterialCost: number;

  /** Total equipment cost */
  totalEquipmentCost: number;

  /** Total other costs */
  totalOtherCosts: number;

  /** Total profit amount */
  totalProfit: number;

  /** Overall profit margin percentage */
  overallProfitMargin: number;

  /** Total before profit */
  subtotal: number;

  /** Grand total */
  grandTotal: number;

  /** Estimated project duration in days */
  estimatedDurationDays: number;
}

// ============================================================================
// Step 4: Review & Confirmation
// ============================================================================

/**
 * Review step data
 * Complete summary for user confirmation before creation
 */
export interface ReviewData {
  /** Customer summary for review */
  customerSummary: CustomerReviewSummary;

  /** Job details summary */
  jobSummary: JobReviewSummary;

  /** Services summary */
  servicesSummary: ServicesReviewSummary;

  /** Pricing summary */
  pricingSummary: PricingReviewSummary;

  /** User confirmation flags */
  confirmations: ReviewConfirmations;

  /** Additional notes for the job */
  additionalNotes?: string | null;
}

/**
 * Customer information for review
 */
export interface CustomerReviewSummary {
  customerId?: string;  // Null if creating new customer
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  isNewCustomer: boolean;
}

/**
 * Job details for review
 */
export interface JobReviewSummary {
  title: string;
  description?: string | null;
  priority: JobPriority;
  serviceAddress: string;
  requestedStartDate?: string | null;
  scheduledStartDate?: string | null;
  scheduledEndDate?: string | null;
  tags: string[];
}

/**
 * Services list for review
 */
export interface ServicesReviewSummary {
  services: Array<{
    serviceName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    isOptional: boolean;
  }>;
  totalServices: number;
  totalOptionalServices: number;
}

/**
 * Pricing summary for review
 */
export interface PricingReviewSummary {
  totalLaborCost: number;
  totalMaterialCost: number;
  totalOtherCosts: number;
  subtotal: number;
  profit: number;
  profitMarginPercentage: number;
  grandTotal: number;
  estimatedDurationDays: number;
}

/**
 * User confirmation checkboxes
 */
export interface ReviewConfirmations {
  /** Confirmed pricing is accurate */
  pricingConfirmed: boolean;

  /** Confirmed customer information is correct */
  customerInfoConfirmed: boolean;

  /** Confirmed scope of work */
  scopeConfirmed: boolean;

  /** Agreed to send quote to customer */
  sendQuoteToCustomer: boolean;
}

// ============================================================================
// Step 5: Schedule & Crew Assignment (Optional)
// ============================================================================

/**
 * Schedule and crew assignment step data
 * Optional step for immediate crew scheduling
 */
export interface ScheduleData {
  /** Whether to schedule crews now or skip */
  scheduleNow: boolean;

  /** Crew assignments (if scheduleNow is true) */
  crewAssignments: CrewAssignmentData[];

  /** Scheduling notes */
  schedulingNotes?: string | null;
}

/**
 * Individual crew assignment
 */
export interface CrewAssignmentData {
  /** Temporary ID for wizard */
  tempId: string;

  /** Crew ID to assign */
  crewId: string;

  /** Crew name (for display) */
  crewName: string;

  /** Scheduled start datetime */
  scheduledStart: string;  // ISO 8601 timestamp

  /** Scheduled end datetime */
  scheduledEnd: string;    // ISO 8601 timestamp

  /** Estimated hours for this crew */
  estimatedHours?: number | null;

  /** Assignment notes */
  assignmentNotes?: string | null;

  /** Work description for this crew */
  workDescription?: string | null;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation result for a wizard step
 * Generic type for step-specific validation
 */
export interface ValidationResult<T = unknown> {
  /** Whether validation passed */
  isValid: boolean;

  /** Validation errors (if any) */
  errors: ValidationError[];

  /** Warnings that don't block progression */
  warnings: ValidationWarning[];

  /** Validated data (if isValid is true) */
  data?: T;
}

/**
 * Individual validation error
 */
export interface ValidationError {
  /** Field path that failed validation */
  field: string;

  /** Error message */
  message: string;

  /** Error code for programmatic handling */
  code: ValidationErrorCode;

  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Validation warning (non-blocking)
 */
export interface ValidationWarning {
  /** Field path with warning */
  field: string;

  /** Warning message */
  message: string;

  /** Warning severity */
  severity: 'low' | 'medium' | 'high';
}

/**
 * Validation error codes
 */
export type ValidationErrorCode =
  | 'REQUIRED_FIELD'
  | 'INVALID_FORMAT'
  | 'OUT_OF_RANGE'
  | 'DUPLICATE_VALUE'
  | 'INVALID_DATE'
  | 'FUTURE_DATE_REQUIRED'
  | 'PAST_DATE_INVALID'
  | 'CUSTOMER_NOT_FOUND'
  | 'SERVICE_CONFIG_NOT_FOUND'
  | 'CALCULATION_FAILED'
  | 'CREW_CONFLICT'
  | 'INSUFFICIENT_DATA'
  | 'CUSTOM_VALIDATION';

/**
 * Validation errors map keyed by field path
 */
export interface ValidationErrors {
  [fieldPath: string]: ValidationError[];
}

// ============================================================================
// Step-Specific Validation Schemas (Zod)
// ============================================================================

/**
 * Zod schema for customer selection step
 */
export const customerSelectionSchema = z.discriminatedUnion('selectionMode', [
  // Existing customer selection
  z.object({
    selectionMode: z.literal('existing'),
    selectedCustomer: z.object({
      id: z.string().uuid(),
      customer_name: z.string().min(1),
      customer_email: z.string().email().optional().nullable(),
      customer_phone: z.string().optional().nullable(),
    }),
  }),

  // New customer creation
  z.object({
    selectionMode: z.literal('create-new'),
    newCustomerData: z.object({
      company_id: z.string().uuid(),
      customer_name: z.string().min(1, 'Customer name is required'),
      customer_email: z.string().email('Invalid email format').optional().nullable(),
      customer_phone: z.string().optional().nullable(),
      customer_address: z.string().optional().nullable(),
      customer_notes: z.string().optional().nullable(),
      created_by_user_id: z.string().uuid(),
    }),
  }),

  // Chat import
  z.object({
    selectionMode: z.literal('from-chat'),
    chatImportData: z.object({
      sessionId: z.string(),
      customerName: z.string().min(1),
      customerEmail: z.string().email().optional().nullable(),
      customerPhone: z.string().optional().nullable(),
      extractionConfidence: z.number().min(0).max(1),
    }),
  }),
]);

/**
 * Zod schema for job details step
 */
export const jobDetailsSchema = z.object({
  title: z.string().min(3, 'Job title must be at least 3 characters'),
  description: z.string().optional().nullable(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  priorityNumeric: z.number().min(0).max(10),
  location: z.object({
    serviceAddress: z.string().optional().nullable(),
    serviceCity: z.string().optional().nullable(),
    serviceState: z.string().optional().nullable(),
    serviceZip: z.string().optional().nullable(),
    locationNotes: z.string().optional().nullable(),
    useCustomerAddress: z.boolean(),
  }),
  scheduling: z.object({
    requestedStartDate: z.string().optional().nullable(),
    scheduledStartDate: z.string().optional().nullable(),
    scheduledEndDate: z.string().optional().nullable(),
    quoteValidUntil: z.string().optional().nullable(),
    schedulingNotes: z.string().optional().nullable(),
  }),
  tags: z.array(z.string()).default([]),
});

/**
 * Zod schema for services step
 */
export const servicesSchema = z.object({
  services: z.array(
    z.object({
      tempId: z.string(),
      serviceConfigId: z.string().uuid(),
      serviceName: z.string().min(1),
      serviceDescription: z.string().optional().nullable(),
      quantity: z.number().positive(),
      unitPrice: z.number().nonnegative(),
      totalPrice: z.number().nonnegative(),
      source: z.enum(['ai-chat', 'quick-calculator', 'manual', 'template']),
      isOptional: z.boolean(),
      displayOrder: z.number().int().nonnegative(),
      notes: z.string().optional().nullable(),
    })
  ).min(1, 'At least one service is required'),
  totalEstimated: z.number().positive('Total must be greater than 0'),
  serviceNotes: z.string().optional().nullable(),
});

/**
 * Zod schema for review step
 */
export const reviewSchema = z.object({
  confirmations: z.object({
    pricingConfirmed: z.literal(true).describe('You must confirm pricing is accurate'),
    customerInfoConfirmed: z.literal(true).describe('You must confirm customer information'),
    scopeConfirmed: z.literal(true).describe('You must confirm scope of work'),
    sendQuoteToCustomer: z.boolean(),
  }),
  additionalNotes: z.string().optional().nullable(),
});

/**
 * Zod schema for schedule step
 */
export const scheduleSchema = z.object({
  scheduleNow: z.boolean(),
  crewAssignments: z.array(
    z.object({
      tempId: z.string(),
      crewId: z.string().uuid(),
      crewName: z.string(),
      scheduledStart: z.string().datetime(),
      scheduledEnd: z.string().datetime(),
      estimatedHours: z.number().positive().optional().nullable(),
      assignmentNotes: z.string().optional().nullable(),
      workDescription: z.string().optional().nullable(),
    })
  ).default([]),
  schedulingNotes: z.string().optional().nullable(),
}).refine(
  (data) => !data.scheduleNow || data.crewAssignments.length > 0,
  {
    message: 'At least one crew must be assigned when scheduling now',
    path: ['crewAssignments'],
  }
);

// ============================================================================
// Service Response Types
// ============================================================================

/**
 * Response from wizard submission
 */
export interface WizardSubmissionResponse {
  /** Whether submission was successful */
  success: boolean;

  /** Created job (if successful) */
  job?: Job | null;

  /** Created customer (if new customer was created) */
  customer?: CustomerProfile | null;

  /** Created job services */
  jobServices?: JobService[];

  /** Error message (if failed) */
  error?: string;

  /** Detailed error information */
  errorDetails?: SubmissionError;

  /** Submission metadata */
  metadata: {
    submittedAt: string;
    processingTimeMs: number;
    createdEntities: string[];  // List of created entity types
  };
}

/**
 * Detailed submission error information
 */
export interface SubmissionError {
  /** Error stage where failure occurred */
  stage: SubmissionStage;

  /** Error message */
  message: string;

  /** Error code */
  code: string;

  /** Stack trace (development only) */
  stack?: string;

  /** Validation errors (if validation failed) */
  validationErrors?: ValidationError[];

  /** Database error details (if database operation failed) */
  databaseError?: {
    table: string;
    operation: string;
    constraint?: string;
  };
}

/**
 * Submission stage for error tracking
 */
export type SubmissionStage =
  | 'validation'
  | 'customer-creation'
  | 'job-creation'
  | 'service-creation'
  | 'crew-assignment'
  | 'quote-generation'
  | 'notification';

// ============================================================================
// Integration Types
// ============================================================================

/**
 * Chat interface result extraction
 * Extracts structured data from AI chat conversation
 */
export interface ChatInterfaceResult {
  /** Extracted customer information */
  customer: ChatCustomerImport | null;

  /** Extracted service requirements */
  services: ChatServiceExtraction[];

  /** Extracted project details */
  projectDetails: ChatProjectDetails | null;

  /** Overall extraction confidence (0-1) */
  confidence: number;

  /** Chat session metadata */
  sessionMetadata: {
    sessionId: string;
    interactionCount: number;
    totalTokens: number;
    conversationDate: string;
  };
}

/**
 * Service extracted from chat conversation
 */
export interface ChatServiceExtraction {
  /** Service type identifier */
  serviceType: string;

  /** Service name */
  serviceName: string;

  /** Extracted parameters */
  parameters: Record<string, unknown>;

  /** Confidence of extraction (0-1) */
  confidence: number;

  /** Raw text snippet where service was mentioned */
  sourceText: string;
}

/**
 * Project details extracted from chat
 */
export interface ChatProjectDetails {
  /** Project description */
  description?: string;

  /** Requested timeline */
  timeline?: string;

  /** Budget mentioned */
  budgetRange?: {
    min?: number;
    max?: number;
  };

  /** Special requirements */
  specialRequirements?: string[];

  /** Customer preferences */
  preferences?: Record<string, unknown>;
}

/**
 * MasterPricingEngine calculation result type
 * Re-export for convenience
 */
export type PricingEngineResult = PaverPatioCalculationResult;

/**
 * Customer management service response
 */
export interface CustomerManagementResponse {
  /** Operation success status */
  success: boolean;

  /** Customer data (if found or created) */
  customer?: CustomerProfile;

  /** Action performed */
  action: 'found' | 'created' | 'updated' | 'error';

  /** Error message (if failed) */
  error?: string;

  /** Duplicate customers found (if any) */
  duplicates?: CustomerProfile[];
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract step data type by step number
 */
export type StepDataType<T extends WizardStep> =
  T extends 1 ? CustomerSelectionData :
  T extends 2 ? JobDetailsData :
  T extends 3 ? ServicesData :
  T extends 4 ? ReviewData :
  T extends 5 ? ScheduleData :
  never;

/**
 * Wizard navigation direction
 */
export type NavigationDirection = 'next' | 'previous' | 'jump';

/**
 * Wizard action types for state management
 */
export type WizardAction =
  | { type: 'SET_STEP'; payload: WizardStep }
  | { type: 'SET_CUSTOMER_DATA'; payload: CustomerSelectionData }
  | { type: 'SET_JOB_DETAILS'; payload: JobDetailsData }
  | { type: 'SET_SERVICES_DATA'; payload: ServicesData }
  | { type: 'SET_REVIEW_DATA'; payload: ReviewData }
  | { type: 'SET_SCHEDULE_DATA'; payload: ScheduleData }
  | { type: 'SET_VALIDATION_ERRORS'; payload: ValidationErrors | null }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_SAVE_ERROR'; payload: string | null }
  | { type: 'RESET_WIZARD' }
  | { type: 'UPDATE_METADATA'; payload: Partial<WizardMetadata> };

/**
 * Step completion status
 */
export interface StepCompletionStatus {
  step1Complete: boolean;
  step2Complete: boolean;
  step3Complete: boolean;
  step4Complete: boolean;
  step5Complete: boolean;
  overallComplete: boolean;
}

/**
 * Progress indicator data
 */
export interface WizardProgress {
  currentStep: WizardStep;
  totalSteps: 5;
  completedSteps: WizardStep[];
  percentComplete: number;
  canNavigateForward: boolean;
  canNavigateBackward: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard: Check if object is CustomerSelectionData
 */
export const isCustomerSelectionData = (obj: unknown): obj is CustomerSelectionData => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'selectionMode' in obj &&
    typeof (obj as CustomerSelectionData).selectionMode === 'string'
  );
};

/**
 * Type guard: Check if object is JobDetailsData
 */
export const isJobDetailsData = (obj: unknown): obj is JobDetailsData => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'title' in obj &&
    'location' in obj &&
    'scheduling' in obj
  );
};

/**
 * Type guard: Check if object is ServicesData
 */
export const isServicesData = (obj: unknown): obj is ServicesData => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'services' in obj &&
    Array.isArray((obj as ServicesData).services)
  );
};

/**
 * Type guard: Check if object is ReviewData
 */
export const isReviewData = (obj: unknown): obj is ReviewData => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'customerSummary' in obj &&
    'jobSummary' in obj &&
    'confirmations' in obj
  );
};

/**
 * Type guard: Check if object is ScheduleData
 */
export const isScheduleData = (obj: unknown): obj is ScheduleData => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'scheduleNow' in obj &&
    typeof (obj as ScheduleData).scheduleNow === 'boolean'
  );
};

/**
 * Type guard: Check if validation result is successful
 */
export const isValidationSuccess = <T>(
  result: ValidationResult<T>
): result is ValidationResult<T> & { isValid: true; data: T } => {
  return result.isValid && result.data !== undefined;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate wizard progress percentage
 */
export const calculateProgress = (state: JobWizardState): number => {
  const completedSteps = [
    state.customerData !== null,
    state.jobDetailsData !== null,
    state.servicesData !== null,
    state.reviewData !== null,
    state.scheduleData !== null,
  ].filter(Boolean).length;

  return (completedSteps / 5) * 100;
};

/**
 * Get step completion status
 */
export const getStepCompletionStatus = (state: JobWizardState): StepCompletionStatus => {
  return {
    step1Complete: state.customerData !== null,
    step2Complete: state.jobDetailsData !== null,
    step3Complete: state.servicesData !== null,
    step4Complete: state.reviewData !== null,
    step5Complete: state.scheduleData !== null,
    overallComplete: state.isComplete,
  };
};

/**
 * Check if user can navigate to specific step
 */
export const canNavigateToStep = (
  targetStep: WizardStep,
  currentState: JobWizardState
): boolean => {
  const status = getStepCompletionStatus(currentState);

  switch (targetStep) {
    case 1:
      return true; // Can always go to step 1
    case 2:
      return status.step1Complete;
    case 3:
      return status.step1Complete && status.step2Complete;
    case 4:
      return status.step1Complete && status.step2Complete && status.step3Complete;
    case 5:
      return status.step1Complete && status.step2Complete && status.step3Complete && status.step4Complete;
    default:
      return false;
  }
};

/**
 * Generate unique temporary ID for wizard entities
 */
export const generateTempId = (): string => {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Convert JobWizardState to CreateJobInput
 */
export const convertWizardStateToJobInput = (
  state: JobWizardState,
  customerId: string,
  companyId: string,
  userId: string
): CreateJobInput => {
  if (!state.jobDetailsData || !state.servicesData) {
    throw new Error('Incomplete wizard state: missing required data');
  }

  const jobDetails = state.jobDetailsData;
  const services = state.servicesData;

  return {
    company_id: companyId,
    customer_id: customerId,
    title: jobDetails.title,
    description: jobDetails.description,
    service_address: jobDetails.location.serviceAddress,
    service_city: jobDetails.location.serviceCity,
    service_state: jobDetails.location.serviceState,
    service_zip: jobDetails.location.serviceZip,
    service_location_notes: jobDetails.location.locationNotes,
    requested_start_date: jobDetails.scheduling.requestedStartDate,
    scheduled_start_date: jobDetails.scheduling.scheduledStartDate,
    scheduled_end_date: jobDetails.scheduling.scheduledEndDate,
    quote_valid_until: jobDetails.scheduling.quoteValidUntil,
    estimated_total: services.totalEstimated,
    labor_cost: services.totalLaborCost,
    material_cost: services.totalMaterialCost,
    priority: jobDetails.priorityNumeric,
    tags: jobDetails.tags,
    services: services.services.map(convertServiceLineItemToJobServiceInput),
    metadata: {
      wizardSessionId: state.metadata.sessionId,
      wizardSource: state.metadata.source,
      createdViaWizard: true,
    },
    created_by_user_id: userId,
  };
};

/**
 * Convert ServiceLineItem to CreateJobServiceInput
 */
export const convertServiceLineItemToJobServiceInput = (
  item: ServiceLineItem
): CreateJobServiceInput => {
  return {
    service_config_id: item.serviceConfigId,
    service_name: item.serviceName,
    service_description: item.serviceDescription,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
    calculation_data: item.calculation.calculationData,
    pricing_variables: item.calculation.pricingVariables,
    notes: item.notes,
    metadata: {
      source: item.source,
      calculationMethod: item.calculation.calculationMethod,
      isOptional: item.isOptional,
      displayOrder: item.displayOrder,
    },
    added_by_user_id: '', // Will be set by caller
  };
};

/**
 * Format step label for display
 */
export const getStepLabel = (step: WizardStep): string => {
  const labels: Record<WizardStep, string> = {
    1: 'Customer',
    2: 'Job Details',
    3: 'Services',
    4: 'Review',
    5: 'Schedule',
  };
  return labels[step];
};

/**
 * Format step description for display
 */
export const getStepDescription = (step: WizardStep): string => {
  const descriptions: Record<WizardStep, string> = {
    1: 'Select or create customer',
    2: 'Enter job details and location',
    3: 'Add and configure services',
    4: 'Review and confirm',
    5: 'Schedule crews (optional)',
  };
  return descriptions[step];
};

// ============================================================================
// Export all types
// ============================================================================

export type {
  // Re-export from dependencies
  Job,
  CreateJobInput,
  JobService,
  CreateJobServiceInput,
  CustomerProfile,
  ServiceCalculationData,
};
