/**
 * Pipeline Test Suite - Comprehensive Testing for 4-Step Pipeline
 * 
 * Tests each step independently and validates full pipeline integration
 * Ensures Make.com parity with production test cases
 */

import { SimplePipeline } from '../services/pipeline/SimplePipeline';
import { PipelineFactory } from '../services/pipeline/PipelineFactory';
import { 
  TestCase, 
  PipelineTestResult,
  PipelineResult 
} from '../services/pipeline/interfaces';

// Production test cases matching Make.com scenarios
const TEST_CASES: TestCase[] = [
  {
    name: 'Multi-Service: Mulch + Edging',
    input: '45 sq ft triple ground mulch and 3 feet metal edging',
    expectedServices: [
      { serviceName: 'Triple Ground Mulch (SQFT)', quantity: 45, unit: 'sqft', row: 23 },
      { serviceName: 'Metal Edging', quantity: 3, unit: 'linear_feet', row: 18 }
    ],
    expectedCost: { min: 50, max: 200 },
    description: 'Two services with specific quantities and units'
  },
  {
    name: 'Simple: Mulch Only',
    input: '100 square feet of mulch',
    expectedServices: [
      { serviceName: 'Triple Ground Mulch (SQFT)', quantity: 100, unit: 'sqft', row: 23 }
    ],
    expectedCost: { min: 80, max: 150 },
    description: 'Single service with clear quantity'
  },
  {
    name: 'Incomplete: No Quantity',
    input: 'I need some mulch for my garden',
    expectedServices: [],
    expectedCost: { min: 0, max: 0 },
    shouldNeedClarification: true,
    description: 'Incomplete request requiring clarification'
  }
];

/**
 * Main test runner
 */
export class PipelineTestRunner {
  
