/**
 * Job Wizard Type Usage Examples
 *
 * Comprehensive examples demonstrating how to use the job wizard types.
 * These examples serve as both documentation and test fixtures.
 *
 * @module job-wizard-examples
 */

import {
  JobWizardState,
  CustomerSelectionData,
  JobDetailsData,
  ServicesData,
  ReviewData,
  ScheduleData,
  ServiceLineItem,
  WizardMetadata,
  generateTempId,
  convertWizardStateToJobInput,
} from './job-wizard';

import {
  customerSelectionDataSchema,
  jobDetailsDataSchema,
  servicesDataSchema,
  reviewDataSchema,
  scheduleDataSchema,
  validateStepData,
  safeParse,
} from './job-wizard-schemas';

// ============================================================================
// Example 1: Creating Wizard State from Scratch
// ============================================================================

/**
 * Example: Initialize a new wizard session
 */
export const createNewWizardSession = (
  userId: string,
  companyId: string
): JobWizardState => {
  const metadata: WizardMetadata = {
    sessionId: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    lastModifiedAt: new Date().toISOString(),
    initiatedByUserId: userId,
    companyId,
    source: 'dashboard-quick-action',
    backNavigationCount: 0,
  };

  return {
    currentStep: 1,
    isComplete: false,
    customerData: null,
    jobDetailsData: null,
    servicesData: null,
    reviewData: null,
    scheduleData: null,
    validationErrors: null,
    isSaving: false,
    saveError: null,
    metadata,
  };
};

// ============================================================================
// Example 2: Step 1 - Customer Selection (Existing Customer)
// ============================================================================

/**
 * Example: Select an existing customer
 */
export const exampleCustomerSelectionExisting: CustomerSelectionData = {
  selectionMode: 'existing',
  selectedCustomer: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    company_id: '123e4567-e89b-12d3-a456-426614174001',
    customer_name: 'John Smith',
    customer_email: 'john.smith@example.com',
    customer_phone: '(555) 123-4567',
    customer_address: '123 Main St, Springfield, IL 62701',
    status: 'active',
    lifecycle_stage: 'customer',
    source: 'manual',
    tags: ['residential', 'repeat-customer'],
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    created_by_user_id: '123e4567-e89b-12d3-a456-426614174002',
  },
  searchQuery: 'john smith',
};

/**
 * Validate customer selection (existing customer)
 */
export const validateExistingCustomerSelection = () => {
  const result = safeParse(
    customerSelectionDataSchema,
    exampleCustomerSelectionExisting
  );

  if (result.success) {
    console.log('✅ Customer selection is valid');
    return result.data;
  } else {
    console.error('❌ Validation errors:', result.errors);
    return null;
  }
};

// ============================================================================
// Example 3: Step 1 - Customer Selection (Create New)
// ============================================================================

/**
 * Example: Create a new customer in the wizard
 */
export const exampleCustomerSelectionNew: CustomerSelectionData = {
  selectionMode: 'create-new',
  newCustomerData: {
    company_id: '123e4567-e89b-12d3-a456-426614174001',
    customer_name: 'Jane Doe',
    customer_email: 'jane.doe@example.com',
    customer_phone: '(555) 987-6543',
    customer_address: '456 Oak Avenue, Springfield, IL 62702',
    customer_notes: 'Referred by John Smith. Interested in backyard patio.',
    lifecycle_stage: 'lead',
    tags: ['residential', 'new-lead', 'referral'],
    source: 'manual',
    created_by_user_id: '123e4567-e89b-12d3-a456-426614174002',
    created_by_user_name: 'Mike Johnson',
  },
};

// ============================================================================
// Example 4: Step 1 - Customer Selection (From AI Chat)
// ============================================================================

/**
 * Example: Import customer from AI chat conversation
 */
export const exampleCustomerSelectionFromChat: CustomerSelectionData = {
  selectionMode: 'from-chat',
  chatImportData: {
    sessionId: 'chat_123e4567-e89b-12d3-a456-426614174003',
    customerName: 'Robert Williams',
    customerEmail: 'robert.w@example.com',
    customerPhone: '(555) 246-8135',
    customerAddress: '789 Pine Street, Springfield, IL 62703',
    conversationSummary:
      'Customer inquired about paver patio installation for 500 sqft backyard area. ' +
      'Mentioned budget of $8,000-$10,000. Prefers to start in late spring.',
    extractionConfidence: 0.92,
    chatTimestamp: '2025-01-20T14:30:00Z',
  },
};

