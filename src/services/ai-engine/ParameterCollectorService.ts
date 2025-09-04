/**
 * ParameterCollectorService - Advanced NLP for landscaping service extraction
 * 
 * Replicates Make.com's parameter_collector module logic using OpenAI
 * Optimized for 2-3k tokens vs original 17-20k tokens
 */

import { ServiceMappingEngine, ServiceMappingResult } from './ServiceMappingEngine';
import { CategorySplitResult } from './GPTServiceSplitter';

export interface CollectionResult {
  status: 'incomplete' | 'ready_for_pricing' | 'partial';
  services: ExtractedService[];
  incompleteServices: ExtractedService[]; // Services found but missing quantities
  missingInfo: string[];
  clarifyingQuestions: string[];
  confidence: number;
  suggestedResponse: string;
}

export interface ExtractedService {
  serviceName: string;
  quantity?: number; // Optional for incomplete services
  unit: string;
  row: number;
  isSpecial: boolean;
  status?: 'complete' | 'awaiting_quantity' | 'awaiting_details';
  specialRequirements?: SpecialRequirements;
}

export interface SpecialRequirements {
  // For irrigation
  zones?: {
    turf: number;
    drip: number;
    total: number;
  };
  boring?: boolean;
  setupRequired?: boolean;
  
  // For lighting
  transformer?: boolean;
  dimmer?: boolean;
  fixtures?: number;
}

export class ParameterCollectorService {
  private static readonly COMPLETION_THRESHOLD = 0.85;
  
  /**
   * Enhanced parameter collection using GPT split services with category hints
   */
  static async collectParametersWithSplitServices(
    originalMessage: string, 
    splitResult: CategorySplitResult
  ): Promise<CollectionResult> {
    console.log('🎯 ENHANCED PARAMETER COLLECTION START (with GPT splits)');
    console.log(`Original message: "${originalMessage}"`);
    console.log(`Processing ${splitResult.service_count} split services...`);
    
    const completeServices: ExtractedService[] = [];
    const incompleteServices: ExtractedService[] = [];
    
    // Process each split service with its category hint
    for (let i = 0; i < splitResult.separated_services.length; i++) {
      const splitService = splitResult.separated_services[i];
      const [serviceText, categoryHint] = splitService.split(',').map(s => s.trim());
      
      console.log(`🔍 Processing split service ${i + 1}: "${serviceText}" (category: ${categoryHint})`);
      
      // Use ServiceMappingEngine with category priority
      const mappingResult = ServiceMappingEngine.mapUserInputWithCategoryHint(serviceText, categoryHint);
      
      // Separate complete and incomplete services
      mappingResult.services.forEach(service => {
        const extractedService: ExtractedService = {
          serviceName: service.serviceName,
          quantity: service.quantity,
          unit: service.unit,
          row: service.row,
          isSpecial: service.isSpecial,
          status: service.status
        };
        
        if (service.status === 'complete' && service.quantity && service.quantity > 0) {
          completeServices.push(extractedService);
        } else {
          incompleteServices.push(extractedService);
        }
      });
    }
    
    console.log(`✅ ENHANCED COLLECTION: ${completeServices.length} complete + ${incompleteServices.length} incomplete services from ${splitResult.service_count} splits`);
    
    // Determine status based on what we found
    let status: 'incomplete' | 'ready_for_pricing' | 'partial';
    if (completeServices.length > 0 && incompleteServices.length === 0) {
      status = 'ready_for_pricing';
    } else if (completeServices.length > 0 && incompleteServices.length > 0) {
      status = 'partial';
    } else {
      status = 'incomplete';
    }
    
    // Calculate overall confidence
    const overallConfidence = (completeServices.length + incompleteServices.length) > 0 ? 0.85 : 0.2;
    
    return {
      status,
      services: completeServices,
      incompleteServices,
      missingInfo: [],
      clarifyingQuestions: [],
      confidence: overallConfidence,
      suggestedResponse: 'Services extracted - proceeding to AI orchestration'
    };
  }
  
