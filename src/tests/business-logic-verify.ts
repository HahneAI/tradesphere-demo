#!/usr/bin/env node
/**
 * TradeSphere Business Logic Verification
 * 
 * CRITICAL: Tests REAL implementations (not mocks) to verify actual business logic
 * Exposes hardcoded mock responses vs genuine calculation results
 * 
 * Usage:
 *   npm run test:logic:verify
 *   tsx src/tests/business-logic-verify.ts
 */

import { PipelineFactory } from '../services/pipeline/PipelineFactory';
import { 
  PipelineResult,
  ServiceDetection,
  CompletenessCheck,
  ServiceMapping,
  PricingCalculation 
} from '../services/pipeline/interfaces';

interface LogicVerificationResult {
  testName: string;
  input: string;
  mockResult: PipelineResult | null;
  realResult: PipelineResult | null;
  comparison: {
    serviceCountMatch: boolean;
    costMatch: boolean;
    logicDifference: string[];
    suspiciousPatterns: string[];
  };
  verdict: 'REAL_LOGIC' | 'HARDCODED_MOCK' | 'ERROR';
}

class BusinessLogicVerifier {
  
  /**
   * Test cases designed to expose hardcoded vs real logic
   */
  private getTestCases() {
    // Check if specific test input is provided via environment (for VS Code debug scenarios)
    const envTestInput = process.env.TEST_INPUT;
    const envExpectedBehavior = process.env.EXPECTED_BEHAVIOR;
    
    if (envTestInput && envExpectedBehavior) {
      return [
        {
          name: 'Custom Test Input (from VS Code debug)',
          input: envTestInput,
          expectedBehavior: envExpectedBehavior
        }
      ];
    }
    
    return [
      {
        name: 'Known Mock Input: 45 sqft mulch + 3ft edging',
        input: '45 sq ft triple ground mulch and 3 feet metal edging',
        expectedBehavior: 'This is the exact mock input - should show differences'
      },
      {
        name: 'Slight Variation: 44 sqft mulch + 3ft edging', 
        input: '44 sq ft triple ground mulch and 3 feet metal edging',
        expectedBehavior: 'Real logic should adapt, mocks might fail/hardcode'
      },
      {
        name: 'Different Quantity: 50 sqft mulch + 2ft edging',
        input: '50 square feet triple ground mulch and 2 linear feet metal edging',
        expectedBehavior: 'Real logic should calculate proportionally'
      },
      {
        name: 'Alternative Phrasing: mulch installation',
        input: 'install 45 square feet of triple ground mulch plus 3 feet of metal edging',
        expectedBehavior: 'Real parsing should handle synonyms'
      },
      {
        name: 'Single Service: Only mulch',
        input: '75 square feet of triple ground mulch',
        expectedBehavior: 'Real logic should calculate single service'
      },
      {
        name: 'Synonym Test: Wood chips + steel edging',
        input: '60 square feet wood chips and 4 linear feet steel edging',
        expectedBehavior: 'Should recognize wood chips=mulch, steel=metal edging'
      },
      {
        name: 'Edge Case: Unusual quantities',
        input: '23.5 sq ft mulch and 1.7 feet edging',
        expectedBehavior: 'Real logic should handle decimals, mocks likely fail'
      }
    ];
  }

