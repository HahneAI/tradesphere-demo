/**
 * Paver Patio Conversation Integration Test
 *
 * Tests the complete sequential variable confirmation conversation flow
 * from initial detection through final quote generation.
 */

import { PaverPatioConversationOrchestrator } from '../services/ai-engine/PaverPatioConversationOrchestrator';
import { PaverPatioContextService } from '../services/ai-engine/PaverPatioContextService';

/**
 * Test complete conversation flow from start to finish
 */
async function testCompleteConversationFlow() {
  console.log('🎭 CONVERSATION FLOW INTEGRATION TEST START');
  console.log('='.repeat(60));

  try {
    const sessionId = `test_${Date.now()}`;
    let conversationStep = 1;

    // Step 1: Initial paver patio request
    console.log('\n📝 STEP 1: Initial paver patio request');
    const initialRequest = '200 sqft paver patio removing concrete with tight access';

    let response = await PaverPatioConversationOrchestrator.handlePaverPatioConversation({
      userMessage: initialRequest,
      sessionId,
      firstName: 'TestUser',
      isInitialRequest: true
    });

    console.log('Initial Response:', {
      type: response.conversationType,
      requiresClarification: response.requiresClarification,
      variablesRemaining: response.variablesRemaining,
      nextVariable: response.nextVariable,
      messageLength: response.message.length
    });

    if (!response.requiresClarification) {
      console.log('⚠️ Expected clarification to be required for comprehensive quote');
      return false;
    }

    console.log('✅ STEP 1 PASSED: Initial analysis and first question generated');

    // Simulate conversation until completion
    const maxQuestions = 5;
    const userResponses = [
      'concrete removal',           // tearoutComplexity
      'difficult access',          // accessDifficulty
      'full crew',                 // teamSize
      'jackhammer needed',         // equipmentRequired
      'premium materials'          // paverStyle
    ];

    for (let i = 0; i < maxQuestions && response.requiresClarification; i++) {
      conversationStep++;
      console.log(`\n🔄 STEP ${conversationStep}: User responds to question ${i + 1}`);

      const userResponse = userResponses[i] || 'standard option';
      console.log(`User Response: "${userResponse}"`);

      response = await PaverPatioConversationOrchestrator.handlePaverPatioConversation({
        userMessage: userResponse,
        sessionId,
        firstName: 'TestUser',
        isInitialRequest: false
      });

      console.log(`Response ${i + 1}:`, {
        type: response.conversationType,
        requiresClarification: response.requiresClarification,
        nextVariable: response.nextVariable,
        variablesRemaining: response.variablesRemaining
      });

      if (response.conversationType === 'complete_quote') {
        console.log('🎉 COMPLETE QUOTE RECEIVED');
        break;
      }

      if (response.conversationType === 'error') {
        throw new Error('Conversation error occurred');
      }
    }

    // Verify final quote was generated
    if (response.conversationType !== 'complete_quote') {
      throw new Error('Final quote was not generated');
    }

    console.log('✅ CONVERSATION FLOW COMPLETED SUCCESSFULLY');
    console.log(`📊 Final Quote Generated:`, {
      totalCost: response.debugInfo?.totalCost,
      laborHours: response.debugInfo?.laborHours,
      squareFootage: response.debugInfo?.squareFootage
    });

    return true;

  } catch (error) {
    console.error('❌ CONVERSATION FLOW TEST FAILED:', error);
    return false;
  }
}

/**
 * Test various initial paver patio request formats
 */
async function testVariousInitialRequests() {
  console.log('\n🔄 TESTING VARIOUS INITIAL REQUEST FORMATS');
  console.log('='.repeat(60));

  const testCases = [
    {
      input: '150 sqft paver patio',
      expectedDetection: true,
      description: 'Basic paver patio with square footage'
    },
    {
      input: '12x15 stone patio removing grass',
      expectedDetection: true,
      description: 'Dimensional stone patio with tearout'
    },
    {
      input: '20x20 paver patio with premium materials and difficult access',
      expectedDetection: true,
      description: 'Complex paver patio with multiple variables'
    },
    {
      input: 'paver patio 300 square feet in backyard',
      expectedDetection: true,
      description: 'Paver patio with alternative wording'
    },
    {
      input: 'flagstone patio installation with curves',
      expectedDetection: true,
      description: 'Natural stone patio with complexity'
    },
    {
      input: '100 sqft of mulch for flower beds',
      expectedDetection: false,
      description: 'Non-patio request (should not trigger)'
    }
  ];

  const results = [];

  for (const testCase of testCases) {
    try {
      console.log(`\n🧪 Testing: "${testCase.input}"`);
      const sessionId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const response = await PaverPatioConversationOrchestrator.handlePaverPatioConversation({
        userMessage: testCase.input,
        sessionId,
        firstName: 'TestUser',
        isInitialRequest: true
      });

      const detected = response.conversationType !== 'clarification_needed' ||
                      response.message.includes('paver patio') ||
                      response.conversationType === 'variable_question';

      const status = detected === testCase.expectedDetection ? '✅ CORRECT' : '❌ INCORRECT';
      console.log(`  Detection: ${status} (Expected: ${testCase.expectedDetection}, Got: ${detected})`);
      console.log(`  Type: ${response.conversationType}`);
      console.log(`  Confidence: ${response.confidence || 'N/A'}`);

      results.push({
        input: testCase.input,
        expected: testCase.expectedDetection,
        detected,
        correct: detected === testCase.expectedDetection,
        type: response.conversationType,
        confidence: response.confidence
      });

    } catch (error) {
      console.log(`  Error: ${error.message}`);
      results.push({
        input: testCase.input,
        expected: testCase.expectedDetection,
        detected: false,
        correct: false,
        error: error.message
      });
    }
  }

  // Calculate accuracy
  const correctResults = results.filter(r => r.correct);
  const accuracy = correctResults.length / results.length;

  console.log('\n📊 DETECTION ACCURACY SUMMARY:');
  console.log('='.repeat(60));
  results.forEach(result => {
    const status = result.correct ? '🎯 CORRECT' : '❌ WRONG';
    console.log(`${status}: "${result.input}" (Expected: ${result.expected}, Got: ${result.detected})`);
  });

  console.log(`\n📈 Overall Accuracy: ${(accuracy * 100).toFixed(1)}% (${correctResults.length}/${results.length})`);

  return { accuracy, results };
}

