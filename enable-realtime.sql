-- Enable real-time broadcasts for service_pricing_configs table
-- This adds the table to the supabase_realtime publication

ALTER publication supabase_realtime ADD TABLE service_pricing_configs;

-- Verify it was added (optional check)
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
