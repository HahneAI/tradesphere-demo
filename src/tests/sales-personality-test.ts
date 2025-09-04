#!/usr/bin/env node
/**
 * Sales Personality Service Test Runner
 * 
 * Tests the sales response formatting logic with different scenarios
 * No API calls - this is pure formatting logic
 */
import 'dotenv/config';
import { SalesPersonalityService } from '../services/ai-engine/SalesPersonalityService';

// Mock pricing result interface
interface MockPricingResult {
  totals: {
    totalCost: number;
    materialsCost: number;
    laborCost: number;
    taxCost: number;
  };
  services: Array<{
    serviceName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    row: number;
    category: string;
  }>;
  success: boolean;
  confidence: number;
  errors?: string[];
}

interface MockCustomerContext {
  firstName: string;
  isReturnCustomer: boolean;
  projectType: string;
  urgencyLevel: 'routine' | 'seasonal' | 'emergency';
}

async function main() {
  console.log('🎭 Sales Personality Service Test Runner');
  console.log('=' .repeat(50));
  
  // Show environment status (no API keys needed for this service)
  console.log('✅ Environment Status: Local formatting service (no API required)');
  console.log('🔍 DEBUG_MODE:', process.env.DEBUG_MODE || 'undefined');
  
  // Create test scenarios
  const testScenarios = [
    {
      name: "Standard Landscaping Project",
      pricingResult: {
        totals: {
          totalCost: 2850.00,
          materialsCost: 1200.00,
          laborCost: 1400.00,
          taxCost: 250.00
        },
        services: [
          {
            serviceName: "Paver Patio (SQFT)",
            quantity: 150,
            unit: "sqft",
            unitPrice: 12.50,
            totalPrice: 1875.00,
            row: 3,
            category: "hardscaping"
          },
          {
            serviceName: "Triple Ground Mulch (SQFT)",
            quantity: 100,
            unit: "sqft", 
            unitPrice: 4.50,
            totalPrice: 450.00,
            row: 15,
            category: "materials"
          },
          {
            serviceName: "Metal Edging (LNFT)",
            quantity: 40,
            unit: "linear_feet",
            unitPrice: 8.75,
            totalPrice: 350.00,
            row: 12,
            category: "edging"
          }
        ],
        success: true,
        confidence: 95
      } as MockPricingResult,
      customerContext: {
        firstName: "John",
        isReturnCustomer: false,
        projectType: "backyard renovation",
        urgencyLevel: "routine" as const
      } as MockCustomerContext
    },
    
    {
      name: "High-End Premium Project",
      pricingResult: {
        totals: {
          totalCost: 8750.00,
          materialsCost: 4200.00,
          laborCost: 3800.00,
          taxCost: 750.00
        },
        services: [
          {
            serviceName: "Cedar Pergola (SQFT)",
            quantity: 200,
            unit: "sqft",
            unitPrice: 35.00,
            totalPrice: 7000.00,
            row: 5,
            category: "structures"
          },
          {
            serviceName: "Iowa Rainbow Rock Bed (sqft)",
            quantity: 75,
            unit: "sqft",
            unitPrice: 18.50,
            totalPrice: 1387.50,
            row: 16,
            category: "materials"
          }
        ],
        success: true,
        confidence: 98
      } as MockPricingResult,
      customerContext: {
        firstName: "Sarah",
        isReturnCustomer: true,
        projectType: "luxury outdoor living space",
        urgencyLevel: "seasonal" as const
      } as MockCustomerContext
    },
    
    {
      name: "Emergency Drainage Project",
      pricingResult: {
        totals: {
          totalCost: 1850.00,
          materialsCost: 800.00,
          laborCost: 900.00,
          taxCost: 150.00
        },
        services: [
          {
            serviceName: "EZ Flow French Drain (10' section)",
            quantity: 5,
            unit: "each",
            unitPrice: 250.00,
            totalPrice: 1250.00,
            row: 10,
            category: "drainage"
          },
          {
            serviceName: "Drainage Burying (LNFT)",
            quantity: 50,
            unit: "linear_feet",
            unitPrice: 12.00,
            totalPrice: 600.00,
            row: 9,
            category: "drainage"
          }
        ],
        success: true,
        confidence: 92
      } as MockPricingResult,
      customerContext: {
        firstName: "Mike",
        isReturnCustomer: false,
        projectType: "water damage prevention",
        urgencyLevel: "emergency" as const
      } as MockCustomerContext
    }
  ];

  // Test each scenario
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    
    console.log(`\n🎯 Test Scenario ${i + 1}: ${scenario.name}`);
    console.log('-'.repeat(40));
    
    // Show input details
    console.log('📊 Input Details:');
    console.log(`   • Customer: ${scenario.customerContext.firstName}`);
    console.log(`   • Project: ${scenario.customerContext.projectType}`);
    console.log(`   • Return Customer: ${scenario.customerContext.isReturnCustomer}`);
    console.log(`   • Urgency: ${scenario.customerContext.urgencyLevel}`);
    console.log(`   • Total Cost: $${scenario.pricingResult.totals.totalCost}`);
    console.log(`   • Services Count: ${scenario.pricingResult.services.length}`);
    console.log(`   • Confidence: ${scenario.pricingResult.confidence}%`);
    
    // Format the sales response
    console.log('\n🚀 Generating Sales Response...');
    const startTime = performance.now();
    
    const salesResponse = SalesPersonalityService.formatSalesResponse(
      scenario.pricingResult,
      scenario.customerContext
    );
    
    const endTime = performance.now();
    const processingTime = (endTime - startTime).toFixed(2);
    
    console.log(`⏱️ Processing Time: ${processingTime}ms`);
    console.log('\n📝 Generated Sales Response:');
    console.log('=' .repeat(60));
    console.log(salesResponse);
    console.log('=' .repeat(60));
    
    // Add breakpoint opportunity here
    console.log('\n✅ Scenario completed. Press F10 to continue to next scenario...\n');
  }
  
  console.log('🎉 All Sales Personality tests completed successfully!');
  console.log('\n💡 Key Features Tested:');
  console.log('   • Customer name personalization');
  console.log('   • Return customer recognition');
  console.log('   • Urgency level tone adjustment');
  console.log('   • Price formatting and presentation');
  console.log('   • Service breakdown clarity');
  console.log('   • Professional tone consistency');
}

// Execute if run directly
main().catch(error => {
  console.error('❌ Sales Personality test failed:', error);
  process.exit(1);
});

export { main };