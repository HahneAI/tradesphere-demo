/**
 * TradeSphere Service Database Configuration
 * 
 * CRITICAL: These are EXACT service names and row numbers from the production
 * Google Sheets "NEW Quick Estimating Calculator - Official - Individual Projects"
 * 
 * DO NOT MODIFY service names or row numbers without updating Google Sheets formulas
 */

export interface ServiceConfig {
  row: number;
  unit: 'sqft' | 'linear_feet' | 'each' | 'palette' | 'cubic_yards' | 'section' | 'setup' | 'zone';
  category: 'hardscape' | 'drainage' | 'structures' | 'irrigation' | 'planting' | 'edging' | 'materials';
  special?: boolean; // For irrigation/lighting services requiring special handling
}

// EXACT 32-service database from working Make.com system
export const SERVICE_DATABASE: Record<string, ServiceConfig> = {
  // HARDSCAPE SERVICES (5 services)
  "Paver Patio (SQFT)": { 
    row: 2, 
    unit: "sqft", 
    category: "hardscape" 
  },
  "3' Retaining wall (LNFT X SQFT)": { 
    row: 3, 
    unit: "linear_feet", 
    category: "hardscape" 
  },
  "5' Retaining Wall (LNFTXSQFT)": { 
    row: 4, 
    unit: "linear_feet", 
    category: "hardscape" 
  },
  "2' Garden Walls (LNFTXSQFT)": { 
    row: 5, 
    unit: "linear_feet", 
    category: "hardscape" 
  },
  "Flag stone steppers": { 
    row: 6, 
    unit: "each", 
    category: "hardscape" 
  },

  // DRAINAGE SERVICES (5 services)
  "Dry Creek with plants (sqft)": { 
    row: 7, 
    unit: "sqft", 
    category: "drainage" 
  },
  "Buried Downspout (EACH)": { 
    row: 8, 
    unit: "each", 
    category: "drainage" 
  },
  "Drainage Burying (LNFT)": { 
    row: 9, 
    unit: "linear_feet", 
    category: "drainage" 
  },
  "EZ Flow French Drain (10' section)": { 
    row: 10, 
    unit: "section", 
    category: "drainage" 
  },
  "Flow Well Drainage- 4X4 (EACH)": { 
    row: 11, 
    unit: "each", 
    category: "drainage" 
  },

  // STRUCTURES (3 services)
  "Outdoor Kitchen (LNFT)": { 
    row: 12, 
    unit: "linear_feet", 
    category: "structures" 
  },
  "Intellishade Pergola (SQFT)": { 
    row: 13, 
    unit: "sqft", 
    category: "structures" 
  },
  "Cedar Pergola (SQFT)": { 
    row: 14, 
    unit: "sqft", 
    category: "structures" 
  },

  // IRRIGATION SERVICES - SPECIAL HANDLING REQUIRED (2 services)
  "Irrigation Set Up Cost": { 
    row: 15, 
    unit: "setup", 
    category: "irrigation", 
    special: true 
  },
  "Irrigation (per zone)": { 
    row: 16, 
    unit: "zone", 
    category: "irrigation", 
    special: true 
  },

  // SOD/PLANTING (3 services)
  "Sod Install (1 pallatte-450sqft)": { 
    row: 17, 
    unit: "palette", 
    category: "planting" 
  },
  "Seed/Straw (SQFT)": { 
    row: 18, 
    unit: "sqft", 
    category: "planting" 
  },
  "sod removal": { 
    row: 19, 
    unit: "sqft", 
    category: "planting" 
  },

  // EDGING (3 services)
  "Stone Edgers Tumbled": { 
    row: 20, 
    unit: "linear_feet", 
    category: "edging" 
  },
  "Metal Edging": { 
    row: 21, 
    unit: "linear_feet", 
    category: "edging" 
  },
  "Spade Edging": { 
    row: 22, 
    unit: "linear_feet", 
    category: "edging" 
  },

  // MATERIALS (3 services)
  "Triple Ground Mulch (SQFT)": { 
    row: 23, 
    unit: "sqft", 
    category: "materials" 
  },
  "Iowa Rainbow Rock Bed (sqft)": { 
    row: 24, 
    unit: "sqft", 
    category: "materials" 
  },
  "Topsoil (CUYD)": { 
    row: 25, 
    unit: "cubic_yards", 
    category: "materials" 
  },

  // PLANTS (8 services)
  "Annuals 4\" (1 per sq ft)": { 
    row: 26, 
    unit: "sqft", 
    category: "planting" 
  },
  "Annuals 10\" (1 per sq ft)": { 
    row: 27, 
    unit: "sqft", 
    category: "planting" 
  },
  "Perennial (1 gal)": { 
    row: 28, 
    unit: "each", 
    category: "planting" 
  },
  "Medium Shrub (2-3 gal)": { 
    row: 29, 
    unit: "each", 
    category: "planting" 
  },
  "Large Shrub (5-10 gal)": { 
    row: 30, 
    unit: "each", 
    category: "planting" 
  },
  "Small Tree (<2in Caliper)": { 
    row: 31, 
    unit: "each", 
    category: "planting" 
  },
  "Medium Tree (2.25-4in Caliper)": { 
    row: 32, 
    unit: "each", 
    category: "planting" 
  },
  "Large Tree (4.25-8in Caliper)": { 
    row: 33, 
    unit: "each", 
    category: "planting" 
  }
};

