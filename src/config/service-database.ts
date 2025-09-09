
/**
 * TradeSphere Service Database Configuration - Complete Make.com Catalog
 * 
 * CRITICAL: These are EXACT service names and row numbers from the production
 * Google Sheets "NEW Quick Estimating Calculator - Official - Individual Projects"
 * 
 * Updated with complete 31-service catalog (skipping irrigation rows 15-16)
 * DO NOT MODIFY service names or row numbers without updating Google Sheets formulas
 */

export interface ServiceConfig {
  row: number;
  unit: 'sqft' | 'linear_feet' | 'each' | 'cubic_yards';
  category: 'hardscaping' | 'drainage' | 'structures' | 'planting' | 'removal' | 'edging' | 'materials';
  special?: boolean; // For services requiring special handling
}

// COMPLETE 31-service database from Make.com production system
export const SERVICE_DATABASE: Record<string, ServiceConfig> = {
  // HARDSCAPING SERVICES (6 services)
  "Paver Patio (SQFT)": { 
    row: 2, 
    unit: "sqft", 
    category: "hardscaping" 
  },
  "3' Retaining wall (LNFT X SQFT)": { 
    row: 3, 
    unit: "linear_feet", 
    category: "hardscaping" 
  },
  "5' Retaining Wall (LNFTXSQFT)": { 
    row: 4, 
    unit: "linear_feet", 
    category: "hardscaping" 
  },
  "2' Garden Walls (LNFTXSQFT)": { 
    row: 5, 
    unit: "linear_feet", 
    category: "hardscaping" 
  },
  "Flag stone steppers": { 
    row: 6, 
    unit: "each", 
    category: "hardscaping" 
  },
  "Outdoor Kitchen (LNFT)": { 
    row: 12, 
    unit: "linear_feet", 
    category: "hardscaping" 
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
    unit: "each", 
    category: "drainage" 
  },
  "Flow Well Drainage- 4X4 (EACH)": { 
    row: 11, 
    unit: "each", 
    category: "drainage" 
  },

  // STRUCTURES (2 services)
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

  // PLANTING SERVICES (9 services)
  "Sod Install (1 pallatte-450sqft)": { 
    row: 17, 
    unit: "sqft", 
    category: "planting" 
  },
  "Seed/Straw (SQFT)": { 
    row: 18, 
    unit: "sqft", 
    category: "planting" 
  },
  "Annuals 4\" ( 1 per sq ft)": { 
    row: 26, 
    unit: "sqft", 
    category: "planting" 
  },
  "Annuals 10\" ( 1 per sq ft)": { 
    row: 27, 
    unit: "sqft", 
    category: "planting" 
  },
  "Perennial (1 gal)": { 
    row: 28, 
    unit: "each", 
    category: "planting" 
  },
  "Medium Shrub": { 
    row: 29, 
    unit: "each", 
    category: "planting" 
  },
  "Large Shrub": { 
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
  },

  // REMOVAL SERVICES (1 service)
  "sod removal": { 
    row: 19, 
    unit: "sqft", 
    category: "removal" 
  },

  // EDGING SERVICES (3 services)
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
  }
};

