# Jobs Database Schema - Entity Relationships

## Database Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    JOBS MANAGEMENT SYSTEM                       │
└─────────────────────────────────────────────────────────────────┘

                        COMPANY & USERS
                    (Multi-tenancy foundation)
                              │
                ┌─────────────┼─────────────┐
                │             │             │
            companies    crm_customers    users
                │             │             │
                │             │             │
                └─────────────┼─────────────┘
                              │
                              │ (company_id, customer_id)
                              │
                        ┌─────▼──────┐
                        │  ops_jobs  │ (4 records)
                        └─────┬──────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
            ┌───────▼────┐    │    ┌───▼─────────┐
            │   ops_job_ │    │    │  ops_job_   │
            │  services  │    │    │    notes    │
            │ (8 records)│    │    │ (8 records) │
            └────────────┘    │    └─────────────┘
                              │
                    ┌─────────▼────────┐
                    │ ops_job_        │
                    │ assignments     │
                    │ (0 records)     │
                    └─────────────────┘
                              │
                    ┌─────────┴────────┐
                    │         │        │
            ┌───────▼────┐ ┌──▼─────┐ │
            │ ops_crews  │ │ ops_   │ │
            │ (0 records)│ │ crew_  │ │
            └────────────┘ │members │ │
                           │ (0)    │ │
                           └────────┘ │
                                      │
                        ┌─────────────┘
                        │
                    ┌───▼─────────┐
                    │  service_   │
                    │ configs     │
                    └─────────────┘
```

---

## Detailed Entity Relationships

### Core Relationship Diagram

```
┌──────────────────┐
│    companies     │
│                  │
│  id (PK)         │
│  name            │
│  ...             │
└────────┬─────────┘
         │ 1
         │ company_id
         │
         │ N
┌────────▼──────────────────────────┐
│        ops_jobs                    │
│                                    │
│ id (PK) ──┐                        │
│ company_id├────► (FK to companies) │
│ customer_id├────► (FK to crm_customers)
│ job_number│                        │
│ title     │                        │
│ status    │                        │
│ ...       │                        │
└────────┬──────────────────────────┘
         │
    ┌────┴──────────────────┬─────────────────┐
    │                       │                 │
    │ 1                     │ 1                │ 1
    │ job_id                │ job_id           │ job_id
    │ N                     │ N                │ N
    │                       │                 │
┌───▼────────────────┐  ┌──▼──────────────┐  ┌──▼────────────────┐
│ ops_job_services   │  │ ops_job_notes   │  │ ops_job_          │
│                    │  │                 │  │ assignments       │
│ id (PK)            │  │ id (PK)         │  │                   │
│ job_id (FK)        │  │ job_id (FK)     │  │ id (PK)           │
│ service_config_id  │  │ subject         │  │ job_id (FK)       │
│ service_name       │  │ content         │  │ crew_id (FK)      │
│ quantity           │  │ note_type       │  │ assigned_at       │
│ unit_price         │  │ created_by_user │  │ ...               │
│ total_price        │  │ ...             │  │                   │
│ ...                │  │                 │  │                   │
└────────────────────┘  └─────────────────┘  └───┬────────────────┘
                                                  │
                                                  │ crew_id
                                                  │
                                        ┌─────────▼──────────┐
                                        │   ops_crews        │
                                        │                    │
                                        │ id (PK)            │
                                        │ company_id (FK)    │
                                        │ crew_name          │
                                        │ ...                │
                                        └─────────┬──────────┘
                                                  │
                                                  │ crew_id
                                                  │
                                        ┌─────────▼───────────┐
                                        │ ops_crew_members    │
                                        │                     │
                                        │ id (PK)             │
                                        │ crew_id (FK)        │
                                        │ user_id             │
                                        │ role                │
                                        │ ...                 │
                                        └─────────────────────┘