  /**
   * Verify business logic by comparing mock vs real implementations
   */
  async verifyBusinessLogic(): Promise<LogicVerificationResult[]> {
    console.log('🔍 BUSINESS LOGIC VERIFICATION');
    console.log('==============================');
    console.log('🚨 CRITICAL: Testing REAL vs MOCK implementations');
    console.log('🎯 Goal: Expose hardcoded responses and verify genuine calculations\n');

    const testCases = this.getTestCases();
    const results: LogicVerificationResult[] = [];

    for (const testCase of testCases) {
      console.log(`🧪 ${testCase.name}`);
      console.log(`📝 Input: "${testCase.input}"`);
      console.log(`💭 Expected: ${testCase.expectedBehavior}`);
      
      const result = await this.verifyTestCase(testCase);
      results.push(result);
      
      // Display result
      const status = result.verdict === 'REAL_LOGIC' ? '✅ REAL LOGIC' : 
                    result.verdict === 'HARDCODED_MOCK' ? '⚠️ HARDCODED MOCK' : '❌ ERROR';
      
      console.log(`${status}: ${testCase.name}`);
      
      if (result.comparison.logicDifference.length > 0) {
        console.log('  🔍 Logic Differences:');
        result.comparison.logicDifference.forEach(diff => console.log(`    • ${diff}`));
      }
      
      if (result.comparison.suspiciousPatterns.length > 0) {
        console.log('  🚨 Suspicious Patterns:');
        result.comparison.suspiciousPatterns.forEach(pattern => console.log(`    ⚠️ ${pattern}`));
      }
      
      console.log(''); // Empty line
    }

    this.generateVerificationSummary(results);
    return results;
  }

  /**
   * Verify a single test case
   */
  private async verifyTestCase(testCase: any): Promise<LogicVerificationResult> {
    let mockResult: PipelineResult | null = null;
    let realResult: PipelineResult | null = null;

    try {
      // Test MOCK implementation
      const mockPipeline = PipelineFactory.createMock(false);
      mockResult = await mockPipeline.process(testCase.input);
      
      // Test REAL implementation (development mode to avoid external APIs)
      const realPipeline = PipelineFactory.createDevelopment();
      realResult = await realPipeline.process(testCase.input);
      
    } catch (error) {
      return {
        testName: testCase.name,
        input: testCase.input,
        mockResult: null,
        realResult: null,
        comparison: {
          serviceCountMatch: false,
          costMatch: false,
          logicDifference: [`Execution failed: ${error.message}`],
          suspiciousPatterns: []
        },
        verdict: 'ERROR'
      };
    }

    // Compare results
    const comparison = this.compareResults(mockResult, realResult, testCase.input);
    const verdict = this.determineVerdict(comparison, mockResult, realResult);

    return {
      testName: testCase.name,
      input: testCase.input,
      mockResult,
      realResult,
      comparison,
      verdict
    };
  }

  /**
   * Compare mock vs real results for logic verification
   */
  private compareResults(mockResult: PipelineResult | null, realResult: PipelineResult | null, input: string) {
    const logicDifference: string[] = [];
    const suspiciousPatterns: string[] = [];
    
    if (!mockResult || !realResult) {
      return {
        serviceCountMatch: false,
        costMatch: false,
        logicDifference: ['One or both pipelines failed to execute'],
        suspiciousPatterns: []
      };
    }

    // Compare service counts
    const mockServiceCount = mockResult.finalResult?.services.length || 0;
    const realServiceCount = realResult.finalResult?.services.length || 0;
    const serviceCountMatch = mockServiceCount === realServiceCount;
    
    if (!serviceCountMatch) {
      logicDifference.push(`Service count: Mock=${mockServiceCount}, Real=${realServiceCount}`);
    }

    // Compare costs
    const mockCost = mockResult.finalResult?.totals.totalCost || 0;
    const realCost = realResult.finalResult?.totals.totalCost || 0;
    const costMatch = Math.abs(mockCost - realCost) < 0.01; // Allow penny differences
    
    if (!costMatch) {
      logicDifference.push(`Total cost: Mock=$${mockCost.toFixed(2)}, Real=$${realCost.toFixed(2)}`);
    }

    // Suspicious pattern detection
    
    // Pattern 1: Mock always returns exact same result regardless of input variation
    if (input.includes('44') || input.includes('50') || input.includes('23.5')) {
      if (mockCost === 81.75) { // Known hardcoded value from mock
        suspiciousPatterns.push('Mock returned hardcoded $81.75 for varied input');
      }
    }

    // Pattern 2: Mock fails to handle variations that real logic should handle
    if (mockResult.success && !realResult.success) {
      suspiciousPatterns.push('Mock succeeded where real implementation failed - possible hardcoded success');
    }

    // Pattern 3: Identical processing times (suspicious for real calculations)
    if (mockResult.totalTime === realResult.totalTime) {
      suspiciousPatterns.push('Identical processing times - suggests no real calculation in one implementation');
    }

    // Pattern 4: No gradual cost scaling with quantity changes
    if (input.includes('23.5') && mockCost > 50) { // Small quantity should = smaller cost
      suspiciousPatterns.push('Cost did not scale proportionally with small quantity');
    }

    return {
      serviceCountMatch,
      costMatch,
      logicDifference,
      suspiciousPatterns
    };
  }

