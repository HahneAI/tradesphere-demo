-- ============================================================================
-- MIGRATION 20: CREATE CRM TABLES
-- ============================================================================
-- Purpose: Create comprehensive CRM system tables for job management, scheduling, and crew assignments
-- Author: Database Architect
-- Date: 2025-01-22
-- Dependencies: companies, users, customers, service_pricing_configs tables
-- ============================================================================

-- ============================================================================
-- SECTION 1: CREATE ENUM TYPES
-- ============================================================================

-- Create job status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
        CREATE TYPE job_status AS ENUM (
            'quote',          -- Initial quote/estimate stage
            'approved',       -- Customer approved the quote
            'scheduled',      -- Job scheduled but not started
            'in_progress',    -- Work currently being performed
            'completed',      -- Work finished, awaiting invoice
            'invoiced',       -- Invoice sent to customer
            'cancelled'       -- Job cancelled
        );
    END IF;
END $$;

-- Create assignment status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_status') THEN
        CREATE TYPE assignment_status AS ENUM (
            'scheduled',      -- Crew scheduled for future work
            'in_progress',    -- Crew actively working
            'completed',      -- Crew finished their assignment
            'cancelled'       -- Assignment cancelled
        );
    END IF;
END $$;

-- Create crew member role enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crew_role') THEN
        CREATE TYPE crew_role AS ENUM (
            'lead',           -- Crew lead/foreman
            'member'          -- Regular crew member
        );
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: CREATE JOBS TABLE
-- ============================================================================

-- Core job records table
CREATE TABLE IF NOT EXISTS jobs (
    -- Primary identifiers
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Customer relationship
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,

    -- Job details
    job_number VARCHAR(50) NOT NULL, -- Company-specific job number (e.g., "JOB-2025-001")
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Status and lifecycle
    status job_status NOT NULL DEFAULT 'quote',

    -- Location information
    service_address TEXT,
    service_city VARCHAR(100),
    service_state VARCHAR(50),
    service_zip VARCHAR(20),
    service_location_notes TEXT,

    -- Scheduling
    requested_start_date DATE,
    scheduled_start_date DATE,
    scheduled_end_date DATE,
    actual_start_date TIMESTAMP WITH TIME ZONE,
    actual_end_date TIMESTAMP WITH TIME ZONE,

    -- Financial tracking
    estimated_total DECIMAL(10, 2),
    actual_total DECIMAL(10, 2),
    labor_cost DECIMAL(10, 2),
    material_cost DECIMAL(10, 2),

    -- Quote details
    quote_valid_until DATE,
    quote_sent_at TIMESTAMP WITH TIME ZONE,
    quote_approved_at TIMESTAMP WITH TIME ZONE,

    -- Invoice details
    invoice_number VARCHAR(50),
    invoiced_at TIMESTAMP WITH TIME ZONE,
    invoice_due_date DATE,
    paid_at TIMESTAMP WITH TIME ZONE,

    -- Priority and tags
    priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 10),
    tags TEXT[] DEFAULT '{}',

    -- Metadata and configuration
    metadata JSONB DEFAULT '{}',

    -- Audit fields
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT jobs_unique_job_number UNIQUE (company_id, job_number),
    CONSTRAINT jobs_valid_dates CHECK (
        (scheduled_start_date IS NULL OR scheduled_end_date IS NULL) OR
        scheduled_start_date <= scheduled_end_date
    ),
    CONSTRAINT jobs_valid_actual_dates CHECK (
        (actual_start_date IS NULL OR actual_end_date IS NULL) OR
        actual_start_date <= actual_end_date
    )
);

-- Create indexes for jobs table
CREATE INDEX idx_jobs_company_id ON jobs(company_id);
CREATE INDEX idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX idx_jobs_status ON jobs(company_id, status) WHERE status != 'cancelled';
CREATE INDEX idx_jobs_scheduled_dates ON jobs(company_id, scheduled_start_date, scheduled_end_date)
    WHERE status IN ('approved', 'scheduled', 'in_progress');
