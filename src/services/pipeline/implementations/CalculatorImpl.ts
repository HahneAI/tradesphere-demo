/**
 * CalculatorImpl - Price Calculation Implementation
 * 
 * Calculates costs using Google Sheets integration or mock data
 * Handles single and multi-service quotes with project totals
 */

import {
  IPriceCalculator,
  StepResult,
  MappingResult,
  PricingResult,
  MappedService,
  PricedService
} from '../interfaces';
// Import Google Sheets client conditionally to avoid dependency issues
let GoogleSheetsClient: any = null;
let getSheetsClient: any = null;

try {
  const sheetsModule = require('../../../utils/google-sheets-client');
  GoogleSheetsClient = sheetsModule.GoogleSheetsClient;
  getSheetsClient = sheetsModule.getSheetsClient;
} catch (error) {
  console.warn('Google Sheets client not available - using mock mode only');
}

export class CalculatorImpl implements IPriceCalculator {
  private sheetsClient: GoogleSheetsClient;
  private useGoogleSheets: boolean;

  constructor(useGoogleSheets: boolean = true) {
    this.useGoogleSheets = useGoogleSheets && getSheetsClient !== null;
    if (this.useGoogleSheets) {
      try {
        this.sheetsClient = getSheetsClient();
      } catch (error) {
        console.warn('Failed to initialize Google Sheets client, falling back to mock mode');
        this.useGoogleSheets = false;
      }
    }
  }

  async calculate(mapped: MappingResult): Promise<StepResult<PricingResult>> {
    const startTime = Date.now();

    try {
      // Validate inputs
      this.validateMappedServices(mapped.mappedServices);

      // Handle special service processing
      const processedServices = this.processSpecialServices(mapped.mappedServices);
      
      // Calculate pricing based on service count and data source
      let pricingResult: PricingResult;
      
      if (this.useGoogleSheets) {
        pricingResult = await this.calculateWithGoogleSheets(processedServices);
      } else {
        pricingResult = this.calculateWithMockData(processedServices);
      }

      return {
        success: true,
        data: pricingResult,
        debug: {
          step: 'calculation',
          processingTime: Date.now() - startTime,
          intermediateOutput: {
            servicesCalculated: pricingResult.services.length,
            totalCost: pricingResult.totals.totalCost,
            totalHours: pricingResult.totals.totalLaborHours,
            calculationMethod: this.useGoogleSheets ? 'Google Sheets' : 'Mock Data',
            specialCalculations: Object.keys(pricingResult.specialCalculations || {}).length
          },
          info: [
            `Calculated pricing for ${pricingResult.services.length} services`,
            `Total cost: $${pricingResult.totals.totalCost.toFixed(2)}`,
            `Total labor: ${pricingResult.totals.totalLaborHours.toFixed(1)} hours`,
            `Method: ${this.useGoogleSheets ? 'Google Sheets API' : 'Mock Data'}`
          ]
        }
      };

    } catch (error) {
      return {
        success: false,
        data: {
          services: [],
          totals: {
            totalCost: 0,
            totalLaborHours: 0,
            serviceCount: 0
          },
          calculationTime: Date.now() - startTime,
          specialCalculations: {}
        },
        debug: {
          step: 'calculation',
          processingTime: Date.now() - startTime,
          intermediateOutput: null,
          warnings: [`Calculation failed: ${error.message}`]
        },
        error: error.message
      };
    }
  }

  /**
   * Calculate with Google Sheets API
   */
  private async calculateWithGoogleSheets(services: MappedService[]): Promise<PricingResult> {
    const calculationStart = Date.now();
    const pricedServices: PricedService[] = [];

    if (services.length === 1) {
      // Single service calculation
      const service = services[0];
      const sheetResult = await this.sheetsClient.calculateSingleService(
        service.row,
        service.quantity,
        service.serviceName
      );

      const pricedService: PricedService = {
        ...service,
        unitCost: sheetResult.cost / service.quantity,
        totalCost: sheetResult.cost,
        laborHours: sheetResult.laborHours
      };

      pricedServices.push(pricedService);

    } else {
      // Multi-service calculation
      const sheetsServices = services.map(service => ({
        row: service.row,
        quantity: service.quantity,
        name: service.serviceName
      }));

      const sheetsResult = await this.sheetsClient.calculateMultipleServices(sheetsServices);

      for (let i = 0; i < services.length; i++) {
        const service = services[i];
        const sheetService = sheetsResult.services[i];

        const pricedService: PricedService = {
          ...service,
          unitCost: sheetService.cost / service.quantity,
          totalCost: sheetService.cost,
          laborHours: sheetService.laborHours
        };

        pricedServices.push(pricedService);
      }
    }

    // Calculate totals
    const totals = this.calculateTotals(pricedServices);
    
    // Handle special calculations
    const specialCalculations = this.calculateSpecialServices(pricedServices);

    return {
      services: pricedServices,
      totals,
      calculationTime: Date.now() - calculationStart,
      specialCalculations
    };
  }

