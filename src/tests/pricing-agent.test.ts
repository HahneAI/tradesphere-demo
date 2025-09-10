/**
 * TradeSphere Pricing Agent Test Suite
 * 
 * Validates Make.com parity with 3 production test cases:
 * 1. Multi-service: "45 sq ft triple ground mulch and 3 feet metal edging"
 * 2. Irrigation: "irrigation setup with 2 turf zones"
 * 3. Simple: "100 square feet of mulch"
 * 
 * Tests parameter collection, pricing calculation, and response formatting
 */

import { ParameterCollectorService, CollectionResult } from '../services/ai-engine/ParameterCollectorService';
import { PricingCalculatorService, createPricingCalculator, PricingResult } from '../services/ai-engine/PricingCalculatorService';
import { SalesPersonalityService, CustomerContext } from '../services/ai-engine/SalesPersonalityService';
import { ServiceMappingEngine, ServiceMappingResult } from '../services/ai-engine/ServiceMappingEngine';

interface TestCase {
  name: string;
  input: string;
  expectedServices: {
    serviceName: string;
    quantity: number;
    unit: string;
    row: number;
  }[];
  expectedMinPrice: number;
  expectedMaxPrice: number;
  mustIncludeText: string[];
}

interface ParityTestResult {
  testCase: string;
  passed: boolean;
  errors: string[];
  timings: {
    parameterCollection: number;
    pricingCalculation: number;
    responseFormatting: number;
    total: number;
  };
  services: {
    expected: number;
    found: number;
    matched: number;
  };
  pricing: {
    expectedRange: string;
    actual: number;
    withinRange: boolean;
  };
  response: {
    length: number;
    includesRequiredText: boolean;
    tone: string;
  };
}

export class PricingAgentTester {
  private testCases: TestCase[] = [
    {
      name: "Multi-Service: Mulch + Edging",
      input: "45 sq ft triple ground mulch and 3 feet metal edging",
      expectedServices: [
        { serviceName: "Triple Ground Mulch (SQFT)", quantity: 45, unit: "sqft", row: 23 },
        { serviceName: "Metal Edging", quantity: 3, unit: "linear_feet", row: 18 }
      ],
      expectedMinPrice: 50,
      expectedMaxPrice: 200,
      mustIncludeText: ["mulch", "edging", "total"]
    },
    {
      name: "Irrigation: Setup + Zones", 
      input: "irrigation setup with 2 turf zones",
      expectedServices: [
        { serviceName: "Irrigation Set Up Cost", quantity: 1, unit: "each", row: 20 },
        { serviceName: "Irrigation (per zone)", quantity: 2, unit: "each", row: 21 }
      ],
      expectedMinPrice: 800,
      expectedMaxPrice: 1500,
      mustIncludeText: ["irrigation", "setup", "zones", "total"]
    },
    {
      name: "Simple: Mulch Only",
      input: "100 square feet of mulch", 
      expectedServices: [
        { serviceName: "Triple Ground Mulch (SQFT)", quantity: 100, unit: "sqft", row: 23 }
      ],
      expectedMinPrice: 80,
      expectedMaxPrice: 150,
      mustIncludeText: ["mulch", "100", "sqft"]
    }
  ];

