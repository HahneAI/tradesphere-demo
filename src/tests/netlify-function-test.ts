#!/usr/bin/env node
/**
 * Netlify Function (Pricing Agent) Test Runner
 * 
 * Tests the complete end-to-end pipeline with ALL REAL API calls:
 * 1. GPT-4o-mini for service splitting
 * 2. Parameter collection with real AI processing
 * 3. Google Sheets API for pricing calculations  
 * 4. Sales personality formatting
 */
import 'dotenv/config';

// Import the main pricing agent function directly
import { ParameterCollectorService } from '../services/ai-engine/ParameterCollectorService';
import { PricingCalculatorService } from '../services/ai-engine/PricingCalculatorService';
import { SalesPersonalityService } from '../services/ai-engine/SalesPersonalityService';

async function main() {
  console.log('⚡ Netlify Function (Pricing Agent) Full Pipeline Test');
  console.log('=' .repeat(60));
  console.log('🚀 Testing complete end-to-end flow with ALL REAL API calls...');
  
  // Show comprehensive environment status
  const gptApiKey = process.env.VITE_OPENAI_API_KEY_MINI;
  const mainAiKey = process.env.VITE_AI_API_KEY;
  const sheetsId = process.env.VITE_GOOGLE_SHEETS_SHEET_ID;
  const googleApiKey = process.env.VITE_GOOGLE_SHEETS_API_KEY;
  
  console.log('\n🔍 Environment Variables Status:');
  console.log(`✅ GPT-4o-mini Key: ${gptApiKey ? `SET (${gptApiKey.substring(0, 7)}...)` : 'NOT SET'}`);
  console.log(`✅ Main AI Key: ${mainAiKey ? `SET (${mainAiKey.substring(0, 7)}...)` : 'NOT SET'}`);
  console.log(`✅ Google Sheets ID: ${sheetsId ? `SET (...${sheetsId.substring(sheetsId.length - 8)})` : 'NOT SET'}`);
  console.log(`✅ Google API Key: ${googleApiKey ? `SET (${googleApiKey.substring(0, 10)}...)` : 'NOT SET'}`);
  console.log('   - DEBUG_MODE:', process.env.DEBUG_MODE || 'undefined');
  
  // Test scenarios that simulate real customer requests
  const testScenarios = [
    {
      name: "Standard Backyard Project",
      message: "I need a 15x10 patio with mulch and metal edging",
      sessionId: "test-session-001",
      firstName: "John",
      betaCodeId: 1,
      description: "Complete standard landscaping project"
    },
    
    {
      name: "Complex Multi-Area Project", 
      message: "200 sqft paver patio, 150 sqft mulch bed, and 40 feet of metal edging for my backyard",
      sessionId: "test-session-002",
      firstName: "Sarah",
      betaCodeId: 1,
      description: "Large-scale project with multiple components"
    },
    
    {
      name: "Emergency Drainage Solution",
      message: "need french drain 50 feet with flow well, have standing water after rain",
      sessionId: "test-session-003",
      firstName: "Mike",
      betaCodeId: 1,
      description: "Urgent drainage problem requiring specialized services"
    },
    
    {
      name: "Premium Structure Installation",
      message: "want a cedar pergola for 20x15 area, looking for quality materials",
      sessionId: "test-session-004",
      firstName: "Lisa",
      betaCodeId: 1,
      description: "High-end structure project"
    }
  ];

  // Process each scenario through the complete pipeline
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    
    console.log(`\n🎯 Pipeline Test ${i + 1}: ${scenario.name}`);
    console.log('=' .repeat(70));
    console.log('📝 Customer Message:', scenario.message);
    console.log('👤 Customer:', scenario.firstName);
    console.log('🆔 Session ID:', scenario.sessionId);
    console.log('🎫 Beta Code ID:', scenario.betaCodeId);
    console.log('💭 Purpose:', scenario.description);
    
    const pipelineStartTime = performance.now();
    
    try {
      // STEP 1: Parameter Collection (includes GPT API calls)
      console.log('\n🎯 STEP 1: PARAMETER COLLECTION');
      console.log('-'.repeat(40));
      console.log('🚀 Starting parameter collection with GPT-4o-mini...');
      
      const step1StartTime = performance.now();
      const collectionResult = await ParameterCollectorService.collectParameters(scenario.message);
      const step1EndTime = performance.now();
      const step1Time = (step1EndTime - step1StartTime).toFixed(2);
      
      console.log(`⏱️ Step 1 completed in ${step1Time}ms`);
      console.log(`📊 Services found: ${collectionResult.services.length}`);
      console.log(`📈 Overall confidence: ${collectionResult.overallConfidence}%`);
      
      if (collectionResult.services.length === 0) {
        console.log('❌ No services detected, skipping to next scenario');
        continue;
      }
      
      // STEP 2: Pricing Calculation (Google Sheets API)
      console.log('\n💰 STEP 2: PRICING CALCULATION');
      console.log('-'.repeat(40));
      console.log('🚀 Starting pricing calculation with Google Sheets API...');
      
      const step2StartTime = performance.now();
      const calculator = new PricingCalculatorService();
      const pricingResult = await calculator.calculatePricing(collectionResult.services, scenario.betaCodeId);
      const step2EndTime = performance.now();
      const step2Time = (step2EndTime - step2StartTime).toFixed(2);
      
      console.log(`⏱️ Step 2 completed in ${step2Time}ms`);
      console.log(`💵 Total cost: $${pricingResult.totals?.totalCost.toFixed(2) || '0.00'}`);
      console.log(`✅ Pricing success: ${pricingResult.success}`);
      
      if (!pricingResult.success) {
        console.log('❌ Pricing failed, skipping to next scenario');
        continue;
      }
      
      // STEP 3: Sales Response Formatting
      console.log('\n📝 STEP 3: SALES RESPONSE FORMATTING');
      console.log('-'.repeat(40));
      console.log('🚀 Generating sales response...');
      
      const step3StartTime = performance.now();
      const customerContext = {
        firstName: scenario.firstName,
        isReturnCustomer: false,
        projectType: scenario.description,
        urgencyLevel: 'routine' as const
      };
      
      const salesResponse = SalesPersonalityService.formatSalesResponse(pricingResult, customerContext);
      const step3EndTime = performance.now();
      const step3Time = (step3EndTime - step3StartTime).toFixed(2);
      
      console.log(`⏱️ Step 3 completed in ${step3Time}ms`);
      
      const pipelineEndTime = performance.now();
      const totalPipelineTime = (pipelineEndTime - pipelineStartTime).toFixed(2);
      
      // RESULTS SUMMARY
      console.log('\n🎉 PIPELINE RESULTS SUMMARY');
      console.log('=' .repeat(50));
      console.log(`⏱️ Total Pipeline Time: ${totalPipelineTime}ms`);
      console.log(`   • Parameter Collection: ${step1Time}ms`);
      console.log(`   • Pricing Calculation: ${step2Time}ms`);
      console.log(`   • Sales Formatting: ${step3Time}ms`);
      
      console.log(`\n📊 Services Processed: ${collectionResult.services.length}`);
      collectionResult.services.forEach((service, index) => {
        console.log(`   ${index + 1}. ${service.serviceName}: ${service.quantity} ${service.unit}`);
      });
      
      if (pricingResult.totals) {
        console.log(`\n💰 Final Pricing:`);
        console.log(`   • Total Labor Hours: ${pricingResult.totals.totalLaborHours.toFixed(1)}h`);
        console.log(`   • TOTAL COST: $${pricingResult.totals.totalCost.toFixed(2)}`);
        // REMOVED: Artificial breakdown fields - see docs/pricing-multipliers-future.md
        // console.log(`   • Materials: $${pricingResult.totals.materialsCost.toFixed(2)}`);
        // console.log(`   • Labor: $${pricingResult.totals.laborCost.toFixed(2)}`);
        // console.log(`   • Tax: $${pricingResult.totals.taxCost.toFixed(2)}`);
      }
      
      console.log('\n📄 Generated Sales Response:');
      console.log('=' .repeat(60));
      console.log(salesResponse);
      console.log('=' .repeat(60));
      
      // API Usage Summary
      console.log('\n📡 API Calls Made:');
      console.log('   ✅ GPT-4o-mini: Service categorization & splitting');
      console.log('   ✅ ServiceMappingEngine: Text-to-service conversion');
      console.log('   ✅ Google Sheets API: Real pricing calculations');
      console.log('   ✅ Sales Personality: Customer-focused response');
      
    } catch (error) {
      console.error(`\n❌ Pipeline failed for scenario "${scenario.name}":`, error);
      
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        if (error.stack) {
          console.error('Stack trace:', error.stack);
        }
      }
    }
    
    // Pause between scenarios for debugging
    console.log('\n✅ Pipeline scenario completed. Press F10 to continue...\n');
    console.log('='.repeat(100));
  }
  
  console.log('\n🏆 ALL PIPELINE TESTS COMPLETED!');
  console.log('\n🎯 Full End-to-End Testing Summary:');
  console.log('   🤖 GPT-4o-mini API: Real service splitting & categorization');
  console.log('   🔍 Parameter Collection: Real AI-powered text analysis');
  console.log('   📊 Google Sheets API: Live pricing calculations');
  console.log('   🎭 Sales Formatting: Professional customer responses');
  console.log('   ⏱️ Performance Metrics: Complete timing analysis');
  
  console.log('\n🔧 Debugging Benefits:');
  console.log('   • Set breakpoints at any step in the pipeline');
  console.log('   • Use F10 to step through each API call');
  console.log('   • Inspect all intermediate results and transformations');
  console.log('   • Monitor real API latencies and responses');
  console.log('   • Test complete customer journey end-to-end');
  
  console.log('\n💡 This is your COMPLETE pricing agent in action!');
}

// Execute if run directly
main().catch(error => {
  console.error('❌ Netlify Function pipeline test failed:', error);
  process.exit(1);
});

export { main };