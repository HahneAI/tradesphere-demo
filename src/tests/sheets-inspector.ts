#!/usr/bin/env node
/**
 * Google Sheets Inspector Utility
 * 
 * Debug tool to inspect the actual structure of Google Sheets
 * Verifies column mappings, row contents, and totals calculation
 */
import 'dotenv/config';
import { createSheetsClient } from '../utils/google-sheets-client';

async function main() {
  console.log('🔍 Google Sheets Inspector Utility');
  console.log('=' .repeat(50));
  
  // Show environment status
  const sheetsId = process.env.VITE_GOOGLE_SHEETS_SHEET_ID;
  const serviceAccountJson = process.env.VITE_GOOGLE_SERVICE_ACCOUNT_JSON;
  
  console.log('\n🔍 Environment Variables Status:');
  if (sheetsId) {
    console.log(`✅ Google Sheets ID: SET (...${sheetsId.substring(sheetsId.length - 8)})`);
  } else {
    console.log('❌ Google Sheets ID: NOT SET');
  }
  
  if (serviceAccountJson) {
    console.log('✅ Google Service Account JSON: SET');
  } else {
    console.log('❌ Google Service Account JSON: NOT SET');
  }
  
  try {
    const client = createSheetsClient();
    
    // Test 1: Basic connection test
    console.log('\n🔬 Test 1: Connection Test');
    console.log('-'.repeat(30));
    const isConnected = await client.testConnection();
    if (!isConnected) {
      console.log('❌ Cannot connect to Google Sheets - stopping inspection');
      return;
    }
    console.log('✅ Connection successful');
    
    // Test 2: Inspect specific service row structure
    console.log('\n🔬 Test 2: Service Row Structure');
    console.log('-'.repeat(30));
    
    const testRows = [2, 3, 23]; // Paver Patio, 3' Retaining wall, Triple Ground Mulch
    const testRowsWithNames = [
      { row: 2, name: "Paver Patio (SQFT)" },
      { row: 3, name: "3' Retaining wall (LNFT X SQFT)" },
      { row: 23, name: "Triple Ground Mulch (SQFT)" }
    ];
    
    for (const service of testRowsWithNames) {
      console.log(`\n📋 Inspecting Row ${service.row}: ${service.name}`);
      
      // Check the full row A-F to see structure
      const results = await inspectRow(client, service.row);
      console.log(`  Column A (Service Name): "${results.A}"`);
      console.log(`  Column B (Quantity): "${results.B}"`);
      console.log(`  Column C (Labor Hours): "${results.C}"`);
      console.log(`  Column D (Cost): "${results.D}"`);
      console.log(`  Column E (Additional): "${results.E}"`);
      console.log(`  Column F (Additional): "${results.F}"`);
    }
    
    // Test 3: Inspect totals row (row 34)
    console.log('\n🔬 Test 3: Totals Row Structure (Row 34)');
    console.log('-'.repeat(30));
    const totalsData = await inspectRow(client, 34);
    console.log(`  Column A: "${totalsData.A}"`);
    console.log(`  Column B: "${totalsData.B}"`);
    console.log(`  Column C (Total Hours): "${totalsData.C}"`);
    console.log(`  Column D (Total Cost): "${totalsData.D}"`);
    console.log(`  Column E: "${totalsData.E}"`);
    console.log(`  Column F: "${totalsData.F}"`);
    
    // Test 4: Write test quantity and read results
    console.log('\n🔬 Test 4: Write/Read Test');
    console.log('-'.repeat(30));
    
    console.log('Step 1: Clear quantities');
    await client.clearQuantities(1);
    
    console.log('Step 2: Write test quantity (100) to Paver Patio (row 2)');
    await client.writeServiceQuantity(2, 100, 1);
    
    console.log('Step 3: Read calculation results');
    const calculationResults = await client.readCalculationResults([2], 1);
    console.log('Calculation results:', JSON.stringify(calculationResults, null, 2));
    
    console.log('Step 4: Read project totals from C34/D34');
    const projectTotals = await client.readProjectTotals(1);
    console.log('Project totals:', JSON.stringify(projectTotals, null, 2));
    
    console.log('Step 5: Clear quantities (cleanup)');
    await client.clearQuantities(1);
    
    // Test 5: Multi-user sheet inspection
    console.log('\n🔬 Test 5: Multi-User Sheet Inspection');
    console.log('-'.repeat(30));
    
    for (let betaCodeId = 1; betaCodeId <= 3; betaCodeId++) {
      console.log(`\nChecking Beta Code ${betaCodeId} sheet structure:`);
      try {
        const sheetName = betaCodeId >= 1 && betaCodeId <= 12 ? `ID ${betaCodeId} Base` : 'Sheet1';
        console.log(`  Sheet Name: "${sheetName}"`);
        
        // Quick test of row 2 in this sheet
        const testResult = await inspectSpecificSheet(client, 2, betaCodeId);
        console.log(`  Row 2 Structure in ${sheetName}:`);
        console.log(`    Column A: "${testResult.A}"`);
        console.log(`    Column B: "${testResult.B}"`);
        console.log(`    Column C: "${testResult.C}"`);
        console.log(`    Column D: "${testResult.D}"`);
      } catch (error) {
        console.log(`  ❌ Error accessing Beta Code ${betaCodeId} sheet:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Inspection failed:', error);
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
  
  console.log('\n🎉 Google Sheets inspection completed!');
  console.log('\n💡 This inspection revealed:');
  console.log('   • Actual column structure in the spreadsheet');
  console.log('   • Whether totals are calculated in C34/D34');
  console.log('   • Multi-user sheet accessibility');
  console.log('   • Raw data formats from Google Sheets API');
}

/**
 * Inspect a specific row across columns A-F
 */
async function inspectRow(client: any, row: number, betaCodeId?: number): Promise<Record<string, string>> {
  const sheetName = getSheetName(betaCodeId);
  const range = `'${sheetName}'!A${row}:F${row}`;
  
  try {
    // Direct access to the sheets client
    const sheets = (client as any).sheets;
    if (!sheets) {
      throw new Error('Google Sheets client not initialized');
    }
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: (client as any).spreadsheetId,
      range: range
    });
    
    const values = response.data.values?.[0] || [];
    
    return {
      A: values[0] || '',
      B: values[1] || '',
      C: values[2] || '',
      D: values[3] || '',
      E: values[4] || '',
      F: values[5] || ''
    };
  } catch (error) {
    console.error(`Failed to inspect row ${row}:`, error);
    return { A: 'ERROR', B: 'ERROR', C: 'ERROR', D: 'ERROR', E: 'ERROR', F: 'ERROR' };
  }
}

/**
 * Inspect a specific row in a specific sheet
 */
async function inspectSpecificSheet(client: any, row: number, betaCodeId: number): Promise<Record<string, string>> {
  const sheetName = getSheetName(betaCodeId);
  const range = `'${sheetName}'!A${row}:D${row}`;
  
  try {
    const sheets = (client as any).sheets;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: (client as any).spreadsheetId,
      range: range
    });
    
    const values = response.data.values?.[0] || [];
    
    return {
      A: values[0] || '',
      B: values[1] || '',
      C: values[2] || '',
      D: values[3] || ''
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get sheet name based on beta code ID
 */
function getSheetName(betaCodeId?: number): string {
  if (betaCodeId && betaCodeId >= 1 && betaCodeId <= 12) {
    return `ID ${betaCodeId} Base`;
  }
  return 'Sheet1';
}

// Execute if run directly
main().catch(error => {
  console.error('❌ Sheets inspection failed:', error);
  process.exit(1);
});

export { main };