-- Create customers table for manual customer management
-- This table stores customer records created manually through the UI
-- Separate from "VC Usage" which stores AI chat conversation data

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  customer_name character varying NOT NULL,
  customer_email character varying,
  customer_phone character varying,
  customer_address text,
  customer_notes text,
  created_by_user_id uuid NOT NULL,
  created_by_user_name character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_company_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT customers_created_by_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can SELECT their company's customers
CREATE POLICY customers_select_company ON public.customers
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- RLS Policy: Users can INSERT customers for their company
CREATE POLICY customers_insert_company ON public.customers
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- RLS Policy: Users can UPDATE their company's customers
CREATE POLICY customers_update_company ON public.customers
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- RLS Policy: Users can DELETE their company's customers
CREATE POLICY customers_delete_company ON public.customers
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON public.customers(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(customer_name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(customer_email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(customer_phone);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.customers IS 'Manual customer records created through the UI. Separate from VC Usage which stores AI chat conversations.';
COMMENT ON COLUMN public.customers.created_by_user_id IS 'User ID (auth.uid()) of the person who created this customer record';
COMMENT ON COLUMN public.customers.created_by_user_name IS 'Display name of the user who created this record for easy reference';
