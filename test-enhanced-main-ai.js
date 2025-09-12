/**
 * Test script to verify the enhanced main AI agent with few-shot dual-path logic
 * Tests both exploratory calculations and customer quote evolution paths
 */

async function testEnhancedMainAI() {
  console.log('🧪 TESTING ENHANCED MAIN AI AGENT');
  console.log('==================================');

  // Test 1: Exploratory calculations (no customer name)
  const exploratoryTest = {
    sessionId: 'test-main-exploratory-' + Date.now(),
    message: 'I want pricing for a 15x20 patio with some mulch around it',
    firstName: 'User', // Generic name for exploratory
    betaCodeId: 999,
    // No customerName = exploratory path
  };

  // Test 2: Customer quote evolution (customer name present)
  const customerTest = {
    sessionId: 'test-main-customer-' + Date.now(),
    message: 'Actually, let me make that patio 20x20 instead and add 50 more sqft of mulch',
    firstName: 'Jennifer',
    customerName: 'Jennifer Mitchell', // Customer name present = evolution path
    betaCodeId: 999,
  };

  const tests = [
    { name: 'EXPLORATORY PATH (Main AI)', data: exploratoryTest },
    { name: 'CUSTOMER EVOLUTION PATH (Main AI)', data: customerTest }
  ];

  for (const test of tests) {
    try {
      console.log(`\n🔬 Testing: ${test.name}`);
      console.log('=' .repeat(50));
      console.log('📤 Payload:');
      console.log('- Session ID:', test.data.sessionId);
      console.log('- Customer Name:', test.data.customerName || 'NULL');
      console.log('- User Message:', test.data.message);
      console.log('- First Name:', test.data.firstName);

      console.log('🚀 Calling pricing-agent endpoint...');
      const response = await fetch('http://localhost:8888/.netlify/functions/pricing-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(test.data)
      });

      console.log('📥 Response Status:', response.status);
      const responseText = await response.text();
      
      if (response.ok) {
        console.log('✅ TEST PASSED');
        try {
          const jsonResponse = JSON.parse(responseText);
          console.log('🎯 AI Response:');
          console.log(jsonResponse.response || jsonResponse.message || responseText);
          
          console.log('📊 Response Analysis:');
          const responseContent = jsonResponse.response || jsonResponse.message || responseText;
          console.log('- Length:', responseContent.length, 'characters');
          console.log('- Contains "REVISED":', responseContent.includes('REVISED'));
          console.log('- Contains "scenario analysis":', responseContent.toLowerCase().includes('scenario analysis'));
          console.log('- Contains customer name:', test.data.customerName ? responseContent.includes(test.data.firstName) : 'N/A');
          console.log('- Contains pricing:', responseContent.includes('$'));
        } catch (e) {
          console.log('📝 Response (non-JSON):', responseText.substring(0, 500));
        }
      } else {
        console.log('❌ TEST FAILED');
        console.log('📝 Response:', responseText);
      }

    } catch (error) {
      console.error('❌ ERROR TESTING:', error.message);
    }

    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n🏁 ENHANCED MAIN AI TESTING COMPLETE');
  console.log('====================================');
}

// Check if we're running locally
if (typeof window === 'undefined') {
  testEnhancedMainAI();
}