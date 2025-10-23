/**
 * MockImplementations - Complete Mock Pipeline for Testing
 * 
 * Provides predictable mock implementations for all pipeline steps
 * Perfect for unit testing, development, and debugging without API dependencies
 */

import {
  IServiceDetector,
  ICompletenessChecker,
  IServiceMapper,
  IPriceCalculator,
  StepResult,
  DetectionResult,
  ValidationResult,
  MappingResult,
  PricingResult,
  RawService,
  ValidatedService,
  MappedService,
  PricedService,
  MockDataProvider
} from '../interfaces';
import { ServiceMappingEngine } from '../../ai-engine/ServiceMappingEngine';

// ===============================
// MOCK DATA PROVIDER
// ===============================

export class MockDataProvider implements MockDataProvider {
  
  getDetectionMockData(input: string): DetectionResult {
    const lowerInput = input.toLowerCase();
    
    // Multi-service: "45 sq ft triple ground mulch and 3 feet metal edging"
    if (lowerInput.includes('45') && lowerInput.includes('mulch') && lowerInput.includes('edging')) {
      return {
        services: [
          {
            name: 'Triple Ground Mulch',
            quantity: 45,
            unit: 'sqft',
            confidence: 0.95,
            originalText: '45 sq ft triple ground mulch'
          },
          {
            name: 'Metal Edging',
            quantity: 3,
            unit: 'linear_feet',
            confidence: 0.92,
            originalText: '3 feet metal edging'
          }
        ],
        unmappedText: [],
        inputAnalysis: {
          hasMultipleServices: true,
          hasQuantities: true,
          hasUnits: true,
          overallConfidence: 0.94
        }
      };
    }
    
    // Simple: "100 square feet of mulch"
    if (lowerInput.includes('100') && lowerInput.includes('mulch')) {
      return {
        services: [
          {
            name: 'Triple Ground Mulch',
            quantity: 100,
            unit: 'sqft',
            confidence: 0.92,
            originalText: '100 square feet of mulch'
          }
        ],
        unmappedText: [],
        inputAnalysis: {
          hasMultipleServices: false,
          hasQuantities: true,
          hasUnits: true,
          overallConfidence: 0.92
        }
      };
    }
    
    // Irrigation: "irrigation setup with 2 turf zones"
    if (lowerInput.includes('irrigation') && lowerInput.includes('zones')) {
      return {
        services: [
          {
            name: 'Irrigation Set Up Cost',
            quantity: 1,
            unit: 'setup',
            confidence: 0.90,
            originalText: 'irrigation setup'
          },
          {
            name: 'Irrigation (per zone)',
            quantity: 2,
            unit: 'zones',
            confidence: 0.88,
            originalText: '2 turf zones'
          }
        ],
        unmappedText: ['turf'],
        inputAnalysis: {
          hasMultipleServices: true,
          hasQuantities: true,
          hasUnits: true,
          overallConfidence: 0.89
        }
      };
    }
    
    // Default case - minimal service detection
    return {
      services: [
        {
          name: 'General Service',
          quantity: 1,
          unit: 'each',
          confidence: 0.60,
          originalText: input
        }
      ],
      unmappedText: input.split(' ').slice(1),
      inputAnalysis: {
        hasMultipleServices: false,
        hasQuantities: false,
        hasUnits: false,
        overallConfidence: 0.60
      }
    };
  }

  getValidationMockData(detected: DetectionResult): ValidationResult {
    const completeServices: ValidatedService[] = [];
    const incompleteServices: ValidatedService[] = [];
    
    for (const service of detected.services) {
      const validated: ValidatedService = {
        ...service,
        isComplete: service.confidence > 0.8 && service.quantity > 0,
        missingInfo: service.confidence <= 0.8 ? ['Service clarity'] : [],
        questions: service.confidence <= 0.8 ? [`Did you mean "${service.name}"?`] : []
      };
      
      if (validated.isComplete) {
        completeServices.push(validated);
      } else {
        incompleteServices.push(validated);
      }
    }
    
    const allQuestions = incompleteServices.reduce((q: string[], s) => q.concat(s.questions), []);
    
    return {
      completeServices,
      incompleteServices,
      clarificationQuestions: Array.from(new Set(allQuestions)),
      needsClarification: incompleteServices.length > 0,
      readyForMapping: completeServices.length > 0
    };
  }

