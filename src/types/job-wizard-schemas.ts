/**
 * Job Wizard Runtime Validation Schemas
 *
 * Zod schemas for runtime validation of wizard data.
 * Provides type-safe validation with detailed error messages.
 *
 * @module job-wizard-schemas
 */

import { z } from 'zod';

// ============================================================================
// Custom Zod Extensions
// ============================================================================

/**
 * Custom error messages for common validations
 */
const errorMessages = {
  required: (field: string) => `${field} is required`,
  min: (field: string, min: number) => `${field} must be at least ${min} characters`,
  max: (field: string, max: number) => `${field} must be at most ${max} characters`,
  email: 'Invalid email format',
  phone: 'Invalid phone number format',
  uuid: 'Invalid UUID format',
  futureDate: 'Date must be in the future',
  pastDate: 'Date must be in the past',
  positiveNumber: (field: string) => `${field} must be a positive number`,
  minNumber: (field: string, min: number) => `${field} must be at least ${min}`,
  maxNumber: (field: string, max: number) => `${field} must be at most ${max}`,
};

/**
 * Custom Zod refinement for future dates
 */
const isFutureDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  return date > now;
};

/**
 * Custom Zod refinement for valid phone numbers (basic validation)
 */
const isValidPhoneNumber = (phone: string): boolean => {
  // Basic phone validation - accepts various formats
  const phoneRegex = /^[\d\s\-\(\)\+\.]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

// ============================================================================
// Step 1: Customer Selection Schemas
// ============================================================================

/**
 * Chat customer import schema
 */
export const chatCustomerImportSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  customerName: z.string().min(1, errorMessages.required('Customer name')),
  customerEmail: z
    .string()
    .email(errorMessages.email)
    .optional()
    .nullable(),
  customerPhone: z
    .string()
    .refine((val) => !val || isValidPhoneNumber(val), {
      message: errorMessages.phone,
    })
    .optional()
    .nullable(),
  customerAddress: z.string().optional().nullable(),
  conversationSummary: z.string().optional(),
  extractionConfidence: z
    .number()
    .min(0)
    .max(1)
    .default(0.8),
  chatTimestamp: z.string().datetime(),
});

/**
 * New customer data schema (for create-new mode)
 */
export const newCustomerDataSchema = z.object({
  company_id: z.string().uuid(errorMessages.uuid),
  customer_name: z
    .string()
    .min(1, errorMessages.required('Customer name'))
    .max(255, errorMessages.max('Customer name', 255)),
  customer_email: z
    .string()
    .email(errorMessages.email)
    .optional()
    .nullable(),
  customer_phone: z
    .string()
    .refine((val) => !val || isValidPhoneNumber(val), {
      message: errorMessages.phone,
    })
    .optional()
    .nullable(),
  customer_address: z
    .string()
    .max(500, errorMessages.max('Customer address', 500))
    .optional()
    .nullable(),
  customer_notes: z.string().optional().nullable(),
  lifecycle_stage: z
    .enum(['prospect', 'lead', 'customer', 'churned'])
    .default('lead'),
  tags: z.array(z.string()).default([]),
  source: z.enum(['chat', 'manual', 'import']).default('manual'),
  source_campaign: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
  created_by_user_id: z.string().uuid(errorMessages.uuid),
  created_by_user_name: z.string().optional().nullable(),
});

/**
 * Selected existing customer schema
 */
