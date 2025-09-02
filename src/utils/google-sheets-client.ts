/**
 * Google Sheets API Client for TradeSphere Pricing Calculator
 * 
 * Handles direct integration with the production Google Sheets calculator:
 * "NEW Quick Estimating Calculator - Official - Individual Projects"
 * 
 * Features:
 * - Dynamic imports for Google APIs (prevents build failures)
 * - Graceful fallback to mock mode when dependencies unavailable
 * - Environment-based configuration switching
 * - Production-ready error handling
 */

export interface SheetCalculationResult {
  laborHours: number;
  cost: number;
  row: number;
  service: string;
}

export interface ProjectTotal {
  totalLaborHours: number;
  totalCost: number;
}

// Types for dynamic imports (to avoid compile-time dependencies)
type GoogleAuth = any;
type SheetsAPI = any;

/**
 * Main Google Sheets client with dynamic import support
 */
export class GoogleSheetsClient {
  private sheets: SheetsAPI | null = null;
  private spreadsheetId: string;
  private isInitialized = false;
  private initializationFailed = false;
  
  constructor(spreadsheetId: string) {
    this.spreadsheetId = spreadsheetId;
  }

  /**
   * Initialize Google APIs with dynamic imports
   */
  private async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (this.initializationFailed) return false;

    try {
      console.log('🔌 Initializing Google Sheets API with dynamic imports...');

      // Check if we're in a browser environment
      if (typeof window !== 'undefined') {
        console.log('🌐 Browser environment detected - using mock mode');
        this.initializationFailed = true;
        return false;
      }

      // Dynamic import of Google APIs
      const { GoogleAuth } = await import('google-auth-library');
      const { google } = await import('googleapis');

      // Initialize authentication
      const auth = new GoogleAuth({
        credentials: this.getCredentials(),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      // Initialize Sheets API
      this.sheets = google.sheets({ version: 'v4', auth });
      this.isInitialized = true;
      
      console.log('✅ Google Sheets API initialized successfully');
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('⚠️ Google Sheets API initialization failed:', errorMessage);
      
      // Provide specific guidance based on error type
      if (errorMessage.includes('Cannot resolve module') || errorMessage.includes('not found')) {
        console.warn('   💡 Google API dependencies not available - using mock mode');
        console.warn('   💡 Install with: npm install google-auth-library googleapis');
      } else if (errorMessage.includes('credentials') || errorMessage.includes('service account')) {
        console.warn('   💡 Check your Google Sheets API credentials configuration');
      }

      this.initializationFailed = true;
      return false;
    }
  }

  /**
   * Get Google service account credentials from environment
   */
  private getCredentials() {
    // Check for service account JSON in environment variable
    const serviceAccountJson = import.meta.env?.VITE_GOOGLE_SERVICE_ACCOUNT_JSON || 
                              process.env.VITE_GOOGLE_SERVICE_ACCOUNT_JSON ||
                              process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      try {
        return JSON.parse(serviceAccountJson);
      } catch (error) {
        console.error('Failed to parse Google service account JSON:', error);
        throw new Error('Invalid Google service account credentials');
      }
    }

    // Fallback to individual environment variables
    const getEnvVar = (key: string) => 
      import.meta.env?.[`VITE_${key}`] || 
      process.env[`VITE_${key}`] || 
      process.env[key];

    const credentials = {
      type: 'service_account',
      project_id: getEnvVar('GOOGLE_PROJECT_ID'),
      private_key_id: getEnvVar('GOOGLE_PRIVATE_KEY_ID'),
      private_key: getEnvVar('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
      client_email: getEnvVar('GOOGLE_CLIENT_EMAIL'),
      client_id: getEnvVar('GOOGLE_CLIENT_ID'),
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: getEnvVar('GOOGLE_CLIENT_CERT_URL')
    };

    // Validate required fields
    if (!credentials.project_id || !credentials.private_key || !credentials.client_email) {
      throw new Error('Missing required Google Sheets API credentials. Set VITE_GOOGLE_SERVICE_ACCOUNT_JSON or individual environment variables.');
    }

    return credentials;
  }

  /**
   * Write quantity to specific service row in Google Sheets
   */
  async writeServiceQuantity(row: number, quantity: number): Promise<void> {
    const initialized = await this.initialize();
    if (!initialized) {
      console.log(`🧪 MOCK: Would write quantity ${quantity} to row ${row}`);
      return;
    }

    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `B${row}`, // Column B contains quantities
        valueInputOption: 'RAW',
        requestBody: {
          values: [[quantity]]
        }
      });

