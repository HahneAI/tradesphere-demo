/**
 * DetectorImpl - Service Detection Implementation
 * 
 * Replicates Make.com's service detection logic using the existing ServiceMappingEngine
 * Parses natural language input to identify landscaping services and quantities
 */

import { 
  IServiceDetector, 
  StepResult, 
  DetectionResult, 
  RawService 
} from '../interfaces';
import { ServiceMappingEngine, ServiceMappingResult } from '../../ai-engine/ServiceMappingEngine';

export class DetectorImpl implements IServiceDetector {
  
  detect(input: string): StepResult<DetectionResult> {
    const startTime = Date.now();
    
    try {
      // Use existing ServiceMappingEngine for initial detection
      const mappingResult: ServiceMappingResult = ServiceMappingEngine.mapUserInput(input);
      
      // Convert ServiceMappingEngine results to our format
      const services: RawService[] = mappingResult.services.map(service => ({
        name: service.serviceName,
        quantity: service.quantity,
        unit: service.unit,
        confidence: service.confidence,
        originalText: service.originalText
      }));

      // Analyze input characteristics
      const inputAnalysis = {
        hasMultipleServices: services.length > 1,
        hasQuantities: services.every(s => s.quantity > 0),
        hasUnits: services.every(s => s.unit && s.unit.length > 0),
        overallConfidence: mappingResult.confidence
      };

      // Find text that wasn't mapped to services
      const unmappedText = this.extractUnmappedText(input, services);

      const detectionResult: DetectionResult = {
        services,
        unmappedText,
        inputAnalysis
      };

      return {
        success: true,
        data: detectionResult,
        debug: {
          step: 'detection',
          processingTime: Date.now() - startTime,
          intermediateOutput: {
            originalInput: input,
            servicesFound: services.length,
            overallConfidence: inputAnalysis.overallConfidence,
            mappingEngineUsed: true
          },
          info: [
            `Detected ${services.length} services`,
            `Overall confidence: ${(inputAnalysis.overallConfidence * 100).toFixed(0)}%`
          ]
        }
      };

    } catch (error) {
      return {
        success: false,
        data: {
          services: [],
          unmappedText: [input],
          inputAnalysis: {
            hasMultipleServices: false,
            hasQuantities: false,
            hasUnits: false,
            overallConfidence: 0
          }
        },
        debug: {
          step: 'detection',
          processingTime: Date.now() - startTime,
          intermediateOutput: null,
          warnings: [`Detection failed: ${error.message}`]
        },
        error: error.message
      };
    }
  }

  /**
   * Extract text that wasn't successfully mapped to services
   */
  private extractUnmappedText(input: string, services: RawService[]): string[] {
    let remainingText = input.toLowerCase();
    
    // Remove mapped service terms and quantities
    for (const service of services) {
      // Remove service name variations
      const serviceWords = service.name.toLowerCase().split(/\s+/);
      for (const word of serviceWords) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        remainingText = remainingText.replace(regex, '');
      }
      
      // Remove quantities
      if (service.quantity > 0) {
        const qtyRegex = new RegExp(`\\b${service.quantity}\\b`, 'g');
        remainingText = remainingText.replace(qtyRegex, '');
      }
      
      // Remove units
      if (service.unit) {
        const unitWords = service.unit.split(/\s+/);
        for (const unit of unitWords) {
          const regex = new RegExp(`\\b${unit}\\b`, 'gi');
          remainingText = remainingText.replace(regex, '');
        }
      }
    }
    
    // Clean up and split into meaningful chunks
    const chunks = remainingText
      .replace(/[,\s]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(chunk => 
        chunk.length > 2 && 
        !/^(and|the|a|an|of|in|on|at|to|for|with|by|feet|ft|sq|square)$/i.test(chunk)
      );
    
    return chunks;
  }

  /**
   * Enhanced detection with conversation context
   */
  detectWithContext(input: string, previousServices: RawService[] = []): StepResult<DetectionResult> {
    // For now, use standard detection
    // Future enhancement: combine with previous context
    const result = this.detect(input);
    
    if (result.success && previousServices.length > 0) {
      // Add context information to debug output
      result.debug.info = result.debug.info || [];
      result.debug.info.push(`Previous services in context: ${previousServices.length}`);
    }
    
    return result;
  }

  /**
   * Get service suggestions for partial matches
   */
  getSuggestions(partialInput: string): string[] {
    try {
      return ServiceMappingEngine.getServiceSuggestions(partialInput);
    } catch (error) {
      console.warn('Failed to get service suggestions:', error);
      return [];
    }
  }

  /**
   * Validate that detected services make sense
   */
  private validateDetectedServices(services: RawService[]): { valid: RawService[]; issues: string[] } {
    const valid: RawService[] = [];
    const issues: string[] = [];

    for (const service of services) {
      // Basic validation
      if (!service.name || service.name.trim().length === 0) {
        issues.push('Service with empty name detected');
        continue;
      }

      if (service.quantity <= 0) {
        issues.push(`Invalid quantity for ${service.name}: ${service.quantity}`);
        continue;
      }

      if (service.confidence < 0.1) {
        issues.push(`Very low confidence for ${service.name}: ${service.confidence}`);
        continue;
      }

      valid.push(service);
    }

    return { valid, issues };
  }

  /**
   * Separate multiple services from complex input
   */
  separateServices(input: string): string[] {
    // Use ServiceMappingEngine's separation logic
    return ServiceMappingEngine.separateMultipleServices(input);
  }
}