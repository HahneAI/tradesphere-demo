require('dotenv').config();

// Test the specific input that was causing math issues
const testInput = "15 mulch, 100 patio, and an outdoor kitchen of 36 feet";

console.log('🧪 Testing specific problematic input:', testInput);
console.log('🔍 Expected: All 3 services with correct pricing totals');
console.log('🎯 Previous issue: Only showing first service, wrong math');
console.log('');

// Import and run the test
import('./src/tests/netlify-function-test.js')
  .then(async (module) => {
    // Set the test input as environment variable
    process.env.TEST_INPUT = testInput;
    
    // Run specific test if available
    if (module.runSpecificTest) {
      await module.runSpecificTest(testInput);
    } else {
      console.log('ℹ️ Running with environment variable TEST_INPUT set');
    }
  })
  .catch(error => {
    console.error('❌ Error running test:', error.message);
    console.log('🔧 Trying direct command line approach...');
  });