// SERVICE SYNONYM PATTERNS - From working Make.com parameter collector
export const SERVICE_SYNONYMS: Record<string, string[]> = {
  // Mulch variations → "Triple Ground Mulch (SQFT)"
  "Triple Ground Mulch (SQFT)": [
    "mulch", "triple ground", "wood chips", "mulching", "bark mulch", "wood mulch"
  ],
  
  // Patio variations → "Paver Patio (SQFT)"
  "Paver Patio (SQFT)": [
    "patio", "paver", "pavers", "paver patio", "brick patio", "stone patio", "pavers"
  ],
  
  // Irrigation variations → "Irrigation (per zone)" and "Irrigation Set Up Cost"
  "Irrigation (per zone)": [
    "sprinklers", "spouts", "irrigation", "watering system", "irrigation zones", "sprinkler zones"
  ],
  "Irrigation Set Up Cost": [
    "irrigation setup", "sprinkler setup", "irrigation installation", "irrigation system setup"
  ],
  
  // Edging variations
  "Metal Edging": [
    "edging", "metal edge", "steel edging", "aluminum edging", "landscape edging"
  ],
  "Stone Edgers Tumbled": [
    "stone edging", "rock edging", "stone border", "tumbled stone edging"
  ],
  "Spade Edging": [
    "spade edge", "cut edging", "hand edging", "natural edging"
  ],
  
  // Tree size mapping
  "Small Tree (<2in Caliper)": [
    "small tree", "small trees", "young tree", "saplings", "tree small"
  ],
  "Medium Tree (2.25-4in Caliper)": [
    "medium tree", "medium trees", "mid-size tree", "tree medium"
  ],
  "Large Tree (4.25-8in Caliper)": [
    "large tree", "large trees", "big tree", "mature tree", "tree large"
  ],
  
  // Drainage synonyms
  "Buried Downspout (EACH)": [
    "downspout", "buried downspout", "drainage downspout", "gutter drainage"
  ],
  "Dry Creek with plants (sqft)": [
    "dry creek", "creek bed", "dry stream", "decorative drainage"
  ],
  
  // Retaining wall variations
  "3' Retaining wall (LNFT X SQFT)": [
    "3 foot retaining wall", "3 ft retaining wall", "short retaining wall", "garden wall"
  ],
  "5' Retaining Wall (LNFTXSQFT)": [
    "5 foot retaining wall", "5 ft retaining wall", "tall retaining wall", "retaining wall"
  ],
  
  // Materials
  "Topsoil (CUYD)": [
    "topsoil", "soil", "dirt", "garden soil", "planting soil", "cubic yards soil"
  ],
  "Iowa Rainbow Rock Bed (sqft)": [
    "rainbow rock", "decorative rock", "landscape rock", "colored gravel", "rock bed"
  ]
};

// SPECIAL HANDLING RULES
export const SPECIAL_HANDLING = {
  irrigation: {
    requiredFields: ['setup', 'zones', 'zone_type'], // turf/drip
    setupRequired: true,
    boringAssessment: true
  },
  lighting: {
    requiredFields: ['transformer', 'dimmer', 'fixtures'],
    electricalCheck: true
  }
};

// UNIT CONVERSION HELPERS
export const UNIT_CONVERSIONS = {
  // Common unit variations
  'sq ft': 'sqft',
  'square feet': 'sqft',
  'square foot': 'sqft',
  'linear feet': 'linear_feet',
  'linear foot': 'linear_feet',
  'lin ft': 'linear_feet',
  'ft': 'linear_feet',
  'feet': 'linear_feet',
  'yard': 'cubic_yards',
  'yards': 'cubic_yards',
  'cubic yard': 'cubic_yards',
  'cu yd': 'cubic_yards'
};

// GOOGLE SHEETS CONFIGURATION
export const SHEETS_CONFIG = {
  // CRITICAL: This is the exact spreadsheet from production
  spreadsheetId: process.env.GOOGLE_SHEETS_ID || '', // Set in environment
  spreadsheetName: 'NEW Quick Estimating Calculator - Official - Individual Projects',
  
  // Data ranges for calculations
  ranges: {
    input: 'B2:B33',      // Where quantities are written
    labor: 'C2:C33',      // Calculated labor hours
    cost: 'D2:D33',       // Calculated costs
    totals: 'C34:D34',    // Project totals
    clear: 'B2:B33'       // Range to clear after calculation
  }
};

// Validation functions
export const getServiceByName = (serviceName: string): ServiceConfig | null => {
  return SERVICE_DATABASE[serviceName] || null;
};

export const findServiceBySynonym = (input: string): string | null => {
  const lowerInput = input.toLowerCase().trim();
  
  for (const [serviceName, synonyms] of Object.entries(SERVICE_SYNONYMS)) {
    for (const synonym of synonyms) {
      if (lowerInput.includes(synonym.toLowerCase())) {
        return serviceName;
      }
    }
  }
  
  return null;
};

export const getAllServices = (): string[] => {
  return Object.keys(SERVICE_DATABASE);
};

export const getServicesByCategory = (category: string): string[] => {
  return Object.entries(SERVICE_DATABASE)
    .filter(([, config]) => config.category === category)
    .map(([serviceName]) => serviceName);
};

export const isSpecialService = (serviceName: string): boolean => {
  const service = SERVICE_DATABASE[serviceName];
  return service?.special === true;
};

// Total service count validation
const EXPECTED_SERVICE_COUNT = 32;
const actualCount = Object.keys(SERVICE_DATABASE).length;

if (actualCount !== EXPECTED_SERVICE_COUNT) {
  console.warn(`⚠️ SERVICE_DATABASE contains ${actualCount} services, expected ${EXPECTED_SERVICE_COUNT}`);
}

console.log(`✅ SERVICE_DATABASE loaded: ${actualCount} services across ${Object.keys(SERVICE_SYNONYMS).length} synonym groups`);