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
  // 📋 PHASE 2C: Customer context for conversation continuity
  customerName?: string;
  previousContext?: {
    interaction_summary?: string;
    user_input?: string;
    ai_response?: string;
    created_at?: string;
    interaction_number?: number;
  } | null;
}

export interface ChatAgentResponse {
  message: string;
  requiresClarification: boolean;
  clarifyingQuestions: string[];
  conversationType: 'complete_quote' | 'partial_quote' | 'clarification_needed';
  sessionId: string;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export class MainChatAgentService {
  /**
   * Enhanced system prompt for Claude Sonnet 3.5 
   */
  private static readonly CLAUDE_SYSTEM_PROMPT = 'You are a specialized landscaping quote engine agent. Your job is to provide accurate, context-aware pricing calculations that adapt to customer modifications.\n\nCORE BEHAVIOR:\n- When customer has PREVIOUS CONTEXT, modify/add to existing quote rather than creating new standalone quote\n- For quote modifications: "Thanks for the adjustment [name]. Here\'s your REVISED quote:"\n- For new quotes: Use standard quote format\n- Use EXACT pricing data provided - never estimate or add services\n- Keep responses concise and professional\n- Minimize sales fluff - focus on clear pricing breakdown\n\nQUOTE FORMAT:\n**[PROJECT TYPE] QUOTE - [REVISED if modification]**\n[Brief contextual opener based on situation]\n\n**SERVICE BREAKDOWN:**\n• [Service Name] ([quantity] [unit]): $[price] | [hours] labor hours\n\n**PROJECT TOTALS:**\n• Total Labor Hours: [total] hours\n• **GRAND TOTAL: $[total]**\n\n[One brief professional paragraph - keep minimal]\n\nCONTEXT AWARENESS:\n- If previous interaction summary mentions specific services/quantities, BUILD UPON IT\n- For additions: "Adding [new service] to your previous [existing services]"\n- For modifications: "Adjusting your quote from [old total] to [new total]"\n- Reference customer name and history naturally\n\nFORMATTING:\n- Use **text** for bold (Claude API markdown)\n- Include price AND hours for every service\n- Use • bullet points\n- Keep total response under 600 characters when possible\n- Skip excessive sales language\n\nEXAMPLE MODIFICATION:\n**LANDSCAPING MULCH QUOTE - REVISED**\nThanks for the adjustment, Sherry. Adding 50 sq ft to your previous 100 sq ft order:\n\n**SERVICE BREAKDOWN:**\n• Triple Ground Mulch (150 sq ft): $375.00 | 3.0 labor hours\n\n**PROJECT TOTALS:**\n• Total Labor Hours: 3.0 hours\n• **GRAND TOTAL: $375.00**\n\nYour revised quote increases from the previous $250.00 to account for the additional coverage area.';

  /**
   * Main orchestration method - decides response type based on service completeness
   */
  static async generateResponse(input: ChatAgentInput): Promise<ChatAgentResponse> {
    console.log('🤖 MAIN CHAT AGENT START');
    console.log(`Customer: ${input.firstName} | Session: ${input.sessionId}`);
    console.log(`Complete Services: ${input.collectionResult.services.length}`);
    console.log(`Incomplete Services: ${input.collectionResult.incompleteServices.length}`);
    
    // 📋 PHASE 2C: Log customer context availability
    if (input.customerName && input.previousContext) {
      console.log('📋 CUSTOMER CONTEXT AVAILABLE:', {
        customerName: input.customerName,
        previousSummary: input.previousContext.interaction_summary?.substring(0, 100) + '...',
        lastInteraction: input.previousContext.created_at
      });
      console.log('✅ [SUMMARY_INTEGRATION] Previous interaction summary WILL BE included in Claude prompt');
    } else {
      console.log('📋 [SUMMARY_INTEGRATION] No previous context available - treating as first interaction');
    }

    try {
      // Determine conversation type based on services found
      const conversationType = this.determineConversationType(input.collectionResult);
      console.log(`📋 Conversation Type: ${conversationType}`);

      // Build context prompt with customer history injected at the end
      const dataPrompt = this.buildContextPrompt(input, conversationType);

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
        sessionId: input.sessionId,
        tokenUsage: aiResponse.tokenUsage
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
   * Build context prompt with customer context injected at the end
   */
  private static buildContextPrompt(input: ChatAgentInput, conversationType: string): string {
    // Start with the main data prompt (same as buildDataPrompt)
    let prompt = this.buildDataPrompt(input, conversationType);
    
    // Add context injection section at the end
    prompt += '\n\n--- CUSTOMER CONTEXT INFORMATION ---\n';
    
    // 📋 CUSTOMER CONTEXT: Include previous conversation context for continuity
    if (input.customerName && input.previousContext) {
      prompt += `RETURNING CUSTOMER: ${input.customerName}\n`;
      if (input.previousContext.interaction_summary) {
        prompt += `PREVIOUS INTERACTION SUMMARY: ${input.previousContext.interaction_summary}\n`;
      }
      if (input.previousContext.created_at) {
        const daysAgo = Math.floor((Date.now() - new Date(input.previousContext.created_at).getTime()) / (1000 * 60 * 60 * 24));
        prompt += `LAST INTERACTION: ${daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`}\n`;
      }
      prompt += `\nCRITICAL: This is a QUOTE MODIFICATION request. The customer is asking to modify their previous quote. COMBINE the previous services with new services for a REVISED quote total. DO NOT provide a separate quote for only the new items - provide a COMPLETE revised quote including everything.`;
    } else {
      // Placeholder for non-customer users (just running numbers)
      prompt += `NEW INTERACTION: This appears to be a new customer or someone running pricing calculations.\n`;
      prompt += `No previous context available - treat as a fresh interaction.`;
    }

    return prompt;
  }

  /**
   * Build simple data prompt for the new concise AI system
   */
  private static buildDataPrompt(input: ChatAgentInput, conversationType: string): string {
    if (conversationType === 'complete_quote' && input.pricingResult) {
      const services = input.pricingResult.services.map(service => 
        `• ${service.serviceName} (${service.quantity} ${service.unit}): $${service.totalPrice.toFixed(2)} | ${service.laborHours} hours`
      ).join('\n');
      
      return `SERVICES:\n${services}\n\nTOTALS:\nTotal Cost: $${input.pricingResult.totals.totalCost.toFixed(2)}\nTotal Hours: ${input.pricingResult.totals.totalLaborHours.toFixed(2)}`;
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