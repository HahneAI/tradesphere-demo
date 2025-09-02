#!/usr/bin/env node
/**
 * Comprehensive Multi-Service Debug Testing
 * 
 * Enhanced testing suite for complete service validation with clean JSON output
 * Perfect for Google Sheets API integration testing
 */

import { ServiceMappingEngine } from '../services/ai-engine/ServiceMappingEngine';

interface CleanServiceOutput {
  serviceName: string;
  quantity: number;
  unit: string;
  row: number;
  category: string;
  confidence: number;
}

interface TestScenario {
  name: string;
  input: string;
  expectedServices: number;
  description: string;
}

class ComprehensiveMultiServiceDebugger {
  
  /**
   * Comprehensive test scenarios covering all service categories
   */
  private static getTestScenarios(): TestScenario[] {
    return [
      // SINGLE SERVICE TESTS
      {
        name: "Single Hardscaping",
        input: "200 square feet paver patio",
        expectedServices: 1,
        description: "Test single hardscaping service with area calculation"
      },
      {
        name: "Single Planting (Count)",
        input: "5 large trees",
        expectedServices: 1,
        description: "Test single planting service with count unit"
      },
      {
        name: "Single Materials (Volume)",
        input: "3.5 cubic yards topsoil",
        expectedServices: 1,
        description: "Test single materials service with volume unit"
      },

      // TWO-SERVICE COMBINATIONS
      {
        name: "Hardscaping + Materials",
        input: "150 sqft patio and 100 sqft mulch",
        expectedServices: 2,
        description: "Test patio with mulch combination"
      },
      {
        name: "Materials + Edging",
        input: "75 square feet wood chips and 25 linear feet steel edging",
        expectedServices: 2,
        description: "Test materials with linear edging"
      },
      {
        name: "Planting Combo",
        input: "3 medium trees and 8 large shrubs",
        expectedServices: 2,
        description: "Test multiple planting services"
      },

      // THREE-SERVICE COMPLEX
      {
        name: "Triple Complex (Hardscape + Materials + Edging)",
        input: "200 sqft patio, 150 sqft mulch, and 40 feet metal edging",
        expectedServices: 3,
        description: "Test complex three-service combination"
      },
      {
        name: "Removal + Materials + Planting",
        input: "sod removal 250 sqft, topsoil 4 cubic yards, and 2 small trees",
        expectedServices: 3,
        description: "Test removal with materials and planting"
      },

      // DIMENSION CALCULATIONS
      {
        name: "Dimension Calculation (15x10 patio)",
        input: "need a 15x10 patio with wood chips",
        expectedServices: 2,
        description: "Test automatic dimension calculation (15x10 = 150 sqft)"
      },
      {
        name: "Mixed Dimension Formats",
        input: "mulch for 12 by 8 area and edging around it",
        expectedServices: 2,
        description: "Test dimension parsing with related services"
      },

      // SYNONYM STRESS TESTS
      {
        name: "Synonym Challenge",
        input: "bark chips, aluminum edging, and fill dirt 2 cubic yards",
        expectedServices: 3,
        description: "Test challenging synonym recognition"
      },
      {
        name: "Alternative Naming",
        input: "stone patio 180 sqft with decorative rock bed",
        expectedServices: 2,
        description: "Test alternative service naming"
      },

      // DRAINAGE SERVICES
      {
        name: "Drainage Combo",
        input: "french drain 50 feet with 2 downspouts and flow well",
        expectedServices: 3,
        description: "Test multiple drainage services"
      },
      {
        name: "Drainage + Hardscaping",
        input: "dry creek 75 sqft and retaining wall 20 feet",
        expectedServices: 2,
        description: "Test drainage with hardscaping"
      },

      // MIXED CATEGORIES (Ultimate Test)
      {
        name: "Ultimate Mixed Categories",
        input: "paver patio 200 sqft, 3 large trees, mulch 150 sqft, french drain 30 feet, and topsoil 2 cubic yards",
        expectedServices: 5,
        description: "Test all categories together (hardscaping + planting + materials + drainage)"
      }
    ];
  }

  /**
   * Convert ServiceMappingEngine result to clean JSON format
   */
  private static formatToCleanOutput(result: any): CleanServiceOutput[] {
    if (!result || !result.services) return [];

    return result.services.map((service: any) => ({
      serviceName: service.serviceName,
      quantity: service.quantity,
      unit: service.unit,
      row: service.row,
      category: service.category,
      confidence: Math.round(service.confidence * 100)
    }));
  }