  /**
   * Main entry point - replaces Make.com parameter_collector (legacy method)
   */
  static async collectParameters(userMessage: string, conversationHistory?: string[]): Promise<CollectionResult> {
    console.log('🎯 PARAMETER COLLECTION START');
    console.log(`Input: "${userMessage}"`);
    
    // Step 1: Use service mapping engine for initial extraction
    const mappingResult = await this.performServiceMapping(userMessage);
    
    // Step 2: Validate completeness and handle special services
    const validationResult = await this.validateAndEnhance(mappingResult, userMessage);
    
    // Step 3: Determine if ready for pricing
    const completionStatus = this.assessCompletion(validationResult);
    
    const result: CollectionResult = {
      status: completionStatus.isComplete ? 'ready_for_pricing' : 'incomplete',
      services: validationResult.services,
      incompleteServices: [], // Legacy method doesn't track incomplete services
      missingInfo: completionStatus.missingInfo,
      clarifyingQuestions: completionStatus.clarifyingQuestions,
      confidence: validationResult.confidence,
      suggestedResponse: completionStatus.suggestedResponse
    };

    console.log(`✅ PARAMETER COLLECTION: ${result.status} (${result.confidence}% confidence)`);
    console.log(`Services found: ${result.services.length}`);
    
    return result;
  }

  /**
   * Step 1: Initial service mapping using the engine
   */
  private static async performServiceMapping(userMessage: string): Promise<ServiceMappingResult> {
    // 🗺️ ENHANCED DEBUG: SERVICE MAPPING START
    console.log('🗺️ SERVICE MAPPING START:', {
      input: userMessage,
      timestamp: new Date().toISOString()
    });
    
    const mappingResult = await ServiceMappingEngine.mapUserInput(userMessage);
    
    // 🗺️ ENHANCED DEBUG: SERVICE MAPPING COMPLETE
    console.log('🗺️ SERVICE MAPPING COMPLETE:', {
      servicesFound: mappingResult.services.length,
      overallConfidence: mappingResult.confidence,
      needsClarification: mappingResult.needsClarification,
      unmappedText: mappingResult.unmappedText
    });
    
    // 🗺️ ENHANCED DEBUG: DETAILED SERVICE BREAKDOWN
    mappingResult.services.forEach((service, index) => {
      console.log(`🗺️ SERVICE ${index + 1}:`, {
        serviceName: service.serviceName,
        quantity: service.quantity,
        unit: service.unit,
        row: service.row,
        category: service.category,
        confidence: service.confidence,
        isSpecial: service.isSpecial,
        originalText: service.originalText
      });
    });
    
    if (mappingResult.unmappedText.length > 0) {
      console.log('⚠️ UNMAPPED TEXT FOUND:', mappingResult.unmappedText);
    }
    
    return mappingResult;
  }

  /**
   * Step 2: Validate and enhance mapped services with AI assistance
   */
  private static async validateAndEnhance(
    mappingResult: ServiceMappingResult, 
    originalMessage: string
  ): Promise<{ services: ExtractedService[]; confidence: number }> {
    
    const enhancedServices: ExtractedService[] = [];
    
    for (const service of mappingResult.services) {
      const enhancedService: ExtractedService = {
        serviceName: service.serviceName,
        quantity: service.quantity,
        unit: service.unit,
        row: service.row,
        isSpecial: service.isSpecial
      };

      // Handle special services requiring additional information
      if (service.isSpecial) {
        enhancedService.specialRequirements = await this.extractSpecialRequirements(
          service.serviceName, 
          originalMessage
        );
      }

      enhancedServices.push(enhancedService);
    }

    // Use AI to validate and potentially discover missed services
    const aiEnhancedResult = await this.aiValidationPass(enhancedServices, originalMessage);

    return {
      services: aiEnhancedResult.services,
      confidence: Math.min(mappingResult.confidence * aiEnhancedResult.confidence, 1.0)
    };
  }

  /**
   * AI validation pass to catch missed services and validate quantities
   */
  private static async aiValidationPass(
    services: ExtractedService[], 
    originalMessage: string
  ): Promise<{ services: ExtractedService[]; confidence: number }> {
    
    // Create optimized prompt for validation
    const prompt = this.buildValidationPrompt(services, originalMessage);
    
    try {
      const aiResponse = await this.callAI(prompt);
      const validation = this.parseValidationResponse(aiResponse);
      
      return {
        services: validation.validatedServices || services,
        confidence: validation.confidence || 0.8
      };
      
    } catch (error) {
      console.warn('⚠️ AI validation failed, using mapped services:', error);
      return { services, confidence: 0.7 };
    }
  }

