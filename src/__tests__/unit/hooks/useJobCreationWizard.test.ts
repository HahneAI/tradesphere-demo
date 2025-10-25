/**
 * Unit Tests: useJobCreationWizard Hook
 *
 * Comprehensive test suite for the Job Creation Wizard state management hook
 * Tests all state transitions, validations, and edge cases
 *
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useJobCreationWizard, WizardConfig } from '../../../hooks/useJobCreationWizard';
import {
  createMockCustomer,
  createMockServiceLineItem,
  createMockJobDetails,
  createMockScheduleData
} from '../../__mocks__/mockData';

describe('useJobCreationWizard', () => {
  const defaultConfig: WizardConfig = {
    companyId: 'company-1',
    userId: 'user-1',
    enableLocalStorage: false,
    validateOnStepChange: true
  };

  beforeEach(() => {
    localStorage.clear();
  });

  // ===== INITIALIZATION TESTS =====

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      expect(result.current.currentStep).toBe(1);
      expect(result.current.customer).toBeNull();
      expect(result.current.jobDetails.title).toBe('');
      expect(result.current.jobDetails.priority).toBe(5);
      expect(result.current.services).toEqual([]);
      expect(result.current.schedule).toBeNull();
      expect(result.current.estimatedTotal).toBe(0);
      expect(result.current.serviceCount).toBe(0);
      expect(result.current.isFirstStep).toBe(true);
      expect(result.current.isLastStep).toBe(false);
      expect(result.current.canGoBack).toBe(false);
    });

    it('should set correct company and user IDs from config', () => {
      const config: WizardConfig = {
        companyId: 'test-company',
        userId: 'test-user',
        enableLocalStorage: false
      };

      const { result } = renderHook(() => useJobCreationWizard(config));

      expect(result.current.state.jobDetails.tags).toEqual([]);
      expect(result.current.state.customer).toBeNull();
    });

    it('should initialize with saveAsQuote set to true by default', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      expect(result.current.state.saveAsQuote).toBe(true);
    });
  });

  // ===== STEP NAVIGATION TESTS =====

  describe('Step Navigation', () => {
    it('should advance to next step when validation passes', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      // Add customer to pass Step 1 validation
      act(() => {
        result.current.setCustomer(createMockCustomer());
      });

      // Advance to Step 2
      act(() => {
        result.current.nextStep();
      });

      expect(result.current.currentStep).toBe(2);
    });

    it('should not advance to next step when validation fails', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      // Try to advance without customer
      act(() => {
        result.current.nextStep();
      });

      // Should remain at Step 1
      expect(result.current.currentStep).toBe(1);
      expect(result.current.errors).toHaveProperty('customer');
    });

    it('should go back to previous step', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      // Setup and advance to Step 2
      act(() => {
        result.current.setCustomer(createMockCustomer());
        result.current.nextStep();
      });

      expect(result.current.currentStep).toBe(2);

      // Go back to Step 1
      act(() => {
        result.current.prevStep();
      });

      expect(result.current.currentStep).toBe(1);
    });

    it('should not go back from Step 1', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      act(() => {
        result.current.prevStep();
      });

      expect(result.current.currentStep).toBe(1);
    });

    it('should jump to specific step', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      // Setup customer and job details
      act(() => {
        result.current.setCustomer(createMockCustomer());
        result.current.nextStep();
        result.current.updateJobDetails({
          title: 'Test Job',
          service_address: '123 Test St'
        });
      });

      // Jump to Step 3
      act(() => {
        result.current.goToStep(3);
      });

      expect(result.current.currentStep).toBe(3);
    });

    it('should clear errors when changing steps', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      // Try to advance (will fail validation)
      act(() => {
        result.current.nextStep();
      });

      expect(result.current.errors).not.toEqual({});

      // Add customer and advance
      act(() => {
        result.current.setCustomer(createMockCustomer());
        result.current.nextStep();
      });

      expect(result.current.errors).toEqual({});
    });

    it('should correctly identify first and last steps', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      // Step 1 is first
      expect(result.current.isFirstStep).toBe(true);
      expect(result.current.isLastStep).toBe(false);

      // Navigate to Step 5
      act(() => {
        result.current.goToStep(5);
      });

      // Step 5 is last
      expect(result.current.isFirstStep).toBe(false);
      expect(result.current.isLastStep).toBe(true);
    });

    it('should update canGoNext based on validation', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      // Initially cannot go next (no customer)
      expect(result.current.canGoNext).toBe(false);

      // Add customer
      act(() => {
        result.current.setCustomer(createMockCustomer());
      });

      // Now can go next
      expect(result.current.canGoNext).toBe(true);
    });
  });

  // ===== CUSTOMER SELECTION TESTS =====

  describe('Customer Selection (Step 1)', () => {
    it('should set customer', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));
      const mockCustomer = createMockCustomer();

      act(() => {
        result.current.setCustomer(mockCustomer);
      });

      expect(result.current.customer).toEqual(mockCustomer);
    });

    it('should auto-populate service address from customer', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));
      const mockCustomer = createMockCustomer({
        customer_address: '456 Oak Ave, Springfield, IL 62702'
      });

      act(() => {
        result.current.setCustomer(mockCustomer);
      });

      expect(result.current.jobDetails.service_address).toBe(mockCustomer.customer_address);
    });

    it('should not overwrite existing service address', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));
      const mockCustomer = createMockCustomer({
        customer_address: '456 Oak Ave'
      });

      // Set service address first
      act(() => {
        result.current.updateJobDetails({ service_address: '789 Elm St' });
      });

      // Then set customer
      act(() => {
        result.current.setCustomer(mockCustomer);
      });

      // Should keep existing address
      expect(result.current.jobDetails.service_address).toBe('789 Elm St');
    });

    it('should clear customer', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      act(() => {
        result.current.setCustomer(createMockCustomer());
        result.current.setCustomer(null);
      });

      expect(result.current.customer).toBeNull();
    });
  });

  // ===== JOB DETAILS TESTS =====

  describe('Job Details (Step 2)', () => {
    it('should update job details', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      act(() => {
        result.current.updateJobDetails({
          title: 'Backyard Patio',
          description: 'Install 360 sqft paver patio',
          priority: 7
        });
      });

      expect(result.current.jobDetails.title).toBe('Backyard Patio');
      expect(result.current.jobDetails.description).toBe('Install 360 sqft paver patio');
      expect(result.current.jobDetails.priority).toBe(7);
    });

    it('should set complete job details object', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));
      const mockDetails = createMockJobDetails({
        title: 'Complete Job',
        service_address: '123 Main St'
      });

      act(() => {
        result.current.setJobDetails(mockDetails);
      });

      expect(result.current.jobDetails).toEqual(mockDetails);
    });

    it('should preserve other fields when updating partial details', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      act(() => {
        result.current.updateJobDetails({ title: 'Original Title' });
        result.current.updateJobDetails({ description: 'New Description' });
      });

      expect(result.current.jobDetails.title).toBe('Original Title');
      expect(result.current.jobDetails.description).toBe('New Description');
    });

    it('should validate required fields', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      // Setup Step 1
      act(() => {
        result.current.setCustomer(createMockCustomer());
        result.current.nextStep();
      });

      // Try to advance without title
      act(() => {
        result.current.nextStep();
      });

      expect(result.current.currentStep).toBe(2);
      expect(result.current.errors).toHaveProperty('title');
    });
  });

  // ===== SERVICES TESTS =====

  describe('Services (Step 3)', () => {
    it('should add service', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));
      const mockService = createMockServiceLineItem();

      act(() => {
        result.current.addService(mockService);
      });

      expect(result.current.services).toHaveLength(1);
      expect(result.current.services[0]).toMatchObject(mockService);
      expect(result.current.services[0].tempId).toBeDefined();
    });

    it('should add multiple services', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      act(() => {
        result.current.addService(createMockServiceLineItem({ serviceName: 'Service 1' }));
        result.current.addService(createMockServiceLineItem({ serviceName: 'Service 2' }));
        result.current.addService(createMockServiceLineItem({ serviceName: 'Service 3' }));
      });

      expect(result.current.services).toHaveLength(3);
      expect(result.current.serviceCount).toBe(3);
    });

    it('should update service by index', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      act(() => {
        result.current.addService(createMockServiceLineItem());
      });

      act(() => {
        result.current.updateService(0, {
          serviceName: 'Updated Service',
          unitPrice: 200.00,
          totalPrice: 200.00
        });
      });

      expect(result.current.services[0].serviceName).toBe('Updated Service');
      expect(result.current.services[0].unitPrice).toBe(200.00);
    });

    it('should remove service by index', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      act(() => {
        result.current.addService(createMockServiceLineItem({ serviceName: 'Service 1' }));
        result.current.addService(createMockServiceLineItem({ serviceName: 'Service 2' }));
        result.current.addService(createMockServiceLineItem({ serviceName: 'Service 3' }));
      });

      act(() => {
        result.current.removeService(1); // Remove middle service
      });

      expect(result.current.services).toHaveLength(2);
      expect(result.current.services[0].serviceName).toBe('Service 1');
      expect(result.current.services[1].serviceName).toBe('Service 3');
    });

    it('should set complete services array', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));
      const services = [
        createMockServiceLineItem({ serviceName: 'Service 1' }),
        createMockServiceLineItem({ serviceName: 'Service 2' })
      ];

      act(() => {
        result.current.setServices(services);
      });

      expect(result.current.services).toEqual(services);
    });

    it('should clear all services', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      act(() => {
        result.current.addService(createMockServiceLineItem());
        result.current.addService(createMockServiceLineItem());
        result.current.clearServices();
      });

      expect(result.current.services).toEqual([]);
      expect(result.current.serviceCount).toBe(0);
    });

    it('should calculate estimated total from services', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      act(() => {
        result.current.addService(createMockServiceLineItem({ totalPrice: 1000 }));
        result.current.addService(createMockServiceLineItem({ totalPrice: 2000 }));
        result.current.addService(createMockServiceLineItem({ totalPrice: 500 }));
      });

      expect(result.current.estimatedTotal).toBe(3500);
    });

    it('should recalculate total when service is updated', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      act(() => {
        result.current.addService(createMockServiceLineItem({ totalPrice: 1000 }));
      });

      expect(result.current.estimatedTotal).toBe(1000);

      act(() => {
        result.current.updateService(0, { totalPrice: 1500 });
      });

      expect(result.current.estimatedTotal).toBe(1500);
    });

    it('should recalculate total when service is removed', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      act(() => {
        result.current.addService(createMockServiceLineItem({ totalPrice: 1000 }));
        result.current.addService(createMockServiceLineItem({ totalPrice: 2000 }));
      });

      expect(result.current.estimatedTotal).toBe(3000);

      act(() => {
        result.current.removeService(0);
      });

      expect(result.current.estimatedTotal).toBe(2000);
    });
  });

  // ===== REVIEW STEP TESTS =====

  describe('Review (Step 4)', () => {
    it('should set saveAsQuote flag', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      act(() => {
        result.current.setSaveAsQuote(false);
      });

      expect(result.current.state.saveAsQuote).toBe(false);

      act(() => {
        result.current.setSaveAsQuote(true);
      });

      expect(result.current.state.saveAsQuote).toBe(true);
    });
  });

  // ===== SCHEDULE STEP TESTS =====

  describe('Schedule (Step 5)', () => {
    it('should set schedule data', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));
      const mockSchedule = createMockScheduleData({
        crew_id: 'crew-1',
        scheduled_start: '2025-02-01T08:00:00Z',
        scheduled_end: '2025-02-05T17:00:00Z'
      });

      act(() => {
        result.current.setSchedule(mockSchedule);
      });

      expect(result.current.schedule).toEqual(mockSchedule);
    });

    it('should update schedule data partially', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));
      const mockSchedule = createMockScheduleData({
        crew_id: 'crew-1',
        scheduled_start: '2025-02-01T08:00:00Z',
        scheduled_end: '2025-02-05T17:00:00Z'
      });

      act(() => {
        result.current.setSchedule(mockSchedule);
        result.current.updateSchedule({
          assignment_notes: 'Updated notes'
        });
      });

      expect(result.current.schedule?.assignment_notes).toBe('Updated notes');
      expect(result.current.schedule?.crew_id).toBe('crew-1');
    });

    it('should clear schedule data', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      act(() => {
        result.current.setSchedule(createMockScheduleData({ crew_id: 'crew-1' }));
        result.current.setSchedule(null);
      });

      expect(result.current.schedule).toBeNull();
    });
  });

  // ===== VALIDATION TESTS =====

  describe('Validation', () => {
    it('should validate Step 1 requires customer', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      const validation = result.current.validateCurrentStep();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveProperty('customer');
    });

    it('should validate Step 2 requires title and address', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      act(() => {
        result.current.setCustomer(createMockCustomer());
        result.current.nextStep();
      });

      const validation = result.current.validateCurrentStep();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveProperty('title');
      expect(validation.errors).toHaveProperty('service_address');
    });

    it('should validate Step 3 requires at least one service', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      act(() => {
        result.current.goToStep(3);
      });

      const validation = result.current.validateCurrentStep();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveProperty('services');
    });

    it('should pass validation when all fields are filled', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      act(() => {
        result.current.setCustomer(createMockCustomer());
      });

      const validation = result.current.validateCurrentStep();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual({});
    });
  });

  // ===== LOCAL STORAGE PERSISTENCE TESTS =====

  describe('LocalStorage Persistence', () => {
    it('should save state to localStorage when enabled', () => {
      const config: WizardConfig = {
        ...defaultConfig,
        enableLocalStorage: true,
        storageKey: 'test-wizard-state'
      };

      const { result } = renderHook(() => useJobCreationWizard(config));

      act(() => {
        result.current.setCustomer(createMockCustomer());
      });

      const stored = localStorage.getItem('test-wizard-state');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.customer).toBeTruthy();
    });

    it('should restore state from localStorage on mount', () => {
      const config: WizardConfig = {
        ...defaultConfig,
        enableLocalStorage: true,
        storageKey: 'test-wizard-restore'
      };

      // First render - save state
      const { unmount } = renderHook(() => useJobCreationWizard(config));

      act(() => {
        const { result } = renderHook(() => useJobCreationWizard(config));
        result.current.setCustomer(createMockCustomer({ customer_name: 'Restored Customer' }));
      });

      unmount();

      // Second render - restore state
      const { result: result2 } = renderHook(() => useJobCreationWizard(config));

      expect(result2.current.customer?.customer_name).toBe('Restored Customer');
    });

    it('should clear localStorage on reset', () => {
      const config: WizardConfig = {
        ...defaultConfig,
        enableLocalStorage: true,
        storageKey: 'test-wizard-clear'
      };

      const { result } = renderHook(() => useJobCreationWizard(config));

      act(() => {
        result.current.setCustomer(createMockCustomer());
        result.current.reset();
      });

      const stored = localStorage.getItem('test-wizard-clear');
      expect(stored).toBeNull();
    });

    it('should clear localStorage on completion', () => {
      const config: WizardConfig = {
        ...defaultConfig,
        enableLocalStorage: true,
        storageKey: 'test-wizard-complete'
      };

      const { result } = renderHook(() => useJobCreationWizard(config));

      act(() => {
        result.current.setCustomer(createMockCustomer());
        result.current.markCompleted('job-123');
      });

      const stored = localStorage.getItem('test-wizard-complete');
      expect(stored).toBeNull();
    });

    it('should not save to localStorage when disabled', () => {
      const config: WizardConfig = {
        ...defaultConfig,
        enableLocalStorage: false
      };

      const { result } = renderHook(() => useJobCreationWizard(config));

      act(() => {
        result.current.setCustomer(createMockCustomer());
      });

      const stored = localStorage.getItem(`job-wizard-state-${config.companyId}`);
      expect(stored).toBeNull();
    });
  });

  // ===== COMPLETION AND RESET TESTS =====

  describe('Completion and Reset', () => {
    it('should mark wizard as completed', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      act(() => {
        result.current.markCompleted('job-123');
      });

      expect(result.current.state.isCompleted).toBe(true);
      expect(result.current.state.createdJobId).toBe('job-123');
    });

    it('should reset wizard to initial state', () => {
      const { result } = renderHook(() => useJobCreationWizard(defaultConfig));

      // Set up complete wizard state
      act(() => {
        result.current.setCustomer(createMockCustomer());
        result.current.nextStep();
        result.current.updateJobDetails({ title: 'Test Job' });
        result.current.addService(createMockServiceLineItem());
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      // Verify reset to initial state
      expect(result.current.currentStep).toBe(1);
      expect(result.current.customer).toBeNull();
      expect(result.current.jobDetails.title).toBe('');
      expect(result.current.services).toEqual([]);
      expect(result.current.estimatedTotal).toBe(0);
    });
  });
});
