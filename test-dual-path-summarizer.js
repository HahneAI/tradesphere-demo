/**
 * Test script to verify the improved dual-path GPT summarizer
 * Tests both exploratory calculations and customer quote evolution paths
 */

async function testDualPathSummarizer() {
  console.log('🧪 TESTING DUAL-PATH SUMMARIZER SYSTEM');
  console.log('======================================');

  // Test 1: Exploratory calculations (no customer name)
  const exploratoryTest = {
    sessionId: 'test-exploratory-' + Date.now(),
    userInput: 'How much would a 20x15 patio cost with mulch around it?',
    aiResponse: '**LANDSCAPING QUOTE**\n\n**SERVICE BREAKDOWN:**\n• Paver Patio (300 sq ft): $4,500.00 | 18.0 labor hours\n• Triple Ground Mulch (100 sq ft): $250.00 | 2.0 labor hours\n\n**PROJECT TOTALS:**\n• Total Labor Hours: 20.0 hours\n• **GRAND TOTAL: $4,750.00**',
    firstName: null, // No customer name = exploratory path
    betaCodeId: 999
  };

  // Test 2: Customer quote evolution (customer name present)
  const customerTest = {
    sessionId: 'test-customer-' + Date.now(),
    userInput: 'Actually, let me increase that patio to 25x15 instead',
    aiResponse: '**LANDSCAPING QUOTE - REVISED**\n\nThanks for the adjustment, Jennifer. Here\'s your REVISED quote:\n\n**SERVICE BREAKDOWN:**\n• Paver Patio (375 sq ft): $5,625.00 | 22.5 labor hours\n• Triple Ground Mulch (100 sq ft): $250.00 | 2.0 labor hours\n\n**PROJECT TOTALS:**\n• Total Labor Hours: 24.5 hours\n• **GRAND TOTAL: $5,875.00**',
    firstName: 'Jennifer', // Customer name present = quote evolution path
    customerName: 'Jennifer',
    betaCodeId: 999,
    previousContext: {
      interaction_summary: 'Jennifer explored pricing for 300 sqft patio ($4500) + 100 sqft mulch ($250) = $4750 total, 20 hours.'
    }
  };

  const tests = [
    { name: 'EXPLORATORY PATH (No Customer)', data: exploratoryTest },
    { name: 'CUSTOMER EVOLUTION PATH (With Customer)', data: customerTest }
  ];

  for (const test of tests) {
    try {
      console.log(`\n🔬 Testing: ${test.name}`);
      console.log('=' .repeat(50));
      console.log('📤 Payload:');
      console.log('- Session ID:', test.data.sessionId);
      console.log('- Customer Name:', test.data.firstName || test.data.customerName || 'NULL');
      console.log('- User Input:', test.data.userInput.substring(0, 80) + '...');
      console.log('- AI Response Length:', test.data.aiResponse.length);
      console.log('- Previous Context:', !!test.data.previousContext);

      const response = await fetch('http://localhost:8888/.netlify/functions/generate-interaction-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: test.data.sessionId,
          interactionNumber: 1,
          customerName: test.data.firstName || test.data.customerName,
          userInput: test.data.userInput,
          aiResponse: test.data.aiResponse,
          previousContext: test.data.previousContext
        })
      });

      console.log('📥 Response Status:', response.status);
      const responseText = await response.text();
      
      if (response.ok) {
        console.log('✅ TEST PASSED');
        try {
          const jsonResponse = JSON.parse(responseText);
          if (jsonResponse.summary) {
            console.log('🎯 Generated Summary:', jsonResponse.summary);
            console.log('📊 Summary Analysis:');
            console.log('- Length:', jsonResponse.summary.length, 'characters');
            console.log('- Contains customer name:', test.data.firstName ? jsonResponse.summary.includes(test.data.firstName) : 'N/A');
            console.log('- Contains "explored":', jsonResponse.summary.toLowerCase().includes('explored'));
            console.log('- Contains "REVISED":', jsonResponse.summary.includes('REVISED'));
          }
        } catch (e) {
          console.log('📝 Response (non-JSON):', responseText);
        }
      } else {
        console.log('❌ TEST FAILED');
        console.log('📝 Response:', responseText);
      }

    } catch (error) {
      console.error('❌ ERROR TESTING:', error.message);
    }
  }

  console.log('\n🏁 DUAL-PATH SUMMARIZER TESTING COMPLETE');
  console.log('==========================================');
}

// Check if we're running locally
if (typeof window === 'undefined') {
  testDualPathSummarizer();
}