/**
 * Test context preservation across conversation
 */
async function testContextPreservation() {
  console.log('\n💾 TESTING CONTEXT PRESERVATION');
  console.log('='.repeat(60));

  try {
    const sessionId = `context_test_${Date.now()}`;

    // Step 1: Start conversation
    console.log('\n📝 Starting conversation...');
    let response = await PaverPatioConversationOrchestrator.handlePaverPatioConversation({
      userMessage: 'I need a 15x20 paver patio',
      sessionId,
      firstName: 'ContextTester',
      isInitialRequest: true
    });

    if (!response.requiresClarification) {
      throw new Error('Expected initial clarification');
    }

    // Step 2: Check context was saved
    console.log('\n💾 Checking context preservation...');
    const savedContext = PaverPatioContextService.loadConfirmationState(sessionId);
    if (!savedContext) {
      throw new Error('Context was not saved');
    }

    console.log('Context Check:', {
      phase: savedContext.conversationPhase,
      pendingVariables: savedContext.pendingVariables.length,
      detectedSquareFootage: savedContext.detectedSquareFootage
    });

    // Step 3: Continue conversation
    console.log('\n🔄 Continuing conversation...');
    response = await PaverPatioConversationOrchestrator.handlePaverPatioConversation({
      userMessage: 'removing existing concrete',
      sessionId,
      firstName: 'ContextTester',
      isInitialRequest: false
    });

    // Step 4: Verify context was preserved and updated
    const updatedContext = PaverPatioContextService.loadConfirmationState(sessionId);
    if (!updatedContext) {
      throw new Error('Context was lost during conversation');
    }

    console.log('Updated Context:', {
      phase: updatedContext.conversationPhase,
      pendingVariables: updatedContext.pendingVariables.length,
      questionCount: updatedContext.questionCount
    });

    // Step 5: Check question history
    const questionHistory = PaverPatioContextService.loadQuestionHistory(sessionId);
    console.log('Question History:', {
      historyLength: questionHistory.length,
      lastVariable: questionHistory.length > 0 ? questionHistory[questionHistory.length - 1].variable : 'none'
    });

    console.log('✅ CONTEXT PRESERVATION TEST PASSED');
    return true;

  } catch (error) {
    console.error('❌ CONTEXT PRESERVATION TEST FAILED:', error);
    return false;
  }
}

/**
 * Run all conversation integration tests
 */
async function runAllConversationTests() {
  console.log('🚀 PAVER PATIO CONVERSATION INTEGRATION TESTS');
  console.log('='.repeat(80));

  const results = {
    conversationFlow: false,
    detectionAccuracy: 0,
    contextPreservation: false
  };

  try {
    // Test 1: Complete conversation flow
    results.conversationFlow = await testCompleteConversationFlow();

    // Test 2: Detection accuracy
    const detectionResults = await testVariousInitialRequests();
    results.detectionAccuracy = detectionResults.accuracy;

    // Test 3: Context preservation
    results.contextPreservation = await testContextPreservation();

    // Summary
    console.log('\n🎯 FINAL INTEGRATION TEST RESULTS:');
    console.log('='.repeat(80));
    console.log(`✅ Complete Conversation Flow: ${results.conversationFlow ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Detection Accuracy: ${(results.detectionAccuracy * 100).toFixed(1)}% (Target: >80%)`);
    console.log(`✅ Context Preservation: ${results.contextPreservation ? 'PASSED' : 'FAILED'}`);

    const overallSuccess = results.conversationFlow &&
                          results.detectionAccuracy >= 0.8 &&
                          results.contextPreservation;

    console.log(`\n🎉 OVERALL RESULT: ${overallSuccess ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

    return {
      success: overallSuccess,
      results
    };

  } catch (error) {
    console.error('❌ INTEGRATION TESTS FAILED:', error);
    return {
      success: false,
      error: error.message,
      results
    };
  }
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  runAllConversationTests()
    .then((result) => {
      if (result.success) {
        console.log('\n✅ All conversation integration tests passed!');
        process.exit(0);
      } else {
        console.log('\n❌ Some conversation integration tests failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export {
  testCompleteConversationFlow,
  testVariousInitialRequests,
  testContextPreservation,
  runAllConversationTests
};