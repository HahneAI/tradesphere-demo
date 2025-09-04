#!/usr/bin/env node
/**
 * Pricing Calculator Service Test Runner
 * 
 * Tests the pricing calculation with REAL Google Sheets API calls
 * This service connects to the live pricing spreadsheet
 */
import 'dotenv/config';
import { PricingCalculatorService, PricingResult } from '../services/ai-engine/PricingCalculatorService';

// Mock service interface matching the expected structure
interface TestService {
  serviceName: string;
  quantity: number;
  unit: string;
  row: number;
  category: string;
  confidence: number;
}

async function main() {
  console.log('💰 Pricing Calculator Service Test Runner');
  console.log('=' .repeat(50));
  console.log('💰 Starting pricing calculation with REAL Google Sheets API...');
  
  // Show environment status
  const sheetsId = process.env.VITE_GOOGLE_SHEETS_SHEET_ID;
  const googleApiKey = process.env.VITE_GOOGLE_SHEETS_API_KEY;
  
  console.log('\n🔍 Environment Variables Status:');
  if (sheetsId) {
    console.log(`✅ Google Sheets ID: SET (...${sheetsId.substring(sheetsId.length - 8)})`);
  } else {
    console.log('❌ Google Sheets ID: NOT SET');
  }
  
  if (googleApiKey) {
    console.log(`✅ Google Sheets API Key: SET (${googleApiKey.substring(0, 10)}...)`);
  } else {
    console.log('❌ Google Sheets API Key: NOT SET');
  }
  
  console.log('   - DEBUG_MODE:', process.env.DEBUG_MODE || 'undefined');
  console.log('   - MOCK_MODE:', process.env.MOCK_MODE || 'undefined');
  
  // Test scenarios with actual service data
  const testScenarios = [
    {
      name: "Single Service - Paver Patio",
      services: [
        {
          serviceName: "Paver Patio (SQFT)",
          quantity: 150,
          unit: "sqft",
          row: 3,
          category: "hardscaping",
          confidence: 95
        }
      ] as TestService[],
      betaCodeId: 1,
      description: "Test basic patio pricing lookup"
    },
    
    {
      name: "Multi-Service - Patio with Mulch",
      services: [
        {
          serviceName: "Paver Patio (SQFT)",
          quantity: 150,
          unit: "sqft", 
          row: 3,
          category: "hardscaping",
          confidence: 95
        },
        {
          serviceName: "Triple Ground Mulch (SQFT)",
          quantity: 100,
          unit: "sqft",
          row: 15,
          category: "materials",
          confidence: 90
        }
      ] as TestService[],
      betaCodeId: 1,
      description: "Test multiple service combination pricing"
    },
    
    {
      name: "Complex Three-Service Package",
      services: [
        {
          serviceName: "Paver Patio (SQFT)",
          quantity: 200,
          unit: "sqft",
          row: 3,
          category: "hardscaping", 
          confidence: 95
        },
        {
          serviceName: "Triple Ground Mulch (SQFT)",
          quantity: 150,
          unit: "sqft",
          row: 15,
          category: "materials",
          confidence: 90
        },
        {
          serviceName: "Metal Edging (LNFT)",
          quantity: 40,
          unit: "linear_feet",
          row: 12,
          category: "edging",
          confidence: 88
        }
      ] as TestService[],
      betaCodeId: 1,
      description: "Test comprehensive landscaping package"
    },
    
    {
      name: "Drainage Services",
      services: [
        {
          serviceName: "EZ Flow French Drain (10' section)",
          quantity: 5,
          unit: "each",
          row: 10,
          category: "drainage",
          confidence: 92
        },
        {
          serviceName: "Drainage Burying (LNFT)",
          quantity: 50,
          unit: "linear_feet",
          row: 9,
          category: "drainage",
          confidence: 85
        }
      ] as TestService[],
      betaCodeId: 1,
      description: "Test specialized drainage service pricing"
    },
    
    {
      name: "Premium Structure Project",
      services: [
        {
          serviceName: "Cedar Pergola (SQFT)",
          quantity: 150,
          unit: "sqft",
          row: 5,
          category: "structures",
          confidence: 98
        }
      ] as TestService[],
      betaCodeId: 1,
      description: "Test high-value structure pricing"
    }
  ];

  // Run each test scenario
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    
    console.log(`\n🎯 Test Scenario ${i + 1}: ${scenario.name}`);
    console.log('=' .repeat(60));
    console.log('💭 Purpose:', scenario.description);
    console.log(`🔢 Services Count: ${scenario.services.length}`);
    console.log(`🎫 Beta Code ID: ${scenario.betaCodeId}`);
    
    // Show service details
    console.log('\n📋 Services to Price:');
    scenario.services.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.serviceName}`);
      console.log(`      Quantity: ${service.quantity} ${service.unit}`);
      console.log(`      Row: ${service.row} | Category: ${service.category}`);
      console.log(`      Confidence: ${service.confidence}%`);
    });
    
    try {
      console.log('\n🚀 Calling Google Sheets API...');
      console.log('⏱️ Timestamp:', new Date().toISOString());
      
      const startTime = performance.now();
      
      // Create calculator and make REAL API call
      const calculator = new PricingCalculatorService();
      const result: PricingResult = await calculator.calculatePricing(scenario.services, scenario.betaCodeId);
      
      const endTime = performance.now();
      const apiTime = (endTime - startTime).toFixed(2);
      
      console.log(`\n⏱️ Google Sheets API Response Time: ${apiTime}ms`);
      console.log('💰 Pricing Calculation Results:');
      console.log('=' .repeat(40));
      
      // Display pricing results in detail
      console.log(`✅ Success: ${result.success}`);
      console.log(`📈 Confidence: ${result.confidence}%`);
      
      if (result.totals) {
        console.log('\n💵 Cost Breakdown:');
        console.log(`   • Total Cost: $${result.totals.totalCost.toFixed(2)}`);
        console.log(`   • Materials: $${result.totals.materialsCost.toFixed(2)}`);
        console.log(`   • Labor: $${result.totals.laborCost.toFixed(2)}`);
        console.log(`   • Tax: $${result.totals.taxCost.toFixed(2)}`);
      }
      
      if (result.services && result.services.length > 0) {
        console.log('\n📊 Service-by-Service Pricing:');
        result.services.forEach((service, index) => {
          console.log(`   ${index + 1}. ${service.serviceName}`);
          console.log(`      Unit Price: $${service.unitPrice.toFixed(2)}`);
          console.log(`      Quantity: ${service.quantity} ${service.unit}`);
          console.log(`      Total: $${service.totalPrice.toFixed(2)}`);
          console.log(`      Row: ${service.row}`);
          console.log('');
        });
      }
      
      // Show any errors or warnings
      if (result.errors && result.errors.length > 0) {
        console.log('⚠️ Calculation Errors:');
        result.errors.forEach(error => {
          console.log(`   • ${error}`);
        });
      }
      
      // Raw JSON for inspection
      console.log('\n🔍 Raw JSON Response:');
      console.log(JSON.stringify(result, null, 2));
      
    } catch (error) {
      console.error(`\n❌ Test failed for scenario "${scenario.name}":`, error);
      
      // Show error details for debugging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        if (error.stack) {
          console.error('Stack trace:', error.stack);
        }
      }
    }
    
    // Pause between tests for better debugging
    console.log('\n✅ Scenario completed. Press F10 to continue to next scenario...\n');
    console.log('-'.repeat(80));
  }
  
  // Run health check test
  console.log('\n🏥 Running Health Check Test...');
  try {
    const calculator = new PricingCalculatorService();
    const healthResult = await calculator.runTestCalculation();
    
    if (healthResult) {
      console.log('✅ Health Check PASSED - Google Sheets API is working');
    } else {
      console.log('❌ Health Check FAILED - Check Google Sheets configuration');
    }
  } catch (error) {
    console.error('❌ Health Check ERROR:', error);
  }
  
  console.log('\n🎉 All Pricing Calculator tests completed!');
  console.log('\n💡 This test executed REAL API calls to:');
  console.log('   • Google Sheets API for price lookups');
  console.log('   • Live pricing spreadsheet calculations');
  console.log('   • Beta code and customer tier processing');
  console.log('   • Tax calculations and totals');
  
  console.log('\n🔧 Debugging Tips:');
  console.log('   • Set breakpoints before Google Sheets API calls');
  console.log('   • Use F10 to step through pricing calculations');
  console.log('   • Inspect result objects for detailed pricing breakdowns');
  console.log('   • Check errors array for missing services or calculation issues');
  console.log('   • Verify Google Sheets permissions and API key validity');
}

// Execute if run directly
main().catch(error => {
  console.error('❌ Pricing Calculator test failed:', error);
  process.exit(1);
});

export { main };