  /**
   * Build optimized validation prompt (2-3k tokens vs 17-20k)
   */
  private static buildValidationPrompt(services: ExtractedService[], originalMessage: string): string {
    const servicesList = services.map(s => `${s.serviceName}: ${s.quantity} ${s.unit}`).join(', ');
    
    return `LANDSCAPING SERVICE VALIDATION:

User Request: "${originalMessage}"

Currently Extracted: ${servicesList || 'None'}

Validate and identify any missed landscaping services. Focus on:
- Hardscape (patios, retaining walls, edging)
- Materials (mulch, topsoil, rock)
- Planting (trees, shrubs, sod)
- Irrigation (setup, zones, spouts)
- Drainage (downspouts, french drains)

RESPOND ONLY IN JSON:
{
  "validated_services": [
    {
      "service_name": "exact_name_from_database",
      "quantity": number,
      "unit": "sqft|linear_feet|each|etc",
      "confidence": 0.0-1.0
    }
  ],
  "missed_services": ["any_additional_services_found"],
  "validation_confidence": 0.0-1.0
}`;
  }

  /**
   * Parse AI validation response
   */
  private static parseValidationResponse(response: string): {
    validatedServices?: ExtractedService[];
    confidence?: number;
  } {
    try {
      const cleaned = response.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      const validatedServices: ExtractedService[] = [];
      
      if (parsed.validated_services) {
        for (const service of parsed.validated_services) {
          // Map to our service database to get row numbers
          const mappingResult = ServiceMappingEngine.mapUserInput(
            `${service.quantity} ${service.service_name}`
          );
          
          if (mappingResult.services.length > 0) {
            const mapped = mappingResult.services[0];
            validatedServices.push({
              serviceName: mapped.serviceName,
              quantity: service.quantity,
              unit: mapped.unit,
              row: mapped.row,
              isSpecial: mapped.isSpecial
            });
          }
        }
      }
      
      return {
        validatedServices,
        confidence: parsed.validation_confidence || 0.8
      };
      
    } catch (error) {
      console.warn('⚠️ Failed to parse AI validation response:', error);
      return {};
    }
  }

  /**
   * Extract special requirements for irrigation and lighting services
   */
  private static async extractSpecialRequirements(
    serviceName: string, 
    message: string
  ): Promise<SpecialRequirements> {
    
    const requirements: SpecialRequirements = {};
    
    if (serviceName.includes('Irrigation')) {
      // Extract irrigation-specific requirements
      const zones = this.extractIrrigationZones(message);
      const boring = this.detectBoringRequirement(message);
      
      requirements.zones = zones;
      requirements.boring = boring;
      requirements.setupRequired = serviceName.includes('Set Up');
    }
    
    // Future: Add lighting requirements extraction
    
    return requirements;
  }

  /**
   * Extract irrigation zone information from text
   */
  private static extractIrrigationZones(message: string): { turf: number; drip: number; total: number } {
    const lowerMessage = message.toLowerCase();
    
    // Look for explicit zone counts
    const zoneMatches = lowerMessage.match(/(\d+)\s*(?:zones?|spouts?)/);
    const turfMatches = lowerMessage.match(/(\d+).*turf/);
    const dripMatches = lowerMessage.match(/(\d+).*drip/);
    
    let turf = 0;
    let drip = 0;
    let total = 0;
    
    if (turfMatches) turf = parseInt(turfMatches[1]);
    if (dripMatches) drip = parseInt(dripMatches[1]);
    if (zoneMatches) total = parseInt(zoneMatches[1]);
    
    // If total specified but not breakdown, assume all turf
    if (total > 0 && turf === 0 && drip === 0) {
      turf = total;
    }
    
    return { turf, drip, total: turf + drip || total };
  }

