/**
 * Server-Side Calculation Module
 *
 * CommonJS-compatible exports for Netlify functions
 * Provides master formula calculations without ESM/React dependencies
 */

import type { PaverPatioConfig, PaverPatioValues, PaverPatioCalculationResult } from '../../core/master-formula/formula-types';

// Import the JSON configuration directly
import paverPatioConfigJson from '../../config/paver-patio-formula.json';

/**
 * Load paver patio configuration (server-side compatible)
 */
export function loadPaverPatioConfig(): PaverPatioConfig {
  return paverPatioConfigJson as PaverPatioConfig;
}

/**
 * Server-side master formula calculation
 * Replaces all Google Sheets dependencies with internal calculations
 */
export function calculateExpertPricing(
  config: PaverPatioConfig,
  values: PaverPatioValues,
  sqft: number = 100
): PaverPatioCalculationResult {
  // 🔍 [DEBUG] Log input parameters at function start
  console.log('🔍 [DEBUG] server-calculations.ts - Function Start:', {
    sqft: sqft,
    inputValues: values,
    configPresent: !!config,
    timestamp: new Date().toISOString()
  });

  // Comprehensive null guards and defaults for server environment
  const hourlyRate = config?.baseSettings?.laborSettings?.hourlyLaborRate?.value ?? 25;
  const optimalTeamSize = config?.baseSettings?.laborSettings?.optimalTeamSize?.value ?? 3;
  const baseProductivity = config?.baseSettings?.laborSettings?.baseProductivity?.value ?? 100;
  const baseMaterialCost = config?.baseSettings?.materialSettings?.baseMaterialCost?.value ?? 5.84;
  const profitMargin = config?.baseSettings?.businessSettings?.profitMarginTarget?.value ?? 0.15;

  // 🔍 [DEBUG] Log base configuration values
  console.log('🔍 [DEBUG] server-calculations.ts - Base Config Values:', {
    hourlyRate: hourlyRate,
    optimalTeamSize: optimalTeamSize,
    baseProductivity: baseProductivity,
    baseMaterialCost: baseMaterialCost,
    profitMargin: profitMargin
  });

  console.log('🔥 SERVER-SIDE MASTER FORMULA CALCULATION START');
  console.log(`📊 Inputs: ${sqft} sqft with complexity factors`);

  // Extract complexity multipliers from variables
  const tearoutMultiplier = getTearoutMultiplier(values.excavation.tearoutComplexity);
  const accessMultiplier = getAccessMultiplier(values.siteAccess.accessDifficulty);
  const materialMultiplier = getMaterialMultiplier(values.materials.paverStyle);
  const teamSizeMultiplier = getTeamSizeMultiplier(values.labor.teamSize);

  // 🔍 [DEBUG] Log Tier 1 multiplier calculations
  console.log('🔍 [DEBUG] server-calculations.ts - Tier 1 Multiplier Calculations:', {
    tearoutComplexity: values.excavation.tearoutComplexity,
    tearoutMultiplier: tearoutMultiplier,
    accessDifficulty: values.siteAccess.accessDifficulty,
    accessMultiplier: accessMultiplier,
    paverStyle: values.materials.paverStyle,
    materialMultiplier: materialMultiplier,
    teamSize: values.labor.teamSize,
    teamSizeMultiplier: teamSizeMultiplier
  });

  // TIER 1: Base labor calculation with complexity adjustments
  const baseHoursPerSqft = 0.24; // 24 hours for 100 sqft baseline
  const complexityFactor = tearoutMultiplier * accessMultiplier * materialMultiplier * teamSizeMultiplier;

  const adjustedHoursPerSqft = baseHoursPerSqft * complexityFactor;
  const totalManHours = adjustedHoursPerSqft * sqft;
  const totalDays = totalManHours / (optimalTeamSize * 8); // 8-hour work days

  // 🔍 [DEBUG] Log Tier 1 results
  console.log('🔍 [DEBUG] server-calculations.ts - Tier 1 Results:', {
    baseHoursPerSqft: baseHoursPerSqft,
    complexityFactor: complexityFactor,
    adjustedHoursPerSqft: adjustedHoursPerSqft,
    totalManHours: totalManHours,
    totalDays: totalDays,
    optimalTeamSize: optimalTeamSize
  });

  // TIER 2: Cost calculation with material and labor components
  const laborCost = totalManHours * hourlyRate;
  const adjustedMaterialCost = baseMaterialCost * sqft * materialMultiplier;
  const subtotal = laborCost + adjustedMaterialCost;
  const profit = subtotal * profitMargin;
  const total = subtotal + profit;

  // 🔍 [DEBUG] Log Tier 2 cost calculations
  console.log('🔍 [DEBUG] server-calculations.ts - Tier 2 Cost Calculations:', {
    laborCost: laborCost,
    adjustedMaterialCost: adjustedMaterialCost,
    subtotal: subtotal,
    profit: profit,
    total: total,
    expectedQuickCalculatorResult: 2716.80,
    differenceFromExpected: total - 2716.80
  });

  const result: PaverPatioCalculationResult = {
    tier1Results: {
      totalManHours: Math.round(totalManHours * 10) / 10,
      totalDays: Math.round(totalDays * 10) / 10,
      complexityScore: Math.round(complexityFactor * 100) / 100,
      adjustedProductivity: Math.round((baseProductivity * complexityFactor) * 10) / 10
    },
    tier2Results: {
      laborCost: Math.round(laborCost * 100) / 100,
      materialCost: Math.round(adjustedMaterialCost * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      total: Math.round(total * 100) / 100
    },
    sqft,
    inputValues: values,
    confidence: 0.9,
    calculationDate: new Date().toISOString()
  };

  // 🔍 [DEBUG] Final calculation results with comparison to expected $2,716.80
  console.log('🔍 [DEBUG] server-calculations.ts - Final Results Comparison:', {
    sqft: sqft,
    finalTotal: result.tier2Results.total,
    expectedQuickCalculatorResult: 2716.80,
    absoluteDifference: Math.abs(result.tier2Results.total - 2716.80),
    percentageDifference: ((result.tier2Results.total - 2716.80) / 2716.80 * 100).toFixed(2) + '%',
    isWithinTolerance: Math.abs(result.tier2Results.total - 2716.80) < 50,
    debugTimestamp: new Date().toISOString()
  });

  console.log('✅ SERVER-SIDE CALCULATION COMPLETE:', {
    sqft,
    totalCost: result.tier2Results.total,
    laborHours: result.tier1Results.totalManHours,
    complexity: result.tier1Results.complexityScore
  });

  return result;
}

// Helper functions for complexity multipliers
function getTearoutMultiplier(tearoutComplexity: string): number {
  switch (tearoutComplexity) {
    case 'grass': return 1.0;
    case 'gravel': return 1.2;
    case 'concrete': return 1.6;
    default: return 1.0;
  }
}

function getAccessMultiplier(accessDifficulty: string): number {
  switch (accessDifficulty) {
    case 'easy': return 0.9;
    case 'moderate': return 1.0;
    case 'difficult': return 1.3;
    default: return 1.0;
  }
}

function getMaterialMultiplier(paverStyle: string): number {
  switch (paverStyle) {
    case 'economy': return 0.9;
    case 'standard': return 1.0;
    case 'premium': return 1.3;
    default: return 1.0;
  }
}

function getTeamSizeMultiplier(teamSize: string): number {
  switch (teamSize) {
    case 'onePerson': return 1.4;
    case 'twoPerson': return 1.1;
    case 'threePlus': return 1.0;
    default: return 1.0;
  }
}

/**
 * Simple calculation service factory for Netlify functions
 */
export function createPricingCalculator() {
  const config = loadPaverPatioConfig();

  return {
    config,
    calculatePricing: (values: PaverPatioValues, sqft: number) => {
      return calculateExpertPricing(config, values, sqft);
    }
  };
}

// Default export for compatibility
export default {
  loadPaverPatioConfig,
  calculateExpertPricing,
  createPricingCalculator
};