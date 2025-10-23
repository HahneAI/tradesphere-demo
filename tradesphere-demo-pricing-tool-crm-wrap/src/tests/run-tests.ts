#!/usr/bin/env node
/**
 * TradeSphere Test Runner
 * 
 * Command-line test runner for validating Make.com parity
 * Usage: npm run test:parity
 */

import { PricingAgentTester } from './pricing-agent.test';

async function runTests() {
  console.log('🚀 TRADESPHERE PRICING AGENT - MAKE.COM PARITY VALIDATION');
  console.log('=' .repeat(70));
  
  const tester = new PricingAgentTester();
  
  try {
    // Full test suite
    console.log('🧪 Running comprehensive test suite...\n');
    
    const report = await tester.generateTestReport();
    
    // Write report to file
    const fs = await import('fs');
    const path = await import('path');
    
    const reportPath = path.join(__dirname, '..', '..', 'test-report.md');
    fs.writeFileSync(reportPath, report);
    
    console.log(`\n📄 Test report saved to: ${reportPath}`);
    console.log('\n' + '='.repeat(70));
    console.log('🎯 NEXT STEPS:');
    console.log('1. Review test report for any failures');
    console.log('2. Set up Google Sheets API credentials');
    console.log('3. Deploy pricing-agent function to Netlify');
    console.log('4. Configure webhook to use new endpoint');
    console.log('5. Run A/B tests with 10% traffic split');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runTests();
}