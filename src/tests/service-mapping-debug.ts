#!/usr/bin/env node
/**
 * ServiceMappingEngine Debug Runner
 * 
 * Direct testing of ServiceMappingEngine.mapUserInput() with detailed debugging
 * Use with VS Code debugger to step through the exact logic flow
 */

import { ServiceMappingEngine } from '../services/ai-engine/ServiceMappingEngine';

async function debugServiceMapping() {
  const testInput = process.env.TEST_INPUT || '44 square feet of triple ground mulch';
  const shouldBreak = process.env.BREAK_ON_MATCH === 'true';
  
  console.log('🔍 SERVICEMAPPINGENGINE DEBUG SESSION');
  console.log('====================================');
  console.log(`📝 Test Input: "${testInput}"`);
  console.log(`🐛 Break on Match: ${shouldBreak}`);
  console.log('');
  
  try {
    console.log('🚀 Starting ServiceMappingEngine.mapUserInput()...');
    
    if (shouldBreak) {
      // Add a breakpoint opportunity here
      debugger; // VS Code will break here if debugging
    }
    
    const result = ServiceMappingEngine.mapUserInput(testInput);
    
    console.log('\n📊 FINAL ANALYSIS:');
    console.log('==================');
    console.log(`Services Found: ${result.services.length}`);
    console.log(`Overall Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    console.log(`Needs Clarification: ${result.needsClarification}`);
    console.log(`Unmapped Text: [${result.unmappedText.join(', ')}]`);
    
    if (result.services.length > 0) {
      console.log('\n✅ SERVICES DETECTED:');
      result.services.forEach((service, i) => {
        console.log(`${i+1}. ${service.serviceName}`);
        console.log(`   Quantity: ${service.quantity} ${service.unit}`);
        console.log(`   Row: ${service.row}`);
        console.log(`   Category: ${service.category}`);
        console.log(`   Confidence: ${(service.confidence * 100).toFixed(0)}%`);
        console.log(`   Special: ${service.isSpecial}`);
        console.log(`   Original: "${service.originalText}"`);
      });
    } else {
      console.log('\n❌ NO SERVICES DETECTED');
      console.log('Check the debug output above for failure points');
    }
    
    if (result.clarificationQuestions.length > 0) {
      console.log('\n❓ CLARIFICATION QUESTIONS:');
      result.clarificationQuestions.forEach((q, i) => {
        console.log(`${i+1}. ${q}`);
      });
    }
    
    return result.services.length > 0;
    
  } catch (error) {
    console.error('💥 SERVICEMAPPINGENGINE ERROR:', error);
    return false;
  }
}

// Test variations if no specific input provided
async function runTestSuite() {
  const testCases = [
    '44 square feet of triple ground mulch',
    '75 sqft mulch and 3 linear feet metal edging',
    'install 50 square feet wood chips',
    '2.5 cubic yards topsoil',
    'paver patio 100 square feet'
  ];
  
  console.log('🧪 RUNNING SERVICEMAPPINGENGINE TEST SUITE');
  console.log('===========================================\n');
  
  for (const testCase of testCases) {
    console.log(`🎯 Testing: "${testCase}"`);
    process.env.TEST_INPUT = testCase;
    
    const success = await debugServiceMapping();
    console.log(`Result: ${success ? '✅ SUCCESS' : '❌ FAILED'}\n`);
  }
}

// Command line interface
async function main() {
  try {
    if (process.env.TEST_INPUT) {
      // Single test from environment variable
      const success = await debugServiceMapping();
      process.exit(success ? 0 : 1);
    } else {
      // Run full test suite
      await runTestSuite();
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Debug session failed:', error);
    process.exit(1);
  }
}

// Help
if (process.argv.includes('--help')) {
  console.log(`
ServiceMappingEngine Debug Runner

Usage:
  tsx src/tests/service-mapping-debug.ts                    # Run test suite
  TEST_INPUT="44 sqft mulch" tsx src/tests/service-mapping-debug.ts  # Single test
  
Environment Variables:
  TEST_INPUT        - Specific input to test
  BREAK_ON_MATCH   - Set to 'true' to trigger debugger breakpoint
  
VS Code Debug:
  Use "🔍 ServiceMappingEngine Debug" configurations for step-through debugging
`);
  process.exit(0);
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('service-mapping-debug.ts')) {
  main();
}

export { debugServiceMapping };