-- ============================================================================
-- SUPABASE DATABASE SCHEMA REFERENCE
-- ============================================================================
--
-- THIS IS A REFERENCE FILE - DO NOT EXECUTE
--
-- Purpose: Document current Supabase database structure for AI agent reference
-- Last Updated: [User will update when pasting]
-- Source: Supabase Database SQL export
--
-- This file provides a complete reference of:
-- - All table schemas with column types and constraints
-- - All RLS (Row Level Security) policies
-- - Foreign key relationships
-- - Indexes
-- - Functions and triggers
--
-- ============================================================================

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.VC Usage (
  id integer NOT NULL,
  user_name character varying NOT NULL,
  user_tech_id character varying NOT NULL,
  session_id character varying NOT NULL,
  beta_code_id integer,
  user_input text NOT NULL,
  ai_response text NOT NULL,
  interaction_number integer NOT NULL,
  scenario_name character varying DEFAULT 'TradeSphere_AI_Agent'::character varying,
  total_tokens integer,
  created_at timestamp with time zone DEFAULT now(),
  message_type character varying DEFAULT 'chat'::character varying,
  success boolean DEFAULT true,
  error_message text,
  interaction_summary text,
  customer_name character varying,
  customer_address text,
  customer_email character varying,
  customer_phone character varying,
  processing_time_ms numeric,
  ai_model character varying,
  prompt_tokens integer,
  completion_tokens integer,
  response_length integer,
  services_count integer,
  confidence_score numeric,
  gpt_splitting_time_ms numeric,
  parameter_collection_time_ms numeric,
  pricing_calculation_time_ms numeric,
  ai_generation_time_ms numeric,
  last_viewed_at timestamp with time zone,
  view_count integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  company_id uuid,
  CONSTRAINT VC Usage_pkey PRIMARY KEY (id),
  CONSTRAINT vc_usage_company_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
CREATE TABLE public.beta_codes (
  id integer NOT NULL DEFAULT nextval('beta_codes_id_seq'::regclass),
  code character varying NOT NULL UNIQUE,
  used boolean DEFAULT false,
  used_by_email character varying,
  used_by_user_id text,
  used_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  expires_at timestamp without time zone DEFAULT (now() + '30 days'::interval),
  CONSTRAINT beta_codes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.beta_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying UNIQUE,
  full_name character varying,
  job_title character varying,
  tech_uuid character varying NOT NULL UNIQUE,
  beta_code_used character varying,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  first_name character varying,
  beta_code_id integer,
  is_admin boolean DEFAULT false,
  user_icon character varying NOT NULL DEFAULT 'User'::character varying,
  company_id uuid,
  CONSTRAINT beta_users_pkey PRIMARY KEY (id),
  CONSTRAINT beta_users_company_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT fk_beta_code FOREIGN KEY (beta_code_used) REFERENCES public.beta_codes(code)
);
CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id character varying NOT NULL DEFAULT generate_company_id() UNIQUE,
  name character varying NOT NULL,
  email character varying NOT NULL,
  website_url text,
  ai_personality character varying,
  color_theme jsonb,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  subscription_status character varying DEFAULT 'trial'::character varying,
  next_billing_date date,
  trial_end_date date DEFAULT (CURRENT_DATE + '14 days'::interval),
  dwolla_customer_url character varying,
  monthly_amount numeric DEFAULT 2000.00,
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);
CREATE TABLE public.company_notes (
  id bigint NOT NULL,
  notes_content text DEFAULT ''::text,
  updated_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT company_notes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.customer_interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_tech_id text NOT NULL,
  customer_name text NOT NULL,
  session_id text,
  interaction_type text NOT NULL CHECK (interaction_type = ANY (ARRAY['view'::text, 'edit'::text, 'load'::text])),
  viewed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  company_id uuid,
  CONSTRAINT customer_interactions_pkey PRIMARY KEY (id),
  CONSTRAINT customer_interactions_company_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
CREATE TABLE public.demo_messages (
  id bigint NOT NULL DEFAULT nextval('demo_messages_id_seq'::regclass),
  session_id text NOT NULL,
  message_text text NOT NULL,
  sender text NOT NULL,
  tech_id text,
  created_at timestamp with time zone DEFAULT now(),
  message_source character varying DEFAULT 'make_com'::character varying,
  company_id uuid,
  CONSTRAINT demo_messages_pkey PRIMARY KEY (id),
  CONSTRAINT demo_messages_company_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
CREATE TABLE public.feedback (
  id bigint NOT NULL DEFAULT nextval('feedback_id_seq'::regclass),
  user_name text NOT NULL,
  feedback_text text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT feedback_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid,
  amount numeric NOT NULL,
  status character varying NOT NULL,
  processed_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  dwolla_customer_id character varying,
  dwolla_funding_source_id character varying,
  dwolla_transfer_id character varying,
  bank_account_name character varying,
  bank_account_last4 character varying,
  payment_type character varying DEFAULT 'monthly_subscription'::character varying,
  subscription_period_start date,
  subscription_period_end date,
  ach_status character varying,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
CREATE TABLE public.service_pricing_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  service_name character varying NOT NULL,
  hourly_labor_rate numeric NOT NULL DEFAULT 25.00,
  optimal_team_size integer NOT NULL DEFAULT 3,
  base_productivity numeric NOT NULL DEFAULT 50.00,
  base_material_cost numeric NOT NULL DEFAULT 5.84,
  profit_margin numeric NOT NULL DEFAULT 0.20,
  variables_config jsonb NOT NULL DEFAULT '{"labor": {"teamSize": {"threePlus": 0, "twoPerson": 40}}, "materials": {"paverStyle": {"premium": 1.2, "standard": 1.0}, "cuttingComplexity": {"complex": {"materialWaste": 25, "fixedLaborHours": 12}, "minimal": {"materialWaste": 0, "fixedLaborHours": 0}, "moderate": {"materialWaste": 15, "fixedLaborHours": 6}}}, "complexity": {"overallComplexity": {"max": 1.5, "min": 0.9, "step": 0.1, "default": 1.0}}, "excavation": {"equipmentRequired": {"handTools": 0, "attachments": 125, "heavyMachinery": 350, "lightMachinery": 250}, "tearoutComplexity": {"grass": 0, "asphalt": 30, "concrete": 20}}, "siteAccess": {"obstacleRemoval": {"none": 0, "major": 1500, "minor": 500}, "accessDifficulty": {"easy": 0, "moderate": 50, "difficult": 100}}}'::jsonb,
  default_variables jsonb NOT NULL DEFAULT '{"labor": {"teamSize": "threePlus"}, "materials": {"paverStyle": "standard", "cuttingComplexity": "minimal", "patternComplexity": "minimal"}, "complexity": {"overallComplexity": 1.0}, "excavation": {"equipmentRequired": "handTools", "tearoutComplexity": "grass"}, "siteAccess": {"obstacleRemoval": "none", "accessDifficulty": "easy"}}'::jsonb,
  is_active boolean DEFAULT true,
  version character varying DEFAULT '2.0.0'::character varying,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  updated_by uuid,
  CONSTRAINT service_pricing_configs_pkey PRIMARY KEY (id),
  CONSTRAINT service_pricing_configs_company_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT service_pricing_configs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT auth.uid(),
  company_id uuid NOT NULL,
  email character varying NOT NULL,
  role character varying NOT NULL,
  is_head_user boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  is_admin boolean DEFAULT false,
  user_icon character varying NOT NULL DEFAULT 'User'::character varying,
  name character varying NOT NULL DEFAULT 'User'::character varying,
  title character varying,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);