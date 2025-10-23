/**
 * ParameterCollectorService - Master Formula Primary System
 *
 * SIMPLIFIED: All services route through paver patio master formula
 * Google Sheets integration disabled - Services tab expansion coming
 *
 * Previous complex multi-service logic commented out for Services database migration
 */

// Commented out - Google Sheets service mapping disabled
// import { ServiceMappingEngine, ServiceMappingResult } from './ServiceMappingEngine';
import { CategorySplitResult } from '../text-processing/GPTServiceSplitter';
import { PaverPatioVariableMapper, PaverPatioVariableExtractionResult } from './PaverPatioVariableMapper';
import { getPaverPatioServiceDefaults } from '../../core/services-database/service-database';

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

  // For paver patio master formula
  paverPatioValues?: any; // PaverPatioValues type from master formula
  extractedVariables?: string[];
  defaultsUsed?: string[];
}

export class ParameterCollectorService {
  private static readonly COMPLETION_THRESHOLD = 0.85;
  
  /**
   * MASTER FORMULA PRIMARY - All requests route to paver patio calculation
   */
  static async collectParametersWithSplitServices(
    originalMessage: string,
    splitResult: CategorySplitResult
  ): Promise<CollectionResult> {
    console.log('🎯 MASTER FORMULA PARAMETER COLLECTION (All Services → Paver Patio)');
    console.log(`Original message: "${originalMessage}"`);
    console.log('🔥 ALL SERVICES ROUTE TO MASTER FORMULA SYSTEM');

    // SIMPLIFIED: All requests go to master formula
    return this.collectPaverPatioParameters(originalMessage, splitResult);
  }

  /* COMMENTED OUT - Google Sheets Service Mapping Logic
   * Complex multi-service logic disabled for Services database migration
   *
   * Previous logic:
   * - ServiceMappingEngine.mapUserInputWithCategoryHint()
   * - Multiple service type processing
   * - Complete/incomplete service separation
   * - Category-based service routing
   *
   * This will be restored through Services database tab expansion system
   */

  /**
   * Specialized parameter collection for paver patio master formula requests
   */
  static async collectPaverPatioParameters(
    originalMessage: string,
    splitResult: CategorySplitResult
  ): Promise<CollectionResult> {
    console.log('🔥 PAVER PATIO PARAMETER COLLECTION START');
    console.log(`Master Formula Mode: ${splitResult.masterFormulaMode}`);

    // Extract square footage from user message or split services
    let sqft = 100; // Default fallback

    // Try to extract sqft from the separated services or original message
    const sqftMatch = originalMessage.match(/(\d+)\s*(?:sq\.?\s*ft\.?|sqft|square\s+feet)/);
    if (sqftMatch) {
      sqft = parseInt(sqftMatch[1]);
    } else {
      // Check split services for dimensions
      for (const service of splitResult.separated_services) {
        const dimensionMatch = service.match(/(\d+)\s*x\s*(\d+)/);
        if (dimensionMatch) {
          sqft = parseInt(dimensionMatch[1]) * parseInt(dimensionMatch[2]);
          break;
        }
      }
    }

    // Use PaverPatioVariableMapper to extract variables
    const extractionResult = PaverPatioVariableMapper.extractPaverPatioVariables(
      originalMessage,
      sqft
    );

    // Create the paver patio service (will be updated after defaults are applied)
    let paverPatioService = PaverPatioVariableMapper.createPaverPatioService(
      extractionResult.sqft
    );

    // Validate the extraction result
    const validation = PaverPatioVariableMapper.validateExtractionResult(extractionResult);

    console.log('🔥 PAVER PATIO EXTRACTION COMPLETE:');
    console.log(`  Square Footage: ${extractionResult.sqft} sqft`);
    console.log(`  Confidence: ${(extractionResult.confidence * 100).toFixed(1)}%`);
    console.log(`  Extracted Variables: ${extractionResult.extractedVariables.length}`);
    console.log(`  Defaults Used: ${extractionResult.defaultsUsed.length}`);
    console.log(`  Validation: ${validation.isValid ? 'PASSED' : 'USING SERVICES DATABASE DEFAULTS'}`);

    // NEW: Use Services database defaults when validation fails
    let finalPaverPatioValues = extractionResult.paverPatioValues;
    let finalDefaultsUsed = [...extractionResult.defaultsUsed];

    if (!validation.isValid) {
      console.log('🔧 VALIDATION FAILED - APPLYING SERVICES DATABASE DEFAULTS');
      const serviceDefaults = getPaverPatioServiceDefaults();

      if (serviceDefaults) {
        finalPaverPatioValues = {
          ...serviceDefaults,
          // Keep any successfully extracted square footage
          sqft: extractionResult.sqft
        };

        finalDefaultsUsed = [
          'excavation.tearoutComplexity (Services DB)',
          'excavation.equipmentRequired (Services DB)',
          'siteAccess.accessDifficulty (Services DB)',
          'siteAccess.obstacleRemoval (Services DB)',
          'materials.paverStyle (Services DB)',
          'materials.cuttingComplexity (Services DB)',
          'materials.patternComplexity (Services DB)',
          'labor.teamSize (Services DB)',
          'complexity.overallComplexity (Services DB)'
        ];

        console.log('✅ SERVICES DATABASE DEFAULTS APPLIED - READY FOR PRICING');
      }
    }

    // Update the paver patio service with final values (including Services database defaults if needed)
    paverPatioService.specialRequirements = {
      paverPatioValues: finalPaverPatioValues,
      extractedVariables: extractionResult.extractedVariables,
      defaultsUsed: finalDefaultsUsed
    };

    // Determine status - Now always ready for pricing with Services database fallback
    let status: 'incomplete' | 'ready_for_pricing' | 'partial';
    status = 'ready_for_pricing';

    return {
      status,
      services: [paverPatioService], // Always include service since we have Services database defaults
      incompleteServices: [], // No incomplete services with Services database fallback
      missingInfo: validation.isValid ? validation.missingInfo : [], // Clear missing info when using defaults
      clarifyingQuestions: validation.isValid ? validation.clarifyingQuestions : [], // Clear questions when using defaults
      confidence: validation.isValid ? extractionResult.confidence : 0.8, // Good confidence with Services database defaults
      suggestedResponse: validation.isValid
        ? 'Master formula variables extracted - ready for paver patio pricing calculation'
        : 'Using Services database defaults - ready for paver patio pricing calculation'
    };
  }

