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

// Import excavation integration for bundled service calculations
import { calculateExcavationHours, calculateExcavationCost } from '../calculations/excavation-integration';
// Import material-based excavation depth calculator
import { calculatePatioExcavationDepth } from '../../../services/materialCalculations';

// Import the JSON configuration (fallback only)
import paverPatioConfigJson from '../../config/paver-patio-formula.json';
// Import Services database for baseline values
import { getPaverPatioServiceDefaults } from '../services-database/service-database';

// Default values based on the configuration - Expert system compatible with comprehensive null guards
const getDefaultValues = (config: PaverPatioConfig): PaverPatioValues => {
  // Complete fallback structure if config is missing or incomplete
  if (!config || !config.variables) {
    return {
      // excavation category REMOVED - now handled via serviceIntegrations
      siteAccess: { accessDifficulty: 'easy', obstacleRemoval: 'none' },
      materials: {
        paverStyle: 'standard',
        cuttingComplexity: 'minimal',
        useMaterialsDatabase: config?.variables_config?.materials?.useMaterialsDatabase?.default ?? true
      },
      labor: { teamSize: 'threePlus' },
      complexity: { overallComplexity: 'simple' },
      serviceIntegrations: {
        includeExcavation: config?.variables_config?.serviceIntegrations?.includeExcavation?.default ?? true
      }
    };
  }

  return {
    // excavation category REMOVED - now handled via serviceIntegrations
    siteAccess: {
      accessDifficulty: (config.variables.siteAccess?.accessDifficulty as PaverPatioVariable)?.default as string ?? 'easy',
      obstacleRemoval: (config.variables.siteAccess?.obstacleRemoval as PaverPatioVariable)?.default as string ?? 'none',
    },
    materials: {
      paverStyle: (config.variables.materials?.paverStyle as PaverPatioVariable)?.default as string ?? 'standard',
      cuttingComplexity: (config.variables.materials?.cuttingComplexity as PaverPatioVariable)?.default as string ?? 'minimal',
      useMaterialsDatabase: config?.variables_config?.materials?.useMaterialsDatabase?.default ?? true
    },
    labor: {
      teamSize: (config.variables.labor?.teamSize as PaverPatioVariable)?.default as string ?? 'threePlus',
    },
    complexity: {
      overallComplexity: (config.variables.complexity?.overallComplexity as PaverPatioVariable)?.default as string ?? 'simple',
    },
    serviceIntegrations: {
      includeExcavation: config?.variables_config?.serviceIntegrations?.includeExcavation?.default ?? true
    }
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
    // excavation category REMOVED - now handled via serviceIntegrations
    siteAccess: { accessDifficulty: 'easy', obstacleRemoval: 'none' },
    materials: {
      paverStyle: 'standard',
      cuttingComplexity: 'minimal',
      useMaterialsDatabase: true  // Default to new system
    },
    labor: { teamSize: 'threePlus' },
    complexity: { overallComplexity: 1.0 },
    serviceIntegrations: {
      includeExcavation: true
    }
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
      const validatedValues: PaverPatioValues = {
        // excavation category REMOVED - now handled via serviceIntegrations
        siteAccess: {
          accessDifficulty: parsedValues.siteAccess?.accessDifficulty || defaults.siteAccess.accessDifficulty,
          obstacleRemoval: parsedValues.siteAccess?.obstacleRemoval || defaults.siteAccess.obstacleRemoval,
        },
        materials: {
          paverStyle: parsedValues.materials?.paverStyle || defaults.materials.paverStyle,
          cuttingComplexity: parsedValues.materials?.cuttingComplexity || defaults.materials.cuttingComplexity,
          useMaterialsDatabase: parsedValues.materials?.useMaterialsDatabase ?? defaults.materials.useMaterialsDatabase ?? true
        },
        labor: {
          teamSize: parsedValues.labor?.teamSize || defaults.labor.teamSize,
        },
        complexity: {
          overallComplexity: parsedValues.complexity?.overallComplexity || defaults.complexity.overallComplexity,
        },
        serviceIntegrations: {
          includeExcavation: parsedValues.serviceIntegrations?.includeExcavation ?? defaults.serviceIntegrations?.includeExcavation ?? true
        }
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
  const baseProductivity = config?.baseSettings?.laborSettings?.baseProductivity?.value ?? 50;
  const baseMaterialCost = config?.baseSettings?.materialSettings?.baseMaterialCost?.value ?? 5.84;
  const profitMargin = config?.baseSettings?.businessSettings?.profitMarginTarget?.value ?? 0.20;

  // TIER 1: Man Hours Calculation - Base-Independent Variable System
  // Formula: (sqft ÷ daily_productivity) × team_size × 8_hours_per_day
  // Baseline: 100 sqft ÷ 100 sqft/day × 3 people × 8 hours = 24 base hours
  const baseHours = (sqft / baseProductivity) * optimalTeamSize * 8;
  let adjustedHours = baseHours;
  const breakdownSteps: string[] = [`Base: ${sqft} sqft ÷ ${baseProductivity} sqft/day × ${optimalTeamSize} people × 8 hours = ${baseHours.toFixed(1)} hours`];

  // Apply base-independent variable system - each percentage applies to ORIGINAL base hours
  // This keeps each variable's effect independent and predictable

  // NEW: Add excavation hours if service integration is enabled
  // ONLY check toggle value - respects user's choice to enable/disable
  let excavationHours = 0;
  const excavationEnabled = values?.serviceIntegrations?.includeExcavation === true;

  console.log('🔍 [PAVER PATIO] Checking excavation integration:', {
    toggleValue: values?.serviceIntegrations?.includeExcavation,
    excavationEnabled,
    willCalculateExcavation: excavationEnabled
  });

  if (excavationEnabled) {
    excavationHours = calculateExcavationHours(sqft);
    adjustedHours += excavationHours;
    breakdownSteps.push(`+Excavation (bundled service): +${excavationHours.toFixed(1)} hours`);
  }

  // REMOVED: tearoutComplexity (now handled by excavation service)
  // REMOVED: equipmentRequired (deprecated)

  const accessVar = config?.variables?.siteAccess?.accessDifficulty as PaverPatioVariable;
  const accessOption = accessVar?.options?.[values?.siteAccess?.accessDifficulty ?? 'moderate'];

  if (accessOption?.value && accessOption.value > 0) {
    const accessHours = baseHours * (accessOption.value / 100);
    adjustedHours += accessHours;
    breakdownSteps.push(`+Access difficulty (+${accessOption.value}% of base): +${accessHours.toFixed(1)} hours`);
  }

  const teamVar = config?.variables?.labor?.teamSize as PaverPatioVariable;
  const teamOption = teamVar?.options?.[values?.labor?.teamSize ?? 'optimal'];

  if (teamOption?.value && teamOption.value > 0) {
    const teamHours = baseHours * (teamOption.value / 100);
    adjustedHours += teamHours;
    breakdownSteps.push(`+Team size adjustment (+${teamOption.value}% of base): +${teamHours.toFixed(1)} hours`);
  }

  // Add cutting complexity labor percentage (calculated from BASE hours)
  const cuttingVar = config?.variables?.materials?.cuttingComplexity as PaverPatioVariable;
  const cuttingOption = cuttingVar?.options?.[values?.materials?.cuttingComplexity ?? 'minimal'];
  const cuttingLaborPercentage = cuttingOption?.laborPercentage ?? 0;

  if (cuttingLaborPercentage > 0) {
    const cuttingHours = baseHours * (cuttingLaborPercentage / 100);
    adjustedHours += cuttingHours;
    breakdownSteps.push(`+Cutting complexity (+${cuttingLaborPercentage}% of base): +${cuttingHours.toFixed(1)} hours`);
  }

  // Add final total to breakdown
  breakdownSteps.push(`Total Man Hours: ${adjustedHours.toFixed(1)} hours`);

  const totalManHours = adjustedHours;

  // TIER 2: Cost Calculation
  const laborCost = totalManHours * hourlyRate;

  // Material costs with comprehensive null guards and fallbacks
  const paverVar = config?.variables?.materials?.paverStyle as PaverPatioVariable;
  const paverOption = paverVar?.options?.[values?.materials?.paverStyle ?? 'standard'];
  const styleMultiplier = paverOption?.multiplier ?? 1.0;
  const materialCostBase = sqft * baseMaterialCost * styleMultiplier;

  // Material waste calculations - ONLY use cutting complexity (pattern complexity removed)
  const cuttingWaste = (cuttingOption?.materialWaste ?? 0) / 100;
  const materialWasteCost = materialCostBase * cuttingWaste;
  const totalMaterialCost = materialCostBase + materialWasteCost;

  // REMOVED: Equipment cost (deprecated - was part of old excavation variables)
  const equipmentCost = 0; // Set to 0 for backward compatibility

  // NOTE: Excavation cost calculation moved to async wrapper
  // This sync function is used for quick local calculations
  // Full excavation costing happens in async calculatePrice wrapper

  // Obstacle flat costs with null guards
  const obstacleVar = config?.variables?.siteAccess?.obstacleRemoval as PaverPatioVariable;
  const obstacleOption = obstacleVar?.options?.[values?.siteAccess?.obstacleRemoval ?? 'minor'];
  const obstacleCost = obstacleOption?.value ?? 0;

  // Calculate subtotal (excavation cost added in async wrapper)
  const subtotal = laborCost + totalMaterialCost + obstacleCost;

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

  // Calculate total days (8-hour workdays) at the end of Tier 1
  const totalDays = Math.round(((totalManHours ?? 0) / 8) * 10) / 10;

  return {
    tier1Results: {
      baseHours: baseHours ?? 0,
      adjustedHours: adjustedHours ?? 0,
      paverPatioHours: baseHours ?? 0,  // Paver-specific hours (without excavation)
      excavationHours: excavationHours, // Excavation hours from bundled service
      totalManHours: totalManHours ?? 0,
      totalDays: totalDays,
      breakdown: breakdownSteps
    },
    tier2Results: {
      laborCost: laborCost ?? 0,
      materialCostBase: materialCostBase ?? 0,
      materialWasteCost: materialWasteCost ?? 0,
      totalMaterialCost: totalMaterialCost ?? 0,
      excavationCost: 0,  // Will be populated by async wrapper
      excavationDetails: undefined, // Will be populated by async wrapper
      equipmentCost: equipmentCost ?? 0, // DEPRECATED (always 0)
      obstacleCost: obstacleCost ?? 0,
      subtotal: subtotal ?? 0,
      profit: profit ?? 0,
      total: total ?? 0,
      pricePerSqft: (total ?? 0) / sqft
    },
    breakdown: `Labor: $${(laborCost ?? 0).toFixed(2)} | Materials: $${(totalMaterialCost ?? 0).toFixed(2)} | Total: $${(total ?? 0).toFixed(2)}`,
    sqft,
    inputValues: values
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
    // Use master pricing engine for live Supabase calculation with company_id and config_id
    const result = await masterPricingEngine.calculatePricing(values, sqft, 'paver_patio_sqft', companyId, config?.id);

    console.log('✅ [QUICK CALCULATOR] Master engine calculation complete:', {
      total: result.tier2Results.total,
      source: 'Master Pricing Engine + Live Supabase',
      usedCompanyId: !!companyId,
      usedConfigId: !!config?.id
    });

    return result;
  } catch (error) {
    console.error('❌ [QUICK CALCULATOR] Master engine calculation failed:', error);

    // Fallback to legacy calculation if master engine fails
    console.warn('🔄 [QUICK CALCULATOR] Falling back to legacy local calculation');
    return await calculateLegacyFallback(config, values, sqft, companyId);
  }
};

// Legacy fallback for Quick Calculator (when Supabase unavailable)
const calculateLegacyFallback = async (
  config: PaverPatioConfig | null,
  values: PaverPatioValues,
  sqft: number = 100,
  companyId?: string
): Promise<PaverPatioCalculationResult> => {
  console.warn('🔄 [FALLBACK] Quick Calculator using legacy JSON-based calculation');

  // Use config from props or fallback to imported JSON
  const actualConfig = config || (paverPatioConfigJson as PaverPatioConfig);

  if (!actualConfig) {
    console.error('❌ [CRITICAL] No configuration available for Quick Calculator');
    return {
      tier1Results: {
        baseHours: 0,
        adjustedHours: 0,
        paverPatioHours: 0,
        excavationHours: 0,
        totalManHours: 0,
        totalDays: 0,
        breakdown: ['Error: Configuration missing']
      },
      tier2Results: {
        laborCost: 0,
        materialCostBase: 0,
        materialWasteCost: 0,
        totalMaterialCost: 0,
        excavationCost: 0,
        excavationDetails: undefined,
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
  const baseResult = calculateExpertPricing(actualConfig, values, sqft);

  // Add excavation cost if enabled (async operation)
  // ONLY check toggle value - respects user's choice to enable/disable
  if (values?.serviceIntegrations?.includeExcavation === true) {
    try {
      // Calculate dynamic excavation depth based on selected materials
      const { depth: excavationDepth, breakdown: depthBreakdown } = await calculatePatioExcavationDepth(
        values?.selectedMaterials || {},
        companyId,
        actualConfig.id
      );

      console.log('🏗️ [PAVER PATIO] Using material-based excavation depth:', {
        depth: `${excavationDepth} inches`,
        breakdown: depthBreakdown
      });

      // Calculate excavation cost with custom depth
      const excavationDetails = await calculateExcavationCost(sqft, companyId, excavationDepth);

      // Recalculate Tier 2 with excavation cost added to profitableSubtotal
      const profitMargin = actualConfig?.baseSettings?.businessSettings?.profitMarginTarget?.value ?? 0.20;
      const complexity = baseResult.tier2Results.subtotal / (baseResult.tier2Results.laborCost + baseResult.tier2Results.totalMaterialCost + baseResult.tier2Results.obstacleCost);

      // Add excavation to profitable subtotal (gets complexity & profit markup)
      const profitableSubtotal = baseResult.tier2Results.laborCost + baseResult.tier2Results.totalMaterialCost + excavationDetails.cost;
      const adjustedTotal = profitableSubtotal * complexity;
      const profit = adjustedTotal * profitMargin;
      const total = adjustedTotal + profit + baseResult.tier2Results.obstacleCost;

      return {
        ...baseResult,
        tier2Results: {
          ...baseResult.tier2Results,
          excavationCost: excavationDetails.cost,
          excavationDetails: {
            cubicYards: excavationDetails.cubicYards,
            depth: excavationDetails.depth,
            depthBreakdown: depthBreakdown, // NEW: Show breakdown in UI
            wasteFactor: excavationDetails.wasteFactor,
            baseRate: excavationDetails.baseRate,
            profit: excavationDetails.profit
          },
          subtotal: profitableSubtotal + baseResult.tier2Results.obstacleCost,
          profit,
          total,
          pricePerSqft: total / sqft
        }
      };
    } catch (error) {
      console.error('Failed to calculate excavation cost, proceeding without it:', error);
    }
  }

  return baseResult;
};

// Load sqft from localStorage
const loadStoredSqft = (): number => {
  try {
    const stored = localStorage.getItem('paverPatioSqft');
    if (stored) {
      const parsedSqft = parseFloat(stored);
      if (!isNaN(parsedSqft) && parsedSqft > 0) {
        console.log('🔍 [PAVER PATIO STORE] Loaded sqft from localStorage:', parsedSqft);
        return parsedSqft;
      }
    }
  } catch (error) {
    console.warn('Failed to load stored sqft:', error);
  }
  return 100; // Default
};

// Save sqft to localStorage
const saveStoredSqft = (sqft: number) => {
  try {
    localStorage.setItem('paverPatioSqft', sqft.toString());
  } catch (error) {
    console.warn('Failed to save sqft:', error);
  }
};

// Custom hook for paver patio store
export const usePaverPatioStore = (companyId?: string): PaverPatioStore => {
  const [config, setConfig] = useState<PaverPatioConfig | null>(null);
  const [values, setValues] = useState<PaverPatioValues>({} as PaverPatioValues);
  const [sqft, setSqft] = useState<number>(loadStoredSqft()); // Load from localStorage
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

      // CRITICAL: Force fresh config load to ensure database defaults are current
      // This ensures edited defaults (like depth) show immediately without hard refresh
      const configData = await masterPricingEngine.forceReloadFromDatabase('paver_patio_sqft', companyId);
      setConfig(configData);

      // ALWAYS start with baseline defaults (ignore localStorage for fresh start every time)
      console.log('🔄 Starting Quick Calculator with fresh baseline defaults');
      const initialValues = getDefaultValues(configData);
      setValues(initialValues);

      // Calculate initial price using master pricing engine with loaded sqft
      const loadedSqft = loadStoredSqft(); // Use persisted sqft from localStorage
      const calculation = await calculatePrice(configData, initialValues, loadedSqft, companyId);
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

  // Reset all values to defaults (keeps current sqft)
  const resetToDefaults = useCallback(async () => {
    if (!config) return;

    const defaultValues = getDefaultValues(config);
    setValues(defaultValues);
    saveStoredValues(defaultValues);
    // Keep current sqft - only reset variables

    try {
      const calculation = await calculatePrice(config, defaultValues, sqft, companyId);
      setLastCalculation(calculation);
    } catch (error) {
      console.error('Failed to calculate price after reset:', error);
    }
  }, [config, sqft, companyId]);

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
    saveStoredSqft(inputSqft); // Persist to localStorage

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

  // Force recalculate with fresh database values
  // Called when Quick Calculator opens/focuses to ensure materials are fresh
  const forceRecalculate = useCallback(async () => {
    if (!config) return;

    console.log('🔄 [PAVER PATIO] Force recalculating (ensures fresh material depths from database)');

    try {
      const calculation = await calculatePrice(config, values, sqft, companyId);
      setLastCalculation(calculation);
      console.log('✅ [PAVER PATIO] Recalculation complete with fresh materials');
    } catch (error) {
      console.error('❌ [PAVER PATIO] Force recalculation failed:', error);
    }
  }, [config, values, sqft, companyId]);

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
    forceRecalculate,  // NEW: Force recalculation with fresh materials from database
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