  /**
   * Run all pipeline tests
   */
  async runAllTests(): Promise<{
    results: PipelineTestResult[];
    summary: {
      passed: number;
      failed: number;
      total: number;
      averageTime: number;
    };
  }> {
    console.log('🧪 RUNNING PIPELINE TEST SUITE');
    console.log('===============================\n');

    const results: PipelineTestResult[] = [];
    
    for (const testCase of TEST_CASES) {
      console.log(`🎯 TEST: ${testCase.name}`);
      console.log(`📝 Input: "${testCase.input}"`);
      
      const result = await this.runSingleTest(testCase);
      results.push(result);
      
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status}: ${testCase.name} (${result.performance.actualTime}ms)`);
      
      if (!result.passed) {
        result.errors.forEach(error => console.log(`  ❌ ${error}`));
      }
      
      console.log(''); // Empty line for readability
    }

    // Calculate summary
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const averageTime = results.reduce((sum, r) => sum + r.performance.actualTime, 0) / total;

    const summary = {
      passed,
      failed: total - passed,
      total,
      averageTime
    };

    console.log('📊 TEST SUMMARY');
    console.log('================');
    console.log(`Tests Passed: ${summary.passed}/${summary.total}`);
    console.log(`Success Rate: ${(summary.passed / summary.total * 100).toFixed(0)}%`);
    console.log(`Average Time: ${summary.averageTime.toFixed(0)}ms`);

    if (summary.passed === summary.total) {
      console.log('\n🎉 ALL TESTS PASSED!');
    } else {
      console.log('\n⚠️ Some tests failed - review results above');
    }

    return { results, summary };
  }

  /**
   * Run a single test case
   */
  private async runSingleTest(testCase: TestCase): Promise<PipelineTestResult> {
    const errors: string[] = [];
    const startTime = Date.now();

    try {
      // Create mock pipeline for predictable testing
      const pipeline = PipelineFactory.createMock(false);
      
      // Execute pipeline
      const result = await pipeline.process(testCase.input);
      const actualTime = Date.now() - startTime;

      // Validate results
      const validationErrors = this.validateResult(testCase, result);
      errors.push(...validationErrors);

      return {
        testCase,
        result,
        passed: errors.length === 0,
        errors,
        performance: {
          actualTime,
          targetTime: 8000, // 8 second target
          withinTarget: actualTime <= 8000
        },
        accuracy: this.calculateAccuracy(testCase, result)
      };

    } catch (error) {
      errors.push(`Test execution failed: ${error.message}`);
      
      return {
        testCase,
        result: null as any,
        passed: false,
        errors,
        performance: {
          actualTime: Date.now() - startTime,
          targetTime: 8000,
          withinTarget: false
        },
        accuracy: {
          servicesDetected: 0,
          servicesExpected: testCase.expectedServices.length,
          costWithinRange: false,
          mappingAccuracy: 0
        }
      };
    }
  }

  /**
   * Validate test result against expected outcomes
   */
  private validateResult(testCase: TestCase, result: PipelineResult): string[] {
    const errors: string[] = [];

    // Check if clarification was expected
    if (testCase.shouldNeedClarification) {
      if (!result.clarificationNeeded) {
        errors.push('Expected clarification but pipeline completed successfully');
      }
      return errors; // Don't validate further for clarification cases
    }

    // Check if result succeeded when it should have
    if (!testCase.shouldNeedClarification && !result.success) {
      errors.push('Pipeline failed when it should have succeeded');
      return errors;
    }

    if (!result.finalResult) {
      errors.push('No final result provided');
      return errors;
    }

    // Validate service count
    const expectedCount = testCase.expectedServices.length;
    const actualCount = result.finalResult.services.length;
    
    if (actualCount !== expectedCount) {
      errors.push(`Expected ${expectedCount} services, got ${actualCount}`);
    }

    // Validate individual services
    for (const expectedService of testCase.expectedServices) {
      const actualService = result.finalResult.services.find(s => 
        s.serviceName === expectedService.serviceName
      );

      if (!actualService) {
        errors.push(`Missing expected service: ${expectedService.serviceName}`);
        continue;
      }

      // Check quantity (allow 10% variance)
      const quantityVariance = Math.abs(actualService.quantity - expectedService.quantity) / expectedService.quantity;
      if (quantityVariance > 0.1) {
        errors.push(`Quantity mismatch for ${expectedService.serviceName}: expected ${expectedService.quantity}, got ${actualService.quantity}`);
      }

      // Check unit
      if (actualService.unit !== expectedService.unit) {
        errors.push(`Unit mismatch for ${expectedService.serviceName}: expected ${expectedService.unit}, got ${actualService.unit}`);
      }

      // Check row mapping (if provided)
      if (expectedService.row && actualService.row !== expectedService.row) {
        errors.push(`Row mismatch for ${expectedService.serviceName}: expected ${expectedService.row}, got ${actualService.row}`);
      }
    }

    // Validate cost range
    const actualCost = result.finalResult.totals.totalCost;
    const withinRange = actualCost >= testCase.expectedCost.min && actualCost <= testCase.expectedCost.max;
    
    if (!withinRange) {
      errors.push(`Cost outside expected range: $${actualCost} not in [$${testCase.expectedCost.min}, $${testCase.expectedCost.max}]`);
    }

    return errors;
  }

  /**
   * Calculate accuracy metrics
   */
  private calculateAccuracy(testCase: TestCase, result: PipelineResult): {
    servicesDetected: number;
    servicesExpected: number;
    costWithinRange: boolean;
    mappingAccuracy: number;
  } {
    if (!result.finalResult) {
      return {
        servicesDetected: 0,
        servicesExpected: testCase.expectedServices.length,
        costWithinRange: false,
        mappingAccuracy: 0
      };
    }

    const servicesDetected = result.finalResult.services.length;
    const servicesExpected = testCase.expectedServices.length;
    
    const actualCost = result.finalResult.totals.totalCost;
    const costWithinRange = actualCost >= testCase.expectedCost.min && actualCost <= testCase.expectedCost.max;

    // Calculate mapping accuracy
    let correctMappings = 0;
    for (const expected of testCase.expectedServices) {
      const actual = result.finalResult.services.find(s => s.serviceName === expected.serviceName);
      if (actual) correctMappings++;
    }
    
    const mappingAccuracy = testCase.expectedServices.length > 0 ? 
      correctMappings / testCase.expectedServices.length : 0;

    return {
      servicesDetected,
      servicesExpected,
      costWithinRange,
      mappingAccuracy
    };
  }

  /**
   * Test individual pipeline steps
   */
  async testIndividualSteps(): Promise<void> {
    console.log('\n🔍 TESTING INDIVIDUAL PIPELINE STEPS');
    console.log('=====================================');

    const pipeline = PipelineFactory.createMock(true);
    const testInput = "45 sq ft triple ground mulch and 3 feet metal edging";

    try {
      // Test with step-by-step debugging
      const result = await pipeline.processWithStepDebugging(testInput, ['all']);
      
      console.log('\n📊 STEP-BY-STEP RESULTS:');
      result.steps.forEach((step, index) => {
        console.log(`Step ${index + 1} (${step.debug.step}): ${step.success ? '✅' : '❌'} (${step.debug.processingTime}ms)`);
        if (step.debug.intermediateOutput) {
          console.log(`  Output: ${JSON.stringify(step.debug.intermediateOutput, null, 2)}`);
        }
      });

    } catch (error) {
      console.error('❌ Step testing failed:', error);
    }
  }

  /**
   * Performance benchmark test
   */
  async benchmarkPerformance(iterations: number = 5): Promise<void> {
    console.log('\n⚡ PERFORMANCE BENCHMARK');
    console.log('========================');

    const testInput = "45 sq ft triple ground mulch and 3 feet metal edging";
    const times: number[] = [];

    const pipeline = PipelineFactory.createMock(false); // No debug for cleaner timing

    for (let i = 1; i <= iterations; i++) {
      const startTime = Date.now();
      await pipeline.process(testInput);
      const duration = Date.now() - startTime;
      
      times.push(duration);
      console.log(`Iteration ${i}: ${duration}ms`);
    }

    const average = times.reduce((sum, time) => sum + time, 0) / iterations;
    const min = Math.min(...times);
    const max = Math.max(...times);

    console.log(`\n📊 BENCHMARK RESULTS:`);
    console.log(`Average: ${average.toFixed(0)}ms`);
    console.log(`Min: ${min}ms`);
    console.log(`Max: ${max}ms`);
    console.log(`Target: <8000ms`);
    console.log(`Status: ${average <= 8000 ? '✅ PASSED' : '❌ FAILED'}`);
  }

  /**
   * Compare mock vs production implementations
   */
  async compareImplementations(): Promise<void> {
    console.log('\n🔀 MOCK VS PRODUCTION COMPARISON');
    console.log('=================================');

    const testInput = "100 square feet of mulch";
    
    try {
      const mockPipeline = PipelineFactory.createMock(false);
      const productionPipeline = PipelineFactory.createDevelopment(); // Use development config to avoid API calls

      const [mockResult, prodResult] = await Promise.all([
        mockPipeline.process(testInput),
        productionPipeline.process(testInput)
      ]);

      console.log('📊 COMPARISON RESULTS:');
      console.log(`Mock Time: ${mockResult.totalTime}ms`);
      console.log(`Production Time: ${prodResult.totalTime}ms`);
      console.log(`Mock Success: ${mockResult.success ? '✅' : '❌'}`);
      console.log(`Production Success: ${prodResult.success ? '✅' : '❌'}`);

      if (mockResult.finalResult && prodResult.finalResult) {
        console.log(`Mock Cost: $${mockResult.finalResult.totals.totalCost}`);
        console.log(`Production Cost: $${prodResult.finalResult.totals.totalCost}`);
        console.log(`Cost Match: ${mockResult.finalResult.totals.totalCost === prodResult.finalResult.totals.totalCost ? '✅' : '❌'}`);
      }

    } catch (error) {
      console.error('❌ Comparison failed:', error);
    }
  }
}

/**
 * Run tests if called directly
 */
// Always run tests when this file is executed directly
if (process.argv[1] && process.argv[1].endsWith('pipeline-test.ts')) {
  const runner = new PipelineTestRunner();
  
  (async () => {
    try {
      await runner.runAllTests();
      await runner.testIndividualSteps();
      await runner.benchmarkPerformance();
      await runner.compareImplementations();
    } catch (error) {
      console.error('Test runner failed:', error);
      process.exit(1);
    }
  })();
}

// Export removed to avoid duplicate - class is already exported above