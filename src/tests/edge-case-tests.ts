#!/usr/bin/env node
/**
 * TradeSphere Edge Case Testing
 * 
 * Tests problematic inputs that should expose weaknesses in business logic
 * Validates handling of unclear requests, missing data, and unusual scenarios
 * 
 * Usage:
 *   npm run test:edge-cases
 *   tsx src/tests/edge-case-tests.ts
 */

import { PipelineFactory } from '../services/pipeline/PipelineFactory';
import { PipelineResult } from '../services/pipeline/interfaces';

interface EdgeCaseTest {
  name: string;
  input: string;
  expectedBehavior: 'CLARIFICATION_NEEDED' | 'PARTIAL_SUCCESS' | 'FAILURE' | 'SUCCESS';
  description: string;
  shouldDetectServices?: number; // Expected number of services detected
  shouldRequestClarification?: boolean;
  reasonForTest: string;
}

interface EdgeCaseResult {
  test: EdgeCaseTest;
  mockResult: PipelineResult | null;
  realResult: PipelineResult | null;
  mockStatus: 'PASS' | 'FAIL' | 'ERROR';
  realStatus: 'PASS' | 'FAIL' | 'ERROR';
  issues: string[];
  verdict: 'ROBUST' | 'FRAGILE' | 'BROKEN';
}

class EdgeCaseTester {

