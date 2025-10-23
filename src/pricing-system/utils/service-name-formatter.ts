/**
 * Service Name Formatter
 *
 * Utilities for normalizing database service names into clean display names
 * Examples:
 * - "paver_patio_sqft" → "Paver Patio"
 * - "excavation_removal" → "Excavation and Removal"
 * - "mulch_installation" → "Mulch Installation"
 */

/**
 * Normalize a database service name into a human-readable display name
 *
 * @param dbName - Database service name (e.g., "paver_patio_sqft", "excavation_removal")
 * @returns Normalized display name (e.g., "Paver Patio", "Excavation and Removal")
 */
export function normalizeServiceName(dbName: string): string {
  if (!dbName) return '';

  // Remove common suffixes that are technical metadata
  const cleaned = dbName
    .replace(/_sqft$/i, '')
    .replace(/_linear_feet$/i, '')
    .replace(/_cubic_yards$/i, '')
    .replace(/_each$/i, '');

  // Split by underscores
  const parts = cleaned.split('_');

  // Capitalize each word
  const capitalized = parts.map(word => {
    // Handle special cases
    if (word.toLowerCase() === 'and') return 'and';

    // Capitalize first letter, rest lowercase
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  // Join with spaces
  return capitalized.join(' ');
}

/**
 * Get a clean service display name from either registry displayName or database name
 * Removes technical suffixes like "(SQFT)" from registry display names
 *
 * @param displayName - Display name from registry (e.g., "Paver Patio (SQFT)")
 * @param fallbackDbName - Database name to use if display name cleanup fails
 * @returns Clean display name
 */
export function cleanServiceDisplayName(displayName: string, fallbackDbName?: string): string {
  if (!displayName && fallbackDbName) {
    return normalizeServiceName(fallbackDbName);
  }

  // Remove technical suffixes in parentheses
  const cleaned = displayName.replace(/\s*\([^)]*\)\s*$/g, '').trim();

  return cleaned || displayName;
}

/**
 * Extract unit type from service name or display name
 *
 * @param serviceName - Service name (db or display)
 * @returns Unit type or null
 */
export function extractServiceUnit(serviceName: string): string | null {
  const unitPatterns = [
    { pattern: /_sqft$|SQFT/i, unit: 'sqft' },
    { pattern: /_linear_feet$|Linear Feet/i, unit: 'linear feet' },
    { pattern: /_cubic_yards$|Cubic Yards/i, unit: 'cubic yards' },
    { pattern: /_each$|Each/i, unit: 'each' }
  ];

  for (const { pattern, unit } of unitPatterns) {
    if (pattern.test(serviceName)) {
      return unit;
    }
  }

  return null;
}
