/**
 * CheckerImpl - Completeness Validation Implementation
 * 
 * Validates that detected services have all required information for pricing
 * Generates clarifying questions for incomplete services
 */

import {
  ICompletenessChecker,
  StepResult,
  DetectionResult,
  ValidationResult,
  RawService,
  ValidatedService
} from '../interfaces';

export class CheckerImpl implements ICompletenessChecker {
  private static readonly COMPLETENESS_THRESHOLD = 0.8;
  private static readonly MIN_QUANTITY = 0.1;

  check(detected: DetectionResult): StepResult<ValidationResult> {
    const startTime = Date.now();

    try {
      const validatedServices = this.validateServices(detected.services);
      const result = this.assessCompleteness(validatedServices, detected.inputAnalysis);

      return {
        success: true,
        data: result,
        debug: {
          step: 'validation',
          processingTime: Date.now() - startTime,
          intermediateOutput: {
            totalServices: detected.services.length,
            completeServices: result.completeServices.length,
            incompleteServices: result.incompleteServices.length,
            needsClarification: result.needsClarification,
            questionsGenerated: result.clarificationQuestions.length
          },
          info: [
            `Validated ${detected.services.length} services`,
            `${result.completeServices.length} complete, ${result.incompleteServices.length} incomplete`,
            `Clarification needed: ${result.needsClarification ? 'Yes' : 'No'}`
          ]
        }
      };

    } catch (error) {
      return {
        success: false,
        data: {
          completeServices: [],
          incompleteServices: [],
          clarificationQuestions: [],
          needsClarification: true,
          readyForMapping: false
        },
        debug: {
          step: 'validation',
          processingTime: Date.now() - startTime,
          intermediateOutput: null,
          warnings: [`Validation failed: ${error.message}`]
        },
        error: error.message
      };
    }
  }

  /**
   * Validate individual services
   */
  private validateServices(services: RawService[]): ValidatedService[] {
    return services.map(service => this.validateSingleService(service));
  }

  /**
   * Validate a single service for completeness
   */
  private validateSingleService(service: RawService): ValidatedService {
    const missingInfo: string[] = [];
    const questions: string[] = [];
    
    // Check service name
    if (!service.name || service.name.trim().length === 0) {
      missingInfo.push('Service name');
      questions.push('What type of landscaping service do you need?');
    }

    // Check quantity
    if (!service.quantity || service.quantity <= this.MIN_QUANTITY) {
      missingInfo.push('Quantity');
      questions.push(`How much ${service.name || 'of this service'} do you need?`);
    }

    // Check unit (if service requires specific units)
    if (!service.unit || service.unit.trim().length === 0) {
      const suggestedUnit = this.suggestUnit(service.name);
      if (suggestedUnit) {
        missingInfo.push('Unit');
        questions.push(`What unit should we use for ${service.name}? (e.g., ${suggestedUnit})`);
      }
    }

    // Check confidence level
    if (service.confidence < this.COMPLETENESS_THRESHOLD) {
      missingInfo.push('Service clarity');
      questions.push(`Did you mean "${service.name}" for your request?`);
    }

    // Check for special service requirements
    const specialRequirements = this.checkSpecialRequirements(service);
    missingInfo.push(...specialRequirements.missing);
    questions.push(...specialRequirements.questions);

    const isComplete = missingInfo.length === 0 && service.confidence >= this.COMPLETENESS_THRESHOLD;

    return {
      ...service,
      isComplete,
      missingInfo,
      questions
    };
  }

  /**
   * Check special requirements for certain services (irrigation, lighting, etc.)
   */
  private checkSpecialRequirements(service: RawService): { missing: string[]; questions: string[] } {
    const missing: string[] = [];
    const questions: string[] = [];

    const serviceName = service.name.toLowerCase();

    // Irrigation special requirements
    if (serviceName.includes('irrigation') || serviceName.includes('sprinkler')) {
      if (!this.hasIrrigationDetails(service)) {
        missing.push('Irrigation details');
        questions.push('How many irrigation zones do you need (turf zones vs drip zones)?');
        questions.push('Will boring under driveways or sidewalks be required?');
      }
    }

    // Retaining wall special requirements  
    if (serviceName.includes('retaining') || serviceName.includes('wall')) {
      if (!this.hasWallDetails(service)) {
        missing.push('Wall specifications');
        questions.push(`What height retaining wall do you need?`);
        questions.push(`How many linear feet of retaining wall?`);
      }
    }

    // Patio special requirements
    if (serviceName.includes('patio') || serviceName.includes('paver')) {
      if (!this.hasPatioDetails(service)) {
        missing.push('Patio specifications');
        questions.push('What size patio do you need (in square feet)?');
      }
    }

    return { missing, questions };
  }

