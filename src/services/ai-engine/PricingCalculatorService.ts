/**
 * PricingCalculatorService - Google Sheets integration for pricing calculations
 * 
 * Replicates Make.com's pricing_calculation module with direct Google Sheets API calls
 * Handles single and multi-service quotes with project totals
 */

import { GoogleSheetsClient, createSheetsClient, SheetCalculationResult, ProjectTotal } from '../../utils/google-sheets-client';
import { ExtractedService } from './ParameterCollectorService';

export interface PricingResult {
  services: ServiceQuote[];
  totals: ProjectTotal;
  calculationTime: number;
  success: boolean;
  error?: string;
}

export interface ServiceQuote {
  serviceName: string;
  quantity: number;
  unit: string;
  laborHours: number;
  cost: number;
  unitPrice: number;
  totalPrice: number;
  row: number;
  category: string;
}

export class PricingCalculatorService {
  private sheetsClient: GoogleSheetsClient;
  
  constructor(spreadsheetId?: string) {
    this.sheetsClient = createSheetsClient(spreadsheetId);
  }

  /**
   * Main entry point - calculate pricing for extracted services with beta code ID support
   * Replicates Make.com pricing_calculation module with multi-user sheet targeting
   */
  async calculatePricing(services: ExtractedService[], betaCodeId?: number): Promise<PricingResult> {
    const startTime = Date.now();
    
    // 📈 ENHANCED DEBUG: GOOGLE SHEETS API REQUEST
    console.log('📈 GOOGLE SHEETS API REQUEST:', {
      services: services.map(s => ({
        serviceName: s.serviceName,
        row: s.row,
        quantity: s.quantity,
        unit: s.unit
      })),
      betaCodeId: betaCodeId,
      sheetId: process.env.VITE_GOOGLE_SHEETS_SHEET_ID?.substring(0, 10) + '...',
      timestamp: new Date().toISOString()
    });
    
    console.log(`💰 PRICING CALCULATION START: ${services.length} services (Beta Code: ${betaCodeId || 'default'})`);
    services.forEach(service => {
      console.log(`  - ${service.serviceName}: ${service.quantity} ${service.unit} (row ${service.row})`);
    });

    try {
      // Validate inputs
      this.validateServices(services);
      
      // Calculate based on service count
      let result: PricingResult;
      
      if (services.length === 1) {
        result = await this.calculateSingleService(services[0], betaCodeId);
      } else {
        result = await this.calculateMultipleServices(services, betaCodeId);
      }

      const calculationTime = Date.now() - startTime;
      result.calculationTime = calculationTime;

      // 📈 ENHANCED DEBUG: GOOGLE SHEETS API RESPONSE
      console.log('📈 GOOGLE SHEETS API RESPONSE:', {
        success: result?.success !== false,
        totalCost: result?.totals?.totalCost || 'unknown',
        servicesProcessed: result?.services?.length || 0,
        calculationTime: calculationTime || 'unknown',
        errors: result?.error || 'none'
      });
      
      // 📈 ENHANCED DEBUG: DETAILED SERVICE PRICING BREAKDOWN
      if (result?.services) {
        result.services.forEach((service, index) => {
          console.log(`📈 SERVICE ${index + 1} PRICING:`, {
            serviceName: service.serviceName,
            quantity: service.quantity,
            cost: service.cost,
            laborHours: service.laborHours,
            row: service.row
          });
        });
      }
      
      console.log(`✅ PRICING COMPLETE: ${calculationTime}ms (Beta Code: ${betaCodeId || 'default'})`);
      console.log(`   Total Cost: $${result.totals.totalCost}`);
      console.log(`   Total Hours: ${result.totals.totalLaborHours}h`);

      return result;

    } catch (error) {
      console.error('❌ PRICING CALCULATION FAILED:', error);
      
      return {
        services: [],
        totals: { totalCost: 0, totalLaborHours: 0 },
        calculationTime: Date.now() - startTime,
        success: false,
        error: error.message || 'Unknown pricing calculation error'
      };
    }
  }

