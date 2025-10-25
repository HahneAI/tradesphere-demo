import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../services/supabase';

const supabase = getSupabase();

// ==================== TYPE DEFINITIONS ====================

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface MaterialCategory {
  id: string;
  category_key: string;
  category_label: string;
  category_description: string;
  calculation_method: 'AREA_COVERAGE' | 'VOLUME_COVERAGE' | 'LINEAR_COVERAGE' | 'PER_UNIT' | 'WEIGHT_BASED' | 'CUSTOM_FORMULA';
  default_depth_inches: number | null;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface Material {
  id: string;
  material_name: string;
  material_category: string;
  material_description?: string;
  unit_type: string;
  price_per_unit: number;
  coverage_per_unit?: number;
  coverage_depth_inches?: number;
  waste_factor_percentage: number;
  compaction_factor_percentage: number;
  is_default: boolean;
  is_active: boolean;
}

export interface CustomServiceWizardState {
  // Navigation
  currentStep: WizardStep;

  // Step 1: Service Identity
  service_name: string;
  service_id: string;
  category: 'hardscape' | 'landscape' | 'excavation' | 'specialty';

  // Step 2: Base Settings
  hourly_labor_rate: number;
  optimal_team_size: number;
  base_productivity: number;
  productivity_unit: string;
  profit_margin: number;

  // Step 3: Material Categories
  material_categories: MaterialCategory[];

  // Step 4: Materials by Category
  materials_by_category: Record<string, Material[]>;

  // Step 5: Variables Config (JSONB)
  variables_config: any;

  // Step 6: Default Variables
  default_variables: any;

  // Step 7: Test Calculation Result
  test_calculation_result: any | null;

  // Meta
  isCompleted: boolean;
  errors: Record<string, string>;
}

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// ==================== INITIAL STATE ====================

const createInitialState = (): CustomServiceWizardState => ({
  currentStep: 1,
  service_name: '',
  service_id: '',
  category: 'hardscape',
  hourly_labor_rate: 25,
  optimal_team_size: 3,
  base_productivity: 50,
  productivity_unit: 'sqft/day',
  profit_margin: 0.20,
  material_categories: [],
  materials_by_category: {},
  variables_config: {
    formulaType: 'two_tier',
    formulaDescription: 'Tier 1: Calculate labor hours | Tier 2: Calculate costs with complexity and profit'
  },
  default_variables: {},
  test_calculation_result: null,
  isCompleted: false,
  errors: {}
});

// ==================== VALIDATION FUNCTIONS ====================

const validateStep1 = async (
  state: CustomServiceWizardState,
  companyId: string
): Promise<ValidationResult> => {
  const errors: Record<string, string> = {};

  // Service name required
  if (!state.service_name || state.service_name.trim().length === 0) {
    errors.service_name = 'Service name is required';
  }

  // Service name length
  if (state.service_name.length > 100) {
    errors.service_name = 'Service name must be 100 characters or less';
  }

  // Service ID format validation
  const serviceIdRegex = /^[a-z0-9_]+_(sqft|linear_ft|cubic_yd|item)$/;
  if (!serviceIdRegex.test(state.service_id)) {
    errors.service_id = 'Service ID must be lowercase, underscores only, and end with _sqft, _linear_ft, _cubic_yd, or _item';
  }

  // Uniqueness check (database query)
  try {
    const { data: existing } = await supabase
      .from('svc_pricing_configs')
      .select('id')
      .eq('company_id', companyId)
      .eq('service_name', state.service_name)
      .maybeSingle();

    if (existing) {
      errors.service_name = 'A service with this name already exists for your company';
    }
  } catch (error) {
    console.error('Error checking service name uniqueness:', error);
  }

  // Category validation
  const validCategories = ['hardscape', 'landscape', 'excavation', 'specialty'];
  if (!validCategories.includes(state.category)) {
    errors.category = 'Invalid service category';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateStep2 = (state: CustomServiceWizardState): ValidationResult => {
  const errors: Record<string, string> = {};

  if (state.hourly_labor_rate <= 0) {
    errors.hourly_labor_rate = 'Hourly labor rate must be greater than 0';
  }

  if (state.base_productivity <= 0) {
    errors.base_productivity = 'Base productivity must be greater than 0 to prevent division errors';
  }

  if (state.optimal_team_size < 1) {
    errors.optimal_team_size = 'Team size must be at least 1';
  }

  if (state.profit_margin < 0 || state.profit_margin > 1) {
    errors.profit_margin = 'Profit margin must be between 0 and 1 (e.g., 0.20 for 20%)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateStep3 = (state: CustomServiceWizardState): ValidationResult => {
  const errors: Record<string, string> = {};

  if (state.material_categories.length === 0) {
    errors.material_categories = 'At least one material category is required';
  }

  // Check that all categories have required fields
  state.material_categories.forEach((cat, index) => {
    if (!cat.category_key) {
      errors[`category_${index}_key`] = `Category ${index + 1}: Key is required`;
    }
    if (!cat.category_label) {
      errors[`category_${index}_label`] = `Category ${index + 1}: Label is required`;
    }
    if (!cat.calculation_method) {
      errors[`category_${index}_method`] = `Category ${index + 1}: Calculation method is required`;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateStep4 = (state: CustomServiceWizardState): ValidationResult => {
  const errors: Record<string, string> = {};

  // Check that all required categories have at least one material
  const requiredCategories = state.material_categories.filter(cat => cat.is_required);

  requiredCategories.forEach(cat => {
    const materials = state.materials_by_category[cat.category_key] || [];
    if (materials.length === 0) {
      errors[cat.category_key] = `At least one material is required for ${cat.category_label}`;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateStep = async (
  step: WizardStep,
  state: CustomServiceWizardState,
  companyId: string
): Promise<ValidationResult> => {
  switch (step) {
    case 1:
      return validateStep1(state, companyId);
    case 2:
      return validateStep2(state);
    case 3:
      return validateStep3(state);
    case 4:
      return validateStep4(state);
    case 5:
    case 6:
    case 7:
      // TODO: Implement validation for steps 5-7
      return { isValid: true, errors: {} };
    default:
      return { isValid: false, errors: { general: 'Invalid step' } };
  }
};

// ==================== HOOK ====================

export const useCustomServiceWizard = (companyId: string, enableLocalStorage = true) => {
  const STORAGE_KEY = `custom-service-wizard-${companyId}`;

  // Initialize state from localStorage if available
  const [state, setState] = useState<CustomServiceWizardState>(() => {
    if (enableLocalStorage) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (!parsed.isCompleted) {
            return parsed;
          }
        } catch (error) {
          console.error('Error parsing stored wizard state:', error);
        }
      }
    }
    return createInitialState();
  });

  // Auto-save to localStorage on state change
  useEffect(() => {
    if (enableLocalStorage && !state.isCompleted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, enableLocalStorage, STORAGE_KEY]);

  // Clear localStorage on completion
  useEffect(() => {
    if (enableLocalStorage && state.isCompleted) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [state.isCompleted, enableLocalStorage, STORAGE_KEY]);

  // Navigate to a specific step with optional validation
  const goToStep = useCallback(async (step: WizardStep, skipValidation = false) => {
    const shouldValidate = step > state.currentStep && !skipValidation;

    if (shouldValidate) {
      const validation = await validateStep(state.currentStep, state, companyId);
      if (!validation.isValid) {
        setState(prev => ({ ...prev, errors: validation.errors }));
        return false;
      }
    }

    setState(prev => ({
      ...prev,
      currentStep: step,
      errors: {} // Clear errors when changing steps
    }));

    return true;
  }, [state, companyId]);

  // Navigate to next step
  const goToNext = useCallback(async () => {
    if (state.currentStep < 7) {
      return goToStep((state.currentStep + 1) as WizardStep);
    }
    return false;
  }, [state.currentStep, goToStep]);

  // Navigate to previous step
  const goToPrevious = useCallback(() => {
    if (state.currentStep > 1) {
      return goToStep((state.currentStep - 1) as WizardStep, true); // Skip validation going back
    }
    return false;
  }, [state.currentStep, goToStep]);

  // Update state fields
  const updateField = useCallback(<K extends keyof CustomServiceWizardState>(
    field: K,
    value: CustomServiceWizardState[K]
  ) => {
    setState(prev => ({ ...prev, [field]: value }));
  }, []);

  // Reset wizard to initial state
  const reset = useCallback(() => {
    setState(createInitialState());
    if (enableLocalStorage) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [enableLocalStorage, STORAGE_KEY]);

  // Get completed steps
  const getCompletedSteps = useCallback((): WizardStep[] => {
    const completed: WizardStep[] = [];
    if (state.currentStep > 1 || state.service_name) completed.push(1);
    if (state.currentStep > 2) completed.push(2);
    if (state.currentStep > 3) completed.push(3);
    if (state.currentStep > 4) completed.push(4);
    if (state.currentStep > 5) completed.push(5);
    if (state.currentStep > 6) completed.push(6);
    if (state.isCompleted) completed.push(7);
    return completed;
  }, [state]);

  return {
    state,
    setState,
    goToStep,
    goToNext,
    goToPrevious,
    updateField,
    reset,
    completedSteps: getCompletedSteps()
  };
};
