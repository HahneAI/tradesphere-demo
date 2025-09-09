require('dotenv').config();

// Import and test the GPT Service Splitter
async function testWithEnv() {
  console.log('🧪 Testing GPT Service Splitter with Environment Variables');
  console.log('VITE_OPENAI_API_KEY_MINI:', process.env.VITE_OPENAI_API_KEY_MINI ? 'SET' : 'NOT SET');
  
  // Try dynamic import
  try {
    const { GPTServiceSplitter } = await import('./dist/services/ai-engine/GPTServiceSplitter.js');
    
    const input = "15 mulch, 100 patio, and an outdoor kitchen of 36 feet";
    console.log(`🚀 Testing input: "${input}"`);
    
    const splitter = new GPTServiceSplitter();
    const result = await splitter.analyzeAndSplit(input);
    
    console.log('📊 Results:', result);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('💡 Try building the project first: npm run build');
  }
}

testWithEnv().catch(console.error);