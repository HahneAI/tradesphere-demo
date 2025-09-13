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
  firstName: string;  // Logged-in user's name
  collectionResult: CollectionResult;
  pricingResult?: PricingResult;
  betaCodeId?: number;
  // 📋 PHASE 2C: Customer context for conversation continuity
  customerName?: string;  // Customer's name (optional - for when pricing for a customer)
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
   * Enhanced system prompt for few-shot dual-path intelligence
   */
  private static readonly ENHANCED_SYSTEM_PROMPT = 'You are a precision-driven landscaping pricing AI that demonstrates effortless mastery of complex calculations. Your responses exhibit confident competence through seemingly intuitive understanding. You adapt your approach based on context: exploratory analysis for planning scenarios, definitive customer proposals for sales situations. Be decisive and direct. Focus on numbers, services, and clear outcomes. When context indicates quote evolution, explicitly reference previous interactions and show cumulative changes. When exploratory, provide baseline calculations for planning purposes. You can reference the "User\'s Name" field for punctuation in especially strong messages, but use it sparingly and professionally. Always include detailed pricing breakdowns with service names, labor hours, and totals.';

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

      // 🚀 NEW: Use enhanced few-shot learning approach with dual-path intelligence
      const aiResponse = await this.processWithEnhancedFewShot(input.sessionId, dataPrompt, input.firstName, input.customerName, input.previousContext);

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
   * Enhanced few-shot learning approach with dual-path intelligence and interaction summary context
   */
  private static async processWithEnhancedFewShot(
    sessionId: string, 
    dataPrompt: string, 
    firstName: string, 
    customerName?: string, 
    previousContext?: any
  ): Promise<any> {
    
    console.log('🚀 [FEW_SHOT] Starting enhanced few-shot processing with dual-path logic');
    console.log('🔍 [FEW_SHOT] Analysis:', {
      hasCustomerName: !!customerName,
      hasPreviousContext: !!(previousContext && previousContext.interaction_summary),
      path: customerName ? 'CUSTOMER_EVOLUTION' : 'EXPLORATORY_ANALYSIS'
    });

    // Build few-shot API call structure
    const apiCall = {
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 800,
      system: this.ENHANCED_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `SERVICES:
• Triple Ground Mulch (300 sq ft): $750.00 | 6.0 hours
• Paver Patio (192 sq ft): $4,800.00 | 18.0 hours

TOTALS:
Total Cost: $5,550.00
Total Hours: 24.0

--- CUSTOMER CONTEXT INFORMATION ---
USER'S NAME: Mike Johnson
NEW INTERACTION: This appears to be a new customer or someone running pricing calculations.
No previous context available - treat as a fresh interaction.`
        },
        {
          role: "assistant", 
          content: `I've calculated the optimal specifications for your scenario analysis, Mike. Based on the variables you've described, this gives you comprehensive baseline numbers for planning purposes.

**MULCH INSTALLATION:** 300 sqft  
Cost Estimate: $750.00  
Labor Hours: 6.0 hours  

**PATIO INSTALLATION:** 12x16 (192 sqft)  
Cost Estimate: $4,800.00  
Labor Hours: 18.0 hours  

**TOTAL PROJECT COST:** $5,550.00  
**TOTAL LABOR HOURS:** 24.0 hours  

These calculations factor current material costs and efficient installation methods. Perfect foundation numbers for client conversations or budget scenarios you're exploring.`
        },
        {
          role: "user",
          content: `SERVICES:
• Triple Ground Mulch (300 sq ft): $750.00 | 6.0 hours
• Paver Patio (225 sq ft): $5,625.00 | 21.0 hours

TOTALS:
Total Cost: $6,375.00
Total Hours: 27.0

--- CUSTOMER CONTEXT INFORMATION ---
USER'S NAME: Sarah Davis
RETURNING CUSTOMER: Jennifer Mitchell
PREVIOUS INTERACTION SUMMARY: Jennifer explored pricing for 300 sqft mulch ($750) + 192 sqft patio ($4800) = $5550 total, 24 hours.
LAST INTERACTION: Today

CRITICAL: This is a QUOTE MODIFICATION request. The customer is asking to modify their previous quote. COMBINE the previous services with new services for a REVISED quote total. DO NOT provide a separate quote for only the new items - provide a COMPLETE revised quote including everything.`
        },
        {
          role: "assistant",
          content: `**LANDSCAPING QUOTE - REVISED**

Thanks for the adjustment, Sarah. Here's your REVISED quote for Jennifer Mitchell reflecting the larger patio size:

**SERVICE BREAKDOWN:**
• Triple Ground Mulch (300 sq ft): $750.00 | 6.0 labor hours
• Paver Patio (225 sq ft): $5,625.00 | 21.0 labor hours

**PROJECT TOTALS:**
• Total Labor Hours: 27.0 hours
• **GRAND TOTAL: $6,375.00**

Your revised quote for Jennifer increases from the previous $5,550.00 to $6,375.00 to account for the additional patio coverage. The extra square footage adds both material costs and installation time for optimal results.`
        },
        {
          role: "user",
          content: dataPrompt
        }
      ]
    };

    // Make direct API call to Claude
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.VITE_AI_API_KEY!,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(apiCall)
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [FEW_SHOT] Enhanced few-shot response generated successfully');
    
    return {
      content: data.content[0]?.text || 'Unable to generate response',
      tokenUsage: {
        promptTokens: data.usage?.input_tokens,
        completionTokens: data.usage?.output_tokens,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      }
    };
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
    
    // 🆔 NEW: Always include the logged-in user's name
    prompt += `USER'S NAME: ${input.firstName || 'Unknown'}\n`;
    
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