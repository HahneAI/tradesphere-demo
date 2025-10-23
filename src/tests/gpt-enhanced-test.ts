#!/usr/bin/env node
/**
 * GPT-Enhanced Service Mapping Test
 * 
 * Tests the new GPT-powered category detection and service splitting
 * with the ServiceMappingEngine integration
 */

import { ServiceMappingEngine } from '../services/ai-engine/ServiceMappingEngine';

interface TestScenario {
  name: string;
  input: string;
  description: string;
}

class GPTEnhancedTest {
  
  private static getTestScenarios(): TestScenario[] {
    return [
      {
        name: "Smart Dimension Calculation",
        input: "need a 15x10 patio with wood chips and steel edging",
        description: "Test automatic dimension parsing (15x10 = 150 sqft) with multi-service splitting"
      },
      {
        name: "Complex Multi-Service",
        input: "200 sqft patio, 3 large trees, 150 sqft mulch, and 40 feet metal edging", 
        description: "Test complex 4-service combination across multiple categories"
      },
      {
        name: "Drainage & Hardscaping Mix",
        input: "french drain 50 feet with retaining wall and decorative rock",
        description: "Test drainage + hardscaping + materials combination"
      },
      {
        name: "Synonym Challenge",
        input: "bark chips for 12 by 8 area plus aluminum border",
        description: "Test challenging synonyms (bark chips → mulch, aluminum → metal edging)"
      },
      {
        name: "Materials & Plants",
        input: "2.5 cubic yards topsoil and 5 medium shrubs",
        description: "Test materials + planting services with proper units"
      }
    ];
  }

  /**
   * Test GPT-enhanced service mapping (async version)
   */
  static async testGPTEnhanced(): Promise<void> {
    console.log('🤖 GPT-ENHANCED SERVICE MAPPING TESTS');
    console.log('=====================================\\n');

    const scenarios = this.getTestScenarios();
    
    for (const scenario of scenarios) {
      console.log(`🧪 ${scenario.name}`);
      console.log(`📝 Input: "${scenario.input}"`);
      console.log(`💭 ${scenario.description}\\n`);
      
      try {
        // Use the new GPT-enhanced method
        const result = await ServiceMappingEngine.mapUserInputWithGPT(scenario.input);
        
        console.log(`🎯 RESULTS: ${result.services.length} services detected`);
        console.log(`📊 Overall Confidence: ${(result.confidence * 100).toFixed(0)}%`);
        
        if (result.services.length > 0) {
          console.log('📋 DETECTED SERVICES:');
          result.services.forEach((service, i) => {
            console.log(`  ${i + 1}. ${service.serviceName}`);
            console.log(`     Quantity: ${service.quantity} ${service.unit}`);
            console.log(`     Row: ${service.row} | Category: ${service.category}`);
            console.log(`     Confidence: ${(service.confidence * 100).toFixed(0)}%`);
          });
        } else {
          console.log('❌ No services detected');
        }

        console.log('\\n' + '='.repeat(60) + '\\n');
        
      } catch (error) {
        console.error(`❌ Test failed: ${error}\\n`);
      }
    }
  }

  /**
   * Test traditional service mapping (sync version) for comparison
   */
  static testTraditional(): void {
    console.log('🔍 TRADITIONAL SERVICE MAPPING TESTS (FOR COMPARISON)');
    console.log('====================================================\\n');

    const scenarios = this.getTestScenarios();
    
    for (const scenario of scenarios) {
      console.log(`🧪 ${scenario.name} (Traditional)`);
      console.log(`📝 Input: "${scenario.input}"`);
      
      try {
        // Use the traditional method
        const result = ServiceMappingEngine.mapUserInput(scenario.input);
        
        console.log(`🎯 RESULTS: ${result.services.length} services detected`);
        console.log(`📊 Overall Confidence: ${(result.confidence * 100).toFixed(0)}%`);
        
        if (result.services.length > 0) {
          console.log('📋 DETECTED SERVICES:');
          result.services.forEach((service, i) => {
            console.log(`  ${i + 1}. ${service.serviceName} (${service.quantity} ${service.unit})`);
          });
        } else {
          console.log('❌ No services detected');
        }

        console.log('\\n' + '='.repeat(50) + '\\n');
        
      } catch (error) {
        console.error(`❌ Test failed: ${error}\\n`);
      }
    }
  }

