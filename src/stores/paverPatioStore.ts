import { useState, useCallback, useEffect } from 'react';
import type { 
  PaverPatioConfig, 
  PaverPatioValues, 
  PaverPatioCalculationResult,
  PaverPatioStore 
} from '../types/paverPatioFormula';

// Import the JSON configuration
import paverPatioConfigJson from '../config/paver-patio-formula.json';

// Default values based on the configuration
const getDefaultValues = (config: PaverPatioConfig): PaverPatioValues => ({
  excavation: {
    tearoutMultiplier: config.variables.excavation.tearoutMultiplier?.default as string || 'grass',
    equipmentCategory: config.variables.excavation.equipmentCategory?.default as string || 'lightMachinery',
  },
  siteAccess: {
    accessDifficulty: config.variables.siteAccess.accessDifficulty?.default as string || 'moderate',
    obstacleRemoval: config.variables.siteAccess.obstacleRemoval?.default as string || 'minor',
  },
  materials: {
    paverStyle: config.variables.materials.paverStyle?.default as string || 'midGrade',
    cuttingComplexity: config.variables.materials.cuttingComplexity?.default as string || 'moderate',
    degree45Factor: config.variables.materials.degree45Factor?.default as string || 'some',
  },
  labor: {
    teamSize: config.variables.labor.teamSize?.default as string || 'twoPerson',
    teamEfficiency: config.variables.labor.teamEfficiency?.default as number || 1.0,
  },
  complexity: {
    projectComplexity: config.variables.complexity.projectComplexity?.default as number || 1.0,
  },
});

// Load values from localStorage
const loadStoredValues = (config: PaverPatioConfig): PaverPatioValues => {
  try {
    const stored = localStorage.getItem('paverPatioValues');
    if (stored) {
      const parsedValues = JSON.parse(stored);
      // Merge with defaults to ensure all fields exist
      const defaults = getDefaultValues(config);
      return {
        excavation: { ...defaults.excavation, ...parsedValues.excavation },
        siteAccess: { ...defaults.siteAccess, ...parsedValues.siteAccess },
        materials: { ...defaults.materials, ...parsedValues.materials },
        labor: { ...defaults.labor, ...parsedValues.labor },
        complexity: { ...defaults.complexity, ...parsedValues.complexity },
      };
    }
  } catch (error) {
    console.warn('Failed to load stored paver patio values:', error);
  }
  return getDefaultValues(config);
};

// Save values to localStorage
const saveStoredValues = (values: PaverPatioValues) => {
  try {
    localStorage.setItem('paverPatioValues', JSON.stringify(values));
    localStorage.setItem('paverPatioLastModified', new Date().toISOString());
  } catch (error) {
    console.warn('Failed to save paver patio values:', error);
  }
};

// Calculate dynamic base price from base settings
const calculateDynamicBasePrice = (config: any): number => {
  if (!config.baseSettings) {
    return config.formula.basePrice; // Fallback to original static price
  }
  
  const laborHoursPerSqft = config.baseSettings.baseLaborRate?.value || 0.12;
  const materialCost = config.baseSettings.baseMaterialCost?.value || 4.50;
  const manHourRate = config.baseSettings.manHourRate?.value || 75;
  const profitMargin = config.baseSettings.profitMarginTarget?.value || 0.35;
  
  // Formula: (laborHoursPerSqft * manHourRate + materialCost) * (1 + profitMargin)
  // This calculates: (hours per sqft * dollar per hour) + material cost, then applies profit margin
  const laborCostPerSqft = laborHoursPerSqft * manHourRate;
  const totalCostPerSqft = laborCostPerSqft + materialCost;
  const calculatedPrice = totalCostPerSqft * (1 + profitMargin);
  
  return Number(calculatedPrice.toFixed(2));
};

// Calculate price based on current values
const calculatePrice = (
  config: PaverPatioConfig, 
  values: PaverPatioValues, 
  sqft: number = 1
): PaverPatioCalculationResult => {
  const basePrice = calculateDynamicBasePrice(config);
  
  // Get multiplier values
  const tearout = config.variables.excavation.tearoutMultiplier?.options[values.excavation.tearoutMultiplier]?.value || 1;
  const access = config.variables.siteAccess.accessDifficulty?.options[values.siteAccess.accessDifficulty]?.value || 1;
  const paverStyle = config.variables.materials.paverStyle?.options[values.materials.paverStyle]?.value || 1;
  const cutting = config.variables.materials.cuttingComplexity?.options[values.materials.cuttingComplexity]?.value || 1;
  const degree45 = config.variables.materials.degree45Factor?.options[values.materials.degree45Factor]?.value || 1;
  const teamSize = config.variables.labor.teamSize?.options[values.labor.teamSize]?.value || 1;
  const teamEfficiency = values.labor.teamEfficiency;
  const complexity = values.complexity.projectComplexity;
  
  // Get additional costs
  const equipment = config.variables.excavation.equipmentCategory?.options[values.excavation.equipmentCategory]?.value || 0;
  const obstacles = config.variables.siteAccess.obstacleRemoval?.options[values.siteAccess.obstacleRemoval]?.value || 0;
  
  // Calculate
  const multipliedPrice = basePrice * tearout * access * paverStyle * cutting * degree45 * teamSize * teamEfficiency * complexity;
  const subtotal = multipliedPrice * sqft;
  const total = subtotal + equipment + obstacles;
  
  const breakdown = `($${basePrice} × ${tearout} × ${access} × ${paverStyle} × ${cutting} × ${degree45} × ${teamSize} × ${teamEfficiency} × ${complexity}) × ${sqft} sqft + $${equipment} equipment + $${obstacles} obstacles = $${total.toFixed(2)}`;
  
  return {
    basePrice,
    multipliers: {
      tearout,
      access,
      paverStyle,
      cutting,
      degree45,
      teamSize,
      teamEfficiency,
      complexity,
    },
    additionalCosts: {
      equipment,
      obstacles,
    },
    subtotal,
    total,
    breakdown,
  };
};