CREATE INDEX idx_jobs_created_by ON jobs(created_by_user_id);
CREATE INDEX idx_jobs_job_number ON jobs(company_id, job_number);
CREATE INDEX idx_jobs_priority ON jobs(company_id, priority DESC) WHERE status NOT IN ('completed', 'invoiced', 'cancelled');
CREATE INDEX idx_jobs_invoice_due ON jobs(company_id, invoice_due_date) WHERE status = 'invoiced' AND paid_at IS NULL;
CREATE INDEX idx_jobs_tags ON jobs USING GIN(tags) WHERE tags != '{}';

-- Add comments
COMMENT ON TABLE jobs IS 'Core job/project records for CRM system';
COMMENT ON COLUMN jobs.job_number IS 'Company-specific unique job identifier';
COMMENT ON COLUMN jobs.status IS 'Current lifecycle stage of the job';
COMMENT ON COLUMN jobs.priority IS 'Job priority (0=lowest, 10=highest)';
COMMENT ON COLUMN jobs.metadata IS 'Flexible JSONB field for additional job-specific data';

-- ============================================================================
-- SECTION 3: CREATE JOB_SERVICES TABLE
-- ============================================================================

-- Many-to-many relationship between jobs and services
CREATE TABLE IF NOT EXISTS job_services (
    -- Primary identifiers
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    service_config_id UUID NOT NULL REFERENCES service_pricing_configs(id) ON DELETE RESTRICT,

    -- Service details
    service_name VARCHAR(255) NOT NULL, -- Denormalized for query performance
    service_description TEXT,

    -- Quantity and pricing
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),

    -- Pricing engine integration
    calculation_data JSONB DEFAULT '{}', -- Stores complete pricing calculation from engine
    pricing_variables JSONB DEFAULT '{}', -- Input variables used for calculation

    -- Service-specific notes
    notes TEXT,

    -- Execution tracking
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Audit fields
    added_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT job_services_unique_service UNIQUE (job_id, service_config_id)
);

-- Create indexes for job_services table
CREATE INDEX idx_job_services_job_id ON job_services(job_id);
CREATE INDEX idx_job_services_service_config_id ON job_services(service_config_id);
CREATE INDEX idx_job_services_completed ON job_services(job_id, is_completed);
CREATE INDEX idx_job_services_total_price ON job_services(job_id, total_price);

-- Add comments
COMMENT ON TABLE job_services IS 'Links jobs to specific services with pricing calculations';
COMMENT ON COLUMN job_services.calculation_data IS 'Complete pricing calculation result from pricing engine';
COMMENT ON COLUMN job_services.pricing_variables IS 'Input variables used in pricing calculation';

-- ============================================================================
-- SECTION 4: CREATE CREWS TABLE
-- ============================================================================

-- Team/crew definitions
CREATE TABLE IF NOT EXISTS crews (
    -- Primary identifiers
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Crew details
    crew_name VARCHAR(100) NOT NULL,
    crew_code VARCHAR(20), -- Short identifier (e.g., "CREW-A", "TEAM-1")
    description TEXT,

    -- Crew lead
    crew_lead_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Specializations and capabilities
    specializations TEXT[] DEFAULT '{}', -- Array of service types this crew specializes in
    max_capacity INTEGER DEFAULT 5, -- Maximum number of members

    -- Metadata
    metadata JSONB DEFAULT '{}',
    color_code VARCHAR(7), -- Hex color for UI display

    -- Audit fields
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT crews_unique_name UNIQUE (company_id, crew_name),
    CONSTRAINT crews_unique_code UNIQUE (company_id, crew_code),
    CONSTRAINT crews_valid_capacity CHECK (max_capacity > 0 AND max_capacity <= 50)
);

-- Create indexes for crews table
CREATE INDEX idx_crews_company_id ON crews(company_id);
CREATE INDEX idx_crews_active ON crews(company_id, is_active);
CREATE INDEX idx_crews_crew_lead ON crews(crew_lead_user_id);
CREATE INDEX idx_crews_specializations ON crews USING GIN(specializations) WHERE specializations != '{}';

