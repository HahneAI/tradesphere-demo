/**
 * STANDARD VARIABLE DISPLAY FORMATTER
 *
 * This utility provides consistent formatting for pricing variable displays across all services.
 * Use this as the single source of truth for variable formatting to ensure consistency
 * as new services are added to the platform.
 *
 * USAGE:
 * import { formatVariableDisplay, getVariableKeyFromLabel } from '@/pricing-system/utils/formatting/variable-display-formatter';
 *
 * const displayValue = formatVariableDisplay(variableKey, option);
 */

export interface VariableOption {
  label?: string;
  value?: number;
  multiplier?: number;
  fixedLaborHours?: number;
  materialWaste?: number;
  wastePercentage?: number;
  description?: string;
  [key: string]: any;
}

/**
 * Format variable option for display in dropdowns and tags
 *
 * FORMATTING RULES:
 * - Zero values or baseline → "Baseline"
 * - Labor time modifiers → "+25%" or "Baseline"
 * - Costs → "$125/day" or "$500" (no + sign)
 * - Material multipliers → "+20%" (calculated from multiplier)
 * - Waste percentages → "+15% waste"
 * - Combined effects → "+6h, +15% waste"
 * - Complexity → "(+50%)" with parentheses
 * - Always show "Baseline" for zero/neutral values
 * - Never show "+undefined%" or similar errors
 */
export function formatVariableDisplay(variableKey: string, option: VariableOption | null | undefined): string {
  if (!option) return 'N/A';

  // COMPLEXITY SLIDER - Special format with parentheses
  if (variableKey === 'overallComplexity') {
    if (option.value === 0 || option.value === 1.0) return 'Baseline';
    return `(+${option.value}%)`;
  }

  // LABOR TIME MODIFIERS - Tier 1 variables that affect man-hours
  // Examples: tearoutComplexity, accessDifficulty, teamSize
  if (['tearoutComplexity', 'accessDifficulty', 'teamSize'].includes(variableKey)) {
    if (option.value === 0) return 'Baseline';
    return `+${option.value}%`;
  }

  // EQUIPMENT COSTS - Daily rental rates
  if (variableKey === 'equipmentRequired') {
    if (option.value === 0) return 'Hand tools';
    return `$${option.value}/day`;
  }

  // OBSTACLE REMOVAL COSTS - Flat fees
  if (variableKey === 'obstacleRemoval') {
    if (option.value === 0) return 'None';
    return `$${option.value}`;
  }

  // PAVER STYLE - Material cost multipliers
  // Convert multiplier (1.2) to percentage markup (+20%)
  if (variableKey === 'paverStyle') {
    if (option.value === 0 || option.multiplier === 1.0) return 'Standard';
    const multiplier = option.multiplier || option.value || 0;
    return `+${((multiplier - 1) * 100).toFixed(0)}%`;
  }

  // PATTERN COMPLEXITY - Material waste from intricate patterns
  if (variableKey === 'patternComplexity') {
    if (option.wastePercentage === 0 || option.wastePercentage === undefined) return 'Baseline';
    return `+${option.wastePercentage}% waste`;
  }

  // CUTTING COMPLEXITY - Combined labor hours + material waste
  if (variableKey === 'cuttingComplexity') {
    const hasLabor = option.fixedLaborHours && option.fixedLaborHours > 0;
    const hasWaste = option.materialWaste && option.materialWaste > 0;

    if (!hasLabor && !hasWaste) return 'Baseline';
    if (hasLabor && hasWaste) return `+${option.fixedLaborHours}h, +${option.materialWaste}% waste`;
    if (hasLabor) return `+${option.fixedLaborHours}h fixed`;
    if (hasWaste) return `+${option.materialWaste}% waste`;
  }

  // DEFAULT FALLBACK - Catch-all for unknown variable types
  // Prevents "+undefined%" errors
  if (option.value === undefined || option.value === 0) return 'Baseline';
  return `${option.value}`;
}

/**
 * Extract variable key from variable object label
 * Used to determine which formatting rule to apply
 *
 * NOTE: This is a temporary helper until we have proper variable key tracking.
 * Ideally, variable keys should be passed explicitly rather than derived from labels.
 */
export function getVariableKeyFromLabel(label: string): string {
  const labelMap: Record<string, string> = {
    'Tearout': 'tearoutComplexity',
    'Access': 'accessDifficulty',
    'Team': 'teamSize',
    'Equipment': 'equipmentRequired',
    'Obstacle': 'obstacleRemoval',
    'Paver': 'paverStyle',
    'Cutting': 'cuttingComplexity',
    'Pattern': 'patternComplexity',
    'Overall Complexity': 'overallComplexity',
  };

  for (const [key, value] of Object.entries(labelMap)) {
    if (label?.includes(key)) return value;
  }

  return 'unknown';
}

/**
 * Sort variable options by value for consistent dropdown ordering
 *
 * SORTING RULES:
 * - Primary sort key: option.value
 * - Fallback to: option.multiplier
 * - Final fallback: 0
 * - Always ascending order (smallest to largest)
 */
export function sortOptionsByValue(options: Record<string, VariableOption>): [string, VariableOption][] {
  return Object.entries(options || {}).sort((a, b) => {
    const aVal = a[1].value ?? a[1].multiplier ?? 0;
    const bVal = b[1].value ?? b[1].multiplier ?? 0;
    return aVal - bVal;
  });
}

/**
 * STANDARDS FOR NEW SERVICES
 *
 * When adding new service formulas, follow these formatting conventions:
 *
 * 1. VARIABLE TYPES:
 *    - Time modifiers (affect Tier 1 labor hours): Show as "+X%"
 *    - Cost modifiers (affect Tier 2 costs): Show as "$X/day" or "$X"
 *    - Material multipliers: Show as "+X%" (calculate from multiplier - 1)
 *    - Waste percentages: Show as "+X% waste"
 *    - Complexity sliders: Show as "(+X%)" with parentheses
 *
 * 2. BASELINE VALUES:
 *    - Always show "Baseline" for zero/neutral values
 *    - For multipliers: 1.0 = "Baseline"
 *    - For percentages: 0 = "Baseline"
 *    - For costs: 0 = descriptive text (e.g., "Hand tools", "None")
 *
 * 3. COMBINED EFFECTS:
 *    - Format: "+Xh, +Y% waste"
 *    - Always check for undefined values before displaying
 *    - Show individual components if only one exists
 *
 * 4. DROPDOWN ORDERING:
 *    - Always sort by numeric value (smallest to largest)
 *    - Use sortOptionsByValue() helper function
 *
 * 5. OPTION LABELS:
 *    - Format: "{label} ({formatted_value})"
 *    - No trailing dash or description in dropdown
 *    - Description shown separately in selected option card
 *
 * 6. NULL SAFETY:
 *    - Always check for undefined/null before accessing properties
 *    - Use ?? operator for fallback values
 *    - Never display "+undefined%" or similar
 *
 * EXAMPLE FOR NEW SERVICE:
 *
 * // In your service-specific component:
 * import { formatVariableDisplay, sortOptionsByValue } from '@/pricing-system/utils/formatting/variable-display-formatter';
 *
 * // In dropdown rendering:
 * {sortOptionsByValue(variable.options).map(([key, option]) => (
 *   <option key={key} value={key}>
 *     {option.label} ({formatVariableDisplay(variableKey, option)})
 *   </option>
 * ))}
 *
 * // Add new variable type to formatVariableDisplay() if needed:
 * if (variableKey === 'yourNewVariable') {
 *   // Your formatting logic here
 *   return formattedValue;
 * }
 */