  getMappingMockData(validated: ValidationResult): MappingResult {
    const mappedServices: MappedService[] = [];
    const unmappedServices: ValidatedService[] = [];
    const specialServices: MappedService[] = [];
    
    for (const service of validated.completeServices) {
      const mapped = this.mapServiceToDatabase(service);
      
      if (mapped) {
        mappedServices.push(mapped);
        if (mapped.isSpecial) {
          specialServices.push(mapped);
        }
      } else {
        unmappedServices.push(service);
      }
    }
    
    return {
      mappedServices,
      unmappedServices,
      specialServices,
      mappingConfidence: mappedServices.length / (mappedServices.length + unmappedServices.length)
    };
  }

  getPricingMockData(mapped: MappingResult): PricingResult {
    const pricedServices: PricedService[] = [];
    let totalCost = 0;
    let totalLaborHours = 0;
    
    for (const service of mapped.mappedServices) {
      const pricing = this.getMockServicePricing(service.serviceName);
      
      const priced: PricedService = {
        ...service,
        unitCost: pricing.unitCost,
        totalCost: pricing.unitCost * service.quantity,
        laborHours: pricing.laborHoursPerUnit * service.quantity
      };
      
      pricedServices.push(priced);
      totalCost += priced.totalCost;
      totalLaborHours += priced.laborHours;
    }
    
    return {
      services: pricedServices,
      totals: {
        totalCost: Math.round(totalCost * 100) / 100,
        totalLaborHours: Math.round(totalLaborHours * 10) / 10,
        serviceCount: pricedServices.length
      },
      calculationTime: Math.random() * 200 + 100, // 100-300ms
      specialCalculations: this.getSpecialCalculations(pricedServices)
    };
  }

  private mapServiceToDatabase(service: ValidatedService): MappedService | null {
    // USE REAL SERVICE DATABASE LOOKUP - NOT HARDCODED PATTERNS
    const { getServiceByName, isSpecialService } = require('../../../config/service-database');
    
    try {
      // Try exact match first
      const exactConfig = getServiceByName(service.name);
      if (exactConfig) {
        return {
          ...service,
          serviceName: service.name,
          row: exactConfig.row,
          category: exactConfig.category,
          isSpecial: isSpecialService(service.name)
        };
      }
      
      // If no exact match, the ServiceMappingEngine should have already resolved this
      // But let's check common variations to be safe
      const variations = [
        service.name,
        service.name + ' (SQFT)',
        service.name + ' (LNFT)',
        service.name.replace('Triple Ground Mulch', 'Triple Ground Mulch (SQFT)'),
        service.name.replace('Metal Edging', 'Metal Edging')
      ];
      
      for (const variation of variations) {
        const config = getServiceByName(variation);
        if (config) {
          return {
            ...service,
            serviceName: variation,
            row: config.row,
            category: config.category,
            isSpecial: isSpecialService(variation)
          };
        }
      }
      
      console.warn(`⚠️ No database mapping found for service: "${service.name}"`);
      return null;
      
    } catch (error) {
      console.error(`❌ Service mapping failed for "${service.name}":`, error);
      return null;
    }
  }

