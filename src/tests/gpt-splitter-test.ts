#!/usr/bin/env node
/**
 * GPT Service Splitter Test Runner
 * 
 * Dedicated test file for testing GPT Service Splitter with real API keys
 * Imports dotenv/config at the top to ensure environment variables are loaded
 */
import 'dotenv/config';
import { GPTServiceSplitter, CategorySplitResult } from '../services/ai-engine/GPTServiceSplitter';

async function main() {
  console.log('🧪 GPT Service Splitter Test Runner');
  console.log('='.repeat(50));
  console.log('🔍 Starting main() function...');
  
  // Show environment status with masked key
  const apiKey = process.env.VITE_OPENAI_API_KEY_MINI;
  if (apiKey && apiKey.length > 10) {
    console.log('✅ Environment Status: VITE_OPENAI_API_KEY_MINI: SET', 
      `(${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)})`);
  } else {
    console.log('❌ Environment Status: VITE_OPENAI_API_KEY_MINI: NOT SET');
    console.log('💡 Make sure your .env file contains: VITE_OPENAI_API_KEY_MINI=sk-proj-...');
  }
  
  // Show other environment variables for debugging
  console.log('\n🔍 Environment Debug Info:');
  console.log('   - NODE_ENV:', process.env.NODE_ENV || 'undefined');
  console.log('   - DEBUG_MODE:', process.env.DEBUG_MODE || 'undefined');
  console.log('   - TEST_INPUT:', process.env.TEST_INPUT || 'undefined');
  
  // Test input (use env var or default)
  const testInput = process.env.TEST_INPUT || "15x10 patio with wood chips and steel edging";
  console.log('\n📝 Test Input:', testInput);
  
  // Create splitter instance and run test
  console.log('\n🚀 Starting GPT Service Splitter...');
  const splitter = new GPTServiceSplitter();
  
  try {
    const result: CategorySplitResult = await splitter.analyzeAndSplit(testInput);
    
    // Display results with formatting
    console.log('\n📊 GPT Service Splitter Results:');
    console.log('=' .repeat(30));
    console.log('🎯 Detected Categories:', result.detected_categories.join(', '));
    console.log('🔢 Service Count:', result.service_count);
    console.log('📈 Confidence:', result.confidence.toUpperCase());
    console.log('\n📋 Separated Services:');
    result.separated_services.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service}`);
    });
    
    // Show raw JSON for debugging
    console.log('\n🔍 Raw JSON Response:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('\n❌ Error running GPT Service Splitter:', error);
    process.exit(1);
  }
  
  console.log('\n✅ Test completed successfully!');
}

// Execute if run directly
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

export { main };