// Custom hook for paver patio store
export const usePaverPatioStore = (): PaverPatioStore => {
  const [config, setConfig] = useState<PaverPatioConfig | null>(null);
  const [values, setValues] = useState<PaverPatioValues>({} as PaverPatioValues);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCalculation, setLastCalculation] = useState<PaverPatioCalculationResult | null>(null);

  // Load configuration with base settings integration
  const loadConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Cast the imported JSON to our type
      let configData = paverPatioConfigJson as any;
      
      // Check for base settings overrides from Services tab
      const serviceConfigOverride = localStorage.getItem('service_config_paver_patio_sqft');
      if (serviceConfigOverride) {
        try {
          const override = JSON.parse(serviceConfigOverride);
          configData = {
            ...configData,
            baseSettings: { ...configData.baseSettings, ...override.baseSettings },
            lastModified: override.lastModified || configData.lastModified
          };
        } catch (error) {
          console.warn('Failed to apply base settings override:', error);
        }
      }
      
      setConfig(configData);
      
      // Load or initialize values
      const initialValues = loadStoredValues(configData);
      setValues(initialValues);
      
      // Calculate initial price with potentially updated base settings
      const calculation = calculatePrice(configData, initialValues);
      setLastCalculation(calculation);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load configuration';
      setError(errorMessage);
      console.error('Error loading paver patio config:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update a specific value
  const updateValue = useCallback((category: keyof PaverPatioValues, variable: string, value: string | number) => {
    if (!config) return;
    
    setValues(prev => {
      const updated = {
        ...prev,
        [category]: {
          ...prev[category],
          [variable]: value,
        },
      };
      
      // Save to localStorage
      saveStoredValues(updated);
      
      // Recalculate price
      const calculation = calculatePrice(config, updated);
      setLastCalculation(calculation);
      
      return updated;
    });
  }, [config]);

  // Reset all values to defaults
  const resetToDefaults = useCallback(() => {
    if (!config) return;
    
    const defaultValues = getDefaultValues(config);
    setValues(defaultValues);
    saveStoredValues(defaultValues);
    
    const calculation = calculatePrice(config, defaultValues);
    setLastCalculation(calculation);
  }, [config]);

  // Reset a specific category
  const resetCategory = useCallback((category: keyof PaverPatioValues) => {
    if (!config) return;
    
    const defaultValues = getDefaultValues(config);
    setValues(prev => {
      const updated = {
        ...prev,
        [category]: defaultValues[category],
      };
      
      saveStoredValues(updated);
      const calculation = calculatePrice(config, updated);
      setLastCalculation(calculation);
      
      return updated;
    });
  }, [config]);

  // Calculate price for specific square footage
  const calculatePriceForSqft = useCallback((sqft: number = 1): PaverPatioCalculationResult => {
    if (!config) {
      throw new Error('Configuration not loaded');
    }
    
    const calculation = calculatePrice(config, values, sqft);
    setLastCalculation(calculation);
    return calculation;
  }, [config, values]);

  // Save configuration (for future admin changes)
  const saveConfig = useCallback(async () => {
    if (!config) return;
    
    try {
      // In a real implementation, this would save to a server
      // For now, we'll just update the localStorage timestamp
      localStorage.setItem('paverPatioConfigLastSaved', new Date().toISOString());
      console.log('Paver patio configuration saved successfully');
    } catch (err) {
      console.error('Failed to save configuration:', err);
      throw err;
    }
  }, [config]);

  // Create backup (for future admin changes)
  const createBackup = useCallback(async () => {
    if (!config) return;
    
    try {
      // In a real implementation, this would create a backup file
      const backup = {
        config,
        values,
        timestamp: new Date().toISOString(),
      };
      
      localStorage.setItem(`paverPatioBackup_${Date.now()}`, JSON.stringify(backup));
      console.log('Paver patio backup created successfully');
    } catch (err) {
      console.error('Failed to create backup:', err);
      throw err;
    }
  }, [config, values]);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Listen for base settings changes from Services tab
  useEffect(() => {
    const handleBaseSettingsChange = (e: StorageEvent) => {
      if (e.key === 'service_config_paver_patio_sqft' && e.newValue && config) {
        try {
          const updatedServiceConfig = JSON.parse(e.newValue);
          
          // Update the config with new base settings
          const updatedConfig = {
            ...config,
            baseSettings: { ...config.baseSettings, ...updatedServiceConfig.baseSettings },
            lastModified: updatedServiceConfig.lastModified || config.lastModified
          };
          
          setConfig(updatedConfig);
          
          // Recalculate price with new base settings
          const calculation = calculatePrice(updatedConfig, values);
          setLastCalculation(calculation);
          
          console.log('🔄 Base settings updated from Services tab, Quick Calculator refreshed');
        } catch (error) {
          console.error('Error applying base settings update:', error);
        }
      }
    };

    window.addEventListener('storage', handleBaseSettingsChange);
    return () => window.removeEventListener('storage', handleBaseSettingsChange);
  }, [config, values]);

  return {
    config,
    values,
    isLoading,
    error,
    lastCalculation,
    loadConfig,
    updateValue,
    resetToDefaults,
    resetCategory,
    calculatePrice: calculatePriceForSqft,
    saveConfig,
    createBackup,
  };
};