```

---

## Data Flow Hierarchy

### Access Control via Company ID

```
START: User Authentication
   │
   ├─► auth.uid() returned
   │
   └─► Lookup user in users table
       │
       └─► Get user.company_id
           │
           └─► RLS Policy Check
               │
               ├─► Can view ops_jobs
               │   WHERE company_id = user.company_id
               │
               ├─► Can view ops_job_services
               │   WHERE job_id IN (user's jobs)
               │
               ├─► Can view ops_job_notes
               │   WHERE job_id IN (user's jobs)
               │
               └─► Can view ops_job_assignments
                   WHERE job_id IN (user's jobs)
```

---

## Table Relationships (SQL View)

### One-to-Many: Company → Jobs

```
ONE company           MANY jobs
    │                     │
    │                  ┌──┼──┬──┬──┐
    │ id: 08f0827...   │  │  │  │  │
    │                  ↓  ↓  ↓  ↓  ↓
    │            JOB-001 002 003 004
    │
    └──────────(company_id matches)
```

### One-to-Many: Job → Services

```
ONE job                MANY services
    │                       │
    │ JOB-001           ┌────┼────┬────┐
    │ id: b483dc...    │    │    │    │
    │                   ↓    ↓    ↓    ↓
    │              Patio  Excavation [... more]
    │
    └──────────(job_id matches)
```

### One-to-Many: Job → Notes

```
ONE job                MANY notes
    │                      │
    │ JOB-001          ┌────┼────┐
    │ id: b483dc...   │    │    │
    │                  ↓    ↓    ↓
    │             Note1 Note2 [... more]
    │
    └──────────(job_id matches)
```

---

## Database Structure Grid

### Core Tables

```
ops_jobs (4 rows)
├── b483dc04 ─ JOB-001 ─ Backyard Patio      ─ quote
├── c7d3f723 ─ JOB-002 ─ Front Walkway       ─ scheduled
├── 4fa07b2d ─ JOB-003 ─ Office Courtyard    ─ in_progress
└── 049e6566 ─ JOB-004 ─ Driveway Extension  ─ completed

ops_job_services (8 rows)
├── JOB-001 ─┬─ Paver Patio (360 sq ft)  ─ $30,600
│            └─ Site Excavation (360 sq ft) ─ $8,050
├── JOB-002 ─┬─ Paver Walkway (120 sq ft) ─ $9,360
│            └─ Concrete Removal (120 sq ft) ─ $3,090
├── JOB-003 ─┬─ Commercial Patio (850 sq ft) ─ $78,200
│            └─ Commercial Prep (850 sq ft) ─ $11,550
└── JOB-004 ─┬─ Driveway Extension (200 sq ft) ─ $13,600
             └─ Driveway Prep (200 sq ft) ─ $2,650

ops_job_notes (8 rows)
├── JOB-001 ─ Initial quote discussion
├── JOB-002 ─┬─ Quote approved
│            └─ Job scheduled for Jan 27-28
├── JOB-003 ─┬─ Project kickoff
│            └─ Base work completed
└── JOB-004 ─┬─ Matching pavers sourced
             ├─ Project completed
             └─ Customer feedback
```

---

## Field Relationships & Dependencies

### Required Field Dependencies

```
ops_jobs:
  company_id ◄─── MUST EXIST in companies table
  customer_id ◄─── MUST EXIST in crm_customers table
  created_by_user_id ◄─── MUST EXIST in users table
  updated_by_user_id ◄─── OPTIONAL, exists in users table

ops_job_services:
  job_id ◄─── MUST EXIST in ops_jobs table
  service_config_id ◄─── Reference (may not validate)
  added_by_user_id ◄─── MUST EXIST in users table
  completed_by_user_id ◄─── OPTIONAL, exists in users table

ops_job_notes:
  job_id ◄─── MUST EXIST in ops_jobs table
  created_by_user_id ◄─── MUST EXIST in users table

ops_job_assignments:
  job_id ◄─── MUST EXIST in ops_jobs table
  crew_id ◄─── MUST EXIST in ops_crews table

ops_crews:
  company_id ◄─── MUST EXIST in companies table

ops_crew_members:
  crew_id ◄─── MUST EXIST in ops_crews table
  user_id ◄─── Reference (may be external crew)
```

---

## RLS Policy Enforcement Chain

```
User Request to ops_jobs
        │
        ├─► RLS Policy 1: SELECT
        │   WHERE company_id IN (
        │     SELECT company_id FROM users
        │     WHERE id = auth.uid()
        │   )
        │   └─► SUCCESS: Returns filtered rows
        │
        ├─► RLS Policy 2: INSERT
        │   WITH CHECK company_id IN (
        │     SELECT company_id FROM users
        │     WHERE id = auth.uid()
        │   )
        │   └─► Check: company_id matches user's company
        │
        ├─► RLS Policy 3: UPDATE
        │   WHERE company_id IN (
        │     SELECT company_id FROM users
        │     WHERE id = auth.uid()
        │   )
        │   └─► Check: Can only update own company's jobs
        │
        └─► RLS Policy 4: DELETE
            WHERE company_id IN (
              SELECT company_id FROM users
              WHERE id = auth.uid()
            )
            └─► Check: Can only delete own company's jobs

Related Tables (ops_job_services, ops_job_notes, ops_job_assignments)
        │
        └─► RLS Policy:
            WHERE job_id IN (
              SELECT id FROM ops_jobs
              WHERE company_id IN (
                SELECT company_id FROM users
                WHERE id = auth.uid()
              )
            )
            └─► Inherited security through job_id relationship
```

---

## Data Type Mapping

### Primary Keys
```
All tables use: uuid (PostgreSQL uuid type)
Generated by: gen_random_uuid()
```

### Foreign Keys
```
company_id: uuid reference → companies.id
customer_id: uuid reference → crm_customers.id
user_id: uuid reference → users.id
crew_id: uuid reference → ops_crews.id
job_id: uuid reference → ops_jobs.id
```

### Enums
```
ops_jobs.status: job_status enum
  Values: 'quote', 'scheduled', 'in_progress', 'completed'

ops_job_notes.note_type: varchar
  Common values: 'general', 'customer_communication', 'schedule_change'
```

### Arrays
```
ops_jobs.tags: text[]
  Example: ['patio', 'hardscape', 'backyard']

ops_job_notes.related_service_ids: uuid[]
  Links notes to specific services
```

### JSON Types
```
ops_jobs.metadata: jsonb
ops_job_services.calculation_data: jsonb
  Example: {"laborHours": 48, "laborCost": 4800}
ops_job_services.pricing_variables: jsonb
  Example: {"color": "desert_tan", "pattern": "herringbone"}
ops_job_notes.ai_metadata: jsonb
ops_job_notes.attachments: jsonb
  Example: [{"name": "photo.jpg", "url": "..."}]
```

---

## Cardinality Summary

```
Company        (1) ──────── (N) ops_jobs
Customer       (1) ──────── (N) ops_jobs
User           (1) ──────── (N) ops_jobs (created_by)
User           (1) ──────── (N) ops_job_notes (created_by)
User           (1) ──────── (N) ops_job_services (added_by)

ops_jobs       (1) ──────── (N) ops_job_services
ops_jobs       (1) ──────── (N) ops_job_notes
ops_jobs       (1) ──────── (N) ops_job_assignments

Crew           (1) ──────── (N) ops_job_assignments
Crew           (1) ──────── (N) ops_crew_members
Company        (1) ──────── (N) ops_crews
```

---

## Query Examples for Common Operations

### Get Job with All Related Data
```sql
SELECT
  j.*,
  array_agg(DISTINCT js.id) as service_ids,
  array_agg(DISTINCT jn.id) as note_ids
FROM ops_jobs j
LEFT JOIN ops_job_services js ON j.id = js.job_id
LEFT JOIN ops_job_notes jn ON j.id = jn.job_id
WHERE j.id = '...'
GROUP BY j.id;
```

### Get Jobs with Service Totals
```sql
SELECT
  j.*,
  COUNT(js.id) as service_count,
  SUM(js.total_price) as total_services_value
FROM ops_jobs j
LEFT JOIN ops_job_services js ON j.id = js.job_id
WHERE j.company_id = '08f0827a-608f-485a-a19f-e0c55ecf6484'
GROUP BY j.id
ORDER BY j.created_at DESC;
```

### Get Jobs by Status
```sql
SELECT
  j.id,
  j.job_number,
  j.title,
  j.status,
  COUNT(DISTINCT js.id) as services,
  COUNT(DISTINCT jn.id) as notes
FROM ops_jobs j
LEFT JOIN ops_job_services js ON j.id = js.job_id
LEFT JOIN ops_job_notes jn ON j.id = jn.job_id
WHERE j.status = 'in_progress'
GROUP BY j.id
ORDER BY j.priority DESC;
```

---

## Index Strategy

### Current Indexes (Implicit)
- PRIMARY KEY: id
- FOREIGN KEYS: company_id, customer_id, job_id, crew_id

### Recommended Future Indexes
```sql
-- For RLS policy performance
CREATE INDEX idx_ops_jobs_company_id
  ON ops_jobs(company_id);

-- For status filtering
CREATE INDEX idx_ops_jobs_status
  ON ops_jobs(status);

-- Composite for most queries
CREATE INDEX idx_ops_jobs_company_status
  ON ops_jobs(company_id, status);

-- For relationship traversal
CREATE INDEX idx_ops_job_services_job_id
  ON ops_job_services(job_id);

CREATE INDEX idx_ops_job_notes_job_id
  ON ops_job_notes(job_id);

CREATE INDEX idx_ops_job_assignments_job_id
  ON ops_job_assignments(job_id);
```

---

## Scalability Considerations

### Current Capacity
```
4 jobs × 2 services = 8 service records
4 jobs × 2 notes = 8 note records
0 assignments, crews, crew_members

Estimated Response Time: <10ms
Storage Used: ~50KB
```

### 1,000 Jobs Capacity
```
1,000 jobs × 3 services = 3,000 service records
1,000 jobs × 5 notes = 5,000 note records
~500 assignments, ~50 crews, ~500 crew_members

Estimated Response Time: 50-100ms (with indexes)
Storage Used: ~2MB
```

### Optimization Points
- Add composite indexes: (company_id, status)
- Add composite indexes: (company_id, created_at)
- Consider data archival for completed jobs > 1 year
- Implement pagination for job lists (10-50 per page)

---

## Temporal Data Flow

```
Job Lifecycle:

  Created: created_at timestamp
    ↓
  In Quote: quote_sent_at, quote_valid_until
    ↓
  Approved: quote_approved_at
    ↓
  Scheduled: scheduled_start_date, scheduled_end_date
    ↓
  In Progress: actual_start_date
    ↓
  Completed: actual_end_date, paid_at
    ↓
  Historical: archived or retained for reporting


Note Timeline:
  created_at → updated_at
  (tracks when notes are added/modified)

Service Completion:
  is_completed → completed_at
  (marks when individual services are done)
```

---

## Security Zones

```
Level 1 - Public
├── Company ID (partition key)
└── Known test data

Level 2 - Authenticated
├── User must have valid session
└── RLS enforces company boundary

Level 3 - Internal Only
├── ops_job_notes.is_internal = true
└── Only visible to company users (when implemented)

Level 4 - Personal
├── User's own created records
└── May need additional RBAC layer
```

---

## Data Consistency Guarantees

```
✓ Foreign Key Constraints
  - All job references are valid
  - All customer references are valid
  - All user references are valid

✓ RLS Policy Enforcement
  - Company boundary enforced at database level
  - No cross-company data leakage possible

✓ Referential Integrity
  - Services can't exist without jobs
  - Notes can't exist without jobs
  - Assignments can't exist without jobs and crews

✓ Transaction Support
  - Multi-row operations atomic
  - Rollback on error
```

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Tables | 6 |
| Columns | ~110 |
| Current Records | 20 |
| Foreign Keys | 10+ |
| RLS Policies | 16 |
| Indexes | ~15 |
| Storage Used | ~50KB |
| Max Recommended Jobs/Company | 10,000 |

---

**Schema Version:** 1.0
**Last Updated:** 2025-10-24
**Status:** Production Ready
