import { useState, useCallback, useEffect } from 'react';
import type { 
  PaverPatioConfig, 
  PaverPatioValues, 
  PaverPatioCalculationResult,
  PaverPatioStore 
} from '../types/paverPatioFormula';

// Import the JSON configuration
import paverPatioConfigJson from '../config/paver-patio-formula.json';

// Default values based on the configuration - Expert system compatible
const getDefaultValues = (config: PaverPatioConfig): PaverPatioValues => ({
  excavation: {
    tearoutComplexity: config.variables.excavation.tearoutComplexity?.default as string || 'grass',
    equipmentRequired: config.variables.excavation.equipmentRequired?.default as string || 'handTools',
  },
  siteAccess: {
    accessDifficulty: config.variables.siteAccess.accessDifficulty?.default as string || 'moderate',
    obstacleRemoval: config.variables.siteAccess.obstacleRemoval?.default as string || 'minor',
  },
  materials: {
    paverStyle: config.variables.materials.paverStyle?.default as string || 'economy',
    cuttingComplexity: config.variables.materials.cuttingComplexity?.default as string || 'moderate',
    patternComplexity: config.variables.materials.patternComplexity?.default as string || 'minimal',
  },
  labor: {
    teamSize: config.variables.labor.teamSize?.default as string || 'twoPerson',
  },
  complexity: {
    overallComplexity: config.variables.complexity.overallComplexity?.default as number || 1.0,
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

// Expert-validated two-tier calculation system
const calculateExpertPricing = (
  config: PaverPatioConfig,
  values: PaverPatioValues,
  sqft: number = 100
): PaverPatioCalculationResult => {
  // Get base settings
  const hourlyRate = config.baseSettings.laborSettings.hourlyLaborRate?.value || 25;
  const optimalTeamSize = config.baseSettings.laborSettings.optimalTeamSize?.value || 3;
  const baseProductivity = config.baseSettings.laborSettings.baseProductivity?.value || 100;
  const baseMaterialCost = config.baseSettings.materialSettings.baseMaterialCost?.value || 5.84;
  const profitMargin = config.baseSettings.businessSettings.profitMarginTarget?.value || 0.15;

  // TIER 1: Man Hours Calculation
  const baseHours = (sqft / baseProductivity) * optimalTeamSize * 8;
  let adjustedHours = baseHours;
  const breakdownSteps: string[] = [`Base Hours: ${baseHours.toFixed(1)}`];

  // Apply Tier 1 variables (labor time adjustments)
  const tearout = config.variables.excavation.tearoutComplexity?.options[values.excavation.tearoutComplexity];
  if (tearout?.value) {
    const tearoutHours = adjustedHours * (tearout.value / 100);
    adjustedHours += tearoutHours;
    breakdownSteps.push(`+Tearout (${tearout.value}%): +${tearoutHours.toFixed(1)} hours`);
  }

  const access = config.variables.siteAccess.accessDifficulty?.options[values.siteAccess.accessDifficulty];
  if (access?.value) {
    const accessHours = adjustedHours * (access.value / 100);
    adjustedHours += accessHours;
    breakdownSteps.push(`+Access (${access.value}%): +${accessHours.toFixed(1)} hours`);
  }

  const team = config.variables.labor.teamSize?.options[values.labor.teamSize];
  if (team?.value) {
    const teamHours = adjustedHours * (team.value / 100);
    adjustedHours += teamHours;
    breakdownSteps.push(`+Team Size (${team.value}%): +${teamHours.toFixed(1)} hours`);
  }

  // Add fixed cutting hours
  const cutting = config.variables.materials.cuttingComplexity?.options[values.materials.cuttingComplexity];
  if (cutting?.fixedLaborHours) {
    adjustedHours += cutting.fixedLaborHours;
    breakdownSteps.push(`+Cutting: +${cutting.fixedLaborHours} hours`);
  }

  const totalManHours = adjustedHours;

  // TIER 2: Cost Calculation
  const laborCost = totalManHours * hourlyRate;

  // Material costs with style multiplier
  const paverStyle = config.variables.materials.paverStyle?.options[values.materials.paverStyle];
  const styleMultiplier = paverStyle?.multiplier || 1.0;
  const materialCostBase = sqft * baseMaterialCost * styleMultiplier;

  // Material waste calculations
  const cuttingWaste = (cutting?.materialWaste || 0) / 100;
  const patternWaste = (config.variables.materials.patternComplexity?.options[values.materials.patternComplexity]?.wastePercentage || 0) / 100;
  const materialWasteCost = materialCostBase * (cuttingWaste + patternWaste);
  const totalMaterialCost = materialCostBase + materialWasteCost;

  // Equipment cost (daily rate * project days)
  const equipment = config.variables.excavation.equipmentRequired?.options[values.excavation.equipmentRequired];
  const projectDays = totalManHours / (optimalTeamSize * 8);
  const equipmentCost = (equipment?.value || 0) * projectDays;

  // Obstacle flat costs
  const obstacles = config.variables.siteAccess.obstacleRemoval?.options[values.siteAccess.obstacleRemoval];
  const obstacleCost = obstacles?.value || 0;

  // Calculate subtotal and apply complexity multiplier
  const subtotal = laborCost + totalMaterialCost + equipmentCost + obstacleCost;
  const profit = subtotal * profitMargin;
  const beforeComplexity = subtotal + profit;
  const complexityMultiplier = values.complexity.overallComplexity || 1.0;
  const total = beforeComplexity * complexityMultiplier;

  return {
    tier1Results: {
      baseHours,
      adjustedHours,
      totalManHours,
      breakdown: breakdownSteps
    },
    tier2Results: {
      laborCost,
      materialCostBase,
      materialWasteCost,
      totalMaterialCost,
      equipmentCost,
      obstacleCost,
      subtotal,
      profit,
      total,
      pricePerSqft: total / sqft
    },
    breakdown: `Labor: $${laborCost.toFixed(2)} | Materials: $${totalMaterialCost.toFixed(2)} | Equipment: $${equipmentCost.toFixed(2)} | Total: $${total.toFixed(2)}`
  };
};

// Calculate price based on current values - Uses expert two-tier system
const calculatePrice = (
  config: PaverPatioConfig,
  values: PaverPatioValues,
  sqft: number = 100
): PaverPatioCalculationResult => {
  // Check if we have the new expert structure
  if (config.calculationSystem?.type === 'two_tier') {
    return calculateExpertPricing(config, values, sqft);
  }

  // Fallback to legacy calculation for backward compatibility
  console.warn('Using legacy calculation system - consider updating to expert structure');

  const basePrice = 15.50;
  const tearout = 1.2;
  const access = 1.5;
  const paverStyle = 1.0;
  const cutting = 1.2;
  const teamSize = 1.4;
  const complexity = 1.0;
  const equipment = 250;
  const obstacles = 500;

  const multipliedPrice = basePrice * tearout * access * paverStyle * cutting * teamSize * complexity;
  const subtotal = multipliedPrice * sqft;
  const total = subtotal + equipment + obstacles;

  // Convert legacy result to new format
  return {
    tier1Results: {
      baseHours: sqft / 100 * 24,
      adjustedHours: sqft / 100 * 24 * 1.5,
      totalManHours: sqft / 100 * 24 * 1.5,
      breakdown: ['Legacy calculation - hours estimated']
    },
    tier2Results: {
      laborCost: multipliedPrice * sqft * 0.6,
      materialCostBase: multipliedPrice * sqft * 0.4,
      materialWasteCost: 0,
      totalMaterialCost: multipliedPrice * sqft * 0.4,
      equipmentCost: equipment,
      obstacleCost: obstacles,
      subtotal,
      profit: subtotal * 0.15,
      total,
      pricePerSqft: total / sqft
    },
    breakdown: `Legacy calculation: $${total.toFixed(2)} total`
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
          // Handle nested base settings structure properly
          configData = {
            ...configData,
            baseSettings: {
              laborSettings: { ...configData.baseSettings?.laborSettings, ...override.baseSettings?.laborSettings },
              materialSettings: { ...configData.baseSettings?.materialSettings, ...override.baseSettings?.materialSettings },
              businessSettings: { ...configData.baseSettings?.businessSettings, ...override.baseSettings?.businessSettings }
            },
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
          
          // Update the config with new base settings - handle nested structure
          const updatedConfig = {
            ...config,
            baseSettings: {
              laborSettings: { ...config.baseSettings?.laborSettings, ...updatedServiceConfig.baseSettings?.laborSettings },
              materialSettings: { ...config.baseSettings?.materialSettings, ...updatedServiceConfig.baseSettings?.materialSettings },
              businessSettings: { ...config.baseSettings?.businessSettings, ...updatedServiceConfig.baseSettings?.businessSettings }
            },
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