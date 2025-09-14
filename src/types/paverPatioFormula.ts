export interface PaverPatioOption {
  label: string;
  value: number;
  description: string;
}

export interface PaverPatioVariable {
  label: string;
  description: string;
  type: 'select' | 'slider';
  default: string | number;
  min?: number;
  max?: number;
  step?: number;
  options: Record<string, PaverPatioOption>;
}

export interface PaverPatioVariableCategory {
  label: string;
  description: string;
  [key: string]: PaverPatioVariable | string;
}

export interface PaverPatioFormula {
  description: string;
  basePrice: number;
  calculation: string;
}

export interface PaverPatioConfig {
  service: string;
  serviceId: string;
  version: string;
  lastModified: string;
  modifiedBy: string;
  description: string;
  variables: {
    excavation: PaverPatioVariableCategory;
    siteAccess: PaverPatioVariableCategory;
    materials: PaverPatioVariableCategory;
    labor: PaverPatioVariableCategory;
    complexity: PaverPatioVariableCategory;
  };
  formula: PaverPatioFormula;
}

export interface PaverPatioValues {
  excavation: {
    tearoutMultiplier: string;
    equipmentCategory: string;
  };
  siteAccess: {
    accessDifficulty: string;
    obstacleRemoval: string;
  };
  materials: {
    paverStyle: string;
    cuttingComplexity: string;
    degree45Factor: string;
  };
  labor: {
    teamSize: string;
    teamEfficiency: number;
  };
  complexity: {
    projectComplexity: number;
  };
}

export interface PaverPatioCalculationResult {
  basePrice: number;
  multipliers: {
    tearout: number;
    access: number;
    paverStyle: number;
    cutting: number;
    degree45: number;
    teamSize: number;
    teamEfficiency: number;
    complexity: number;
  };
  additionalCosts: {
    equipment: number;
    obstacles: number;
  };
  subtotal: number;
  total: number;
  breakdown: string;
}

export interface PaverPatioStore {
  config: PaverPatioConfig | null;
  values: PaverPatioValues;
  isLoading: boolean;
  error: string | null;
  lastCalculation: PaverPatioCalculationResult | null;
  
  // Actions
  loadConfig: () => Promise<void>;
  updateValue: (category: keyof PaverPatioValues, variable: string, value: string | number) => void;
  resetToDefaults: () => void;
  resetCategory: (category: keyof PaverPatioValues) => void;
  calculatePrice: (sqft?: number) => PaverPatioCalculationResult;
  saveConfig: () => Promise<void>;
  createBackup: () => Promise<void>;
}