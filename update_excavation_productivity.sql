UPDATE "public"."service_pricing_configs"
SET 
  "base_productivity" = 25.00,
  "updated_at" = NOW()
WHERE 
  "service_name" = 'excavation_removal' 
  AND "company_id" = '08f0827a-608f-485a-a19f-e0c55ecf6484';
