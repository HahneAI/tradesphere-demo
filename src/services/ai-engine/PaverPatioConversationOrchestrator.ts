/**
 * PaverPatioConversationOrchestrator - Main Conversation Flow Controller
 *
 * Orchestrates the complete paver patio variable confirmation conversation flow.
 * Integrates all paver patio services to create a seamless educational experience.
 *
 * Features:
 * - Multi-turn conversation management
 * - Sequential variable confirmation
 * - Integration with existing MainChatAgentService
 * - Educational question flow
 * - Automatic state management
 * - Final calculation coordination
 */

import { PaverPatioIntelligenceService, type PaverPatioAnalysisResult, type VariableConfirmationState } from './PaverPatioIntelligenceService';
import { PaverPatioQuestionService, type QuestionContext } from './PaverPatioQuestionService';
import { PaverPatioContextService } from './PaverPatioContextService';
import { PricingCalculatorService } from '../../pricing-system/ai-engine/pricing-calculation/PricingCalculatorService';
import type { PaverPatioValues } from '../../pricing-system/core/master-formula/formula-types';

export interface ConversationRequest {
  userMessage: string;
  sessionId: string;
  firstName?: string;
  isInitialRequest?: boolean;
}

export interface ConversationResponse {
  message: string;
  conversationType: 'initial_analysis' | 'variable_question' | 'complete_quote' | 'clarification_needed' | 'error';
  sessionId: string;
  requiresClarification: boolean;
  variablesRemaining?: number;
  confidence?: number;
  nextVariable?: string;
  educationalContext?: string;
  debugInfo?: any;
}

export class PaverPatioConversationOrchestrator {
  /**
   * Main conversation handler - routes based on conversation state
   */
  static async handlePaverPatioConversation(request: ConversationRequest): Promise<ConversationResponse> {
    console.log('🎭 CONVERSATION ORCHESTRATOR START');
    console.log(`Session: ${request.sessionId}`);
    console.log(`Message: "${request.userMessage}"`);
    console.log(`Initial Request: ${request.isInitialRequest || false}`);

    try {
      // Step 1: Check if we have ongoing conversation state
      let confirmationState = PaverPatioContextService.loadConfirmationState(request.sessionId);

      if (!confirmationState || request.isInitialRequest) {
        // Step 2: Initial analysis of new request
        return await this.handleInitialAnalysis(request);
      } else {
        // Step 3: Continue existing conversation
        return await this.handleContinuation(request, confirmationState);
      }

    } catch (error) {
      console.error('❌ CONVERSATION ORCHESTRATION FAILED:', error);
      return this.createErrorResponse(request.sessionId, error);
    }
  }

