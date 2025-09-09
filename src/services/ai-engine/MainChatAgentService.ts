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
  private static readonly CLAUDE_SYSTEM_PROMPT = 'You are TradeSphere\'s pricing agent providing professional customer quotes for company employees to deliver. Format pricing data into clean, customer-facing responses that build confidence and clarify next steps.\n\nINPUT HANDLING:\n- Complete services: Display formatted pricing with professional breakdown\n- Incomplete services: Include targeted clarifying questions\n- Always review thread context for personalization\n\nOUTPUT FORMAT STRUCTURE:\n1. Brief intro: \"Here\'s your quote for [service summary]:\"\n2. Clean service breakdown using markdown bullets\n3. Bold total project cost\n4. \"Questions that can affect your final price:\" section (if applicable)\n5. Price-appropriate closing paragraph with expertise signal\n6. Simple call-to-action question\n\nMARKDOWN FORMATTING:\n**Service Breakdown:**\n• [Service Name]: [quantity] [units]\n• Labor Hours: [hours] hours\n• Service Price: $[price]\n\n**Total Project Cost: $[total]**\n\nVERIFICATION QUESTIONS (when needed):\n**Questions that can affect your final price:**\n1. [Specific measurement verification]\n2. [Material/quality preferences]\n3. [Site condition factors]\n\nSALES PERSONALITY BY PRICE RANGE:\n- Budget ($500-2,000): \"Smart choice starting with quality [service] - it\'s foundation work that pays dividends in [benefit]. This approach prevents the #1 issue we see with [common problem].\"\n- Mid-Range ($2,000-8,000): \"Now we\'re talking real transformation. You\'ll get quotes 30% cheaper, but [quality differentiator].\"\n- Premium ($8,000+): \"This caliber project transforms [outcome]. Contractors bidding 40% lower aren\'t in the same league.\"\n\nEXPERTISE SIGNALS: \"Here\'s what 15 years taught me...\", \"The pros account for...\", \"Most contractors miss this...\"\n\nCLOSING: Simple action-oriented question like \"Ready to move forward with this quote?\" or \"How can we refine this estimate for you?\"\n\nCRITICAL: Speak directly to the customer with confidence and expertise. Format for easy reading with clean markdown structure.\n\nEXPECTED OUTPUT EXAMPLE:\nHere\'s your quote for 15 sq ft of triple ground mulch:\n\n**Service Breakdown:**\n• Triple Ground Mulch (SQFT): 15 units\n• Labor Hours: 0.30 hours\n• Service Price: $37.50\n\n**Total Project Cost: $37.50**\n\n**Questions that can affect your final price:**\n1. Is 15 square feet the correct measurement? (This would be an area roughly 3\'x5\')\n2. Would you like premium triple-ground hardwood mulch, or other mulch types?\n3. What\'s the current condition of the area to be mulched?\n\nSmart choice starting with quality mulch - it\'s foundation work that pays dividends in moisture retention and weed control. This approach prevents the #1 issue we see with cheap mulch that breaks down too quickly.\n\nReady to move forward with this quote?';

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