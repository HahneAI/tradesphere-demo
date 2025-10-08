import { useState, useCallback, useEffect } from 'react';
import type {
  ExcavationConfig,
  ExcavationValues,
  ExcavationCalculationResult,
  ExcavationStore
} from '../master-formula/formula-types';
import { masterPricingEngine } from '../calculations/master-pricing-engine';

// Default values
const getDefaultValues = (config: ExcavationConfig | null): ExcavationValues => {
  const defaultDepth = config?.variables_config?.calculationSettings?.defaultDepth?.default ?? 11;

  console.log('🔍 [EXCAVATION STORE] getDefaultValues called:', {
    hasConfig: !!config,
    defaultDepthFromDB: config?.variables_config?.calculationSettings?.defaultDepth?.default,
    defaultDepthUsed: defaultDepth,
    fullCalculationSettings: config?.variables_config?.calculationSettings
  });

  return {
    area_sqft: 100,
    depth_inches: defaultDepth
  };
};

// Load values from localStorage
const loadStoredValues = (config: ExcavationConfig | null): ExcavationValues => {
  try {
    const stored = localStorage.getItem('excavationValues');
    const defaults = getDefaultValues(config);

    if (stored) {
      const parsedValues = JSON.parse(stored);

      console.log('🔍 [EXCAVATION STORE] loadStoredValues:', {
        storedValues: parsedValues,
        defaultsFromDB: defaults,
        usingStoredArea: !!parsedValues.area_sqft,
        usingDBDefaultDepth: true,
        storedDepth: parsedValues.depth_inches,
        defaultDepthFromDB: defaults.depth_inches
      });

      return {
        area_sqft: parsedValues.area_sqft || defaults.area_sqft,
        depth_inches: defaults.depth_inches  // Always use DB default, never localStorage
      };
    }

    console.log('🔍 [EXCAVATION STORE] No localStorage - using defaults from DB:', defaults);
  } catch (error) {
    console.warn('Failed to load stored excavation values:', error);
  }
  return getDefaultValues(config);
};

// Save values to localStorage
const saveStoredValues = (values: ExcavationValues) => {
  try {
    localStorage.setItem('excavationValues', JSON.stringify(values));
    localStorage.setItem('excavationLastModified', new Date().toISOString());
  } catch (error) {
    console.warn('Failed to save excavation values:', error);
  }
};

// Calculate excavation pricing
const calculatePrice = async (
  config: ExcavationConfig | null,
  values: ExcavationValues,
  companyId?: string
): Promise<ExcavationCalculationResult> => {
  try {
    // Use master pricing engine for excavation calculation
    const result = await masterPricingEngine.calculateExcavationPricing(
      values.area_sqft,
      values.depth_inches,
      config?.variables_config?.calculationSettings || {},
      'excavation_removal',
      companyId
    );

    return result;
  } catch (error) {
    console.error('Excavation calculation failed:', error);
    // Fallback to local calculation
    return calculateLocalFallback(config, values);
  }
};

