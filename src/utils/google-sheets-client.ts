/**
 * Google Sheets API Client for TradeSphere Pricing Calculator
 * 
 * Handles direct integration with the production Google Sheets calculator:
 * "NEW Quick Estimating Calculator - Official - Individual Projects"
 * 
 * Features:
 * - Conditional imports for Google APIs (prevents build failures)
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
  // FUTURE: Add breakdown fields when business requirements are defined
  // materialsCost: number;
  // laborCost: number;  
  // taxCost: number;
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
   * Initialize Google APIs with conditional imports
   */
  private async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (this.initializationFailed) return false;

    try {
      console.log('🔌 Initializing Google Sheets API with conditional imports...');

      // Check if we're in a browser environment
      if (typeof window !== 'undefined') {
        console.log('🌐 Browser environment detected - using mock mode');
        this.initializationFailed = true;
        return false;
      }

      // Try to load Google APIs - but handle gracefully if they fail
      let GoogleAuth: any;
      let google: any;
      
      try {
        // Import Google APIs
        const googleAuthLib = await import('google-auth-library');
        const googleApis = await import('googleapis');
        GoogleAuth = googleAuthLib.GoogleAuth;
        google = googleApis.google;
        
        console.log('📦 Google APIs imported successfully');
      } catch (importError) {
        console.log('📦 Google APIs import failed - fallback to mock mode');
        this.initializationFailed = true;
        return false;
      }

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
    // Safe environment variable access helper
    const getEnvVar = (key) => {
      if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
      }
      try {
        if (typeof import.meta !== 'undefined' && import.meta?.env?.[key]) {
          return import.meta.env[key];
        }
      } catch (e) {
        // import.meta not available in this environment
      }
      return undefined;
    };

    // Check for service account JSON in environment variable
    const serviceAccountJson = getEnvVar('VITE_GOOGLE_SERVICE_ACCOUNT_JSON') || 
                              getEnvVar('GOOGLE_SERVICE_ACCOUNT_JSON');

    if (serviceAccountJson) {
      try {
        return JSON.parse(serviceAccountJson);
      } catch (error) {
        console.error('Failed to parse Google service account JSON:', error);
        throw new Error('Invalid Google service account credentials');
      }
    }

    // Fallback to individual environment variables using safe helper
    const getCredentialVar = (key: string) => 
      getEnvVar(`VITE_${key}`) || 
      getEnvVar(key);

    const credentials = {
      type: 'service_account',
      project_id: getCredentialVar('GOOGLE_PROJECT_ID'),
      private_key_id: getCredentialVar('GOOGLE_PRIVATE_KEY_ID'),
      private_key: getCredentialVar('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
      client_email: getCredentialVar('GOOGLE_CLIENT_EMAIL'),
      client_id: getCredentialVar('GOOGLE_CLIENT_ID'),
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: getCredentialVar('GOOGLE_CLIENT_CERT_URL')
    };

    // Validate required fields
    if (!credentials.project_id || !credentials.private_key || !credentials.client_email) {
      throw new Error('Missing required Google Sheets API credentials. Set VITE_GOOGLE_SERVICE_ACCOUNT_JSON or individual environment variables.');
    }

    return credentials;
  }

  /**
   * Get sheet name based on beta code ID for multi-user support
   */
  private getSheetName(betaCodeId?: number): string {
    if (betaCodeId && betaCodeId >= 1 && betaCodeId <= 12) {
      return `ID ${betaCodeId} Base`;
    }
    return 'Sheet1'; // Default sheet for legacy compatibility
  }

  /**
   * Get actual sheet name from Google Sheets API (dynamic detection)
   */
  private async getActualSheetName(betaCodeId?: number): Promise<string> {
    const initialized = await this.initialize();
    
    if (!initialized) {
      // Return mock name for testing
      return this.getSheetName(betaCodeId);
    }

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      const sheets = response.data.sheets || [];
      console.log('📊 Available sheets:', sheets.map(s => ({
        title: s.properties?.title,
        sheetId: s.properties?.sheetId
      })));

      // For beta codes, look for exact match first
      if (betaCodeId && betaCodeId >= 1 && betaCodeId <= 12) {
        const expectedName = `ID ${betaCodeId} Base`;
        const matchingSheet = sheets.find(s => s.properties?.title === expectedName);
        if (matchingSheet) {
          console.log(`✅ Found exact beta sheet: "${expectedName}"`);
          return expectedName;
        }
      }

      // Fallback to first sheet
      const firstSheet = sheets[0];
      if (firstSheet?.properties?.title) {
        const actualName = firstSheet.properties.title;
        console.log(`📋 Using first sheet: "${actualName}"`);
        return actualName;
      }

      // Last resort fallback
      console.warn('⚠️ No sheets found, using fallback name');
      return this.getSheetName(betaCodeId);

    } catch (error) {
      console.error('❌ Failed to get actual sheet name:', error);
      return this.getSheetName(betaCodeId);
    }
  }

  /**
   * Write quantity to specific service row in Google Sheets with beta code ID support
   */
  async writeServiceQuantity(row: number, quantity: number, betaCodeId?: number): Promise<void> {
    const initialized = await this.initialize();
    const sheetName = this.getSheetName(betaCodeId);
    
    if (!initialized) {
      console.log(`🧪 MOCK: Would write quantity ${quantity} to row ${row} in sheet "${sheetName}"`);
      return;
    }

    try {
      const range = `'${sheetName}'!B${row}`; // Target user-specific sheet
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[quantity]]
        }
      });

      console.log(`✅ Written quantity ${quantity} to row ${row} in sheet "${sheetName}" (Beta Code: ${betaCodeId || 'default'})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to write quantity to row ${row} in sheet "${sheetName}":`, errorMessage);
      throw new Error(`Google Sheets write failed: ${errorMessage}`);
    }
  }

  /**
   * Write multiple service quantities at once with beta code ID support
   */
  async writeMultipleQuantities(updates: { row: number; quantity: number }[], betaCodeId?: number): Promise<void> {
    const initialized = await this.initialize();
    const sheetName = this.getSheetName(betaCodeId);
    
    if (!initialized) {
      console.log(`🧪 MOCK: Would write ${updates.length} quantities to sheet "${sheetName}":`, updates);
      return;
    }

    try {
      const requests = updates.map(({ row, quantity }) => ({
        range: `'${sheetName}'!B${row}`,
        values: [[quantity]]
      }));

      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: requests
        }
      });

      console.log(`✅ Written ${updates.length} quantities to sheet "${sheetName}" (Beta Code: ${betaCodeId || 'default'})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to write multiple quantities to sheet "${sheetName}":`, errorMessage);
      throw new Error(`Google Sheets batch write failed: ${errorMessage}`);
    }
  }

  /**
   * Read calculated results from Google Sheets with beta code ID support
   */
  async readCalculationResults(rows: number[], betaCodeId?: number): Promise<SheetCalculationResult[]> {
    const initialized = await this.initialize();
    const sheetName = this.getSheetName(betaCodeId);
    
    if (!initialized) {
      // Return mock data
      console.log(`🧪 MOCK: Would read calculation results from rows in sheet "${sheetName}":`, rows);
      return this.getMockCalculationResults(rows, betaCodeId);
    }

    try {
      const ranges = rows.map(row => `'${sheetName}'!A${row}:D${row}`); // Service name (A), Labor hours (C), Cost (D)
      
      console.log(`🔍 DEBUG: Reading from ranges:`, ranges);
      
      const response = await this.sheets.spreadsheets.values.batchGet({
        spreadsheetId: this.spreadsheetId,
        ranges: ranges
      });

      console.log(`🔍 DEBUG: Raw Google Sheets response:`, JSON.stringify(response.data, null, 2));

      const results: SheetCalculationResult[] = [];
      
      response.data.valueRanges?.forEach((valueRange, index) => {
        const values = valueRange.values?.[0] || [];
        const row = rows[index];
        
        console.log(`🔍 DEBUG: Row ${row} raw values:`, values);
        
        const serviceName = (values[0] || '').toString().trim();
        const laborHours = parseFloat(values[2]) || 0; // Column C is index 2 (A=0, B=1, C=2, D=3)
        // Parse cost string by removing $ and commas
        const costString = (values[3] || '').toString();
        const cost = parseFloat(costString.replace(/[\$,]/g, '')) || 0;
        
        console.log(`  - Column A (Service Name): "${values[0]}" -> "${serviceName}"`);
        console.log(`  - Column C (Labor Hours): "${values[2]}" -> ${laborHours}`);
        console.log(`  - Column D (Cost): "${values[3]}" -> ${cost} (cleaned from "${costString}")`);
        
        results.push({
          row,
          laborHours,
          cost,
          service: serviceName || `Service ${row}`
        });
      });

      console.log(`✅ Read calculation results for ${results.length} services from sheet "${sheetName}" (Beta Code: ${betaCodeId || 'default'})`);
      return results;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to read calculation results from sheet "${sheetName}":`, errorMessage);
      throw new Error(`Google Sheets read failed: ${errorMessage}`);
    }
  }

  /**
   * Read project totals directly from Google Sheets cells C34 and D34
   */
  async readProjectTotals(betaCodeId?: number): Promise<ProjectTotal> {
    const initialized = await this.initialize();
    const sheetName = this.getSheetName(betaCodeId);
    
    if (!initialized) {
      console.log(`🧪 MOCK: Would read project totals from ${sheetName} cells C34:D34`);
      return { totalLaborHours: 0, totalCost: 0 };
    }

    try {
      const range = `'${sheetName}'!C34:D34`; // Total hours (C34), Total cost (D34)
      
      console.log(`🔍 DEBUG: Reading project totals from range: ${range}`);
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: range
      });

      console.log(`🔍 DEBUG: Raw totals response:`, JSON.stringify(response.data, null, 2));

      const values = response.data.values?.[0] || [];
      const totalLaborHours = parseFloat(values[0]) || 0;
      // Parse cost string by removing $ and commas
      const totalCostString = (values[1] || '').toString();
      const totalCost = parseFloat(totalCostString.replace(/[\$,]/g, '')) || 0;
      
      console.log(`🔍 DEBUG: Parsed totals - Hours: "${values[0]}" -> ${totalLaborHours}, Cost: "${values[1]}" -> ${totalCost} (cleaned from "${totalCostString}")`);

      // REMOVED: Artificial multipliers - see docs/pricing-multipliers-future.md
      // Return raw values from Google Sheets only
      const totals = {
        totalLaborHours,
        totalCost
      };

      console.log(`✅ Read project totals from sheet "${sheetName}": $${totalCost}, ${totalLaborHours}h (Beta Code: ${betaCodeId || 'default'})`);
      return totals;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to read project totals from sheet "${sheetName}":`, errorMessage);
      throw new Error(`Google Sheets totals read failed: ${errorMessage}`);
    }
  }

  /**
   * Calculate project totals from individual service results (fallback method)
   * REMOVED: Artificial multipliers - see docs/pricing-multipliers-future.md
   */
  calculateProjectTotals(results: SheetCalculationResult[]): ProjectTotal {
    const totalLaborHours = results.reduce((sum, result) => sum + result.laborHours, 0);
    const totalCost = results.reduce((sum, result) => sum + result.cost, 0);

    // Return raw calculated totals only (no artificial breakdowns)
    return {
      totalLaborHours,
      totalCost
    };
  }

  /**
   * Get mock calculation results for testing/fallback with beta code ID
   */
  private getMockCalculationResults(rows: number[], betaCodeId?: number): SheetCalculationResult[] {
    const sheetName = this.getSheetName(betaCodeId);
    console.log(`🧪 Using mock calculation results for sheet "${sheetName}"`);
    
    return rows.map(row => ({
      row,
      laborHours: Math.round((10 + Math.random() * 20) * 100) / 100, // 10-30 hours
      cost: Math.round((150 + Math.random() * 800) * 100) / 100, // $150-950
      service: `Mock Service ${row} (${sheetName})`
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
   * Clear all quantities in the sheet (reset for new calculation) with beta code ID support
   */
  async clearQuantities(betaCodeId?: number): Promise<void> {
    const initialized = await this.initialize();
    
    if (!initialized) {
      const mockSheetName = this.getSheetName(betaCodeId);
      console.log(`🧪 MOCK: Would clear all quantities in sheet "${mockSheetName}"`);
      return;
    }

    // Get actual sheet name dynamically
    const actualSheetName = await this.getActualSheetName(betaCodeId);
    
    // Try multiple range formats for maximum compatibility
    const rangeFormats = [
      `${actualSheetName}!B2:B33`,      // Simple format (preferred)
      `'${actualSheetName}'!B2:B33`,    // Quoted format
      'B2:B33'                          // No sheet reference (fallback)
    ];

    let lastError: Error | null = null;
    
    for (const range of rangeFormats) {
      try {
        console.log(`🧹 Attempting to clear quantities in range: ${range}`);
        
        await this.sheets.spreadsheets.values.clear({
          spreadsheetId: this.spreadsheetId,
          range: range
        });

        console.log(`✅ Successfully cleared quantities using range: ${range} (Beta Code: ${betaCodeId || 'default'})`);
        return; // Success! Exit early
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`⚠️ Range format "${range}" failed: ${errorMessage}`);
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Continue to next format
        continue;
      }
    }

    // If all formats failed, throw comprehensive error
    console.error(`❌ All range formats failed for sheet "${actualSheetName}"`);
    console.error(`❌ Spreadsheet ID: ${this.spreadsheetId}`);
    console.error(`❌ Attempted ranges:`, rangeFormats);
    
    throw new Error(`Google Sheets clear failed: ${lastError?.message || 'All range formats rejected'}`);
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