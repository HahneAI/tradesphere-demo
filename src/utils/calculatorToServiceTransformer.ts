/**
 * Calculator to Service Line Item Transformer
 *
 * Transforms Quick Calculator calculation results into ServiceLineItem objects
 * for the Job Creation Wizard.
 *
 * Preserves full calculation breakdown and user inputs for audit trail.
 */

import { ServiceLineItem } from '../hooks/useJobCreationWizard';
import type { PaverPatioConfig, PaverPatioValues } from '../pricing-system/core/master-formula/formula-types';

/**
 * Paver Patio calculation result structure from the pricing engine
 */
export interface PaverPatioCalculationResult {
  tier1Results: {
    baseHours: number;
    adjustedHours: number;
    paverPatioHours?: number;
    excavationHours?: number;
    totalManHours: number;
    totalDays: number;
    breakdown: string[];
  };
  tier2Results: {
    laborCost: number;
    materialCostBase: number;
    materialWasteCost: number;
    totalMaterialCost: number;
    excavationCost?: number;
    excavationDetails?: {
      cubicYards: number;
      depth: number;
      wasteFactor: number;
      baseRate: number;
      profit: number;
    };
    equipmentCost: number;
    obstacleCost: number;
    subtotal: number;
    profit: number;
    total: number;
    pricePerSqft: number;
  };
  breakdown: string;
  sqft?: number;
  inputValues?: PaverPatioValues;
}

/**
 * Excavation calculation result structure
 */
export interface ExcavationCalculationResult {
  tier1Results: {
    baseHours: number;
    adjustedHours: number;
    totalManHours: number;
    totalDays: number;
    breakdown: string[];
  };
  tier2Results: {
    laborCost: number;
    materialCost: number;
    equipmentCost: number;
    disposalCost: number;
    subtotal: number;
    profit: number;
    total: number;
    pricePerCubicYard: number;
  };
  breakdown: string;
  cubicYards?: number;
  inputValues?: any;
}

/**
 * Transform Paver Patio calculation result to ServiceLineItem
 *
 * @param calculationResult - The pricing calculation result
 * @param config - Service pricing configuration
 * @param sqft - Square footage input
 * @param values - User-selected pricing variables
 * @returns ServiceLineItem ready for wizard state
 */
export function transformPaverPatioToService(
  calculationResult: PaverPatioCalculationResult,
  config: PaverPatioConfig,
  sqft: number,
  values: PaverPatioValues
): ServiceLineItem {
  return {
    service_config_id: config.id || 'manual-' + Date.now(), // Real UUID from svc_pricing_configs
    service_name: config.service || 'Paver Patio Installation',
    service_description: `${sqft} sqft paver patio with ${values.materials?.paverStyle || 'standard'} pavers`,
    quantity: 1,
    unit_price: calculationResult.tier2Results.pricePerSqft,
    total_price: calculationResult.tier2Results.total,
    calculation_data: {
      tier1Results: calculationResult.tier1Results,
      tier2Results: calculationResult.tier2Results,
      sqft: sqft,
      inputValues: values,
      confidence: 0.85,
      calculationDate: new Date().toISOString(),
    },
    pricing_variables: {
      sqft: sqft,
      ...values,
    },
    metadata: {
      source: 'quick_calculator',
      service_id: config.serviceId || 'paver_patio_sqft',
      breakdown: calculationResult.breakdown,
    },
  };
}

/**
 * Transform Excavation calculation result to ServiceLineItem
 *
 * @param calculationResult - The pricing calculation result
 * @param config - Service pricing configuration
 * @param cubicYards - Cubic yards input
 * @param values - User-selected pricing variables
 * @returns ServiceLineItem ready for wizard state
 */
export function transformExcavationToService(
  calculationResult: ExcavationCalculationResult,
  config: any, // ExcavationConfig type
  cubicYards: number,
  values: any
): ServiceLineItem {
  return {
    service_config_id: config.id || 'manual-' + Date.now(),
    service_name: config.service || 'Excavation & Removal',
    service_description: `${cubicYards} cubic yards excavation and removal`,
    quantity: 1,
    unit_price: calculationResult.tier2Results.pricePerCubicYard,
    total_price: calculationResult.tier2Results.total,
    calculation_data: {
      tier1Results: calculationResult.tier1Results,
      tier2Results: calculationResult.tier2Results,
      cubicYards: cubicYards,
      inputValues: values,
      confidence: 0.85,
      calculationDate: new Date().toISOString(),
    },
    pricing_variables: {
      cubicYards: cubicYards,
      ...values,
    },
    metadata: {
      source: 'quick_calculator',
      service_id: config.serviceId || 'excavation_removal',
      breakdown: calculationResult.breakdown,
    },
  };
}

/**
 * Generic transformer for any service type
 *
 * @param calculationResult - Generic calculation result
 * @param config - Service configuration
 * @param serviceType - Service type identifier
 * @returns ServiceLineItem
 */
export function transformGenericCalculationToService(
  calculationResult: any,
  config: any,
  serviceType: string
): ServiceLineItem {
  // Determine which transformer to use based on service type
  switch (serviceType) {
    case 'paver_patio_sqft':
      return transformPaverPatioToService(
        calculationResult,
        config,
        calculationResult.sqft || 0,
        calculationResult.inputValues || {}
      );
    case 'excavation_removal':
      return transformExcavationToService(
        calculationResult,
        config,
        calculationResult.cubicYards || 0,
        calculationResult.inputValues || {}
      );
    default:
      // Fallback for unknown service types
      return {
        service_config_id: config.id || 'manual-' + Date.now(),
        service_name: config.service || 'Unknown Service',
        quantity: 1,
        unit_price: calculationResult.tier2Results?.total || 0,
        total_price: calculationResult.tier2Results?.total || 0,
        calculation_data: calculationResult,
        pricing_variables: calculationResult.inputValues || {},
        metadata: {
          source: 'quick_calculator',
          service_id: serviceType,
        },
      };
  }
}
