/**
 * Job Creation Wizard State Management Hook
 *
 * Manages multi-step wizard state with validation, persistence, and rollback.
 * Supports forward/backward navigation with step-level validation.
 * Integrates with existing services: JobService, CustomerManagement, ChatInterface, MasterPricingEngine.
 *
 * @module useJobCreationWizard
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { CustomerProfile } from '../types/customer';
import {
  CreateJobInput,
  CreateJobServiceInput,
  CreateJobAssignmentInput,
  Job
} from '../types/crm';
import { parseAddress } from '../utils/addressParser';
import { Adjustment } from '../components/jobs/wizard/adjustments';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Wizard step enumeration
 */
export type WizardStep = 1 | 2 | 3 | 4 | 5;

/**
 * Step validation result
 */
export interface StepValidation {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Job details for Step 2
 */
export interface JobDetailsData {
  title: string;
  description?: string;
  service_address?: string;
  service_city?: string;
  service_state?: string;
  service_zip?: string;
  service_location_notes?: string;
  priority: number;
  requested_start_date?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Service line item (Step 3)
 */
export interface ServiceLineItem extends Omit<CreateJobServiceInput, 'added_by_user_id'> {
  tempId?: string; // Temporary ID for tracking before DB insert
  adjustments?: Adjustment[]; // Optional financial adjustments
}

/**
 * Schedule data (Step 5 - optional)
 */
export interface ScheduleData {
  crew_id: string;
  scheduled_start: string;
  scheduled_end: string;
  estimated_hours?: number;
  assignment_notes?: string;
  work_description?: string;
}

/**
 * Complete wizard state
 */
export interface JobWizardState {
  // Current step (1-5)
  currentStep: WizardStep;

  // Step 1: Customer
  customer: CustomerProfile | null;

  // Step 2: Job Details
  jobDetails: JobDetailsData;

  // Step 3: Services & Pricing
  services: ServiceLineItem[];

  // Step 4: Review status
  saveAsQuote: boolean; // true = save as quote, false = create as approved

  // Step 5: Schedule (optional)
  schedule: ScheduleData | null;

  // Metadata
  isCompleted: boolean;
  createdJobId?: string;
  errors: Record<string, string>;
}

/**
 * Wizard configuration options
 */
export interface WizardConfig {
  companyId: string;
  userId: string;

  // Persistence options
  enableLocalStorage?: boolean;
  storageKey?: string;

  // Validation options
  validateOnStepChange?: boolean;

