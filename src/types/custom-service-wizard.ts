// Type definitions for Custom Service Creation Wizard

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ServiceCategory = 'hardscape' | 'landscape' | 'excavation' | 'specialty';

export type CalculationMethod =
  | 'AREA_COVERAGE'
  | 'VOLUME_COVERAGE'
  | 'LINEAR_COVERAGE'
  | 'PER_UNIT'
  | 'WEIGHT_BASED'
  | 'CUSTOM_FORMULA';

export type EffectType =
  | 'labor_time_percentage'
  | 'material_cost_multiplier'
  | 'total_project_multiplier'
  | 'cutting_complexity'
  | 'daily_equipment_cost'
  | 'flat_additional_cost';

export interface MaterialCategory {
  id: string;
  category_key: string;
  category_label: string;
  category_description: string;
  calculation_method: CalculationMethod;
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
  supplier_name?: string;
  unit_type: string;
  price_per_unit: number;

  // Coverage fields (conditional based on calculation_method)
  coverage_per_unit?: number;
  coverage_depth_inches?: number;
  units_per_package?: number;
  weight_lbs?: number;

  // Waste & Compaction
  waste_factor_percentage: number;
  compaction_factor_percentage: number;

  // Meta
  is_default: boolean;
  is_active: boolean;
}

export interface VariableOption {
  label: string;
  value: number;
  multiplier?: number;
  laborPercentage?: number;
  materialWaste?: number;
  dollarAmount?: number;
}

export interface VariableDefinition {
  variableKey: string;
  type: 'select' | 'toggle' | 'numeric';
  label: string;
  description: string;
  effectType: EffectType;
  calculationTier: 1 | 2 | 'both';
  default: string;
  options: Record<string, VariableOption>;
}

export interface VariableCategory {
  categoryKey: string;
  label: string;
  description: string;
  variables: VariableDefinition[];
}

export interface PricingResult {
  tier1: {
    base_labor_hours: number;
    total_labor_hours: number;
    adjustments: Array<{
      label: string;
      adjustment: number;
    }>;
  };
  tier2: {
    labor_cost: number;
    materials_subtotal: number;
    profit_amount: number;
    pass_through_costs: number;
    total_price: number;
  };
  materials_breakdown: Record<string, {
    quantity_needed: number;
    subtotal: number;
  }>;
}