  /**
   * Calculate with mock data for testing
   */
  private calculateWithMockData(services: MappedService[]): Promise<PricingResult> {
    const calculationStart = Date.now();
    const pricedServices: PricedService[] = [];

    for (const service of services) {
      const mockPricing = this.getMockPricing(service);
      
      const pricedService: PricedService = {
        ...service,
        unitCost: mockPricing.unitCost,
        totalCost: mockPricing.unitCost * service.quantity,
        laborHours: mockPricing.laborHoursPerUnit * service.quantity
      };

      pricedServices.push(pricedService);
    }

    // Calculate totals
    const totals = this.calculateTotals(pricedServices);
    
    // Handle special calculations
    const specialCalculations = this.calculateSpecialServices(pricedServices);

    return Promise.resolve({
      services: pricedServices,
      totals,
      calculationTime: Date.now() - calculationStart,
      specialCalculations
    });
  }

  /**
   * Get mock pricing for a service
   */
  private getMockPricing(service: MappedService): { unitCost: number; laborHoursPerUnit: number } {
    const serviceName = service.serviceName.toLowerCase();

    // Mock pricing based on service type
    if (serviceName.includes('triple ground mulch')) {
      return { unitCost: 1.25, laborHoursPerUnit: 0.05 }; // $1.25/sqft, 3min per sqft
    }
    
    if (serviceName.includes('metal edging')) {
      return { unitCost: 8.50, laborHoursPerUnit: 0.75 }; // $8.50/ft, 45min per ft
    }
    
    if (serviceName.includes('paver patio')) {
      return { unitCost: 15.75, laborHoursPerUnit: 0.25 }; // $15.75/sqft, 15min per sqft
    }
    
    if (serviceName.includes('irrigation set up')) {
      return { unitCost: 350.00, laborHoursPerUnit: 4.0 }; // $350 setup, 4 hours
    }
    
    if (serviceName.includes('irrigation (per zone)')) {
      return { unitCost: 225.00, laborHoursPerUnit: 2.5 }; // $225/zone, 2.5 hours
    }
    
    if (serviceName.includes('retaining wall')) {
      return { unitCost: 45.00, laborHoursPerUnit: 1.5 }; // $45/ft, 1.5 hours per ft
    }
    
    if (serviceName.includes('sod')) {
      return { unitCost: 2.80, laborHoursPerUnit: 0.08 }; // $2.80/sqft, ~5min per sqft
    }
    
    if (serviceName.includes('tree')) {
      return { unitCost: 125.00, laborHoursPerUnit: 1.0 }; // $125/tree, 1 hour per tree
    }
    
    if (serviceName.includes('shrub')) {
      return { unitCost: 65.00, laborHoursPerUnit: 0.5 }; // $65/shrub, 30min per shrub
    }

    // Default pricing for unknown services
    return { unitCost: 5.00, laborHoursPerUnit: 0.25 };
  }

  /**
   * Process special services (irrigation, lighting)
   */
  private processSpecialServices(services: MappedService[]): MappedService[] {
    const processed = [...services];

    // Handle irrigation special processing
    const irrigationServices = this.processIrrigationServices(processed);
    
    return irrigationServices;
  }

  /**
   * Process irrigation services with special requirements
   */
  private processIrrigationServices(services: MappedService[]): MappedService[] {
    const result = [...services];
    
    // Find irrigation services
    const setupService = result.find(s => s.serviceName.includes('Irrigation Set Up'));
    const zoneServices = result.filter(s => s.serviceName.includes('Irrigation (per zone)'));

    // Ensure setup is included if zones are present
    if (zoneServices.length > 0 && !setupService) {
      const autoSetup: MappedService = {
        name: 'Irrigation Set Up Cost',
        quantity: 1,
        unit: 'setup',
        confidence: 0.9,
        originalText: 'Auto-added for irrigation zones',
        isComplete: true,
        missingInfo: [],
        questions: [],
        serviceName: 'Irrigation Set Up Cost',
        row: 15,
        category: 'irrigation',
        isSpecial: true
      };

      result.unshift(autoSetup); // Add at beginning
    }

    return result;
  }

