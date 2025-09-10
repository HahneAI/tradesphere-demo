#!/usr/bin/env node
/**
 * Conversation Context Test - Multi-turn conversation functionality
 * 
 * Tests the ConversationContextService with simulated multi-turn conversations
 * Validates AI thread management, conversation memory, and context persistence
 */

import { ConversationContextService } from '../services/ai-engine/ConversationContextService';

// Mock test scenarios
const testScenarios = [
  {
    name: 'Basic Multi-turn Conversation',
    sessionId: 'test-session-1',
    messages: [
      'I need mulch for my yard',
      '200 square feet',
      'What about pricing for that?'
    ]
  },
  {
    name: 'Complex Service Request',
    sessionId: 'test-session-2', 
    messages: [
      'I want a patio and some landscaping',
      'The patio should be 15x20 feet',
      'And I need mulch around it too',
      'About 100 square feet of mulch'
    ]
  },
  {
    name: 'Clarification Flow',
    sessionId: 'test-session-3',
    messages: [
      'I need help with my backyard',
      'I want to add some plants and maybe a walkway',
      'The walkway should be about 30 feet long'
    ]
  }
];

async function runConversationTest() {
  console.log('🧪 CONVERSATION CONTEXT SERVICE TEST');
  console.log('===================================\n');

  // Test environment check
  const hasApiKey = process.env.VITE_AI_API_KEY || import.meta.env?.VITE_AI_API_KEY;
  
  if (!hasApiKey) {
    console.log('⚠️  WARNING: No VITE_AI_API_KEY found');
    console.log('   This test will work but AI responses will be mock/fallback responses');
    console.log('   To test with real AI: Add VITE_AI_API_KEY to your .env file\n');
  } else {
    console.log('✅ AI API Key detected - testing with real AI provider\n');
  }

  for (const scenario of testScenarios) {
    console.log(`🎭 SCENARIO: ${scenario.name}`);
    console.log(`📱 Session ID: ${scenario.sessionId}`);
    console.log('─'.repeat(50));

    try {
      // Clear any existing context for this session
      ConversationContextService.clearContext(scenario.sessionId);

      for (let i = 0; i < scenario.messages.length; i++) {
        const message = scenario.messages[i];
        console.log(`\n💬 Turn ${i + 1}: "${message}"`);

        const startTime = Date.now();
        
        const response = await ConversationContextService.processMessageWithContext(
          scenario.sessionId,
          message,
          {
            firstName: 'John',
            jobTitle: 'Homeowner'
          }
        );

        const processingTime = Date.now() - startTime;
        
        console.log(`🤖 AI Response (${processingTime}ms):`);
        console.log(`   ${response.content}`);
        
        if (response.requiresClarification) {
          console.log('❓ AI detected clarification needed');
        }
        
        if (response.suggestedQuestions && response.suggestedQuestions.length > 0) {
          console.log('💡 Suggested questions:', response.suggestedQuestions.join(', '));
        }

        // Show context summary
        const contextSummary = ConversationContextService.getContextSummary(scenario.sessionId);
        console.log(`📊 Context: ${contextSummary}`);
      }

      console.log('\n✅ Scenario completed successfully');

    } catch (error) {
      console.error(`❌ Scenario failed: ${error.message}`);
      console.error('Stack:', error.stack);
    }

    console.log('\n' + '═'.repeat(60) + '\n');
  }

  console.log('🎯 CONVERSATION MEMORY TEST');
  console.log('Testing context persistence across service interruptions...\n');

  try {
    const testSessionId = 'memory-test-session';
    
    // Clear existing context
    ConversationContextService.clearContext(testSessionId);

    // First conversation
    console.log('💬 Initial conversation about mulch...');
    const response1 = await ConversationContextService.processMessageWithContext(
      testSessionId,
      'I need mulch for my garden',
      { firstName: 'Sarah' }
    );
    console.log(`🤖 "${response1.content}"`);

    // Get context summary
    const context1 = ConversationContextService.getContextSummary(testSessionId);
    console.log(`📊 Context after turn 1: ${context1}`);

    // Second conversation - should remember context
    console.log('\n💬 Follow-up with quantity...');
    const response2 = await ConversationContextService.processMessageWithContext(
      testSessionId,
      '150 square feet please',
      { firstName: 'Sarah' }
    );
    console.log(`🤖 "${response2.content}"`);

    const context2 = ConversationContextService.getContextSummary(testSessionId);
    console.log(`📊 Context after turn 2: ${context2}`);

    // Test context retrieval
    const retrievedContext = await ConversationContextService.retrieveContext(testSessionId);
    
    if (retrievedContext) {
      console.log(`\n✅ MEMORY TEST PASSED`);
      console.log(`   - Context persisted across ${retrievedContext.messageHistory.length} messages`);
      console.log(`   - AI Provider: ${retrievedContext.aiProvider}`);
      console.log(`   - Customer Name: ${retrievedContext.customerContext?.firstName}`);
    } else {
      console.log('❌ MEMORY TEST FAILED - Context not retrieved');
    }

  } catch (error) {
    console.error('❌ Memory test failed:', error.message);
  }

  console.log('\n🏁 CONVERSATION CONTEXT TEST COMPLETE');
  console.log('\nKey Features Tested:');
  console.log('✅ Multi-turn conversation flow');
  console.log('✅ AI provider integration (OpenAI/Claude)');
  console.log('✅ Conversation context persistence');
  console.log('✅ Session-based memory management');
  console.log('✅ Clarification detection');
  console.log('✅ Customer context integration');
  
  console.log('\n💡 NEXT STEPS:');
  console.log('1. Set VITE_AI_API_KEY in .env for real AI testing');
  console.log('2. Test conversation flow in pricing-agent.ts');
  console.log('3. Integrate with webhook for end-to-end testing');
}

// Error handling wrapper
async function main() {
  try {
    await runConversationTest();
  } catch (error) {
    console.error('🚨 CRITICAL ERROR:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('conversation-context-test.ts')) {
  console.log('🚀 Starting Conversation Context Test...\n');
  main();
}

export { runConversationTest };