// ============================================================================
// Example 5: Step 2 - Job Details
// ============================================================================

/**
 * Example: Complete job details with location and scheduling
 */
export const exampleJobDetails: JobDetailsData = {
  title: 'Backyard Paver Patio Installation',
  description:
    'Install 500 sqft paver patio in backyard. Customer prefers Belgard Cambridge ' +
    'Cobble in Sahara Blend. Area requires excavation and grading. Access via side gate.',
  priority: 'high',
  priorityNumeric: 7,
  location: {
    serviceAddress: '123 Main St',
    serviceCity: 'Springfield',
    serviceState: 'IL',
    serviceZip: '62701',
    locationNotes:
      'Gate code: 1234. Park in driveway. Side gate access to backyard. ' +
      'Dog in yard - customer will secure before crew arrival.',
    useCustomerAddress: true,
    coordinates: {
      latitude: 39.7817,
      longitude: -89.6501,
    },
  },
  scheduling: {
    requestedStartDate: '2025-04-15',
    scheduledStartDate: '2025-04-20',
    scheduledEndDate: '2025-04-22',
    quoteValidUntil: '2025-03-15',
    schedulingNotes:
      'Customer prefers weekday work. Must complete before April 25 for ' +
      'family event. Weather-dependent start date.',
    estimatedDurationDays: 3,
  },
  tags: ['paver-patio', 'residential', 'high-priority', 'excavation-required'],
  customFields: {
    projectType: 'outdoor-living',
    customerPriority: 'fast-turnaround',
    specialRequirements: ['side-gate-access', 'pet-on-site'],
  },
};

/**
 * Validate job details
 */
export const validateJobDetails = () => {
  const result = validateStepData<JobDetailsData>(2, exampleJobDetails);

  if (result.success) {
    console.log('✅ Job details are valid');
    return result.data;
  } else {
    console.error('❌ Validation errors:', result.errors?.errors);
    return null;
  }
};

// ============================================================================
// Example 6: Step 3 - Services (Paver Patio + Excavation)
// ============================================================================

/**
 * Example: Service line item for paver patio (from Quick Calculator)
 */
export const exampleServicePaverPatio: ServiceLineItem = {
  tempId: generateTempId(),
  serviceConfigId: '123e4567-e89b-12d3-a456-426614174100',
  serviceName: 'Paver Patio Installation',
  serviceDescription:
    '500 sqft paver patio with Belgard Cambridge Cobble in Sahara Blend. ' +
    'Includes base preparation, paver installation, edge restraint, and polymeric sand.',
  quantity: 1,
  unitPrice: 7250.00,
  totalPrice: 7250.00,
  source: 'quick-calculator',
  calculation: {
    calculationMethod: 'master-pricing-engine',
    calculationData: {
      tier1Results: {
        baseHours: 48.0,
        adjustedHours: 57.6,
        totalManHours: 57.6,
        totalDays: 2.4,
        breakdown: [
          'Base: 500 sqft ÷ 50 sqft/day × 3 people × 8 hours = 48.0 hours',
          '+Access difficulty (+20% of base): +9.6 hours',
          '+Cutting complexity (+10% of base): +4.8 hours',
        ],
      },
      tier2Results: {
        laborCost: 1440.00,
        materialCostBase: 2920.00,
        materialWasteCost: 146.00,
        totalMaterialCost: 3066.00,
        equipmentCost: 0,
        obstacleCost: 150.00,
        subtotal: 6000.00,
        profit: 1250.00,
        total: 7250.00,
        pricePerSqft: 14.50,
      },
      breakdown: 'Labor: $1,440 | Materials: $3,066 | Obstacles: $150 | Profit (20%): $1,250',
      sqft: 500,
      confidence: 0.95,
      calculationDate: '2025-01-20T15:30:00Z',
    },
    pricingVariables: {
      paverPatio: {
        siteAccess: {
          accessDifficulty: 'moderate',
          obstacleRemoval: 'minor',
        },
        materials: {
          paverStyle: 'premium',
          cuttingComplexity: 'moderate',
          useMaterialsDatabase: true,
        },
        labor: {
          teamSize: 'threePlus',
        },
        complexity: {
          overallComplexity: 1.1,
        },
        serviceIntegrations: {
          includeExcavation: false, // Excavation is separate service
        },
      },
    },
    squareFootage: 500,
    laborHours: 57.6,
    laborCost: 1440.00,
    materialCost: 3066.00,
    profitMargin: 0.20,
    pricePerSqft: 14.50,
    confidence: 0.95,
    calculatedAt: '2025-01-20T15:30:00Z',
  },
  notes: 'Premium pavers selected by customer. Requires material order 2 weeks in advance.',
  isOptional: false,
  displayOrder: 1,
};