  /**
   * Calculate pricing for a single service with beta code ID support
   */
  private async calculateSingleService(service: ExtractedService, betaCodeId?: number): Promise<PricingResult> {
    console.log(`🔢 Single service calculation: ${service.serviceName} (Beta Code: ${betaCodeId || 'default'})`);
    
    // Step 1: Clear any existing quantities in the sheet
    await this.sheetsClient.clearQuantities(betaCodeId);
    
    // Step 2: Write the service quantity
    await this.sheetsClient.writeServiceQuantity(service.row, service.quantity, betaCodeId);
    
    // Step 3: Read the calculated results for individual service breakdown
    const sheetResults = await this.sheetsClient.readCalculationResults([service.row], betaCodeId);
    const sheetResult = sheetResults[0];

    const serviceQuote: ServiceQuote = {
      serviceName: service.serviceName,
      quantity: service.quantity,
      unit: service.unit,
      laborHours: sheetResult.laborHours,
      cost: sheetResult.cost,
      unitPrice: service.quantity > 0 ? sheetResult.cost / service.quantity : 0,
      totalPrice: sheetResult.cost,
      row: service.row,
      category: this.getServiceCategory(service.serviceName)
    };

    // Step 4: Read project totals from C34 and D34 for accurate totals
    console.log(`🔢 Reading project totals from sheet cells...`);
    const projectTotals = await this.sheetsClient.readProjectTotals(betaCodeId);

    return {
      services: [serviceQuote],
      totals: projectTotals, // Use accurate totals from C34/D34
      calculationTime: 0, // Set by caller
      success: true
    };
  }

  /**
   * Calculate pricing for multiple services with beta code ID support
   */
  private async calculateMultipleServices(services: ExtractedService[], betaCodeId?: number): Promise<PricingResult> {
    console.log(`🔢 Multi-service calculation: ${services.length} services (Beta Code: ${betaCodeId || 'default'})`);
    
    // Step 1: Clear any existing quantities in the sheet
    await this.sheetsClient.clearQuantities(betaCodeId);
    
    // Step 2: Write all service quantities
    const updates = services.map(service => ({
      row: service.row,
      quantity: service.quantity
    }));
    
    await this.sheetsClient.writeMultipleQuantities(updates, betaCodeId);
    
    // Step 3: Read all calculated results for individual service breakdown
    const rows = services.map(service => service.row);
    const sheetResults = await this.sheetsClient.readCalculationResults(rows, betaCodeId);

    // Map results back to our format for detailed breakdown
    const serviceQuotes: ServiceQuote[] = services.map((service, index) => {
      const sheetResult = sheetResults.find(r => r.row === service.row) || sheetResults[index];
      const cost = sheetResult?.cost || 0;
      
      return {
        serviceName: service.serviceName,
        quantity: service.quantity,
        unit: service.unit,
        laborHours: sheetResult?.laborHours || 0,
        cost: cost,
        unitPrice: service.quantity > 0 ? cost / service.quantity : 0,
        totalPrice: cost,
        row: service.row,
        category: this.getServiceCategory(service.serviceName)
      };
    });

    // Step 4: Read project totals from C34 and D34 for accurate totals
    console.log(`🔢 Reading project totals from sheet cells...`);
    const projectTotals = await this.sheetsClient.readProjectTotals(betaCodeId);

    return {
      services: serviceQuotes, // Individual service breakdown
      totals: projectTotals, // Accurate totals from C34/D34
      calculationTime: 0, // Set by caller
      success: true
    };
  }

  /**
   * Handle special irrigation pricing logic
   */
  async calculateIrrigationPricing(services: ExtractedService[], betaCodeId?: number): Promise<PricingResult> {
    console.log(`💧 IRRIGATION PRICING CALCULATION (Beta Code: ${betaCodeId || 'default'})`);

    const irrigationServices = services.filter(s => s.serviceName.includes('Irrigation'));
    const regularServices = services.filter(s => !s.serviceName.includes('Irrigation'));

    // Handle irrigation setup + zones
    const enhancedServices = this.processIrrigationServices(irrigationServices);
    
    // Combine with regular services
    const allServices = [...enhancedServices, ...regularServices];

    return this.calculateMultipleServices(allServices, betaCodeId);
  }

  /**
   * Process irrigation services with special requirements
   */
  private processIrrigationServices(irrigationServices: ExtractedService[]): ExtractedService[] {
    const processed: ExtractedService[] = [];

    for (const service of irrigationServices) {
      if (service.serviceName === 'Irrigation Set Up Cost') {
        // Setup is always quantity 1
        processed.push({
          ...service,
          quantity: 1
        });
      } else if (service.serviceName === 'Irrigation (per zone)') {
        // Use zone count from special requirements
        const zoneCount = service.specialRequirements?.zones?.total || service.quantity;
        processed.push({
          ...service,
          quantity: zoneCount
        });
      } else {
        processed.push(service);
      }
    }

    return processed;
  }

