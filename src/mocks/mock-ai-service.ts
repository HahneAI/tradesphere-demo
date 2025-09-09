/**
 * Mock AI Service for Parameter Collection
 * 
 * Simulates AI parameter extraction responses for our 2 test cases.
 * Returns deterministic results matching expected Make.com behavior.
 */

import { CollectionResult, ExtractedService } from '../services/ai-engine/ParameterCollectorService';
import { MOCK_AI_RESPONSES } from './mock-data';

export class MockAIService {
  private static instance: MockAIService;

  static getInstance(): MockAIService {
    if (!MockAIService.instance) {
      MockAIService.instance = new MockAIService();
    }
    return MockAIService.instance;
  }

  /**
   * Mock parameter collection (replaces real AI call)
   */
  async collectParameters(userMessage: string, conversationHistory?: string[]): Promise<CollectionResult> {
    console.log(`🤖 MOCK AI: Processing "${userMessage}"`);
    
    // Add realistic processing delay
    await this.simulateProcessingDelay();

    // Normalize input for matching
    const normalizedInput = userMessage.toLowerCase().trim();

    // Match against our test cases
    if (this.isMultiServiceInput(normalizedInput)) {
      return this.getMockMultiServiceResponse();
    }
    
    if (this.isSimpleMulchInput(normalizedInput)) {
      return this.getMockSimpleResponse();
    }

    // Fallback for unrecognized input
    return this.getMockIncompleteResponse(userMessage);
  }

  /**
   * Check if input matches multi-service test case
   */
  private isMultiServiceInput(input: string): boolean {
    const patterns = [
      /45.*sq.*ft.*mulch.*3.*feet.*edging/,
      /45.*square.*feet.*mulch.*3.*linear.*feet.*edging/,
      /mulch.*45.*edging.*3/,
      /triple.*ground.*mulch.*45.*metal.*edging.*3/
    ];

    return patterns.some(pattern => pattern.test(input));
  }

  /**
   * Check if input matches simple mulch test case
   */
  private isSimpleMulchInput(input: string): boolean {
    const patterns = [
      /100.*square.*feet.*mulch/,
      /100.*sq.*ft.*mulch/,
      /mulch.*100.*sqft/,
      /100.*mulch/
    ];

    return patterns.some(pattern => pattern.test(input));
  }

  /**
   * Get mock response for multi-service test case
   */
  private getMockMultiServiceResponse(): CollectionResult {
    console.log('✅ MOCK AI: Returning multi-service response');
    
    return {
      status: 'ready_for_pricing',
      services: [
        {
          serviceName: "Triple Ground Mulch (SQFT)",
          quantity: 45,
          unit: "sqft",
          row: 23,
          isSpecial: false
        },
        {
          serviceName: "Metal Edging",
          quantity: 3,
          unit: "linear_feet", 
          row: 18,
          isSpecial: false
        }
      ],
      missingInfo: [],
      clarifyingQuestions: [],
      confidence: 0.95,
      suggestedResponse: ""
    };
  }

  /**
   * Get mock response for simple mulch test case
   */
  private getMockSimpleResponse(): CollectionResult {
    console.log('✅ MOCK AI: Returning simple mulch response');
    
    return {
      status: 'ready_for_pricing',
      services: [
        {
          serviceName: "Triple Ground Mulch (SQFT)",
          quantity: 100,
          unit: "sqft",
          row: 23,
          isSpecial: false
        }
      ],
      missingInfo: [],
      clarifyingQuestions: [],
      confidence: 0.92,
      suggestedResponse: ""
    };
  }

  /**
   * Get mock response for incomplete/unrecognized input
   */
  private getMockIncompleteResponse(originalInput: string): CollectionResult {
    console.log('⚠️  MOCK AI: Input not recognized, requesting clarification');
    
    return {
      status: 'incomplete',
      services: [],
      missingInfo: ['Service type unclear'],
      clarifyingQuestions: [
        'Could you be more specific about the landscaping services you need?',
        'Are you looking for mulch, edging, or other landscaping work?'
      ],
      confidence: 0.3,
      suggestedResponse: `I need more information about "${originalInput}". Could you provide more details about the specific landscaping services and quantities you need?`
    };
  }