  /**
   * Comprehensive edge case test suite
   */
  private getEdgeCases(): EdgeCaseTest[] {
    return [
      // MISSING QUANTITY TESTS
      {
        name: 'Vague Quantity: "Some mulch"',
        input: 'I need some mulch for my garden',
        expectedBehavior: 'CLARIFICATION_NEEDED',
        shouldRequestClarification: true,
        description: 'No specific quantity mentioned',
        reasonForTest: 'Test handling of vague quantity requests'
      },
      {
        name: 'Multiple Vague: "A little mulch and some edging"',
        input: 'I need a little mulch and some edging',
        expectedBehavior: 'CLARIFICATION_NEEDED', 
        shouldRequestClarification: true,
        description: 'Multiple services with vague quantities',
        reasonForTest: 'Test multi-service vague quantity handling'
      },
      {
        name: 'Relative Quantity: "About 50 square feet"',
        input: 'About 50 square feet of mulch',
        expectedBehavior: 'SUCCESS',
        shouldDetectServices: 1,
        description: 'Approximate quantity with uncertainty marker',
        reasonForTest: 'Test fuzzy quantity parsing'
      },

      // UNCLEAR SERVICE TESTS
      {
        name: 'Generic Service: "Landscaping work"',
        input: 'I need landscaping work done',
        expectedBehavior: 'CLARIFICATION_NEEDED',
        shouldRequestClarification: true,
        description: 'Generic landscaping request without specifics',
        reasonForTest: 'Test generic service request handling'
      },
      {
        name: 'Ambiguous Service: "Fix my yard"',
        input: 'Can you fix my yard?',
        expectedBehavior: 'CLARIFICATION_NEEDED',
        shouldRequestClarification: true,
        description: 'Ambiguous repair request',
        reasonForTest: 'Test ambiguous service identification'
      },
      {
        name: 'Non-existent Service: "Install solar panels"',
        input: 'Install solar panels on my roof',
        expectedBehavior: 'CLARIFICATION_NEEDED',
        shouldRequestClarification: true,
        description: 'Service not in TradeSphere catalog',
        reasonForTest: 'Test out-of-scope service handling'
      },

      // FORMATTING EDGE CASES
      {
        name: 'No Punctuation: "45 sq ft mulch 3 ft edging"',
        input: '45 sq ft mulch 3 ft edging',
        expectedBehavior: 'SUCCESS',
        shouldDetectServices: 2,
        description: 'Missing conjunctions and punctuation',
        reasonForTest: 'Test natural language parsing robustness'
      },
      {
        name: 'All Caps: "45 SQ FT TRIPLE GROUND MULCH"',
        input: '45 SQ FT TRIPLE GROUND MULCH',
        expectedBehavior: 'SUCCESS',
        shouldDetectServices: 1,
        description: 'All uppercase input',
        reasonForTest: 'Test case sensitivity handling'
      },
      {
        name: 'Mixed Case: "45 Sq Ft tRiPlE gRoUnD mUlCh"',
        input: '45 Sq Ft tRiPlE gRoUnD mUlCh',
        expectedBehavior: 'SUCCESS',
        shouldDetectServices: 1,
        description: 'Random case mixing',
        reasonForTest: 'Test case normalization'
      },
      {
        name: 'Extra Whitespace: "  45   sq ft   mulch   "',
        input: '  45   sq ft   mulch   ',
        expectedBehavior: 'SUCCESS',
        shouldDetectServices: 1,
        description: 'Excessive whitespace and spacing',
        reasonForTest: 'Test input sanitization'
      },

      // UNUSUAL QUANTITIES
      {
        name: 'Decimal Quantity: "23.5 square feet mulch"',
        input: '23.5 square feet of mulch',
        expectedBehavior: 'SUCCESS',
        shouldDetectServices: 1,
        description: 'Fractional quantity input',
        reasonForTest: 'Test decimal number parsing'
      },
      {
        name: 'Large Quantity: "5000 square feet mulch"',
        input: '5000 square feet of triple ground mulch',
        expectedBehavior: 'SUCCESS',
        shouldDetectServices: 1,
        description: 'Large quantity that might exceed normal ranges',
        reasonForTest: 'Test quantity validation limits'
      },
      {
        name: 'Zero Quantity: "0 square feet mulch"',
        input: '0 square feet of mulch',
        expectedBehavior: 'CLARIFICATION_NEEDED',
        shouldRequestClarification: true,
        description: 'Zero quantity edge case',
        reasonForTest: 'Test zero quantity handling'
      },

      // UNIT VARIATIONS  
      {
        name: 'Alternative Units: "45 sqft mulch"',
        input: '45 sqft triple ground mulch',
        expectedBehavior: 'SUCCESS',
        shouldDetectServices: 1,
        description: 'Shortened unit abbreviation',
        reasonForTest: 'Test unit abbreviation recognition'
      },
      {
        name: 'Plural Units: "45 square feet mulch"',
        input: '45 square feet triple ground mulch',
        expectedBehavior: 'SUCCESS',
        shouldDetectServices: 1,
        description: 'Plural vs singular unit forms',
        reasonForTest: 'Test unit form normalization'
      },
      {
        name: 'Wrong Units: "45 inches of mulch"',
        input: '45 inches of triple ground mulch',
        expectedBehavior: 'CLARIFICATION_NEEDED',
        shouldRequestClarification: true,
        description: 'Incorrect unit for service type',
        reasonForTest: 'Test unit validation'
      },

      // COMPLEX SCENARIOS
      {
        name: 'Multiple Same Service: "50 sqft mulch and 25 sqft mulch"',
        input: '50 square feet triple ground mulch and 25 square feet triple ground mulch',
        expectedBehavior: 'SUCCESS',
        shouldDetectServices: 1, // Should consolidate to 75 sqft
        description: 'Duplicate services that should be consolidated',
        reasonForTest: 'Test service consolidation logic'
      },
      {
        name: 'Contradictory Info: "45 sqft mulch but only need 20 sqft"',
        input: '45 square feet of mulch but actually I only need 20 square feet',
        expectedBehavior: 'CLARIFICATION_NEEDED',
        shouldRequestClarification: true,
        description: 'Contradictory quantity information',
        reasonForTest: 'Test conflicting information handling'
      },

      // EMPTY/MINIMAL INPUT
      {
        name: 'Empty Input: ""',
        input: '',
        expectedBehavior: 'CLARIFICATION_NEEDED',
        shouldRequestClarification: true,
        description: 'Completely empty input',
        reasonForTest: 'Test empty input handling'
      },
      {
        name: 'Single Word: "mulch"',
        input: 'mulch',
        expectedBehavior: 'CLARIFICATION_NEEDED',
        shouldRequestClarification: true,
        description: 'Single word with no context',
        reasonForTest: 'Test minimal input handling'
      },
      {
        name: 'Question Only: "How much does mulch cost?"',
        input: 'How much does mulch cost?',
        expectedBehavior: 'CLARIFICATION_NEEDED',
        shouldRequestClarification: true,
        description: 'Information request rather than service request',
        reasonForTest: 'Test question vs request distinction'
      }
    ];
  }