export const selectedCustomerSchema = z.object({
  id: z.string().uuid(errorMessages.uuid),
  customer_name: z.string().min(1),
  customer_email: z.string().email().optional().nullable(),
  customer_phone: z.string().optional().nullable(),
  customer_address: z.string().optional().nullable(),
  company_id: z.string().uuid(),
  status: z.enum(['active', 'inactive', 'merged', 'deleted']),
  lifecycle_stage: z.enum(['prospect', 'lead', 'customer', 'churned']),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Complete customer selection data schema (discriminated union)
 */
export const customerSelectionDataSchema = z.discriminatedUnion('selectionMode', [
  // Existing customer
  z.object({
    selectionMode: z.literal('existing'),
    selectedCustomer: selectedCustomerSchema,
    searchQuery: z.string().optional(),
    recentCustomers: z.array(selectedCustomerSchema).optional(),
  }),

  // Create new customer
  z.object({
    selectionMode: z.literal('create-new'),
    newCustomerData: newCustomerDataSchema,
    searchQuery: z.string().optional(),
    recentCustomers: z.array(selectedCustomerSchema).optional(),
  }),

  // Import from chat
  z.object({
    selectionMode: z.literal('from-chat'),
    chatImportData: chatCustomerImportSchema,
    searchQuery: z.string().optional(),
    recentCustomers: z.array(selectedCustomerSchema).optional(),
  }),
]);

// ============================================================================
// Step 2: Job Details Schemas
// ============================================================================

/**
 * Job location data schema
 */
export const jobLocationDataSchema = z.object({
  serviceAddress: z
    .string()
    .min(1, errorMessages.required('Service address'))
    .max(500, errorMessages.max('Service address', 500))
    .optional()
    .nullable(),
  serviceCity: z
    .string()
    .max(100, errorMessages.max('City', 100))
    .optional()
    .nullable(),
  serviceState: z
    .string()
    .max(50, errorMessages.max('State', 50))
    .optional()
    .nullable(),
  serviceZip: z
    .string()
    .max(20, errorMessages.max('ZIP code', 20))
    .optional()
    .nullable(),
  locationNotes: z
    .string()
    .max(1000, errorMessages.max('Location notes', 1000))
    .optional()
    .nullable(),
  useCustomerAddress: z.boolean().default(true),
  coordinates: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional()
    .nullable(),
}).refine(
  (data) => {
    // If not using customer address, at least address is required
    if (!data.useCustomerAddress) {
      return !!data.serviceAddress;
    }
    return true;
  },
  {
    message: 'Service address is required when not using customer address',
    path: ['serviceAddress'],
  }
);

/**
 * Job scheduling data schema
 */
export const jobSchedulingDataSchema = z.object({
  requestedStartDate: z
    .string()
    .date()
    .optional()
    .nullable(),
  scheduledStartDate: z
    .string()
    .date()
    .optional()
    .nullable(),
  scheduledEndDate: z
    .string()
    .date()
    .optional()
    .nullable(),
  quoteValidUntil: z
    .string()
    .date()
    .optional()
    .nullable(),
  schedulingNotes: z
    .string()
    .max(1000, errorMessages.max('Scheduling notes', 1000))
    .optional()
    .nullable(),
  estimatedDurationDays: z
    .number()
    .positive()
    .optional()
    .nullable(),
}).refine(
  (data) => {
    // If both start and end are provided, end must be after start
    if (data.scheduledStartDate && data.scheduledEndDate) {
      const start = new Date(data.scheduledStartDate);
      const end = new Date(data.scheduledEndDate);
      return end >= start;
    }
    return true;
  },
  {
    message: 'Scheduled end date must be after start date',
    path: ['scheduledEndDate'],
  }
).refine(
  (data) => {
    // Quote validity should be in the future if provided
    if (data.quoteValidUntil) {
      return isFutureDate(data.quoteValidUntil);
    }
    return true;
  },
  {
    message: 'Quote validity date must be in the future',
    path: ['quoteValidUntil'],
  }
);

/**
 * Complete job details data schema
 */
export const jobDetailsDataSchema = z.object({
  title: z
    .string()
    .min(3, errorMessages.min('Job title', 3))
    .max(255, errorMessages.max('Job title', 255)),
  description: z
    .string()
    .max(2000, errorMessages.max('Description', 2000))
    .optional()
    .nullable(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  priorityNumeric: z
    .number()
    .int()
    .min(0, errorMessages.minNumber('Priority', 0))
    .max(10, errorMessages.maxNumber('Priority', 10)),
  location: jobLocationDataSchema,
  scheduling: jobSchedulingDataSchema,
  tags: z
    .array(z.string().max(50))
    .max(20, 'Maximum 20 tags allowed')
    .default([]),
  customFields: z.record(z.unknown()).optional(),
});

// ============================================================================
// Step 3: Services Schemas
// ============================================================================

/**
 * Paver patio pricing variables schema
 */
export const paverPatioPricingVariablesSchema = z.object({
  siteAccess: z.object({
    accessDifficulty: z.string(),
    obstacleRemoval: z.string(),
  }),
  materials: z.object({
    paverStyle: z.string(),
    cuttingComplexity: z.string(),
    useMaterialsDatabase: z.boolean().optional(),
  }),
  labor: z.object({
    teamSize: z.string(),
  }),
  complexity: z.object({
    overallComplexity: z.number(),
  }),
  serviceIntegrations: z
    .object({
      includeExcavation: z.boolean().optional(),
    })
    .optional(),
  selectedMaterials: z.record(z.string()).optional(),
  customPerimeter: z.number().positive().optional(),
});

/**
 * Excavation pricing variables schema
 */
export const excavationPricingVariablesSchema = z.object({
  area_sqft: z.number().positive(errorMessages.positiveNumber('Area')),
  depth_inches: z.number().positive(errorMessages.positiveNumber('Depth')),
});

/**
 * Generic pricing variables schema
 */
export const pricingVariablesSchema = z.object({
  paverPatio: paverPatioPricingVariablesSchema.optional(),
  excavation: excavationPricingVariablesSchema.optional(),
}).passthrough(); // Allow additional service types

/**
 * Service calculation data schema (matches ServiceCalculationData from crm.ts)
 */
export const serviceCalculationDataSchema = z.object({
  tier1Results: z
    .object({
      baseHours: z.number(),
      adjustedHours: z.number(),
      totalManHours: z.number(),
      totalDays: z.number(),
      breakdown: z.array(z.string()),
    })
    .optional(),
  tier2Results: z
    .object({
      laborCost: z.number(),
      materialCostBase: z.number(),
      materialWasteCost: z.number(),
      totalMaterialCost: z.number(),
      equipmentCost: z.number(),
      obstacleCost: z.number(),
      subtotal: z.number(),
      profit: z.number(),
      total: z.number(),
      pricePerSqft: z.number(),
    })
    .optional(),
  breakdown: z.string().optional(),
  sqft: z.number().optional(),
  inputValues: z.record(z.unknown()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  calculationDate: z.string().optional(),
}).passthrough(); // Allow additional fields for extensibility

/**
 * Service calculation schema
 */
export const serviceCalculationSchema = z.object({
  calculationMethod: z.enum([
    'master-pricing-engine',
    'ai-estimation',
    'manual-entry',
    'template-based',
  ]),
  calculationData: serviceCalculationDataSchema,
  pricingVariables: pricingVariablesSchema,
  squareFootage: z.number().positive().optional().nullable(),
  linearFootage: z.number().positive().optional().nullable(),
  laborHours: z.number().nonnegative().optional().nullable(),
  laborCost: z.number().nonnegative().optional().nullable(),
  materialCost: z.number().nonnegative().optional().nullable(),
  profitMargin: z.number().min(0).max(1).optional().nullable(),
  pricePerSqft: z.number().nonnegative().optional().nullable(),
  confidence: z.number().min(0).max(1),
  calculatedAt: z.string().datetime(),
});

/**
 * Service line item schema
 */
export const serviceLineItemSchema = z.object({
  tempId: z.string().min(1),
  serviceConfigId: z.string().uuid(errorMessages.uuid),
  serviceName: z
    .string()
    .min(1, errorMessages.required('Service name'))
    .max(255, errorMessages.max('Service name', 255)),
  serviceDescription: z
    .string()
    .max(1000, errorMessages.max('Service description', 1000))
    .optional()
    .nullable(),
  quantity: z
    .number()
    .positive(errorMessages.positiveNumber('Quantity'))
    .default(1),
  unitPrice: z
    .number()
    .nonnegative('Unit price must be non-negative'),
  totalPrice: z
    .number()
    .nonnegative('Total price must be non-negative'),
  source: z.enum(['ai-chat', 'quick-calculator', 'manual', 'template']),
  calculation: serviceCalculationSchema,
  notes: z
    .string()
    .max(1000, errorMessages.max('Service notes', 1000))
    .optional()
    .nullable(),
  isOptional: z.boolean().default(false),
  displayOrder: z
    .number()
    .int()
    .nonnegative()
    .default(0),
}).refine(
  (data) => {
    // Total price should match quantity * unit price (with small tolerance for rounding)
    const expectedTotal = data.quantity * data.unitPrice;
    const tolerance = 0.01;
    return Math.abs(data.totalPrice - expectedTotal) <= tolerance;
  },
  {
    message: 'Total price must equal quantity × unit price',
    path: ['totalPrice'],
  }
);

/**
 * Services calculation summary schema
 */
export const servicesCalculationSummarySchema = z.object({
  serviceCount: z.number().int().nonnegative(),
  optionalServiceCount: z.number().int().nonnegative(),
  totalLaborHours: z.number().nonnegative(),
  totalLaborCost: z.number().nonnegative(),
  totalMaterialCost: z.number().nonnegative(),
  totalEquipmentCost: z.number().nonnegative(),
  totalOtherCosts: z.number().nonnegative(),
  totalProfit: z.number().nonnegative(),
  overallProfitMargin: z.number().min(0).max(1),
  subtotal: z.number().nonnegative(),
  grandTotal: z.number().positive(errorMessages.positiveNumber('Grand total')),
  estimatedDurationDays: z.number().positive(),
});

/**
 * Complete services data schema
 */
export const servicesDataSchema = z.object({
  services: z
    .array(serviceLineItemSchema)
    .min(1, 'At least one service is required')
    .max(50, 'Maximum 50 services allowed'),
  totalEstimated: z
    .number()
    .positive(errorMessages.positiveNumber('Total estimated')),
  totalLaborCost: z.number().nonnegative(),
  totalMaterialCost: z.number().nonnegative(),
  calculationSummary: servicesCalculationSummarySchema,
  serviceNotes: z
    .string()
    .max(2000, errorMessages.max('Service notes', 2000))
    .optional()
    .nullable(),
}).refine(
  (data) => {
    // Total estimated should match sum of service totals
    const sumOfServices = data.services.reduce((sum, svc) => sum + svc.totalPrice, 0);
    const tolerance = 0.01;
    return Math.abs(data.totalEstimated - sumOfServices) <= tolerance;
  },
  {
    message: 'Total estimated must equal sum of all service totals',
    path: ['totalEstimated'],
  }
);

// ============================================================================
// Step 4: Review Schemas
// ============================================================================

/**
 * Customer review summary schema
 */
export const customerReviewSummarySchema = z.object({
  customerId: z.string().uuid().optional(),
  customerName: z.string().min(1),
  customerEmail: z.string().email().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  isNewCustomer: z.boolean(),
});

/**
 * Job review summary schema
 */
export const jobReviewSummarySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  serviceAddress: z.string().min(1),
  requestedStartDate: z.string().optional().nullable(),
  scheduledStartDate: z.string().optional().nullable(),
  scheduledEndDate: z.string().optional().nullable(),
  tags: z.array(z.string()),
});

/**
 * Services review summary schema
 */
export const servicesReviewSummarySchema = z.object({
  services: z.array(
    z.object({
      serviceName: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      totalPrice: z.number(),
      isOptional: z.boolean(),
    })
  ),
  totalServices: z.number().int().nonnegative(),
  totalOptionalServices: z.number().int().nonnegative(),
});

/**
 * Pricing review summary schema
 */
export const pricingReviewSummarySchema = z.object({
  totalLaborCost: z.number().nonnegative(),
  totalMaterialCost: z.number().nonnegative(),
  totalOtherCosts: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
  profit: z.number().nonnegative(),
  profitMarginPercentage: z.number().min(0).max(100),
  grandTotal: z.number().positive(),
  estimatedDurationDays: z.number().positive(),
});

/**
 * Review confirmations schema
 */
export const reviewConfirmationsSchema = z.object({
  pricingConfirmed: z.literal(true).describe('You must confirm pricing is accurate'),
  customerInfoConfirmed: z.literal(true).describe('You must confirm customer information'),
  scopeConfirmed: z.literal(true).describe('You must confirm scope of work'),
  sendQuoteToCustomer: z.boolean(),
});

/**
 * Complete review data schema
 */
export const reviewDataSchema = z.object({
  customerSummary: customerReviewSummarySchema,
  jobSummary: jobReviewSummarySchema,
  servicesSummary: servicesReviewSummarySchema,
  pricingSummary: pricingReviewSummarySchema,
  confirmations: reviewConfirmationsSchema,
  additionalNotes: z
    .string()
    .max(2000, errorMessages.max('Additional notes', 2000))
    .optional()
    .nullable(),
});

// ============================================================================
// Step 5: Schedule Schemas
// ============================================================================

/**
 * Crew assignment data schema
 */
export const crewAssignmentDataSchema = z.object({
  tempId: z.string().min(1),
  crewId: z.string().uuid(errorMessages.uuid),
  crewName: z.string().min(1),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  estimatedHours: z
    .number()
    .positive()
    .optional()
    .nullable(),
  assignmentNotes: z
    .string()
    .max(1000, errorMessages.max('Assignment notes', 1000))
    .optional()
    .nullable(),
  workDescription: z
    .string()
    .max(1000, errorMessages.max('Work description', 1000))
    .optional()
    .nullable(),
}).refine(
  (data) => {
    // Scheduled end must be after start
    const start = new Date(data.scheduledStart);
    const end = new Date(data.scheduledEnd);
    return end > start;
  },
  {
    message: 'Scheduled end must be after scheduled start',
    path: ['scheduledEnd'],
  }
);

/**
 * Complete schedule data schema
 */
export const scheduleDataSchema = z.object({
  scheduleNow: z.boolean(),
  crewAssignments: z
    .array(crewAssignmentDataSchema)
    .default([]),
  schedulingNotes: z
    .string()
    .max(2000, errorMessages.max('Scheduling notes', 2000))
    .optional()
    .nullable(),
}).refine(
  (data) => {
    // If scheduling now, must have at least one crew assignment
    if (data.scheduleNow) {
      return data.crewAssignments.length > 0;
    }
    return true;
  },
  {
    message: 'At least one crew must be assigned when scheduling now',
    path: ['crewAssignments'],
  }
);

// ============================================================================
// Complete Wizard State Schema
// ============================================================================

/**
 * Wizard metadata schema
 */
export const wizardMetadataSchema = z.object({
  sessionId: z.string().uuid(),
  startedAt: z.string().datetime(),
  lastModifiedAt: z.string().datetime(),
  initiatedByUserId: z.string().uuid(),
  companyId: z.string().uuid(),
  source: z.enum([
    'dashboard-quick-action',
    'jobs-list-button',
    'customer-profile-action',
    'ai-chat-handoff',
    'quick-calculator-convert',
    'calendar-schedule',
    'mobile-app',
  ]),
  backNavigationCount: z.number().int().nonnegative().default(0),
  totalTimeSpent: z.number().nonnegative().optional(),
});

/**
 * Complete wizard state schema
 */
export const jobWizardStateSchema = z.object({
  currentStep: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  isComplete: z.boolean(),
  customerData: customerSelectionDataSchema.nullable(),
  jobDetailsData: jobDetailsDataSchema.nullable(),
  servicesData: servicesDataSchema.nullable(),
  reviewData: reviewDataSchema.nullable(),
  scheduleData: scheduleDataSchema.nullable(),
  validationErrors: z.record(z.array(z.any())).nullable(),
  isSaving: z.boolean().default(false),
  saveError: z.string().nullable(),
  metadata: wizardMetadataSchema,
});

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validate step data based on current step
 */
export const validateStepData = <T>(
  step: 1 | 2 | 3 | 4 | 5,
  data: unknown
): { success: boolean; data?: T; errors?: z.ZodError } => {
  try {
    let schema: z.ZodSchema;

    switch (step) {
      case 1:
        schema = customerSelectionDataSchema;
        break;
      case 2:
        schema = jobDetailsDataSchema;
        break;
      case 3:
        schema = servicesDataSchema;
        break;
      case 4:
        schema = reviewDataSchema;
        break;
      case 5:
        schema = scheduleDataSchema;
        break;
      default:
        throw new Error(`Invalid step: ${step}`);
    }

    const result = schema.parse(data);
    return { success: true, data: result as T };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
};

/**
 * Convert Zod errors to ValidationError array format
 */
export const zodErrorsToValidationErrors = (
  zodError: z.ZodError
): Array<{
  field: string;
  message: string;
  code: string;
}> => {
  return zodError.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
};

/**
 * Safe parse with detailed error information
 */
export const safeParse = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): {
  success: boolean;
  data?: T;
  errors?: Array<{ field: string; message: string; code: string }>;
} => {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: zodErrorsToValidationErrors(result.error),
  };
};

// ============================================================================
// Export schemas
// ============================================================================

export {
  errorMessages,
  isFutureDate,
  isValidPhoneNumber,
};
