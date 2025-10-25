# Master Profit Pipeline Flow

## Document Information
- **Version:** 1.0.0
- **Date:** 2025-01-24
- **Purpose:** Complete end-to-end profit pipeline mapping from customer acquisition through job completion, payment, and crew operations
- **Replaces:** `crm-service-layer-architecture.md` (conceptual reference only)

## Table of Contents
1. [Pipeline Overview](#pipeline-overview)
2. [Database Schema Map](#database-schema-map)
3. [Pipeline Phases](#pipeline-phases)
4. [Data Synchronization Map](#data-synchronization-map)
5. [JSONB Field Structures](#jsonb-field-structures)
6. [Critical Integration Points](#critical-integration-points)
7. [Crew Management Deep Dive](#crew-management-deep-dive)
8. [Validation Checklists](#validation-checklists)

---

## Pipeline Overview

### Complete Profit Pipeline Flow

```
┌─────────────────┐
│ Phase 1:        │
│ Customer        │  → Customer data stored in crm_customers
│ Acquisition     │     (lifecycle_stage: prospect → lead → customer)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Phase 2:        │
│ Job Creation &  │  → Job created in ops_jobs (status: quote)
│ Service         │     Services selected and calculated
│ Selection       │     → ops_job_services + svc_pricing_configs
└────────┬────────┘     → calculation_data (labor hours, pricing)
         │
         ▼
┌─────────────────┐
│ Phase 3:        │
│ Quote →         │  → ops_jobs.status: quote → approved
│ Approval        │     quote_approved_at timestamp set
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Phase 4:        │
│ Invoice         │  → ops_jobs: invoice_number, invoiced_at
│ Generation      │     status → invoiced
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Phase 5:        │
│ Payment         │  → billing_payments record created
│ Processing      │     ops_jobs.paid_at set when payment succeeds
└────────┬────────┘     (Stripe integration: payment_intent_id)
         │
         ▼
┌─────────────────┐
│ Phase 6:        │
│ Job Scheduling  │  → ops_jobs: scheduled_start_date, scheduled_end_date
│                 │     calculation_data.tier1Results.totalManHours
│                 │     → drives estimated_hours in assignments
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Phase 7:        │
│ Crew Assignment │  → ops_job_assignments created
│ & Preparation   │     Links: job → crew via ops_crews
│                 │     Crew capacity and utilization tracked
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Phase 8:        │
│ Field Operations│  → Clock-ins: actual_start, actual_end
│ (Crew Work)     │     Check-ins: metadata JSONB (timestamps, GPS)
│                 │     Notes: ops_job_notes (field updates, upcharges)
│                 │     Progress: completion_percentage updates
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Phase 9:        │
│ Job Completion  │  → ops_job_assignments.status → completed
│ Confirmation    │     ops_jobs.status → completed
│                 │     actual_end_date set
│                 │     Final crew sign-off
└─────────────────┘
```

---

## Database Schema Map

### Table Relationships and Foreign Keys

```
crm_customers (20 columns)
├── id (uuid, PK)
├── company_id (uuid, FK → companies.id)
└── Referenced by: ops_jobs.customer_id

ops_jobs (35 columns)
├── id (uuid, PK)
├── customer_id (uuid, FK → crm_customers.id)
├── company_id (uuid, FK → companies.id)
├── Referenced by: ops_job_services.job_id
├── Referenced by: ops_job_assignments.job_id
└── Referenced by: ops_job_notes.job_id

ops_job_services (18 columns)
├── id (uuid, PK)
├── job_id (uuid, FK → ops_jobs.id)
├── service_config_id (uuid, FK → svc_pricing_configs.id)
└── calculation_data (JSONB) ← Pricing engine outputs

svc_pricing_configs (15 columns)
├── id (uuid, PK)
├── company_id (uuid, FK → companies.id)
├── variables_config (JSONB) ← Formula definitions
├── default_variables (JSONB)
└── Referenced by: ops_job_services.service_config_id
                   svc_materials.service_config_id

svc_materials (29 columns)
├── id (uuid, PK)
├── company_id (uuid, FK → companies.id)
├── service_config_id (uuid, FK → svc_pricing_configs.id)
└── material_category (text, references svc_material_categories)

svc_material_categories (13 columns)
├── id (uuid, PK)
├── company_id (uuid, FK → companies.id)
├── service_config_id (uuid, FK → svc_pricing_configs.id)
└── category_key (text) ← Links to svc_materials.material_category

ops_crews (14 columns)
├── id (uuid, PK)
├── company_id (uuid, FK → companies.id)
├── crew_lead_user_id (uuid, FK → users.id)
└── Referenced by: ops_job_assignments.crew_id
                   ops_crew_members.crew_id

ops_crew_members (13 columns)
├── id (uuid, PK)
├── crew_id (uuid, FK → ops_crews.id)
├── user_id (uuid, FK → users.id)
└── role (crew_role ENUM: lead, member, trainee)

ops_job_assignments (19 columns)
├── id (uuid, PK)
├── job_id (uuid, FK → ops_jobs.id)
├── crew_id (uuid, FK → ops_crews.id)
├── actual_start (timestamp) ← Clock-in time
├── actual_end (timestamp) ← Clock-out time
└── metadata (JSONB) ← Check-ins, GPS, field data

ops_job_notes (17 columns)
├── id (uuid, PK)
├── job_id (uuid, FK → ops_jobs.id)
├── note_type (varchar: general, field_update, crew_note, upcharge_request, ai_insight)
├── metadata (JSONB)
└── ai_metadata (JSONB) ← For AI-generated insights

billing_payments (20 columns)
├── id (uuid, PK)
├── company_id (uuid, FK → companies.id)
├── amount (numeric)
├── status (varchar: pending, processing, succeeded, failed)
├── stripe_payment_intent_id (text)
└── metadata (JSONB)
```

---

## Pipeline Phases

### Phase 1: Customer Acquisition

**Primary Table:** `crm_customers`

**Key Fields:**
- `id` (uuid, PK) - Customer unique identifier
- `company_id` (uuid, FK) - Multi-tenant isolation
- `customer_name` (varchar) - Customer display name
- `customer_email` (varchar) - Primary contact email
- `customer_phone` (varchar) - Primary contact phone
- `customer_address`, `customer_city`, `customer_state`, `customer_zip` - Service location data
- `lifecycle_stage` (varchar: prospect, lead, customer, churned) - Customer status
- `source` (varchar) - Lead source tracking (referral, website, paid_ad, organic, etc.)
- `tags` (text[]) - Customer categorization
- `customer_notes` (text) - Internal notes about customer
- `created_at` (timestamptz)

**Outputs for Next Phase:**
- `customer_id` → Used in `ops_jobs.customer_id`
- Customer contact and address data → Pre-fills job service address

**Validation Checks:**
- Valid contact information (email OR phone required)
- `lifecycle_stage` must be 'lead' or 'customer' before creating job
- `company_id` matches authenticated user's company

---

### Phase 2: Job Creation & Service Selection

**Primary Tables:** `ops_jobs`, `ops_job_services`, `svc_pricing_configs`, `svc_materials`, `svc_material_categories`

#### ops_jobs Table (35 columns)

**Core Identity:**
- `id` (uuid, PK)
- `job_number` (varchar, UNIQUE) - Format: JOB-YYYY-###
- `company_id` (uuid, FK)
- `customer_id` (uuid, FK → crm_customers.id)

**Job Details:**
- `title` (varchar) - Job display name
- `description` (text) - Detailed job description
- `service_address`, `service_city`, `service_state`, `service_zip` - Job location
- `property_type` (varchar: residential, commercial, industrial)
- `access_notes` (text) - Site access instructions

**Status & Workflow:**
- `status` (varchar: quote, approved, scheduled, in_progress, completed, invoiced, cancelled)
- `priority` (integer, 1-10, default 5)
- `tags` (text[]) - Job categorization

**Financial Fields:**
- `estimated_total` (numeric) - Sum of ops_job_services.total_price
- `actual_total` (numeric) - Final billed amount (includes field upcharges)
- `labor_cost` (numeric) - Calculated labor expenses
- `material_cost` (numeric) - Calculated material expenses
- `deposit_amount` (numeric)
- `deposit_received` (boolean)
- `deposit_received_date` (timestamptz)

**Timeline Fields:**
- `requested_start_date` (date) - Customer's preferred start
- `scheduled_start_date` (date) - Actual scheduled start
- `scheduled_end_date` (date) - Planned completion date
- `actual_start_date` (date) - When work actually began
- `actual_end_date` (date) - When work actually completed

**Status Timestamps:**
- `quote_approved_at` (timestamptz) - When customer approved quote
- `invoiced_at` (timestamptz) - When invoice was generated
- `invoice_due_date` (date) - Payment due date
- `paid_at` (timestamptz) - When payment received

**Invoice:**
- `invoice_number` (varchar) - Invoice reference number

**Metadata:**
- `metadata` (JSONB) - Extensible job data
- `created_at`, `updated_at` (timestamptz)
- `created_by_user_id`, `updated_by_user_id` (uuid, FK → users.id)

#### ops_job_services Table (18 columns)

**Links:**
- `id` (uuid, PK)
- `job_id` (uuid, FK → ops_jobs.id)
- `service_config_id` (uuid, FK → svc_pricing_configs.id)

**Service Details:**
- `service_name` (varchar) - e.g., "Paver Patio Installation"
- `service_description` (text) - Detailed service description
- `quantity` (integer, default 1) - Number of units
- `unit_price` (numeric) - Price per unit
- `total_price` (numeric) - quantity × unit_price (after calculations)

**Pricing Calculation Data (CRITICAL FOR SCHEDULING):**
- `calculation_data` (JSONB) - **Complete pricing calculation output**
  - `tier1Results` → **Contains labor hours and job duration**
  - `tier2Results` → **Contains all cost breakdowns**
- `pricing_variables` (JSONB) - Input variables used for calculation
  - Example: `{"sqft": 500, "complexity": "medium", "sealerUpgrade": true}`

**Service Status:**
- `is_completed` (boolean) - Service-level completion tracking
- `completed_at` (timestamptz)

**Notes & Metadata:**
- `notes` (text) - Service-specific notes
- `metadata` (JSONB) - Additional service data
  - `source` (string) - 'quick_calculator', 'ai_chat', 'manual'
  - `service_id` (string) - Service type identifier
  - `breakdown` (string) - Human-readable calculation breakdown

**Audit:**
- `added_by_user_id` (uuid, FK → users.id)
- `created_at`, `updated_at` (timestamptz)

#### svc_pricing_configs Table (15 columns)

**Configuration:**
- `id` (uuid, PK)
- `company_id` (uuid, FK)
- `service_id` (varchar) - Service type identifier (e.g., 'paver_patio_sqft')
- `service` (varchar) - Display name
- `description` (text)

**Pricing Formula Configuration:**
- `variables_config` (JSONB) - **Formula definitions and calculation tiers**
  - Tier 1: Labor hour calculations
  - Tier 2: Cost calculations (materials, equipment, profit)
  - Variable definitions (types, ranges, defaults)
- `default_variables` (JSONB) - Default values for pricing variables

**Pricing Parameters:**
- `hourly_labor_rate` (numeric) - Labor rate per hour
- `optimal_team_size` (integer) - Recommended crew size
- `base_productivity` (numeric) - Base productivity rate
- `profit_margin` (numeric) - Markup percentage
- `waste_factor` (numeric) - Material waste percentage

**Metadata:**
- `is_active` (boolean)
- `created_at`, `updated_at` (timestamptz)

#### svc_materials & svc_material_categories

**Materials attach to service configs and provide:**
- Material selection options for calculations
- Pricing per unit (price_per_unit, units_per_package)
- Physical specifications (length, width, thickness, weight)
- Coverage calculations (coverage_per_unit, coverage_depth_inches)
- Waste and compaction factors

**Material categories define:**
- Material groupings (e.g., "base", "pavers", "sand", "edging")
- Calculation methods (area_based, perimeter_based, volume_based)
- Default depths for volume calculations

**Data Flow: Pricing Calculation → Scheduling**

```
svc_pricing_configs.variables_config
    ↓ (Defines formula)
Quick Calculator / AI Chat → User Input (sqft, complexity, etc.)
    ↓
Pricing Engine Calculation
    ↓
calculation_data = {
    tier1Results: {
        totalManHours: 24,    ← USED FOR SCHEDULING
        totalDays: 3,         ← USED FOR SCHEDULING
        baseHours: 8,
        adjustedHours: 8,
        breakdown: ["Base calculation", "Complexity adjustment"]
    },
    tier2Results: {
        laborCost: 1200,
        materialCostBase: 800,
        totalMaterialCost: 880,
        equipmentCost: 150,
        subtotal: 2230,
        profit: 446,
        total: 2676,
        pricePerSqft: 26.76
    },
    calculationDate: "2025-01-24T..."
}
    ↓
Stored in ops_job_services.calculation_data
    ↓
ops_job_services.total_price → summed → ops_jobs.estimated_total
```

**Outputs for Next Phase:**
- `estimated_total` → Customer sees quote amount
- `calculation_data.tier1Results.totalManHours` → Used in Phase 6 (Scheduling)
- `calculation_data.tier1Results.totalDays` → Used in Phase 6 (Scheduling)
- Service line items ready for approval

**Validation Checks:**
- At least one service added to job
- All services have valid `service_config_id`
- Pricing calculations completed (calculation_data populated)
- `estimated_total` matches sum of service `total_price` values
- Service quantities > 0

---

### Phase 3: Quote → Approval

**Primary Table:** `ops_jobs`

**Status Transition:**
```
ops_jobs.status: 'quote' → 'approved'
```

**Fields Updated:**
- `quote_approved_at` (timestamptz) - Set to current timestamp
- `status` = 'approved'

**Validation Checks:**
- Customer approval recorded (can be manual flag or e-signature reference)
- Payment terms agreed (deposit amount set if required)
- Service address confirmed
- All services finalized (no pending calculations)

**Outputs for Next Phase:**
- Job ready for invoicing or scheduling
- Customer commitment confirmed

---

### Phase 4: Invoice Generation

**Primary Table:** `ops_jobs`

**Status Transition:**
```
ops_jobs.status: 'approved' → 'invoiced'
```

**Fields Updated:**
- `invoice_number` (varchar) - Generated invoice reference (e.g., INV-2025-001)
- `invoiced_at` (timestamptz) - Invoice generation timestamp
- `invoice_due_date` (date) - Payment due date (e.g., invoiced_at + 30 days)
- `status` = 'invoiced'

**Invoice Details:**
- Total amount: `estimated_total` (or `actual_total` if job completed)
- Line items: From `ops_job_services`
- Customer: From `crm_customers` via `customer_id`

**Validation Checks:**
- All services finalized
- Total calculated correctly
- Customer billing information valid
- Deposit applied if received

**Outputs for Next Phase:**
- Invoice sent to customer
- Payment tracking begins

---

### Phase 5: Payment Processing

**Primary Tables:** `billing_payments`, `ops_jobs`

#### billing_payments Table (20 columns)

**Payment Record:**
- `id` (uuid, PK)
- `company_id` (uuid, FK)
- `amount` (numeric) - Payment amount
- `status` (varchar: pending, processing, succeeded, failed)
- `payment_type` (varchar: job_payment, monthly_subscription, deposit, etc.)

**Processing:**
- `processed_at` (timestamp) - When payment completed
- `bank_account_name` (varchar)
- `bank_account_last4` (varchar)

**Stripe Integration:**
- `stripe_payment_intent_id` (text) - Stripe PaymentIntent ID
- `stripe_charge_id` (text) - Stripe Charge ID
- `stripe_subscription_id` (text) - For recurring payments
- `stripe_invoice_id` (text) - Stripe Invoice ID

**ACH Specific:**
- `ach_status` (varchar) - ACH-specific status
- `failure_code` (varchar) - Error code if failed
- `failure_message` (text) - Human-readable error

**Subscription Fields:**
- `subscription_period_start` (date)
- `subscription_period_end` (date)

**Metadata:**
- `metadata` (JSONB) - Additional payment data
  - Can store: job_id, invoice_number, payment_method_details
- `created_at`, `updated_at` (timestamptz)

**Data Flow: Payment Success → Job Update**

```
Customer Payment (Stripe/ACH)
    ↓
billing_payments.status = 'succeeded'
billing_payments.processed_at = NOW()
    ↓
Webhook/Confirmation
    ↓
ops_jobs.paid_at = billing_payments.processed_at
ops_jobs.status → Can move to 'scheduled' or remain 'invoiced'
```

**Validation Checks:**
- Payment amount matches invoice amount (or is partial payment)
- Stripe payment_intent_id valid
- Payment status = 'succeeded' before marking job as paid
- `paid_at` timestamp only set when payment confirmed

**Outputs for Next Phase:**
- Job payment confirmed
- Ready for scheduling
- Revenue recognized

---

### Phase 6: Job Scheduling

**Primary Tables:** `ops_jobs`, `ops_job_assignments`

#### ops_jobs Updates

**Fields Set:**
- `scheduled_start_date` (date) - Planned work start date
- `scheduled_end_date` (date) - Planned completion date
- `status` = 'scheduled'

**Scheduling Inputs from Pricing Calculation:**
```
ops_job_services.calculation_data.tier1Results.totalManHours
    ↓
ops_job_assignments.estimated_hours

ops_job_services.calculation_data.tier1Results.totalDays
    ↓
Used to calculate scheduled_end_date from scheduled_start_date
```

#### ops_job_assignments Table (19 columns)

**Assignment Record:**
- `id` (uuid, PK)
- `job_id` (uuid, FK → ops_jobs.id)
- `crew_id` (uuid, FK → ops_crews.id)

**Schedule:**
- `scheduled_start` (timestamptz) - Planned start date/time
- `scheduled_end` (timestamptz) - Planned end date/time
- `work_description` (text) - What crew will be doing

**Time Tracking (CRITICAL FOR CREW OPERATIONS):**
- `estimated_hours` (numeric) - **From calculation_data.tier1Results.totalManHours**
- `actual_hours` (numeric) - **Filled during Phase 8 (field work)**
- `actual_start` (timestamptz) - **Clock-in timestamp (Phase 8)**
- `actual_end` (timestamptz) - **Clock-out timestamp (Phase 9)**

**Status & Progress:**
- `status` (varchar: scheduled, in_progress, completed, cancelled)
- `completion_percentage` (integer, 0-100) - Progress tracking

**Assignment Details:**
- `notes` (text) - Assignment-specific notes
- `requires_special_equipment` (boolean)
- `special_equipment_notes` (text)

**Metadata (EXTENSIBLE - CRITICAL FOR FIELD OPS):**
- `metadata` (JSONB) - **Stores check-ins, GPS coordinates, field data**
  - Example structure:
    ```json
    {
      "check_ins": [
        {
          "timestamp": "2025-01-24T08:15:00Z",
          "location": {"lat": 40.7128, "lng": -74.0060},
          "crew_member_id": "uuid",
          "note": "Arrived on site, beginning setup"
        }
      ],
      "daily_logs": [
        {
          "date": "2025-01-24",
          "hours_worked": 8,
          "weather": "Clear, 75°F",
          "progress_notes": "Completed excavation"
        }
      ],
      "materials_used": [
        {
          "material_id": "uuid",
          "quantity": 50,
          "unit": "sqft"
        }
      ]
    }
    ```

**Audit:**
- `assigned_by_user_id` (uuid, FK → users.id)
- `created_at`, `updated_at` (timestamptz)

**Data Flow: Calculation → Scheduling**

```
Job Created with Services
    ↓
ops_job_services[0].calculation_data.tier1Results.totalManHours = 24
ops_job_services[0].calculation_data.tier1Results.totalDays = 3
    ↓
Scheduler assigns crew
    ↓
ops_job_assignments.estimated_hours = 24
ops_job_assignments.scheduled_start = "2025-02-01 08:00"
ops_job_assignments.scheduled_end = "2025-02-03 17:00"
    (3 days based on totalDays)
    ↓
ops_jobs.scheduled_start_date = "2025-02-01"
ops_jobs.scheduled_end_date = "2025-02-03"
ops_jobs.status = 'scheduled'
```

**Crew Utilization Tracking:**
- Query `ops_job_assignments` WHERE status IN ('scheduled', 'in_progress')
- Sum `estimated_hours` per crew_id to see workload
- Compare against crew capacity (`ops_crews.max_capacity`)

**Validation Checks:**
- Crew availability confirmed (no overlapping assignments)
- `estimated_hours` matches calculation data from services
- `scheduled_start` >= current date
- Crew has required specializations for job
- Crew capacity not exceeded

**Outputs for Next Phase:**
- Crew assigned and notified
- Schedule locked in
- Ready for field work

#### Calendar UI Integration

**Visual Scheduling Interface:** The scheduling process described above is implemented through a drag-and-drop calendar interface in the ScheduleTab component.

**UI Implementation Reference:** [docs/SCHEDULING_CALENDAR_IMPLEMENTATION.md](../../SCHEDULING_CALENDAR_IMPLEMENTATION.md)

**Key UI Features:**
1. **Week Timeline View** - Visual calendar grid showing 7-day columns
2. **Crew Rows** - Each crew (`ops_crews`) gets a row with color-coded indicators
3. **Draggable Job Blocks** - Jobs displayed as blocks that can be dragged to assign crews
4. **Real-time Conflict Detection** - Visual indicators when assignments overlap
5. **Crew Utilization Display** - Shows capacity percentage based on `estimated_hours` and `max_capacity`

**Drag-Drop Workflow:**
```
User drags job block from "Unassigned" section
    ↓
Drops on crew row at specific date
    ↓
UI extracts calculation_data.tier1Results (totalManHours, totalDays)
    ↓
Runs conflict detection query (from this document)
    ↓
If no conflicts:
  - Creates ops_job_assignments record with estimated_hours
  - Updates ops_jobs.status = 'scheduled'
  - Updates ops_jobs.scheduled_start_date and scheduled_end_date
  - Refreshes calendar display
    ↓
Calendar shows job block in crew row with:
  - Width = totalDays × column_width
  - Background color = crew.color_code
  - Progress bar from completion_percentage
```

**Database-UI Field Mapping:**
- `crew_name` → Crew row header label
- `color_code` → Job block background color
- `scheduled_start/end` → Block position and width in calendar
- `status` → Border color (scheduled=purple, in_progress=orange, completed=green)
- `completion_percentage` → Progress bar fill
- `estimated_hours` → Used in utilization calculation display

**Calendar-Specific Metadata:**
The `ops_job_assignments.metadata` JSONB field can store calendar UI preferences:
```json
{
  "assigned_via": "calendar_drag_drop",
  "assigned_at": "2025-01-24T10:30:00Z",
  "assigned_by_user_id": "user-uuid",
  "calendar_view_preferences": {
    "display_mode": "compact",
    "show_customer_name": true
  }
}
```

---

### Phase 7: Crew Assignment & Preparation

**Primary Tables:** `ops_crews`, `ops_crew_members`, `ops_job_assignments`

#### ops_crews Table (14 columns)

**Crew Definition:**
- `id` (uuid, PK)
- `company_id` (uuid, FK)
- `crew_name` (varchar) - Display name (e.g., "Team Alpha")
- `crew_code` (varchar) - Short code (e.g., "CREW-01")
- `description` (text) - Crew details

**Leadership:**
- `crew_lead_user_id` (uuid, FK → users.id) - Crew leader

**Capabilities:**
- `specializations` (text[]) - Array of specializations
  - Example: `['paver_installation', 'excavation', 'retaining_walls']`
- `max_capacity` (integer, default 5) - Maximum concurrent job capacity

**Status:**
- `is_active` (boolean, default true) - Crew availability

**Visual:**
- `color_code` (varchar) - For calendar/schedule display

**Metadata:**
- `metadata` (JSONB) - Extensible crew data
  - Can store: equipment owned, certifications, service areas
- `created_by_user_id` (uuid, FK → users.id)
- `created_at`, `updated_at` (timestamptz)

#### ops_crew_members Table (13 columns)

**Membership:**
- `id` (uuid, PK)
- `crew_id` (uuid, FK → ops_crews.id)
- `user_id` (uuid, FK → users.id)
- `role` (crew_role ENUM: lead, member, trainee)

**Timeline:**
- `joined_at` (timestamptz) - When joined crew
- `left_at` (timestamptz) - When left crew (if applicable)
- `is_active` (boolean, default true) - Currently active member

**Skills:**
- `certifications` (text[]) - Member certifications
- `skill_level` (integer, 1-10, default 1) - Proficiency level
- `availability_notes` (text) - Availability constraints

**Audit:**
- `added_by_user_id` (uuid, FK → users.id)
- `created_at`, `updated_at` (timestamptz)

**Crew Utilization Calculation:**

```sql
-- Current crew workload
SELECT
  c.id,
  c.crew_name,
  c.max_capacity,
  COUNT(ja.id) as active_assignments,
  SUM(ja.estimated_hours) as total_estimated_hours,
  ARRAY_AGG(j.job_number) as assigned_jobs
FROM ops_crews c
LEFT JOIN ops_job_assignments ja ON ja.crew_id = c.id
  AND ja.status IN ('scheduled', 'in_progress')
LEFT JOIN ops_jobs j ON j.id = ja.job_id
WHERE c.company_id = 'company-uuid'
  AND c.is_active = true
GROUP BY c.id, c.crew_name, c.max_capacity;
```

**Validation Checks:**
- Crew has required specializations for job services
- Crew capacity not exceeded (active assignments < max_capacity)
- Crew members are active
- Crew lead assigned
- No scheduling conflicts for crew

**Outputs for Next Phase:**
- Crew prepared and aware of assignment
- Crew has access to job details, location, customer info
- Ready to begin field work

---

### Phase 8: Field Operations (Crew Work)

**Primary Tables:** `ops_job_assignments`, `ops_job_notes`

This phase represents the actual work execution in the field by the crew.

#### Clock-In / Clock-Out

**ops_job_assignments Fields:**
- `actual_start` (timestamptz) - **Set when crew clocks in for the first time**
- `actual_end` (timestamptz) - **Set when crew clocks out for the last time**
- `status` - **Changes: 'scheduled' → 'in_progress' (on clock-in)**

**Clock-in Workflow:**
```
Crew arrives on site → Mobile app clock-in
    ↓
ops_job_assignments.actual_start = NOW() (if first clock-in)
ops_job_assignments.status = 'in_progress'
ops_jobs.status = 'in_progress' (if not already)
ops_jobs.actual_start_date = TODAY() (if first day)
```

**Clock-out Workflow:**
```
Crew finishes work for day → Mobile app clock-out
    ↓
Calculate daily hours worked
Add to ops_job_assignments.actual_hours
Log daily hours in metadata.daily_logs
```

#### Check-Ins

**Check-ins are stored in ops_job_assignments.metadata (JSONB)**

**Metadata Structure for Check-ins:**
```json
{
  "check_ins": [
    {
      "timestamp": "2025-01-24T08:15:00Z",
      "location": {
        "lat": 40.7128,
        "lng": -74.0060,
        "accuracy": 10
      },
      "crew_member_id": "user-uuid",
      "crew_member_name": "John Doe",
      "type": "arrival|progress|issue|departure",
      "note": "Arrived on site, beginning setup",
      "photos": ["url1", "url2"]
    },
    {
      "timestamp": "2025-01-24T12:00:00Z",
      "location": {...},
      "crew_member_id": "user-uuid",
      "type": "progress",
      "note": "50% complete with excavation",
      "completion_update": 50
    }
  ],
  "daily_logs": [
    {
      "date": "2025-01-24",
      "hours_worked": 8,
      "crew_members_present": ["uuid1", "uuid2"],
      "weather": "Clear, 75°F",
      "progress_notes": "Completed excavation and base layer",
      "materials_used": [
        {"material_name": "Gravel", "quantity": 10, "unit": "tons"}
      ],
      "equipment_used": ["Excavator", "Compactor"]
    }
  ]
}
```

**Check-in Types:**
- **arrival** - Crew arrived on site
- **progress** - Progress update with optional completion percentage
- **issue** - Problem or blocker encountered
- **departure** - Crew leaving site for the day

#### Progress Updates

**ops_job_assignments.completion_percentage (integer, 0-100)**

Updated via:
- Manual crew input during check-ins
- Automated calculation based on time spent vs. estimated hours
- Crew lead assessment at end of day

**Progress Workflow:**
```
Crew provides progress update (e.g., "75% complete")
    ↓
ops_job_assignments.completion_percentage = 75
    ↓
Update stored in metadata.check_ins[].completion_update
    ↓
Dashboard/scheduler can display real-time progress
```

#### Field Notes

**ops_job_notes Table (17 columns)**

**Note Record:**
- `id` (uuid, PK)
- `job_id` (uuid, FK → ops_jobs.id)
- `note_type` (varchar) - **Types:**
  - `general` - General job note
  - `field_update` - Field status update from crew
  - `crew_note` - Crew-specific note
  - `upcharge_request` - Anomaly requiring additional work/cost
  - `ai_insight` - AI-generated insight
- `subject` (varchar) - Note title
- `content` (text) - Note body (REQUIRED)

**AI Fields:**
- `is_ai_generated` (boolean, default false)
- `ai_confidence_score` (numeric) - AI confidence (0-1)
- `ai_model_version` (varchar)
- `ai_metadata` (JSONB) - AI analysis data

**Visibility:**
- `is_internal` (boolean, default true) - Internal vs. customer-visible
- `is_pinned` (boolean, default false) - Pin important notes

**Attachments:**
- `attachments` (JSONB) - Array of file/photo URLs
  - Example: `[{"url": "s3://...", "type": "image/jpeg", "filename": "issue-photo.jpg"}]`

**Relations:**
- `related_service_ids` (uuid[]) - Link note to specific services

**Metadata:**
- `metadata` (JSONB) - Extensible note data
  - Can store: GPS location, weather conditions, crew_member_id

**Audit:**
- `created_by_user_id` (uuid, FK → users.id)
- `created_at`, `updated_at` (timestamptz)

**Field Note Workflow:**
```
Crew encounters issue (e.g., hidden rock requiring extra excavation)
    ↓
Crew creates note via mobile app:
  note_type = 'field_update' or 'upcharge_request'
  content = "Encountered large rock, requires additional excavation"
  attachments = [photo of rock]
  metadata = {location: {lat, lng}, timestamp, crew_member_id}
    ↓
ops_job_notes record created
    ↓
Office staff receives notification
Can respond with approval, pricing adjustment, or instructions
```

#### On-the-Fly Updates/Upcharges

**Upcharge Workflow:**

```
Crew detects anomaly requiring extra work
    ↓
Create ops_job_notes:
  note_type = 'upcharge_request'
  content = Description of additional work needed
  attachments = Photos of issue
  metadata = {
    estimated_additional_hours: 4,
    estimated_additional_cost: 800,
    requires_approval: true
  }
    ↓
Office/Manager reviews note
    ↓
If approved:
  - Create new ops_job_services record for additional work
  - Update ops_jobs.actual_total
  - Update crew assignment estimated_hours
  - Notify customer of change order
```

**Status Transition During Field Work:**
```
ops_job_assignments.status: 'in_progress'
ops_jobs.status: 'in_progress'
```

**Validation Checks:**
- Crew clocked in before logging progress
- Check-in GPS coordinates match job service_address (within tolerance)
- Daily hours don't exceed reasonable limits (e.g., 12 hours/day)
- Progress updates are sequential (completion_percentage only increases)

**Outputs for Next Phase:**
- Actual hours worked tracked
- Progress documented
- Issues and upcharges recorded
- Ready for job completion confirmation

---

### Phase 9: Job Completion Confirmation

**Primary Tables:** `ops_job_assignments`, `ops_jobs`, `ops_job_services`

This is the final phase where the crew confirms the job is complete and signs off.

#### ops_job_assignments Completion

**Fields Updated:**
- `status` = 'completed'
- `actual_end` (timestamptz) = Final clock-out timestamp
- `completion_percentage` = 100
- `actual_hours` (numeric) = Total hours worked across all days

**Completion Workflow:**
```
Crew finishes final work → Final clock-out
    ↓
ops_job_assignments.actual_end = NOW()
ops_job_assignments.status = 'completed'
ops_job_assignments.completion_percentage = 100
    ↓
All services marked complete:
  ops_job_services.is_completed = true
  ops_job_services.completed_at = NOW()
    ↓
ops_jobs.actual_end_date = TODAY()
ops_jobs.status = 'completed'
```

#### Job-Level Completion

**ops_jobs Fields:**
- `status` = 'completed'
- `actual_end_date` (date) = Job completion date
- `actual_total` (numeric) = Final amount (includes field upcharges)

**Service-Level Completion:**
- `ops_job_services.is_completed` = true
- `ops_job_services.completed_at` (timestamptz) = Service completion time

#### Crew Confirmation Actions

**Final Check-out Process:**

1. **Crew Lead Reviews Work:**
   - Verifies all services completed
   - Takes final photos
   - Walks property with customer (if available)

2. **Crew Submits Completion via Mobile App:**
   ```
   - Final check-in with type='departure'
   - Mark job as complete button
   - Upload final photos to ops_job_notes.attachments
   - Add completion note:
     ops_job_notes:
       note_type = 'crew_note'
       subject = 'Job Completion Confirmation'
       content = 'All work completed successfully. Customer satisfied.'
       attachments = [final photos]
   ```

3. **System Updates:**
   ```
   ops_job_assignments.status = 'completed'
   ops_jobs.status = 'completed'
   All ops_job_services.is_completed = true
   ```

#### Actual vs. Estimated Tracking

**Comparison Data for Analysis:**

```sql
-- Compare estimated vs actual
SELECT
  j.job_number,
  j.estimated_total,
  j.actual_total,
  ja.estimated_hours,
  ja.actual_hours,
  ((ja.actual_hours - ja.estimated_hours) / ja.estimated_hours * 100) as hours_variance_pct,
  ((j.actual_total - j.estimated_total) / j.estimated_total * 100) as cost_variance_pct
FROM ops_jobs j
JOIN ops_job_assignments ja ON ja.job_id = j.id
WHERE j.status = 'completed'
  AND j.company_id = 'company-uuid';
```

This data feeds back into:
- Pricing engine calibration
- Crew performance metrics
- Profitability analysis

**Validation Checks:**
- All assigned crews have status = 'completed'
- All services marked `is_completed = true`
- Final photos uploaded
- Crew sign-off recorded
- Actual hours recorded
- Customer satisfaction noted (if collected)

**Outputs for Post-Completion:**
- Job ready for final invoicing (if not pre-invoiced)
- Data available for performance analysis
- Customer ready for follow-up
- Crew released for next assignment

---

## Data Synchronization Map

### Field-by-Field Pipeline Flow

| Source Table/Field | → | Destination Table/Field | Pipeline Phase | Purpose |
|-------------------|---|------------------------|----------------|---------|
| `crm_customers.id` | → | `ops_jobs.customer_id` | 1 → 2 | Link job to customer |
| `crm_customers.customer_address` | → | `ops_jobs.service_address` | 1 → 2 | Pre-fill service location |
| `svc_pricing_configs.id` | → | `ops_job_services.service_config_id` | 2 | Link service to configuration |
| `svc_pricing_configs.variables_config` | → | Pricing Engine Input | 2 | Define calculation formula |
| Pricing Engine Output | → | `ops_job_services.calculation_data` | 2 | Store complete calculation |
| `calculation_data.tier1Results.totalManHours` | → | `ops_job_assignments.estimated_hours` | 2 → 6 | **Schedule labor** |
| `calculation_data.tier1Results.totalDays` | → | `ops_jobs.scheduled_end_date` calc | 2 → 6 | **Schedule duration** |
| `calculation_data.tier2Results.total` | → | `ops_job_services.total_price` | 2 | Service line item price |
| `SUM(ops_job_services.total_price)` | → | `ops_jobs.estimated_total` | 2 | Job total quote |
| `ops_jobs.id` | → | `ops_job_assignments.job_id` | 6 | Link assignment to job |
| `ops_crews.id` | → | `ops_job_assignments.crew_id` | 6-7 | Assign crew to job |
| `ops_job_assignments.actual_start` | → | `ops_jobs.actual_start_date` | 8 | Track job start |
| `ops_job_assignments.actual_hours` | → | Performance metrics | 8-9 | Compare actual vs estimate |
| `ops_job_assignments.completion_percentage` | → | Dashboard displays | 8 | Real-time progress |
| `ops_job_assignments.status = completed` | → | `ops_jobs.status = completed` | 9 | Trigger job completion |
| `billing_payments.processed_at` | → | `ops_jobs.paid_at` | 5 | Mark payment received |

### Critical Data Flows

#### 1. Pricing → Scheduling Flow

```
User Input (sqft, complexity, etc.)
    ↓
Pricing Engine calculates using svc_pricing_configs.variables_config
    ↓
Output: calculation_data = {
  tier1Results: {totalManHours: 24, totalDays: 3},
  tier2Results: {total: 2676, ...}
}
    ↓
Stored in ops_job_services.calculation_data
    ↓
When scheduling:
  ops_job_assignments.estimated_hours = 24 (from totalManHours)
  scheduled_end_date = scheduled_start_date + 3 days (from totalDays)
```

#### 2. Field Operations → Completion Flow

```
Crew clocks in
    ↓
ops_job_assignments.actual_start = NOW()
status = 'in_progress'
    ↓
Daily work + check-ins
    ↓
metadata.check_ins[] updated
metadata.daily_logs[] updated
actual_hours accumulates
    ↓
Crew clocks out (final day)
    ↓
ops_job_assignments.actual_end = NOW()
status = 'completed'
completion_percentage = 100
    ↓
ops_jobs.status = 'completed'
actual_end_date = TODAY()
```

#### 3. Upcharge Flow

```
Crew encounters anomaly
    ↓
ops_job_notes created:
  note_type = 'upcharge_request'
  content = description
  metadata = {estimated_additional_cost}
    ↓
Manager approves
    ↓
New ops_job_services record created
    ↓
ops_jobs.actual_total updated
    ↓
Customer notified of change order
```

---

## JSONB Field Structures

### ops_job_services.calculation_data

**Complete Structure from Pricing Engine:**

```json
{
  "tier1Results": {
    "baseHours": 8,
    "adjustedHours": 8,
    "paverPatioHours": 20,
    "excavationHours": 4,
    "totalManHours": 24,
    "totalDays": 3,
    "breakdown": [
      "Base calculation: 8 hours for 500 sqft",
      "Complexity adjustment: +0%",
      "Obstacle adjustment: +20%"
    ]
  },
  "tier2Results": {
    "laborCost": 1200,
    "materialCostBase": 800,
    "materialWasteCost": 80,
    "totalMaterialCost": 880,
    "excavationCost": 350,
    "excavationDetails": {
      "cubicYards": 18.5,
      "depth": 8,
      "wasteFactor": 1.1,
      "baseRate": 15,
      "profit": 75
    },
    "equipmentCost": 150,
    "obstacleCost": 0,
    "subtotal": 2230,
    "profit": 446,
    "total": 2676,
    "pricePerSqft": 26.76
  },
  "sqft": 100,
  "inputValues": {
    "sqft": 100,
    "complexity": "medium",
    "sealerUpgrade": true,
    "edging": "steel",
    "obstacles": ["slope", "trees"]
  },
  "confidence": 0.95,
  "calculationDate": "2025-01-24T10:30:00Z"
}
```

**Key Fields for Scheduling:**
- `tier1Results.totalManHours` → `ops_job_assignments.estimated_hours`
- `tier1Results.totalDays` → Used to calculate `scheduled_end_date`

**Key Fields for Costing:**
- `tier2Results.total` → `ops_job_services.total_price`
- `tier2Results.*` → All cost breakdowns for reporting

### ops_job_services.pricing_variables

**Input Variables Used for Calculation:**

```json
{
  "sqft": 500,
  "complexity": "medium",
  "sealerUpgrade": true,
  "edging": "steel",
  "obstacles": ["slope", "trees"],
  "materials": {
    "paverStyle": "cambridge_cobble",
    "paverColor": "autumn_blend",
    "edgingMaterial": "aluminum",
    "baseMaterial": "gravel"
  }
}
```

### ops_job_assignments.metadata

**Field Operations Data:**

```json
{
  "check_ins": [
    {
      "timestamp": "2025-01-24T08:15:00Z",
      "location": {
        "lat": 40.7128,
        "lng": -74.0060,
        "accuracy": 10,
        "address": "123 Main St"
      },
      "crew_member_id": "user-uuid-1",
      "crew_member_name": "John Doe",
      "type": "arrival",
      "note": "Arrived on site, weather clear",
      "photos": ["https://storage.url/photo1.jpg"]
    },
    {
      "timestamp": "2025-01-24T12:00:00Z",
      "location": {...},
      "crew_member_id": "user-uuid-1",
      "type": "progress",
      "note": "Excavation 50% complete",
      "completion_update": 50,
      "photos": []
    },
    {
      "timestamp": "2025-01-24T14:30:00Z",
      "location": {...},
      "crew_member_id": "user-uuid-1",
      "type": "issue",
      "note": "Encountered underground utility, work paused pending clearance",
      "photos": ["https://storage.url/issue.jpg"],
      "requires_attention": true
    }
  ],
  "daily_logs": [
    {
      "date": "2025-01-24",
      "hours_worked": 8,
      "crew_members_present": ["user-uuid-1", "user-uuid-2"],
      "weather": "Clear, 75°F",
      "progress_notes": "Completed excavation and base layer preparation",
      "materials_used": [
        {
          "material_id": "material-uuid",
          "material_name": "Gravel Base",
          "quantity": 10,
          "unit": "tons"
        },
        {
          "material_id": "material-uuid-2",
          "material_name": "Geotextile Fabric",
          "quantity": 500,
          "unit": "sqft"
        }
      ],
      "equipment_used": ["Excavator", "Plate Compactor", "Laser Level"]
    }
  ],
  "upcharges": [
    {
      "timestamp": "2025-01-24T14:30:00Z",
      "description": "Additional excavation for underground utility",
      "estimated_hours": 2,
      "estimated_cost": 400,
      "status": "pending_approval",
      "note_id": "ops_job_notes-uuid"
    }
  ]
}
```

### ops_job_notes.metadata

**General Note Metadata:**

```json
{
  "location": {
    "lat": 40.7128,
    "lng": -74.0060
  },
  "weather": "Partly cloudy, 68°F",
  "crew_member_id": "user-uuid",
  "timestamp": "2025-01-24T15:00:00Z",
  "note_category": "field_observation",
  "requires_follow_up": true,
  "follow_up_deadline": "2025-01-25"
}
```

### ops_job_notes.ai_metadata (for AI-generated insights)

```json
{
  "model": "gpt-4",
  "version": "1.0.0",
  "confidence": 0.92,
  "insight_type": "risk_assessment",
  "recommendations": [
    "Schedule additional QA inspection before final layer",
    "Consider weather forecast for next 3 days",
    "Crew may benefit from additional compaction equipment"
  ],
  "data_sources": [
    "historical_job_data",
    "weather_api",
    "crew_performance_metrics"
  ],
  "analyzed_at": "2025-01-24T16:00:00Z",
  "analysis_duration_ms": 1250
}
```

### svc_pricing_configs.variables_config

**Pricing Formula Configuration:**

```json
{
  "tiers": {
    "tier1": {
      "description": "Labor hour calculation",
      "formula": "base_hours + complexity_adjustment + obstacle_adjustment",
      "variables": {
        "sqft": {
          "type": "number",
          "min": 100,
          "max": 10000,
          "step": 1,
          "required": true
        },
        "complexity": {
          "type": "select",
          "options": ["simple", "medium", "complex"],
          "default": "medium",
          "multipliers": {
            "simple": 1.0,
            "medium": 1.2,
            "complex": 1.5
          }
        }
      }
    },
    "tier2": {
      "description": "Cost calculation",
      "formula": "labor + materials + equipment + obstacles + profit",
      "profit_margin": 20
    }
  },
  "base_productivity": 50,
  "hourly_rate": 50
}
```

---

## Critical Integration Points

### 1. Pricing Engine → Scheduling Integration

**Why Critical:** Labor hour estimates drive crew scheduling and job duration planning.

**Integration Point:**
- **Source:** Pricing engine calculation outputs
- **Storage:** `ops_job_services.calculation_data.tier1Results`
- **Consumption:** Scheduling system reads `totalManHours` and `totalDays`

**Implementation:**

```typescript
// When creating job assignment (Phase 6)
const jobServices = await getJobServices(jobId);
const totalEstimatedHours = jobServices.reduce((sum, service) => {
  return sum + (service.calculation_data?.tier1Results?.totalManHours || 0);
}, 0);

const totalEstimatedDays = Math.max(...jobServices.map(service =>
  service.calculation_data?.tier1Results?.totalDays || 1
));

// Create assignment with estimated hours
await createJobAssignment({
  job_id: jobId,
  crew_id: selectedCrewId,
  estimated_hours: totalEstimatedHours,
  scheduled_start: scheduledStart,
  scheduled_end: addDays(scheduledStart, totalEstimatedDays)
});
```

### 2. Field Operations → Job Completion Integration

**Why Critical:** Real-time crew updates drive job status, progress tracking, and customer communication.

**Integration Point:**
- **Source:** Crew mobile app (clock-ins, check-ins, notes)
- **Storage:**
  - `ops_job_assignments.actual_start/actual_end`
  - `ops_job_assignments.metadata.check_ins[]`
  - `ops_job_notes` (note_type: 'field_update')
- **Consumption:** Dashboard, customer portal, manager notifications

**Implementation:**

```typescript
// Crew clock-in
async function crewClockIn(assignmentId: string, location: {lat, lng}) {
  const assignment = await getAssignment(assignmentId);

  // First clock-in sets actual_start
  if (!assignment.actual_start) {
    await updateAssignment(assignmentId, {
      actual_start: new Date(),
      status: 'in_progress'
    });

    // Update job status
    await updateJob(assignment.job_id, {
      status: 'in_progress',
      actual_start_date: new Date()
    });
  }

  // Add check-in to metadata
  const checkIn = {
    timestamp: new Date().toISOString(),
    location,
    crew_member_id: currentUserId,
    type: 'arrival',
    note: 'Crew clocked in'
  };

  await appendToMetadata(assignmentId, 'check_ins', checkIn);
}
```

### 3. Upcharge/Modification Flow Integration

**Why Critical:** Field anomalies require pricing adjustments that affect job total and customer billing.

**Integration Point:**
- **Source:** Crew encounters issue requiring additional work
- **Storage:**
  - `ops_job_notes` (note_type: 'upcharge_request')
  - `ops_job_assignments.metadata.upcharges[]`
- **Action:** Create new `ops_job_services` record after approval
- **Impact:** `ops_jobs.actual_total` updated

**Implementation:**

```typescript
// Crew requests upcharge
async function requestUpcharge(params: {
  job_id: string,
  description: string,
  estimated_hours: number,
  estimated_cost: number,
  photos: string[]
}) {
  // Create note
  const note = await createJobNote({
    job_id: params.job_id,
    note_type: 'upcharge_request',
    subject: 'Additional Work Required',
    content: params.description,
    attachments: params.photos,
    metadata: {
      estimated_hours: params.estimated_hours,
      estimated_cost: params.estimated_cost,
      requires_approval: true,
      status: 'pending'
    }
  });

  // Notify office staff
  await sendNotification({
    type: 'upcharge_request',
    job_id: params.job_id,
    note_id: note.id,
    amount: params.estimated_cost
  });

  return note;
}

// Manager approves upcharge
async function approveUpcharge(noteId: string, approvedCost: number) {
  const note = await getNote(noteId);

  // Create new service for additional work
  const service = await addJobService({
    job_id: note.job_id,
    service_name: 'Additional Work - Field Change',
    service_description: note.content,
    quantity: 1,
    unit_price: approvedCost,
    total_price: approvedCost,
    metadata: {
      source: 'field_upcharge',
      upcharge_note_id: noteId
    }
  });

  // Update job actual_total
  await recalculateJobTotal(note.job_id);

  // Update note status
  await updateNoteMetadata(noteId, {
    status: 'approved',
    approved_cost: approvedCost,
    service_id: service.id
  });
}
```

### 4. Crew Time Tracking → Profitability Analysis

**Why Critical:** Compare estimated vs. actual hours to improve pricing accuracy and crew performance.

**Integration Point:**
- **Source:**
  - Estimated: `ops_job_services.calculation_data.tier1Results.totalManHours`
  - Actual: `ops_job_assignments.actual_hours`
- **Analysis:** Variance reporting, pricing calibration, crew efficiency metrics

**Implementation:**

```typescript
// Calculate profitability and variance
async function analyzeJobProfitability(jobId: string) {
  const job = await getJobWithServices(jobId);
  const assignments = await getJobAssignments(jobId);

  // Sum estimated hours from all services
  const totalEstimatedHours = job.services.reduce((sum, s) =>
    sum + (s.calculation_data?.tier1Results?.totalManHours || 0), 0
  );

  // Sum actual hours from all assignments
  const totalActualHours = assignments.reduce((sum, a) =>
    sum + (a.actual_hours || 0), 0
  );

  // Calculate variance
  const hoursVariance = totalActualHours - totalEstimatedHours;
  const hoursVariancePct = (hoursVariance / totalEstimatedHours) * 100;

  // Cost impact
  const laborRate = 50; // From svc_pricing_configs
  const costVariance = hoursVariance * laborRate;

  // Revenue
  const estimatedRevenue = job.estimated_total;
  const actualRevenue = job.actual_total || job.estimated_total;

  // Profitability
  const estimatedProfit = estimatedRevenue - (totalEstimatedHours * laborRate);
  const actualProfit = actualRevenue - (totalActualHours * laborRate);

  return {
    estimatedHours: totalEstimatedHours,
    actualHours: totalActualHours,
    hoursVariance,
    hoursVariancePct,
    costVariance,
    estimatedProfit,
    actualProfit,
    profitVariance: actualProfit - estimatedProfit
  };
}
```

---

## Crew Management Deep Dive

### Crew Utilization Tracking

**Purpose:** Ensure crews are optimally loaded without overbooking.

**Query Example:**

```sql
-- Current crew utilization
SELECT
  c.id,
  c.crew_name,
  c.max_capacity,
  COUNT(DISTINCT ja.id) FILTER (WHERE ja.status IN ('scheduled', 'in_progress')) as active_jobs,
  SUM(ja.estimated_hours) FILTER (WHERE ja.status IN ('scheduled', 'in_progress')) as total_scheduled_hours,
  SUM(ja.actual_hours) FILTER (WHERE ja.status = 'completed') as hours_completed_this_month,
  ARRAY_AGG(DISTINCT j.job_number) FILTER (WHERE ja.status IN ('scheduled', 'in_progress')) as current_jobs
FROM ops_crews c
LEFT JOIN ops_job_assignments ja ON ja.crew_id = c.id
LEFT JOIN ops_jobs j ON j.id = ja.job_id
WHERE c.company_id = :company_id
  AND c.is_active = true
GROUP BY c.id, c.crew_name, c.max_capacity
ORDER BY active_jobs DESC;
```

**Utilization Metrics:**
- **Active Jobs:** Current assignments in progress
- **Scheduled Hours:** Total hours committed
- **Capacity:** Max concurrent jobs (from `max_capacity`)
- **Availability:** `max_capacity - active_jobs`

### Crew Assignment Workflow

**Step 1: Check Crew Availability**

```typescript
async function checkCrewAvailability(
  crewId: string,
  startDate: string,
  endDate: string
) {
  // Find overlapping assignments
  const conflicts = await db.query(`
    SELECT ja.*, j.job_number, j.title
    FROM ops_job_assignments ja
    JOIN ops_jobs j ON j.id = ja.job_id
    WHERE ja.crew_id = $1
      AND ja.status IN ('scheduled', 'in_progress')
      AND (
        (ja.scheduled_start BETWEEN $2 AND $3)
        OR (ja.scheduled_end BETWEEN $2 AND $3)
        OR (ja.scheduled_start <= $2 AND ja.scheduled_end >= $3)
      )
  `, [crewId, startDate, endDate]);

  return {
    isAvailable: conflicts.length === 0,
    conflicts: conflicts
  };
}
```

**Step 2: Assign Crew to Job**

```typescript
async function assignCrewToJob(params: {
  job_id: string,
  crew_id: string,
  scheduled_start: string,
  scheduled_end: string,
  estimated_hours: number
}) {
  // Validate availability
  const availability = await checkCrewAvailability(
    params.crew_id,
    params.scheduled_start,
    params.scheduled_end
  );

  if (!availability.isAvailable) {
    throw new Error('Crew has scheduling conflicts');
  }

  // Create assignment
  const assignment = await createJobAssignment({
    ...params,
    status: 'scheduled',
    completion_percentage: 0
  });

  // Update job status
  await updateJob(params.job_id, {
    status: 'scheduled',
    scheduled_start_date: params.scheduled_start,
    scheduled_end_date: params.scheduled_end
  });

  return assignment;
}
```

### Mobile Crew App Workflow

**Crew Daily Workflow:**

1. **Morning:**
   - View assigned jobs for the day
   - Clock in when arriving on site
   - Review job details, materials needed, customer notes

2. **During Work:**
   - Submit check-ins with progress updates
   - Upload photos of work in progress
   - Log any issues or anomalies
   - Request upcharges if needed

3. **End of Day:**
   - Final progress update
   - Clock out
   - Submit daily summary
   - Mark job complete (if finished)

**Mobile App Features:**

- **Job List:** See all assigned jobs
- **Job Details:** Customer info, service address, work description
- **Clock In/Out:** Track time with GPS verification
- **Check-ins:** Progress updates with photos and notes
- **Issue Reporting:** Flag problems, request approvals
- **Materials Tracking:** Log materials used
- **Completion Confirmation:** Final sign-off

---

## Validation Checklists

### Phase 2: Job Creation Checklist

- [ ] Customer selected (valid `customer_id`)
- [ ] At least one service added
- [ ] All services have valid `service_config_id`
- [ ] Pricing calculations completed (`calculation_data` populated)
- [ ] `estimated_total` equals sum of service `total_price`
- [ ] Service address provided
- [ ] Job status = 'quote'

### Phase 3: Quote Approval Checklist

- [ ] Customer approval documented
- [ ] Payment terms agreed
- [ ] Deposit amount set (if required)
- [ ] All services finalized
- [ ] `quote_approved_at` timestamp set
- [ ] Job status = 'approved'

### Phase 5: Payment Processing Checklist

- [ ] Payment amount valid
- [ ] Stripe `payment_intent_id` present
- [ ] Payment status = 'succeeded'
- [ ] `billing_payments.processed_at` set
- [ ] `ops_jobs.paid_at` updated
- [ ] Revenue recognized

### Phase 6: Scheduling Checklist

- [ ] Crew availability confirmed (no conflicts)
- [ ] `estimated_hours` from `calculation_data.tier1Results.totalManHours`
- [ ] `scheduled_start_date` >= current date
- [ ] `scheduled_end_date` calculated from `totalDays`
- [ ] Crew has required specializations
- [ ] Crew capacity not exceeded
- [ ] Job status = 'scheduled'

### Phase 8: Field Operations Checklist

- [ ] Crew clocked in (`actual_start` set)
- [ ] Check-ins submitted with GPS coordinates
- [ ] GPS coordinates match job location (within tolerance)
- [ ] Progress updates submitted
- [ ] Issues documented in `ops_job_notes`
- [ ] Daily hours don't exceed 12 hours/day
- [ ] Job status = 'in_progress'

### Phase 9: Job Completion Checklist

- [ ] All services marked `is_completed = true`
- [ ] Crew final clock-out (`actual_end` set)
- [ ] `completion_percentage` = 100
- [ ] `actual_hours` recorded
- [ ] Final photos uploaded
- [ ] Crew sign-off documented
- [ ] Customer satisfaction noted
- [ ] `ops_jobs.status` = 'completed'
- [ ] `actual_end_date` set

---

## Summary

This master flow document provides a complete mapping of the profit pipeline from customer acquisition through job completion. Key takeaways:

1. **Pricing Drives Scheduling:** `calculation_data.tier1Results.totalManHours` and `totalDays` are critical for accurate job scheduling and crew assignment.

2. **Field Operations Are Extensible:** `metadata` JSONB fields in `ops_job_assignments` and `ops_job_notes` allow flexible tracking of check-ins, GPS, photos, and field updates without schema changes.

3. **Real-time Data Sync:** Crew clock-ins, progress updates, and completion confirmations flow directly into job status and enable real-time visibility.

4. **Profitability Tracking:** Compare `estimated_hours` vs `actual_hours` to calibrate pricing and measure crew efficiency.

5. **Upcharge Workflow:** Field anomalies can trigger new service line items that update `actual_total` and ensure accurate billing.

This document serves as the authoritative reference for understanding how data flows through the entire profit pipeline and can guide future feature development for scheduling UI, crew mobile apps, and business intelligence dashboards.

---

**End of Master Profit Pipeline Flow Document**