  /**
   * Calculate project totals
   */
  private calculateTotals(services: PricedService[]): {
    totalCost: number;
    totalLaborHours: number;
    serviceCount: number;
  } {
    const totalCost = services.reduce((sum, service) => sum + service.totalCost, 0);
    const totalLaborHours = services.reduce((sum, service) => sum + service.laborHours, 0);
    
    return {
      totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
      totalLaborHours: Math.round(totalLaborHours * 10) / 10, // Round to 1 decimal place
      serviceCount: services.length
    };
  }

  /**
   * Calculate special service details
   */
  private calculateSpecialServices(services: PricedService[]): any {
    const specialCalculations: any = {};

    // Irrigation calculations
    const irrigationServices = services.filter(s => s.serviceName.includes('Irrigation'));
    if (irrigationServices.length > 0) {
      const setupService = irrigationServices.find(s => s.serviceName.includes('Set Up'));
      const zoneServices = irrigationServices.filter(s => s.serviceName.includes('per zone'));
      
      specialCalculations.irrigation = {
        setupCost: setupService?.totalCost || 0,
        zoneCost: zoneServices.reduce((sum, s) => sum + s.totalCost, 0),
        boringRequired: false // Would be determined from original requirements
      };
    }

    return specialCalculations;
  }

  /**
   * Validate mapped services before calculation
   */
  private validateMappedServices(services: MappedService[]): void {
    if (!services || services.length === 0) {
      throw new Error('No mapped services provided for calculation');
    }

    for (const service of services) {
      if (!service.serviceName) {
        throw new Error('Service name is required for calculation');
      }
      
      if (!service.row || service.row < 2 || service.row > 33) {
        throw new Error(`Invalid row number for ${service.serviceName}: ${service.row}`);
      }
      
      if (!service.quantity || service.quantity <= 0) {
        throw new Error(`Invalid quantity for ${service.serviceName}: ${service.quantity}`);
      }
    }
  }

  /**
   * Format pricing for display
   */
  formatPricingResult(result: PricingResult): string {
    if (result.services.length === 0) {
      return 'No pricing information available for the requested services.';
    }

    let response = '';

    if (result.services.length === 1) {
      // Single service response
      const service = result.services[0];
      response = `${service.serviceName}: ${service.quantity} ${service.unit}\n`;
      response += `Cost: $${service.totalCost.toFixed(2)}\n`;
      response += `Labor Hours: ${service.laborHours.toFixed(1)}h`;
    } else {
      // Multi-service response
      response = 'PROJECT BREAKDOWN:\n\n';
      
      result.services.forEach(service => {
        response += `${service.serviceName}:\n`;
        response += `  Quantity: ${service.quantity} ${service.unit}\n`;
        response += `  Cost: $${service.totalCost.toFixed(2)}\n`;
        response += `  Labor: ${service.laborHours.toFixed(1)}h\n\n`;
      });
      
      response += `TOTAL PROJECT COST: $${result.totals.totalCost.toFixed(2)}\n`;
      response += `TOTAL LABOR HOURS: ${result.totals.totalLaborHours.toFixed(1)}h`;
    }

    return response;
  }

  /**
   * Health check for calculator
   */
  async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Test with mock data first
      const mockService: MappedService = {
        name: 'Triple Ground Mulch',
        quantity: 100,
        unit: 'sqft',
        confidence: 0.95,
        originalText: 'health check test',
        isComplete: true,
        missingInfo: [],
        questions: [],
        serviceName: 'Triple Ground Mulch (SQFT)',
        row: 23,
        category: 'materials',
        isSpecial: false
      };

      const mockResult = this.calculateWithMockData([mockService]);
      const result = await mockResult;
      
      if (result.totals.totalCost <= 0) {
        issues.push('Mock calculation returned zero cost');
      }

      // Test Google Sheets if enabled
      if (this.useGoogleSheets) {
        try {
          // Would test actual Google Sheets connection here
          // For now, just validate client exists
          if (!this.sheetsClient) {
            issues.push('Google Sheets client not initialized');
          }
        } catch (error) {
          issues.push(`Google Sheets connection issue: ${error.message}`);
        }
      }

    } catch (error) {
      issues.push(`Health check failed: ${error.message}`);
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }
}