// COMPREHENSIVE SERVICE_SYNONYMS with expanded variations for all services
export const SERVICE_SYNONYMS: Record<string, string[]> = {
  // HARDSCAPING SERVICES
  "Paver Patio (SQFT)": ["patio", "pavers", "paver patio", "brick patio", "stone patio", "outdoor floor", "pavers patio"],
  "3' Retaining wall (LNFT X SQFT)": ["retaining wall", "walls", "retention wall", "3 foot wall", "three foot wall", "small retaining wall", "small walls", "short wall", "3ft wall"],
  "5' Retaining Wall (LNFTXSQFT)": ["5 foot wall", "five foot wall", "tall walls", "high wall", "large retaining wall", "big wall", "5ft wall"],
  "2' Garden Walls (LNFTXSQFT)": ["garden wall", "garden walls", "short walls", "2 foot wall", "planter wall", "flower bed wall", "2ft wall"],
  "Flag stone steppers": ["bricks", "steps", "stone blocks", "stone steps", "walkway blocks", "blocks", "cinder blocks", "stepping stones", "walkway stones"],
  "Outdoor Kitchen (LNFT)": ["outdoor kitchen", "kitchen", "bbq area", "grill area", "cooking area", "outdoor cooking", "patio kitchen", "barbecue area", "grilling station", "outdoor cook space", "BBQ area"],

  // DRAINAGE SERVICES
  "Dry Creek with plants (sqft)": ["dry creek", "drainage creek", "rock creek", "creek", "dry pond", "pond", "rock bed", "dry riverbed"],
  "Buried Downspout (EACH)": ["downspout", "spout", "spouts", "gutter spout", "buried downspout", "drainage pipe", "down spout", "gutter pipe"],
  "Drainage Burying (LNFT)": ["drainage", "drain", "drain line", "drainage burying", "drainige", "water drain"],
  "EZ Flow French Drain (10' section)": ["ez flow", "french drain", "perforated pipe", "french drains", "perf pipe"],
  "Flow Well Drainage- 4X4 (EACH)": ["flow well", "drain well", "drainage well", "flow wells", "drain box"],

  // STRUCTURES
  "Intellishade Pergola (SQFT)": ["intellishade", "intellishade pergola", "adjustable pergola", "louvered pergola", "smart pergola", "intelli shade"],
  "Cedar Pergola (SQFT)": ["cedar pergola", "wood pergola", "wooden pergola", "timber pergola", "cedar structure", "traditional pergola", "wood shade structure", "cedar pergolla", "pergola", "pergolla"],

  // PLANTING SERVICES
  "Sod Install (1 pallatte-450sqft)": ["sod", "grass", "lawn", "turf", "pallet", "instant lawn", "new grass", "sod install"],
  "Seed/Straw (SQFT)": ["seed", "straw", "grass seed", "seeding", "lawn seed", "overseed", "grass starter", "seed & straw"],
  "Annuals 4\" ( 1 per sq ft)": ["small flowers", "annuals", "small plants", "bedding plants", "seasonal flowers", "small annuals", "little flowers", "4 inch flowers"],
  "Annuals 10\" ( 1 per sq ft)": ["large flowers", "big annuals", "large plants", "large bedding plants", "big seasonal flowers", "large flowering plants", "big flowers", "10 inch flowers"],
  "Perennial (1 gal)": ["perennials", "flowers", "garden plants", "flowering plants", "perennial flowers", "comeback plants", "return flowers", "perrenials"],
  "Medium Shrub": ["shrub", "bush", "medium shrub", "med shrub", "middle size bush"],
  "Large Shrub": ["large shrub", "big bush", "hedge", "lg shrub", "huge bush"],
  "Small Tree (<2in Caliper)": ["small tree", "young tree", "sapling", "starter tree", "baby tree", "sm tree"],
  "Medium Tree (2.25-4in Caliper)": ["tree", "medium tree", "shade tree", "med tree", "regular tree"],
  "Large Tree (4.25-8in Caliper)": ["large tree", "big tree", "mature tree", "lg tree", "huge tree"],

  // REMOVAL SERVICES  
  "sod removal": ["sod removal", "excavate", "dirt cleanup", "grass removal", "rip up grass", "sod takeout", "remove grass", "take out grass"],

  // EDGING SERVICES
  "Stone Edgers Tumbled": ["stone edging", "rock edging", "stone border", "rock border", "stone edges"],
  "Metal Edging": ["metal edging", "steel edging", "aluminum edging", "landscape edging", "metal border", "steel edge"],
  "Spade Edging": ["spade edging", "cut edging", "natural edging", "hand edging", "hand cut edge", "spade edge"],

  // MATERIALS SERVICES
  "Triple Ground Mulch (SQFT)": ["mulch", "black mulch", "triple ground", "wood chips", "bark mulch", "brown stuff", "mlch"],
  "Iowa Rainbow Rock Bed (sqft)": ["rainbow rock", "decorative rock", "colored rock", "river rock", "pretty rocks", "rainbow rocks"],
  "Topsoil (CUYD)": ["topsoil", "dirt", "soil", "fill dirt", "garden soil", "top soil", "good dirt"]
};

// UNIT_CONVERSIONS for flexible input handling
export const UNIT_CONVERSIONS: Record<string, string> = {
  // Square feet variations
  'sqft': 'sqft',
  'squarefeet': 'sqft',
  'squarefoot': 'sqft',
  'sq_ft': 'sqft',
  'sq.ft': 'sqft',
  'sqf': 'sqft',

  // Linear feet variations
  'linearfeet': 'linear_feet',
  'linear_feet': 'linear_feet',
  'lin_ft': 'linear_feet',
  'lnft': 'linear_feet',
  'feet': 'linear_feet',
  'ft': 'linear_feet',
  'linear': 'linear_feet',

  // Cubic yards variations
  'cubicyards': 'cubic_yards',
  'cubic_yards': 'cubic_yards',
  'cu_yd': 'cubic_yards',
  'cuyd': 'cubic_yards',
  'yards': 'cubic_yards',
  'yard': 'cubic_yards',

  // Each variations
  'each': 'each',
  'ea': 'each',
  'piece': 'each',
  'pieces': 'each'
};

// HELPER FUNCTIONS
export function findServiceBySynonym(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  for (const [serviceName, synonyms] of Object.entries(SERVICE_SYNONYMS)) {
    for (const synonym of synonyms) {
      if (lowerText.includes(synonym.toLowerCase())) {
        return serviceName;
      }
    }
  }
  
  return null;
}

export function getServiceByName(serviceName: string): ServiceConfig | null {
  return SERVICE_DATABASE[serviceName] || null;
}

export function isSpecialService(serviceName: string): boolean {
  const service = SERVICE_DATABASE[serviceName];
  return service?.special === true;
}

// DEBUGGING AND VALIDATION
export function validateServiceDatabase(): void {
  console.log(`✅ SERVICE_DATABASE loaded: ${Object.keys(SERVICE_DATABASE).length} services across ${Object.keys(SERVICE_SYNONYMS).length} synonym groups`);
  
  // Validate that all services have synonyms
  const servicesWithoutSynonyms = Object.keys(SERVICE_DATABASE).filter(
    service => !SERVICE_SYNONYMS[service]
  );
  
  if (servicesWithoutSynonyms.length > 0) {
    console.warn('⚠️ Services without synonyms:', servicesWithoutSynonyms);
  }
  
  // Validate that all synonyms have services
  const synonymsWithoutServices = Object.keys(SERVICE_SYNONYMS).filter(
    service => !SERVICE_DATABASE[service]
  );
  
  if (synonymsWithoutServices.length > 0) {
    console.warn('⚠️ Synonyms without services:', synonymsWithoutServices);
  }
}