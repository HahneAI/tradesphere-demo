/**
 * Address Parser Utility
 *
 * Parses full address strings into structured components:
 * - Street address
 * - City
 * - State (2-letter code)
 * - ZIP code (5 digits or ZIP+4 format)
 *
 * Handles various address formats and provides fallback parsing
 *
 * @module addressParser
 */

/**
 * Parsed address components
 */
export interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

/**
 * Parse a full address string into structured components
 *
 * Expected format: "123 Street Name, City, ST 12345"
 * Also handles: "123 Street Name, Unit 5, City, ST 12345"
 *
 * @param fullAddress - Complete address string
 * @returns Parsed address components
 *
 * @example
 * parseAddress("789 Pine Drive, Naperville, IL 60540")
 * // Returns: { street: "789 Pine Drive", city: "Naperville", state: "IL", zip: "60540" }
 *
 * @example
 * parseAddress("456 Oak Avenue, Unit 12, Chicago, IL 60601")
 * // Returns: { street: "456 Oak Avenue, Unit 12", city: "Chicago", state: "IL", zip: "60601" }
 */
export function parseAddress(fullAddress: string): ParsedAddress {
  if (!fullAddress || typeof fullAddress !== 'string') {
    return {
      street: '',
      city: '',
      state: '',
      zip: ''
    };
  }

  const trimmed = fullAddress.trim();

  // Pattern 1: Standard format "Street, City, ST 12345"
  const standardPattern = /^(.+?),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/;
  const standardMatch = trimmed.match(standardPattern);

  if (standardMatch) {
    return {
      street: standardMatch[1].trim(),
      city: standardMatch[2].trim(),
      state: standardMatch[3].trim(),
      zip: standardMatch[4].trim()
    };
  }

  // Pattern 2: With unit/suite "Street, Unit X, City, ST 12345"
  const unitPattern = /^(.+?),\s*(.+?),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/;
  const unitMatch = trimmed.match(unitPattern);

  if (unitMatch) {
    return {
      street: `${unitMatch[1].trim()}, ${unitMatch[2].trim()}`,
      city: unitMatch[3].trim(),
      state: unitMatch[4].trim(),
      zip: unitMatch[5].trim()
    };
  }

  // Pattern 3: Without state/zip "Street, City"
  const cityOnlyPattern = /^(.+?),\s*([^,]+)$/;
  const cityOnlyMatch = trimmed.match(cityOnlyPattern);

  if (cityOnlyMatch) {
    return {
      street: cityOnlyMatch[1].trim(),
      city: cityOnlyMatch[2].trim(),
      state: '',
      zip: ''
    };
  }

  // Pattern 4: Try to extract state and zip from end
  const stateZipPattern = /\b([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/;
  const stateZipMatch = trimmed.match(stateZipPattern);

  if (stateZipMatch) {
    const addressWithoutStateZip = trimmed.replace(stateZipPattern, '').trim();
    const parts = addressWithoutStateZip.split(',').map(p => p.trim());

    if (parts.length >= 2) {
      const city = parts.pop() || '';
      const street = parts.join(', ');

      return {
        street,
        city,
        state: stateZipMatch[1],
        zip: stateZipMatch[2]
      };
    }
  }

  // Fallback: Return full address as street
  return {
    street: trimmed,
    city: '',
    state: '',
    zip: ''
  };
}

/**
 * Validate if an address string is parseable
 *
 * @param fullAddress - Address string to validate
 * @returns True if address can be parsed into city/state/zip
 */
export function isAddressParseable(fullAddress: string): boolean {
  const parsed = parseAddress(fullAddress);
  return !!(parsed.city && parsed.state && parsed.zip);
}

/**
 * Format parsed address back into a single line
 *
 * @param parsed - Parsed address components
 * @returns Formatted address string
 */
export function formatAddress(parsed: ParsedAddress): string {
  const parts: string[] = [];

  if (parsed.street) parts.push(parsed.street);
  if (parsed.city) parts.push(parsed.city);

  const stateZip = [parsed.state, parsed.zip].filter(Boolean).join(' ');
  if (stateZip) parts.push(stateZip);

  return parts.join(', ');
}

/**
 * Get US state name from 2-letter code
 *
 * @param stateCode - 2-letter state code (e.g., "IL")
 * @returns Full state name (e.g., "Illinois") or code if not found
 */
export function getStateName(stateCode: string): string {
  const states: Record<string, string> = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
    CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
    HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
    KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
    MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
    NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
    OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
    SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
    VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
    DC: 'District of Columbia'
  };

  return states[stateCode.toUpperCase()] || stateCode;
}

export default {
  parseAddress,
  isAddressParseable,
  formatAddress,
  getStateName
};
