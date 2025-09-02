/**
 * MapperImpl - Service Mapping Implementation
 * 
 * Maps validated services to exact Google Sheets service names and row numbers
 * Uses the existing service database for accurate mapping
 */

import {
  IServiceMapper,
  StepResult,
  ValidationResult,
  MappingResult,
  ValidatedService,
  MappedService
} from '../interfaces';
import {
  SERVICE_DATABASE,
  SERVICE_SYNONYMS,
  getServiceByName,
  findServiceBySynonym,
  isSpecialService,
  ServiceConfig
} from '../../../config/service-database';

export class MapperImpl implements IServiceMapper {
  
  map(validated: ValidationResult): StepResult<MappingResult> {
    const startTime = Date.now();

    try {
      const mappingResults = this.mapServices(validated.completeServices);
      const result = this.createMappingResult(mappingResults, validated.completeServices);

      return {
        success: true,
        data: result,
        debug: {
          step: 'mapping',
          processingTime: Date.now() - startTime,
          intermediateOutput: {
            inputServices: validated.completeServices.length,
            mappedServices: result.mappedServices.length,
            unmappedServices: result.unmappedServices.length,
            specialServices: result.specialServices.length,
            mappingConfidence: result.mappingConfidence
          },
          info: [
            `Mapped ${result.mappedServices.length} of ${validated.completeServices.length} services`,
            `Special services: ${result.specialServices.length}`,
            `Mapping confidence: ${(result.mappingConfidence * 100).toFixed(0)}%`
          ]
        }
      };

    } catch (error) {
      return {
        success: false,
        data: {
          mappedServices: [],
          unmappedServices: validated.completeServices,
          specialServices: [],
          mappingConfidence: 0
        },
        debug: {
          step: 'mapping',
          processingTime: Date.now() - startTime,
          intermediateOutput: null,
          warnings: [`Mapping failed: ${error.message}`]
        },
        error: error.message
      };
    }
  }

  /**
   * Map each service to Google Sheets database
   */
  private mapServices(services: ValidatedService[]): Array<{
    service: ValidatedService;
    mapped: MappedService | null;
    confidence: number;
  }> {
    return services.map(service => {
      const mappingResult = this.mapSingleService(service);
      return {
        service,
        mapped: mappingResult.mapped,
        confidence: mappingResult.confidence
      };
    });
  }

  /**
   * Map a single service to the database
   */
  private mapSingleService(service: ValidatedService): { mapped: MappedService | null; confidence: number } {
    // Try exact name match first
    let serviceConfig = getServiceByName(service.name);
    let confidence = 0.95; // High confidence for exact matches

    // Try synonym matching if no exact match
    if (!serviceConfig) {
      const synonymMatch = findServiceBySynonym(service.name);
      if (synonymMatch) {
        serviceConfig = getServiceByName(synonymMatch);
        confidence = 0.85; // Lower confidence for synonym matches
      }
    }

    // Try fuzzy matching if still no match
    if (!serviceConfig) {
      const fuzzyMatch = this.findFuzzyMatch(service.name);
      if (fuzzyMatch) {
        serviceConfig = getServiceByName(fuzzyMatch.serviceName);
        confidence = fuzzyMatch.confidence;
      }
    }

    // Create mapped service if we found a match
    if (serviceConfig) {
      const mapped: MappedService = {
        ...service,
        serviceName: this.getServiceNameFromConfig(serviceConfig),
        row: serviceConfig.row,
        category: serviceConfig.category,
        isSpecial: isSpecialService(this.getServiceNameFromConfig(serviceConfig))
      };

      // Validate unit compatibility
      const unitCompatible = this.validateUnitCompatibility(service.unit, serviceConfig.unit);
      if (!unitCompatible) {
        confidence *= 0.8; // Reduce confidence for unit mismatches
      }

      return { mapped, confidence };
    }

    return { mapped: null, confidence: 0 };
  }

  /**
   * Get service name from config (handle the key lookup)
   */
  private getServiceNameFromConfig(config: ServiceConfig): string {
    // Find the service name key that maps to this config
    for (const [serviceName, serviceConfig] of Object.entries(SERVICE_DATABASE)) {
      if (serviceConfig.row === config.row) {
        return serviceName;
      }
    }
    return 'Unknown Service';
  }