  private getMockServicePricing(serviceName: string): { unitCost: number; laborHoursPerUnit: number } {
    // REAL PRICING LOGIC - Based on actual TradeSphere rates from Make.com system
    // These are the real unit costs and labor rates used in production
    
    const REAL_PRICING_TABLE: Record<string, { unitCost: number; laborHoursPerUnit: number }> = {
      // MATERIALS
      'Triple Ground Mulch (SQFT)': { unitCost: 1.25, laborHoursPerUnit: 0.05 },
      'Iowa Rainbow Rock Bed (sqft)': { unitCost: 2.50, laborHoursPerUnit: 0.08 },
      'Topsoil (CUYD)': { unitCost: 45.00, laborHoursPerUnit: 0.75 },
      
      // EDGING
      'Metal Edging': { unitCost: 8.50, laborHoursPerUnit: 0.75 },
      'Stone Edgers Tumbled': { unitCost: 12.00, laborHoursPerUnit: 0.80 },
      'Spade Edging': { unitCost: 2.25, laborHoursPerUnit: 0.25 },
      
      // HARDSCAPE
      'Paver Patio (SQFT)': { unitCost: 15.75, laborHoursPerUnit: 0.25 },
      '3\' Retaining wall (LNFT X SQFT)': { unitCost: 85.00, laborHoursPerUnit: 1.5 },
      '5\' Retaining Wall (LNFTXSQFT)': { unitCost: 125.00, laborHoursPerUnit: 2.0 },
      '2\' Garden Walls (LNFTXSQFT)': { unitCost: 45.00, laborHoursPerUnit: 0.8 },
      
      // IRRIGATION - SPECIAL PRICING
      'Irrigation Set Up Cost': { unitCost: 350.00, laborHoursPerUnit: 4.0 },
      'Irrigation (per zone)': { unitCost: 225.00, laborHoursPerUnit: 2.5 },
      
      // DRAINAGE
      'Buried Downspout (EACH)': { unitCost: 125.00, laborHoursPerUnit: 2.0 },
      'Dry Creek with plants (sqft)': { unitCost: 18.50, laborHoursPerUnit: 0.35 },
      'Drainage Burying (LNFT)': { unitCost: 15.00, laborHoursPerUnit: 0.45 },
      
      // PLANTING
      'Sod Install (1 pallatte-450sqft)': { unitCost: 285.00, laborHoursPerUnit: 3.5 },
      'Seed/Straw (SQFT)': { unitCost: 0.85, laborHoursPerUnit: 0.02 },
      'Medium Shrub (2-3 gal)': { unitCost: 45.00, laborHoursPerUnit: 0.5 },
      'Large Shrub (5-10 gal)': { unitCost: 85.00, laborHoursPerUnit: 1.0 },
      'Small Tree (<2in Caliper)': { unitCost: 125.00, laborHoursPerUnit: 1.5 },
      'Medium Tree (2.25-4in Caliper)': { unitCost: 285.00, laborHoursPerUnit: 2.5 },
      'Large Tree (4.25-8in Caliper)': { unitCost: 485.00, laborHoursPerUnit: 4.0 }
    };
    
    // Look up exact pricing from real table
    const pricing = REAL_PRICING_TABLE[serviceName];
    if (pricing) {
      return pricing;
    }
    
    // Try without suffixes for name variations
    const baseName = serviceName.replace(/\s*\(.*?\)\s*$/, '');
    const basePricing = REAL_PRICING_TABLE[baseName];
    if (basePricing) {
      return basePricing;
    }
    
    // Fallback: estimate based on service category
    const { getServiceByName } = require('../../../config/service-database');
    const serviceConfig = getServiceByName(serviceName);
    
    if (serviceConfig) {
      switch (serviceConfig.category) {
        case 'materials': return { unitCost: 2.00, laborHoursPerUnit: 0.05 };
        case 'hardscape': return { unitCost: 25.00, laborHoursPerUnit: 0.75 };
        case 'irrigation': return { unitCost: 200.00, laborHoursPerUnit: 2.0 };
        case 'planting': return { unitCost: 15.00, laborHoursPerUnit: 0.5 };
        case 'edging': return { unitCost: 8.00, laborHoursPerUnit: 0.6 };
        case 'drainage': return { unitCost: 20.00, laborHoursPerUnit: 0.8 };
        default: return { unitCost: 10.00, laborHoursPerUnit: 0.5 };
      }
    }
    
    // Last resort fallback
    console.warn(`⚠️ No pricing data for service: "${serviceName}", using default`);
    return { unitCost: 10.00, laborHoursPerUnit: 0.5 };
  }

  private getSpecialCalculations(services: PricedService[]): any {
    const calculations: any = {};
    
    const irrigationServices = services.filter(s => s.category === 'irrigation');
    if (irrigationServices.length > 0) {
      const setup = irrigationServices.find(s => s.serviceName.includes('Set Up'));
      const zones = irrigationServices.filter(s => s.serviceName.includes('zone'));
      
      calculations.irrigation = {
        setupCost: setup?.totalCost || 0,
        zoneCost: zones.reduce((sum, s) => sum + s.totalCost, 0),
        boringRequired: false
      };
    }
    
    return calculations;
  }
}

// ===============================
// MOCK IMPLEMENTATIONS
// ===============================

export class MockDetector implements IServiceDetector {
  
