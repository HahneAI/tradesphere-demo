/**
 * Google Sheets API Client for TradeSphere Pricing Calculator
 * 
 * Handles direct integration with the production Google Sheets calculator:
 * "NEW Quick Estimating Calculator - Official - Individual Projects"
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from 'googleapis';

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

export class GoogleSheetsClient {
  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;
  
  constructor(spreadsheetId: string) {
    this.spreadsheetId = spreadsheetId;
    
    // Initialize Google Sheets API with service account credentials
    const auth = new GoogleAuth({
      // Credentials from environment variables or service account file
      credentials: this.getCredentials(),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    this.sheets = new sheets_v4.Sheets({ auth });
  }

  private getCredentials() {
    // Check for service account JSON in environment variable
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      } catch (error) {
        console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', error);
        throw new Error('Invalid Google service account credentials');
      }
    }
    
    // Fallback to individual environment variables
    const credentials = {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL
    };

    // Validate required fields
    if (!credentials.project_id || !credentials.private_key || !credentials.client_email) {
      throw new Error('Missing required Google Sheets API credentials. Set GOOGLE_SERVICE_ACCOUNT_JSON or individual environment variables.');
    }

    return credentials;
  }

  /**
   * Write quantity to specific service row in Google Sheets
   * This triggers the sheet's formulas to calculate labor hours and costs
   */
  async writeServiceQuantity(row: number, quantity: number): Promise<void> {
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
      console.error(`❌ Failed to write quantity to row ${row}:`, error);
      throw new Error(`Google Sheets write failed: ${error.message}`);
    }
  }

  /**
   * Write multiple service quantities at once (for multi-service quotes)
   */
  async writeMultipleQuantities(updates: { row: number; quantity: number }[]): Promise<void> {
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
      console.error('❌ Failed to write multiple quantities:', error);
      throw new Error(`Google Sheets batch write failed: ${error.message}`);
    }
  }

  /**
   * Read calculated values for a specific service
   * Returns labor hours (Column C) and cost (Column D)
   */
  async readServiceCalculation(row: number): Promise<SheetCalculationResult> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `C${row}:D${row}` // Labor hours and cost columns
      });

      const values = response.data.values?.[0];
      
      if (!values || values.length < 2) {
        throw new Error(`No calculated values found for row ${row}`);
      }

      const laborHours = parseFloat(values[0]) || 0;
      const cost = parseFloat(values[1]) || 0;

      return {
        laborHours,
        cost,
        row,
        service: `Row ${row}` // Will be enhanced with actual service name
      };

    } catch (error) {
      console.error(`❌ Failed to read calculation for row ${row}:`, error);
      throw new Error(`Google Sheets read failed: ${error.message}`);
    }
  }

  /**
   * Read project totals from the summary cells (C34:D34)
   */
  async readProjectTotals(): Promise<ProjectTotal> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'C34:D34' // Total labor hours and total cost
      });

      const values = response.data.values?.[0];
      
      if (!values || values.length < 2) {
        console.warn('⚠️ No project totals found, returning zeros');
        return { totalLaborHours: 0, totalCost: 0 };
      }

      const totalLaborHours = parseFloat(values[0]) || 0;
      const totalCost = parseFloat(values[1]) || 0;

      console.log(`📊 Project totals: ${totalLaborHours} hours, $${totalCost}`);

      return {
        totalLaborHours,
        totalCost
      };

    } catch (error) {
      console.error('❌ Failed to read project totals:', error);
      throw new Error(`Google Sheets totals read failed: ${error.message}`);
    }
  }

  /**
   * Clear all quantity inputs after calculation
   * This resets the sheet for the next calculation
   */
  async clearQuantities(): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'B2:B33' // All quantity input cells
      });

      console.log('🧹 Cleared all quantity inputs');
    } catch (error) {
      console.error('❌ Failed to clear quantities:', error);
      throw new Error(`Google Sheets clear failed: ${error.message}`);
    }
  }

  /**
   * Complete pricing calculation workflow for a single service
   */
  async calculateSingleService(row: number, quantity: number, serviceName: string): Promise<SheetCalculationResult> {
    try {
      console.log(`🔢 Calculating: ${serviceName}, Row ${row}, Quantity ${quantity}`);

      // Step 1: Clear any existing values
      await this.clearQuantities();

      // Step 2: Write quantity
      await this.writeServiceQuantity(row, quantity);

      // Step 3: Wait for Google Sheets to calculate (formulas are instant but allow buffer)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 4: Read calculated result
      const result = await this.readServiceCalculation(row);
      result.service = serviceName;

      console.log(`✅ Calculated: ${serviceName} = ${result.laborHours}h, $${result.cost}`);

      return result;

    } catch (error) {
      console.error(`❌ Single service calculation failed for ${serviceName}:`, error);
      throw error;
    }
  }

  /**
   * Complete pricing calculation workflow for multiple services
   */
  async calculateMultipleServices(
    services: { row: number; quantity: number; name: string }[]
  ): Promise<{ services: SheetCalculationResult[]; totals: ProjectTotal }> {
    try {
      console.log(`🔢 Calculating ${services.length} services:`);
      services.forEach(s => console.log(`  - ${s.name}: ${s.quantity} units (row ${s.row})`));

      // Step 1: Clear any existing values
      await this.clearQuantities();

      // Step 2: Write all quantities
      const updates = services.map(s => ({ row: s.row, quantity: s.quantity }));
      await this.writeMultipleQuantities(updates);

      // Step 3: Wait for Google Sheets to calculate
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 4: Read individual service results
      const serviceResults: SheetCalculationResult[] = [];
      for (const service of services) {
        const result = await this.readServiceCalculation(service.row);
        result.service = service.name;
        serviceResults.push(result);
      }

      // Step 5: Read project totals
      const totals = await this.readProjectTotals();

      console.log(`✅ Multi-service calculation complete: ${totals.totalLaborHours}h, $${totals.totalCost}`);

      return {
        services: serviceResults,
        totals
      };

    } catch (error) {
      console.error('❌ Multi-service calculation failed:', error);
      throw error;
    }
  }

  /**
   * Test connection to Google Sheets
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      const title = response.data.properties?.title;
      console.log(`✅ Connected to Google Sheets: "${title}"`);
      
      return true;
    } catch (error) {
      console.error('❌ Google Sheets connection failed:', error);
      return false;
    }
  }
}

// Factory function for creating client instances
export const createSheetsClient = (spreadsheetId?: string): GoogleSheetsClient => {
  const sheetId = spreadsheetId || process.env.GOOGLE_SHEETS_ID;
  
  if (!sheetId) {
    throw new Error('Google Sheets ID is required. Set GOOGLE_SHEETS_ID environment variable.');
  }

  return new GoogleSheetsClient(sheetId);
};

// Cache instance for reuse
let cachedClient: GoogleSheetsClient | null = null;

export const getSheetsClient = (): GoogleSheetsClient => {
  if (!cachedClient) {
    cachedClient = createSheetsClient();
  }
  return cachedClient;
};