/**
 * Example: Service line item for excavation (bundled service)
 */
export const exampleServiceExcavation: ServiceLineItem = {
  tempId: generateTempId(),
  serviceConfigId: '123e4567-e89b-12d3-a456-426614174101',
  serviceName: 'Excavation & Removal',
  serviceDescription:
    'Excavate 500 sqft area to 8 inch depth. Remove and haul away soil. ' +
    'Grade and compact base.',
  quantity: 1,
  unitPrice: 1200.00,
  totalPrice: 1200.00,
  source: 'manual',
  calculation: {
    calculationMethod: 'master-pricing-engine',
    calculationData: {
      tier1Results: {
        baseHours: 12.0,
        adjustedHours: 12.0,
        totalManHours: 12.0,
        totalDays: 0.5,
        breakdown: [
          'Base: 500 sqft area × 8 inch depth = 12.3 cubic yards',
          'Excavation time: 12.0 hours (area-based tier)',
        ],
      },
      tier2Results: {
        laborCost: 300.00,
        materialCostBase: 0,
        materialWasteCost: 0,
        totalMaterialCost: 0,
        equipmentCost: 0,
        obstacleCost: 0,
        subtotal: 1000.00,
        profit: 200.00,
        total: 1200.00,
        pricePerSqft: 2.40,
      },
      sqft: 500,
      confidence: 0.90,
      calculationDate: '2025-01-20T15:35:00Z',
    },
    pricingVariables: {
      excavation: {
        area_sqft: 500,
        depth_inches: 8,
      },
    },
    squareFootage: 500,
    laborHours: 12.0,
    laborCost: 300.00,
    materialCost: 0,
    profitMargin: 0.20,
    pricePerSqft: 2.40,
    confidence: 0.90,
    calculatedAt: '2025-01-20T15:35:00Z',
  },
  notes: 'Soil disposal included. May encounter clay layer requiring additional equipment.',
  isOptional: false,
  displayOrder: 0, // Execute before paver installation
};

/**
 * Example: Complete services data with multiple line items
 */
export const exampleServicesData: ServicesData = {
  services: [exampleServiceExcavation, exampleServicePaverPatio],
  totalEstimated: 8450.00,
  totalLaborCost: 1740.00,
  totalMaterialCost: 3066.00,
  calculationSummary: {
    serviceCount: 2,
    optionalServiceCount: 0,
    totalLaborHours: 69.6,
    totalLaborCost: 1740.00,
    totalMaterialCost: 3066.00,
    totalEquipmentCost: 0,
    totalOtherCosts: 150.00,
    totalProfit: 1450.00,
    overallProfitMargin: 0.20,
    subtotal: 7000.00,
    grandTotal: 8450.00,
    estimatedDurationDays: 3,
  },
  serviceNotes:
    'All materials included. Customer responsible for accessing water and power. ' +
    'Weather-dependent schedule - may need to reschedule if rain delays excavation.',
};

// ============================================================================
// Example 7: Step 4 - Review & Confirmation
// ============================================================================

/**
 * Example: Complete review data
 */