  detect(input: string): StepResult<DetectionResult> {
    const startTime = Date.now();
    
    try {
      // USE REAL SERVICE MAPPING ENGINE - NOT HARDCODED PATTERNS
      const mappingResult = ServiceMappingEngine.mapUserInput(input);
      
      // Convert ServiceMappingEngine results to DetectionResult format
      const services: RawService[] = mappingResult.services.map((service: any) => ({
        name: service.serviceName,
        quantity: service.quantity,
        unit: service.unit,
        confidence: service.confidence,
        originalText: service.originalText
      }));

      const data: DetectionResult = {
        services,
        unmappedText: mappingResult.unmappedText,
        inputAnalysis: {
          hasMultipleServices: services.length > 1,
          hasQuantities: services.every(s => s.quantity > 0),
          hasUnits: services.every(s => s.unit && s.unit.length > 0),
          overallConfidence: mappingResult.confidence
        }
      };
      
      return {
        success: true,
        data,
        debug: {
          step: 'detection',
          processingTime: Date.now() - startTime,
          intermediateOutput: {
            realNLPUsed: true,
            originalInput: input,
            servicesDetected: services.length,
            confidence: data.inputAnalysis.overallConfidence,
            engineType: 'ServiceMappingEngine'
          },
          info: [
            `REAL NLP detected ${services.length} services`,
            `Confidence: ${(data.inputAnalysis.overallConfidence * 100).toFixed(0)}%`,
            `Services: ${services.map(s => `${s.name}(${s.quantity})`).join(', ')}`
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
          warnings: [`Real NLP detection failed: ${error.message}`]
        },
        error: error.message
      };
    }
  }
}

export class MockChecker implements ICompletenessChecker {
  private mockData = new MockDataProvider();

  check(detected: DetectionResult): StepResult<ValidationResult> {
    const startTime = Date.now();
    
    try {
      const data = this.mockData.getValidationMockData(detected);
      
      return {
        success: true,
        data,
        debug: {
          step: 'validation',
          processingTime: Date.now() - startTime,
          intermediateOutput: {
            inputServices: detected.services.length,
            completeServices: data.completeServices.length,
            incompleteServices: data.incompleteServices.length,
            needsClarification: data.needsClarification
          },
          info: [`Mock validation: ${data.completeServices.length} complete, ${data.incompleteServices.length} incomplete`]
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
          warnings: [`Mock validation failed: ${error.message}`]
        },
        error: error.message
      };
    }
  }
}

export class MockMapper implements IServiceMapper {
  private mockData = new MockDataProvider();

  map(validated: ValidationResult): StepResult<MappingResult> {
    const startTime = Date.now();
    
    try {
      const data = this.mockData.getMappingMockData(validated);
      
      return {
        success: true,
        data,
        debug: {
          step: 'mapping',
          processingTime: Date.now() - startTime,
          intermediateOutput: {
            inputServices: validated.completeServices.length,
            mappedServices: data.mappedServices.length,
            unmappedServices: data.unmappedServices.length,
            mappingConfidence: data.mappingConfidence
          },
          info: [`Mock mapping: ${data.mappedServices.length} mapped, ${data.unmappedServices.length} unmapped`]
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
          warnings: [`Mock mapping failed: ${error.message}`]
        },
        error: error.message
      };
    }
  }
}

export class MockCalculator implements IPriceCalculator {
  private mockData = new MockDataProvider();

  async calculate(mapped: MappingResult): Promise<StepResult<PricingResult>> {
    const startTime = Date.now();
    
    try {
      const data = this.mockData.getPricingMockData(mapped);
      
      return {
        success: true,
        data,
        debug: {
          step: 'calculation',
          processingTime: Date.now() - startTime,
          intermediateOutput: {
            inputServices: mapped.mappedServices.length,
            calculatedServices: data.services.length,
            totalCost: data.totals.totalCost,
            totalHours: data.totals.totalLaborHours
          },
          info: [
            `Mock calculation: ${data.services.length} services`,
            `Total: $${data.totals.totalCost}, ${data.totals.totalLaborHours}h`
          ]
        }
      };
      
    } catch (error) {
      return {
        success: false,
        data: {
          services: [],
          totals: { totalCost: 0, totalLaborHours: 0, serviceCount: 0 },
          calculationTime: Date.now() - startTime,
          specialCalculations: {}
        },
        debug: {
          step: 'calculation',
          processingTime: Date.now() - startTime,
          intermediateOutput: null,
          warnings: [`Mock calculation failed: ${error.message}`]
        },
        error: error.message
      };
    }
  }
}

// ===============================
// MOCK FACTORY
// ===============================

export class MockFactory {
  static createMockPipeline() {
    return {
      detector: new MockDetector(),
      checker: new MockChecker(),
      mapper: new MockMapper(),
      calculator: new MockCalculator()
    };
  }
  
  static createHybridPipeline(mockSteps: string[]) {
    // Dynamic imports would be needed for ES modules, but for now return pure mock
    // This will be enhanced when we have proper ES module support
    console.warn('Hybrid pipeline not fully supported in current module system, using full mock');
    return this.createMockPipeline();
  }
}