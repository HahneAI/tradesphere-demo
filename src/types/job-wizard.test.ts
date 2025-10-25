/**
 * Job Wizard Type Verification Tests
 *
 * Type-level tests to ensure all wizard types compile correctly.
 * These tests use TypeScript's type system - they don't run at runtime.
 *
 * @module job-wizard-test
 */

import { describe, it, expect } from 'vitest';
import {
  JobWizardState,
  CustomerSelectionData,
  JobDetailsData,
  ServicesData,
  ReviewData,
  ScheduleData,
  ServiceLineItem,
  ValidationResult,
  WizardStep,
  generateTempId,
  calculateProgress,
  getStepCompletionStatus,
  canNavigateToStep,
  convertWizardStateToJobInput,
  isCustomerSelectionData,
  isJobDetailsData,
  isServicesData,
  isReviewData,
  isScheduleData,
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

import {
  examples,
  createNewWizardSession,
  exampleCustomerSelectionExisting,
  exampleJobDetails,
  exampleServicesData,
  exampleReviewData,
  exampleScheduleData,
  exampleCompleteWizardState,
} from './job-wizard.examples';

// ============================================================================
// Type Compilation Tests (compile-time only)
// ============================================================================

describe('Job Wizard Types - Compilation Tests', () => {
  it('should compile WizardStep type correctly', () => {
    const step1: WizardStep = 1;
    const step2: WizardStep = 2;
    const step3: WizardStep = 3;
    const step4: WizardStep = 4;
    const step5: WizardStep = 5;

    // @ts-expect-error - 0 is not a valid WizardStep
    const invalid1: WizardStep = 0;

    // @ts-expect-error - 6 is not a valid WizardStep
    const invalid2: WizardStep = 6;

    expect([step1, step2, step3, step4, step5]).toBeDefined();
  });

  it('should compile CustomerSelectionData discriminated union', () => {
    // Valid: existing customer mode
    const existing: CustomerSelectionData = {
      selectionMode: 'existing',
      selectedCustomer: exampleCustomerSelectionExisting.selectedCustomer!,
    };

    // Valid: create new customer mode
    const createNew: CustomerSelectionData = {
      selectionMode: 'create-new',
      newCustomerData: {
        company_id: 'test-company-id',
        customer_name: 'Test Customer',
        created_by_user_id: 'test-user-id',
      },
    };

    // Valid: from chat mode
    const fromChat: CustomerSelectionData = {
      selectionMode: 'from-chat',
      chatImportData: {
        sessionId: 'test-session',
        customerName: 'Chat Customer',
        extractionConfidence: 0.9,
        chatTimestamp: new Date().toISOString(),
      },
    };

    expect([existing, createNew, fromChat]).toBeDefined();
  });

  it('should compile ServiceLineItem with proper calculation data', () => {
    const service: ServiceLineItem = {
      tempId: generateTempId(),
      serviceConfigId: 'test-config-id',
      serviceName: 'Test Service',
      quantity: 1,
      unitPrice: 100,
      totalPrice: 100,
      source: 'manual',
      calculation: {
        calculationMethod: 'master-pricing-engine',
        calculationData: {
          tier1Results: {
            baseHours: 10,
            adjustedHours: 12,
            totalManHours: 12,
            totalDays: 1.5,
            breakdown: ['Test calculation'],
          },
          tier2Results: {
            laborCost: 300,
            materialCostBase: 200,
            materialWasteCost: 10,
            totalMaterialCost: 210,
            equipmentCost: 0,
            obstacleCost: 0,
            subtotal: 510,
            profit: 100,
            total: 610,
            pricePerSqft: 6.1,
          },
        },
        pricingVariables: {},
        confidence: 0.95,
        calculatedAt: new Date().toISOString(),
      },
      isOptional: false,
      displayOrder: 1,
    };

    expect(service).toBeDefined();
  });
});

// ============================================================================
// Runtime Validation Tests
// ============================================================================

describe('Job Wizard Schemas - Runtime Validation', () => {
  describe('Customer Selection Validation', () => {
    it('should validate existing customer selection', () => {
      const result = safeParse(
        customerSelectionDataSchema,
        exampleCustomerSelectionExisting
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.selectionMode).toBe('existing');
        expect(result.data.selectedCustomer).toBeDefined();
      }
    });

    it('should reject invalid customer selection mode', () => {
      const invalidData = {
        selectionMode: 'invalid-mode',
        selectedCustomer: null,
      };

      const result = safeParse(customerSelectionDataSchema, invalidData);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should validate create-new mode with required fields', () => {
      const data: CustomerSelectionData = {
        selectionMode: 'create-new',
        newCustomerData: {
          company_id: 'test-company-id',
          customer_name: 'Test Customer',
          customer_email: 'test@example.com',
          created_by_user_id: 'test-user-id',
        },
      };

      const result = safeParse(customerSelectionDataSchema, data);

      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const data = {
        selectionMode: 'create-new',
        newCustomerData: {
          company_id: 'test-company-id',
          customer_name: 'Test Customer',
          customer_email: 'invalid-email', // Invalid format
          created_by_user_id: 'test-user-id',
        },
      };

      const result = safeParse(customerSelectionDataSchema, data);

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.message.includes('email'))).toBe(true);
    });
  });

  describe('Job Details Validation', () => {
    it('should validate complete job details', () => {
      const result = validateStepData<JobDetailsData>(2, exampleJobDetails);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.title).toBe(exampleJobDetails.title);
        expect(result.data?.priority).toBe(exampleJobDetails.priority);
      }
    });

    it('should reject job title that is too short', () => {
      const invalidData = {
        ...exampleJobDetails,
        title: 'AB', // Too short (min 3 chars)
      };

      const result = validateStepData<JobDetailsData>(2, invalidData);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject invalid priority value', () => {
      const invalidData = {
        ...exampleJobDetails,
        priority: 'invalid-priority',
      };

      const result = safeParse(jobDetailsDataSchema, invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject end date before start date', () => {
      const invalidData = {
        ...exampleJobDetails,
        scheduling: {
          scheduledStartDate: '2025-04-20',
          scheduledEndDate: '2025-04-15', // Before start!
        },
      };

      const result = safeParse(jobDetailsDataSchema, invalidData);

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.field.includes('scheduledEndDate'))).toBe(true);
    });
  });

  describe('Services Validation', () => {
    it('should validate services data with multiple line items', () => {
      const result = validateStepData<ServicesData>(3, exampleServicesData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.services.length).toBeGreaterThan(0);
        expect(result.data?.totalEstimated).toBeGreaterThan(0);
      }
    });

    it('should reject services data with no services', () => {
      const invalidData = {
        ...exampleServicesData,
        services: [], // Empty array!
      };

      const result = validateStepData<ServicesData>(3, invalidData);

      expect(result.success).toBe(false);
      expect(result.errors?.errors.some(e => e.message.includes('at least one'))).toBe(true);
    });

    it('should reject mismatched total price', () => {
      const invalidData = {
        ...exampleServicesData,
        totalEstimated: 99999, // Doesn't match sum of services
      };

      const result = safeParse(servicesDataSchema, invalidData);

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.message.includes('sum'))).toBe(true);
    });

    it('should validate service calculation data structure', () => {
      const service = exampleServicesData.services[0];

      expect(service.calculation.calculationData).toBeDefined();
      expect(service.calculation.pricingVariables).toBeDefined();
      expect(service.calculation.confidence).toBeGreaterThanOrEqual(0);
      expect(service.calculation.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Review Validation', () => {
    it('should validate review data with all confirmations', () => {
      const result = validateStepData<ReviewData>(4, exampleReviewData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.confirmations.pricingConfirmed).toBe(true);
        expect(result.data?.confirmations.customerInfoConfirmed).toBe(true);
        expect(result.data?.confirmations.scopeConfirmed).toBe(true);
      }
    });

    it('should reject review without required confirmations', () => {
      const invalidData = {
        ...exampleReviewData,
        confirmations: {
          pricingConfirmed: false, // Must be true!
          customerInfoConfirmed: true,
          scopeConfirmed: true,
          sendQuoteToCustomer: false,
        },
      };

      const result = safeParse(reviewDataSchema, invalidData);

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.message.includes('pricing'))).toBe(true);
    });
  });

  describe('Schedule Validation', () => {
    it('should validate schedule with crew assignments', () => {
      const result = validateStepData<ScheduleData>(5, exampleScheduleData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.scheduleNow).toBe(true);
        expect(result.data?.crewAssignments.length).toBeGreaterThan(0);
      }
    });

    it('should reject scheduleNow=true with no crew assignments', () => {
      const invalidData = {
        scheduleNow: true,
        crewAssignments: [], // Empty when scheduleNow is true!
      };

      const result = safeParse(scheduleDataSchema, invalidData);

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.message.includes('crew'))).toBe(true);
    });

    it('should allow scheduleNow=false with no crew assignments', () => {
      const validData = {
        scheduleNow: false,
        crewAssignments: [],
        schedulingNotes: 'Will schedule later',
      };

      const result = safeParse(scheduleDataSchema, validData);

      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('Job Wizard Helper Functions', () => {
  describe('generateTempId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateTempId();
      const id2 = generateTempId();
      const id3 = generateTempId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1.startsWith('temp_')).toBe(true);
    });
  });

  describe('calculateProgress', () => {
    it('should calculate 0% for empty wizard', () => {
      const state = createNewWizardSession('user-id', 'company-id');
      const progress = calculateProgress(state);

      expect(progress).toBe(0);
    });

    it('should calculate 20% for step 1 complete', () => {
      const state: JobWizardState = {
        ...createNewWizardSession('user-id', 'company-id'),
        customerData: exampleCustomerSelectionExisting,
      };
      const progress = calculateProgress(state);

      expect(progress).toBe(20);
    });

    it('should calculate 100% for all steps complete', () => {
      const progress = calculateProgress(exampleCompleteWizardState);

      expect(progress).toBe(100);
    });
  });

  describe('getStepCompletionStatus', () => {
    it('should return correct completion status', () => {
      const state: JobWizardState = {
        ...createNewWizardSession('user-id', 'company-id'),
        customerData: exampleCustomerSelectionExisting,
        jobDetailsData: exampleJobDetails,
        servicesData: null,
        reviewData: null,
        scheduleData: null,
      };

      const status = getStepCompletionStatus(state);

      expect(status.step1Complete).toBe(true);
      expect(status.step2Complete).toBe(true);
      expect(status.step3Complete).toBe(false);
      expect(status.step4Complete).toBe(false);
      expect(status.step5Complete).toBe(false);
      expect(status.overallComplete).toBe(false);
    });
  });

  describe('canNavigateToStep', () => {
    it('should allow navigation to step 1 from any state', () => {
      const state = createNewWizardSession('user-id', 'company-id');

      expect(canNavigateToStep(1, state)).toBe(true);
    });

    it('should not allow skipping steps', () => {
      const state = createNewWizardSession('user-id', 'company-id');

      expect(canNavigateToStep(3, state)).toBe(false);
    });

    it('should allow navigation when previous steps complete', () => {
      const state: JobWizardState = {
        ...createNewWizardSession('user-id', 'company-id'),
        customerData: exampleCustomerSelectionExisting,
        jobDetailsData: exampleJobDetails,
      };

      expect(canNavigateToStep(3, state)).toBe(true);
      expect(canNavigateToStep(4, state)).toBe(false); // Step 3 not complete
    });
  });

  describe('convertWizardStateToJobInput', () => {
    it('should convert complete wizard state to job input', () => {
      const customerId = 'test-customer-id';
      const companyId = 'test-company-id';
      const userId = 'test-user-id';

      const jobInput = convertWizardStateToJobInput(
        exampleCompleteWizardState,
        customerId,
        companyId,
        userId
      );

      expect(jobInput.company_id).toBe(companyId);
      expect(jobInput.customer_id).toBe(customerId);
      expect(jobInput.created_by_user_id).toBe(userId);
      expect(jobInput.title).toBe(exampleJobDetails.title);
      expect(jobInput.services).toBeDefined();
      expect(jobInput.services?.length).toBeGreaterThan(0);
    });

    it('should throw error for incomplete wizard state', () => {
      const state = createNewWizardSession('user-id', 'company-id');

      expect(() => {
        convertWizardStateToJobInput(state, 'customer-id', 'company-id', 'user-id');
      }).toThrow();
    });
  });
});

