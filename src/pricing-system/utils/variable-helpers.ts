/**
 * Service Variable Helper Functions
 *
 * Utilities for managing service pricing variables across different effect types.
 * Ensures consistency between display values and calculation multipliers.
 */

/**
 * Calculate multiplier from percentage value
 * Used by: labor_time_percentage, material_cost_multiplier, total_project_multiplier
 *
 * Formula: multiplier = 1 + (percentage / 100)
 *
 * Examples:
 * - 0% → 1.0 (no change)
 * - 20% → 1.2 (20% increase)
 * - 40% → 1.4 (40% increase)
 * - 100% → 2.0 (double)
 *
 * @param percentage - The percentage value (e.g., 20 for 20%)
 * @returns The calculated multiplier (e.g., 1.2 for 20%)
 */
export function calculateMultiplierFromPercentage(percentage: number): number {
  return 1 + (percentage / 100);
}

/**
 * Calculate percentage from multiplier value
 * Inverse of calculateMultiplierFromPercentage
 *
 * Formula: percentage = (multiplier - 1) * 100
 *
 * @param multiplier - The multiplier value (e.g., 1.2)
 * @returns The percentage value (e.g., 20)
 */
export function calculatePercentageFromMultiplier(multiplier: number): number {
  return (multiplier - 1) * 100;
}

/**
 * Effect Type Definitions
 * Maps effect types to their field requirements and calculation methods
 */
export const EFFECT_TYPE_DEFINITIONS = {
  labor_time_percentage: {
    fields: ['value', 'multiplier'],
    requiresMultiplier: true,
    description: 'Percentage applied to base labor hours',
    examples: ['tearoutComplexity', 'accessDifficulty', 'teamSize']
  },
  material_cost_multiplier: {
    fields: ['value', 'multiplier'],
    requiresMultiplier: true,
    description: 'Percentage multiplier for material costs',
    examples: ['paverStyle']
  },
  total_project_multiplier: {
    fields: ['value', 'multiplier'],
    requiresMultiplier: true,
    description: 'Multiplier applied to entire project subtotal',
    examples: ['overallComplexity']
  },
  cutting_complexity: {
    fields: ['laborPercentage', 'materialWaste'],
    requiresMultiplier: false,
    description: 'Dual percentage affecting labor time and material waste',
    examples: ['cuttingComplexity']
  },
  daily_equipment_cost: {
    fields: ['value'],
    requiresMultiplier: false,
    description: 'Dollar cost per project day',
    examples: ['equipmentRequired']
  },
  flat_additional_cost: {
    fields: ['value'],
    requiresMultiplier: false,
    description: 'One-time flat cost added to project',
    examples: ['obstacleRemoval']
  }
} as const;

/**
 * Sync multiplier field with value field for percentage-based variables
 *
 * @param option - The variable option object to update
 * @param percentageValue - The new percentage value
 * @returns Updated option with synced multiplier
 */
export function syncMultiplierWithValue(option: any, percentageValue: number): any {
  return {
    ...option,
    value: percentageValue,
    multiplier: calculateMultiplierFromPercentage(percentageValue)
  };
}

/**
 * Validate variable structure based on effect type
 *
 * @param effectType - The effect type to validate
 * @param option - The variable option to validate
 * @returns True if valid, false otherwise
 */
export function validateVariableStructure(effectType: string, option: any): boolean {
  const definition = EFFECT_TYPE_DEFINITIONS[effectType as keyof typeof EFFECT_TYPE_DEFINITIONS];

  if (!definition) {
    console.warn(`Unknown effect type: ${effectType}`);
    return false;
  }

  // Check all required fields exist
  for (const field of definition.fields) {
    if (option[field] === undefined) {
      console.warn(`Missing required field '${field}' for effect type '${effectType}'`);
      return false;
    }
  }

  // If multiplier is required, verify it's synced with value
  if (definition.requiresMultiplier && option.value !== undefined && option.multiplier !== undefined) {
    const expectedMultiplier = calculateMultiplierFromPercentage(option.value);
    const isSync = Math.abs(option.multiplier - expectedMultiplier) < 0.001; // Allow for floating point precision

    if (!isSync) {
      console.warn(`Multiplier out of sync for effect type '${effectType}': value=${option.value}, multiplier=${option.multiplier}, expected=${expectedMultiplier}`);
      return false;
    }
  }

  return true;
}
