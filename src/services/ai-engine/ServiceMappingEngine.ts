/**
 * ServiceMappingEngine - Advanced service recognition and mapping
 * 
 * Replicates Make.com's 7-module parameter collection logic
 * Maps natural language to exact Google Sheets service names and quantities
 */

import { 
  SERVICE_DATABASE, 
  SERVICE_SYNONYMS, 
  UNIT_CONVERSIONS,
  ServiceConfig,
  findServiceBySynonym,
  getServiceByName,
  isSpecialService
} from '../../config/service-database';

export interface RecognizedService {
  serviceName: string;
  quantity: number;
  unit: string;
  confidence: number;
  row: number;
  category: string;
  isSpecial: boolean;
  originalText: string;
}

export interface ServiceMappingResult {
  services: RecognizedService[];
  unmappedText: string[];
  confidence: number;
  needsClarification: boolean;
  clarificationQuestions: string[];
}

export class ServiceMappingEngine {
  private static readonly CONFIDENCE_THRESHOLD = 0.7;
  private static readonly QUANTITY_PATTERNS = [
    // Number with units
    /(\d+(?:\.\d+)?)\s*(sq\s?ft|square\s?f(?:oo|ee)t|sqft|linear\s?f(?:oo|ee)t|lin\s?ft|ft|feet|yard|yards|cubic\s?yard|cu\s?yd|each|spouts?|zones?)/gi,
    
    // Just numbers (assume default unit for service)
    /(\d+(?:\.\d+)?)\s*(?=\s|$|[a-z])/gi
  ];

  /**
   * Main entry point: Map user input to recognized services
   */
  static mapUserInput(userInput: string): ServiceMappingResult {
    console.log(`🔍 SERVICE MAPPING: "${userInput}"`);
    
    const normalizedInput = this.normalizeInput(userInput);
    const extractedServices = this.extractServices(normalizedInput);
    const validatedServices = this.validateServices(extractedServices);
    
    const result: ServiceMappingResult = {
      services: validatedServices,
      unmappedText: this.findUnmappedText(normalizedInput, validatedServices),
      confidence: this.calculateOverallConfidence(validatedServices),
      needsClarification: this.needsClarification(validatedServices),
      clarificationQuestions: this.generateClarificationQuestions(validatedServices)
    };

    console.log(`✅ MAPPED ${result.services.length} services with ${result.confidence}% confidence`);
    result.services.forEach(service => {
      console.log(`  - ${service.serviceName}: ${service.quantity} ${service.unit} (row ${service.row})`);
    });

    return result;
  }

  /**
   * Normalize user input for better matching
   */
  private static normalizeInput(input: string): string {
    return input
      .toLowerCase()
      .trim()
      // Handle common spelling variations
      .replace(/\bmulching\b/g, 'mulch')
      .replace(/\bsprinklers?\b/g, 'irrigation')
      .replace(/\bpavers?\b/g, 'paver patio')
      // Normalize units
      .replace(/\bsq\.?\s*ft\.?\b/g, 'sqft')
      .replace(/\blinear\s+ft\.?\b/g, 'linear feet')
      .replace(/\blin\.?\s*ft\.?\b/g, 'linear feet')
      // Handle "and" connections
      .replace(/\s+and\s+/g, ' AND ');
  }

  /**
   * Extract potential services with quantities from text
   */
  private static extractServices(input: string): RecognizedService[] {
    const services: RecognizedService[] = [];
    
    // Split on "AND" to handle multiple services
    const segments = input.split(' AND ');
    
    for (const segment of segments) {
      const segmentServices = this.extractFromSegment(segment.trim());
      services.push(...segmentServices);
    }

    return services;
  }

  /**
   * Extract services from a single text segment
   */
  private static extractFromSegment(segment: string): RecognizedService[] {
    const services: RecognizedService[] = [];
    
    // Try to find service matches using synonyms
    const serviceMatches = this.findServiceMatches(segment);
    
    for (const match of serviceMatches) {
      // Extract quantity for this service
      const quantity = this.extractQuantity(segment, match.serviceName);
      
      if (quantity > 0) {
        const serviceConfig = getServiceByName(match.serviceName)!;
        
        services.push({
          serviceName: match.serviceName,
          quantity,
          unit: serviceConfig.unit,
          confidence: match.confidence,
          row: serviceConfig.row,
          category: serviceConfig.category,
          isSpecial: isSpecialService(match.serviceName),
          originalText: segment
        });
      }
    }

    return services;
  }

