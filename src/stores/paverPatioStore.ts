import { useState, useCallback, useEffect } from 'react';
import type {
  PaverPatioConfig,
  PaverPatioValues,
  PaverPatioCalculationResult,
  PaverPatioStore,
  PaverPatioVariable
} from '../types/paverPatioFormula';

// Import the JSON configuration
import paverPatioConfigJson from '../config/paver-patio-formula.json';

// Default values based on the configuration - Expert system compatible with comprehensive null guards
const getDefaultValues = (config: PaverPatioConfig): PaverPatioValues => {
  // Complete fallback structure if config is missing or incomplete
  if (!config || !config.variables) {
    return {
      excavation: { tearoutComplexity: 'grass', equipmentRequired: 'handTools' },
      siteAccess: { accessDifficulty: 'moderate', obstacleRemoval: 'minor' },
      materials: { paverStyle: 'economy', cuttingComplexity: 'moderate', patternComplexity: 'minimal' },
      labor: { teamSize: 'twoPerson' },
      complexity: { overallComplexity: 1.0 }
    };
  }

  return {
    excavation: {
      tearoutComplexity: (config.variables.excavation?.tearoutComplexity as PaverPatioVariable)?.default as string ?? 'grass',
      equipmentRequired: (config.variables.excavation?.equipmentRequired as PaverPatioVariable)?.default as string ?? 'handTools',
    },
    siteAccess: {
      accessDifficulty: (config.variables.siteAccess?.accessDifficulty as PaverPatioVariable)?.default as string ?? 'moderate',
      obstacleRemoval: (config.variables.siteAccess?.obstacleRemoval as PaverPatioVariable)?.default as string ?? 'minor',
    },
    materials: {
      paverStyle: (config.variables.materials?.paverStyle as PaverPatioVariable)?.default as string ?? 'economy',
      cuttingComplexity: (config.variables.materials?.cuttingComplexity as PaverPatioVariable)?.default as string ?? 'moderate',
      patternComplexity: (config.variables.materials?.patternComplexity as PaverPatioVariable)?.default as string ?? 'minimal',
    },
    labor: {
      teamSize: (config.variables.labor?.teamSize as PaverPatioVariable)?.default as string ?? 'twoPerson',
    },
    complexity: {
      overallComplexity: (config.variables.complexity?.overallComplexity as PaverPatioVariable)?.default as number ?? 1.0,
    },
  };
};

