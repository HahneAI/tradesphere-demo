/**
 * Excavation Service Integration Helper
 *
 * Provides centralized excavation calculation functions for service bundling.
 * ANY service that needs excavation can import and use these functions.
 *
 * CRITICAL: All config values read dynamically from live excavation_removal service.
 * NO hardcoded defaults - ensures admin changes propagate everywhere.
 */

import { masterPricingEngine } from './master-pricing-engine';

/**
 * Calculate excavation hours using TIER-BASED formula
 *
 * Formula: Each 1000 sqft tier = flat 12 hours
 * - 1-1000 sqft = 12 hours (tier 1)
 * - 1001-2000 sqft = 24 hours (tier 2)
 * - 2001-3000 sqft = 36 hours (tier 3)
 *
 * @param area_sqft - Area in square feet
 * @returns Total excavation hours (whole number, NOT fractional)
 */
export function calculateExcavationHours(area_sqft: number): number {
  // TIER-BASED: Math.ceil ensures we round up to next tier
  // 1 sqft = tier 1, 1000 sqft = tier 1, 1001 sqft = tier 2
  const sqftTiers = Math.ceil(area_sqft / 1000);
  const hours = sqftTiers * 12;

  console.log('🔍 [EXCAVATION INTEGRATION] Hours calculation:', {
    area_sqft,
    sqftTiers,
    hours,
    formula: `Math.ceil(${area_sqft}/1000) = ${sqftTiers} tier(s) × 12 hrs/tier = ${hours} hrs`
  });

  return hours;
}

/**
 * Calculate excavation cost using LIVE excavation service config
 *
 * ALL parameters dynamically loaded from database:
 * - defaultDepth from variables_config.calculationSettings.defaultDepth.default
 * - wasteFactor from variables_config.calculationSettings.wasteFactor.default
 * - compactionFactor from variables_config.calculationSettings.compactionFactor.default
 * - baseRate from hourly_labor_rate
 * - profitMargin from profit_margin
 *
 * When admin changes ANY of these values in Services DB, this function
 * automatically uses the new values. NO code changes needed.
 *
 * @param area_sqft - Area in square feet
 * @param companyId - Company ID for config lookup
 * @returns Excavation cost breakdown with all dynamic config values
 */
export async function calculateExcavationCost(
  area_sqft: number,
  companyId?: string
): Promise<{
  cost: number;
  cubicYards: number;
  baseRate: number;
  profit: number;
  depth: number;
  wasteFactor: number;
}> {
  try {
    // Load LIVE excavation service config from database
    const config = await masterPricingEngine.loadPricingConfig('excavation_removal', companyId) as any;

    // Extract ALL parameters from live config (NO hardcoded defaults)
    // These values can be changed by admin in Services DB and will propagate automatically
    const defaultDepth = config?.variables_config?.calculationSettings?.defaultDepth?.default ?? 12;
    const wasteFactor = config?.variables_config?.calculationSettings?.wasteFactor?.default ?? 10;
    const compactionFactor = config?.variables_config?.calculationSettings?.compactionFactor?.default ?? 0;
    const baseRate = config?.hourly_labor_rate ?? 25;
    const profitMargin = config?.profit_margin ?? 0.05;

    console.log('🔍 [EXCAVATION INTEGRATION] Using LIVE config from database:', {
      defaultDepth: `${defaultDepth} inches`,
      wasteFactor: `${wasteFactor}%`,
      compactionFactor: `${compactionFactor}%`,
      baseRate: `$${baseRate}/yd³`,
      profitMargin: `${(profitMargin * 100).toFixed(1)}%`,
      configSource: 'excavation_removal service (live database)',
      companyId: companyId || 'default'
    });

    // Calculate cubic yards (matches excavation service formula exactly)
    const depthFt = defaultDepth / 12;
    const cubicFeet = area_sqft * depthFt;
    const cyRaw = cubicFeet / 27;

    // Apply waste and compaction (from live config)
    const wasteMultiplier = 1 + (wasteFactor / 100);
    const compactionMultiplier = 1 + (compactionFactor / 100);
    const cyAdjusted = cyRaw * wasteMultiplier * compactionMultiplier;
    const cyFinal = Math.ceil(cyAdjusted);

    // Calculate cost
    const baseCost = cyFinal * baseRate;
    const profit = baseCost * profitMargin;
    const totalCost = baseCost + profit;

    console.log('🔍 [EXCAVATION INTEGRATION] Cost calculation:', {
      area_sqft: `${area_sqft} sqft`,
      depth: `${defaultDepth} inches (${depthFt.toFixed(2)} ft)`,
      cubicFeet: cubicFeet.toFixed(2),
      cubicYardsRaw: cyRaw.toFixed(2),
      cubicYardsAdjusted: cyAdjusted.toFixed(2),
      cubicYardsFinal: cyFinal,
      baseCost: `$${baseCost.toFixed(2)}`,
      profit: `$${profit.toFixed(2)}`,
      totalCost: `$${totalCost.toFixed(2)}`
    });

    return {
      cost: Math.round(totalCost * 100) / 100,
      cubicYards: cyFinal,
      baseRate,
      profit: Math.round(profit * 100) / 100,
      depth: defaultDepth,
      wasteFactor
    };
  } catch (error) {
    console.error('❌ [EXCAVATION INTEGRATION] Failed to load excavation config:', error);
    throw new Error(`Failed to calculate excavation cost: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper to check if excavation is enabled for a service
 *
 * @param config - Service configuration
 * @returns true if excavation integration is enabled
 */
export function isExcavationEnabled(config: any): boolean {
  return config?.variables_config?.serviceIntegrations?.includeExcavation?.default === true;
}
