import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://qxrohyczhqhufdjxmmqu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cm9oeWN6aHFodWZkanhtbXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyMzc3ODMsImV4cCI6MjA1MTgxMzc4M30.b1ygHxJOgXkMjwVcJb8b6x-yJ57Z5_vwzjxY9QXAd5E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('📝 Reading migration file...');
  const migration = fs.readFileSync('src/database/migrations/001_init_demo_paver_patio_config.sql', 'utf8');
  
  console.log('🔄 Applying migration to update cutting complexity...');
  const { data, error } = await supabase.rpc('exec_sql', { sql: migration });
  
  if (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
  
  console.log('✅ Migration applied successfully!');
  console.log('🔄 Configuration updated in database');
}

applyMigration();
