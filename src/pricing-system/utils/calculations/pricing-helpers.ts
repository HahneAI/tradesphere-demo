/**
 * Shared Pricing Helper Functions
 *
 * These functions calculate adjustment percentages and multipliers
 * used by both the Master Pricing Engine and fallback calculations.
 *
 * CRITICAL: Keep these in sync with the JSON config values in:
 * src/pricing-system/config/paver-patio-formula.json
 */

/**
 * Get tearout complexity percentage adjustment
 * @param tearoutComplexity - 'grass' | 'concrete' | 'asphalt'
 * @returns Percentage increase to base hours (0, 20, or 30)
 */
export function getTearoutPercentage(tearoutComplexity: string): number {
  switch (tearoutComplexity) {
    case 'grass': return 0;        // No additional time
    case 'concrete': return 20;    // 20% more time
    case 'asphalt': return 30;     // 30% more time
    default: return 0;
  }
}

/**
 * Get site access difficulty percentage adjustment
 * @param accessDifficulty - 'easy' | 'moderate' | 'difficult'
 * @returns Percentage increase to base hours (0, 50, or 100)
 */
export function getAccessPercentage(accessDifficulty: string): number {
  switch (accessDifficulty) {
    case 'easy': return 0;         // No additional time
    case 'moderate': return 50;    // 50% more time
    case 'difficult': return 100;  // Double the time
    default: return 0;
  }
}

/**
 * Get team size efficiency percentage adjustment
 * @param teamSize - 'twoPerson' | 'threePlus'
 * @returns Percentage increase to base hours (40 or 0)
 */
export function getTeamSizePercentage(teamSize: string): number {
  switch (teamSize) {
    case 'twoPerson': return 40;   // 40% more time for smaller team
    case 'threePlus': return 0;    // Optimal team size (no adjustment)
    default: return 0;
  }
}

/**
 * Get material cost multiplier based on paver style
 * @param paverStyle - 'standard' | 'premium'
 * @returns Material cost multiplier (1.0 or 1.2)
 */
export function getMaterialMultiplier(paverStyle: string): number {
  switch (paverStyle) {
    case 'standard': return 1.0;   // Base material cost
    case 'premium': return 1.2;    // 20% premium for higher-end materials
    default: return 1.0;
  }
}

/**
 * Get project complexity multiplier
 * @param complexity - 'simple' | 'standard' | 'complex' | 'extreme' | number
 * @returns Final price multiplier (1.0 to 1.5)
 */
export function getComplexityMultiplier(complexity: string | number): number {
  // Allow direct number input for custom complexity
  if (typeof complexity === 'number') return complexity;

  switch (complexity) {
    case 'simple': return 1.0;     // Base complexity
    case 'standard': return 1.1;   // 10% increase
    case 'complex': return 1.3;    // 30% increase
    case 'extreme': return 1.5;    // 50% increase
    default: return 1.0;
  }
}