// Local fallback calculation (when Supabase unavailable)
const calculateLocalFallback = (
  config: ExcavationConfig | null,
  values: ExcavationValues
): ExcavationCalculationResult => {

  const { area_sqft, depth_inches } = values;

  // Get configuration values with defaults
  const wasteFactor = config?.variables_config?.calculationSettings?.wasteFactor?.default ?? 10;
  const compactionFactor = config?.variables_config?.calculationSettings?.compactionFactor?.default ?? 0;
  const roundingRule = config?.variables_config?.calculationSettings?.roundingRule?.default ?? 'up_whole';
  const baseRate = config?.hourly_labor_rate ?? 25;
  const profitMargin = config?.profit_margin ?? 0.05;
  const teamSize = config?.optimal_team_size ?? 3;

  // Calculate cubic yards
  const depth_ft = depth_inches / 12;
  const cubic_feet = area_sqft * depth_ft;
  const cy_raw = cubic_feet / 27;

  // Apply waste and compaction
  const waste_multiplier = 1 + (wasteFactor / 100);
  const compaction_multiplier = 1 + (compactionFactor / 100);
  const cy_adjusted = cy_raw * waste_multiplier * compaction_multiplier;

  // Apply rounding rule
  let cy_final = cy_adjusted;
  if (roundingRule === 'up_whole') {
    cy_final = Math.ceil(cy_adjusted);
  } else if (roundingRule === 'up_half') {
    cy_final = Math.ceil(cy_adjusted * 2) / 2;
  }

  // Calculate labor hours (progressive formula)
  let total_hours = 0;
  if (area_sqft <= 1000) {
    total_hours = Math.ceil(area_sqft / 100) * 12;
  } else {
    total_hours = (10 * 12) + Math.ceil((area_sqft - 1000) / 100) * 24;
  }

  const crew_hours = total_hours / teamSize;
  const project_days = Math.ceil(crew_hours / 8);

  // Calculate costs
  const base_cost = cy_final * baseRate;
  const profit = base_cost * profitMargin;
  const total_cost = base_cost + profit;

  return {
    area_sqft,
    depth_inches,
    cubic_yards_raw: Math.round(cy_raw * 100) / 100,
    cubic_yards_adjusted: Math.round(cy_adjusted * 100) / 100,
    cubic_yards_final: Math.round(cy_final * 100) / 100,
    base_hours: total_hours,
    crew_hours: Math.round(crew_hours * 10) / 10,
    project_days,
    base_cost: Math.round(base_cost * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    total_cost: Math.round(total_cost * 100) / 100,
    cost_per_cubic_yard: Math.round((total_cost / cy_final) * 100) / 100,
    hours_per_cubic_yard: Math.round((total_hours / cy_final) * 10) / 10
  };
};

// Custom hook for excavation store
export const useExcavationStore = (companyId?: string): ExcavationStore => {
  const [config, setConfig] = useState<ExcavationConfig | null>(null);
  const [values, setValues] = useState<ExcavationValues>({ area_sqft: 100, depth_inches: 11 }); // Will be overridden by config
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCalculation, setLastCalculation] = useState<ExcavationCalculationResult | null>(null);

  // Load configuration from Supabase
  const loadConfig = useCallback(async () => {
    if (!companyId || companyId.trim() === '') {
      setError('User company data not available');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // CRITICAL: Force fresh config load to ensure database defaults are current
      // This ensures edited defaults (like depth) show immediately without hard refresh
      const configData = await masterPricingEngine.forceReloadFromDatabase('excavation_removal', companyId) as any;
      setConfig(configData);

      // Load or initialize values
      const initialValues = loadStoredValues(configData);
      setValues(initialValues);

      // Calculate initial price
      const calculation = await calculatePrice(configData, initialValues, companyId);
      setLastCalculation(calculation);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load configuration';
      setError(errorMessage);
      console.error('Error loading excavation config:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Recalculate when config changes (real-time subscription updates)
  useEffect(() => {
    if (!config || !companyId) return;

    const recalculate = async () => {
      try {
        const calculation = await calculatePrice(config, values, companyId);
        setLastCalculation(calculation);
      } catch (error) {
        console.error('Failed to recalculate:', error);
      }
    };

    recalculate();
  }, [config, values, companyId]);

  // Update area
  const updateArea = useCallback(async (sqft: number) => {
    if (!config) return;

    const updated = { ...values, area_sqft: sqft };
    setValues(updated);
    saveStoredValues(updated);

    try {
      const calculation = await calculatePrice(config, updated, companyId);
      setLastCalculation(calculation);
    } catch (error) {
      console.error('Failed to recalculate after area update:', error);
    }
  }, [config, values, companyId]);

  // Update depth
  const updateDepth = useCallback(async (inches: number) => {
    if (!config) return;

    const updated = { ...values, depth_inches: inches };
    setValues(updated);
    saveStoredValues(updated);

    try {
      const calculation = await calculatePrice(config, updated, companyId);
      setLastCalculation(calculation);
    } catch (error) {
      console.error('Failed to recalculate after depth update:', error);
    }
  }, [config, values, companyId]);

  // Calculate with current values
  const calculate = useCallback(async () => {
    if (!config) throw new Error('Configuration not loaded');

    const calculation = await calculatePrice(config, values, companyId);
    setLastCalculation(calculation);
    return calculation;
  }, [config, values, companyId]);

  // Manual reload for when modal opens
  const reloadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      // CRITICAL: Force fresh config load to bypass cache and get latest database defaults
      // This ensures edited defaults (like depth) show immediately without hard refresh
      const freshConfig = await masterPricingEngine.forceReloadFromDatabase('excavation_removal', companyId) as any;
      setConfig(freshConfig);
    } catch (err) {
      console.error('Failed to reload config:', err);
      setError('Failed to reload configuration');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Load config on mount
  useEffect(() => {
    if (companyId && companyId.trim() !== '') {
      loadConfig();
    }
  }, [companyId, loadConfig]);

  return {
    config,
    values,
    isLoading,
    error,
    lastCalculation,
    loadConfig,
    updateArea,
    updateDepth,
    calculate,
    reloadConfig,
    setConfig
  };
};