export const exampleReviewData: ReviewData = {
  customerSummary: {
    customerId: '123e4567-e89b-12d3-a456-426614174000',
    customerName: 'John Smith',
    customerEmail: 'john.smith@example.com',
    customerPhone: '(555) 123-4567',
    customerAddress: '123 Main St, Springfield, IL 62701',
    isNewCustomer: false,
  },
  jobSummary: {
    title: 'Backyard Paver Patio Installation',
    description:
      'Install 500 sqft paver patio in backyard. Customer prefers Belgard Cambridge ' +
      'Cobble in Sahara Blend.',
    priority: 'high',
    serviceAddress: '123 Main St, Springfield, IL 62701',
    requestedStartDate: '2025-04-15',
    scheduledStartDate: '2025-04-20',
    scheduledEndDate: '2025-04-22',
    tags: ['paver-patio', 'residential', 'high-priority', 'excavation-required'],
  },
  servicesSummary: {
    services: [
      {
        serviceName: 'Excavation & Removal',
        quantity: 1,
        unitPrice: 1200.00,
        totalPrice: 1200.00,
        isOptional: false,
      },
      {
        serviceName: 'Paver Patio Installation',
        quantity: 1,
        unitPrice: 7250.00,
        totalPrice: 7250.00,
        isOptional: false,
      },
    ],
    totalServices: 2,
    totalOptionalServices: 0,
  },
  pricingSummary: {
    totalLaborCost: 1740.00,
    totalMaterialCost: 3066.00,
    totalOtherCosts: 150.00,
    subtotal: 7000.00,
    profit: 1450.00,
    profitMarginPercentage: 20.0,
    grandTotal: 8450.00,
    estimatedDurationDays: 3,
  },
  confirmations: {
    pricingConfirmed: true,
    customerInfoConfirmed: true,
    scopeConfirmed: true,
    sendQuoteToCustomer: true,
  },
  additionalNotes:
    'Customer has been informed of material lead time. Quote email will include ' +
    'color samples and warranty information.',
};

// ============================================================================
// Example 8: Step 5 - Schedule & Crew Assignment
// ============================================================================

/**
 * Example: Schedule data with crew assignments
 */
export const exampleScheduleData: ScheduleData = {
  scheduleNow: true,
  crewAssignments: [
    {
      tempId: generateTempId(),
      crewId: '123e4567-e89b-12d3-a456-426614174200',
      crewName: 'Crew A - Hardscaping',
      scheduledStart: '2025-04-20T07:00:00Z',
      scheduledEnd: '2025-04-20T16:00:00Z',
      estimatedHours: 12.0,
      assignmentNotes: 'Day 1: Excavation and base prep',
      workDescription: 'Complete excavation, grading, and base material installation',
    },
    {
      tempId: generateTempId(),
      crewId: '123e4567-e89b-12d3-a456-426614174200',
      crewName: 'Crew A - Hardscaping',
      scheduledStart: '2025-04-21T07:00:00Z',
      scheduledEnd: '2025-04-21T16:00:00Z',
      estimatedHours: 32.0,
      assignmentNotes: 'Day 2: Paver installation',
      workDescription: 'Install pavers, edge restraints, and sand base',
    },
    {
      tempId: generateTempId(),
      crewId: '123e4567-e89b-12d3-a456-426614174200',
      crewName: 'Crew A - Hardscaping',
      scheduledStart: '2025-04-22T07:00:00Z',
      scheduledEnd: '2025-04-22T12:00:00Z',
      estimatedHours: 15.0,
      assignmentNotes: 'Day 3: Finishing and cleanup',
      workDescription: 'Apply polymeric sand, compact, and final cleanup',
    },
  ],
  schedulingNotes:
    'Crew confirmed available. Equipment rental scheduled. Customer notified of ' +
    'expected start date and daily work hours.',
};

/**
 * Example: Schedule data with no crew assignment (skip scheduling)
 */
export const exampleScheduleDataSkip: ScheduleData = {
  scheduleNow: false,
  crewAssignments: [],
  schedulingNotes:
    'Scheduling deferred until material delivery confirmed. Customer will be ' +
    'contacted once materials arrive.',
};

// ============================================================================
// Example 9: Complete Wizard State (All Steps Completed)
// ============================================================================

/**
 * Example: Complete wizard state ready for submission
 */
export const exampleCompleteWizardState: JobWizardState = {
  currentStep: 5,
  isComplete: true,
  customerData: exampleCustomerSelectionExisting,
  jobDetailsData: exampleJobDetails,
  servicesData: exampleServicesData,
  reviewData: exampleReviewData,
  scheduleData: exampleScheduleData,
  validationErrors: null,
  isSaving: false,
  saveError: null,
  metadata: {
    sessionId: '123e4567-e89b-12d3-a456-426614174999',
    startedAt: '2025-01-20T14:00:00Z',
    lastModifiedAt: '2025-01-20T15:45:00Z',
    initiatedByUserId: '123e4567-e89b-12d3-a456-426614174002',
    companyId: '123e4567-e89b-12d3-a456-426614174001',
    source: 'dashboard-quick-action',
    backNavigationCount: 2,
    totalTimeSpent: 1050, // 17.5 minutes in seconds
  },
};

// ============================================================================
// Example 10: Converting Wizard State to Job Input
// ============================================================================