  /**
   * Determine if implementation shows real logic or hardcoded behavior
   */
  private determineVerdict(
    comparison: any,
    mockResult: PipelineResult | null,
    realResult: PipelineResult | null
  ): 'REAL_LOGIC' | 'HARDCODED_MOCK' | 'ERROR' {
    
    if (!mockResult || !realResult) {
      return 'ERROR';
    }

    // If there are suspicious patterns, likely hardcoded
    if (comparison.suspiciousPatterns.length > 2) {
      return 'HARDCODED_MOCK';
    }

    // If results vary appropriately based on input, likely real logic
    if (comparison.logicDifference.length > 0 && comparison.suspiciousPatterns.length === 0) {
      return 'REAL_LOGIC';
    }

    // If too many identical results, suspicious
    if (comparison.serviceCountMatch && comparison.costMatch && comparison.suspiciousPatterns.length > 0) {
      return 'HARDCODED_MOCK';
    }

    return 'REAL_LOGIC';
  }

  /**
   * Generate comprehensive verification summary
   */
  private generateVerificationSummary(results: LogicVerificationResult[]): void {
    console.log('📊 VERIFICATION SUMMARY');
    console.log('========================');

    const realLogicCount = results.filter(r => r.verdict === 'REAL_LOGIC').length;
    const hardcodedCount = results.filter(r => r.verdict === 'HARDCODED_MOCK').length;
    const errorCount = results.filter(r => r.verdict === 'ERROR').length;
    const total = results.length;

    console.log(`Real Logic: ${realLogicCount}/${total}`);
    console.log(`Hardcoded: ${hardcodedCount}/${total}`);
    console.log(`Errors: ${errorCount}/${total}`);

    // Overall assessment
    if (hardcodedCount > realLogicCount) {
      console.log('\n🚨 CRITICAL FINDING: Implementation appears heavily hardcoded');
      console.log('⚠️ Mock responses may not reflect real business logic');
      console.log('🔧 Recommend implementing genuine calculation algorithms');
    } else if (realLogicCount > hardcodedCount) {
      console.log('\n✅ GOOD: Implementation shows genuine business logic');
      console.log('📈 Calculations appear to adapt based on input variations');
    } else {
      console.log('\n❓ MIXED: Results inconclusive - manual review needed');
    }

    // Show most common suspicious patterns
    const allPatterns = results.flatMap(r => r.comparison.suspiciousPatterns);
    const patternCounts = allPatterns.reduce((counts, pattern) => {
      counts[pattern] = (counts[pattern] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    if (Object.keys(patternCounts).length > 0) {
      console.log('\n🔍 SUSPICIOUS PATTERNS DETECTED:');
      Object.entries(patternCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([pattern, count]) => {
          console.log(`  ${count}x: ${pattern}`);
        });
    }
  }

  /**
   * Test individual pipeline steps for real vs mock behavior
   */
  async verifyIndividualSteps(): Promise<void> {
    console.log('\n🔬 INDIVIDUAL STEP VERIFICATION');
    console.log('================================');

    const testInput = "42 square feet of triple ground mulch";
    
    try {
      const mockPipeline = PipelineFactory.createMock(true); // Enable debug
      const realPipeline = PipelineFactory.createDevelopment(); // Real implementation

      console.log(`Testing input: "${testInput}"`);
      console.log('(Quantity intentionally different from hardcoded test cases)\n');

      // Get step-by-step results
      const mockStepResult = await mockPipeline.processWithStepDebugging(testInput, ['all']);
      const realStepResult = await realPipeline.processWithStepDebugging(testInput, ['all']);

      console.log('MOCK IMPLEMENTATION STEPS:');
      mockStepResult.steps.forEach((step, i) => {
        console.log(`  Step ${i+1}: ${step.debug.step} (${step.debug.processingTime}ms)`);
        if (step.debug.intermediateOutput && typeof step.debug.intermediateOutput === 'object') {
          const output = step.debug.intermediateOutput as any;
          if (output.services) {
            console.log(`    Services: ${output.services.length}`);
            output.services.forEach((s: any, idx: number) => {
              console.log(`      ${idx+1}. ${s.serviceName}: ${s.quantity} ${s.unit}`);
            });
          }
          if (output.totalCost !== undefined) {
            console.log(`    Cost: $${output.totalCost}`);
          }
        }
      });

      console.log('\nREAL IMPLEMENTATION STEPS:');
      realStepResult.steps.forEach((step, i) => {
        console.log(`  Step ${i+1}: ${step.debug.step} (${step.debug.processingTime}ms)`);
        if (step.debug.intermediateOutput && typeof step.debug.intermediateOutput === 'object') {
          const output = step.debug.intermediateOutput as any;
          if (output.services) {
            console.log(`    Services: ${output.services.length}`);
            output.services.forEach((s: any, idx: number) => {
              console.log(`      ${idx+1}. ${s.serviceName}: ${s.quantity} ${s.unit}`);
            });
          }
          if (output.totalCost !== undefined) {
            console.log(`    Cost: $${output.totalCost}`);
          }
        }
      });

      // Compare steps
      console.log('\n🔍 STEP-BY-STEP ANALYSIS:');
      mockStepResult.steps.forEach((mockStep, i) => {
        const realStep = realStepResult.steps[i];
        if (realStep) {
          const timeDiff = Math.abs(mockStep.debug.processingTime - realStep.debug.processingTime);
          console.log(`Step ${i+1}: Mock=${mockStep.debug.processingTime}ms, Real=${realStep.debug.processingTime}ms, Diff=${timeDiff}ms`);
          
          if (timeDiff < 5) {
            console.log(`  ⚠️ Suspiciously similar processing times`);
          }
        }
      });

    } catch (error) {
      console.error('❌ Step verification failed:', error);
    }
  }
}

/**
 * Command line interface
 */
async function main() {
  const verifier = new BusinessLogicVerifier();
  
  try {
    console.log('🔍 Starting Business Logic Verification...\n');
    
    // Run main verification
    const results = await verifier.verifyBusinessLogic();
    
    // Run step verification
    await verifier.verifyIndividualSteps();
    
    console.log('\n✅ Business logic verification completed');
    
    // Exit with error code if too many hardcoded results found
    const hardcodedCount = results.filter(r => r.verdict === 'HARDCODED_MOCK').length;
    if (hardcodedCount > results.length / 2) {
      console.log('❌ CRITICAL: Too many hardcoded implementations detected');
      process.exit(1);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

// Help
if (process.argv.includes('--help')) {
  console.log(`
TradeSphere Business Logic Verifier

Purpose: Verify that implementations contain real business logic, not hardcoded test responses

Usage:
  tsx src/tests/business-logic-verify.ts     # Run full verification
  npm run test:logic:verify                  # Run via npm script

What this tests:
  ✅ Mock vs Real implementation differences
  ✅ Response variation based on input changes  
  ✅ Calculation accuracy and proportionality
  ✅ Step-by-step processing logic
  ✅ Detection of hardcoded test responses

Exit codes:
  0: Real business logic detected
  1: Too many hardcoded implementations found
`);
  process.exit(0);
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('business-logic-verify.ts')) {
  main();
}

export { BusinessLogicVerifier };