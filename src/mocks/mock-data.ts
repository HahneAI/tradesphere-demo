/**
 * TradeSphere Mock Data - Real Service Pricing
 * 
 * Contains exact pricing data for our 2 test cases using real Google Sheets values.
 * Based on production "NEW Quick Estimating Calculator" data.
 * 
 * CRITICAL: These are real service names and pricing from our actual database.
 */

import { ServiceConfig } from '../pricing-system/core/services-database/service-database';

// Real pricing data for mock testing (based on production averages)
export const MOCK_SERVICE_PRICING: Record<string, {
  laborHours: number;
  costPerUnit: number;
  materialCost: number;
  totalCost: number;
}> = {
  // Row 23 - Triple Ground Mulch (SQFT) 
  "Triple Ground Mulch (SQFT)": {
    laborHours: 0.05,      // 5 minutes per sq ft
    costPerUnit: 1.25,     // $1.25 per sq ft
    materialCost: 0.45,    // Material cost component
    totalCost: 1.25        // Final per-unit cost
  },
  
  // Row 18 - Metal Edging
  "Metal Edging": {
    laborHours: 0.75,      // 45 minutes per linear foot
    costPerUnit: 8.50,     // $8.50 per linear foot
    materialCost: 3.25,    // Material cost component  
    totalCost: 8.50        // Final per-unit cost
  }
};

// Mock Google Sheets calculation responses
export const MOCK_SHEETS_RESPONSES = {
  // Single service calculations
  singleService: {
    mulch100: {
      service: "Triple Ground Mulch (SQFT)",
      quantity: 100,
      row: 23,
      laborHours: 5.0,      // 100 * 0.05
      cost: 125.00,         // 100 * 1.25
      calculationTime: 150
    },
    mulch45: {
      service: "Triple Ground Mulch (SQFT)", 
      quantity: 45,
      row: 23,
      laborHours: 2.25,     // 45 * 0.05
      cost: 56.25,          // 45 * 1.25
      calculationTime: 120
    },
    edging3: {
      service: "Metal Edging",
      quantity: 3,
      row: 18,
      laborHours: 2.25,     // 3 * 0.75
      cost: 25.50,          // 3 * 8.50
      calculationTime: 110
    }
  },
  
  // Multi-service calculation
  multiService: {
    mulchAndEdging: {
      services: [
        {
          service: "Triple Ground Mulch (SQFT)",
          quantity: 45,
          row: 23,
          laborHours: 2.25,
          cost: 56.25
        },
        {
          service: "Metal Edging", 
          quantity: 3,
          row: 18,
          laborHours: 2.25,
          cost: 25.50
        }
      ],
      totals: {
        totalLaborHours: 4.5,    // 2.25 + 2.25
        totalCost: 81.75         // 56.25 + 25.50
      },
      calculationTime: 175
    }
  }
};

// Mock AI parameter extraction responses
export const MOCK_AI_RESPONSES = {
  // Test Case 1: Multi-service
  multiService: {
    input: "45 sq ft triple ground mulch and 3 feet metal edging",
    response: {
      status: 'ready_for_pricing' as const,
      services: [
        {
          serviceName: "Triple Ground Mulch (SQFT)",
          quantity: 45,
          unit: "sqft",
          row: 23,
          isSpecial: false
        },
        {
          serviceName: "Metal Edging",
          quantity: 3, 
          unit: "linear_feet",
          row: 18,
          isSpecial: false
        }
      ],
      missingInfo: [],
      clarifyingQuestions: [],
      confidence: 0.95,
      suggestedResponse: ""
    }
  },
  
  // Test Case 2: Simple mulch
  simple: {
    input: "100 square feet of mulch",
    response: {
      status: 'ready_for_pricing' as const,
      services: [
        {
          serviceName: "Triple Ground Mulch (SQFT)",
          quantity: 100,
          unit: "sqft", 
          row: 23,
          isSpecial: false
        }
      ],
      missingInfo: [],
      clarifyingQuestions: [],
      confidence: 0.92,
      suggestedResponse: ""
    }
  }
};

// Expected Make.com parity results for comparison
export const MAKE_COM_EXPECTED_RESULTS = {
  // Test Case 1: Multi-service
  multiService: {
    input: "45 sq ft triple ground mulch and 3 feet metal edging",
    expected: {
      servicesFound: 2,
      totalCost: 81.75,       // $56.25 + $25.50
      totalHours: 4.5,        // 2.25 + 2.25
      processingTime: 35000,  // 35s average for Make.com
      confidence: 0.95,
      stage: 'pricing_calculation' as const,
      responseIncludes: [
        "Triple Ground Mulch",
        "Metal Edging", 
        "45",
        "3",
        "$81.75",
        "4.5"
      ]
    }
  },
  
  // Test Case 2: Simple
  simple: {
    input: "100 square feet of mulch",
    expected: {
      servicesFound: 1,
      totalCost: 125.00,      // 100 * $1.25
      totalHours: 5.0,        // 100 * 0.05
      processingTime: 32000,  // 32s average for Make.com
      confidence: 0.92,
      stage: 'pricing_calculation' as const,
      responseIncludes: [
        "Triple Ground Mulch",
        "100",
        "sqft", 
        "$125.00",
        "5.0"
      ]
    }
  }
};

// Performance benchmarks (our targets vs Make.com)
export const PERFORMANCE_TARGETS = {
  makeComAverage: {
    responseTime: 35000,     // 35 seconds
    tokenUsage: 18500,       // ~18.5k tokens
    modules: 22              // 22 Make.com modules
  },
  ourTarget: {
    responseTime: 5000,      // 5 seconds (goal)
    tokenUsage: 2500,        // ~2.5k tokens
    modules: 1               // Single Netlify function
  },
  improvement: {
    speedUp: 7.0,           // 7x faster
    tokenReduction: 0.135,  // 86.5% reduction
    moduleReduction: 0.045  // 95.5% reduction
  }
};

// Mock customer context for testing
export const MOCK_CUSTOMER_CONTEXT = {
  default: {
    firstName: 'TestUser',
    jobTitle: 'Property Manager',
    isReturnCustomer: false,
    urgencyLevel: 'routine' as const
  },
  premium: {
    firstName: 'Alexandra',
    jobTitle: 'Estate Manager', 
    isReturnCustomer: true,
    urgencyLevel: 'routine' as const
  }
};

// Mock session data
export const MOCK_SESSION_DATA = {
  sessionId: 'mock-session-12345',
  timestamp: '2024-01-15T10:30:00.000Z',
  source: 'mock-testing',
  techId: 'tech-001',
  betaCodeId: 1
};