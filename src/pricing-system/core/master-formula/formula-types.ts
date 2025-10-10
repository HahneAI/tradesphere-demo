export interface BaseSetting {
  value: number;
  unit: string;
  label: string;
  description: string;
  adminEditable: boolean;
  validation?: {
    min: number;
    max: number;
    step: number;
  };
}

export interface PaverPatioOption {
  label: string;
  value?: number;
  multiplier?: number;
  laborMultiplier?: number;
  laborPercentage?: number;
  materialWaste?: number;
  wastePercentage?: number;
  description?: string;
}

export interface PaverPatioVariable {
  label: string;
  description?: string;
  type: 'select' | 'slider';
  default: string | number;
  calculationTier: 1 | 2 | 'both';
  effectType: string;
  validation?: {
    min: number;
    max: number;
    step: number;
  };
  options: Record<string, PaverPatioOption>;
}

export interface PaverPatioConfig {
  id?: string;  // Database UUID for service_pricing_configs record (required for materials database)
  service: string;
  serviceId: string;
  category: string;
  version: string;
  lastModified: string;
  modifiedBy: string;
  description: string;
  baseSettings: {
    laborSettings: Record<string, BaseSetting>;
    materialSettings: Record<string, BaseSetting>;
    businessSettings: Record<string, BaseSetting>;
  };
  calculationSystem: {
    type: string;
    description: string;
    tier1: string;
    tier2: string;
  };
  variables: {
    excavation: Record<string, PaverPatioVariable | string>;
    siteAccess: Record<string, PaverPatioVariable | string>;
    materials: Record<string, PaverPatioVariable | string>;
    labor: Record<string, PaverPatioVariable | string>;
    complexity: Record<string, PaverPatioVariable | string>;
  };
  variables_config?: any; // For excavation & new services (JSONB structure)
}

export interface PaverPatioValues {
  // excavation category REMOVED - now handled via serviceIntegrations
  siteAccess: {
    accessDifficulty: string;
    obstacleRemoval: string;
  };
  materials: {
    paverStyle: string;
    cuttingComplexity: string;
    useMaterialsDatabase?: boolean;  // NEW: Toggle for database system
  };
  labor: {
    teamSize: string;
  };
  complexity: {
    overallComplexity: number;
  };
  serviceIntegrations?: {
    includeExcavation?: boolean;
  };
  // NEW: Material selections (future enhancement for material overrides)
  selectedMaterials?: Record<string, string>;  // categoryKey → materialId
  customPerimeter?: number;  // Linear feet override for edging calculations
}

export interface PaverPatioCalculationResult {
  tier1Results: {
    baseHours: number;
    adjustedHours: number;
    paverPatioHours?: number;      // Paver-specific hours (without excavation)
    excavationHours?: number;      // Excavation hours (from bundled service)
    totalManHours: number;
    totalDays: number;
    breakdown: string[];
  };
  tier2Results: {
    laborCost: number;
    materialCostBase: number;
    materialWasteCost: number;
    totalMaterialCost: number;
    excavationCost?: number;       // Excavation cost (from bundled service)
    excavationDetails?: {          // Excavation breakdown
      cubicYards: number;
      depth: number;
      wasteFactor: number;
      baseRate: number;
      profit: number;
    };
    equipmentCost: number;         // DEPRECATED (always 0)
    obstacleCost: number;
    subtotal: number;
    profit: number;
    total: number;
    pricePerSqft: number;
  };
  breakdown: string;
  sqft?: number;
  inputValues?: PaverPatioValues;
  confidence?: number;
  calculationDate?: string;
}

export interface PaverPatioStore {
  config: PaverPatioConfig | null;
  values: PaverPatioValues;
  sqft: number;
  isLoading: boolean;
  error: string | null;
  lastCalculation: PaverPatioCalculationResult | null;

  // Actions
  loadConfig: () => Promise<void>;
  updateValue: (category: keyof PaverPatioValues, variable: string, value: string | number) => void;
  setSqft: (sqft: number) => void;
  resetToDefaults: () => void;
  resetCategory: (category: keyof PaverPatioValues) => void;
  calculatePrice: (sqft?: number) => PaverPatioCalculationResult;
  saveConfig: () => Promise<void>;
  createBackup: () => Promise<void>;
}

// Legacy support interfaces for backward compatibility
export interface LegacyPaverPatioOption {
  label: string;
  value: number;
  description: string;
}

export interface LegacyPaverPatioVariable {
  label: string;
  description: string;
  type: 'select' | 'slider';
  default: string | number;
  min?: number;
  max?: number;
  step?: number;
  options: Record<string, LegacyPaverPatioOption>;
}

// ============================================================================
// EXCAVATION SERVICE TYPES
// ============================================================================

export interface ExcavationCalculationSettings {
  defaultDepth: {
    type: 'number';
    label: string;
    default: number;
    unit: string;
    min: number;
    max: number;
    adminEditable: boolean;
    description: string;
  };
  wasteFactor: {
    type: 'number';
    label: string;
    default: number;
    min: number;
    max: number;
    adminEditable: boolean;
    description: string;
  };
  compactionFactor: {
    type: 'number';
    label: string;
    default: number;
    min: number;
    max: number;
    adminEditable: boolean;
    description: string;
  };
  roundingRule: {
    type: 'select';
    label: string;
    default: string;
    options: {
      up_whole: { label: string };
      up_half: { label: string };
      exact: { label: string };
    };
  };
}

export interface ExcavationConfig {
  service: string;
  serviceId: string;
  hourly_labor_rate: number;  // Actually $/cubic yard base rate
  optimal_team_size: number;
  base_productivity: number;
  base_material_cost: number;  // Always 0 for excavation
  profit_margin: number;
  variables_config: {
    calculationSettings: ExcavationCalculationSettings;
  };
}

export interface ExcavationValues {
  area_sqft: number;
  depth_inches: number;
}

export interface ExcavationCalculationResult {
  // Volume calculations
  area_sqft: number;
  depth_inches: number;
  cubic_yards_raw: number;
  cubic_yards_adjusted: number;
  cubic_yards_final: number;

  // Time estimates
  base_hours: number;
  crew_hours: number;
  project_days: number;

  // Cost breakdown
  base_cost: number;
  profit: number;
  total_cost: number;
  cost_per_cubic_yard: number;
  hours_per_cubic_yard: number;
}

export interface ExcavationStore {
  config: ExcavationConfig | null;
  values: ExcavationValues;
  isLoading: boolean;
  error: string | null;
  lastCalculation: ExcavationCalculationResult | null;

  // Actions
  loadConfig: () => Promise<void>;
  updateArea: (sqft: number) => void;
  updateDepth: (inches: number) => void;
  calculate: () => Promise<void>;
  reloadConfig: () => Promise<void>;
  setConfig: (config: ExcavationConfig) => void;
}