  /**
   * Compare GPT vs Traditional approaches
   */
  static async runComparison(): Promise<void> {
    console.log('🆚 GPT-ENHANCED vs TRADITIONAL COMPARISON');
    console.log('=========================================\\n');

    const testInput = "15x10 patio with wood chips and steel edging";
    
    console.log(`📝 Test Input: "${testInput}"\\n`);

    // Traditional approach
    console.log('🔍 TRADITIONAL APPROACH:');
    const traditionalResult = ServiceMappingEngine.mapUserInput(testInput);
    console.log(`Services: ${traditionalResult.services.length} | Confidence: ${(traditionalResult.confidence * 100).toFixed(0)}%`);
    traditionalResult.services.forEach((service, i) => {
      console.log(`  ${i + 1}. ${service.serviceName} (${service.quantity} ${service.unit})`);
    });

    console.log('\\n🤖 GPT-ENHANCED APPROACH:');
    const gptResult = await ServiceMappingEngine.mapUserInputWithGPT(testInput);
    console.log(`Services: ${gptResult.services.length} | Confidence: ${(gptResult.confidence * 100).toFixed(0)}%`);
    gptResult.services.forEach((service, i) => {
      console.log(`  ${i + 1}. ${service.serviceName} (${service.quantity} ${service.unit})`);
    });

    console.log('\\n📈 COMPARISON SUMMARY:');
    console.log(`Traditional: ${traditionalResult.services.length} services`);
    console.log(`GPT-Enhanced: ${gptResult.services.length} services`);
    console.log(`Improvement: ${gptResult.services.length > traditionalResult.services.length ? '✅ Better' : traditionalResult.services.length > gptResult.services.length ? '❌ Worse' : '🟡 Same'}`);
  }
}

// Command line interface
async function main() {
  const mode = process.env.TEST_MODE || 'gpt';
  const singleInput = process.env.TEST_INPUT;

  if (singleInput) {
    // Single input test
    console.log(`🔍 SINGLE INPUT TEST: "${singleInput}"\\n`);
    
    if (mode === 'gpt') {
      const result = await ServiceMappingEngine.mapUserInputWithGPT(singleInput);
      console.log(`\\n✅ GPT-Enhanced Result: ${result.services.length} services detected`);
    } else {
      const result = ServiceMappingEngine.mapUserInput(singleInput);
      console.log(`\\n✅ Traditional Result: ${result.services.length} services detected`);
    }
    
  } else {
    // Full test suite
    switch (mode) {
      case 'gpt':
        await GPTEnhancedTest.testGPTEnhanced();
        break;
      case 'traditional':
        GPTEnhancedTest.testTraditional();
        break;
      case 'comparison':
      default:
        await GPTEnhancedTest.runComparison();
        break;
    }
  }
}

// Help
if (process.argv.includes('--help')) {
  console.log(`
GPT-Enhanced Service Mapping Test

Usage:
  tsx src/tests/gpt-enhanced-test.ts                           # Run comparison
  TEST_MODE=gpt tsx src/tests/gpt-enhanced-test.ts             # Run GPT tests
  TEST_MODE=traditional tsx src/tests/gpt-enhanced-test.ts     # Run traditional tests
  TEST_INPUT="patio with mulch" tsx src/tests/gpt-enhanced-test.ts  # Single test

Environment Variables:
  TEST_MODE        - Test mode: 'gpt', 'traditional', 'comparison'
  TEST_INPUT       - Single input to test
  OPENAI_API_KEY_MINI - OpenAI API key (optional, uses mock mode if not provided)
`);
  process.exit(0);
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('gpt-enhanced-test.ts')) {
  main().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}