  /**
   * MASTER FORMULA PRIMARY - Legacy entry point now routes to paver patio
   */
  static async collectParameters(userMessage: string, conversationHistory?: string[]): Promise<CollectionResult> {
    console.log('🎯 MASTER FORMULA PARAMETER COLLECTION (Legacy Entry Point)');
    console.log(`Input: "${userMessage}"`);
    console.log('🔥 ROUTING TO PAVER PATIO MASTER FORMULA');

    // Create mock split result for master formula routing
    const mockSplitResult: CategorySplitResult = {
      service_count: 1,
      separated_services: [userMessage],
      detected_categories: ['hardscaping'],
      unmapped_text: [],
      confidence: 0.9,
      masterFormulaMode: true
    };

    return this.collectPaverPatioParameters(userMessage, mockSplitResult);
  }

  /* COMMENTED OUT - Google Sheets Legacy Parameter Collection
   * Complex multi-step service mapping disabled for master formula focus
   *
   * Previous steps:
   * 1. performServiceMapping() - ServiceMappingEngine extraction
   * 2. validateAndEnhance() - AI validation and special service handling
   * 3. assessCompletion() - Completeness assessment
   *
   * This complex logic will be restored through Services database tab system
   */

  /* COMMENTED OUT - Google Sheets Service Mapping
   * ServiceMappingEngine integration disabled for master formula focus
   *
   * Previous service mapping logic:
   * - ServiceMappingEngine.mapUserInput() calls
   * - Multi-service detection and extraction
   * - Complex confidence scoring
   * - Unmapped text handling
   *
   * This will be restored through Services database tab expansion
   */

  /* COMMENTED OUT - Google Sheets Service Validation
   * Complex AI validation logic disabled for master formula focus
   *
   * Previous validation steps:
   * - Service enhancement with special requirements
   * - AI validation pass for missed services
   * - Confidence calculation algorithms
   *
   * Master formula system handles validation through PaverPatioVariableMapper
   */

  /* COMMENTED OUT - Google Sheets AI Validation Logic
   * Complex AI validation system disabled for master formula focus
   *
   * Previous AI validation features:
   * - buildValidationPrompt() for 2-3k token optimization
   * - callAI() for OpenAI/Claude integration
   * - parseValidationResponse() for service extraction
   * - Missed service detection algorithms
   *
   * Master formula uses PaverPatioVariableMapper for validation
   */

  /* COMMENTED OUT - Google Sheets Validation Prompts and Parsing
   * Complex AI prompt building and response parsing disabled
   *
   * Previous validation prompt features:
   * - 2-3k token optimization vs 17-20k original
   * - Multi-service category validation
   * - JSON response parsing with ServiceMappingEngine integration
   * - Confidence scoring algorithms
   *
   * Master formula uses simplified variable validation
   */

  /* COMMENTED OUT - Google Sheets Special Requirements Extraction
   * Complex irrigation and lighting requirements logic disabled
   *
   * Previous special requirements features:
   * - extractIrrigationZones() for turf/drip zone detection
   * - detectBoringRequirement() for drilling detection
   * - Lighting fixture and transformer extraction
   * - Complex regex pattern matching
   *
   * Master formula uses PaverPatioVariableMapper for all variables
   */

  /* COMMENTED OUT - Google Sheets Completion Assessment
   * Complex completion logic disabled for master formula focus
   *
   * Previous completion assessment features:
   * - Multi-service completeness validation
   * - Special service requirement checking
   * - Confidence threshold analysis (0.85)
   * - Clarifying question generation
   *
   * Master formula uses PaverPatioVariableMapper validation
   */

  /* COMMENTED OUT - Google Sheets Special Service Completeness
   * Irrigation and lighting completeness checking disabled
   *
   * Previous special service features:
   * - Irrigation zone validation
   * - Boring requirement detection
   * - Missing information tracking
   * - Clarifying question generation
   *
   * Master formula handles all validation through variable mapping
   */

  /* COMMENTED OUT - Google Sheets Clarification Response Building
   * Complex response generation disabled for master formula focus
   *
   * Previous clarification features:
   * - Multi-question formatting
   * - Service summary generation
   * - Dynamic response building
   * - Conversation flow management
   *
   * Master formula uses PaverPatioVariableMapper response generation
   */

  /* COMMENTED OUT - Google Sheets AI Integration
   * Mock AI call logic disabled for master formula focus
   *
   * Previous AI integration features:
   * - OpenAI/Claude API integration points
   * - Prompt optimization for 2-3k tokens
   * - Mock response handling
   * - Error handling and fallbacks
   *
   * Master formula uses dedicated AI services for variable extraction
   */

  /* COMMENTED OUT - Google Sheets Follow-up Conversation Logic
   * Complex conversation context handling disabled
   *
   * Previous follow-up features:
   * - processFollowUp() for multi-turn conversations
   * - buildCombinedContext() for conversation memory
   * - Previous result integration
   * - Enhanced context building
   *
   * Master formula uses dedicated conversation orchestration services
   */
}