  /**
   * Check if service has irrigation-specific details
   */
  private hasIrrigationDetails(service: RawService): boolean {
    const text = service.originalText?.toLowerCase() || '';
    return text.includes('zone') || text.includes('spout') || text.includes('turf') || text.includes('drip');
  }

  /**
   * Check if service has wall-specific details
   */
  private hasWallDetails(service: RawService): boolean {
    const text = service.originalText?.toLowerCase() || '';
    return text.includes('feet') || text.includes('height') || text.includes('tall') || text.includes('linear');
  }

  /**
   * Check if service has patio-specific details
   */
  private hasPatioDetails(service: RawService): boolean {
    return service.unit === 'sqft' || service.unit === 'square_feet';
  }

  /**
   * Suggest appropriate unit for a service
   */
  private suggestUnit(serviceName: string): string {
    const name = serviceName.toLowerCase();
    
    if (name.includes('mulch') || name.includes('patio') || name.includes('sod')) {
      return 'square feet';
    }
    
    if (name.includes('edging') || name.includes('wall') || name.includes('border')) {
      return 'linear feet';
    }
    
    if (name.includes('tree') || name.includes('shrub') || name.includes('plant')) {
      return 'each';
    }
    
    if (name.includes('irrigation') && name.includes('zone')) {
      return 'zones';
    }
    
    if (name.includes('topsoil') || name.includes('gravel')) {
      return 'cubic yards';
    }
    
    return '';
  }

  /**
   * Assess overall completeness and determine next steps
   */
  private assessCompleteness(
    validatedServices: ValidatedService[], 
    inputAnalysis: any
  ): ValidationResult {
    
    const completeServices = validatedServices.filter(s => s.isComplete);
    const incompleteServices = validatedServices.filter(s => !s.isComplete);
    
    // Collect all clarification questions
    const allQuestions = incompleteServices.reduce((questions: string[], service) => {
      questions.push(...service.questions);
      return questions;
    }, []);

    // Remove duplicate questions
    const clarificationQuestions = Array.from(new Set(allQuestions));

    // Determine if clarification is needed
    const needsClarification = this.shouldRequestClarification(
      completeServices,
      incompleteServices,
      inputAnalysis
    );

    // Determine if ready for mapping
    const readyForMapping = completeServices.length > 0 && !needsClarification;

    return {
      completeServices,
      incompleteServices,
      clarificationQuestions,
      needsClarification,
      readyForMapping
    };
  }

  /**
   * Determine if clarification should be requested
   */
  private shouldRequestClarification(
    complete: ValidatedService[],
    incomplete: ValidatedService[],
    inputAnalysis: any
  ): boolean {
    // Always need clarification if no complete services
    if (complete.length === 0) {
      return true;
    }

    // Need clarification if more than half are incomplete
    if (incomplete.length > complete.length) {
      return true;
    }

    // Need clarification if overall confidence is low
    if (inputAnalysis.overallConfidence < this.COMPLETENESS_THRESHOLD) {
      return true;
    }

    // Need clarification if special services are incomplete
    const incompleteSpecialServices = incomplete.filter(s => this.isSpecialService(s.name));
    if (incompleteSpecialServices.length > 0) {
      return true;
    }

    return false;
  }

  /**
   * Check if service requires special handling
   */
  private isSpecialService(serviceName: string): boolean {
    const name = serviceName.toLowerCase();
    return name.includes('irrigation') || 
           name.includes('lighting') || 
           name.includes('retaining wall');
  }

  /**
   * Generate human-readable completeness summary
   */
  getCompletenessSummary(result: ValidationResult): string {
    const total = result.completeServices.length + result.incompleteServices.length;
    
    if (total === 0) {
      return 'No services were identified from your request.';
    }

    if (result.completeServices.length === total) {
      return `All ${total} services have complete information and are ready for pricing.`;
    }

    if (result.completeServices.length === 0) {
      return `Found ${total} services but all need additional information.`;
    }

    return `${result.completeServices.length} of ${total} services are complete. ${result.incompleteServices.length} need additional details.`;
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(service: ValidatedService): string[] {
    const violations: string[] = [];

    // Minimum quantity rules
    if (service.name.toLowerCase().includes('patio') && service.quantity < 50) {
      violations.push('Patio installations typically have a 50 sq ft minimum');
    }

    if (service.name.toLowerCase().includes('irrigation') && service.quantity < 1) {
      violations.push('Irrigation systems require at least 1 zone');
    }

    // Maximum quantity warnings
    if (service.quantity > 10000) {
      violations.push('Large quantities may require special pricing - please confirm');
    }

    return violations;
  }
}