import { useState, useCallback, useEffect } from 'react';
import type {
  PaverPatioConfig,
  PaverPatioValues,
  PaverPatioCalculationResult,
  PaverPatioStore,
  PaverPatioVariable
} from '../master-formula/formula-types';

// Import the JSON configuration
import paverPatioConfigJson from '../../config/paver-patio-formula.json';
// Import Services database for baseline values
import { getPaverPatioServiceDefaults } from '../services-database/service-database';

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

// Get true baseline values (results in exactly 24 hours for 100 sqft)
// Now reads from Services database for admin-configurable defaults
const getTrueBaselineValues = (): PaverPatioValues => {
  const serviceDefaults = getPaverPatioServiceDefaults();

  if (serviceDefaults) {
    // Use Services database values as single source of truth
    return serviceDefaults;
  }

  // Fallback to hardcoded values if Services database unavailable
  console.warn('⚠️ Services database unavailable, using hardcoded fallback baseline values');
  return {
    excavation: { tearoutComplexity: 'grass', equipmentRequired: 'handTools' },
    siteAccess: { accessDifficulty: 'easy', obstacleRemoval: 'none' },
    materials: { paverStyle: 'economy', cuttingComplexity: 'minimal', patternComplexity: 'minimal' },
    labor: { teamSize: 'threePlus' },
    complexity: { overallComplexity: 1.0 }
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
  // 🔍 [QUICK CALCULATOR DEBUG] Function start
  console.log('🔍 [QUICK CALCULATOR DEBUG] calculateExpertPricing() START:', {
    sqft: sqft,
    inputValues: values,
    configPresent: !!config,
    timestamp: new Date().toISOString()
  });

  // Get base settings with comprehensive null guards and defaults
  const hourlyRate = config?.baseSettings?.laborSettings?.hourlyLaborRate?.value ?? 25;
  const optimalTeamSize = config?.baseSettings?.laborSettings?.optimalTeamSize?.value ?? 3;
  const baseProductivity = config?.baseSettings?.laborSettings?.baseProductivity?.value ?? 100;
  const baseMaterialCost = config?.baseSettings?.materialSettings?.baseMaterialCost?.value ?? 5.84;
  const profitMargin = config?.baseSettings?.businessSettings?.profitMarginTarget?.value ?? 0.15;

  // 🔍 [QUICK CALCULATOR DEBUG] Actual config values from paver-patio-formula.json
  console.log('🔍 [QUICK CALCULATOR DEBUG] Actual Config Values from JSON:', {
    hourlyRate: hourlyRate,
    optimalTeamSize: optimalTeamSize,
    baseProductivity: baseProductivity,
    baseMaterialCost: baseMaterialCost,
    profitMargin: profitMargin,
    configSource: 'paver-patio-formula.json + Services database overrides'
  });

  // 🔍 [QUICK CALCULATOR DEBUG] Actual variable values being used
  console.log('🔍 [QUICK CALCULATOR DEBUG] Actual Variable Values from Services Database:', {
    tearoutComplexity: values?.excavation?.tearoutComplexity,
    equipmentRequired: values?.excavation?.equipmentRequired,
    accessDifficulty: values?.siteAccess?.accessDifficulty,
    obstacleRemoval: values?.siteAccess?.obstacleRemoval,
    paverStyle: values?.materials?.paverStyle,
    cuttingComplexity: values?.materials?.cuttingComplexity,
    patternComplexity: values?.materials?.patternComplexity,
    teamSize: values?.labor?.teamSize,
    overallComplexity: values?.complexity?.overallComplexity
  });

  // TIER 1: Man Hours Calculation - Base-Independent Variable System
  // Formula: (sqft ÷ daily_productivity) × team_size × 8_hours_per_day
  // Baseline: 100 sqft ÷ 100 sqft/day × 3 people × 8 hours = 24 base hours
  const baseHours = (sqft / baseProductivity) * optimalTeamSize * 8;
  let adjustedHours = baseHours;
  const breakdownSteps: string[] = [`Base: ${sqft} sqft ÷ ${baseProductivity} sqft/day × ${optimalTeamSize} people × 8 hours = ${baseHours.toFixed(1)} hours`];

  // 🔍 [QUICK CALCULATOR DEBUG] Tier 1 base calculation
  console.log('🔍 [QUICK CALCULATOR DEBUG] Tier 1 Base Hours Calculation:', {
    formula: `(${sqft} sqft ÷ ${baseProductivity} sqft/day) × ${optimalTeamSize} people × 8 hours`,
    calculation: `(${sqft} ÷ ${baseProductivity}) × ${optimalTeamSize} × 8`,
    result: baseHours.toFixed(1) + ' hours'
  });

  // Apply base-independent variable system - each percentage applies to ORIGINAL base hours
  // This keeps each variable's effect independent and predictable

  const tearoutVar = config?.variables?.excavation?.tearoutComplexity as PaverPatioVariable;
  const tearoutOption = tearoutVar?.options?.[values?.excavation?.tearoutComplexity ?? 'grass'];

  // 🔍 [QUICK CALCULATOR DEBUG] Tearout multiplier from JSON
  console.log('🔍 [QUICK CALCULATOR DEBUG] Tearout Complexity Multiplier:', {
    selectedValue: values?.excavation?.tearoutComplexity,
    multiplierValue: tearoutOption?.value,
    allTearoutOptions: tearoutVar?.options,
    isApplied: !!(tearoutOption?.value && tearoutOption.value > 0)
  });

  if (tearoutOption?.value && tearoutOption.value > 0) {
    const tearoutHours = baseHours * (tearoutOption.value / 100);
    adjustedHours += tearoutHours;
    breakdownSteps.push(`+Tearout complexity (+${tearoutOption.value}% of base): +${tearoutHours.toFixed(1)} hours`);
  }

  const accessVar = config?.variables?.siteAccess?.accessDifficulty as PaverPatioVariable;
  const accessOption = accessVar?.options?.[values?.siteAccess?.accessDifficulty ?? 'moderate'];

  // 🔍 [QUICK CALCULATOR DEBUG] Access multiplier from JSON
  console.log('🔍 [QUICK CALCULATOR DEBUG] Access Difficulty Multiplier:', {
    selectedValue: values?.siteAccess?.accessDifficulty,
    multiplierValue: accessOption?.value,
    allAccessOptions: accessVar?.options,
    isApplied: !!(accessOption?.value && accessOption.value > 0)
  });

  if (accessOption?.value && accessOption.value > 0) {
    const accessHours = baseHours * (accessOption.value / 100);
    adjustedHours += accessHours;
    breakdownSteps.push(`+Access difficulty (+${accessOption.value}% of base): +${accessHours.toFixed(1)} hours`);
  }

  const teamVar = config?.variables?.labor?.teamSize as PaverPatioVariable;
  const teamOption = teamVar?.options?.[values?.labor?.teamSize ?? 'optimal'];

  // 🔍 [QUICK CALCULATOR DEBUG] Team size multiplier from JSON
  console.log('🔍 [QUICK CALCULATOR DEBUG] Team Size Multiplier:', {
    selectedValue: values?.labor?.teamSize,
    multiplierValue: teamOption?.value,
    allTeamOptions: teamVar?.options,
    isApplied: !!(teamOption?.value && teamOption.value > 0)
  });

  if (teamOption?.value && teamOption.value > 0) {
    const teamHours = baseHours * (teamOption.value / 100);
    adjustedHours += teamHours;
    breakdownSteps.push(`+Team size adjustment (+${teamOption.value}% of base): +${teamHours.toFixed(1)} hours`);
  }

  // Add fixed cutting hours (Tom's spec: fixed hours, not percentages)
  const cuttingVar = config?.variables?.materials?.cuttingComplexity as PaverPatioVariable;
  const cuttingOption = cuttingVar?.options?.[values?.materials?.cuttingComplexity ?? 'minimal'];

  // 🔍 [QUICK CALCULATOR DEBUG] Cutting complexity from JSON
  console.log('🔍 [QUICK CALCULATOR DEBUG] Cutting Complexity Fixed Hours:', {
    selectedValue: values?.materials?.cuttingComplexity,
    fixedLaborHours: cuttingOption?.fixedLaborHours,
    allCuttingOptions: cuttingVar?.options,
    isApplied: !!(cuttingOption?.fixedLaborHours && cuttingOption.fixedLaborHours > 0)
  });

  if (cuttingOption?.fixedLaborHours && cuttingOption.fixedLaborHours > 0) {
    adjustedHours += cuttingOption.fixedLaborHours;
    breakdownSteps.push(`+Cutting complexity: +${cuttingOption.fixedLaborHours} fixed hours`);
  }

  // Add final total to breakdown
  breakdownSteps.push(`Total Man Hours: ${adjustedHours.toFixed(1)} hours`);

  const totalManHours = adjustedHours;

  // 🔍 [QUICK CALCULATOR DEBUG] Tier 1 final results
  console.log('🔍 [QUICK CALCULATOR DEBUG] Tier 1 Final Results:', {
    baseHours: baseHours.toFixed(1),
    totalAdjustedHours: adjustedHours.toFixed(1),
    breakdown: breakdownSteps
  });

  // TIER 2: Cost Calculation
  const laborCost = totalManHours * hourlyRate;

  // 🔍 [QUICK CALCULATOR DEBUG] Labor cost calculation
  console.log('🔍 [QUICK CALCULATOR DEBUG] Tier 2 Labor Cost:', {
    totalManHours: totalManHours.toFixed(1),
    hourlyRate: hourlyRate,
    laborCost: laborCost.toFixed(2),
    calculation: `${totalManHours.toFixed(1)} hours × $${hourlyRate}/hour = $${laborCost.toFixed(2)}`
  });

  // Material costs with comprehensive null guards and fallbacks
  const paverVar = config?.variables?.materials?.paverStyle as PaverPatioVariable;
  const paverOption = paverVar?.options?.[values?.materials?.paverStyle ?? 'economy'];
  const styleMultiplier = paverOption?.multiplier ?? 1.0;
  const materialCostBase = sqft * baseMaterialCost * styleMultiplier;

  // 🔍 [QUICK CALCULATOR DEBUG] Material cost calculation
  console.log('🔍 [QUICK CALCULATOR DEBUG] Tier 2 Material Cost Base:', {
    sqft: sqft,
    baseMaterialCost: baseMaterialCost,
    paverStyle: values?.materials?.paverStyle,
    styleMultiplier: styleMultiplier,
    materialCostBase: materialCostBase.toFixed(2),
    calculation: `${sqft} sqft × $${baseMaterialCost}/sqft × ${styleMultiplier} = $${materialCostBase.toFixed(2)}`
  });

  // Material waste calculations with null guards
  const cuttingWaste = (cuttingOption?.materialWaste ?? 0) / 100;
  const patternVar = config?.variables?.materials?.patternComplexity as PaverPatioVariable;
  const patternOption = patternVar?.options?.[values?.materials?.patternComplexity ?? 'minimal'];
  const patternWaste = (patternOption?.wastePercentage ?? 0) / 100;
  const materialWasteCost = materialCostBase * (cuttingWaste + patternWaste);
  const totalMaterialCost = materialCostBase + materialWasteCost;

  // 🔍 [QUICK CALCULATOR DEBUG] Material waste calculation
  console.log('🔍 [QUICK CALCULATOR DEBUG] Tier 2 Material Waste:', {
    cuttingComplexity: values?.materials?.cuttingComplexity,
    cuttingWastePercent: cuttingOption?.materialWaste ?? 0,
    patternComplexity: values?.materials?.patternComplexity,
    patternWastePercent: patternOption?.wastePercentage ?? 0,
    totalWastePercent: ((cuttingWaste + patternWaste) * 100).toFixed(1) + '%',
    materialWasteCost: materialWasteCost.toFixed(2),
    totalMaterialCost: totalMaterialCost.toFixed(2)
  });

  // Equipment cost (daily rate * project days) with null guards
  const equipmentVar = config?.variables?.excavation?.equipmentRequired as PaverPatioVariable;
  const equipmentOption = equipmentVar?.options?.[values?.excavation?.equipmentRequired ?? 'handTools'];
  const projectDays = totalManHours / (optimalTeamSize * 8);
  const equipmentCost = (equipmentOption?.value ?? 0) * projectDays;

  // 🔍 [QUICK CALCULATOR DEBUG] Equipment cost calculation
  console.log('🔍 [QUICK CALCULATOR DEBUG] Tier 2 Equipment Cost:', {
    equipmentRequired: values?.excavation?.equipmentRequired,
    dailyRate: equipmentOption?.value ?? 0,
    projectDays: projectDays.toFixed(2),
    equipmentCost: equipmentCost.toFixed(2),
    calculation: `$${equipmentOption?.value ?? 0}/day × ${projectDays.toFixed(2)} days = $${equipmentCost.toFixed(2)}`
  });

  // Obstacle flat costs with null guards
  const obstacleVar = config?.variables?.siteAccess?.obstacleRemoval as PaverPatioVariable;
  const obstacleOption = obstacleVar?.options?.[values?.siteAccess?.obstacleRemoval ?? 'minor'];
  const obstacleCost = obstacleOption?.value ?? 0;

  // 🔍 [QUICK CALCULATOR DEBUG] Obstacle cost
  console.log('🔍 [QUICK CALCULATOR DEBUG] Tier 2 Obstacle Cost:', {
    obstacleRemoval: values?.siteAccess?.obstacleRemoval,
    obstacleCost: obstacleCost,
    allObstacleOptions: obstacleVar?.options
  });

  // Calculate subtotal and apply complexity multiplier
  const subtotal = laborCost + totalMaterialCost + equipmentCost + obstacleCost;
  const profit = subtotal * profitMargin;
  const beforeComplexity = subtotal + profit;
  const complexityMultiplier = values?.complexity?.overallComplexity || 1.0;
  const total = beforeComplexity * complexityMultiplier;

  // 🔍 [QUICK CALCULATOR DEBUG] Final calculation with comparison to expected $2,716.80
  console.log('🔍 [QUICK CALCULATOR DEBUG] Tier 2 Final Calculation vs Expected:', {
    laborCost: laborCost.toFixed(2),
    totalMaterialCost: totalMaterialCost.toFixed(2),
    equipmentCost: equipmentCost.toFixed(2),
    obstacleCost: obstacleCost.toFixed(2),
    subtotal: subtotal.toFixed(2),
    profitMargin: (profitMargin * 100).toFixed(1) + '%',
    profit: profit.toFixed(2),
    beforeComplexity: beforeComplexity.toFixed(2),
    complexityMultiplier: complexityMultiplier,
    finalTotal: total.toFixed(2),
    expectedResult: 2716.80,
    difference: (total - 2716.80).toFixed(2),
    percentDifference: (((total - 2716.80) / 2716.80) * 100).toFixed(2) + '%'
  });

  // Calculate total days (8-hour workdays) at the end of Tier 1
  const totalDays = Math.round(((totalManHours ?? 0) / 8) * 10) / 10;

  return {
    tier1Results: {
      baseHours: baseHours ?? 0,
      adjustedHours: adjustedHours ?? 0,
      totalManHours: totalManHours ?? 0,
      totalDays: totalDays,
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
        totalDays: 0,
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
  console.warn('⚠️ Using LEGACY calculation system - consider updating to expert structure');

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

  // Calculate total days (8-hour workdays) for legacy calculation
  const totalDaysLegacy = Math.round(((adjustedHours ?? 0) / 8) * 10) / 10;

  return {
    tier1Results: {
      baseHours: baseHours ?? 0,
      adjustedHours: adjustedHours ?? 0,
      totalManHours: adjustedHours ?? 0,
      totalDays: totalDaysLegacy,
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
      
      // Check for base settings AND variables overrides from Services tab
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
            // Also apply variables overrides (equipment costs, cutting complexity, etc.)
            variables: {
              ...configData.variables,
              ...(override.variables || {})
            },
            lastModified: override.lastModified || configData.lastModified
          };
          console.log('🔧 Applied service config overrides:', {
            baseSettings: !!override.baseSettings,
            variables: !!override.variables,
            lastModified: override.lastModified
          });
        } catch (error) {
          console.warn('Failed to apply service config override:', error);
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

  // Reset to defaults and set square footage to 100 (for Quick Calculator)
  const resetToDefaults100 = useCallback(() => {
    if (!config) return;

    // Use true baseline values that result in exactly 24 hours for 100 sqft
    const baselineValues = getTrueBaselineValues();
    setValues(baselineValues);
    saveStoredValues(baselineValues);

    // Calculate with exactly 100 sqft using baseline values
    const calculation = calculatePrice(config, baselineValues, 100);
    setLastCalculation(calculation);

    console.log('🔄 Quick Calculator reset to true baseline:', {
      teamSize: baselineValues.labor.teamSize,
      accessDifficulty: baselineValues.siteAccess.accessDifficulty,
      obstacleRemoval: baselineValues.siteAccess.obstacleRemoval,
      cuttingComplexity: baselineValues.materials.cuttingComplexity,
      expectedHours: '24.0 hours for 100 sqft'
    });
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

  // Listen for service configuration changes from Services tab (base settings AND variables)
  useEffect(() => {
    const handleServiceConfigChange = (e: StorageEvent) => {
      if (e.key === 'service_config_paver_patio_sqft' && e.newValue && config) {
        try {
          const updatedServiceConfig = JSON.parse(e.newValue);

          // Update the config with new base settings AND variables
          const updatedConfig = {
            ...config,
            baseSettings: {
              laborSettings: { ...config.baseSettings?.laborSettings, ...updatedServiceConfig.baseSettings?.laborSettings },
              materialSettings: { ...config.baseSettings?.materialSettings, ...updatedServiceConfig.baseSettings?.materialSettings },
              businessSettings: { ...config.baseSettings?.businessSettings, ...updatedServiceConfig.baseSettings?.businessSettings }
            },
            // Also update variables (equipment costs, cutting complexity, etc.)
            variables: {
              ...config.variables,
              ...(updatedServiceConfig.variables || {})
            },
            lastModified: updatedServiceConfig.lastModified || config.lastModified
          };

          setConfig(updatedConfig);

          console.log('🔄 Paver patio store updated from service config changes:', {
            baseSettings: !!updatedServiceConfig.baseSettings,
            variables: !!updatedServiceConfig.variables,
            equipmentCosts: updatedServiceConfig.variables?.excavation?.equipmentRequired?.options
          });
          
          // Recalculate price with new base settings
          const calculation = calculatePrice(updatedConfig, values);
          setLastCalculation(calculation);
          
          console.log('🔄 Base settings updated from Services tab, Quick Calculator refreshed');
        } catch (error) {
          console.error('Error applying base settings update:', error);
        }
      }
    };

    window.addEventListener('storage', handleServiceConfigChange);
    return () => window.removeEventListener('storage', handleServiceConfigChange);
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
    resetToDefaults100,
    resetCategory,
    calculatePrice: calculatePriceForSqft,
    saveConfig,
    createBackup,
  };
};

// Server-side exports for AI system integration
export { calculateExpertPricing };

/**
 * Load paver patio configuration for server-side use (without React hooks)
 */
export const loadPaverPatioConfig = (): PaverPatioConfig => {
  try {
    // Import the JSON configuration directly
    return paverPatioConfigJson as PaverPatioConfig;
  } catch (error) {
    console.error('Failed to load paver patio config for server-side use:', error);
    throw new Error('Paver patio configuration not available');
  }
};