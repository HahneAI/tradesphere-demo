/**
 * Server-Side Calculation Module
 *
 * NOW USES MASTER PRICING ENGINE - Single Source of Truth
 * Live Supabase integration for real-time pricing consistency
 */

import type { PaverPatioValues, PaverPatioCalculationResult } from '../../core/master-formula/formula-types';
import { masterPricingEngine, calculatePricing } from '../../core/calculations/master-pricing-engine';

/**
 * DEPRECATED: Use masterPricingEngine.loadPricingConfig() instead
 * Kept for backward compatibility only
 */
export async function loadPaverPatioConfig() {
  console.warn('⚠️ [DEPRECATED] loadPaverPatioConfig() - Use masterPricingEngine.loadPricingConfig() instead');
  return await masterPricingEngine.loadPricingConfig();
}

/**
 * Server-side master formula calculation
 * NOW USES MASTER PRICING ENGINE - Single Source of Truth
 */
export async function calculateExpertPricing(
  configOrValues: any, // Legacy parameter for backward compatibility
  values?: PaverPatioValues,
  sqft: number = 100
): Promise<PaverPatioCalculationResult> {
  console.log('🚀 [SERVER] Using Master Pricing Engine for calculation');

  // Handle both legacy and new calling patterns
  let actualValues: PaverPatioValues;

  if (values) {
    // Legacy pattern: calculateExpertPricing(config, values, sqft)
    actualValues = values;
  } else {
    // New pattern: calculateExpertPricing(values, sqft)
    actualValues = configOrValues;
  }

  try {
    // Use master pricing engine for live Supabase calculation
    const result = await calculatePricing(actualValues, sqft);

    console.log('✅ [SERVER] Master engine calculation complete:', {
      total: result.tier2Results.total,
      source: 'Master Pricing Engine + Live Supabase'
    });

    return result;
  } catch (error) {
    console.error('❌ [SERVER] Master engine calculation failed:', error);

    // Fallback to legacy calculation if master engine fails
    console.warn('🔄 [SERVER] Falling back to legacy calculation');
    return calculateLegacyFallback(actualValues, sqft);
  }
}

/**
 * Legacy fallback calculation (Supabase unavailable)
 * Uses static JSON config as emergency fallback
 */
async function calculateLegacyFallback(values: PaverPatioValues, sqft: number): Promise<PaverPatioCalculationResult> {
  console.warn('🔄 [FALLBACK] Using legacy JSON-based calculation (Supabase unavailable)');

  // Load JSON config
  const { loadPaverPatioConfig } = await import('../../config/config-loader');
  const config = await loadPaverPatioConfig();

  if (!config) {
    throw new Error('❌ [CRITICAL] No configuration available - both Supabase and JSON failed');
  }

  // Use the exact same calculation logic as master engine but with JSON config
  const hourlyRate = config.baseSettings?.laborSettings?.hourlyLaborRate?.value ?? 25;
  const optimalTeamSize = config.baseSettings?.laborSettings?.optimalTeamSize?.value ?? 3;
  const baseProductivity = config.baseSettings?.laborSettings?.baseProductivity?.value ?? 50;
  const baseMaterialCost = config.baseSettings?.materialSettings?.baseMaterialCost?.value ?? 5.84;
  const profitMargin = config.baseSettings?.businessSettings?.profitMarginTarget?.value ?? 0.15;

  console.log('🔍 [FALLBACK] Using JSON config values:', {
    hourlyRate,
    optimalTeamSize,
    baseProductivity,
    baseMaterialCost,
    profitMargin: (profitMargin * 100).toFixed(1) + '%'
  });

  // TIER 1: Calculate man hours
  const baseHours = (sqft / baseProductivity) * optimalTeamSize * 8;
  let adjustedHours = baseHours;

  // Apply complexity percentages
  const tearoutPercentage = getTearoutPercentage(values.excavation.tearoutComplexity);
  const accessPercentage = getAccessPercentage(values.siteAccess.accessDifficulty);
  const teamSizePercentage = getTeamSizePercentage(values.labor.teamSize);

  if (tearoutPercentage > 0) {
    adjustedHours += baseHours * (tearoutPercentage / 100);
  }
  if (accessPercentage > 0) {
    adjustedHours += baseHours * (accessPercentage / 100);
  }
  if (teamSizePercentage > 0) {
    adjustedHours += baseHours * (teamSizePercentage / 100);
  }

  const totalManHours = adjustedHours;
  const totalDays = totalManHours / (optimalTeamSize * 8);

  // TIER 2: Calculate costs
  const laborCost = totalManHours * hourlyRate;

  // Material costs
  const materialMultiplier = getMaterialMultiplier(values.materials.paverStyle);
  const materialCostBase = baseMaterialCost * sqft * materialMultiplier;

  // Material waste from cutting
  const cuttingVar = config?.variables?.materials?.cuttingComplexity;
  const cuttingOption = cuttingVar?.options?.[values?.materials?.cuttingComplexity ?? 'minimal'];
  const cuttingWastePercent = cuttingOption?.materialWaste ?? 0;
  const materialWasteCost = materialCostBase * (cuttingWastePercent / 100);
  const totalMaterialCost = materialCostBase + materialWasteCost;

  // Equipment costs
  const projectDays = totalManHours / (optimalTeamSize * 8);
  const equipmentVar = config?.variables?.excavation?.equipmentRequired;
  const equipmentOption = equipmentVar?.options?.[values?.excavation?.equipmentRequired ?? 'handTools'];
  const equipmentCost = (equipmentOption?.value ?? 0) * projectDays;

  // Obstacle costs
  const obstacleVar = config?.variables?.siteAccess?.obstacleRemoval;
  const obstacleOption = obstacleVar?.options?.[values?.siteAccess?.obstacleRemoval ?? 'none'];
  const obstacleCost = obstacleOption?.value ?? 0;

  // Final calculation
  const subtotal = laborCost + totalMaterialCost + equipmentCost + obstacleCost;
  const profit = subtotal * profitMargin;
  const beforeComplexity = subtotal + profit;
  const complexityMultiplier = getComplexityMultiplier(values.complexity.overallComplexity);
  const total = beforeComplexity * complexityMultiplier;

  return {
    tier1Results: {
      totalManHours: Math.round(totalManHours * 10) / 10,
      totalDays: Math.round(totalDays * 10) / 10,
      complexityScore: Math.round(complexityMultiplier * 100) / 100,
      adjustedProductivity: Math.round((sqft / totalDays) * 10) / 10
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
    confidence: 0.8, // Lower confidence for fallback
    calculationDate: new Date().toISOString()
  };
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
 * NOW USES MASTER PRICING ENGINE
 */
export function createPricingCalculator() {
  return {
    calculatePricing: async (values: PaverPatioValues, sqft: number) => {
      return await calculateExpertPricing(values, sqft);
    }
  };
}

// Default export for compatibility
export default {
  loadPaverPatioConfig,
  calculateExpertPricing,
  createPricingCalculator
};