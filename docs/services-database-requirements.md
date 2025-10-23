# Services System Database Requirements

## Overview
This document outlines the database schema requirements for the dynamic services management system. This system allows company owners to create and configure their own services with custom variables, providing a hands-off experience for the development team.

## Required Tables

### 1. company_services
**Purpose:** Master table storing all services for each company

```sql
CREATE TABLE company_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  service_description TEXT,
  service_category VARCHAR(100), -- e.g., 'landscaping', 'maintenance', 'installation'
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  icon_name VARCHAR(50), -- Lucide icon name for UI
  base_price DECIMAL(10,2), -- Optional base pricing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- References users.id
  
  CONSTRAINT fk_company_services_company 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_company_services_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_company_services_company_id ON company_services(company_id);
CREATE INDEX idx_company_services_active ON company_services(company_id, is_active, display_order);
```

### 2. service_variables
**Purpose:** Dynamic variables/fields that can be configured for each service

```sql
CREATE TABLE service_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL,
  variable_name VARCHAR(100) NOT NULL, -- Internal name (e.g., 'square_footage')
  variable_label VARCHAR(255) NOT NULL, -- Display name (e.g., 'Square Footage')
  variable_type VARCHAR(20) NOT NULL, -- 'text', 'number', 'select', 'boolean', 'textarea'
  default_value TEXT,
  is_required BOOLEAN DEFAULT false,
  validation_rules JSONB, -- e.g., {"min": 1, "max": 1000, "pattern": "^[0-9]+$"}
  options JSONB, -- For select types: ["option1", "option2"] or [{"value": "val", "label": "Label"}]
  placeholder_text VARCHAR(255),
  help_text TEXT,
  display_order INTEGER DEFAULT 0,
  unit_of_measure VARCHAR(20), -- e.g., 'sq ft', 'linear ft', 'hours'
  affects_pricing BOOLEAN DEFAULT false,
  pricing_multiplier DECIMAL(8,4), -- How this variable affects final price
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_service_variables_service 
    FOREIGN KEY (service_id) REFERENCES company_services(id) ON DELETE CASCADE,
  CONSTRAINT chk_variable_type 
    CHECK (variable_type IN ('text', 'number', 'select', 'boolean', 'textarea', 'date', 'time'))
);

-- Indexes
CREATE INDEX idx_service_variables_service_id ON service_variables(service_id);
CREATE INDEX idx_service_variables_order ON service_variables(service_id, display_order);
```

### 3. service_templates (Optional)
**Purpose:** Pre-built service templates that companies can use as starting points

```sql
CREATE TABLE service_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(255) NOT NULL,
  template_description TEXT,
  industry VARCHAR(100), -- 'landscaping', 'hvac', 'plumbing', etc.
  service_data JSONB NOT NULL, -- Complete service configuration
  variable_data JSONB NOT NULL, -- Associated variables configuration
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Indexes
CREATE INDEX idx_service_templates_industry ON service_templates(industry, is_public);
```

### 4. service_instances (Optional - For Quote Integration)
**Purpose:** Store actual service configurations used in specific quotes

```sql
CREATE TABLE service_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID, -- References quotes table
  service_id UUID NOT NULL,
  instance_data JSONB NOT NULL, -- Actual values for all variables
  calculated_price DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_service_instances_service 
    FOREIGN KEY (service_id) REFERENCES company_services(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_service_instances_quote ON service_instances(quote_id);
CREATE INDEX idx_service_instances_service ON service_instances(service_id);
```

## Required Relationships

### companies Table Updates
Ensure the existing `companies` table has a `settings` JSONB column for storing company-wide service preferences:

```sql
-- If not already present
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Example settings structure:
{
  "services": {
    "auto_calculate_pricing": true,
    "require_all_variables": false,
    "default_service_category": "landscaping",
    "pricing_markup_percentage": 20
  }
}
```

## Sample Data Structures

### Variable Types Examples

#### Text Variable
```json
{
  "variable_name": "project_description",
  "variable_label": "Project Description", 
  "variable_type": "textarea",
  "is_required": true,
  "placeholder_text": "Describe the landscaping project in detail...",
  "validation_rules": {"maxLength": 1000}
}
```

#### Number Variable
```json
{
  "variable_name": "square_footage",
  "variable_label": "Area Size",
  "variable_type": "number", 
  "is_required": true,
  "unit_of_measure": "sq ft",
  "affects_pricing": true,
  "pricing_multiplier": 1.5,
  "validation_rules": {"min": 1, "max": 10000}
}
```

#### Select Variable
```json
{
  "variable_name": "grass_type",
  "variable_label": "Grass Type",
  "variable_type": "select",
  "is_required": true,
  "options": [
    {"value": "bermuda", "label": "Bermuda Grass", "price_modifier": 0},
    {"value": "zoysia", "label": "Zoysia Grass", "price_modifier": 1.2},
    {"value": "fescue", "label": "Fescue Grass", "price_modifier": 0.8}
  ]
}
```

#### Boolean Variable
```json
{
  "variable_name": "irrigation_needed",
  "variable_label": "Include Irrigation System",
  "variable_type": "boolean",
  "default_value": "false",
  "affects_pricing": true,
  "pricing_multiplier": 2500
}
```

## Permissions & Security

### Row Level Security (RLS)
Enable RLS on all service-related tables to ensure companies can only access their own data:

```sql
-- Enable RLS
ALTER TABLE company_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_instances ENABLE ROW LEVEL SECURITY;

-- Example policy for company_services
CREATE POLICY company_services_company_access ON company_services
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
```

### User Permissions
- **Company Owners/Admins:** Full CRUD access to their company's services
- **Technicians:** Read access to active services only
- **Templates:** Public templates readable by all, creation restricted to admins

## Migration Strategy

### Phase 1: Core Tables
1. Create `company_services` table
2. Create `service_variables` table
3. Add necessary indexes and constraints

### Phase 2: Enhanced Features
1. Add `service_templates` table
2. Implement `service_instances` for quote integration
3. Add pricing calculation functions

### Phase 3: Optimization
1. Add additional indexes based on usage patterns
2. Implement materialized views for complex queries
3. Add audit triggers for change tracking

## API Endpoints Needed

The frontend will expect these API patterns:

- `GET /api/services` - List company services
- `POST /api/services` - Create new service
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service
- `GET /api/services/:id/variables` - Get service variables
- `POST /api/services/:id/variables` - Add variable to service
- `PUT /api/variables/:id` - Update variable
- `DELETE /api/variables/:id` - Delete variable
- `GET /api/service-templates` - List available templates

## Notes

- All JSONB fields should have GIN indexes for efficient querying
- Consider implementing soft deletes for audit purposes
- Variable validation should happen both client-side and server-side
- Pricing calculations should be cached for performance
- Service templates should be versioned for updates