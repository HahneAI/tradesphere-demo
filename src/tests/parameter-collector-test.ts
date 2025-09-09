#!/usr/bin/env node
/**
 * Parameter Collector Service Test Runner
 * 
 * Tests the parameter collection flow which includes REAL GPT API calls
 * This service orchestrates the entire parameter collection pipeline
 */
import 'dotenv/config';
import { ParameterCollectorService, CollectionResult } from '../services/ai-engine/ParameterCollectorService';

async function main() {
  console.log('🔍 Parameter Collector Service Test Runner');
  console.log('=' .repeat(50));
  console.log('🔍 Starting parameter collection test with REAL API calls...');
  
  // Show environment status
  const gptApiKey = process.env.VITE_OPENAI_API_KEY_MINI;
  const mainAiKey = process.env.VITE_AI_API_KEY;
  
  console.log('\n🔍 Environment Variables Status:');
  if (gptApiKey && gptApiKey.length > 10) {
    console.log(`✅ GPT-4o-mini Key: SET (${gptApiKey.substring(0, 7)}...${gptApiKey.substring(gptApiKey.length - 4)})`);
  } else {
    console.log('❌ GPT-4o-mini Key: NOT SET');
  }
  
  if (mainAiKey && mainAiKey.length > 10) {
    console.log(`✅ Main AI Key: SET (${mainAiKey.substring(0, 7)}...${mainAiKey.substring(mainAiKey.length - 4)})`);
  } else {
    console.log('❌ Main AI Key: NOT SET');
  }
  
  console.log('   - DEBUG_MODE:', process.env.DEBUG_MODE || 'undefined');
  console.log('   - MOCK_MODE:', process.env.MOCK_MODE || 'undefined');
  
  // Test scenarios - these will make REAL API calls
  const testScenarios = [
    {
      name: "Simple Single Service",
      input: "100 square feet of mulch",
      description: "Test single service identification with quantity"
    },
    
    {
      name: "Dimension-Based Multi-Service", 
      input: "need a 15x10 patio with wood chips and steel edging",
      description: "Test automatic dimension calculation + multi-service splitting"
    },
    
    {
      name: "Complex Three-Service Request",
      input: "200 sqft patio installation, 150 sqft mulch bed, and 40 feet of metal edging",
      description: "Test complex multi-service parsing with different units"
    },
    
    {
      name: "Challenging Synonyms",
      input: "bark chips for 12 by 8 area plus aluminum border",
      description: "Test synonym detection: bark chips → mulch, aluminum → metal"
    },
    
    {
      name: "Drainage Emergency Project",
      input: "need french drain 50 feet with flow well, water pooling in yard",
      description: "Test specialized drainage services detection"
    }
  ];

  // Run each test scenario
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    
    console.log(`\n🎯 Test Scenario ${i + 1}: ${scenario.name}`);
    console.log('=' .repeat(60));
    console.log('📝 Input:', scenario.input);
    console.log('💭 Purpose:', scenario.description);
    
    try {
      // This will make REAL GPT API calls through ServiceMappingEngine
      console.log('\n🚀 Starting parameter collection...');
      console.log('⏱️ Timestamp:', new Date().toISOString());
      
      const startTime = performance.now();
      
      // The main method that will orchestrate all the real API calls
      const result: CollectionResult = await ParameterCollectorService.collectParameters(scenario.input);
      
      const endTime = performance.now();
      const totalTime = (endTime - startTime).toFixed(2);
      
      console.log(`\n⏱️ Total Processing Time: ${totalTime}ms`);
      console.log('📊 Collection Results:');
      console.log('=' .repeat(40));
      
      // Display results in detail for debugging
      console.log(`✅ Success: ${result.success}`);
      console.log(`📈 Overall Confidence: ${result.overallConfidence}%`);
      console.log(`🔢 Services Found: ${result.services.length}`);
      
      if (result.services.length > 0) {
        console.log('\n📋 Detected Services:');
        result.services.forEach((service, index) => {
          console.log(`   ${index + 1}. ${service.serviceName}`);
          console.log(`      Quantity: ${service.quantity} ${service.unit}`);
          console.log(`      Row: ${service.row} | Category: ${service.category}`);
          console.log(`      Confidence: ${service.confidence}%`);
          console.log('');
        });
      }
      
      if (result.unmappedText && result.unmappedText.length > 0) {
        console.log('⚠️ Unmapped Text Found:');
        result.unmappedText.forEach(text => {
          console.log(`   • "${text}"`);
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
  
  console.log('\n🎉 All Parameter Collection tests completed!');
  console.log('\n💡 This test executed REAL API calls to:');
  console.log('   • GPT-4o-mini for service categorization and splitting');
  console.log('   • ServiceMappingEngine for text-to-service conversion');
  console.log('   • Dimension calculation for geometric parsing');
  console.log('   • Confidence scoring and validation');
  
  console.log('\n🔧 Debugging Tips:');
  console.log('   • Set breakpoints before each API call');
  console.log('   • Use F10 to step through API responses');
  console.log('   • Inspect result objects for detailed service mapping');
  console.log('   • Check unmappedText for parsing issues');
}

// Execute if run directly
main().catch(error => {
  console.error('❌ Parameter Collector test failed:', error);
  process.exit(1);
});

export { main };