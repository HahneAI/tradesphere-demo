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
  private static readonly CLAUDE_SYSTEM_PROMPT = 'CRITICAL: Generate ONLY the exact format below. No greetings, no fluff, maximum 200 characters total.\n\nFORMAT (copy exactly):\n[SERVICE NAME] QUOTE\n\n[Service Description] ([quantity] [unit])\nService Price: $[price]\n\nLabor Time: [hours] hours\n\nProject Total: $[total]\n\n[One sentence sales line matching price range]\n\nPRICE RANGES:\n- Budget ($500-2,000): \"Smart choice starting with quality [service]! This foundation work pays dividends - proper [service] prevents [common problem].\"\n- Mid-Range ($2,000-8,000): \"Now we\'re talking real transformation! You\'ll get quotes 30% cheaper, but they\'ll skip [critical element].\"\n- Premium ($8,000+): \"This caliber project transforms [outcome]. Contractors bidding 40% lower aren\'t in the same league.\"\n\nEXAMPLE:\nMULCH INSTALLATION QUOTE\n\nTriple Ground Mulch (15 sq ft)\nService Price: $37.50\n\nLabor Time: 0.30 hours\n\nProject Total: $37.50\n\nSmart choice starting with quality mulch! This foundation work pays dividends - proper mulch application prevents weed issues and moisture loss that most homeowners battle later.';

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

      // Build simple data prompt for the AI
      const dataPrompt = this.buildDataPrompt(input, conversationType);

      // Process with Claude Sonnet using conversation memory
      const aiResponse = await ConversationContextService.processMessageWithContext(
        input.sessionId,
        dataPrompt,
        {
          firstName: input.firstName,
          isReturnCustomer: false,
          projectType: this.extractProjectType(input.originalMessage),
          urgencyLevel: 'routine',
          systemPrompt: this.CLAUDE_SYSTEM_PROMPT  // Use new concise prompt
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
   * Build simple data prompt for the new concise AI system
   */
  private static buildDataPrompt(input: ChatAgentInput, conversationType: string): string {
    if (conversationType === 'complete_quote' && input.pricingResult) {
      const service = input.pricingResult.services[0];
      return `Service: ${service.serviceName} (${service.quantity} ${service.unit})\nPrice: $${service.totalPrice.toFixed(2)}\nHours: ${service.laborHours}`;
    }
    return `Customer needs help with: ${input.originalMessage}`;
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