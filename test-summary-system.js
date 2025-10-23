/**
 * Test script to verify the interaction summary system is working
 * This simulates the pricing-agent process that should trigger the summary function
 */

async function testInteractionSummary() {
  console.log('🧪 TESTING INTERACTION SUMMARY SYSTEM');
  console.log('=====================================');

  const testPayload = {
    sessionId: 'test-summary-' + Date.now(),
    userInput: 'I need a 15x20 patio with mulch around it, about 100 square feet of mulch',
    aiResponse: '**LANDSCAPING QUOTE**\n\nThank you for your interest! Here\'s your project breakdown:\n\n**SERVICE BREAKDOWN:**\n• Paver Patio (300 sq ft): $4,500.00 | 18.0 labor hours\n• Triple Ground Mulch (100 sq ft): $250.00 | 2.0 labor hours\n\n**PROJECT TOTALS:**\n• Total Labor Hours: 20.0 hours\n• **GRAND TOTAL: $4,750.00**\n\nThis quote includes professional installation, site preparation, and materials. We\'d be happy to schedule a consultation to discuss your project in detail!',
    firstName: 'TestUser',
    betaCodeId: 999
  };

  try {
    console.log('📤 Sending request to generate-interaction-summary...');
    console.log('Session ID:', testPayload.sessionId);
    console.log('User Input Length:', testPayload.userInput.length);
    console.log('AI Response Length:', testPayload.aiResponse.length);

    const response = await fetch('http://localhost:8888/.netlify/functions/generate-interaction-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    console.log('📥 Response Status:', response.status);
    const responseText = await response.text();
    console.log('📥 Response Body:', responseText);

    if (response.ok) {
      console.log('✅ INTERACTION SUMMARY TEST PASSED');
      try {
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.summary) {
          console.log('🎯 Generated Summary:', jsonResponse.summary);
        }
      } catch (e) {
        // Response might not be JSON
      }
    } else {
      console.log('❌ INTERACTION SUMMARY TEST FAILED');
    }

  } catch (error) {
    console.error('❌ ERROR TESTING INTERACTION SUMMARY:', error.message);
  }
}

// Check if we're running locally
if (typeof window === 'undefined') {
  testInteractionSummary();
}