  // Step 5 behavior
  requireScheduling?: boolean; // If true, Step 5 is mandatory
}

/**
 * Service input method tracking (for Step 3)
 */
export type ServiceInputMethod = 'none' | 'ai-chat' | 'quick-calculator' | 'manual';

// ============================================================================
// Initial State Factory
// ============================================================================

const createInitialState = (): JobWizardState => ({
  currentStep: 1,
  customer: null,
  jobDetails: {
    title: '',
    description: '',
    priority: 5, // Default to "Normal"
    tags: [],
    metadata: {}
  },
  services: [],
  saveAsQuote: true, // Default to quote
  schedule: null,
  isCompleted: false,
  errors: {}
});

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate Step 1: Customer Selection
 */
const validateStep1 = (state: JobWizardState): StepValidation => {
  const errors: Record<string, string> = {};

  if (!state.customer) {
    errors.customer = 'Customer selection is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate Step 2: Job Details
 */
const validateStep2 = (state: JobWizardState): StepValidation => {
  const errors: Record<string, string> = {};
  const { jobDetails } = state;

  if (!jobDetails.title?.trim()) {
    errors.title = 'Job title is required';
  }

  if (!jobDetails.service_address?.trim()) {
    errors.service_address = 'Service address is required';
  }

  if (jobDetails.priority === undefined || jobDetails.priority < 0 || jobDetails.priority > 10) {
    errors.priority = 'Priority must be between 0 and 10';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate Step 3: Services & Pricing
 */
const validateStep3 = (state: JobWizardState): StepValidation => {
  const errors: Record<string, string> = {};

  if (state.services.length === 0) {
    errors.services = 'At least one service is required';
  }

  // Validate each service
  state.services.forEach((service, index) => {
    if (!service.service_name?.trim()) {
      errors[`service_${index}_name`] = 'Service name is required';
    }
    if (!service.unit_price || service.unit_price <= 0) {
      errors[`service_${index}_price`] = 'Valid unit price is required';
    }
    if (!service.total_price || service.total_price <= 0) {
      errors[`service_${index}_total`] = 'Valid total price is required';
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate Step 4: Review (always valid - informational only)
 */
const validateStep4 = (state: JobWizardState): StepValidation => {
  return { isValid: true, errors: {} };
};

/**
 * Validate Step 5: Schedule & Assign (optional)
 */
const validateStep5 = (state: JobWizardState, requireScheduling: boolean): StepValidation => {
  const errors: Record<string, string> = {};

  // If scheduling is not required and no schedule data, it's valid (skip step)
  if (!requireScheduling && !state.schedule) {
    return { isValid: true, errors: {} };
  }

  // If schedule data exists or is required, validate it
  if (state.schedule || requireScheduling) {
    if (!state.schedule?.crew_id) {
      errors.crew_id = 'Crew selection is required';
    }

    if (!state.schedule?.scheduled_start) {
      errors.scheduled_start = 'Start date is required';
    }

    if (!state.schedule?.scheduled_end) {
      errors.scheduled_end = 'End date is required';
    }

    // Validate date logic
    if (state.schedule?.scheduled_start && state.schedule?.scheduled_end) {
      const start = new Date(state.schedule.scheduled_start);
      const end = new Date(state.schedule.scheduled_end);

      if (end <= start) {
        errors.scheduled_end = 'End date must be after start date';
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Master validation dispatcher
 */
const validateStep = (
  step: WizardStep,
  state: JobWizardState,
  config: WizardConfig
): StepValidation => {
  switch (step) {
    case 1: return validateStep1(state);
    case 2: return validateStep2(state);
    case 3: return validateStep3(state);
    case 4: return validateStep4(state);
    case 5: return validateStep5(state, config.requireScheduling || false);
    default: return { isValid: false, errors: { general: 'Invalid step' } };
  }
};

// ============================================================================
// Local Storage Persistence
// ============================================================================

const STORAGE_KEY_PREFIX = 'job-wizard-state';

/**
 * Save wizard state to localStorage
 */
const saveToStorage = (key: string, state: JobWizardState): void => {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.warn('[Wizard] Failed to save state to localStorage:', error);
  }
};

/**
 * Load wizard state from localStorage
 */
const loadFromStorage = (key: string): JobWizardState | null => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as JobWizardState;
    }
  } catch (error) {
    console.warn('[Wizard] Failed to load state from localStorage:', error);
  }
  return null;
};

/**
 * Clear wizard state from localStorage
 */
const clearStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('[Wizard] Failed to clear localStorage:', error);
  }
};

// ============================================================================
// Main Hook
// ============================================================================

export interface UseJobCreationWizardReturn {
  // State
  state: JobWizardState;
  currentStep: WizardStep;
  isFirstStep: boolean;
  isLastStep: boolean;
  canGoNext: boolean;
  canGoBack: boolean;

  // Step-specific data
  customer: CustomerProfile | null;
  jobDetails: JobDetailsData;
  services: ServiceLineItem[];
  schedule: ScheduleData | null;

  // Computed values
  estimatedTotal: number;
  serviceCount: number;

  // Navigation
  goToStep: (step: WizardStep, skipValidation?: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Step 1: Customer
  setCustomer: (customer: CustomerProfile | null) => void;

  // Step 2: Job Details
  updateJobDetails: (updates: Partial<JobDetailsData>) => void;
  setJobDetails: (details: JobDetailsData) => void;

  // Step 3: Services
  addService: (service: ServiceLineItem) => void;
  updateService: (index: number, updates: Partial<ServiceLineItem>) => void;
  removeService: (index: number) => void;
  setServices: (services: ServiceLineItem[]) => void;
  clearServices: () => void;

  // Step 4: Review
  setSaveAsQuote: (asQuote: boolean) => void;

  // Step 5: Schedule
  setSchedule: (schedule: ScheduleData | null) => void;
  updateSchedule: (updates: Partial<ScheduleData>) => void;

  // Validation
  validateCurrentStep: () => StepValidation;
  errors: Record<string, string>;

  // Completion
  markCompleted: (jobId: string) => void;
  reset: () => void;

  // Persistence
  saveProgress: () => void;
  loadProgress: () => boolean;
  clearSavedProgress: () => void;
}

/**
 * Job Creation Wizard Hook
 *
 * @param config - Wizard configuration
 * @returns Wizard state and control functions
 */
export const useJobCreationWizard = (config: WizardConfig): UseJobCreationWizardReturn => {
  const storageKey = config.storageKey || `${STORAGE_KEY_PREFIX}-${config.companyId}`;

  // Initialize state (with optional localStorage restore)
  const [state, setState] = useState<JobWizardState>(() => {
    if (config.enableLocalStorage) {
      const stored = loadFromStorage(storageKey);
      if (stored && !stored.isCompleted) {
        console.log('[Wizard] Restored state from localStorage');
        return stored;
      }
    }
    return createInitialState();
  });

  // Auto-save to localStorage on state changes
  useEffect(() => {
    if (config.enableLocalStorage && !state.isCompleted) {
      saveToStorage(storageKey, state);
    }
  }, [state, config.enableLocalStorage, storageKey]);

  // ========== Computed Values ==========

  const estimatedTotal = useMemo(() => {
    return state.services.reduce((sum, service) => sum + (service.total_price || 0), 0);
  }, [state.services]);

  const serviceCount = state.services.length;

  const isFirstStep = state.currentStep === 1;
  const isLastStep = state.currentStep === 5;

  const canGoBack = state.currentStep > 1;

  const canGoNext = useMemo(() => {
    const validation = validateStep(state.currentStep, state, config);
    return validation.isValid;
  }, [state, config]);

  // ========== Navigation ==========

  const goToStep = useCallback((step: WizardStep, skipValidation = false) => {
    if (step < 1 || step > 5) return;

    // Skip validation in two cases:
    // 1. Moving backward (step <= state.currentStep)
    // 2. Explicitly skipped (for jumping to completed steps)
    const shouldValidate =
      step > state.currentStep &&
      !skipValidation &&
      config.validateOnStepChange !== false;

    if (shouldValidate) {
      const validation = validateStep(state.currentStep, state, config);
      if (!validation.isValid) {
        setState(prev => ({ ...prev, errors: validation.errors }));
        return;
      }
    }

    setState(prev => ({
      ...prev,
      currentStep: step,
      errors: {} // Clear errors when changing steps
    }));
  }, [state, config]);

  const nextStep = useCallback(() => {
    if (!isLastStep) {
      goToStep((state.currentStep + 1) as WizardStep);
    }
  }, [state.currentStep, isLastStep, goToStep]);

  const prevStep = useCallback(() => {
    if (!isFirstStep) {
      goToStep((state.currentStep - 1) as WizardStep);
    }
  }, [state.currentStep, isFirstStep, goToStep]);

  // ========== Step 1: Customer ==========

  const setCustomer = useCallback((customer: CustomerProfile | null) => {
    setState(prev => {
      const updates: Partial<JobWizardState> = { customer };

      // Auto-populate service address from customer if not already set
      if (customer && !prev.jobDetails.service_address) {
        const parsed = parseAddress(customer.customer_address || '');
        updates.jobDetails = {
          ...prev.jobDetails,
          service_address: parsed.street,
          service_city: parsed.city,
          service_state: parsed.state,
          service_zip: parsed.zip,
        };
      }

      return { ...prev, ...updates };
    });
  }, []);

  // ========== Step 2: Job Details ==========

  const updateJobDetails = useCallback((updates: Partial<JobDetailsData>) => {
    setState(prev => ({
      ...prev,
      jobDetails: {
        ...prev.jobDetails,
        ...updates
      }
    }));
  }, []);

  const setJobDetails = useCallback((details: JobDetailsData) => {
    setState(prev => ({ ...prev, jobDetails: details }));
  }, []);

  // ========== Step 3: Services ==========

  const addService = useCallback((service: ServiceLineItem) => {
    setState(prev => ({
      ...prev,
      services: [
        ...prev.services,
        {
          ...service,
          tempId: `temp-${Date.now()}-${Math.random()}` // Temporary ID for tracking
        }
      ]
    }));
  }, []);

  const updateService = useCallback((index: number, updates: Partial<ServiceLineItem> | ServiceLineItem) => {
    setState(prev => {
      const updatedServices = [...prev.services];
      // If updates is a full ServiceLineItem (has service_config_id), replace entirely; otherwise merge
      const isFullReplacement = 'service_config_id' in updates && 'service_name' in updates && 'unit_price' in updates;
      updatedServices[index] = isFullReplacement
        ? (updates as ServiceLineItem)
        : {
            ...updatedServices[index],
            ...updates
          };
      return { ...prev, services: updatedServices };
    });
  }, []);

  const removeService = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  }, []);

  const setServices = useCallback((services: ServiceLineItem[]) => {
    setState(prev => ({ ...prev, services }));
  }, []);

  const clearServices = useCallback(() => {
    setState(prev => ({ ...prev, services: [] }));
  }, []);

  // ========== Step 4: Review ==========

  const setSaveAsQuote = useCallback((asQuote: boolean) => {
    setState(prev => ({ ...prev, saveAsQuote: asQuote }));
  }, []);

  // ========== Step 5: Schedule ==========

  const setSchedule = useCallback((schedule: ScheduleData | null) => {
    setState(prev => ({ ...prev, schedule }));
  }, []);

  const updateSchedule = useCallback((updates: Partial<ScheduleData>) => {
    setState(prev => ({
      ...prev,
      schedule: prev.schedule ? { ...prev.schedule, ...updates } : null
    }));
  }, []);

  // ========== Validation ==========

  const validateCurrentStep = useCallback((): StepValidation => {
    return validateStep(state.currentStep, state, config);
  }, [state, config]);

  // ========== Completion ==========

  const markCompleted = useCallback((jobId: string) => {
    setState(prev => ({
      ...prev,
      isCompleted: true,
      createdJobId: jobId
    }));

    // Clear localStorage on completion
    if (config.enableLocalStorage) {
      clearStorage(storageKey);
    }
  }, [config.enableLocalStorage, storageKey]);

  const reset = useCallback(() => {
    setState(createInitialState());
    if (config.enableLocalStorage) {
      clearStorage(storageKey);
    }
  }, [config.enableLocalStorage, storageKey]);

  // ========== Persistence ==========

  const saveProgress = useCallback(() => {
    if (config.enableLocalStorage) {
      saveToStorage(storageKey, state);
    }
  }, [config.enableLocalStorage, storageKey, state]);

  const loadProgress = useCallback((): boolean => {
    if (config.enableLocalStorage) {
      const stored = loadFromStorage(storageKey);
      if (stored && !stored.isCompleted) {
        setState(stored);
        return true;
      }
    }
    return false;
  }, [config.enableLocalStorage, storageKey]);

  const clearSavedProgress = useCallback(() => {
    if (config.enableLocalStorage) {
      clearStorage(storageKey);
    }
  }, [config.enableLocalStorage, storageKey]);

  // ========== Return Hook Interface ==========

  return {
    // State
    state,
    currentStep: state.currentStep,
    isFirstStep,
    isLastStep,
    canGoNext,
    canGoBack,

    // Step-specific data
    customer: state.customer,
    jobDetails: state.jobDetails,
    services: state.services,
    schedule: state.schedule,

    // Computed values
    estimatedTotal,
    serviceCount,

    // Navigation
    goToStep,
    nextStep,
    prevStep,

    // Step 1: Customer
    setCustomer,

    // Step 2: Job Details
    updateJobDetails,
    setJobDetails,

    // Step 3: Services
    addService,
    updateService,
    removeService,
    setServices,
    clearServices,

    // Step 4: Review
    setSaveAsQuote,

    // Step 5: Schedule
    setSchedule,
    updateSchedule,

    // Validation
    validateCurrentStep,
    errors: state.errors,

    // Completion
    markCompleted,
    reset,

    // Persistence
    saveProgress,
    loadProgress,
    clearSavedProgress
  };
};
