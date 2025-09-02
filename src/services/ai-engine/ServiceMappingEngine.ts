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
import { DimensionCalculator } from '../../utils/dimension-calculator';
import { GPTServiceSplitter, CategorySplitResult } from './GPTServiceSplitter';

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
   * Enhanced entry point: Map user input using GPT-powered category detection and service splitting
   */
  static async mapUserInputWithGPT(userInput: string): Promise<ServiceMappingResult> {
    console.log(`🤖 GPT-ENHANCED SERVICE MAPPING: "${userInput}"`);
    
    // Step 1: Use GPT to detect categories - this gives us context about what to expect
    const gptSplitter = new GPTServiceSplitter();
    const splitResult = await gptSplitter.analyzeAndSplit(userInput);
    
    console.log(`🎯 GPT ANALYSIS: ${splitResult.service_count} services in categories [${splitResult.detected_categories.join(', ')}]`);
    
    // Step 2: Use category information to prioritize certain services, but process FULL input
    // This preserves quantities and context while leveraging GPT insights
    const prioritizedResult = this.mapUserInputWithCategoryPriorities(userInput, splitResult.detected_categories);
    
    console.log(`🎯 GPT-ENHANCED RESULT: ${prioritizedResult.services.length} total services with ${(prioritizedResult.confidence * 100).toFixed(0)}% confidence`);
    
    return prioritizedResult;
  }

  /**
   * Map user input with category priorities from GPT analysis
   */
  private static mapUserInputWithCategoryPriorities(userInput: string, categories: string[]): ServiceMappingResult {
    console.log(`📊 PROCESSING WITH CATEGORY PRIORITIES: [${categories.join(', ')}]`);
    
    // Process normally but track which services match expected categories
    const result = this.mapUserInput(userInput);
    
    // Boost confidence for services that match expected categories
    result.services.forEach(service => {
      const serviceConfig = getServiceByName(service.serviceName);
      if (serviceConfig && categories.includes(serviceConfig.category)) {
        console.log(`✅ CATEGORY MATCH: ${service.serviceName} matches expected category ${serviceConfig.category}`);
        service.confidence = Math.min(1.0, service.confidence * 1.1); // 10% confidence boost
      } else if (serviceConfig) {
        console.log(`⚠️ CATEGORY MISMATCH: ${service.serviceName} (${serviceConfig.category}) not in expected categories`);
      }
    });
    
    // Recalculate overall confidence
    result.confidence = this.calculateOverallConfidence(result.services);
    
    return result;
  }

  /**
   * Main entry point: Map user input to recognized services
   * @param categoryHint Optional category hint from GPT analysis to filter synonyms
   */
  static mapUserInput(userInput: string, categoryHint?: string): ServiceMappingResult {
    console.log(`🔍 SERVICE MAPPING: "${userInput}"`);
    
    const normalizedInput = this.normalizeInput(userInput);
    console.log(`📝 NORMALIZED INPUT: "${normalizedInput}"`);
    
    const extractedServices = this.extractServices(normalizedInput, categoryHint);
    console.log(`🔍 EXTRACTED SERVICES: ${extractedServices.length} found`);
    extractedServices.forEach((service, i) => {
      console.log(`  ${i+1}. ${service.serviceName}: ${service.quantity} ${service.unit} (confidence: ${service.confidence})`);
    });
    
    const validatedServices = this.validateServices(extractedServices);
    console.log(`✅ VALIDATED SERVICES: ${validatedServices.length} passed validation`);
    
    const result: ServiceMappingResult = {
      services: validatedServices,
      unmappedText: this.findUnmappedText(normalizedInput, validatedServices),
      confidence: this.calculateOverallConfidence(validatedServices),
      needsClarification: this.needsClarification(validatedServices),
      clarificationQuestions: this.generateClarificationQuestions(validatedServices)
    };

    console.log(`📊 FINAL RESULT: ${result.services.length} services with ${(result.confidence * 100).toFixed(0)}% confidence`);
    if (result.services.length === 0) {
      console.log(`❌ NO SERVICES FOUND - Debug info:`);
      console.log(`   - Normalized input: "${normalizedInput}"`);
      console.log(`   - Extracted services: ${extractedServices.length}`);
      console.log(`   - Validation passed: ${validatedServices.length}`);
    }
    
    result.services.forEach(service => {
      console.log(`  - ${service.serviceName}: ${service.quantity} ${service.unit} (row ${service.row})`);
    });

    return result;
  }

  /**
   * Normalize user input for better matching
   */
  private static normalizeInput(input: string): string {
    const original = input;
    const normalized = input
      .toLowerCase()
      .trim()
      // Handle common spelling variations and synonyms (ENHANCED BAREBONES SUPPORT)
      .replace(/\bmulching\b/g, 'mulch')
      .replace(/\bwood chips?\b/g, 'mulch')
      .replace(/\bbark chips?\b/g, 'mulch')
      .replace(/\bsprinklers?\b/g, 'irrigation')
      .replace(/\bpavers?\b/g, 'paver patio')
      .replace(/\bpaver\s+patios?\b/g, 'paver patio')
      .replace(/\bstone\s+patios?\b/g, 'paver patio')
      .replace(/\bsteel\s+edging\b/g, 'metal edging')
      .replace(/\baluminum\s+edging\b/g, 'metal edging')
      .replace(/\btopsoils?\b/g, 'topsoil')
      .replace(/\bdirt\b/g, 'topsoil')
      .replace(/\bsoils?\b/g, 'topsoil')
      // Handle barebones dimension patterns like "12x8", "15 by 10"
      .replace(/(\d+)\s*x\s*(\d+)/g, '$1 by $2')
      .replace(/(\d+)\s*×\s*(\d+)/g, '$1 by $2')
      // CRITICAL FIX: Normalize all square feet variations
      .replace(/\bsquare\s+f(?:oo|ee)t\b/g, 'sqft')
      .replace(/\bsquare\s+foot\b/g, 'sqft') 
      .replace(/\bsq\.?\s*ft\.?\b/g, 'sqft')
      .replace(/\bsqft\b/g, 'sqft')  // Ensure consistent
      // Linear feet variations
      .replace(/\blinear\s+f(?:oo|ee)t\b/g, 'linear feet')
      .replace(/\blinear\s+ft\.?\b/g, 'linear feet')
      .replace(/\blin\.?\s*ft\.?\b/g, 'linear feet')
      // Handle cubic yard variations (ENHANCED BAREBONES SUPPORT)
      .replace(/\bcubic\s+yards?\b/g, 'cubic yards')
      .replace(/\bcu\.?\s*yds?\b/g, 'cubic yards')
      .replace(/\bcuyds?\b/g, 'cubic yards')
      // Handle common action words (normalize away for barebones support)
      .replace(/\binstall(?:ing|ed)?\b/g, '')
      .replace(/\bput\s+in\b/g, '')
      .replace(/\badd(?:ing)?\b/g, '')
      .replace(/\bneed(?:ed|s)?\b/g, '')
      .replace(/\bwant(?:ed|s)?\b/g, '')
      .replace(/\bget\b/g, '')
      // Handle "and" connections
      .replace(/\s+and\s+/g, ' AND ')
      .replace(/\s+plus\s+/g, ' AND ')
      .replace(/\s+with\s+/g, ' AND ')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    if (original !== normalized) {
      console.log(`🔄 NORMALIZATION: "${original}" → "${normalized}"`);
    }
    
    return normalized;
  }

  /**
   * Extract potential services with quantities from text
   */
  private static extractServices(input: string, categoryHint?: string): RecognizedService[] {
    const services: RecognizedService[] = [];
    
    // Split on "AND" to handle multiple services
    const segments = input.split(' AND ');
    
    for (const segment of segments) {
      const segmentServices = this.extractFromSegment(segment.trim(), categoryHint);
      services.push(...segmentServices);
    }

    return services;
  }

  /**
   * Extract services from a single text segment
   */
  private static extractFromSegment(segment: string, categoryHint?: string): RecognizedService[] {
    const services: RecognizedService[] = [];
    
    // Try to find service matches using synonyms (with optional category filtering)
    const serviceMatches = this.findServiceMatches(segment, categoryHint);
    
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
  private static findServiceMatches(text: string, categoryHint?: string): { serviceName: string; confidence: number }[] {
    const matches: { serviceName: string; confidence: number }[] = [];
    const searchContext = categoryHint ? ` (filtered by category: ${categoryHint})` : '';
    console.log(`🔍 SYNONYM SEARCH in text: "${text}"${searchContext}`);
    
    // Check each service's synonyms
    for (const [serviceName, synonyms] of Object.entries(SERVICE_SYNONYMS)) {
      // Apply category filtering if hint is provided (soft filtering - boost confidence for matching categories)
      if (categoryHint) {
        const serviceConfig = getServiceByName(serviceName);
        if (serviceConfig && serviceConfig.category !== categoryHint) {
          // Don't completely skip, but lower confidence for non-matching categories
          continue; // For now, still skip to test hard filtering
        }
      }
      
      for (const synonym of synonyms) {
        const synonymLower = synonym.toLowerCase();
        const textLower = text.toLowerCase(); // Ensure both are lowercase
        
        if (textLower.includes(synonymLower)) {
          const confidence = this.calculateSynonymConfidence(textLower, synonymLower);
          
          console.log(`✅ SYNONYM MATCH: "${synonym}" found in "${text}" for service "${serviceName}" (confidence: ${confidence})`);
          
          matches.push({
            serviceName,
            confidence
          });
          break; // Only match once per service
        } else {
          // Debug: Show failed matches for mulch
          if (synonym.includes('mulch') || synonym.includes('triple')) {
            console.log(`❌ SYNONYM MISS: "${synonym}" NOT found in "${text}"`);
          }
        }
      }
    }

    console.log(`📊 SYNONYM MATCHES: ${matches.length} found`);
    matches.forEach(match => {
      console.log(`  - ${match.serviceName}: ${match.confidence}`);
    });

    // Sort by confidence and remove duplicates
    const result = matches
      .sort((a, b) => b.confidence - a.confidence)
      .filter((match, index, array) => 
        array.findIndex(m => m.serviceName === match.serviceName) === index
      );
      
    console.log(`🎯 FINAL MATCHES: ${result.length} after deduplication`);
    return result;
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
    if (!serviceConfig) {
      console.log(`❌ QUANTITY EXTRACT: No config for service "${serviceName}"`);
      return 0;
    }

    console.log(`🔢 EXTRACTING QUANTITY from "${text}" for service "${serviceName}" (expects unit: ${serviceConfig.unit})`);

    // SMART DIMENSION CALCULATION - Check for dimensions first
    try {
      const dimensionResult = DimensionCalculator.parse(text, serviceName);
      
      if (dimensionResult) {
        console.log(`📐 DIMENSION CALCULATION: Found ${dimensionResult.calculationType} calculation`);
        
        // Check if the calculated unit matches the expected service unit
        const compatible = this.unitsAreCompatible(dimensionResult.unit, serviceConfig.unit);
        
        if (compatible) {
          console.log(`✅ DIMENSION QUANTITY: ${dimensionResult.quantity} ${dimensionResult.unit} (${dimensionResult.confidence * 100}% confidence)`);
          if (dimensionResult.dimensions) {
            console.log(`   📏 Calculated from: ${dimensionResult.dimensions.length} x ${dimensionResult.dimensions.width} = ${dimensionResult.dimensions.area}`);
          }
          return dimensionResult.quantity;
        } else {
          console.log(`⚠️ DIMENSION UNIT MISMATCH: Got ${dimensionResult.unit}, expected ${serviceConfig.unit}`);
          // Continue to standard extraction
        }
      }
    } catch (error) {
      console.log(`⚠️ DIMENSION CALCULATION ERROR: ${error.message}`);
      // Continue to standard extraction
    }

    // Standard quantity extraction patterns (fallback)
    const enhancedPatterns = [
      // Pattern 1: Number with units (e.g., "44 sqft", "3 linear feet")
      /(\d+(?:\.\d+)?)\s*(sqft|square\s?f(?:oo|ee)t|linear\s?f(?:oo|ee)t|lin\s?ft|ft|feet|yard|yards|cubic\s?yard|cu\s?yd|each|spouts?|zones?)/gi,
      
      // Pattern 2: Number followed by unit with "OF" (e.g., "44 sqft OF mulch")
      /(\d+(?:\.\d+)?)\s*(sqft|square\s?f(?:oo|ee)t|linear\s?f(?:oo|ee)t|lin\s?ft|ft|feet)\s+(?:of\s+)?/gi,
      
      // Pattern 3: Just numbers (assume default unit for service)
      /(\d+(?:\.\d+)?)\s*(?=\s|$|[a-z])/gi
    ];

    let bestQuantity = 0;
    let matchDetails = '';
    
    console.log(`🔄 FALLBACK: Using standard quantity extraction patterns`);
    
    for (let i = 0; i < enhancedPatterns.length; i++) {
      const pattern = enhancedPatterns[i];
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        const quantity = parseFloat(match[1]);
        const unit = match[2]?.toLowerCase() || '';
        
        console.log(`🔍 Pattern ${i+1} match: "${match[0]}" → quantity: ${quantity}, unit: "${unit}"`);
        
        // Convert units if necessary
        const normalizedUnit = this.normalizeUnit(unit);
        console.log(`🔄 Unit normalized: "${unit}" → "${normalizedUnit}"`);
        
        // Check if unit matches service expectation
        const compatible = this.unitsAreCompatible(normalizedUnit, serviceConfig.unit);
        console.log(`🔗 Unit compatibility: "${normalizedUnit}" with "${serviceConfig.unit}" = ${compatible}`);
        
        if (compatible && quantity > bestQuantity) {
          bestQuantity = quantity;
          matchDetails = `pattern ${i+1}: "${match[0]}" → ${quantity} ${normalizedUnit}`;
        }
      }
    }

    // If no quantity found, try to extract just numbers for sqft services
    if (bestQuantity === 0 && serviceConfig.unit === 'sqft') {
      const numberMatches = text.match(/(\d+(?:\.\d+)?)/g);
      if (numberMatches) {
        bestQuantity = parseFloat(numberMatches[0]);
        matchDetails = `fallback number: ${bestQuantity} (assuming sqft)`;
        console.log(`🔢 Fallback extraction: ${bestQuantity} (assuming sqft for service)`);
      }
    }

    if (bestQuantity > 0) {
      console.log(`✅ QUANTITY EXTRACTED: ${bestQuantity} via ${matchDetails}`);
    } else {
      console.log(`❌ NO QUANTITY FOUND in "${text}" for service "${serviceName}"`);
      console.log(`   Expected unit: ${serviceConfig.unit}`);
      console.log(`   Text patterns tested: ${enhancedPatterns.length}`);
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
    
    // Special compatibility rules - ENHANCED
    const compatibilityMap: Record<string, string[]> = {
      'sqft': ['square_feet', 'sq_ft', 'sqft', 'squarefeet', 'squarefoot', 'sq', ''],  // Added empty string for number-only
      'linear_feet': ['feet', 'ft', 'linear_feet', 'lin_ft', 'linearfeet', 'linear'],
      'cubic_yards': ['yards', 'yard', 'cubic_yards', 'cu_yd', 'cuyd', 'cubicyard', 'cubicyards'],
      'each': ['each', 'spouts', 'zones', 'pieces', 'ea', 'piece', '']  // Added empty string for number-only quantities
    };

    const compatibleUnits = compatibilityMap[serviceUnit] || [];
    const isCompatible = compatibleUnits.includes(inputUnit);
    
    // Debug logging for unit compatibility
    if (!isCompatible && (inputUnit || serviceUnit === 'sqft')) {
      console.log(`🔍 UNIT COMPATIBILITY CHECK:`);
      console.log(`   Input unit: "${inputUnit}"`);
      console.log(`   Service unit: "${serviceUnit}"`);
      console.log(`   Compatible units for ${serviceUnit}: [${compatibleUnits.join(', ')}]`);
      console.log(`   Result: ${isCompatible}`);
    }
    
    return isCompatible;
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