  /**
   * Run comprehensive edge case testing
   */
  async runEdgeCaseTests(): Promise<EdgeCaseResult[]> {
    console.log('🧪 EDGE CASE TESTING SUITE');
    console.log('==========================');
    console.log('🎯 Testing problematic inputs to expose logic weaknesses');
    console.log('⚠️ Identifying areas where clarification should be requested\n');

    const edgeCases = this.getEdgeCases();
    const results: EdgeCaseResult[] = [];

    for (const testCase of edgeCases) {
      console.log(`🧪 ${testCase.name}`);
      console.log(`📝 Input: "${testCase.input}"`);
      console.log(`🎯 Expected: ${testCase.expectedBehavior}`);
      console.log(`💭 Reason: ${testCase.reasonForTest}`);
      
      const result = await this.runSingleEdgeCase(testCase);
      results.push(result);
      
      // Display immediate result
      const mockIcon = result.mockStatus === 'PASS' ? '✅' : 
                      result.mockStatus === 'FAIL' ? '❌' : '⚠️';
      const realIcon = result.realStatus === 'PASS' ? '✅' : 
                      result.realStatus === 'FAIL' ? '❌' : '⚠️';
      
      console.log(`  Mock: ${mockIcon} ${result.mockStatus} | Real: ${realIcon} ${result.realStatus}`);
      console.log(`  Verdict: ${this.getVerdictIcon(result.verdict)} ${result.verdict}`);
      
      if (result.issues.length > 0) {
        console.log('  Issues:');
        result.issues.forEach(issue => console.log(`    🔍 ${issue}`));
      }
      
      console.log(''); // Empty line
    }

    this.generateEdgeCaseSummary(results);
    return results;
  }

  /**
   * Test a single edge case
   */
  private async runSingleEdgeCase(testCase: EdgeCaseTest): Promise<EdgeCaseResult> {
    let mockResult: PipelineResult | null = null;
    let realResult: PipelineResult | null = null;
    const issues: string[] = [];

    try {
      // Test mock implementation
      const mockPipeline = PipelineFactory.createMock(false);
      mockResult = await mockPipeline.process(testCase.input);
      
      // Test real implementation  
      const realPipeline = PipelineFactory.createDevelopment();
      realResult = await realPipeline.process(testCase.input);
      
    } catch (error) {
      issues.push(`Pipeline execution failed: ${error.message}`);
    }

    // Evaluate results
    const mockStatus = this.evaluateResult(mockResult, testCase);
    const realStatus = this.evaluateResult(realResult, testCase);
    
    // Additional validation
    this.validateEdgeCaseBehavior(mockResult, realResult, testCase, issues);

    // Determine overall verdict
    const verdict = this.determineEdgeCaseVerdict(mockStatus, realStatus, issues.length);

    return {
      test: testCase,
      mockResult,
      realResult,
      mockStatus,
      realStatus,
      issues,
      verdict
    };
  }

  /**
   * Evaluate if a result meets expectations
   */
  private evaluateResult(result: PipelineResult | null, testCase: EdgeCaseTest): 'PASS' | 'FAIL' | 'ERROR' {
    if (!result) {
      return 'ERROR';
    }

    switch (testCase.expectedBehavior) {
      case 'CLARIFICATION_NEEDED':
        return result.clarificationNeeded ? 'PASS' : 'FAIL';
        
      case 'SUCCESS':
        if (!result.success) return 'FAIL';
        if (testCase.shouldDetectServices !== undefined) {
          const serviceCount = result.finalResult?.services.length || 0;
          return serviceCount === testCase.shouldDetectServices ? 'PASS' : 'FAIL';
        }
        return 'PASS';
        
      case 'FAILURE':
        return !result.success ? 'PASS' : 'FAIL';
        
      case 'PARTIAL_SUCCESS':
        return result.success && result.clarificationNeeded ? 'PASS' : 'FAIL';
        
      default:
        return 'ERROR';
    }
  }