-- Add comments
COMMENT ON TABLE crews IS 'Team/crew definitions for job assignments';
COMMENT ON COLUMN crews.specializations IS 'Array of service types this crew specializes in';
COMMENT ON COLUMN crews.max_capacity IS 'Maximum number of members allowed in this crew';

-- ============================================================================
-- SECTION 5: CREATE CREW_MEMBERS TABLE
-- ============================================================================

-- Users assigned to crews
CREATE TABLE IF NOT EXISTS crew_members (
    -- Primary identifiers
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Role within crew
    role crew_role NOT NULL DEFAULT 'member',

    -- Assignment details
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Skills and certifications
    certifications TEXT[] DEFAULT '{}',
    skill_level INTEGER DEFAULT 1 CHECK (skill_level >= 1 AND skill_level <= 5),

    -- Availability
    availability_notes TEXT,

    -- Audit fields
    added_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT crew_members_unique_active UNIQUE (crew_id, user_id, is_active),
    CONSTRAINT crew_members_valid_dates CHECK (
        left_at IS NULL OR joined_at <= left_at
    )
);

-- Create indexes for crew_members table
CREATE INDEX idx_crew_members_crew_id ON crew_members(crew_id);
CREATE INDEX idx_crew_members_user_id ON crew_members(user_id);
CREATE INDEX idx_crew_members_active ON crew_members(crew_id, is_active);
CREATE INDEX idx_crew_members_role ON crew_members(crew_id, role) WHERE is_active = TRUE;

-- Add comments
COMMENT ON TABLE crew_members IS 'Users assigned to crews with their roles';
COMMENT ON COLUMN crew_members.role IS 'Role within the crew (lead or member)';
COMMENT ON COLUMN crew_members.skill_level IS 'Skill level rating (1=beginner, 5=expert)';

-- ============================================================================
-- SECTION 6: CREATE JOB_ASSIGNMENTS TABLE
-- ============================================================================

-- Crews assigned to jobs with scheduling
CREATE TABLE IF NOT EXISTS job_assignments (
    -- Primary identifiers
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE RESTRICT,

    -- Scheduling
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,

    -- Status
    status assignment_status NOT NULL DEFAULT 'scheduled',

    -- Assignment details
    assignment_notes TEXT,
    work_description TEXT, -- Specific tasks for this crew

    -- Completion tracking
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    completion_notes TEXT,

    -- Resource planning
    estimated_hours DECIMAL(5, 2),
    actual_hours DECIMAL(5, 2),

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Audit fields
    assigned_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    completed_by_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT job_assignments_unique_active UNIQUE (job_id, crew_id, scheduled_start),
    CONSTRAINT job_assignments_valid_schedule CHECK (scheduled_start < scheduled_end),
    CONSTRAINT job_assignments_valid_actual CHECK (
        (actual_start IS NULL OR actual_end IS NULL) OR
        actual_start <= actual_end
    )
);

-- Create indexes for job_assignments table
CREATE INDEX idx_job_assignments_job_id ON job_assignments(job_id);
CREATE INDEX idx_job_assignments_crew_id ON job_assignments(crew_id);
CREATE INDEX idx_job_assignments_schedule ON job_assignments(scheduled_start, scheduled_end);
CREATE INDEX idx_job_assignments_status ON job_assignments(status);
CREATE INDEX idx_job_assignments_crew_schedule ON job_assignments(crew_id, scheduled_start, scheduled_end)
    WHERE status IN ('scheduled', 'in_progress');

-- Add comments
COMMENT ON TABLE job_assignments IS 'Crews assigned to jobs with scheduling information';
COMMENT ON COLUMN job_assignments.status IS 'Current status of the crew assignment';
COMMENT ON COLUMN job_assignments.completion_percentage IS 'Progress tracking (0-100%)';

-- ============================================================================
-- SECTION 7: CREATE JOB_NOTES TABLE
-- ============================================================================

