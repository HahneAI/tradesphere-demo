import { useState, useCallback, useEffect } from 'react';
import type {
  PaverPatioConfig,
  PaverPatioValues,
  PaverPatioCalculationResult,
  PaverPatioStore,
  PaverPatioVariable
} from '../master-formula/formula-types';

// Import master pricing engine for unified calculations
import { masterPricingEngine } from '../calculations/master-pricing-engine';

// Import the JSON configuration (fallback only)
import paverPatioConfigJson from '../../config/paver-patio-formula.json';
// Import Services database for baseline values
import { getPaverPatioServiceDefaults } from '../services-database/service-database';

// Default values based on the configuration - Expert system compatible with comprehensive null guards
const getDefaultValues = (config: PaverPatioConfig): PaverPatioValues => {
  // Complete fallback structure if config is missing or incomplete
  if (!config || !config.variables) {
    return {
      excavation: { tearoutComplexity: 'grass', equipmentRequired: 'handTools' },
      siteAccess: { accessDifficulty: 'easy', obstacleRemoval: 'none' },
      materials: { paverStyle: 'standard', cuttingComplexity: 'minimal' },
      labor: { teamSize: 'threePlus' },
      complexity: { overallComplexity: 'simple' }
    };
  }

  return {
    excavation: {
      tearoutComplexity: (config.variables.excavation?.tearoutComplexity as PaverPatioVariable)?.default as string ?? 'grass',
      equipmentRequired: (config.variables.excavation?.equipmentRequired as PaverPatioVariable)?.default as string ?? 'handTools',
    },
    siteAccess: {
      accessDifficulty: (config.variables.siteAccess?.accessDifficulty as PaverPatioVariable)?.default as string ?? 'easy',
      obstacleRemoval: (config.variables.siteAccess?.obstacleRemoval as PaverPatioVariable)?.default as string ?? 'none',
    },
    materials: {
      paverStyle: (config.variables.materials?.paverStyle as PaverPatioVariable)?.default as string ?? 'standard',
      cuttingComplexity: (config.variables.materials?.cuttingComplexity as PaverPatioVariable)?.default as string ?? 'minimal',
    },
    labor: {
      teamSize: (config.variables.labor?.teamSize as PaverPatioVariable)?.default as string ?? 'threePlus',
    },
    complexity: {
      overallComplexity: (config.variables.complexity?.overallComplexity as PaverPatioVariable)?.default as string ?? 'simple',
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
    materials: { paverStyle: 'standard', cuttingComplexity: 'minimal' },
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
  const baseProductivity = config?.baseSettings?.laborSettings?.baseProductivity?.value ?? 50;
  const baseMaterialCost = config?.baseSettings?.materialSettings?.baseMaterialCost?.value ?? 5.84;
  const profitMargin = config?.baseSettings?.businessSettings?.profitMarginTarget?.value ?? 0.20;

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

  // Add cutting complexity labor percentage (calculated from BASE hours)
  const cuttingVar = config?.variables?.materials?.cuttingComplexity as PaverPatioVariable;
  const cuttingOption = cuttingVar?.options?.[values?.materials?.cuttingComplexity ?? 'minimal'];
  const cuttingLaborPercentage = cuttingOption?.laborPercentage ?? 0;

  // 🔍 [QUICK CALCULATOR DEBUG] Cutting complexity from JSON
  console.log('🔍 [QUICK CALCULATOR DEBUG] Cutting Complexity Labor Percentage:', {
    selectedValue: values?.materials?.cuttingComplexity,
    laborPercentage: cuttingLaborPercentage,
    allCuttingOptions: cuttingVar?.options,
    isApplied: cuttingLaborPercentage > 0
  });

  if (cuttingLaborPercentage > 0) {
    const cuttingHours = baseHours * (cuttingLaborPercentage / 100);
    adjustedHours += cuttingHours;
    breakdownSteps.push(`+Cutting complexity (+${cuttingLaborPercentage}% of base): +${cuttingHours.toFixed(1)} hours`);
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
  const paverOption = paverVar?.options?.[values?.materials?.paverStyle ?? 'standard'];
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

  // Material waste calculations - ONLY use cutting complexity (pattern complexity removed)
  const cuttingWaste = (cuttingOption?.materialWaste ?? 0) / 100;
  const materialWasteCost = materialCostBase * cuttingWaste;
  const totalMaterialCost = materialCostBase + materialWasteCost;

  // 🔍 [QUICK CALCULATOR DEBUG] Material waste calculation
  console.log('🔍 [QUICK CALCULATOR DEBUG] Tier 2 Material Waste:', {
    cuttingComplexity: values?.materials?.cuttingComplexity,
    cuttingWastePercent: cuttingOption?.materialWaste ?? 0,
    totalWastePercent: (cuttingWaste * 100).toFixed(1) + '%',
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

  // Calculate subtotal
  const subtotal = laborCost + totalMaterialCost + equipmentCost + obstacleCost;

  // Convert string complexity to numeric multiplier
  const complexityValue = values?.complexity?.overallComplexity;
  const getComplexityMultiplier = (complexity: string | number): number => {
    if (typeof complexity === 'number') return complexity; // Legacy support
    switch (complexity) {
      case 'simple': return 1.0;
      case 'standard': return 1.1;
      case 'complex': return 1.3;
      case 'extreme': return 1.5;
      default: return 1.0;
    }
  };

  // Apply complexity multiplier to subtotal FIRST (per master-formula.md)
  const complexityMultiplier = getComplexityMultiplier(complexityValue || 'simple');
  const adjustedTotal = subtotal * complexityMultiplier;

  // Calculate profit on adjusted total (after complexity)
  const profit = adjustedTotal * profitMargin;

  // Final total
  const total = adjustedTotal + profit;

  // 🔍 [QUICK CALCULATOR DEBUG] Final calculation results
  console.log('🔍 [QUICK CALCULATOR DEBUG] Tier 2 Final Calculation Results:', {
    laborCost: laborCost.toFixed(2),
    totalMaterialCost: totalMaterialCost.toFixed(2),
    equipmentCost: equipmentCost.toFixed(2),
    obstacleCost: obstacleCost.toFixed(2),
    subtotal: subtotal.toFixed(2),
    complexityValue: complexityValue,
    complexityType: typeof complexityValue,
    complexityMultiplier: complexityMultiplier,
    adjustedTotal: adjustedTotal.toFixed(2),
    profitMargin: (profitMargin * 100).toFixed(1) + '%',
    profit: profit.toFixed(2),
    finalTotal: total.toFixed(2),
    pricePerSqft: (total / sqft).toFixed(2)
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

// Calculate price using master pricing engine - Single source of truth
const calculatePrice = async (
  config: PaverPatioConfig | null,
  values: PaverPatioValues,
  sqft: number = 100,
  companyId?: string
): Promise<PaverPatioCalculationResult> => {
  console.log('🚀 [QUICK CALCULATOR] Using Master Pricing Engine for calculation');

  try {
    // Use master pricing engine for live Supabase calculation with company_id
    const result = await masterPricingEngine.calculatePricing(values, sqft, 'paver_patio_sqft', companyId);

    console.log('✅ [QUICK CALCULATOR] Master engine calculation complete:', {
      total: result.tier2Results.total,
      source: 'Master Pricing Engine + Live Supabase',
      usedCompanyId: !!companyId
    });

    return result;
  } catch (error) {
    console.error('❌ [QUICK CALCULATOR] Master engine calculation failed:', error);

    // Fallback to legacy calculation if master engine fails
    console.warn('🔄 [QUICK CALCULATOR] Falling back to legacy local calculation');
    return calculateLegacyFallback(config, values, sqft);
  }
};

// Legacy fallback for Quick Calculator (when Supabase unavailable)
const calculateLegacyFallback = (
  config: PaverPatioConfig | null,
  values: PaverPatioValues,
  sqft: number = 100
): PaverPatioCalculationResult => {
  console.warn('🔄 [FALLBACK] Quick Calculator using legacy JSON-based calculation');

  // Use config from props or fallback to imported JSON
  const actualConfig = config || (paverPatioConfigJson as PaverPatioConfig);

  if (!actualConfig) {
    console.error('❌ [CRITICAL] No configuration available for Quick Calculator');
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
      breakdown: 'Configuration error - unable to calculate',
      sqft,
      inputValues: values,
      confidence: 0,
      calculationDate: new Date().toISOString()
    };
  }

  // Use the exact same calculation logic as master engine but with JSON config
  return calculateExpertPricing(actualConfig, values, sqft);
};

// Custom hook for paver patio store
export const usePaverPatioStore = (companyId?: string): PaverPatioStore => {
  const [config, setConfig] = useState<PaverPatioConfig | null>(null);
  const [values, setValues] = useState<PaverPatioValues>({} as PaverPatioValues);
  const [sqft, setSqft] = useState<number>(100); // Track current square footage
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCalculation, setLastCalculation] = useState<PaverPatioCalculationResult | null>(null);

  // Load configuration using master pricing engine
  const loadConfig = useCallback(async () => {
    if (!companyId || companyId.trim() === '') {
      console.error('❌ [QUICK CALCULATOR] Cannot load config without company_id');
      setError('User company data not available');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🚀 [QUICK CALCULATOR] Loading configuration from master pricing engine', { companyId });

      // Load live configuration from master pricing engine with company_id
      const configData = await masterPricingEngine.loadPricingConfig('paver_patio_sqft', companyId);
      setConfig(configData);

      // Load or initialize values - clear old format if incompatible
      let initialValues: PaverPatioValues;
      try {
        initialValues = loadStoredValues(configData);
        // Validate that the values match the new structure
        if (!initialValues.excavation?.tearoutComplexity || !initialValues.materials?.cuttingComplexity) {
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

      // Calculate initial price using master pricing engine
      const calculation = await calculatePrice(configData, initialValues, 100, companyId);
      setLastCalculation(calculation);

      console.log('✅ [QUICK CALCULATOR] Configuration loaded from master pricing engine');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load configuration';
      setError(errorMessage);
      console.error('Error loading paver patio config from master engine:', err);

      // Fallback to local JSON configuration
      console.warn('🔄 [QUICK CALCULATOR] Falling back to local JSON configuration');
      try {
        const configData = paverPatioConfigJson as any;
        setConfig(configData);

        const initialValues = getDefaultValues(configData);
        setValues(initialValues);

        const calculation = await calculatePrice(configData, initialValues, 100, companyId);
        setLastCalculation(calculation);

        console.log('✅ [QUICK CALCULATOR] Fallback configuration loaded');
      } catch (fallbackErr) {
        console.error('❌ [CRITICAL] Fallback configuration also failed:', fallbackErr);
      }
    } finally {
      setIsLoading(false);
    }
  }, [companyId]); // Include companyId in dependencies

  // CRITICAL: Recalculate when config changes (e.g., from real-time subscription)
  useEffect(() => {
    if (!config || !companyId) return;

    console.log('🔄 [QUICK CALCULATOR] Config changed, recalculating with new values');
    console.log('🔍 [QUICK CALCULATOR] New config equipment values:', {
      handTools: config.variables?.excavation?.equipmentRequired?.options?.handTools?.value,
      attachments: config.variables?.excavation?.equipmentRequired?.options?.attachments?.value,
      lightMachinery: config.variables?.excavation?.equipmentRequired?.options?.lightMachinery?.value,
      heavyMachinery: config.variables?.excavation?.equipmentRequired?.options?.heavyMachinery?.value,
    });

    // Recalculate with current values and sqft
    const recalculate = async () => {
      try {
        const calculation = await calculatePrice(config, values, sqft, companyId);
        setLastCalculation(calculation);
        console.log('✅ [QUICK CALCULATOR] Recalculation complete after config change');
      } catch (error) {
        console.error('❌ [QUICK CALCULATOR] Failed to recalculate after config change:', error);
      }
    };

    recalculate();
  }, [config, values, sqft, companyId]); // Recalculate when config, values, or sqft changes

  // Update a specific value
  const updateValue = useCallback(async (category: keyof PaverPatioValues, variable: string, value: string | number) => {
    if (!config) return;

    const updated = {
      ...values,
      [category]: {
        ...values[category],
        [variable]: value,
      },
    };

    setValues(updated);

    // Save to localStorage
    saveStoredValues(updated);

    // Recalculate price using master pricing engine with stored sqft (not hardcoded 100)
    try {
      const calculation = await calculatePrice(config, updated, sqft, companyId);
      setLastCalculation(calculation);
    } catch (error) {
      console.error('Failed to recalculate price after value update:', error);
    }
  }, [config, values, sqft]);

  // Reset all values to defaults
  const resetToDefaults = useCallback(async () => {
    if (!config) return;

    const defaultValues = getDefaultValues(config);
    setValues(defaultValues);
    saveStoredValues(defaultValues);
    setSqft(100); // Reset sqft to 100 when resetting to defaults

    try {
      const calculation = await calculatePrice(config, defaultValues, 100, companyId);
      setLastCalculation(calculation);
    } catch (error) {
      console.error('Failed to calculate price after reset:', error);
    }
  }, [config]);

  // Reset to defaults and set square footage to 100 (for Quick Calculator)
  const resetToDefaults100 = useCallback(async () => {
    if (!config) return;

    // Use true baseline values that result in exactly 24 hours for 100 sqft
    const baselineValues = getTrueBaselineValues();
    setValues(baselineValues);
    saveStoredValues(baselineValues);
    setSqft(100); // Reset sqft to 100

    try {
      // Calculate with exactly 100 sqft using baseline values
      const calculation = await calculatePrice(config, baselineValues, 100, companyId);
      setLastCalculation(calculation);

      console.log('🔄 Quick Calculator reset to true baseline:', {
        teamSize: baselineValues.labor.teamSize,
        accessDifficulty: baselineValues.siteAccess.accessDifficulty,
        obstacleRemoval: baselineValues.siteAccess.obstacleRemoval,
        cuttingComplexity: baselineValues.materials.cuttingComplexity,
        expectedHours: '24.0 hours for 100 sqft'
      });
    } catch (error) {
      console.error('Failed to calculate baseline price:', error);
    }
  }, []); // Empty deps - config accessed from closure via state

  // Reset a specific category
  const resetCategory = useCallback(async (category: keyof PaverPatioValues) => {
    if (!config) return;

    const defaultValues = getDefaultValues(config);
    const updated = {
      ...values,
      [category]: defaultValues[category],
    };

    setValues(updated);
    saveStoredValues(updated);

    try {
      const calculation = await calculatePrice(config, updated, sqft, companyId);
      setLastCalculation(calculation);
    } catch (error) {
      console.error('Failed to calculate price after category reset:', error);
    }
  }, [config, values, sqft]);

  // Calculate price for specific square footage
  const calculatePriceForSqft = useCallback(async (inputSqft: number = 1): Promise<PaverPatioCalculationResult> => {
    if (!config) {
      throw new Error('Configuration not loaded');
    }

    // Update stored sqft so variable changes use this value
    setSqft(inputSqft);

    console.log('🔍 [DEBUG] Calculating price with values:', {
      sqft: inputSqft,
      complexity: values.complexity,
      allValues: values
    });

    const calculation = await calculatePrice(config, values, inputSqft, companyId);

    console.log('🔍 [DEBUG] Calculation result:', {
      total: calculation.tier2Results.total,
      isNaN: isNaN(calculation.tier2Results.total)
    });

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

  // REMOVED: Subscription setup moved to QuickCalculatorTab component
  // This simplifies the store to just state management
  // Subscription is now created when modal opens and cleaned up when it closes

  // Load config on mount (just once)
  useEffect(() => {
    if (companyId && companyId.trim() !== '') {
      console.log('🔍 [QUICK CALCULATOR] Loading initial config on mount');
      loadConfig();
    }
  }, [companyId]);

  // Auto-recalculate when config changes (from real-time or manual reload)
  useEffect(() => {
    if (config && sqft > 0 && !isLoading) {
      const configTimestamp = (config as any)._lastUpdated;
      const updateSource = (config as any)._updateSource;

      console.log('🔄 [QUICK CALCULATOR] Config changed!', {
        timestamp: configTimestamp,
        source: updateSource || 'initial-load',
        sqft: sqft,
        willRecalculate: true
      });

      // Recalculate with current sqft value
      calculatePriceForSqft(sqft).catch(err => {
        console.error('❌ [QUICK CALCULATOR] Auto-recalculation failed:', err);
      });
    }
  }, [config]); // Only watch config - timestamp in config forces new reference

  // REMOVED: Redundant storage event listener - Supabase subscription handles real-time updates

  // REMOVED: Redundant custom event listener - Supabase subscription handles real-time updates

  // Manual reload for when modal opens
  const reloadConfig = useCallback(async () => {
    console.log('🔄 [QUICK CALCULATOR] Manually reloading config from Supabase');
    setIsLoading(true);
    try {
      const freshConfig = await masterPricingEngine.loadPricingConfig('paver_patio_sqft', companyId);
      setConfig(freshConfig);
      console.log('✅ [QUICK CALCULATOR] Config reloaded successfully');
    } catch (err) {
      console.error('❌ [QUICK CALCULATOR] Failed to reload config:', err);
      setError('Failed to reload configuration');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  return {
    config,
    values,
    sqft,
    isLoading,
    error,
    lastCalculation,
    loadConfig,
    updateValue,
    setSqft,
    resetToDefaults,
    resetToDefaults100,
    resetCategory,
    calculatePrice: calculatePriceForSqft,
    saveConfig,
    createBackup,
    reloadConfig,  // NEW: Manual reload for modal open
    setConfig,     // NEW: Expose for real-time subscription callback
  };
};

// Server-side exports for AI system integration
export { calculateExpertPricing };

/**
 * Load paver patio configuration for server-side use (without React hooks)
 * NOW USES MASTER PRICING ENGINE
 */
export const loadPaverPatioConfig = async (companyId?: string): Promise<PaverPatioConfig> => {
  try {
    // Use master pricing engine for live configuration
    return await masterPricingEngine.loadPricingConfig('paver_patio_sqft', companyId);
  } catch (error) {
    console.warn('Master pricing engine unavailable, falling back to JSON config:', error);
    // Fallback to JSON configuration
    return paverPatioConfigJson as PaverPatioConfig;
  }
};