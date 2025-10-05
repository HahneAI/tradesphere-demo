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
  materialWaste?: number;
  fixedLaborHours?: number;
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
}

export interface PaverPatioValues {
  excavation: {
    tearoutComplexity: string;
    equipmentRequired: string;
  };
  siteAccess: {
    accessDifficulty: string;
    obstacleRemoval: string;
  };
  materials: {
    paverStyle: string;
    cuttingComplexity: string;
    patternComplexity: string;
  };
  labor: {
    teamSize: string;
  };
  complexity: {
    overallComplexity: number;
  };
}

export interface PaverPatioCalculationResult {
  tier1Results: {
    baseHours: number;
    adjustedHours: number;
    totalManHours: number;
    totalDays: number;
    breakdown: string[];
  };
  tier2Results: {
    laborCost: number;
    materialCostBase: number;
    materialWasteCost: number;
    totalMaterialCost: number;
    equipmentCost: number;
    obstacleCost: number;
    subtotal: number;
    profit: number;
    total: number;
    pricePerSqft: number;
  };
  breakdown: string;
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