  /**
   * Run comprehensive multi-service testing
   */
  static async runComprehensiveTests(): Promise<void> {
    console.log('🚀 COMPREHENSIVE MULTI-SERVICE DEBUG TESTING');
    console.log('==============================================\n');

    const scenarios = this.getTestScenarios();
    const results: { scenario: TestScenario; success: boolean; output: CleanServiceOutput[]; issues: string[] }[] = [];

    for (const scenario of scenarios) {
      console.log(`🧪 ${scenario.name}`);
      console.log(`📝 Input: "${scenario.input}"`);
      console.log(`💭 Expected: ${scenario.expectedServices} service(s) - ${scenario.description}`);
      
      try {
        const result = ServiceMappingEngine.mapUserInput(scenario.input);
        const cleanOutput = this.formatToCleanOutput(result);
        const issues: string[] = [];

        // Validation checks
        if (cleanOutput.length !== scenario.expectedServices) {
          issues.push(`Expected ${scenario.expectedServices} services, got ${cleanOutput.length}`);
        }

        // Row validation (must be 2-33, excluding 15-16)
        cleanOutput.forEach(service => {
          if (service.row < 2 || service.row > 33 || service.row === 15 || service.row === 16) {
            issues.push(`Invalid row ${service.row} for ${service.serviceName}`);
          }
        });

        // Unit validation
        const validUnits = ['sqft', 'linear_feet', 'each', 'cubic_yards'];
        cleanOutput.forEach(service => {
          if (!validUnits.includes(service.unit)) {
            issues.push(`Invalid unit "${service.unit}" for ${service.serviceName}`);
          }
        });

        const success = issues.length === 0;
        results.push({ scenario, success, output: cleanOutput, issues });

        console.log(`🎯 Result: ${success ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`📊 Services Found: ${cleanOutput.length}`);
        
        if (cleanOutput.length > 0) {
          console.log('📋 CLEAN JSON OUTPUT:');
          console.log(JSON.stringify(cleanOutput, null, 2));
        }

        if (issues.length > 0) {
          console.log('⚠️ Issues:');
          issues.forEach(issue => console.log(`   - ${issue}`));
        }

      } catch (error) {
        console.log(`❌ ERROR: ${error}`);
        results.push({ 
          scenario, 
          success: false, 
          output: [], 
          issues: [`Exception: ${error}`] 
        });
      }

      console.log(''); // Empty line between tests
    }

    // Summary Report
    const totalTests = results.length;
    const passedTests = results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    console.log('📊 COMPREHENSIVE TEST SUMMARY');
    console.log('==============================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%\n`);

    if (failedTests > 0) {
      console.log('🔍 FAILED TEST ANALYSIS:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`❌ ${result.scenario.name}: ${result.issues.join(', ')}`);
      });
      console.log('');
    }

    // Service Coverage Report
    const allServices = results.flatMap(r => r.output.map(s => s.serviceName));
    const uniqueServices = [...new Set(allServices)];
    
    console.log(`🎯 SERVICE COVERAGE: ${uniqueServices.length} unique services tested`);
    uniqueServices.forEach(service => {
      const count = allServices.filter(s => s === service).length;
      console.log(`   - ${service}: ${count} time(s)`);
    });

    console.log(`\n✅ Comprehensive multi-service testing completed!`);
    console.log(`🔗 Ready for Google Sheets API integration`);
  }

  /**
   * Test specific input from environment variable
   */
  static testSingleInput(input: string): CleanServiceOutput[] {
    console.log(`🔍 SINGLE INPUT TEST: "${input}"`);
    console.log('==================================\n');

    try {
      const result = ServiceMappingEngine.mapUserInput(input);
      const cleanOutput = this.formatToCleanOutput(result);

      console.log(`📊 Services Found: ${cleanOutput.length}`);
      console.log('📋 CLEAN JSON OUTPUT:');
      console.log(JSON.stringify(cleanOutput, null, 2));

      return cleanOutput;
    } catch (error) {
      console.error(`❌ Error: ${error}`);
      return [];
    }
  }
}

// Command line interface
async function main() {
  const testInput = process.env.TEST_INPUT;
  
  if (testInput) {
    // Single test
    ComprehensiveMultiServiceDebugger.testSingleInput(testInput);
  } else {
    // Full comprehensive test suite
    await ComprehensiveMultiServiceDebugger.runComprehensiveTests();
  }
}

// Help
if (process.argv.includes('--help')) {
  console.log(`
Comprehensive Multi-Service Debug Testing

Usage:
  tsx src/tests/comprehensive-multi-service-debug.ts                 # Run full test suite
  TEST_INPUT="200 sqft patio and mulch" tsx src/tests/comprehensive-multi-service-debug.ts  # Single test

Features:
  - Clean JSON output ready for Google Sheets API
  - Comprehensive service validation (rows 2-33, excluding 15-16)
  - Multi-category testing (hardscaping + planting + materials + drainage)
  - Synonym stress testing
  - Dimension calculation validation
  - Unit compatibility verification
`);
  process.exit(0);
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('comprehensive-multi-service-debug.ts')) {
  main();
}

export { ComprehensiveMultiServiceDebugger };