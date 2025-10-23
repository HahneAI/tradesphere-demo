create table public.service_pricing_configs (
  id uuid not null default gen_random_uuid (),
  company_id uuid not null,
  service_name character varying(100) not null,
  hourly_labor_rate numeric(6, 2) not null default 25.00,
  optimal_team_size integer not null default 3,
  base_productivity numeric(6, 2) not null default 50.00,
  base_material_cost numeric(6, 2) not null default 5.84,
  profit_margin numeric(4, 3) not null default 0.20,
  variables_config jsonb not null default '{"formulaType": "two_tier", "categoryName": {"label": "Category Display Name", "description": "What this category controls", "variableName": {"type": "select", "label": "Variable Display Label", "default": "defaultOption", "options": {"defaultOption": {"label": "Default Option", "value": 0, "multiplier": 1.0}}, "effectType": "labor_time_percentage", "description": "How this affects the project", "calculationTier": 1}}, "formulaDescription": "Tier 1: Calculate labor hours | Tier 2: Calculate costs with complexity and profit", "serviceIntegrations": {"label": "Bundled Services", "description": "Automatically include related service calculations"}}'::jsonb,
  default_variables jsonb not null default '{"categoryName": {"variableName": "defaultOption"}}'::jsonb,
  is_active boolean null default true,
  version character varying(20) null default '2.0.0'::character varying,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  updated_by uuid null,
  constraint service_pricing_configs_pkey primary key (id),
  constraint service_pricing_configs_unique unique (company_id, service_name),
  constraint service_pricing_configs_company_fkey foreign KEY (company_id) references companies (id) on delete CASCADE,
  constraint service_pricing_configs_updated_by_fkey foreign KEY (updated_by) references users (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_service_pricing_configs_company on public.service_pricing_configs using btree (company_id) TABLESPACE pg_default;

create index IF not exists idx_service_pricing_configs_service on public.service_pricing_configs using btree (company_id, service_name) TABLESPACE pg_default
where
  (is_active = true);

create trigger set_service_pricing_configs_updated_at BEFORE
update on service_pricing_configs for EACH row
execute FUNCTION update_service_pricing_configs_updated_at ();