  /**
   * Mock service validation and enhancement
   */
  async validateServices(services: ExtractedService[], originalMessage: string): Promise<{
    services: ExtractedService[];
    confidence: number;
    suggestedImprovements: string[];
  }> {
    console.log(`🔍 MOCK AI: Validating ${services.length} extracted services`);
    
    await this.simulateProcessingDelay(50, 150);

    // Mock validation logic
    let confidence = 0.8;
    const suggestedImprovements: string[] = [];

    for (const service of services) {
      // Boost confidence for known services
      if (service.serviceName.includes('Triple Ground Mulch') || service.serviceName.includes('Metal Edging')) {
        confidence += 0.05;
      }

      // Check quantity reasonableness
      if (service.quantity > 1000) {
        suggestedImprovements.push(`Large quantity detected for ${service.serviceName}: ${service.quantity} ${service.unit}`);
        confidence -= 0.1;
      }

      if (service.quantity < 1) {
        suggestedImprovements.push(`Very small quantity for ${service.serviceName}: ${service.quantity} ${service.unit}`);
        confidence -= 0.05;
      }
    }

    return {
      services,
      confidence: Math.min(Math.max(confidence, 0.1), 1.0),
      suggestedImprovements
    };
  }

  /**
   * Mock follow-up processing for conversation context
   */
  async processFollowUp(newMessage: string, previousResult: CollectionResult): Promise<CollectionResult> {
    console.log(`🔄 MOCK AI: Processing follow-up: "${newMessage}"`);
    
    await this.simulateProcessingDelay();

    // Mock logic for handling follow-up questions
    const normalizedInput = newMessage.toLowerCase();
    
    if (normalizedInput.includes('yes') || normalizedInput.includes('correct')) {
      // User confirmed previous extraction
      return {
        ...previousResult,
        status: 'ready_for_pricing',
        confidence: Math.min(previousResult.confidence + 0.1, 1.0)
      };
    }

    if (normalizedInput.includes('no') || normalizedInput.includes('wrong')) {
      // User rejected previous extraction
      return this.getMockIncompleteResponse(newMessage);
    }

    // Try to extract new information from follow-up
    return this.collectParameters(`${previousResult.services.map(s => `${s.quantity} ${s.unit} ${s.serviceName}`).join(' and ')} ${newMessage}`);
  }

  /**
   * Mock special service requirement extraction
   */
  async extractSpecialRequirements(serviceName: string, message: string): Promise<any> {
    console.log(`🔧 MOCK AI: Extracting special requirements for ${serviceName}`);
    
    await this.simulateProcessingDelay(30, 100);

    // For our test cases, we don't have special services
    // This would handle irrigation zone extraction, etc.
    return {};
  }

  /**
   * Get mock confidence scoring explanation
   */
  getConfidenceExplanation(result: CollectionResult): string {
    const confidence = result.confidence;
    
    if (confidence >= 0.9) {
      return 'High confidence - Clear service identification with specific quantities';
    } else if (confidence >= 0.8) {
      return 'Good confidence - Services identified, minor ambiguity in quantities';
    } else if (confidence >= 0.6) {
      return 'Medium confidence - Services likely correct, some clarification needed';
    } else {
      return 'Low confidence - Significant ambiguity, clarification required';
    }
  }

  /**
   * Mock error simulation for testing error handling
   */
  async simulateError(errorType: 'network' | 'quota' | 'parse' | 'context'): Promise<never> {
    await this.simulateProcessingDelay(200, 500);

    switch (errorType) {
      case 'network':
        throw new Error('MOCK AI: Network error - Could not reach AI service');
      case 'quota':
        throw new Error('MOCK AI: API quota exceeded - Daily limit reached');
      case 'parse':
        throw new Error('MOCK AI: Failed to parse AI response - Invalid JSON format');
      case 'context':
        throw new Error('MOCK AI: Context too large - Message exceeds token limit');
      default:
        throw new Error('MOCK AI: Unknown AI service error');
    }
  }

  /**
   * Simulate realistic AI processing delay
   */
  private async simulateProcessingDelay(minMs: number = 200, maxMs: number = 800): Promise<void> {
    // Skip delays in benchmark mode
    if (process.env.BENCHMARK_MODE === 'true') {
      return;
    }

    const delay = Math.random() * (maxMs - minMs) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Get mock usage statistics
   */
  getUsageStats(): {
    totalRequests: number;
    averageProcessingTime: number;
    successRate: number;
    avgConfidence: number;
  } {
    return {
      totalRequests: 0, // Would track in real implementation
      averageProcessingTime: 450, // Average mock processing time
      successRate: 1.0, // 100% success in mock
      avgConfidence: 0.89 // Average confidence for our test cases
    };
  }
}

// Factory function for dependency injection
export const createMockAIService = (): MockAIService => {
  return MockAIService.getInstance();
};