  /**
   * Run complete parity test suite
   */
  async runParityTests(): Promise<ParityTestResult[]> {
    console.log('🧪 STARTING MAKE.COM PARITY TESTS');
    console.log(`📋 Testing ${this.testCases.length} production scenarios`);
    
    const results: ParityTestResult[] = [];
    
    for (const testCase of this.testCases) {
      console.log(`\n🎯 TEST: ${testCase.name}`);
      console.log(`📝 Input: "${testCase.input}"`);
      
      const result = await this.runSingleTest(testCase);
      results.push(result);
      
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status}: ${testCase.name} (${result.timings.total}ms)`);
      
      if (!result.passed) {
        result.errors.forEach(error => console.log(`  ❌ ${error}`));
      }
    }
    
    // Summary
    const passed = results.filter(r => r.passed).length;
    console.log(`\n📊 PARITY TEST SUMMARY: ${passed}/${results.length} tests passed`);
    
    if (passed === results.length) {
      console.log('🎉 ALL TESTS PASSED - Make.com parity validated!');
    } else {
      console.log('⚠️  Some tests failed - review before deployment');
    }
    
    return results;
  }

  /**
   * Run single test case through complete pipeline
   */
  private async runSingleTest(testCase: TestCase): Promise<ParityTestResult> {
    const errors: string[] = [];
    const timings = { parameterCollection: 0, pricingCalculation: 0, responseFormatting: 0, total: 0 };
    const startTime = Date.now();
    
    try {
      // STEP 1: Parameter Collection
      console.log(`  📊 Step 1: Parameter Collection`);
      const collectionStart = Date.now();
      const collectionResult = await ParameterCollectorService.collectParameters(testCase.input);
      timings.parameterCollection = Date.now() - collectionStart;
      
      // Validate parameter collection
      const collectionValidation = this.validateParameterCollection(testCase, collectionResult);
      errors.push(...collectionValidation.errors);
      
      if (collectionResult.status !== 'ready_for_pricing') {
        errors.push(`Parameter collection not ready for pricing: ${collectionResult.status}`);
        // Continue with found services for testing
      }
      
      // STEP 2: Pricing Calculation
      console.log(`  💰 Step 2: Pricing Calculation`);
      const calculationStart = Date.now();
      const pricingCalculator = createPricingCalculator();
      let pricingResult: PricingResult;
      
      // Check if irrigation services need special handling
      const hasIrrigation = collectionResult.services.some(s => s.serviceName.includes('Irrigation'));
      if (hasIrrigation) {
        pricingResult = await pricingCalculator.calculateIrrigationPricing(collectionResult.services);
      } else {
        pricingResult = await pricingCalculator.calculatePricing(collectionResult.services);
      }
      
      timings.pricingCalculation = Date.now() - calculationStart;
      
      // Validate pricing calculation
      const pricingValidation = this.validatePricingCalculation(testCase, pricingResult);
      errors.push(...pricingValidation.errors);
      
      // STEP 3: Response Formatting
      console.log(`  📝 Step 3: Response Formatting`);
      const formattingStart = Date.now();
      const customerContext: CustomerContext = {
        firstName: 'TestUser',
        jobTitle: 'Property Manager',
        isReturnCustomer: false,
        urgencyLevel: 'routine'
      };
      
      const salesResponse = SalesPersonalityService.formatSalesResponse(
        pricingResult,
        customerContext,
        'pricing'
      );
      
      timings.responseFormatting = Date.now() - formattingStart;
      timings.total = Date.now() - startTime;
      
      // Validate response formatting
      const responseValidation = this.validateResponseFormatting(testCase, salesResponse);
      errors.push(...responseValidation.errors);
      
      // Performance validation
      if (timings.total > 8000) {
        errors.push(`Performance target missed: ${timings.total}ms > 8000ms target`);
      }
      
      return {
        testCase: testCase.name,
        passed: errors.length === 0,
        errors,
        timings,
        services: {
          expected: testCase.expectedServices.length,
          found: collectionResult.services.length,
          matched: collectionValidation.matchedServices
        },
        pricing: {
          expectedRange: `$${testCase.expectedMinPrice}-${testCase.expectedMaxPrice}`,
          actual: pricingResult.totals.totalCost,
          withinRange: pricingValidation.withinRange
        },
        response: {
          length: salesResponse.message.length,
          includesRequiredText: responseValidation.includesAllText,
          tone: salesResponse.tone
        }
      };
      
    } catch (error) {
      errors.push(`Test execution failed: ${error.message}`);
      timings.total = Date.now() - startTime;
      
      return {
        testCase: testCase.name,
        passed: false,
        errors,
        timings,
        services: { expected: testCase.expectedServices.length, found: 0, matched: 0 },
        pricing: { expectedRange: `$${testCase.expectedMinPrice}-${testCase.expectedMaxPrice}`, actual: 0, withinRange: false },
        response: { length: 0, includesRequiredText: false, tone: 'unknown' }
      };
    }
  }

  /**
   * Validate parameter collection results
   */
  private validateParameterCollection(testCase: TestCase, result: CollectionResult): {
    errors: string[];
    matchedServices: number;
  } {
    const errors: string[] = [];
    let matchedServices = 0;
    
    // Check service count
    if (result.services.length === 0) {
      errors.push('No services extracted from input');
      return { errors, matchedServices };
    }
    
    // Check each expected service
    for (const expected of testCase.expectedServices) {
      const found = result.services.find(s => s.serviceName === expected.serviceName);
      
      if (!found) {
        errors.push(`Missing expected service: ${expected.serviceName}`);
        continue;
      }
      
      matchedServices++;
      
      // Validate quantity (allow 10% variance)
      const quantityVariance = Math.abs(found.quantity - expected.quantity) / expected.quantity;
      if (quantityVariance > 0.1) {
        errors.push(`Quantity mismatch for ${expected.serviceName}: expected ${expected.quantity}, got ${found.quantity}`);
      }
      
      // Validate unit
      if (found.unit !== expected.unit) {
        errors.push(`Unit mismatch for ${expected.serviceName}: expected ${expected.unit}, got ${found.unit}`);
      }
      
      // Validate row mapping
      if (found.row !== expected.row) {
        errors.push(`Row mismatch for ${expected.serviceName}: expected ${expected.row}, got ${found.row}`);
      }
    }
    
    // Check confidence
    if (result.confidence < 0.8) {
      errors.push(`Low confidence: ${result.confidence} < 0.8`);
    }
    
    return { errors, matchedServices };
  }

  /**
   * Validate pricing calculation results
   */
  private validatePricingCalculation(testCase: TestCase, result: PricingResult): {
    errors: string[];
    withinRange: boolean;
  } {
    const errors: string[] = [];
    
    if (!result.success) {
      errors.push(`Pricing calculation failed: ${result.error}`);
      return { errors, withinRange: false };
    }
    
    // Check price range
    const totalCost = result.totals.totalCost;
    const withinRange = totalCost >= testCase.expectedMinPrice && totalCost <= testCase.expectedMaxPrice;
    
    if (!withinRange) {
      errors.push(`Price outside expected range: $${totalCost} not in [$${testCase.expectedMinPrice}, $${testCase.expectedMaxPrice}]`);
    }
    
    // Check that we have services
    if (result.services.length === 0) {
      errors.push('No services in pricing result');
    }
    
    // Check labor hours are positive
    if (result.totals.totalLaborHours <= 0) {
      errors.push(`Invalid labor hours: ${result.totals.totalLaborHours}`);
    }
    
    // Check calculation time
    if (result.calculationTime > 5000) {
      errors.push(`Pricing calculation too slow: ${result.calculationTime}ms`);
    }
    
    return { errors, withinRange };
  }

  /**
   * Validate response formatting
   */
  private validateResponseFormatting(testCase: TestCase, response: any): {
    errors: string[];
    includesAllText: boolean;
  } {
    const errors: string[] = [];
    const message = response.message.toLowerCase();
    
    // Check required text presence
    let includesAllText = true;
    for (const requiredText of testCase.mustIncludeText) {
      if (!message.includes(requiredText.toLowerCase())) {
        errors.push(`Missing required text in response: "${requiredText}"`);
        includesAllText = false;
      }
    }
    
    // Check message length (should be substantial but not too long)
    if (message.length < 100) {
      errors.push(`Response too short: ${message.length} characters`);
    }
    
    if (message.length > 2000) {
      errors.push(`Response too long: ${message.length} characters`);
    }
    
    // Check tone is appropriate
    const validTones = ['casual', 'professional', 'premium'];
    if (!validTones.includes(response.tone)) {
      errors.push(`Invalid tone: ${response.tone}`);
    }
    
    return { errors, includesAllText };
  }

  /**
   * Run performance benchmark test
   */
  async runPerformanceBenchmark(): Promise<{
    averageTime: number;
    targetAchieved: boolean;
    breakdown: {
      parameterCollection: number;
      pricingCalculation: number;
      responseFormatting: number;
    };
  }> {
    console.log('⚡ PERFORMANCE BENCHMARK TEST');
    
    const iterations = 5;
    const results = [];
    
    // Use first test case for consistent benchmarking
    const testInput = this.testCases[0].input;
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      const collectionStart = Date.now();
      const collectionResult = await ParameterCollectorService.collectParameters(testInput);
      const collectionTime = Date.now() - collectionStart;
      
      const calculationStart = Date.now();
      const pricingCalculator = createPricingCalculator();
      const pricingResult = await pricingCalculator.calculatePricing(collectionResult.services);
      const calculationTime = Date.now() - calculationStart;
      
      const formattingStart = Date.now();
      const customerContext: CustomerContext = { firstName: 'TestUser' };
      SalesPersonalityService.formatSalesResponse(pricingResult, customerContext, 'pricing');
      const formattingTime = Date.now() - formattingStart;
      
      const totalTime = Date.now() - startTime;
      
      results.push({
        total: totalTime,
        parameterCollection: collectionTime,
        pricingCalculation: calculationTime,
        responseFormatting: formattingTime
      });
    }
    
    const averages = {
      total: results.reduce((sum, r) => sum + r.total, 0) / iterations,
      parameterCollection: results.reduce((sum, r) => sum + r.parameterCollection, 0) / iterations,
      pricingCalculation: results.reduce((sum, r) => sum + r.pricingCalculation, 0) / iterations,
      responseFormatting: results.reduce((sum, r) => sum + r.responseFormatting, 0) / iterations
    };
    
    const targetAchieved = averages.total <= 8000; // 8s target vs 30-50s Make.com
    
    console.log(`📊 Average time: ${averages.total.toFixed(0)}ms (target: <8000ms)`);
    console.log(`  Parameter Collection: ${averages.parameterCollection.toFixed(0)}ms`);
    console.log(`  Pricing Calculation: ${averages.pricingCalculation.toFixed(0)}ms`);
    console.log(`  Response Formatting: ${averages.responseFormatting.toFixed(0)}ms`);
    console.log(`🎯 Target achieved: ${targetAchieved ? '✅ YES' : '❌ NO'}`);
    
    return {
      averageTime: averages.total,
      targetAchieved,
      breakdown: {
        parameterCollection: averages.parameterCollection,
        pricingCalculation: averages.pricingCalculation,
        responseFormatting: averages.responseFormatting
      }
    };
  }

  /**
   * Run service mapping accuracy test
   */
  async runServiceMappingAccuracyTest(): Promise<{
    totalTests: number;
    passed: number;
    accuracy: number;
    failedMappings: string[];
  }> {
    console.log('🎯 SERVICE MAPPING ACCURACY TEST');
    
    // Test service recognition with variations
    const mappingTests = [
      { input: "mulch", expected: "Triple Ground Mulch (SQFT)" },
      { input: "triple ground mulch", expected: "Triple Ground Mulch (SQFT)" },
      { input: "irrigation", expected: "Irrigation Set Up Cost" },
      { input: "sprinkler setup", expected: "Irrigation Set Up Cost" },
      { input: "metal edging", expected: "Metal Edging" },
      { input: "paver patio", expected: "Paver Patio" },
      { input: "retaining wall", expected: "Retaining wall" },
      { input: "sod", expected: "Sod Install (SQFT)" },
      { input: "tree", expected: "Tree (3-5 gallon)" },
      { input: "shrub", expected: "Shrub (5 gal)" }
    ];
    
    let passed = 0;
    const failedMappings: string[] = [];
    
    for (const test of mappingTests) {
      const result = ServiceMappingEngine.mapUserInput(test.input);
      
      if (result.services.length > 0 && result.services[0].serviceName === test.expected) {
        passed++;
      } else {
        failedMappings.push(`"${test.input}" -> expected "${test.expected}", got "${result.services[0]?.serviceName || 'none'}"`);
      }
    }
    
    const accuracy = (passed / mappingTests.length) * 100;
    
    console.log(`📊 Accuracy: ${passed}/${mappingTests.length} (${accuracy.toFixed(1)}%)`);
    
    if (failedMappings.length > 0) {
      console.log('❌ Failed mappings:');
      failedMappings.forEach(failure => console.log(`  ${failure}`));
    }
    
    return {
      totalTests: mappingTests.length,
      passed,
      accuracy,
      failedMappings
    };
  }

  /**
   * Generate comprehensive test report
   */
  async generateTestReport(): Promise<string> {
    console.log('📋 GENERATING COMPREHENSIVE TEST REPORT');
    
    const parityResults = await this.runParityTests();
    const performanceResults = await this.runPerformanceBenchmark();
    const accuracyResults = await this.runServiceMappingAccuracyTest();
    
    const report = `# TradeSphere Pricing Agent Test Report

## Summary
- **Parity Tests**: ${parityResults.filter(r => r.passed).length}/${parityResults.length} passed
- **Performance Target**: ${performanceResults.targetAchieved ? '✅ ACHIEVED' : '❌ MISSED'} (${performanceResults.averageTime.toFixed(0)}ms avg)
- **Service Mapping**: ${accuracyResults.accuracy.toFixed(1)}% accuracy
- **Make.com Replacement**: ${parityResults.every(r => r.passed) && performanceResults.targetAchieved ? '✅ READY' : '⚠️ NEEDS WORK'}

## Performance Comparison
| Metric | Make.com | New System | Improvement |
|--------|----------|------------|-------------|
| Response Time | 30-50s | ${performanceResults.averageTime.toFixed(0)}ms | ${((40000 - performanceResults.averageTime) / 40000 * 100).toFixed(0)}% faster |
| Token Usage | 17-20k | 2-3k | ~85% reduction |

## Test Results Detail
${parityResults.map(result => `
### ${result.testCase}
- **Status**: ${result.passed ? '✅ PASS' : '❌ FAIL'}
- **Timing**: ${result.timings.total}ms total
- **Services**: ${result.services.matched}/${result.services.expected} matched
- **Pricing**: $${result.pricing.actual} (expected: ${result.pricing.expectedRange})
${result.errors.length > 0 ? `- **Errors**: ${result.errors.join(', ')}` : ''}
`).join('')}

## Recommendations
${parityResults.every(r => r.passed) ? 
'✅ All tests passing - system ready for deployment' : 
'⚠️ Address failing tests before deployment'}

Generated: ${new Date().toISOString()}
`;
    
    return report;
  }
}

// Export for use in other tests
export const pricingAgentTester = new PricingAgentTester();