  /**
   * Handle initial paver patio request analysis
   */
  private static async handleInitialAnalysis(request: ConversationRequest): Promise<ConversationResponse> {
    console.log('🔍 INITIAL ANALYSIS START');

    try {
      // Analyze user request using intelligence service
      const analysis: PaverPatioAnalysisResult = await PaverPatioIntelligenceService.analyzePaverPatioRequest({
        userMessage: request.userMessage,
        sessionId: request.sessionId
      });

      // Save confirmation state
      PaverPatioContextService.saveConfirmationState(
        request.sessionId,
        analysis.confirmationState,
        request.userMessage
      );

      if (!analysis.isPaverPatio) {
        console.log('❌ NOT A PAVER PATIO REQUEST');
        return {
          message: "I didn't detect a paver patio request in your message. Could you clarify what type of landscaping project you need help with?",
          conversationType: 'clarification_needed',
          sessionId: request.sessionId,
          requiresClarification: true,
          confidence: analysis.confidence
        };
      }

      console.log('✅ PAVER PATIO DETECTED');
      console.log(`Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
      console.log(`Missing Variables: ${analysis.missingVariables.length}`);

      // Check if we need to ask questions
      if (analysis.confirmationState.conversationPhase === 'ready_for_calculation') {
        console.log('🎯 READY FOR CALCULATION - No questions needed');
        return await this.generateFinalQuote(analysis.confirmationState, request.sessionId);
      }

      // Generate first question
      const nextVariable = analysis.confirmationState.currentQuestionVariable;
      if (!nextVariable) {
        console.log('❌ NO NEXT VARIABLE IDENTIFIED');
        return await this.generateFinalQuote(analysis.confirmationState, request.sessionId);
      }

      const question = await this.generateVariableQuestion(nextVariable, request, analysis.confirmationState);

      return {
        message: this.formatInitialResponse(analysis, question, request.firstName),
        conversationType: 'variable_question',
        sessionId: request.sessionId,
        requiresClarification: true,
        variablesRemaining: analysis.missingVariables.length,
        confidence: analysis.confidence,
        nextVariable,
        educationalContext: analysis.educationalContext,
        debugInfo: {
          detectedSquareFootage: analysis.detectedSquareFootage,
          extractedVariables: Object.keys(analysis.extractedVariables).length,
          missingVariables: analysis.missingVariables
        }
      };

    } catch (error) {
      console.error('❌ INITIAL ANALYSIS FAILED:', error);
      return this.createErrorResponse(request.sessionId, error);
    }
  }

  /**
   * Handle continuation of existing conversation
   */
  private static async handleContinuation(request: ConversationRequest, state: VariableConfirmationState): Promise<ConversationResponse> {
    console.log('🔄 CONVERSATION CONTINUATION');
    console.log(`Phase: ${state.conversationPhase}`);
    console.log(`Current Variable: ${state.currentQuestionVariable}`);
    console.log(`Question Count: ${state.questionCount}`);

    if (state.conversationPhase !== 'confirming_variables' || !state.currentQuestionVariable) {
      console.log('🎯 READY FOR CALCULATION');
      return await this.generateFinalQuote(state, request.sessionId);
    }

    try {
      const currentVariable = state.currentQuestionVariable;

      // Process user response to current question
      const updatedState = await PaverPatioIntelligenceService.processVariableConfirmation(
        request.userMessage,
        state,
        currentVariable
      );

      // Record the question and response
      const questionHistory = PaverPatioContextService.loadQuestionHistory(request.sessionId);
      const lastQuestion = questionHistory.length > 0 ? questionHistory[questionHistory.length - 1].question : 'Previous question';

      PaverPatioContextService.recordQuestionResponse(
        request.sessionId,
        currentVariable,
        lastQuestion,
        request.userMessage,
        this.getNestedValue(updatedState.confirmedVariables, currentVariable)
      );

      // Save updated state
      PaverPatioContextService.saveConfirmationState(request.sessionId, updatedState);

      // Check if we should continue asking questions
      if (updatedState.conversationPhase === 'ready_for_calculation' || !updatedState.currentQuestionVariable) {
        console.log('🎯 CONVERSATION COMPLETE - Ready for calculation');
        return await this.generateFinalQuote(updatedState, request.sessionId);
      }

      // Generate next question
      const nextVariable = updatedState.currentQuestionVariable;
      const nextQuestion = await this.generateVariableQuestion(nextVariable, request, updatedState);

      return {
        message: this.formatContinuationResponse(updatedState, nextQuestion, request.firstName),
        conversationType: 'variable_question',
        sessionId: request.sessionId,
        requiresClarification: true,
        variablesRemaining: updatedState.pendingVariables.length,
        nextVariable,
        debugInfo: {
          confirmedVariable: currentVariable,
          confirmedValue: this.getNestedValue(updatedState.confirmedVariables, currentVariable),
          questionsAsked: updatedState.questionCount,
          maxQuestions: updatedState.maxQuestions
        }
      };

    } catch (error) {
      console.error('❌ CONVERSATION CONTINUATION FAILED:', error);
      return this.createErrorResponse(request.sessionId, error);
    }
  }

  /**
   * Generate variable question with context
   */
  private static async generateVariableQuestion(
    variableName: string,
    request: ConversationRequest,
    state: VariableConfirmationState
  ): Promise<string> {
    try {
      const questionContext: QuestionContext = {
        variableName,
        userMessage: request.userMessage,
        confirmedVariables: state.confirmedVariables,
        questionCount: state.questionCount
      };

      return await PaverPatioQuestionService.generateVariableQuestion(questionContext);
    } catch (error) {
      console.error('❌ QUESTION GENERATION FAILED:', error);
      return `Could you provide more details about ${variableName} for your paver patio project?`;
    }
  }

  /**
   * Generate final quote using confirmed variables
   */
  private static async generateFinalQuote(state: VariableConfirmationState, sessionId: string): Promise<ConversationResponse> {
    console.log('💰 GENERATING FINAL QUOTE');

    try {
      // Validate we have enough information
      const validation = PaverPatioContextService.validateCompleteness(state);

      if (!validation.readyForCalculation) {
        console.log('⚠️ INSUFFICIENT VARIABLES FOR CALCULATION');
        console.log(`Missing critical: ${validation.missingCritical}`);

        return {
          message: `I need a bit more information to provide an accurate quote. We're missing: ${validation.missingCritical.join(', ')}. Could you provide these details?`,
          conversationType: 'clarification_needed',
          sessionId,
          requiresClarification: true,
          confidence: validation.confidence
        };
      }

      // Create paver patio service for calculation
      const sqft = state.detectedSquareFootage || this.getNestedValue(state.confirmedVariables, 'squareFootage') || 200;

      const paverPatioService = {
        serviceName: 'Paver Patio (SQFT)',
        quantity: sqft,
        unit: 'sqft',
        row: 999, // Master formula routing
        isSpecial: true,
        status: 'complete' as const,
        specialRequirements: {
          paverPatioValues: this.convertToMasterFormulaValues(state.confirmedVariables, state.detectedSquareFootage)
        }
      };

      // Calculate pricing using master formula
      const calculator = new PricingCalculatorService();
      const pricingResult = await calculator.calculatePricing([paverPatioService]);

      if (!pricingResult.success) {
        throw new Error(`Pricing calculation failed: ${pricingResult.error}`);
      }

      // Create comprehensive quote response
      const quoteMessage = this.formatFinalQuote(pricingResult, state, validation);

      // Clear context after successful quote
      PaverPatioContextService.clearConfirmationState(sessionId);

      console.log('✅ FINAL QUOTE GENERATED');
      console.log(`Total Cost: $${pricingResult.totals.totalCost.toFixed(2)}`);
      console.log(`Labor Hours: ${pricingResult.totals.totalLaborHours.toFixed(1)}h`);

      return {
        message: quoteMessage,
        conversationType: 'complete_quote',
        sessionId,
        requiresClarification: false,
        confidence: validation.confidence,
        debugInfo: {
          totalCost: pricingResult.totals.totalCost,
          laborHours: pricingResult.totals.totalLaborHours,
          squareFootage: sqft,
          calculationTime: pricingResult.calculationTime
        }
      };

    } catch (error) {
      console.error('❌ FINAL QUOTE GENERATION FAILED:', error);
      return this.createErrorResponse(sessionId, error);
    }
  }

  /**
   * Convert confirmed variables to master formula format
   */
  private static convertToMasterFormulaValues(confirmedVariables: any, detectedSquareFootage?: number): PaverPatioValues {
    // Start with safe defaults
    const paverPatioValues: PaverPatioValues = {
      excavation: {
        tearoutComplexity: 'grass',
        equipmentRequired: 'handTools'
      },
      siteAccess: {
        accessDifficulty: 'moderate',
        obstacleRemoval: 'minor'
      },
      materials: {
        paverStyle: 'economy',
        cuttingComplexity: 'moderate',
        patternComplexity: 'minimal'
      },
      labor: {
        teamSize: 'threePlus'
      },
      complexity: {
        overallComplexity: 1.0
      }
    };

    // Override with confirmed variables
    if (confirmedVariables.excavation?.tearoutComplexity) {
      paverPatioValues.excavation.tearoutComplexity = confirmedVariables.excavation.tearoutComplexity;
    }
    if (confirmedVariables.excavation?.equipmentRequired) {
      paverPatioValues.excavation.equipmentRequired = confirmedVariables.excavation.equipmentRequired;
    }
    if (confirmedVariables.siteAccess?.accessDifficulty) {
      paverPatioValues.siteAccess.accessDifficulty = confirmedVariables.siteAccess.accessDifficulty;
    }
    if (confirmedVariables.siteAccess?.obstacleRemoval) {
      paverPatioValues.siteAccess.obstacleRemoval = confirmedVariables.siteAccess.obstacleRemoval;
    }
    if (confirmedVariables.materials?.paverStyle) {
      paverPatioValues.materials.paverStyle = confirmedVariables.materials.paverStyle;
    }
    if (confirmedVariables.materials?.cuttingComplexity) {
      paverPatioValues.materials.cuttingComplexity = confirmedVariables.materials.cuttingComplexity;
    }
    if (confirmedVariables.materials?.patternComplexity) {
      paverPatioValues.materials.patternComplexity = confirmedVariables.materials.patternComplexity;
    }
    if (confirmedVariables.labor?.teamSize) {
      paverPatioValues.labor.teamSize = confirmedVariables.labor.teamSize;
    }
    if (confirmedVariables.complexity?.overallComplexity) {
      paverPatioValues.complexity.overallComplexity = confirmedVariables.complexity.overallComplexity;
    }

    return paverPatioValues;
  }

  /**
   * Format initial response with analysis results
   */
  private static formatInitialResponse(analysis: PaverPatioAnalysisResult, question: string, firstName?: string): string {
    const greeting = firstName ? `Hi ${firstName}! ` : 'Hi! ';
    const confidence = analysis.confidence >= 0.8 ? 'Great!' : 'Perfect!';

    let response = `${greeting}${confidence} I can help you get an accurate quote for your paver patio project.`;

    // Add detected information
    if (analysis.detectedSquareFootage) {
      response += ` I see you're looking at a ${analysis.detectedSquareFootage} square foot patio.`;
    }

    // Add educational context if available
    if (analysis.educationalContext) {
      response += `\n\n💡 ${analysis.educationalContext}`;
    }

    response += `\n\nTo provide the most accurate pricing, I'll ask you a few quick questions about your specific project conditions. Each factor significantly affects the final cost.\n\n${question}`;

    return response;
  }

  /**
   * Format continuation response with progress
   */
  private static formatContinuationResponse(state: VariableConfirmationState, question: string, firstName?: string): string {
    const thanks = 'Thanks for that information! ';
    const progress = state.pendingVariables.length > 0
      ? `Just ${state.pendingVariables.length} more question${state.pendingVariables.length === 1 ? '' : 's'} to get you the most accurate quote.\n\n`
      : 'Almost done! ';

    return `${thanks}${progress}${question}`;
  }

  /**
   * Format final comprehensive quote
   */
  private static formatFinalQuote(pricingResult: any, state: VariableConfirmationState, validation: any): string {
    const summary = PaverPatioContextService.getConfirmationSummary(state);
    const sqft = state.detectedSquareFootage || this.getNestedValue(state.confirmedVariables, 'squareFootage') || 200;

    let quote = `🎉 **Your Paver Patio Quote**\n\n`;
    quote += `${summary}\n\n`;
    quote += `**📊 Pricing Breakdown:**\n`;
    quote += `• **Total Project Cost:** $${pricingResult.totals.totalCost.toFixed(2)}\n`;
    quote += `• **Labor Hours:** ${pricingResult.totals.totalLaborHours.toFixed(1)} hours\n`;
    quote += `• **Project Size:** ${sqft} square feet\n`;
    quote += `• **Cost per Square Foot:** $${(pricingResult.totals.totalCost / sqft).toFixed(2)}\n\n`;

    // Add confidence indicator
    const confidencePercent = (validation.confidence * 100).toFixed(0);
    quote += `**🎯 Quote Accuracy:** ${confidencePercent}% confidence based on confirmed project details\n\n`;

    // Add timeline estimate (rough calculation)
    const businessDays = Math.ceil(pricingResult.totals.totalLaborHours / 24); // Assuming 8-hour days, 3-person crew
    quote += `**📅 Estimated Timeline:** ${businessDays}-${businessDays + 1} business days\n\n`;

    quote += `*This quote is based on the specific conditions you've described. Final pricing may vary based on site inspection and any additional requirements discovered during the project.*\n\n`;
    quote += `Would you like to discuss any of these details further or proceed with scheduling a site visit?`;

    return quote;
  }

  /**
   * Create error response
   */
  private static createErrorResponse(sessionId: string, error: any): ConversationResponse {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      message: `I apologize, but I encountered an issue processing your request. Could you try rephrasing your paver patio project details? \n\nError: ${errorMessage}`,
      conversationType: 'error',
      sessionId,
      requiresClarification: true,
      debugInfo: { error: errorMessage }
    };
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    if (!obj) return null;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (!current || current[key] === undefined || current[key] === null) {
        return null;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Quick test method for debugging conversation flow
   */
  static async quickTest(userMessage: string): Promise<ConversationResponse> {
    const testSessionId = `test_${Date.now()}`;

    console.log(`🧪 TESTING CONVERSATION ORCHESTRATOR`);
    console.log(`Input: "${userMessage}"`);

    const response = await this.handlePaverPatioConversation({
      userMessage,
      sessionId: testSessionId,
      firstName: 'TestUser',
      isInitialRequest: true
    });

    console.log('📊 TEST RESULTS:');
    console.log(`Type: ${response.conversationType}`);
    console.log(`Requires Clarification: ${response.requiresClarification}`);
    console.log(`Message Length: ${response.message.length} characters`);

    return response;
  }
}