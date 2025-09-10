#!/usr/bin/env node
/**
 * Real Logic Verification Test
 * 
 * CRITICAL: Test that the "mock" implementations now use REAL ServiceMappingEngine
 * instead of hardcoded pattern matching
 */

import { PipelineFactory } from '../services/pipeline/PipelineFactory';

async function testRealLogic() {
  console.log('🧪 TESTING REAL LOGIC IMPLEMENTATION');
  console.log('====================================\n');
  
  const testCases = [
    {
      name: 'Previous hardcoded case: 45 sqft',
      input: '45 sq ft triple ground mulch and 3 feet metal edging',
      expectedServices: 2,
      expectedCost: 81.75 // 45 * 1.25 + 3 * 8.50
    },
    {
      name: 'NEW VARIATION: 44 sqft (should NOT be hardcoded)',
      input: '44 sq ft triple ground mulch and 3 feet metal edging',
      expectedServices: 2,
      expectedCost: 80.50 // 44 * 1.25 + 3 * 8.50 = 55 + 25.50
    },
    {
      name: 'Different quantities: 75 sqft + 2ft',
      input: '75 square feet triple ground mulch and 2 feet metal edging',
      expectedServices: 2,
      expectedCost: 110.75 // 75 * 1.25 + 2 * 8.50 = 93.75 + 17
    },
    {
      name: 'Synonym test: wood chips = mulch',
      input: '50 square feet wood chips and 4 linear feet steel edging',
      expectedServices: 2,
      expectedCost: 96.50 // 50 * 1.25 + 4 * 8.50 = 62.50 + 34
    }
  ];

  let passedTests = 0;
  const pipeline = PipelineFactory.createMock(false);

  for (const testCase of testCases) {
    console.log(`🎯 ${testCase.name}`);
    console.log(`📝 Input: "${testCase.input}"`);
    
    try {
      const result = await pipeline.process(testCase.input);
      
      if (result.success && result.finalResult) {
        const actualServices = result.finalResult.services.length;
        const actualCost = result.finalResult.totals.totalCost;
        
        console.log(`  Services found: ${actualServices} (expected: ${testCase.expectedServices})`);
        console.log(`  Total cost: $${actualCost.toFixed(2)} (expected: $${testCase.expectedCost.toFixed(2)})`);
        
        // Check services
        result.finalResult.services.forEach((service, i) => {
          console.log(`    ${i+1}. ${service.serviceName}: ${service.quantity} ${service.unit} @ row ${service.row}`);
        });
        
        const serviceMatch = actualServices === testCase.expectedServices;
        const costMatch = Math.abs(actualCost - testCase.expectedCost) < 0.01;
        
        if (serviceMatch && costMatch) {
          console.log('  ✅ PASS: Real logic working correctly');
          passedTests++;
        } else {
          console.log('  ❌ FAIL: Logic issues detected');
          if (!serviceMatch) console.log(`    - Service count mismatch`);
          if (!costMatch) console.log(`    - Cost calculation error`);
        }
      } else {
        console.log('  ❌ FAIL: Pipeline execution failed');
        if (result.clarificationNeeded) {
          console.log('    - Clarification needed:', result.clarificationQuestions);
        }
      }
    } catch (error) {
      console.log(`  💥 ERROR: ${error.message}`);
    }
    
    console.log('');
  }

  const successRate = (passedTests / testCases.length) * 100;
  console.log(`📊 RESULTS: ${passedTests}/${testCases.length} tests passed (${successRate.toFixed(0)}%)\n`);

  if (successRate >= 75) {
    console.log('✅ REAL LOGIC CONFIRMED: System uses genuine NLP parsing');
    console.log('🎯 Service detection adapts to quantity variations');
    console.log('💰 Pricing calculations scale proportionally');
  } else {
    console.log('❌ FAKE LOGIC DETECTED: System still uses hardcoded patterns');
    console.log('⚠️ Service detection fails on input variations');
    console.log('🚨 Manual review required');
  }

  return successRate >= 75;
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('real-logic-test.ts')) {
  testRealLogic()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

export { testRealLogic };