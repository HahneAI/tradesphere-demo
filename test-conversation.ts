/**
 * Test the AI conversation with the specific problematic input
 */

import { GPTServiceSplitter } from './src/services/ai-engine/GPTServiceSplitter';
import { ParameterCollectorService } from './src/services/ai-engine/ParameterCollectorService';
import { createPricingCalculator } from './src/services/ai-engine/PricingCalculatorService';
import { MainChatAgentService } from './src/services/ai-engine/MainChatAgentService';

async function testSpecificInput() {
  const input = "15 mulch, 100 patio, and an outdoor kitchen of 36 feet";
  console.log('🧪 TESTING SPECIFIC INPUT:', input);
  console.log('🎯 Expected: Triple Ground Mulch ($37.50) + Paver Patio ($5,500) + Outdoor Kitchen ($61,200)');
  console.log('');
  
  try {
    // Step 1: GPT Service Splitting
    console.log('🤖 STEP 1: GPT SERVICE SPLITTING');
    const gptSplitter = new GPTServiceSplitter();
    const splitResult = await gptSplitter.analyzeAndSplit(input);
    console.log('📊 GPT Split Result:', {
      services: splitResult.service_count,
      categories: splitResult.detected_categories,
      confidence: splitResult.confidence
    });
    
    // Step 2: Parameter Collection  
    console.log('\n🎯 STEP 2: PARAMETER COLLECTION');
    const collectionResult = await ParameterCollectorService.collectParametersWithSplitServices(input, splitResult);
    console.log('📋 Collection Result:', {
      completeServices: collectionResult.services.length,
      incompleteServices: collectionResult.incompleteServices.length,
      totalServices: collectionResult.services.length + collectionResult.incompleteServices.length
    });
    
    // Step 3: Pricing Calculation
    if (collectionResult.services.length > 0) {
      console.log('\n💰 STEP 3: PRICING CALCULATION');
      const pricingCalculator = createPricingCalculator();
      const pricingResult = await pricingCalculator.calculatePricing(collectionResult.services, 99); // Beta Code 99
      
      if (pricingResult.success) {
        console.log('💵 PRICING SUCCESS!');
        console.log('📊 Services Priced:');
        pricingResult.services.forEach((service, i) => {
          console.log(`  ${i+1}. ${service.serviceName}: $${service.totalPrice.toFixed(2)} (${service.laborHours}h)`);
        });
        console.log(`💰 TOTAL: $${pricingResult.totals.totalCost.toFixed(2)} | ${pricingResult.totals.totalLaborHours}h`);
        
        // Step 4: Main Chat Agent
        console.log('\n🧠 STEP 4: MAIN CHAT AGENT');
        const chatInput = {
          originalMessage: input,
          sessionId: 'test-specific-123',
          firstName: 'TestUser',
          collectionResult,
          pricingResult,
          betaCodeId: 99
        };
        
        const chatResponse = await MainChatAgentService.generateResponse(chatInput);
        console.log('🤖 FINAL AI RESPONSE:');
        console.log('=====================================');
        console.log(chatResponse.message);
        console.log('=====================================');
        console.log('📋 Response Type:', chatResponse.conversationType);
        console.log('❓ Needs Clarification:', chatResponse.requiresClarification);
        
      } else {
        console.error('❌ PRICING FAILED:', pricingResult.error);
      }
    } else {
      console.log('⚠️ No complete services to price');
    }
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testSpecificInput()
  .then(() => console.log('\n✅ Test completed'))
  .catch(error => console.error('❌ Test failed:', error));