// Load values from localStorage - Expert system compatible
const loadStoredValues = (config: PaverPatioConfig): PaverPatioValues => {
  try {
    const stored = localStorage.getItem('paverPatioValues');
    if (stored) {
      const parsedValues = JSON.parse(stored);
      const defaults = getDefaultValues(config);

      // Validate structure and merge carefully
      const validatedValues = {
        excavation: {
          tearoutComplexity: parsedValues.excavation?.tearoutComplexity || defaults.excavation.tearoutComplexity,
          equipmentRequired: parsedValues.excavation?.equipmentRequired || defaults.excavation.equipmentRequired,
        },
        siteAccess: {
          accessDifficulty: parsedValues.siteAccess?.accessDifficulty || defaults.siteAccess.accessDifficulty,
          obstacleRemoval: parsedValues.siteAccess?.obstacleRemoval || defaults.siteAccess.obstacleRemoval,
        },
        materials: {
          paverStyle: parsedValues.materials?.paverStyle || defaults.materials.paverStyle,
          cuttingComplexity: parsedValues.materials?.cuttingComplexity || defaults.materials.cuttingComplexity,
          patternComplexity: parsedValues.materials?.patternComplexity || defaults.materials.patternComplexity,
        },
        labor: {
          teamSize: parsedValues.labor?.teamSize || defaults.labor.teamSize,
        },
        complexity: {
          overallComplexity: parsedValues.complexity?.overallComplexity || defaults.complexity.overallComplexity,
        },
      };

      return validatedValues;
    }
  } catch (error) {
    console.warn('Failed to load stored paver patio values:', error);
    throw error; // Let the caller handle it
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
  // Get base settings with comprehensive null guards and defaults
  const hourlyRate = config?.baseSettings?.laborSettings?.hourlyLaborRate?.value ?? 25;
  const optimalTeamSize = config?.baseSettings?.laborSettings?.optimalTeamSize?.value ?? 3;
  const baseProductivity = config?.baseSettings?.laborSettings?.baseProductivity?.value ?? 100;
  const baseMaterialCost = config?.baseSettings?.materialSettings?.baseMaterialCost?.value ?? 5.84;
  const profitMargin = config?.baseSettings?.businessSettings?.profitMarginTarget?.value ?? 0.15;

  // TIER 1: Man Hours Calculation
  const baseHours = (sqft / baseProductivity) * optimalTeamSize * 8;
  let adjustedHours = baseHours;
  const breakdownSteps: string[] = [`Base Hours: ${baseHours.toFixed(1)}`];

  // Apply Tier 1 variables with comprehensive null guards and fallbacks
  const tearoutVar = config?.variables?.excavation?.tearoutComplexity as PaverPatioVariable;
  const tearoutOption = tearoutVar?.options?.[values?.excavation?.tearoutComplexity ?? 'grass'];
  if (tearoutOption?.value) {
    const tearoutHours = adjustedHours * (tearoutOption.value / 100);
    adjustedHours += tearoutHours;
    breakdownSteps.push(`+Tearout (${tearoutOption.value}%): +${tearoutHours.toFixed(1)} hours`);
  }

  const accessVar = config?.variables?.siteAccess?.accessDifficulty as PaverPatioVariable;
  const accessOption = accessVar?.options?.[values?.siteAccess?.accessDifficulty ?? 'moderate'];
  if (accessOption?.value) {
    const accessHours = adjustedHours * (accessOption.value / 100);
    adjustedHours += accessHours;
    breakdownSteps.push(`+Access (${accessOption.value}%): +${accessHours.toFixed(1)} hours`);
  }

  const teamVar = config?.variables?.labor?.teamSize as PaverPatioVariable;
  const teamOption = teamVar?.options?.[values?.labor?.teamSize ?? 'twoPerson'];
  if (teamOption?.value) {
    const teamHours = adjustedHours * (teamOption.value / 100);
    adjustedHours += teamHours;
    breakdownSteps.push(`+Team Size (${teamOption.value}%): +${teamHours.toFixed(1)} hours`);
  }

  // Add fixed cutting hours with null guard
  const cuttingVar = config?.variables?.materials?.cuttingComplexity as PaverPatioVariable;
  const cuttingOption = cuttingVar?.options?.[values?.materials?.cuttingComplexity ?? 'moderate'];
  if (cuttingOption?.fixedLaborHours) {
    adjustedHours += cuttingOption.fixedLaborHours;
    breakdownSteps.push(`+Cutting: +${cuttingOption.fixedLaborHours} hours`);
  }

  const totalManHours = adjustedHours;

  // TIER 2: Cost Calculation
  const laborCost = totalManHours * hourlyRate;

  // Material costs with comprehensive null guards and fallbacks
  const paverVar = config?.variables?.materials?.paverStyle as PaverPatioVariable;
  const paverOption = paverVar?.options?.[values?.materials?.paverStyle ?? 'economy'];
  const styleMultiplier = paverOption?.multiplier ?? 1.0;
  const materialCostBase = sqft * baseMaterialCost * styleMultiplier;

  // Material waste calculations with null guards
  const cuttingWaste = (cuttingOption?.materialWaste ?? 0) / 100;
  const patternVar = config?.variables?.materials?.patternComplexity as PaverPatioVariable;
  const patternOption = patternVar?.options?.[values?.materials?.patternComplexity ?? 'minimal'];
  const patternWaste = (patternOption?.wastePercentage ?? 0) / 100;
  const materialWasteCost = materialCostBase * (cuttingWaste + patternWaste);
  const totalMaterialCost = materialCostBase + materialWasteCost;

  // Equipment cost (daily rate * project days) with null guards
  const equipmentVar = config?.variables?.excavation?.equipmentRequired as PaverPatioVariable;
  const equipmentOption = equipmentVar?.options?.[values?.excavation?.equipmentRequired ?? 'handTools'];
  const projectDays = totalManHours / (optimalTeamSize * 8);
  const equipmentCost = (equipmentOption?.value ?? 0) * projectDays;

  // Obstacle flat costs with null guards
  const obstacleVar = config?.variables?.siteAccess?.obstacleRemoval as PaverPatioVariable;
  const obstacleOption = obstacleVar?.options?.[values?.siteAccess?.obstacleRemoval ?? 'minor'];
  const obstacleCost = obstacleOption?.value ?? 0;

  // Calculate subtotal and apply complexity multiplier
  const subtotal = laborCost + totalMaterialCost + equipmentCost + obstacleCost;
  const profit = subtotal * profitMargin;
  const beforeComplexity = subtotal + profit;
  const complexityMultiplier = values?.complexity?.overallComplexity || 1.0;
  const total = beforeComplexity * complexityMultiplier;

  return {
    tier1Results: {
      baseHours: baseHours ?? 0,
      adjustedHours: adjustedHours ?? 0,
      totalManHours: totalManHours ?? 0,
      breakdown: breakdownSteps
    },
    tier2Results: {
      laborCost: laborCost ?? 0,
      materialCostBase: materialCostBase ?? 0,
      materialWasteCost: materialWasteCost ?? 0,
      totalMaterialCost: totalMaterialCost ?? 0,
      equipmentCost: equipmentCost ?? 0,
      obstacleCost: obstacleCost ?? 0,
      subtotal: subtotal ?? 0,
      profit: profit ?? 0,
      total: total ?? 0,
      pricePerSqft: (total ?? 0) / sqft
    },
    breakdown: `Labor: $${(laborCost ?? 0).toFixed(2)} | Materials: $${(totalMaterialCost ?? 0).toFixed(2)} | Equipment: $${(equipmentCost ?? 0).toFixed(2)} | Total: $${(total ?? 0).toFixed(2)}`
  };
};

// Calculate price based on current values - Uses expert two-tier system
const calculatePrice = (
  config: PaverPatioConfig,
  values: PaverPatioValues,
  sqft: number = 100
): PaverPatioCalculationResult => {
  // Comprehensive null guard for config
  if (!config || !config.baseSettings) {
    console.warn('Config or baseSettings missing, using safe defaults');
    return {
      tier1Results: {
        baseHours: 0,
        adjustedHours: 0,
        totalManHours: 0,
        breakdown: ['Error: Configuration missing']
      },
      tier2Results: {
        laborCost: 0,
        materialCostBase: 0,
        materialWasteCost: 0,
        totalMaterialCost: 0,
        equipmentCost: 0,
        obstacleCost: 0,
        subtotal: 0,
        profit: 0,
        total: 0,
        pricePerSqft: 0
      },
      breakdown: 'Configuration error - unable to calculate'
    };
  }

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

  // Convert legacy result to new format with null-safe calculations
  const baseHours = sqft / 100 * 24;
  const adjustedHours = sqft / 100 * 24 * 1.5;
  const laborCost = multipliedPrice * sqft * 0.6;
  const materialCostBase = multipliedPrice * sqft * 0.4;
  const profit = subtotal * 0.15;

  return {
    tier1Results: {
      baseHours: baseHours ?? 0,
      adjustedHours: adjustedHours ?? 0,
      totalManHours: adjustedHours ?? 0,
      breakdown: ['Legacy calculation - hours estimated']
    },
    tier2Results: {
      laborCost: laborCost ?? 0,
      materialCostBase: materialCostBase ?? 0,
      materialWasteCost: 0,
      totalMaterialCost: materialCostBase ?? 0,
      equipmentCost: equipment ?? 0,
      obstacleCost: obstacles ?? 0,
      subtotal: subtotal ?? 0,
      profit: profit ?? 0,
      total: total ?? 0,
      pricePerSqft: (total ?? 0) / sqft
    },
    breakdown: `Legacy calculation: $${(total ?? 0).toFixed(2)} total`
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
      
      // Load or initialize values - clear old format if incompatible
      let initialValues: PaverPatioValues;
      try {
        initialValues = loadStoredValues(configData);
        // Validate that the values match the new structure
        if (!initialValues.excavation?.tearoutComplexity || !initialValues.materials?.patternComplexity) {
          console.log('🔄 Clearing incompatible stored values, using defaults');
          localStorage.removeItem('paverPatioValues');
          initialValues = getDefaultValues(configData);
        }
      } catch (error) {
        console.warn('Error loading stored values, using defaults:', error);
        localStorage.removeItem('paverPatioValues');
        initialValues = getDefaultValues(configData);
      }
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