  /**
   * Find potential service matches in text using synonym database
   */
  private static findServiceMatches(text: string): { serviceName: string; confidence: number }[] {
    const matches: { serviceName: string; confidence: number }[] = [];
    
    // Check each service's synonyms
    for (const [serviceName, synonyms] of Object.entries(SERVICE_SYNONYMS)) {
      for (const synonym of synonyms) {
        if (text.includes(synonym.toLowerCase())) {
          const confidence = this.calculateSynonymConfidence(text, synonym);
          
          matches.push({
            serviceName,
            confidence
          });
          break; // Only match once per service
        }
      }
    }

    // Sort by confidence and remove duplicates
    return matches
      .sort((a, b) => b.confidence - a.confidence)
      .filter((match, index, array) => 
        array.findIndex(m => m.serviceName === match.serviceName) === index
      );
  }

  /**
   * Calculate confidence score for synonym match
   */
  private static calculateSynonymConfidence(text: string, synonym: string): number {
    let confidence = 0.8; // Base confidence
    
    // Boost confidence for exact word matches
    const words = text.split(/\s+/);
    const synonymWords = synonym.split(/\s+/);
    
    if (synonymWords.every(word => words.includes(word))) {
      confidence += 0.15;
    }
    
    // Boost confidence for longer synonym matches (more specific)
    if (synonym.length > 10) {
      confidence += 0.05;
    }
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Extract quantity for a specific service from text
   */
  private static extractQuantity(text: string, serviceName: string): number {
    const serviceConfig = getServiceByName(serviceName);
    if (!serviceConfig) return 0;

    // Look for numbers near service-related terms
    const patterns = this.QUANTITY_PATTERNS;
    let bestQuantity = 0;
    
    for (const pattern of patterns) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        const quantity = parseFloat(match[1]);
        const unit = match[2]?.toLowerCase() || '';
        
        // Convert units if necessary
        const normalizedUnit = this.normalizeUnit(unit);
        
        // Check if unit matches service expectation
        if (this.unitsAreCompatible(normalizedUnit, serviceConfig.unit)) {
          bestQuantity = Math.max(bestQuantity, quantity);
        }
      }
    }

    // If no quantity found, try to extract just numbers
    if (bestQuantity === 0) {
      const numberMatches = text.match(/\d+(?:\.\d+)?/g);
      if (numberMatches) {
        bestQuantity = parseFloat(numberMatches[0]);
      }
    }

