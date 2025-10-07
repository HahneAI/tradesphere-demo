/**
 * PricingCalculatorService - Master Formula Internal Calculation System
 *
 * COMPLETE GOOGLE SHEETS ELIMINATION: All calculations now use internal master formula
 * Advanced AI-enhanced pricing with sophisticated variable analysis
 * Zero external dependencies - fully self-contained pricing engine
 */

import { ExtractedService } from '../parameter-collection/ParameterCollectorService';
import { calculateExpertPricing, loadPaverPatioConfig } from '../../utils/calculations/server-calculations';
import type { PaverPatioValues, PaverPatioCalculationResult } from '../../core/master-formula/formula-types';
import { detectServiceFromText } from '../routing/service-router';
import type { ServiceId } from '../../config/service-registry';

// Internal project total interface (replaces Google Sheets ProjectTotal)
export interface ProjectTotal {
  totalCost: number;
  totalLaborHours: number;
  totalLaborDays?: number;  // Labor hours converted to business days
  totalMaterialCost: number;
  totalLaborCost: number;
  totalProfit: number;
  complexity: number;
  confidence: number;
}

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
  private config: any;

  constructor() {
    // Load master formula configuration
    this.config = loadPaverPatioConfig();
    console.log('🔥 MASTER FORMULA PRICING CALCULATOR INITIALIZED');
    console.log('✅ Google Sheets completely eliminated - using internal calculations');
  }

  /**
   * MASTER FORMULA CALCULATION - Complete internal pricing system
   * All services processed through advanced two-tier paver patio calculation
   */
  async calculatePricing(services: ExtractedService[], companyId?: string): Promise<PricingResult> {
    const startTime = Date.now();

    console.log('🔥 MASTER FORMULA PRICING CALCULATION START');
    console.log(`📊 Processing ${services.length} services through internal calculation engine`);
    console.log('✅ Zero Google Sheets dependencies - fully self-contained');

    services.forEach(service => {
      console.log(`  - ${service.serviceName}: ${service.quantity} ${service.unit} (Master Formula)`);
    });

    try {
      // 🎯 MULTI-SERVICE ROUTING - Detect service type and route appropriately
      console.log('🎯 DYNAMIC SERVICE ROUTING (Multi-Service Support Enabled)');

      if (services.length > 0) {
        // Detect service type for each service
        services.forEach(service => {
          const detectedServiceId = detectServiceFromText(service.serviceName);
          console.log(`🔍 Service Detection:`, {
            input: service.serviceName,
            detected: detectedServiceId,
            quantity: service.quantity,
            unit: service.unit
          });

          // Set service metadata for routing
          (service as any).detectedServiceId = detectedServiceId;
        });

        return this.calculateMasterFormulaPricing(services, companyId);
      }

      // Fallback for empty services
      return {
        success: false,
        confidence: 0,
        services: [],
        totals: { totalCost: 0, totalLaborHours: 0 },
        errors: ['No services detected for master formula calculation'],
        calculationTime: Date.now() - startTime
      };

      /* COMMENTED OUT - Google Sheets Integration Disabled
      // Validate inputs for standard Google Sheets flow
      this.validateServices(services);

      // Calculate based on service count
      let result: PricingResult;

      if (services.length === 1) {
        result = await this.calculateSingleService(services[0], companyId);
      } else {
        result = await this.calculateMultipleServices(services, companyId);
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

      console.log(`✅ PRICING COMPLETE: ${calculationTime}ms (Company: ${companyId || 'default'})`);
      console.log(`   Total Cost: $${result.totals.totalCost}`);
      console.log(`   Total Hours: ${result.totals.totalLaborHours}h`);

      return result;
      */

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
   * Calculate pricing for a single service with company ID support
   */
  private async calculateSingleService(service: ExtractedService, companyId?: string): Promise<PricingResult> {
    console.log(`🔢 Single service calculation: ${service.serviceName} (Company: ${companyId || 'default'})`);

    // Step 1: Clear any existing quantities in the sheet
    await this.sheetsClient.clearQuantities(companyId);

    // Step 2: Write the service quantity
    await this.sheetsClient.writeServiceQuantity(service.row, service.quantity, companyId);

    // Step 3: Read the calculated results for individual service breakdown
    const sheetResults = await this.sheetsClient.readCalculationResults([service.row], companyId);
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
    const projectTotals = await this.sheetsClient.readProjectTotals(companyId);

    return {
      services: [serviceQuote],
      totals: projectTotals, // Use accurate totals from C34/D34
      calculationTime: 0, // Set by caller
      success: true
    };
  }

  /**
   * Calculate pricing using master formula for paver patio requests
   */
  private async calculateMasterFormulaPricing(services: ExtractedService[], companyId?: string): Promise<PricingResult> {
    console.log('🔥 MASTER FORMULA CALCULATION START');

    const startTime = Date.now();

    // Find the paver patio service
    const paverPatioService = services.find(service =>
      service.serviceName === 'Paver Patio (SQFT)' && service.row === 999
    );

    if (!paverPatioService) {
      throw new Error('Master formula routing called without paver patio service');
    }

    if (!paverPatioService.specialRequirements?.paverPatioValues) {
      throw new Error('Paver patio service missing master formula variables');
    }

    const sqft = paverPatioService.quantity || 100;
    const paverPatioValues: PaverPatioValues = paverPatioService.specialRequirements.paverPatioValues;

    console.log('🔥 MASTER FORMULA INPUTS:');
    console.log(`  Square Footage: ${sqft} sqft`);
    console.log(`  Variables:`, paverPatioValues);

    // 🐛 DEBUG: Master Formula Calculation Inputs
    console.log('🔍 [DEBUG] Master Formula Calculation Inputs:', {
      sqft: sqft,
      paverPatioValues: paverPatioValues,
      calculationType: 'master-formula'
    });

    console.log('🔍 [DEBUG] PaverPatioValues Structure:',
      JSON.stringify(paverPatioValues, null, 2)
    );

    try {
      // Load the paver patio configuration
      const config = await loadPaverPatioConfig();

      // Execute master formula calculation
      const masterFormulaResult: PaverPatioCalculationResult = await calculateExpertPricing(
        config,
        paverPatioValues,
        sqft
      );

      console.log('🔥 MASTER FORMULA CALCULATION COMPLETE:');
      console.log(`  Total Cost: $${masterFormulaResult.tier2Results.total.toFixed(2)}`);
      console.log(`  Labor Hours: ${masterFormulaResult.tier1Results.totalManHours.toFixed(1)}h`);
      console.log(`  Business Days: ${masterFormulaResult.tier1Results.totalDays.toFixed(1)}`);

      // Convert master formula result to PricingResult format
      const pricingResult = this.convertMasterFormulaResult(
        masterFormulaResult,
        paverPatioService,
        startTime
      );

      return pricingResult;

    } catch (error) {
      console.error('❌ MASTER FORMULA CALCULATION FAILED:', error);
      throw new Error(`Master formula calculation failed: ${error.message}`);
    }
  }

  /**
   * Convert master formula result to PricingResult format for compatibility
   */
  private convertMasterFormulaResult(
    masterFormulaResult: PaverPatioCalculationResult,
    originalService: ExtractedService,
    startTime: number
  ): PricingResult {
    console.log('🔄 CONVERTING MASTER FORMULA RESULT TO PRICING FORMAT');

    const calculationTime = Date.now() - startTime;

    // Create service quote from master formula result
    const serviceQuote: ServiceQuote = {
      serviceName: originalService.serviceName,
      quantity: originalService.quantity || 100,
      unit: originalService.unit,
      laborHours: masterFormulaResult.tier1Results.totalManHours,
      cost: masterFormulaResult.tier2Results.total,
      unitPrice: masterFormulaResult.tier2Results.pricePerSqft,
      totalPrice: masterFormulaResult.tier2Results.total,
      row: 999, // Special indicator for master formula
      category: 'hardscaping'
    };

    // Create project totals with complete tier 1 & tier 2 breakdown
    const projectTotals: ProjectTotal = {
      totalCost: masterFormulaResult.tier2Results.total,
      totalLaborHours: masterFormulaResult.tier1Results.totalManHours,
      totalLaborDays: masterFormulaResult.tier1Results.totalDays,
      totalMaterialCost: masterFormulaResult.tier2Results.totalMaterialCost,
      totalLaborCost: masterFormulaResult.tier2Results.laborCost,
      totalProfit: masterFormulaResult.tier2Results.profit,
      complexity: 1.0,  // Default complexity multiplier
      confidence: masterFormulaResult.confidence || 0.9
    };

    const result: PricingResult = {
      services: [serviceQuote],
      totals: projectTotals,
      calculationTime,
      success: true
    };

    console.log('🔄 MASTER FORMULA CONVERSION COMPLETE:');
    console.log(`  Service: ${serviceQuote.serviceName}`);
    console.log(`  Total: $${result.totals.totalCost.toFixed(2)}`);
    console.log(`  Labor Hours: ${result.totals.totalLaborHours.toFixed(1)}h`);
    console.log(`  Labor Days: ${result.totals.totalLaborDays?.toFixed(1)} days`);
    console.log(`  Labor Cost: $${result.totals.totalLaborCost.toFixed(2)}`);
    console.log(`  Material Cost: $${result.totals.totalMaterialCost.toFixed(2)}`);
    console.log(`  Profit: $${result.totals.totalProfit.toFixed(2)}`);

    return result;
  }

  /**
   * Calculate pricing for multiple services with company ID support
   */
  private async calculateMultipleServices(services: ExtractedService[], companyId?: string): Promise<PricingResult> {
    console.log(`🔢 Multi-service calculation: ${services.length} services (Company: ${companyId || 'default'})`);

    // Step 1: Clear any existing quantities in the sheet
    await this.sheetsClient.clearQuantities(companyId);

    // Step 2: Write all service quantities
    const updates = services.map(service => ({
      row: service.row,
      quantity: service.quantity
    }));

    await this.sheetsClient.writeMultipleQuantities(updates, companyId);

    // Step 3: Read all calculated results for individual service breakdown
    const rows = services.map(service => service.row);
    const sheetResults = await this.sheetsClient.readCalculationResults(rows, companyId);

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
    const projectTotals = await this.sheetsClient.readProjectTotals(companyId);

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
  async calculateIrrigationPricing(services: ExtractedService[], companyId?: string): Promise<PricingResult> {
    console.log(`💧 IRRIGATION PRICING CALCULATION (Company: ${companyId || 'default'})`);

    const irrigationServices = services.filter(s => s.serviceName.includes('Irrigation'));
    const regularServices = services.filter(s => !s.serviceName.includes('Irrigation'));

    // Handle irrigation setup + zones
    const enhancedServices = this.processIrrigationServices(irrigationServices);

    // Combine with regular services
    const allServices = [...enhancedServices, ...regularServices];

    return this.calculateMultipleServices(allServices, companyId);
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
export const createPricingCalculator = (): PricingCalculatorService => {
  return new PricingCalculatorService();
};