  /**
   * Detect if boring under driveways/sidewalks is needed
   */
  private static detectBoringRequirement(message: string): boolean {
    const boringKeywords = [
      'boring', 'drill', 'under driveway', 'under sidewalk', 
      'cross driveway', 'underground', 'beneath'
    ];
    
    const lowerMessage = message.toLowerCase();
    return boringKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Step 3: Assess if collection is complete enough for pricing
   */
  private static assessCompletion(result: { services: ExtractedService[]; confidence: number }): {
    isComplete: boolean;
    missingInfo: string[];
    clarifyingQuestions: string[];
    suggestedResponse: string;
  } {
    
    const missingInfo: string[] = [];
    const clarifyingQuestions: string[] = [];
    
    // Check if we have any services at all
    if (result.services.length === 0) {
      return {
        isComplete: false,
        missingInfo: ['No services identified'],
        clarifyingQuestions: ['Could you please specify what landscaping services you need?'],
        suggestedResponse: 'I need more information about the landscaping services you\'re looking for. Could you describe your project in more detail?'
      };
    }

    // Check special service requirements
    for (const service of result.services) {
      if (service.isSpecial) {
        const missing = this.checkSpecialServiceCompleteness(service);
        missingInfo.push(...missing.missingInfo);
        clarifyingQuestions.push(...missing.questions);
      }
      
      // Check for zero quantities
      if (service.quantity <= 0) {
        missingInfo.push(`Quantity for ${service.serviceName}`);
        clarifyingQuestions.push(`How much ${service.serviceName} do you need?`);
      }
    }

    // Check overall confidence
    if (result.confidence < this.COMPLETION_THRESHOLD) {
      clarifyingQuestions.push('Could you provide more specific details about your project?');
    }

    const isComplete = missingInfo.length === 0 && result.confidence >= this.COMPLETION_THRESHOLD;

    return {
      isComplete,
      missingInfo,
      clarifyingQuestions,
      suggestedResponse: this.buildClarificationResponse(clarifyingQuestions, result.services)
    };
  }

  /**
   * Check completeness for special services (irrigation, lighting)
   */
  private static checkSpecialServiceCompleteness(service: ExtractedService): {
    missingInfo: string[];
    questions: string[];
  } {
    const missing: string[] = [];
    const questions: string[] = [];

    if (service.serviceName.includes('Irrigation')) {
      if (!service.specialRequirements?.zones || service.specialRequirements.zones.total === 0) {
        missing.push('Irrigation zone count');
        questions.push('How many irrigation zones do you need (turf zones vs drip zones)?');
      }
      
      if (service.specialRequirements?.boring === undefined) {
        missing.push('Boring requirement assessment');
        questions.push('Will we need to bore under any driveways or sidewalks for irrigation?');
      }
    }

    return { missingInfo: missing, questions };
  }

  /**
   * Build clarification response message
   */
  private static buildClarificationResponse(questions: string[], services: ExtractedService[]): string {
    if (questions.length === 0) {
      return 'Great! I have all the information needed to provide your pricing.';
    }

    let response = 'I need a few more details to give you accurate pricing:\n\n';
    
    questions.forEach((question, index) => {
      response += `${index + 1}. ${question}\n`;
    });

    if (services.length > 0) {
      response += '\nSo far I understand you need:\n';
      services.forEach(service => {
        response += `• ${service.serviceName}: ${service.quantity} ${service.unit}\n`;
      });
    }

    return response;
  }

  /**
   * Mock AI call - replace with actual OpenAI integration
   */
  private static async callAI(prompt: string): Promise<string> {
    // TODO: Replace with actual OpenAI/Claude API call
    console.log('🤖 AI Prompt (simulated):', prompt.substring(0, 200) + '...');
    
    // Mock response for development
    return JSON.stringify({
      validated_services: [],
      missed_services: [],
      validation_confidence: 0.8
    });
  }

  /**
   * Handle conversation context for follow-up questions
   */
  static async processFollowUp(
    newMessage: string, 
    previousResult: CollectionResult
  ): Promise<CollectionResult> {
    console.log('🔄 PROCESSING FOLLOW-UP');
    
    // Combine previous context with new message
    const combinedContext = this.buildCombinedContext(previousResult, newMessage);
    
    // Re-run parameter collection with enhanced context
    return this.collectParameters(combinedContext);
  }

  /**
   * Build combined context from conversation history
   */
  private static buildCombinedContext(previousResult: CollectionResult, newMessage: string): string {
    let context = 'Previous services mentioned: ';
    
    if (previousResult.services.length > 0) {
      context += previousResult.services.map(s => `${s.serviceName}: ${s.quantity} ${s.unit}`).join(', ');
    } else {
      context += 'none clearly identified';
    }
    
    context += `\n\nNew message: ${newMessage}`;
    
    return context;
  }
}