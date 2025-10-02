/**
 * TradeSphere Service Database Configuration - Master Formula Focus
 *
 * SIMPLIFIED: Master formula primary system with paver patio as main service
 * Google Sheets integration disabled - Services tab expansion coming
 *
 * Updated to focus on paver patio master formula with row 999 routing flag
 */

export interface ServiceConfig {
  row: number;
  unit: 'sqft' | 'linear_feet' | 'each' | 'cubic_yards';
  category: 'hardscaping' | 'drainage' | 'structures' | 'planting' | 'removal' | 'edging' | 'materials';
  special?: boolean; // For services requiring special handling
  masterFormula?: boolean; // Flag for master formula routing
  defaultVariables?: {
    excavation?: {
      tearoutComplexity?: string;
      equipmentRequired?: string;
    };
    siteAccess?: {
      accessDifficulty?: string;
      obstacleRemoval?: string;
    };
    materials?: {
      paverStyle?: string;
      cuttingComplexity?: string;
      patternComplexity?: string;
    };
    labor?: {
      teamSize?: string;
    };
    complexity?: {
      overallComplexity?: number;
    };
  };
}

// SIMPLIFIED SERVICE DATABASE - Master Formula Focus
// Full 31-service database commented out - expanding via Services tab
export const SERVICE_DATABASE: Record<string, ServiceConfig> = {
  // PRIMARY SERVICE - Master Formula Integration
  "Paver Patio (SQFT)": {
    row: 999, // Master formula flag (not Google Sheets row)
    unit: "sqft",
    category: "hardscaping",
    masterFormula: true, // Flag for master formula routing
    defaultVariables: {
      // True baseline values that result in exactly 24 hours for 100 sqft
      // These match getTrueBaselineValues() from paverPatioStore.ts:50-58
      excavation: {
        tearoutComplexity: 'grass',
        equipmentRequired: 'handTools'
      },
      siteAccess: {
        accessDifficulty: 'easy',
        obstacleRemoval: 'none'
      },
      materials: {
        paverStyle: 'standard',
        cuttingComplexity: 'minimal',
        patternComplexity: 'minimal'
      },
      labor: {
        teamSize: 'threePlus'
      },
      complexity: {
        overallComplexity: 'simple'
      }
    }
  },

  // FUTURE: Additional services will be added via Services database tab
  // All new services will use master formula approach, not Google Sheets
};

// SERVICE SYNONYMS - Simplified for paver patio focus
export const SERVICE_SYNONYMS: Record<string, string[]> = {
  "Paver Patio (SQFT)": [
    "paver patio", "stone patio", "brick patio", "flagstone patio",
    "patio pavers", "hardscape patio", "outdoor patio", "backyard patio",
    "bluestone patio", "travertine patio", "natural stone patio"
  ]
};

// CATEGORY SYNONYMS - Focused on hardscaping
export const CATEGORY_SYNONYMS: Record<string, string[]> = {
  hardscaping: ["hardscape", "hardscaping", "patio", "pavers", "stonework", "masonry", "outdoor living"]
};

// Helper function to get default variables for a service
export function getServiceDefaultVariables(serviceName: string) {
  const service = SERVICE_DATABASE[serviceName];
  return service?.defaultVariables || null;
}

// Helper function to get default variables for paver patio service
export function getPaverPatioServiceDefaults() {
  return getServiceDefaultVariables("Paver Patio (SQFT)");
}

// Initialization logging
if (typeof window === 'undefined') {
  console.log(`✅ SERVICE_DATABASE loaded: ${Object.keys(SERVICE_DATABASE).length} services (Master Formula Focus)`);
  console.log('📋 Google Sheets integration disabled - Services expansion via database tab coming');
  console.log('🔧 Default variables configured for admin-editable service settings');
}

/* COMMENTED OUT - Original 31 Service Google Sheets Database
 * These will be migrated to Services database tab expansion system
 *
 * Original content included:
 *
 * HARDSCAPING SERVICES (6 services):
 * - "Paver Patio (SQFT)" (row 2)
 * - "3' Retaining wall (LNFT X SQFT)" (row 3)
 * - "5' Retaining Wall (LNFTXSQFT)" (row 4)
 * - "2' Garden Walls (LNFTXSQFT)" (row 5)
 * - "Flag stone steppers" (row 6)
 * - "Outdoor Kitchen (LNFT)" (row 12)
 *
 * DRAINAGE SERVICES (5 services):
 * - "Dry Creek with plants (sqft)" (row 7)
 * - "Buried Downspout (EACH)" (row 8)
 * - "Drainage Burying (LNFT)" (row 9)
 * - "EZ Flow French Drain (10' section)" (row 10)
 * - "Flow Well Drainage- 4X4 (EACH)" (row 11)
 *
 * STRUCTURES (2 services):
 * - "Intellishade Pergola (SQFT)" (row 13)
 * - "Cedar Pergola (SQFT)" (row 14)
 *
 * PLANTING SERVICES (9 services):
 * - "Sod Install (1 pallatte-450sqft)" (row 17)
 * - "Seed/Straw (SQFT)" (row 18)
 * - "Annuals 4\" ( 1 per sq ft)" (row 26)
 * - "Annuals 10\" ( 1 per sq ft)" (row 27)
 * - "Perennial (1 gal)" (row 28)
 * - "Medium Shrub" (row 29)
 * - "Large Shrub" (row 30)
 * - "Small Tree (<2in Caliper)" (row 31)
 * - "Medium Tree (2.25-4in Caliper)" (row 32)
 * - "Large Tree (4.25-8in Caliper)" (row 33)
 *
 * REMOVAL SERVICES (1 service):
 * - "sod removal" (row 19)
 *
 * EDGING SERVICES (3 services):
 * - "Stone Edgers Tumbled" (row 20)
 * - "Steel Edging" (row 21)
 * - "Aluminum Edging" (row 22)
 *
 * MATERIALS SERVICES (5 services):
 * - "Mulch (CYDS)" (row 23)
 * - "TopSoil (CYDS)" (row 24)
 * - "River Rock (CYDS)" (row 25)
 * - "Playground mulch Rainbow (CYDS)" (rows 34-35)
 *
 * Full service database available in git history for reference
 * Will be restored through Services database tab expansion system
 */