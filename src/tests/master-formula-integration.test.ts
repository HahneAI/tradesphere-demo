/**
 * Master Formula Integration Test
 *
 * Tests the end-to-end integration of paver patio master formula routing
 * from GPTServiceSplitter → ParameterCollectorService → PricingCalculatorService
 */

import { GPTServiceSplitter } from '../services/ai-engine/GPTServiceSplitter';
import { ParameterCollectorService } from '../services/ai-engine/ParameterCollectorService';
import { PricingCalculatorService } from '../services/ai-engine/PricingCalculatorService';

/**
 * Test the complete master formula integration flow
 */
async function testMasterFormulaIntegration() {
  console.log('🧪 MASTER FORMULA INTEGRATION TEST START');
  console.log('='.repeat(60));

  try {
    // Step 1: Test GPTServiceSplitter detection
    console.log('\n📝 STEP 1: Testing GPTServiceSplitter paver patio detection');

    const testInput = '200 sqft paver patio removing concrete with tight access';
    const splitter = new GPTServiceSplitter();

    console.log(`Input: "${testInput}"`);
    const splitResult = await splitter.analyzeAndSplit(testInput);

    console.log('Split Result:', {
      categories: splitResult.detected_categories,
      services: splitResult.separated_services,
      confidence: splitResult.confidence,
      masterFormulaMode: splitResult.masterFormulaMode
    });

    if (!splitResult.masterFormulaMode) {
      throw new Error('❌ Master formula mode not detected for paver patio request');
    }
    console.log('✅ STEP 1 PASSED: Master formula mode correctly detected');

    // Step 2: Test ParameterCollectorService routing
    console.log('\n🎯 STEP 2: Testing ParameterCollectorService paver patio routing');

    const collectionResult = await ParameterCollectorService.collectParametersWithSplitServices(
      testInput,
      splitResult
    );

    console.log('Collection Result:', {
      status: collectionResult.status,
      servicesCount: collectionResult.services.length,
      confidence: collectionResult.confidence,
      paverPatioService: collectionResult.services[0]?.serviceName
    });

    if (collectionResult.services.length === 0 ||
        collectionResult.services[0].serviceName !== 'Paver Patio (SQFT)') {
      throw new Error('❌ Paver patio service not correctly created');
    }

    if (!collectionResult.services[0].specialRequirements?.paverPatioValues) {
      throw new Error('❌ Paver patio variables not extracted');
    }
    console.log('✅ STEP 2 PASSED: Paver patio service created with variables');

    // Step 3: Test PricingCalculatorService master formula routing
    console.log('\n💰 STEP 3: Testing PricingCalculatorService master formula calculation');

    const calculator = new PricingCalculatorService();
    const pricingResult = await calculator.calculatePricing(collectionResult.services);

    console.log('Pricing Result:', {
      success: pricingResult.success,
      totalCost: pricingResult.totals.totalCost,
      totalHours: pricingResult.totals.totalLaborHours,
      serviceCategory: pricingResult.services[0]?.category,
      calculationTime: pricingResult.calculationTime
    });

    if (!pricingResult.success) {
      throw new Error(`❌ Master formula calculation failed: ${pricingResult.error}`);
    }

    if (pricingResult.totals.totalCost <= 0 || pricingResult.totals.totalLaborHours <= 0) {
      throw new Error('❌ Invalid master formula calculation results');
    }

    if (pricingResult.services[0]?.row !== 999) {
      throw new Error('❌ Service not correctly marked as master formula (row should be 999)');
    }
    console.log('✅ STEP 3 PASSED: Master formula calculation successful');

    // Success summary
    console.log('\n🎉 INTEGRATION TEST RESULTS:');
    console.log('='.repeat(60));
    console.log(`✅ Service Detection: ${splitResult.masterFormulaMode ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Variable Extraction: PASSED (confidence: ${(collectionResult.confidence * 100).toFixed(1)}%)`);
    console.log(`✅ Master Formula Calculation: PASSED`);
    console.log(`💰 Final Quote: $${pricingResult.totals.totalCost.toFixed(2)} | ${pricingResult.totals.totalLaborHours.toFixed(1)} hours`);
    console.log(`⚡ Calculation Time: ${pricingResult.calculationTime}ms`);
    console.log('\n🚀 MASTER FORMULA INTEGRATION: ALL TESTS PASSED!');

    return {
      success: true,
      testResults: {
        detection: splitResult.masterFormulaMode,
        extraction: collectionResult.confidence,
        calculation: pricingResult.success,
        totalCost: pricingResult.totals.totalCost,
        totalHours: pricingResult.totals.totalLaborHours
      }
    };

  } catch (error) {
    console.error('\n❌ INTEGRATION TEST FAILED:', error.message);
    console.log('\n🚨 MASTER FORMULA INTEGRATION: TEST FAILED!');
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test with various paver patio request formats
 */
async function testVariousPaverPatioFormats() {
  console.log('\n🔄 TESTING VARIOUS PAVER PATIO REQUEST FORMATS');
  console.log('='.repeat(60));

  const testCases = [
    '150 sqft paver patio',
    '12x15 patio removing grass',
    '20x20 paver patio with premium materials',
    'paver patio 300 square feet difficult access',
    '15x10 stone patio removing concrete'
  ];

  const results = [];

  for (const testCase of testCases) {
    try {
      console.log(`\n🧪 Testing: "${testCase}"`);

      const splitter = new GPTServiceSplitter();
      const splitResult = await splitter.analyzeAndSplit(testCase);

      const detected = splitResult.masterFormulaMode;
      const confidence = splitResult.confidence;

      console.log(`  Detection: ${detected ? '✅ MASTER FORMULA' : '❌ GOOGLE SHEETS'} (${confidence})`);

      results.push({
        input: testCase,
        detected,
        confidence
      });

    } catch (error) {
      console.log(`  Error: ${error.message}`);
      results.push({
        input: testCase,
        detected: false,
        confidence: 'error',
        error: error.message
      });
    }
  }

  console.log('\n📊 DETECTION SUMMARY:');
  console.log('='.repeat(60));
  results.forEach(result => {
    const status = result.detected ? '🎯 DETECTED' : '❌ MISSED';
    console.log(`${status}: "${result.input}" (${result.confidence})`);
  });

  const detectionRate = results.filter(r => r.detected).length / results.length;
  console.log(`\n📈 Detection Rate: ${(detectionRate * 100).toFixed(1)}% (${results.filter(r => r.detected).length}/${results.length})`);

  return results;
}

// Run the tests if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  testMasterFormulaIntegration()
    .then((result) => {
      if (result.success) {
        console.log('\n✅ All integration tests passed!');
        return testVariousPaverPatioFormats();
      } else {
        process.exit(1);
      }
    })
    .then((detectionResults) => {
      const detectionRate = detectionResults.filter(r => r.detected).length / detectionResults.length;
      if (detectionRate >= 0.8) { // 80% detection rate threshold
        console.log('\n🎯 Detection tests passed!');
        process.exit(0);
      } else {
        console.log(`\n⚠️ Detection rate too low: ${(detectionRate * 100).toFixed(1)}%`);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testMasterFormulaIntegration, testVariousPaverPatioFormats };