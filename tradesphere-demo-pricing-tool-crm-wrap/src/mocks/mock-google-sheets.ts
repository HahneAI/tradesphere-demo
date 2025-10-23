/**
 * Mock Google Sheets API Client
 * 
 * Provides realistic responses matching our production Google Sheets structure.
 * Returns exact pricing data for our 2 test cases without requiring API credentials.
 */

import { GoogleSheetsClient, SheetCalculationResult, ProjectTotal } from '../utils/google-sheets-client';
import { MOCK_SHEETS_RESPONSES, MOCK_SERVICE_PRICING } from './mock-data';

export class MockGoogleSheetsClient extends GoogleSheetsClient {
  private static instance: MockGoogleSheetsClient;
  private isInitialized = false;

  constructor(spreadsheetId: string) {
    // Call parent constructor but don't actually initialize Google Sheets API
    super(spreadsheetId);
    this.isInitialized = true;
    console.log('🎭 MockGoogleSheetsClient initialized for testing');
  }

  static getInstance(spreadsheetId?: string): MockGoogleSheetsClient {
    if (!MockGoogleSheetsClient.instance) {
      MockGoogleSheetsClient.instance = new MockGoogleSheetsClient(spreadsheetId || 'mock-sheet-id');
    }
    return MockGoogleSheetsClient.instance;
  }

  /**
   * Mock single service calculation
   */
  async calculateSingleService(row: number, quantity: number, serviceName: string): Promise<SheetCalculationResult> {
    console.log(`🧮 MOCK: Calculating single service - ${serviceName} (Row ${row}): ${quantity} units`);
    
    // Add realistic delay
    await this.simulateDelay(100, 200);

    // Return mock data based on service and quantity
    if (serviceName === "Triple Ground Mulch (SQFT)") {
      const pricing = MOCK_SERVICE_PRICING["Triple Ground Mulch (SQFT)"];
      
      return {
        service: serviceName,
        laborHours: pricing.laborHours * quantity,
        cost: pricing.costPerUnit * quantity,
        row: 23
      };
    }

    if (serviceName === "Metal Edging") {
      const pricing = MOCK_SERVICE_PRICING["Metal Edging"];
      
      return {
        service: serviceName,
        laborHours: pricing.laborHours * quantity,
        cost: pricing.costPerUnit * quantity,
        row: 18
      };
    }

    throw new Error(`Mock data not available for service: ${serviceName}`);
  }

  /**
   * Mock multiple services calculation
   */
  async calculateMultipleServices(services: { row: number; quantity: number; name: string }[]): Promise<{
    services: SheetCalculationResult[];
    totals: ProjectTotal;
  }> {
    console.log(`🧮 MOCK: Calculating ${services.length} services`);
    
    // Add realistic delay
    await this.simulateDelay(150, 250);

    const results: SheetCalculationResult[] = [];
    let totalCost = 0;
    let totalLaborHours = 0;

    for (const service of services) {
      const result = await this.calculateSingleService(service.row, service.quantity, service.name);
      results.push(result);
      totalCost += result.cost;
      totalLaborHours += result.laborHours;
    }

    return {
      services: results,
      totals: {
        totalCost,
        totalLaborHours
      }
    };
  }

  /**
   * Mock writing service quantity to sheet
   */
  async writeServiceQuantity(row: number, quantity: number): Promise<void> {
    console.log(`📝 MOCK: Writing quantity ${quantity} to row ${row}`);
    await this.simulateDelay(50, 100);
    // No actual writing in mock mode
  }

  /**
   * Mock reading project totals
   */
  async readProjectTotals(): Promise<ProjectTotal> {
    console.log('📊 MOCK: Reading project totals');
    await this.simulateDelay(80, 120);

    // Return mock totals (will be calculated based on current test)
    return {
      totalCost: 0, // Will be set by calculation
      totalLaborHours: 0 // Will be set by calculation
    };
  }

  /**
   * Mock batch write operations
   */
  async batchWriteServices(updates: { row: number; quantity: number }[]): Promise<void> {
    console.log(`📝 MOCK: Batch writing ${updates.length} services`);
    await this.simulateDelay(100, 200);
    
    for (const update of updates) {
      console.log(`  - Row ${update.row}: ${update.quantity}`);
    }
  }

  /**
   * Mock clearing previous calculations
   */
  async clearCalculations(): Promise<void> {
    console.log('🧹 MOCK: Clearing previous calculations');
    await this.simulateDelay(30, 80);
  }

  /**
   * Mock test calculation for health checks
   */
  async runTestCalculation(): Promise<boolean> {
    console.log('🔍 MOCK: Running health check calculation');
    
    try {
      const testResult = await this.calculateSingleService(23, 100, "Triple Ground Mulch (SQFT)");
      const success = testResult.cost > 0 && testResult.laborHours > 0;
      
      console.log(`✅ MOCK: Health check ${success ? 'PASSED' : 'FAILED'} - Cost: $${testResult.cost}, Hours: ${testResult.laborHours}`);
      
      return success;
    } catch (error) {
      console.error('❌ MOCK: Health check failed:', error);
      return false;
    }
  }

  /**
   * Mock getting sheet configuration
   */
  async getSheetConfiguration(): Promise<{
    serviceRows: Record<string, number>;
    calculationColumns: Record<string, string>;
    totalsLocation: { cost: string; hours: string };
  }> {
    console.log('⚙️  MOCK: Getting sheet configuration');
    await this.simulateDelay(60, 100);

    return {
      serviceRows: {
        "Triple Ground Mulch (SQFT)": 23,
        "Metal Edging": 18
      },
      calculationColumns: {
        quantity: 'D',
        cost: 'F', 
        laborHours: 'G'
      },
      totalsLocation: {
        cost: 'F34',
        hours: 'G34'
      }
    };
  }

  /**
   * Mock getting price per unit for a service
   */
  async getPricePerUnit(serviceName: string): Promise<number> {
    console.log(`💰 MOCK: Getting price per unit for ${serviceName}`);
    await this.simulateDelay(40, 80);

    const pricing = MOCK_SERVICE_PRICING[serviceName];
    if (!pricing) {
      throw new Error(`No mock pricing data for service: ${serviceName}`);
    }

    return pricing.costPerUnit;
  }

  /**
   * Simulate realistic network delays
   */
  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    // Skip delays in benchmark mode
    if (process.env.BENCHMARK_MODE === 'true') {
      return;
    }

    const delay = Math.random() * (maxMs - minMs) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Mock error simulation for testing error handling
   */
  async simulateError(errorType: 'network' | 'auth' | 'quota' | 'parse'): Promise<never> {
    await this.simulateDelay(500, 1000);

    switch (errorType) {
      case 'network':
        throw new Error('MOCK: Network timeout - Could not reach Google Sheets API');
      case 'auth':
        throw new Error('MOCK: Authentication failed - Invalid credentials');
      case 'quota':
        throw new Error('MOCK: API quota exceeded - Try again later');
      case 'parse':
        throw new Error('MOCK: Failed to parse sheet response - Invalid data format');
      default:
        throw new Error('MOCK: Unknown error occurred');
    }
  }

  /**
   * Get mock performance metrics
   */
  getPerformanceMetrics(): {
    averageResponseTime: number;
    totalRequests: number;
    errorRate: number;
    cacheHitRate: number;
  } {
    return {
      averageResponseTime: 145, // Average mock delay
      totalRequests: 0, // Would track in real implementation
      errorRate: 0, // No errors in successful mock
      cacheHitRate: 1.0 // 100% cache hit (mock data is cached)
    };
  }
}