  /**
   * Validate edge case specific behavior
   */
  private validateEdgeCaseBehavior(
    mockResult: PipelineResult | null, 
    realResult: PipelineResult | null, 
    testCase: EdgeCaseTest,
    issues: string[]
  ): void {
    
    // Check for consistent clarification behavior
    if (mockResult && realResult) {
      if (mockResult.clarificationNeeded !== realResult.clarificationNeeded) {
        issues.push('Mock and real implementations disagree on clarification need');
      }
    }

    // Validate zero quantity handling
    if (testCase.input.includes('0 ')) {
      if (mockResult?.success || realResult?.success) {
        issues.push('Zero quantity should not result in successful pricing');
      }
    }

    // Validate empty input handling
    if (testCase.input.trim() === '') {
      if (mockResult?.success || realResult?.success) {
        issues.push('Empty input should always require clarification');
      }
    }

    // Validate service consolidation
    if (testCase.name.includes('Multiple Same Service')) {
      const mockServices = mockResult?.finalResult?.services.length || 0;
      const realServices = realResult?.finalResult?.services.length || 0;
      if (mockServices > 1 || realServices > 1) {
        issues.push('Duplicate services should be consolidated into single service');
      }
    }

    // Validate large quantity handling  
    if (testCase.input.includes('5000')) {
      const mockCost = mockResult?.finalResult?.totals.totalCost || 0;
      const realCost = realResult?.finalResult?.totals.totalCost || 0;
      if (mockCost < 1000 || realCost < 1000) {
        issues.push('Large quantity pricing seems unrealistically low');
      }
    }
  }

  /**
   * Determine overall verdict for edge case handling
   */
  private determineEdgeCaseVerdict(mockStatus: string, realStatus: string, issueCount: number): 'ROBUST' | 'FRAGILE' | 'BROKEN' {
    if (issueCount > 2) {
      return 'BROKEN';
    }
    
    if (mockStatus === 'PASS' && realStatus === 'PASS' && issueCount === 0) {
      return 'ROBUST';
    }
    
    return 'FRAGILE';
  }

  /**
   * Get emoji for verdict
   */
  private getVerdictIcon(verdict: string): string {
    switch (verdict) {
      case 'ROBUST': return '🛡️';
      case 'FRAGILE': return '⚠️';
      case 'BROKEN': return '💥';
      default: return '❓';
    }
  }

  /**
   * Generate comprehensive edge case summary
   */
  private generateEdgeCaseSummary(results: EdgeCaseResult[]): void {
    console.log('📊 EDGE CASE TESTING SUMMARY');
    console.log('=============================');

    const robustCount = results.filter(r => r.verdict === 'ROBUST').length;
    const fragileCount = results.filter(r => r.verdict === 'FRAGILE').length;
    const brokenCount = results.filter(r => r.verdict === 'BROKEN').length;
    const total = results.length;

    console.log(`🛡️ Robust: ${robustCount}/${total} (${(robustCount/total*100).toFixed(0)}%)`);
    console.log(`⚠️ Fragile: ${fragileCount}/${total} (${(fragileCount/total*100).toFixed(0)}%)`);
    console.log(`💥 Broken: ${brokenCount}/${total} (${(brokenCount/total*100).toFixed(0)}%)`);

    // Show most problematic areas
    const categoryIssues = new Map<string, number>();
    results.forEach(result => {
      if (result.issues.length > 0) {
        const category = result.test.name.split(':')[0];
        categoryIssues.set(category, (categoryIssues.get(category) || 0) + result.issues.length);
      }
    });

    if (categoryIssues.size > 0) {
      console.log('\n🔍 PROBLEMATIC AREAS:');
      Array.from(categoryIssues.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([category, issueCount]) => {
          console.log(`  ${category}: ${issueCount} issues`);
        });
    }

    // Overall assessment
    const robustPercentage = (robustCount / total) * 100;
    console.log('\n🎯 OVERALL ASSESSMENT:');
    
    if (robustPercentage >= 80) {
      console.log('✅ EXCELLENT: System handles edge cases robustly');
    } else if (robustPercentage >= 60) {
      console.log('⚠️ GOOD: Most edge cases handled, some improvements needed');
    } else if (robustPercentage >= 40) {
      console.log('⚠️ FAIR: Significant edge case vulnerabilities exist');
    } else {
      console.log('❌ POOR: System is fragile with many edge case failures');
    }

    // Specific recommendations
    console.log('\n🔧 RECOMMENDATIONS:');
    if (fragileCount > 0) {
      console.log('• Add better input validation and sanitization');
      console.log('• Implement more robust clarification request logic');
    }
    if (brokenCount > 0) {
      console.log('• Fix critical edge case handling failures');
      console.log('• Add comprehensive error handling');
    }
    if (robustCount < total * 0.8) {
      console.log('• Consider implementing fuzzy matching for service names');
      console.log('• Add unit validation and conversion logic');
      console.log('• Improve natural language processing robustness');
    }
  }