      console.log(`✅ Written quantity ${quantity} to row ${row}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to write quantity to row ${row}:`, errorMessage);
      throw new Error(`Google Sheets write failed: ${errorMessage}`);
    }
  }

  /**
   * Write multiple service quantities at once
   */
  async writeMultipleQuantities(updates: { row: number; quantity: number }[]): Promise<void> {
    const initialized = await this.initialize();
    if (!initialized) {
      console.log(`🧪 MOCK: Would write ${updates.length} quantities:`, updates);
      return;
    }

    try {
      const requests = updates.map(({ row, quantity }) => ({
        range: `B${row}`,
        values: [[quantity]]
      }));

      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: requests
        }
      });

      console.log(`✅ Written ${updates.length} quantities to Google Sheets`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to write multiple quantities:', errorMessage);
      throw new Error(`Google Sheets batch write failed: ${errorMessage}`);
    }
  }

  /**
   * Read calculated results from Google Sheets
   */
  async readCalculationResults(rows: number[]): Promise<SheetCalculationResult[]> {
    const initialized = await this.initialize();
    if (!initialized) {
      // Return mock data
      console.log(`🧪 MOCK: Would read calculation results from rows:`, rows);
      return this.getMockCalculationResults(rows);
    }

    try {
      const ranges = rows.map(row => `C${row}:E${row}`); // Labor hours (C), Cost (D), Service name (E)
      
      const response = await this.sheets.spreadsheets.values.batchGet({
        spreadsheetId: this.spreadsheetId,
        ranges: ranges
      });

      const results: SheetCalculationResult[] = [];
      
      response.data.valueRanges?.forEach((valueRange, index) => {
        const values = valueRange.values?.[0] || [];
        const row = rows[index];
        
        results.push({
          row,
          laborHours: parseFloat(values[0]) || 0,
          cost: parseFloat(values[1]) || 0,
          service: values[2] || `Service ${row}`
        });
      });

      console.log(`✅ Read calculation results for ${results.length} services`);
      return results;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to read calculation results:', errorMessage);
      throw new Error(`Google Sheets read failed: ${errorMessage}`);
    }
  }

  /**
   * Calculate project totals from individual service results
   */
  calculateProjectTotals(results: SheetCalculationResult[]): ProjectTotal {
    const totalLaborHours = results.reduce((sum, result) => sum + result.laborHours, 0);
    const totalCost = results.reduce((sum, result) => sum + result.cost, 0);

    return {
      totalLaborHours,
      totalCost
    };
  }

  /**
   * Get mock calculation results for testing/fallback
   */
  private getMockCalculationResults(rows: number[]): SheetCalculationResult[] {
    console.log('🧪 Using mock calculation results');
    
    return rows.map(row => ({
      row,
      laborHours: Math.round((10 + Math.random() * 20) * 100) / 100, // 10-30 hours
      cost: Math.round((150 + Math.random() * 800) * 100) / 100, // $150-950
      service: `Mock Service ${row}`
    }));
  }

  /**
   * Test connection to Google Sheets
   */
  async testConnection(): Promise<boolean> {
    const initialized = await this.initialize();
    if (!initialized) {
      console.log('🧪 Google Sheets API not available - mock mode active');
      return false;
    }

    try {
      // Try to read a simple range to test connection
      await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'A1:A1'
      });

      console.log('✅ Google Sheets connection test successful');
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Google Sheets connection test failed:', errorMessage);
      return false;
    }
  }

  /**
   * Clear all quantities in the sheet (reset for new calculation)
   */
  async clearQuantities(): Promise<void> {
    const initialized = await this.initialize();
    if (!initialized) {
      console.log('🧪 MOCK: Would clear all quantities');
      return;
    }

    try {
      // Clear quantity column B (rows 2-100 to cover all services)
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'B2:B100'
      });

      console.log('✅ Cleared all quantities in Google Sheets');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to clear quantities:', errorMessage);
      throw new Error(`Google Sheets clear failed: ${errorMessage}`);
    }
  }
}

/**
 * Factory function for creating Google Sheets client instances
 */
export const createSheetsClient = (spreadsheetId?: string): GoogleSheetsClient => {
  const sheetId = spreadsheetId || 
    import.meta.env?.VITE_GOOGLE_SHEETS_SHEET_ID || 
    process.env.VITE_GOOGLE_SHEETS_SHEET_ID ||
    process.env.GOOGLE_SHEETS_SHEET_ID;
  
  if (!sheetId) {
    throw new Error('Google Sheets ID is required. Set VITE_GOOGLE_SHEETS_SHEET_ID environment variable.');
  }

  return new GoogleSheetsClient(sheetId);
};

/**
 * Test the Google Sheets integration
 */
export const testGoogleSheetsIntegration = async (): Promise<void> => {
  console.log('🧪 Testing Google Sheets integration...');
  
  try {
    const client = createSheetsClient();
    const isConnected = await client.testConnection();
    
    if (isConnected) {
      console.log('✅ Google Sheets integration test passed');
    } else {
      console.log('⚠️ Google Sheets integration test failed - using mock mode');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Google Sheets integration test error:', errorMessage);
  }
};

// Export for testing
export { GoogleSheetsClient as default };