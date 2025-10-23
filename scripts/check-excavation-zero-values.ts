/**
 * Verification Script: Check Excavation Zero Values in Database
 *
 * This script checks if the excavation_removal service has the correct
 * zero values for labor settings in the database.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function checkExcavationValues() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('🔍 Checking excavation_removal service values in database...\n');

  const { data, error } = await supabase
    .from('service_pricing_configs')
    .select('*')
    .eq('service_name', 'excavation_removal')
    .eq('is_active', true);

  if (error) {
    console.error('❌ Error fetching data:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No excavation_removal services found in database');
    return;
  }

  console.log(`✅ Found ${data.length} excavation_removal service(s)\n`);

  data.forEach((row, index) => {
    console.log(`Service ${index + 1}:`);
    console.log(`  Company ID: ${row.company_id}`);
    console.log(`  Service Name: ${row.service_name}`);
    console.log('\n  Labor Settings (SHOULD BE 0 for excavation):');
    console.log(`    hourly_labor_rate: ${row.hourly_labor_rate} ${row.hourly_labor_rate === 0 ? '✅ CORRECT' : '❌ SHOULD BE 0'}`);
    console.log(`    optimal_team_size: ${row.optimal_team_size} ${row.optimal_team_size === 0 ? '✅ CORRECT' : '❌ SHOULD BE 0'}`);
    console.log(`    base_productivity: ${row.base_productivity} ${row.base_productivity === 0 ? '✅ CORRECT' : '❌ SHOULD BE 0'}`);
    console.log(`    base_material_cost: ${row.base_material_cost} ${row.base_material_cost === 0 ? '✅ CORRECT' : '❌ SHOULD BE 0'}`);
    console.log(`\n  Calculation Settings (from variables_config):` );

    const calcSettings = row.variables_config?.calculationSettings;
    if (calcSettings) {
      console.log(`    baseRatePerCubicYard: ${calcSettings.baseRatePerCubicYard?.default}`);
      console.log(`    defaultDepth: ${calcSettings.defaultDepth?.default} inches`);
      console.log(`    wasteFactor: ${calcSettings.wasteFactor?.default}%`);
      console.log(`    compactionFactor: ${calcSettings.compactionFactor?.default}%`);
    } else {
      console.log('    ⚠️  No calculationSettings found in variables_config');
    }

    console.log(`\n  Updated: ${new Date(row.updated_at).toLocaleString()}`);
    console.log(`  Updated by: ${row.updated_by || 'N/A'}`);
    console.log('\n' + '='.repeat(70) + '\n');
  });
}

checkExcavationValues().catch(console.error);
