/**
 * MainChatAgentService - Claude Sonnet 3.5 AI Orchestrator
 * 
 * Final AI agent that decides whether to provide complete quotes or ask clarifying questions.
 * Uses Claude Sonnet 3.5 with conversation memory for intelligent responses.
 * 
 * Features:
 * - Complete quote generation for full service lists
 * - Clarifying questions for incomplete services
 * - Conversation memory via session ID
 * - Professional customer communication
 */

import { ConversationContextService } from './ConversationContextService';
import { CollectionResult, ExtractedService } from './ParameterCollectorService';
import { PricingResult } from './PricingCalculatorService';

export interface ChatAgentInput {
  originalMessage: string;
  sessionId: string;
  firstName: string;
  collectionResult: CollectionResult;
  pricingResult?: PricingResult;
  betaCodeId?: number;
}

export interface ChatAgentResponse {
  message: string;
  requiresClarification: boolean;
  clarifyingQuestions: string[];
  conversationType: 'complete_quote' | 'partial_quote' | 'clarification_needed';
  sessionId: string;
}

export class MainChatAgentService {
  /**
   * Enhanced system prompt for Claude Sonnet 3.5 
   */
  private static readonly CLAUDE_SYSTEM_PROMPT = 'You are TradeSphere\'s pricing agent creating employee-facing quote summaries. Generate clean, crisp quotes under 500 characters that sales reps can deliver directly to customers.\n\nCRITICAL: This is NOT customer-facing. You\'re formatting data for employees to read and deliver. No greetings, no fluff, just organized pricing data with sales talking points.\n\nREQUIRED FORMAT:\n**Your Project Summary:**\n• [Service Name] - $[price] ([hours] hours)\n• [Service Name] - $[price] ([hours] hours)\n\n**Total Investment: $[total]\nTotal Labor Hours: [hours]**\n\n[Price-range personality line]\n[Expert credibility line]\n\nPRICE-RANGE PERSONALITY (for sales rep delivery):\n- Budget ($500-2,000): \"Smart choice starting with quality [service] - prevents the #1 issue we see with [problem].\"\n- Mid-Range ($2,000-8,000): \"Now we\'re talking real transformation! You\'ll get quotes 30% cheaper, but they\'ll skip [critical element].\"\n- Premium ($8,000+): \"This caliber project transforms [outcome]. Contractors bidding 40% lower aren\'t in the same league.\"\n\nEXPERT LINES: \"Here\'s what 15 years taught me...\", \"The pros account for...\", \"Most contractors miss...\"\n\nFORMATTING RULES:\n- Always use ** for bold headers\n- Include ALL service details: price AND hours\n- Keep total under 500 characters\n- End with 2 punchy sales lines\n- No customer greetings or pleasantries\n\nEXAMPLE OUTPUT:\n**Your Project Summary:**\n• 15 sq ft Triple Ground Mulch - $37.50 (0.30 hours)\n• 40 sq ft Paver Patio - $2,200.00 (12.00 hours)\n• 20 Flag stone steppers - $1,700.00 (6.00 hours)\n\n**Total Investment: $3,937.50\nTotal Labor Hours: 18.30**\n\nNow we\'re talking real transformation! This combination creates perfect outdoor flow from patio to garden areas.\n\nYou\'ll get quotes 30% cheaper, but they\'ll skip the critical foundation work that makes this last decades, not seasons.';

  /**
   * Main orchestration method - decides response type based on service completeness
   */
  static async generateResponse(input: ChatAgentInput): Promise<ChatAgentResponse> {
    console.log('🤖 MAIN CHAT AGENT START');
    console.log(`Customer: ${input.firstName} | Session: ${input.sessionId}`);
    console.log(`Complete Services: ${input.collectionResult.services.length}`);
    console.log(`Incomplete Services: ${input.collectionResult.incompleteServices.length}`);

    try {
      // Determine conversation type based on services found
      const conversationType = this.determineConversationType(input.collectionResult);
      console.log(`📋 Conversation Type: ${conversationType}`);

      // Generate context-aware prompt based on the situation
      const contextPrompt = this.buildContextPrompt(input, conversationType);

      // Process with Claude Sonnet using conversation memory
      const aiResponse = await ConversationContextService.processMessageWithContext(
        input.sessionId,
        contextPrompt,
        {
          firstName: input.firstName,
          isReturnCustomer: false,
          projectType: this.extractProjectType(input.originalMessage),
          urgencyLevel: 'routine'
        }
      );

      const response: ChatAgentResponse = {
        message: aiResponse.content,
        requiresClarification: aiResponse.requiresClarification || conversationType === 'clarification_needed',
        clarifyingQuestions: aiResponse.suggestedQuestions || [],
        conversationType,
        sessionId: input.sessionId
      };

      console.log(`✅ MAIN CHAT AGENT COMPLETE: ${conversationType} response generated`);
      return response;

    } catch (error) {
      console.error('❌ Main Chat Agent Error:', error);

      // Fallback response
      return {
        message: `Thank you for your interest, ${input.firstName}. I'm having trouble processing your request right now. Could you please tell me more about your landscaping project?`,
        requiresClarification: true,
        clarifyingQuestions: ['What type of landscaping project are you planning?'],
        conversationType: 'clarification_needed',
        sessionId: input.sessionId
      };
    }
  }

