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

  // TIER 2: Complete cost calculation (MUST match paver-patio-store.ts)
  const laborCost = totalManHours * hourlyRate;

  // Material costs with waste (CRITICAL: was missing waste calculations)
  const materialMultiplier = getMaterialMultiplier(values.materials.paverStyle);
  const materialCostBase = baseMaterialCost * sqft * materialMultiplier;

  // Material waste from cutting complexity
  const cuttingVar = config?.variables?.materials?.cuttingComplexity;
  const cuttingOption = cuttingVar?.options?.[values?.materials?.cuttingComplexity ?? 'minimal'];
  const cuttingWastePercent = cuttingOption?.materialWaste ?? 0;
  const materialWasteCost = materialCostBase * (cuttingWastePercent / 100);
  const totalMaterialCost = materialCostBase + materialWasteCost;

  // Equipment costs (CRITICAL: was missing entirely)
  const projectDays = totalManHours / (optimalTeamSize * 8);
  const equipmentVar = config?.variables?.excavation?.equipmentRequired;
  const equipmentOption = equipmentVar?.options?.[values?.excavation?.equipmentRequired ?? 'handTools'];
  const equipmentCost = (equipmentOption?.value ?? 0) * projectDays;

  // Obstacle costs (CRITICAL: was missing entirely)
  const obstacleVar = config?.variables?.siteAccess?.obstacleRemoval;
  const obstacleOption = obstacleVar?.options?.[values?.siteAccess?.obstacleRemoval ?? 'none'];
  const obstacleCost = obstacleOption?.value ?? 0;

  // Subtotal and profit
  const subtotal = laborCost + totalMaterialCost + equipmentCost + obstacleCost;
  const profit = subtotal * profitMargin;
  const beforeComplexity = subtotal + profit;

  // Apply overall complexity multiplier (CRITICAL: must apply to final total)
  const complexityMultiplier = getComplexityMultiplier(values.complexity.overallComplexity);
  const total = beforeComplexity * complexityMultiplier;

  // 🔍 [DEBUG] Log Tier 2 cost calculations
  console.log('🔍 [DEBUG] server-calculations.ts - Tier 2 Cost Calculations:', {
    laborCost: laborCost.toFixed(2),
    materialCostBase: materialCostBase.toFixed(2),
    materialWasteCost: materialWasteCost.toFixed(2),
    totalMaterialCost: totalMaterialCost.toFixed(2),
    equipmentCost: equipmentCost.toFixed(2),
    obstacleCost: obstacleCost.toFixed(2),
    subtotal: subtotal.toFixed(2),
    profit: profit.toFixed(2),
    beforeComplexity: beforeComplexity.toFixed(2),
    complexityMultiplier: complexityMultiplier,
    total: total.toFixed(2),
    pricePerSqft: (total / sqft).toFixed(2)
  });

  // Extract complexity score from input values (for return structure)
  const complexityScore = complexityMultiplier;

  const result: PaverPatioCalculationResult = {
    tier1Results: {
      totalManHours: Math.round(totalManHours * 10) / 10,
      totalDays: Math.round(totalDays * 10) / 10,
      complexityScore: Math.round(complexityScore * 100) / 100,  // User's complexity slider value
      adjustedProductivity: Math.round((sqft / totalDays) * 10) / 10  // Actual productivity: sqft per day
    },
    tier2Results: {
      laborCost: Math.round(laborCost * 100) / 100,
      materialCostBase: Math.round(materialCostBase * 100) / 100,
      materialWasteCost: Math.round(materialWasteCost * 100) / 100,
      totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
      equipmentCost: Math.round(equipmentCost * 100) / 100,
      obstacleCost: Math.round(obstacleCost * 100) / 100,
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

function getComplexityMultiplier(complexity: string): number {
  switch (complexity) {
    case 'simple': return 1.0;    // JSON: 100% (Simple Project)
    case 'standard': return 1.1;  // JSON: 110% (Standard Project)
    case 'complex': return 1.3;   // JSON: 130% (Complex Project)
    case 'extreme': return 1.5;   // JSON: 150% (Extreme Complexity)
    default: return 1.0;          // Default to simple
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