-- Notes and updates on jobs
CREATE TABLE IF NOT EXISTS job_notes (
    -- Primary identifiers
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

    -- Note content
    note_type VARCHAR(50) DEFAULT 'general', -- general, ai_insight, customer_communication, internal, technical
    subject VARCHAR(255),
    content TEXT NOT NULL,

    -- AI integration
    is_ai_generated BOOLEAN DEFAULT FALSE,
    ai_confidence_score DECIMAL(3, 2), -- 0.00 to 1.00
    ai_model_version VARCHAR(50),
    ai_metadata JSONB DEFAULT '{}',

    -- Visibility
    is_internal BOOLEAN DEFAULT TRUE, -- Internal notes not shown to customers
    is_pinned BOOLEAN DEFAULT FALSE, -- Important notes pinned to top

    -- Attachments and references
    attachments JSONB DEFAULT '[]', -- Array of attachment metadata
    related_service_ids UUID[] DEFAULT '{}', -- References to job_services

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Audit fields
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT job_notes_valid_confidence CHECK (
        ai_confidence_score IS NULL OR
        (ai_confidence_score >= 0 AND ai_confidence_score <= 1)
    )
);

-- Create indexes for job_notes table
CREATE INDEX idx_job_notes_job_id ON job_notes(job_id);
CREATE INDEX idx_job_notes_created_by ON job_notes(created_by_user_id);
CREATE INDEX idx_job_notes_type ON job_notes(job_id, note_type);
CREATE INDEX idx_job_notes_ai_generated ON job_notes(job_id, is_ai_generated) WHERE is_ai_generated = TRUE;
CREATE INDEX idx_job_notes_pinned ON job_notes(job_id, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_job_notes_created_at ON job_notes(job_id, created_at DESC);

-- Add comments
COMMENT ON TABLE job_notes IS 'Chronological notes and AI insights for jobs';
COMMENT ON COLUMN job_notes.note_type IS 'Category of note (general, ai_insight, customer_communication, internal, technical)';
COMMENT ON COLUMN job_notes.is_ai_generated IS 'Whether this note was generated by AI';
COMMENT ON COLUMN job_notes.ai_confidence_score IS 'AI confidence score for generated insights (0-1)';

-- ============================================================================
-- SECTION 8: CREATE MATERIALIZED VIEW FOR JOB METRICS
-- ============================================================================

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS job_metrics;

-- Create materialized view for dashboard KPIs
CREATE MATERIALIZED VIEW job_metrics AS
WITH job_stats AS (
    SELECT
        j.company_id,
        j.status,
        COUNT(*) as job_count,
        SUM(j.estimated_total) as total_estimated,
        SUM(j.actual_total) as total_actual,
        AVG(j.estimated_total) as avg_estimated,
        AVG(j.actual_total) as avg_actual,
        COUNT(DISTINCT j.customer_id) as unique_customers,
        COUNT(CASE WHEN j.priority >= 8 THEN 1 END) as high_priority_count,
        COUNT(CASE WHEN j.actual_end_date > j.scheduled_end_date THEN 1 END) as overdue_count
    FROM jobs j
    WHERE j.created_at >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY j.company_id, j.status
),
crew_utilization AS (
    SELECT
        c.company_id,
        COUNT(DISTINCT ja.crew_id) as active_crews,
        AVG(ja.completion_percentage) as avg_completion,
        SUM(ja.actual_hours) as total_hours_worked,
        COUNT(CASE WHEN ja.status = 'in_progress' THEN 1 END) as assignments_in_progress
    FROM crews c
    LEFT JOIN job_assignments ja ON c.id = ja.crew_id
    WHERE c.is_active = TRUE
    GROUP BY c.company_id
),
service_popularity AS (
    SELECT
        j.company_id,
        js.service_name,
        COUNT(*) as usage_count,
        SUM(js.total_price) as total_revenue,
        AVG(js.total_price) as avg_price
    FROM jobs j
    JOIN job_services js ON j.id = js.job_id
    WHERE j.created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY j.company_id, js.service_name
)
SELECT
    COALESCE(js.company_id, cu.company_id) as company_id,
    js.status,
    js.job_count,
    js.total_estimated,
    js.total_actual,
    js.avg_estimated,
    js.avg_actual,
    js.unique_customers,
    js.high_priority_count,
    js.overdue_count,
    cu.active_crews,
    cu.avg_completion,
    cu.total_hours_worked,
    cu.assignments_in_progress,
    NOW() as last_refreshed
FROM job_stats js
FULL OUTER JOIN crew_utilization cu ON js.company_id = cu.company_id;

-- Create indexes on materialized view
CREATE UNIQUE INDEX idx_job_metrics_company_status ON job_metrics(company_id, status);
CREATE INDEX idx_job_metrics_company ON job_metrics(company_id);

-- Add comment
COMMENT ON MATERIALIZED VIEW job_metrics IS 'Pre-aggregated job metrics for dashboard KPIs';

-- ============================================================================
-- SECTION 9: CREATE UPDATE TRIGGERS
-- ============================================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers to all tables
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_services_updated_at BEFORE UPDATE ON job_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crews_updated_at BEFORE UPDATE ON crews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crew_members_updated_at BEFORE UPDATE ON crew_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_assignments_updated_at BEFORE UPDATE ON job_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_notes_updated_at BEFORE UPDATE ON job_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 10: CREATE ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_notes ENABLE ROW LEVEL SECURITY;

-- Jobs table policies
CREATE POLICY "Users can view jobs from their company" ON jobs
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert jobs for their company" ON jobs
    FOR INSERT WITH CHECK (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update jobs from their company" ON jobs
    FOR UPDATE USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete jobs from their company" ON jobs
    FOR DELETE USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

-- Job services table policies
CREATE POLICY "Users can view job services for their company jobs" ON job_services
    FOR SELECT USING (job_id IN (
        SELECT id FROM jobs WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert job services for their company jobs" ON job_services
    FOR INSERT WITH CHECK (job_id IN (
        SELECT id FROM jobs WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can update job services for their company jobs" ON job_services
    FOR UPDATE USING (job_id IN (
        SELECT id FROM jobs WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete job services for their company jobs" ON job_services
    FOR DELETE USING (job_id IN (
        SELECT id FROM jobs WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    ));

-- Crews table policies
CREATE POLICY "Users can view crews from their company" ON crews
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert crews for their company" ON crews
    FOR INSERT WITH CHECK (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update crews from their company" ON crews
    FOR UPDATE USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete crews from their company" ON crews
    FOR DELETE USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

-- Crew members table policies
CREATE POLICY "Users can view crew members from their company crews" ON crew_members
    FOR SELECT USING (crew_id IN (
        SELECT id FROM crews WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert crew members for their company crews" ON crew_members
    FOR INSERT WITH CHECK (crew_id IN (
        SELECT id FROM crews WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can update crew members for their company crews" ON crew_members
    FOR UPDATE USING (crew_id IN (
        SELECT id FROM crews WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete crew members from their company crews" ON crew_members
    FOR DELETE USING (crew_id IN (
        SELECT id FROM crews WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    ));

-- Job assignments table policies
CREATE POLICY "Users can view job assignments for their company jobs" ON job_assignments
    FOR SELECT USING (job_id IN (
        SELECT id FROM jobs WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert job assignments for their company jobs" ON job_assignments
    FOR INSERT WITH CHECK (job_id IN (
        SELECT id FROM jobs WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can update job assignments for their company jobs" ON job_assignments
    FOR UPDATE USING (job_id IN (
        SELECT id FROM jobs WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete job assignments for their company jobs" ON job_assignments
    FOR DELETE USING (job_id IN (
        SELECT id FROM jobs WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    ));

-- Job notes table policies
CREATE POLICY "Users can view job notes for their company jobs" ON job_notes
    FOR SELECT USING (job_id IN (
        SELECT id FROM jobs WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert job notes for their company jobs" ON job_notes
    FOR INSERT WITH CHECK (job_id IN (
        SELECT id FROM jobs WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can update job notes for their company jobs" ON job_notes
    FOR UPDATE USING (job_id IN (
        SELECT id FROM jobs WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete job notes for their company jobs" ON job_notes
    FOR DELETE USING (job_id IN (
        SELECT id FROM jobs WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    ));

-- ============================================================================
-- SECTION 11: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to generate job numbers
CREATE OR REPLACE FUNCTION generate_job_number(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_year INTEGER;
    v_count INTEGER;
    v_job_number VARCHAR;
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);

    -- Get the count of jobs for this company in the current year
    SELECT COUNT(*) + 1 INTO v_count
    FROM jobs
    WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = v_year;

    -- Generate job number in format: JOB-YYYY-NNNN
    v_job_number := FORMAT('JOB-%s-%s', v_year, LPAD(v_count::TEXT, 4, '0'));

    RETURN v_job_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate job totals
CREATE OR REPLACE FUNCTION calculate_job_totals(p_job_id UUID)
RETURNS TABLE(
    total_services DECIMAL,
    total_labor DECIMAL,
    total_materials DECIMAL,
    grand_total DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(js.total_price), 0) as total_services,
        COALESCE(j.labor_cost, 0) as total_labor,
        COALESCE(j.material_cost, 0) as total_materials,
        COALESCE(SUM(js.total_price), 0) + COALESCE(j.labor_cost, 0) + COALESCE(j.material_cost, 0) as grand_total
    FROM jobs j
    LEFT JOIN job_services js ON j.id = js.job_id
    WHERE j.id = p_job_id
    GROUP BY j.id, j.labor_cost, j.material_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to get crew availability
CREATE OR REPLACE FUNCTION get_crew_availability(
    p_crew_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_available BOOLEAN;
BEGIN
    -- Check if crew has any overlapping assignments
    SELECT NOT EXISTS(
        SELECT 1
        FROM job_assignments ja
        WHERE ja.crew_id = p_crew_id
        AND ja.status IN ('scheduled', 'in_progress')
        AND (
            (ja.scheduled_start, ja.scheduled_end) OVERLAPS (p_start_date, p_end_date)
        )
    ) INTO v_is_available;

    RETURN v_is_available;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh job metrics materialized view
CREATE OR REPLACE FUNCTION refresh_job_metrics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY job_metrics;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 12: GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on types to authenticated users
GRANT USAGE ON TYPE job_status TO authenticated;
GRANT USAGE ON TYPE assignment_status TO authenticated;
GRANT USAGE ON TYPE crew_role TO authenticated;

-- Grant permissions on tables to authenticated users
GRANT ALL ON jobs TO authenticated;
GRANT ALL ON job_services TO authenticated;
GRANT ALL ON crews TO authenticated;
GRANT ALL ON crew_members TO authenticated;
GRANT ALL ON job_assignments TO authenticated;
GRANT ALL ON job_notes TO authenticated;

-- Grant permissions on materialized view
GRANT SELECT ON job_metrics TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION generate_job_number TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_job_totals TO authenticated;
GRANT EXECUTE ON FUNCTION get_crew_availability TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_job_metrics TO authenticated;

-- ============================================================================
-- SECTION 13: CREATE SCHEDULED JOB FOR METRICS REFRESH
-- ============================================================================

-- Note: This would typically be set up as a cron job in Supabase
-- Example cron schedule: '0 */6 * * *' (every 6 hours)
-- SELECT cron.schedule('refresh-job-metrics', '0 */6 * * *', 'SELECT refresh_job_metrics();');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Migration verification queries:
-- SELECT COUNT(*) FROM jobs;
-- SELECT COUNT(*) FROM job_services;
-- SELECT COUNT(*) FROM crews;
-- SELECT COUNT(*) FROM crew_members;
-- SELECT COUNT(*) FROM job_assignments;
-- SELECT COUNT(*) FROM job_notes;
-- SELECT * FROM job_metrics LIMIT 1;