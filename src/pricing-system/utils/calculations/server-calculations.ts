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
  const baseProductivity = config?.baseSettings?.laborSettings?.baseProductivity?.value ?? 50;
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

  // TIER 1: Base labor calculation with base-independent percentage system
  // Formula: (sqft ÷ daily_productivity) × team_size × 8_hours_per_day
  const baseHours = (sqft / baseProductivity) * optimalTeamSize * 8;
  let adjustedHours = baseHours;

  // Apply base-independent variable system - each percentage applies to ORIGINAL base hours
  // This matches the Quick Calculator's calculation system exactly

  // Extract complexity percentages from JSON configuration
  const tearoutPercentage = getTearoutPercentage(values.excavation.tearoutComplexity);
  const accessPercentage = getAccessPercentage(values.siteAccess.accessDifficulty);
  const teamSizePercentage = getTeamSizePercentage(values.labor.teamSize);

  // 🔍 [DEBUG] Log Tier 1 percentage calculations (base-independent system)
  console.log('🔍 [DEBUG] server-calculations.ts - Base-Independent Percentage System:', {
    baseHours: baseHours.toFixed(1),
    tearoutComplexity: values.excavation.tearoutComplexity,
    tearoutPercentage: tearoutPercentage + '%',
    accessDifficulty: values.siteAccess.accessDifficulty,
    accessPercentage: accessPercentage + '%',
    teamSize: values.labor.teamSize,
    teamSizePercentage: teamSizePercentage + '%'
  });

  // Apply each variable as independent percentage of base hours
  if (tearoutPercentage > 0) {
    const tearoutHours = baseHours * (tearoutPercentage / 100);
    adjustedHours += tearoutHours;
  }

  if (accessPercentage > 0) {
    const accessHours = baseHours * (accessPercentage / 100);
    adjustedHours += accessHours;
  }

  if (teamSizePercentage > 0) {
    const teamHours = baseHours * (teamSizePercentage / 100);
    adjustedHours += teamHours;
  }

  const totalManHours = adjustedHours;
  const totalDays = totalManHours / (optimalTeamSize * 8); // 8-hour work days

  // 🔍 [DEBUG] Log Tier 1 results (base-independent system)
  console.log('🔍 [DEBUG] server-calculations.ts - Tier 1 Results:', {
    baseHours: baseHours.toFixed(1),
    adjustedHours: adjustedHours.toFixed(1),
    totalManHours: totalManHours.toFixed(1),
    totalDays: totalDays.toFixed(1),
    optimalTeamSize: optimalTeamSize,
    baseProductivity: baseProductivity + ' sqft/day'
  });

  // TIER 2: Cost calculation with material and labor components
  const laborCost = totalManHours * hourlyRate;
  const materialMultiplier = getMaterialMultiplier(values.materials.paverStyle);
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
    pricePerSqft: (total / sqft).toFixed(2)
  });

  // Extract complexity score from input values (Tier 2 multiplier)
  const complexityScore = values?.complexity?.overallComplexity ?? 1.0;

  const result: PaverPatioCalculationResult = {
    tier1Results: {
      totalManHours: Math.round(totalManHours * 10) / 10,
      totalDays: Math.round(totalDays * 10) / 10,
      complexityScore: Math.round(complexityScore * 100) / 100,  // User's complexity slider value
      adjustedProductivity: Math.round((sqft / totalDays) * 10) / 10  // Actual productivity: sqft per day
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

  // 🔍 [DEBUG] Final calculation results
  console.log('🔍 [DEBUG] server-calculations.ts - Final Results:', {
    sqft: sqft,
    finalTotal: result.tier2Results.total,
    laborHours: result.tier1Results.totalManHours,
    complexity: result.tier1Results.complexityScore,
    pricePerSqft: (result.tier2Results.total / sqft).toFixed(2),
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

// Helper functions for base-independent percentage system
// These return percentages that match the JSON configuration exactly
function getTearoutPercentage(tearoutComplexity: string): number {
  switch (tearoutComplexity) {
    case 'grass': return 0;        // JSON: 0% additional
    case 'concrete': return 20;    // JSON: 20% additional
    case 'asphalt': return 30;     // JSON: 30% additional
    default: return 0;
  }
}

function getAccessPercentage(accessDifficulty: string): number {
  switch (accessDifficulty) {
    case 'easy': return 0;         // JSON: 0% additional
    case 'moderate': return 50;    // JSON: 50% additional
    case 'difficult': return 100;  // JSON: 100% additional
    default: return 0;
  }
}

function getMaterialMultiplier(paverStyle: string): number {
  // Material multiplier still used for material costs, not labor hours
  switch (paverStyle) {
    case 'standard': return 1.0;
    case 'premium': return 1.2;
    default: return 1.0;
  }
}

function getTeamSizePercentage(teamSize: string): number {
  switch (teamSize) {
    case 'twoPerson': return 40;   // JSON: 40% additional for smaller team
    case 'threePlus': return 0;    // JSON: 0% (optimal team size)
    default: return 0;
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