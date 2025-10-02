/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * STANDARD VARIABLE DISPLAY FORMATTER - UNIVERSAL META FILE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This is the SINGLE SOURCE OF TRUTH for all variable formatting and organization
 * across the entire Tradesphere platform. Every service uses these rules.
 *
 * CORE PRINCIPLES:
 * 1. MULTIPLIER INTELLIGENCE: Automatically detect and convert multipliers (1.2 → +20%)
 * 2. STRUCTURAL AWARENESS: Know which field to sort by (fixedLaborHours vs value vs multiplier)
 * 3. VISUAL CONSISTENCY: Same variable type = same display format, regardless of service
 * 4. CHRONOLOGICAL ORDER: Always smallest impact to largest impact (ascending)
 * 5. NULL SAFETY: Never show "+undefined%" or similar errors
 *
 * USAGE:
 * import { formatVariableDisplay, sortOptionsByValue } from '@/pricing-system/utils/formatting/variable-display-formatter';
 *
 * // Format a single option
 * const displayValue = formatVariableDisplay('paverStyle', option);
 * // Returns: "+20%" from multiplier 1.2
 *
 * // Sort and display all options
 * {sortOptionsByValue(variable.options).map(([key, option]) => (
 *   <option key={key} value={key}>
 *     {option.label} ({formatVariableDisplay(variableKey, option)})
 *   </option>
 * ))}
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
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORMAT VARIABLE DISPLAY - THE UNIVERSAL FORMATTER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This function understands EVERY variable format and converts it to the correct display.
 * It's smart enough to detect multipliers, percentages, costs, and combined effects.
 *
 * FORMATTING RULES (APPLIES TO ALL SERVICES):
 * ┌─────────────────────────┬──────────────────┬────────────────────┐
 * │ Variable Type           │ Data Format      │ Display Format     │
 * ├─────────────────────────┼──────────────────┼────────────────────┤
 * │ Complexity Slider       │ 30 or 1.3        │ (+30%)             │
 * │ Labor Time Modifiers    │ 25 or 0          │ +25% or Baseline   │
 * │ Equipment Costs         │ 125 or 0         │ $125/day or Hand   │
 * │ Obstacle Costs          │ 500 or 0         │ $500 or None       │
 * │ Material Multipliers    │ 1.2              │ +20%               │
 * │ Waste Percentages       │ 15               │ +15% waste         │
 * │ Combined Effects        │ {6h, 15% waste}  │ +6h, +15% waste    │
 * └─────────────────────────┴──────────────────┴────────────────────┘
 *
 * MULTIPLIER INTELLIGENCE:
 * - Detects multiplier format (1.0, 1.2, 1.5) and converts to percentage (+0%, +20%, +50%)
 * - Detects percentage format (0, 30, 50) and adds proper symbols (+30%)
 * - Detects decimal coefficients (0.3, 0.5) and converts to percentages (+30%, +50%)
 * - Always shows "Baseline" for neutral values (0, 1.0)
 *
 * NULL SAFETY:
 * - Checks all fields for undefined/null before accessing
 * - Never produces "+undefined%" or similar errors
 * - Falls back to "Baseline" when data is missing
 */
export function formatVariableDisplay(variableKey: string, option: VariableOption | null | undefined): string {
  if (!option) return 'N/A';

  // COMPLEXITY SLIDER - Special format with parentheses
  // Handles both direct percentages (30, 50) and multipliers (1.3, 1.5)
  if (variableKey === 'overallComplexity') {
    // Check for baseline values
    if (option.value === 0 || option.value === 1.0 || option.multiplier === 1.0) return 'Baseline';

    // If multiplier exists, convert to percentage
    if (option.multiplier !== undefined && option.multiplier !== 1.0) {
      const percentage = ((option.multiplier - 1) * 100).toFixed(0);
      return `(+${percentage}%)`;
    }

    // If value is a direct percentage (30, 50), show as-is
    if (option.value !== undefined && option.value > 1) {
      return `(+${option.value}%)`;
    }

    // If value is a small decimal (0.3, 0.5), it's a multiplier coefficient
    if (option.value !== undefined && option.value > 0 && option.value < 1) {
      const percentage = (option.value * 100).toFixed(0);
      return `(+${percentage}%)`;
    }

    return 'Baseline';
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
 * Get numeric sort value from option
 * Intelligently handles all possible value formats
 */
function getSortValue(option: VariableOption): number {
  // PRIORITY 1: Cutting complexity - use fixedLaborHours as primary sort key
  // Examples: 0h, 6h, 12h
  if (option.fixedLaborHours !== undefined) {
    return option.fixedLaborHours;
  }

  // PRIORITY 2: Pattern complexity - use wastePercentage
  // Examples: 0%, 10%, 20%
  if (option.wastePercentage !== undefined) {
    return option.wastePercentage;
  }

  // PRIORITY 3: Multipliers - use as-is for sorting
  // Examples: 1.0, 1.2, 1.5
  if (option.multiplier !== undefined) {
    return option.multiplier;
  }

  // PRIORITY 4: Standard value field
  // Examples: 0, 25, 50, 125, 500
  if (option.value !== undefined) {
    return option.value;
  }

  // DEFAULT: Zero (baseline)
  return 0;
}

/**
 * Sort variable options by value for consistent dropdown ordering
 *
 * SORTING RULES (UNIVERSAL FOR ALL SERVICES):
 * - Always smallest to largest (ascending order)
 * - Intelligently detects sort key based on option structure:
 *   * Cutting complexity: Sort by fixedLaborHours (0, 6, 12)
 *   * Pattern complexity: Sort by wastePercentage (0, 10, 20)
 *   * Material multipliers: Sort by multiplier (1.0, 1.2, 1.5)
 *   * Costs: Sort by value (0, 125, 500)
 *   * Time modifiers: Sort by value (0, 25, 40)
 *   * Complexity: Sort by value or multiplier (0/1.0, 30/1.3, 50/1.5)
 *
 * This ensures dropdowns ALWAYS display from least impact to most impact,
 * regardless of variable type or data structure.
 */
export function sortOptionsByValue(options: Record<string, VariableOption>): [string, VariableOption][] {
  return Object.entries(options || {}).sort((a, b) => {
    const aVal = getSortValue(a[1]);
    const bVal = getSortValue(b[1]);
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