/**
 * Example: Convert complete wizard state to CreateJobInput
 */
export const convertToJobInput = () => {
  const customerId = exampleCompleteWizardState.customerData?.selectedCustomer?.id;
  const companyId = exampleCompleteWizardState.metadata.companyId;
  const userId = exampleCompleteWizardState.metadata.initiatedByUserId;

  if (!customerId) {
    throw new Error('Customer ID is required');
  }

  const jobInput = convertWizardStateToJobInput(
    exampleCompleteWizardState,
    customerId,
    companyId,
    userId
  );

  console.log('📋 Converted Job Input:', JSON.stringify(jobInput, null, 2));

  return jobInput;
};

// ============================================================================
// Example 11: Validation Error Scenarios
// ============================================================================

/**
 * Example: Invalid job details (missing required fields)
 */
export const exampleInvalidJobDetails = {
  title: 'AB', // Too short (minimum 3 characters)
  description: null,
  priority: 'medium', // Invalid enum value (should be 'normal', not 'medium')
  priorityNumeric: 15, // Out of range (max is 10)
  location: {
    serviceAddress: null,
    useCustomerAddress: false, // Requires address when false
  },
  scheduling: {
    scheduledStartDate: '2025-04-20',
    scheduledEndDate: '2025-04-15', // End before start!
  },
  tags: [],
};

/**
 * Example: Validate invalid data and capture errors
 */
export const demonstrateValidationErrors = () => {
  const result = validateStepData<JobDetailsData>(2, exampleInvalidJobDetails);

  if (!result.success && result.errors) {
    console.log('❌ Validation failed with errors:');
    result.errors.errors.forEach((error) => {
      console.log(`  - ${error.path.join('.')}: ${error.message}`);
    });
    return result.errors;
  }

  return null;
};

// ============================================================================
// Example 12: Progressive Wizard State Updates
// ============================================================================

/**
 * Example: Simulating user progression through wizard
 */
export const simulateWizardProgression = () => {
  // Start with empty wizard
  let state = createNewWizardSession(
    '123e4567-e89b-12d3-a456-426614174002',
    '123e4567-e89b-12d3-a456-426614174001'
  );
  console.log('Step 1: Wizard initialized', state.currentStep);

  // Step 1: Select customer
  state = {
    ...state,
    currentStep: 1,
    customerData: exampleCustomerSelectionExisting,
  };
  console.log('Step 1: Customer selected', state.customerData?.selectedCustomer?.customer_name);

  // Move to Step 2: Job details
  state = {
    ...state,
    currentStep: 2,
    jobDetailsData: exampleJobDetails,
  };
  console.log('Step 2: Job details entered', state.jobDetailsData?.title);

  // Move to Step 3: Services
  state = {
    ...state,
    currentStep: 3,
    servicesData: exampleServicesData,
  };
  console.log('Step 3: Services configured', state.servicesData?.services.length, 'services');

  // Move to Step 4: Review
  state = {
    ...state,
    currentStep: 4,
    reviewData: exampleReviewData,
  };
  console.log('Step 4: Review complete, total:', state.reviewData?.pricingSummary.grandTotal);

  // Move to Step 5: Schedule
  state = {
    ...state,
    currentStep: 5,
    scheduleData: exampleScheduleData,
    isComplete: true,
  };
  console.log('Step 5: Scheduling complete,', state.scheduleData?.crewAssignments.length, 'assignments');

  return state;
};

// ============================================================================
// Export examples for testing
// ============================================================================

export const examples = {
  wizard: {
    createNew: createNewWizardSession,
    complete: exampleCompleteWizardState,
    simulate: simulateWizardProgression,
  },
  customer: {
    existing: exampleCustomerSelectionExisting,
    new: exampleCustomerSelectionNew,
    fromChat: exampleCustomerSelectionFromChat,
  },
  jobDetails: exampleJobDetails,
  services: {
    data: exampleServicesData,
    paverPatio: exampleServicePaverPatio,
    excavation: exampleServiceExcavation,
  },
  review: exampleReviewData,
  schedule: {
    withCrews: exampleScheduleData,
    skip: exampleScheduleDataSkip,
  },
  validation: {
    validateStep: validateStepData,
    demonstrateErrors: demonstrateValidationErrors,
    invalidJobDetails: exampleInvalidJobDetails,
  },
  conversion: {
    toJobInput: convertToJobInput,
  },
};