  /**
   * Test specific edge case categories
   */
  async testSpecificCategory(category: 'quantity' | 'service' | 'format' | 'units'): Promise<void> {
    console.log(`\n🎯 TESTING ${category.toUpperCase()} EDGE CASES`);
    console.log('='.repeat(40));

    const allCases = this.getEdgeCases();
    const categoryCases = allCases.filter(testCase => {
      const name = testCase.name.toLowerCase();
      switch (category) {
        case 'quantity': return name.includes('quantity') || name.includes('vague');
        case 'service': return name.includes('service') || name.includes('generic');
        case 'format': return name.includes('punctuation') || name.includes('caps') || name.includes('whitespace');
        case 'units': return name.includes('unit');
        default: return false;
      }
    });

    for (const testCase of categoryCases) {
      const result = await this.runSingleEdgeCase(testCase);
      
      const status = result.verdict === 'ROBUST' ? '✅' : 
                    result.verdict === 'FRAGILE' ? '⚠️' : '❌';
      
      console.log(`${status} ${testCase.name}`);
      if (result.issues.length > 0) {
        result.issues.forEach(issue => console.log(`    🔍 ${issue}`));
      }
    }
  }
}

/**
 * Command line interface
 */
async function main() {
  const args = process.argv.slice(2);
  const tester = new EdgeCaseTester();
  
  try {
    if (args.includes('--category')) {
      const categoryIndex = args.indexOf('--category') + 1;
      const category = args[categoryIndex] as 'quantity' | 'service' | 'format' | 'units';
      
      if (['quantity', 'service', 'format', 'units'].includes(category)) {
        await tester.testSpecificCategory(category);
      } else {
        console.log('❌ Invalid category. Use: quantity, service, format, or units');
        process.exit(1);
      }
    } else {
      const results = await tester.runEdgeCaseTests();
      
      // Exit with error code if too many broken cases
      const brokenCount = results.filter(r => r.verdict === 'BROKEN').length;
      if (brokenCount > results.length * 0.2) {
        console.log('❌ Too many broken edge cases detected');
        process.exit(1);
      }
    }
    
    console.log('\n✅ Edge case testing completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Edge case testing failed:', error);
    process.exit(1);
  }
}

// Help
if (process.argv.includes('--help')) {
  console.log(`
TradeSphere Edge Case Tester

Purpose: Test problematic inputs to expose weaknesses and validate error handling

Usage:
  tsx src/tests/edge-case-tests.ts                    # Run all edge case tests
  tsx src/tests/edge-case-tests.ts --category quantity # Test specific category
  npm run test:edge-cases                             # Run via npm script

Categories:
  quantity  - Missing/vague/unusual quantities
  service   - Unclear/generic/non-existent services  
  format    - Case, punctuation, whitespace issues
  units     - Unit variations and validation

Exit codes:
  0: Edge cases handled acceptably
  1: Too many critical edge case failures
`);
  process.exit(0);
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('edge-case-tests.ts')) {
  main();
}

export { EdgeCaseTester };