  /**
   * Validate services before calculation
   */
  private validateServices(services: ExtractedService[]): void {
    if (!services || services.length === 0) {
      throw new Error('No services provided for pricing calculation');
    }

    for (const service of services) {
      if (!service.serviceName) {
        throw new Error('Service name is required');
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
   * Helper to find original quantity from ExtractedService
   */
  private findOriginalQuantity(serviceName: string, services: ExtractedService[]): number {
    const original = services.find(s => s.serviceName === serviceName);
    return original?.quantity || 0;
  }

  /**
   * Helper to find original unit from ExtractedService
   */
  private findOriginalUnit(serviceName: string, services: ExtractedService[]): string {
    const original = services.find(s => s.serviceName === serviceName);
    return original?.unit || 'units';
  }

  /**
   * Get service category for display purposes
   */
  private getServiceCategory(serviceName: string): string {
    // Map common service names to categories
    const categoryMap: Record<string, string> = {
      'Paver Patio': 'hardscape',
      'Retaining wall': 'hardscape',
      'Garden Walls': 'hardscape',
      'Triple Ground Mulch': 'materials',
      'Metal Edging': 'edging',
      'Irrigation': 'irrigation',
      'Tree': 'planting',
      'Shrub': 'planting',
      'Sod': 'planting'
    };

    for (const [key, category] of Object.entries(categoryMap)) {
      if (serviceName.includes(key)) {
        return category;
      }
    }

    return 'general';
  }

  /**
   * Format pricing result for response
   */
  formatPricingResponse(result: PricingResult): string {
    if (!result.success) {
      return `I apologize, but I encountered an error calculating your pricing: ${result.error}`;
    }

    if (result.services.length === 0) {
      return 'No pricing information available for the requested services.';
    }

    let response = '';

    if (result.services.length === 1) {
      // Single service response
      const service = result.services[0];
      response = `${service.serviceName}: ${service.quantity} ${service.unit}\n`;
      response += `Cost: $${service.cost.toFixed(2)}\n`;
      response += `Labor Hours: ${service.laborHours.toFixed(1)}h`;
    } else {
      // Multi-service response
      response = 'PROJECT BREAKDOWN:\n\n';
      
      result.services.forEach(service => {
        response += `${service.serviceName}:\n`;
        response += `  Quantity: ${service.quantity} ${service.unit}\n`;
        response += `  Cost: $${service.cost.toFixed(2)}\n`;
        response += `  Labor: ${service.laborHours.toFixed(1)}h\n\n`;
      });
      
      response += `TOTAL PROJECT COST: $${result.totals.totalCost.toFixed(2)}\n`;
      response += `TOTAL LABOR HOURS: ${result.totals.totalLaborHours.toFixed(1)}h`;
    }

    return response;
  }

  /**
   * Get pricing summary for analytics
   */
  getPricingSummary(result: PricingResult): {
    serviceCount: number;
    totalCost: number;
    totalHours: number;
    categories: string[];
    calculationTime: number;
  } {
    const categories = Array.from(new Set(result.services.map(s => s.category)));
    
    return {
      serviceCount: result.services.length,
      totalCost: result.totals.totalCost,
      totalHours: result.totals.totalLaborHours,
      categories,
      calculationTime: result.calculationTime
    };
  }

  /**
   * Test the pricing calculator with known test cases
   */
  async runTestCalculation(): Promise<boolean> {
    console.log('🧪 RUNNING PRICING TEST');
    
    try {
      // Test single service calculation
      const testService: ExtractedService = {
        serviceName: 'Triple Ground Mulch (SQFT)',
        quantity: 100,
        unit: 'sqft',
        row: 23,
        isSpecial: false
      };

      const result = await this.calculatePricing([testService]);
      
      const success = result.success && result.services.length === 1 && result.totals.totalCost > 0;
      
      console.log(`✅ Test ${success ? 'PASSED' : 'FAILED'}: $${result.totals.totalCost}`);
      
      return success;
      
    } catch (error) {
      console.error('❌ Pricing test failed:', error);
      return false;
    }
  }
}

// Export factory function
export const createPricingCalculator = (spreadsheetId?: string): PricingCalculatorService => {
  return new PricingCalculatorService(spreadsheetId);
};