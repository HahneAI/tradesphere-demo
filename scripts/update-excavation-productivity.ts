import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wbrwsjilqecdfytzldxs.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateExcavationProductivity() {
  console.log('🔧 Updating excavation base_productivity from 6 to 25...');

  const { data, error } = await supabase
    .from('service_pricing_configs')
    .update({
      base_productivity: 25.00,
      updated_at: new Date().toISOString()
    })
    .eq('service_name', 'excavation_removal')
    .eq('company_id', '08f0827a-608f-485a-a19f-e0c55ecf6484')
    .select();

  if (error) {
    console.error('❌ Error updating database:', error);
    process.exit(1);
  }

  console.log('✅ Successfully updated excavation productivity to 25 yd³/day');
  console.log('📊 Updated record:', data);
  process.exit(0);
}

updateExcavationProductivity();