  /**
   * Find fuzzy matches for service names
   */
  private findFuzzyMatch(serviceName: string): { serviceName: string; confidence: number } | null {
    const name = serviceName.toLowerCase();
    let bestMatch: { serviceName: string; confidence: number } | null = null;

    // Check all service synonyms for partial matches
    for (const [dbServiceName, synonyms] of Object.entries(SERVICE_SYNONYMS)) {
      for (const synonym of synonyms) {
        const similarity = this.calculateStringSimilarity(name, synonym.toLowerCase());
        
        if (similarity > 0.7) {
          if (!bestMatch || similarity > bestMatch.confidence) {
            bestMatch = {
              serviceName: dbServiceName,
              confidence: similarity * 0.8 // Reduce confidence for fuzzy matches
            };
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Validate that service unit is compatible with database unit
   */
  private validateUnitCompatibility(serviceUnit: string, dbUnit: string): boolean {
    if (!serviceUnit || !dbUnit) return true; // Allow if either is missing

    const normalizedServiceUnit = this.normalizeUnit(serviceUnit);
    const normalizedDbUnit = this.normalizeUnit(dbUnit);

    if (normalizedServiceUnit === normalizedDbUnit) return true;

    // Check compatibility mappings
    const compatibilityMap: Record<string, string[]> = {
      'sqft': ['square_feet', 'sq_ft', 'sqft'],
      'linear_feet': ['feet', 'ft', 'linear_feet', 'lin_ft'],
      'cubic_yards': ['yards', 'yard', 'cubic_yards', 'cu_yd'],
      'each': ['each', 'pieces', 'units'],
      'zone': ['zones', 'spouts'],
      'setup': ['setup', 'installation']
    };

    const compatibleUnits = compatibilityMap[normalizedDbUnit] || [];
    return compatibleUnits.includes(normalizedServiceUnit);
  }

  /**
   * Normalize unit for comparison
   */
  private normalizeUnit(unit: string): string {
    return unit.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z_]/g, '');
  }

  /**
   * Create the final mapping result
   */
  private createMappingResult(
    mappingResults: Array<{ service: ValidatedService; mapped: MappedService | null; confidence: number }>,
    originalServices: ValidatedService[]
  ): MappingResult {
    
    const mappedServices: MappedService[] = [];
    const unmappedServices: ValidatedService[] = [];
    const specialServices: MappedService[] = [];
    let totalConfidence = 0;
    let mappedCount = 0;

    for (const result of mappingResults) {
      if (result.mapped) {
        mappedServices.push(result.mapped);
        totalConfidence += result.confidence;
        mappedCount++;

        if (result.mapped.isSpecial) {
          specialServices.push(result.mapped);
        }
      } else {
        unmappedServices.push(result.service);
      }
    }

    const mappingConfidence = mappedCount > 0 ? totalConfidence / mappedCount : 0;

    return {
      mappedServices,
      unmappedServices,
      specialServices,
      mappingConfidence
    };
  }

  /**
   * Get mapping suggestions for unmapped services
   */
  getSuggestions(unmappedService: ValidatedService): string[] {
    const suggestions: string[] = [];
    const serviceName = unmappedService.name.toLowerCase();

    // Find similar services in database
    for (const [dbServiceName, synonyms] of Object.entries(SERVICE_SYNONYMS)) {
      for (const synonym of synonyms) {
        if (synonym.toLowerCase().includes(serviceName) || 
            serviceName.includes(synonym.toLowerCase())) {
          suggestions.push(dbServiceName);
          break;
        }
      }
    }

    // Remove duplicates and return top suggestions
    return Array.from(new Set(suggestions)).slice(0, 5);
  }

  /**
   * Validate mapping results against business rules
   */
  private validateMappingResults(mappedServices: MappedService[]): string[] {
    const warnings: string[] = [];

    // Check for duplicate services
    const serviceNames = mappedServices.map(s => s.serviceName);
    const duplicates = serviceNames.filter((name, index) => serviceNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      warnings.push(`Duplicate services detected: ${Array.from(new Set(duplicates)).join(', ')}`);
    }

    // Check for invalid row numbers
    for (const service of mappedServices) {
      if (service.row < 2 || service.row > 33) {
        warnings.push(`Invalid row number for ${service.serviceName}: ${service.row}`);
      }
    }

    // Check for special service combinations
    const hasIrrigationSetup = mappedServices.some(s => s.serviceName.includes('Irrigation Set Up'));
    const hasIrrigationZones = mappedServices.some(s => s.serviceName.includes('Irrigation (per zone)'));
    
    if (hasIrrigationZones && !hasIrrigationSetup) {
      warnings.push('Irrigation zones detected without setup cost - setup will be automatically added');
    }

    return warnings;
  }

  /**
   * Auto-correct common mapping issues
   */
  private autoCorrectMappings(mappedServices: MappedService[]): MappedService[] {
    const corrected = [...mappedServices];

    // Auto-add irrigation setup if zones are present but setup is missing
    const hasIrrigationSetup = corrected.some(s => s.serviceName.includes('Irrigation Set Up'));
    const hasIrrigationZones = corrected.some(s => s.serviceName.includes('Irrigation (per zone)'));
    
    if (hasIrrigationZones && !hasIrrigationSetup) {
      const setupService: MappedService = {
        name: 'Irrigation Set Up Cost',
        quantity: 1,
        unit: 'setup',
        confidence: 0.9,
        originalText: 'Auto-added irrigation setup',
        isComplete: true,
        missingInfo: [],
        questions: [],
        serviceName: 'Irrigation Set Up Cost',
        row: 15, // From service database
        category: 'irrigation',
        isSpecial: true
      };
      
      corrected.unshift(setupService); // Add at beginning
    }

    return corrected;
  }
}