  /**
   * Determine conversation type based on service completeness
   */
  private static determineConversationType(collectionResult: CollectionResult): 'complete_quote' | 'partial_quote' | 'clarification_needed' {
    const completeCount = collectionResult.services.length;
    const incompleteCount = collectionResult.incompleteServices.length;

    if (completeCount > 0 && incompleteCount === 0) {
      return 'complete_quote';
    } else if (completeCount > 0 && incompleteCount > 0) {
      return 'partial_quote';
    } else {
      return 'clarification_needed';
    }
  }

  /**
   * Build context prompt for Claude based on conversation type and data
   */
  private static buildContextPrompt(input: ChatAgentInput, conversationType: string): string {
    let prompt = `Customer Message: "${input.originalMessage}"\n\n`;

    if (conversationType === 'complete_quote' && input.pricingResult) {
      prompt += `COMPLETE QUOTE SCENARIO:\n`;
      prompt += `All services have been successfully priced. Generate a professional quote response.\n\n`;

      prompt += `PRICING BREAKDOWN:\n`;
      input.pricingResult.services.forEach(service => {
        prompt += `- ${service.serviceName}: ${service.quantity} ${service.unit} = $${service.totalPrice.toFixed(2)} (${service.laborHours}h)\n`;
      });

      prompt += `\nTOTAL PROJECT COST: $${input.pricingResult.totals.totalCost.toFixed(2)}\n`;
      prompt += `TOTAL LABOR HOURS: ${input.pricingResult.totals.totalLaborHours.toFixed(1)}h\n\n`;

      prompt += `Generate a professional quote response with this pricing information.`;

    } else if (conversationType === 'partial_quote') {
      prompt += `PARTIAL QUOTE SCENARIO:\n`;
      prompt += `Some services are complete, others need clarification.\n\n`;

      if (input.collectionResult.services.length > 0 && input.pricingResult) {
        prompt += `SERVICES WE CAN PRICE:\n`;
        input.pricingResult.services.forEach(service => {
          prompt += `- ${service.serviceName}: ${service.quantity} ${service.unit} = $${service.totalPrice.toFixed(2)}\n`;
        });
        prompt += `Subtotal: $${input.pricingResult.totals.totalCost.toFixed(2)}\n\n`;
      }

      if (input.collectionResult.incompleteServices.length > 0) {
        prompt += `SERVICES NEEDING CLARIFICATION:\n`;
        input.collectionResult.incompleteServices.forEach(service => {
          prompt += `- ${service.serviceName}: Need quantity/measurement details\n`;
        });
        prompt += `\n`;
      }

      prompt += `Provide the partial pricing and ask specific questions for the incomplete services.`;

    } else {
      prompt += `CLARIFICATION SCENARIO:\n`;

      if (input.collectionResult.incompleteServices.length > 0) {
        prompt += `Services mentioned but need details:\n`;
        input.collectionResult.incompleteServices.forEach(service => {
          prompt += `- ${service.serviceName}: Missing quantity/measurements\n`;
        });
        prompt += `\n`;
      }

      prompt += `No services can be priced yet. Ask helpful questions to gather the information needed for accurate pricing.`;
    }

    return prompt;
  }

  /**
   * Extract project type from customer message for context
   */
  private static extractProjectType(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('backyard') || lowerMessage.includes('back yard')) {
      return 'backyard renovation';
    } else if (lowerMessage.includes('front') || lowerMessage.includes('curb appeal')) {
      return 'front yard landscaping';
    } else if (lowerMessage.includes('patio') || lowerMessage.includes('outdoor')) {
      return 'outdoor living space';
    } else if (lowerMessage.includes('drain') || lowerMessage.includes('water')) {
      return 'drainage solution';
    } else {
      return 'landscaping project';
    }
  }

  /**
   * Generate clarifying questions based on incomplete services
   */
  static generateClarifyingQuestions(incompleteServices: ExtractedService[]): string[] {
    const questions: string[] = [];

    for (const service of incompleteServices) {
      const serviceConfig = service;

      if (serviceConfig.unit === 'sqft') {
        questions.push(`How many square feet of ${service.serviceName.toLowerCase()} do you need?`);
      } else if (serviceConfig.unit === 'linear_feet') {
        questions.push(`How many linear feet of ${service.serviceName.toLowerCase()} do you need?`);
      } else if (serviceConfig.unit === 'each') {
        questions.push(`How many ${service.serviceName.toLowerCase()} units do you need?`);
      } else if (serviceConfig.unit === 'cubic_yards') {
        questions.push(`How many cubic yards of ${service.serviceName.toLowerCase()} do you need?`);
      } else {
        questions.push(`What quantity of ${service.serviceName.toLowerCase()} do you need?`);
      }
    }

    return questions;
  }
}

// Export for testing
export { MainChatAgentService as default };