    return bestQuantity;
  }

  /**
   * Normalize unit variations
   */
  private static normalizeUnit(unit: string): string {
    const normalized = unit.toLowerCase().replace(/\s+/g, '');
    return UNIT_CONVERSIONS[normalized] || normalized;
  }

  /**
   * Check if units are compatible
   */
  private static unitsAreCompatible(inputUnit: string, serviceUnit: string): boolean {
    if (inputUnit === serviceUnit) return true;
    
    // Special compatibility rules
    const compatibilityMap: Record<string, string[]> = {
      'sqft': ['square_feet', 'sq_ft', 'sqft'],
      'linear_feet': ['feet', 'ft', 'linear_feet', 'lin_ft'],
      'cubic_yards': ['yards', 'yard', 'cubic_yards', 'cu_yd'],
      'each': ['each', 'spouts', 'zones', 'pieces']
    };

    const compatibleUnits = compatibilityMap[serviceUnit] || [];
    return compatibleUnits.includes(inputUnit);
  }

  /**
   * Validate extracted services against business rules
   */
  private static validateServices(services: RecognizedService[]): RecognizedService[] {
    const validServices: RecognizedService[] = [];
    
    for (const service of services) {
      // Basic validation
      if (service.quantity <= 0) {
        console.warn(`⚠️ Invalid quantity for ${service.serviceName}: ${service.quantity}`);
        continue;
      }
      
      if (service.confidence < this.CONFIDENCE_THRESHOLD) {
        console.warn(`⚠️ Low confidence for ${service.serviceName}: ${service.confidence}`);
        continue;
      }
      
      // Special service validation
      if (service.isSpecial) {
        service.confidence *= 0.9; // Reduce confidence for special services requiring clarification
      }
      
      validServices.push(service);
    }
    
    return validServices;
  }

  /**
   * Find text that wasn't successfully mapped to services
   */
  private static findUnmappedText(input: string, services: RecognizedService[]): string[] {
    let remainingText = input;
    
    // Remove mapped service terms
    for (const service of services) {
      const synonyms = SERVICE_SYNONYMS[service.serviceName] || [];
      
      for (const synonym of synonyms) {
        const regex = new RegExp(synonym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        remainingText = remainingText.replace(regex, '');
      }
      
      // Remove numbers that were mapped
      remainingText = remainingText.replace(new RegExp(`\\b${service.quantity}\\b`, 'g'), '');
    }
    
    // Clean up remaining text and split into meaningful chunks
    const chunks = remainingText
      .replace(/[,\s]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(chunk => 
        chunk.length > 2 && 
        !/^(and|the|a|an|of|in|on|at|to|for|with|by)$/i.test(chunk)
      );
    
    return chunks;
  }

  /**
   * Calculate overall confidence for all mapped services
   */
  private static calculateOverallConfidence(services: RecognizedService[]): number {
    if (services.length === 0) return 0;
    
    const avgConfidence = services.reduce((sum, s) => sum + s.confidence, 0) / services.length;
    
    // Boost confidence for multiple services (shows comprehensive understanding)
    const multiServiceBoost = Math.min(services.length * 0.05, 0.15);
    
    return Math.min(avgConfidence + multiServiceBoost, 1.0);
  }

  /**
   * Determine if clarification is needed
   */
  private static needsClarification(services: RecognizedService[]): boolean {
    // Need clarification if:
    // - No services found
    // - Special services detected (irrigation/lighting)
    // - Low overall confidence
    
    if (services.length === 0) return true;
    
    const hasSpecialServices = services.some(s => s.isSpecial);
    const hasLowConfidence = services.some(s => s.confidence < 0.8);
    
    return hasSpecialServices || hasLowConfidence;
  }

  /**
   * Generate clarification questions for ambiguous inputs
   */
  private static generateClarificationQuestions(services: RecognizedService[]): string[] {
    const questions: string[] = [];
    
    for (const service of services) {
      // Special service questions
      if (service.serviceName === 'Irrigation Set Up Cost' || service.serviceName === 'Irrigation (per zone)') {
        questions.push('For irrigation: How many zones do you need (turf/drip)?');
        questions.push('Will boring under driveways or sidewalks be required?');
      }
      
      // Low confidence questions
      if (service.confidence < 0.8) {
        questions.push(`Did you mean "${service.serviceName}" for the ${service.originalText}?`);
      }
      
      // Quantity clarification
      if (service.quantity === 0) {
        questions.push(`How much ${service.serviceName} do you need (in ${service.unit})?`);
      }
    }
    
    // Remove duplicates
    return Array.from(new Set(questions));
  }

  /**
   * Handle multi-service separation (e.g., "4 spouts and 15 feet triple ground")
   */
  static separateMultipleServices(input: string): string[] {
    const separators = [
      ' and ',
      ', ',
      ' plus ',
      ' with ',
      '\n'
    ];
    
    let segments = [input];
    
    for (const separator of separators) {
      const newSegments: string[] = [];
      for (const segment of segments) {
        newSegments.push(...segment.split(separator));
      }
      segments = newSegments;
    }
    
    return segments
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Get service suggestions for partial matches
   */
  static getServiceSuggestions(partialInput: string): string[] {
    const suggestions: string[] = [];
    const input = partialInput.toLowerCase();
    
    // Find services with matching synonyms
    for (const [serviceName, synonyms] of Object.entries(SERVICE_SYNONYMS)) {
      for (const synonym of synonyms) {
        if (synonym.toLowerCase().includes(input) || input.includes(synonym.toLowerCase())) {
          suggestions.push(serviceName);
          break;
        }
      }
    }
    
    return suggestions.slice(0, 5); // Return top 5 suggestions
  }
}