// ============================================================================
// Type Guard Tests
// ============================================================================

describe('Job Wizard Type Guards', () => {
  it('should identify CustomerSelectionData', () => {
    expect(isCustomerSelectionData(exampleCustomerSelectionExisting)).toBe(true);
    expect(isCustomerSelectionData(null)).toBe(false);
    expect(isCustomerSelectionData({})).toBe(false);
    expect(isCustomerSelectionData({ selectionMode: 'existing' })).toBe(true);
  });

  it('should identify JobDetailsData', () => {
    expect(isJobDetailsData(exampleJobDetails)).toBe(true);
    expect(isJobDetailsData(null)).toBe(false);
    expect(isJobDetailsData({})).toBe(false);
  });

  it('should identify ServicesData', () => {
    expect(isServicesData(exampleServicesData)).toBe(true);
    expect(isServicesData(null)).toBe(false);
    expect(isServicesData({ services: [] })).toBe(true); // Has services array
  });

  it('should identify ReviewData', () => {
    expect(isReviewData(exampleReviewData)).toBe(true);
    expect(isReviewData(null)).toBe(false);
    expect(isReviewData({})).toBe(false);
  });

  it('should identify ScheduleData', () => {
    expect(isScheduleData(exampleScheduleData)).toBe(true);
    expect(isScheduleData(null)).toBe(false);
    expect(isScheduleData({ scheduleNow: true })).toBe(true);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Job Wizard Integration', () => {
  it('should handle complete wizard flow', () => {
    // Initialize
    let state = createNewWizardSession('user-id', 'company-id');
    expect(state.currentStep).toBe(1);

    // Step 1: Customer
    state = {
      ...state,
      customerData: exampleCustomerSelectionExisting,
      currentStep: 2,
    };
    expect(getStepCompletionStatus(state).step1Complete).toBe(true);

    // Step 2: Job Details
    state = {
      ...state,
      jobDetailsData: exampleJobDetails,
      currentStep: 3,
    };
    expect(getStepCompletionStatus(state).step2Complete).toBe(true);

    // Step 3: Services
    state = {
      ...state,
      servicesData: exampleServicesData,
      currentStep: 4,
    };
    expect(getStepCompletionStatus(state).step3Complete).toBe(true);

    // Step 4: Review
    state = {
      ...state,
      reviewData: exampleReviewData,
      currentStep: 5,
    };
    expect(getStepCompletionStatus(state).step4Complete).toBe(true);

    // Step 5: Schedule
    state = {
      ...state,
      scheduleData: exampleScheduleData,
      isComplete: true,
    };

    expect(getStepCompletionStatus(state).overallComplete).toBe(true);
    expect(calculateProgress(state)).toBe(100);
    expect(canNavigateToStep(5, state)).toBe(true);
  });

  it('should validate each step during wizard flow', () => {
    // Step 1
    const step1Result = validateStepData<CustomerSelectionData>(
      1,
      exampleCustomerSelectionExisting
    );
    expect(step1Result.success).toBe(true);

    // Step 2
    const step2Result = validateStepData<JobDetailsData>(2, exampleJobDetails);
    expect(step2Result.success).toBe(true);

    // Step 3
    const step3Result = validateStepData<ServicesData>(3, exampleServicesData);
    expect(step3Result.success).toBe(true);

    // Step 4
    const step4Result = validateStepData<ReviewData>(4, exampleReviewData);
    expect(step4Result.success).toBe(true);

    // Step 5
    const step5Result = validateStepData<ScheduleData>(5, exampleScheduleData);
    expect(step5Result.success).toBe(true);
  });
});
