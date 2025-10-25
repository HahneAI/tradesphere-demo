# Document Synchronization Summary

**Date:** 2025-01-24
**Documents Synced:**
- [docs/architecture/PROFIT-PIPELINE-MASTER-FLOW.md](./architecture/PROFIT-PIPELINE-MASTER-FLOW.md)
- [docs/SCHEDULING_CALENDAR_IMPLEMENTATION.md](./SCHEDULING_CALENDAR_IMPLEMENTATION.md)

---

## Overview

The **Profit Pipeline Master Flow** document and the **Scheduling Calendar Implementation** document have been cross-synchronized to ensure consistency between database architecture and UI implementation.

### Document Roles

| Document | Role | Authority |
|----------|------|-----------|
| **Profit Pipeline Master Flow** | Database Architecture Authority | ✅ Authoritative source for table schemas, field names, data types, and data flow |
| **Scheduling Calendar Implementation** | UI/UX Feature Plan | References profit pipeline for all database operations |

---

## What Was Synchronized

### 1. Database Schema References

**Added to Scheduling Calendar Document:**
- Complete `ops_crews` table schema (14 columns) with calendar usage notes
- Complete `ops_job_assignments` table schema (19 columns) with calendar usage notes
- Key `ops_jobs` fields relevant to scheduling
- `ops_job_services` table focus on `calculation_data` JSONB structure

**Source:** Profit Pipeline Phases 2, 6, and 7

### 2. Pricing Engine Integration

**Critical Data Flow Documented:**
```
Pricing Engine Calculation
    ↓
ops_job_services.calculation_data.tier1Results.totalManHours
    ↓
ops_job_assignments.estimated_hours (when assignment created)
    ↓
Calendar display (crew utilization, job duration)
```

**Added to Scheduling Document:**
- Detailed explanation of how `calculation_data` feeds into scheduling
- Code examples showing extraction of `totalManHours` and `totalDays`
- Field mapping from pricing to scheduling

**Source:** Profit Pipeline Phase 2 (Job Creation) → Phase 6 (Scheduling)

### 3. SQL Queries for Calendar Operations

**Added to Scheduling Document:**
1. **Crew Utilization Query** - Copied verbatim from Profit Pipeline Phase 7
   - Calculates active jobs, scheduled hours, capacity percentage
   - Used for crew row headers display

2. **Conflict Detection Query** - Copied verbatim from Profit Pipeline Phase 6
   - Checks for overlapping assignments
   - Runs before allowing drag-drop

**Source:** Profit Pipeline SQL examples in Phase 6 & 7

### 4. Assignment Creation Workflow

**Added to Scheduling Document:**
- Complete `handleJobDrop()` function showing database persistence
- Shows creation of `ops_job_assignments` record
- Shows update of `ops_jobs` table
- Includes `metadata` JSONB structure for assignment tracking

**Key Fields Populated:**
- `job_id`, `crew_id`
- `scheduled_start`, `scheduled_end`
- `estimated_hours` (FROM PRICING CALCULATION)
- `status` = 'scheduled'
- `metadata.assigned_via` = 'calendar_drag_drop'

**Source:** Profit Pipeline Phase 6 - Data Flow: Calculation → Scheduling

### 5. Metadata JSONB Structure

**Added to Both Documents:**
- Calendar-specific metadata example for `ops_job_assignments.metadata`
- Shows how UI preferences can be stored without schema changes
- Documents the `assigned_via` tracking pattern

**Example:**
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

**Source:** Profit Pipeline JSONB Field Structures section

### 6. Calendar UI Integration Section

**Added to Profit Pipeline Document (Phase 6):**
- New subsection "Calendar UI Integration"
- References the scheduling implementation document
- Lists key UI features
- Shows drag-drop workflow
- Provides database-UI field mapping table
- Documents metadata structure for calendar preferences

**Purpose:** Connect the database architecture to the visual interface

### 7. Cross-Document References

**Bidirectional Links Added:**

**In Scheduling Document:**
- "Database Architecture Reference" section at top
- References to specific phases in profit pipeline
- "See Phase 1" notes for database code examples
- Links in References section pointing to profit pipeline

**In Profit Pipeline Document:**
- Link to scheduling implementation doc in Phase 6
- Explanation of how calendar UI uses database fields
- Field mapping table showing database → UI relationship

---

## Key Integration Points Documented

### Integration Point 1: Pricing → Scheduling
**Location:** Both documents, Phase 1 (Scheduling) / Phase 2 & 6 (Profit Pipeline)

**What:** How pricing calculation outputs (`totalManHours`, `totalDays`) flow into job assignment creation

**Why Critical:** Ensures scheduling duration and crew workload are based on actual pricing calculations, not arbitrary guesses

### Integration Point 2: Drag-Drop → Database Persistence
**Location:** Scheduling Phase 1, Step 4 / Profit Pipeline Phase 6

**What:** Complete code showing how UI drag-drop creates `ops_job_assignments` record and updates `ops_jobs`

**Why Critical:** Ensures calendar changes are immediately persisted to database

### Integration Point 3: Crew Utilization Display
**Location:** Scheduling Database Reference / Profit Pipeline Phase 7

**What:** SQL query that calculates crew workload percentage shown in calendar row headers

**Why Critical:** Provides real-time visibility into crew capacity

### Integration Point 4: Conflict Detection
**Location:** Scheduling Phase 1 / Profit Pipeline Phase 6

**What:** SQL query that checks for overlapping assignments before allowing drop

**Why Critical:** Prevents double-booking crews

---

## Consistency Checks Performed

### ✅ Field Names Match
- All field names in scheduling document match profit pipeline exactly
- Data types documented consistently
- JSONB structures shown with same examples

### ✅ Data Flow Matches
- Scheduling document shows same data flow as profit pipeline
- Pricing → Scheduling → Calendar flow is consistent
- Status transitions align with profit pipeline phases

### ✅ SQL Queries Match
- Crew utilization query is identical in both documents
- Conflict detection query is identical in both documents
- Assignment creation logic is consistent

### ✅ Terminology Matches
- "Assignment" (not "booking" or "scheduling")
- "Crew" (not "team" or "worker group")
- "Estimated hours" (from pricing calculation)
- "Scheduled start/end" (planned dates)
- "Actual start/end" (clock-in/out times)

---

## Mock Data Strategy

**Documented in Scheduling Document:**
- Calendar checks if `ops_crews` table is empty
- If empty: uses mock crews for development
- If populated: uses real crew data from database
- **No code changes needed** when switching from mock to real data

**Mock Crew Structure:**
- Matches `ops_crews` table schema exactly
- Includes all fields needed by calendar (name, color, capacity, specializations)
- Mock IDs use suffix "-mock" for clarity

---

## Implementation Checklist Updates

**Added Database Considerations to Scheduling Milestones:**

### Milestone 1: Basic Calendar Layout
- Fetch crews from `ops_crews` (or use mock if empty)
- Fetch jobs with services to get `calculation_data`

### Milestone 2: Crew Rows & Job Blocks
- Transform jobs extracting `totalManHours` and `totalDays`
- Display crew utilization from database query

### Milestone 3: Drag-and-Drop
- Persist assignments to `ops_job_assignments`
- Update `ops_jobs.status` and dates
- Use `estimated_hours` from pricing calculation

### Milestone 4: Conflict Detection
- Run SQL conflict detection query before drop
- Use database to check overlaps, not client-side only

---

## Developer Guidance

### When Implementing Calendar UI:

1. **Always reference Profit Pipeline document** for:
   - Table schemas (Phase 6, 7)
   - Field names and data types
   - SQL queries
   - JSONB structures

2. **Always reference Scheduling document** for:
   - UI component structure
   - Drag-drop implementation
   - Visual design specs
   - User interactions

3. **Key Rule:** If there's a conflict between documents, **Profit Pipeline wins** for database architecture, **Scheduling document wins** for UI/UX decisions

### When Updating Documents:

1. **Database schema changes:** Update Profit Pipeline first, then sync to Scheduling document
2. **UI feature additions:** Update Scheduling document, add database integration notes referencing Profit Pipeline
3. **Keep cross-references current:** Update links when sections are reorganized

---

## Future Synchronization Points

### When These Events Occur:

1. **Real crews are created in database:**
   - No document changes needed
   - Calendar will automatically use real data
   - Update Notes section to mark mock data as deprecated

2. **Additional assignment fields are added:**
   - Update Profit Pipeline Phase 6 schema
   - Update Scheduling Document database reference
   - Update field mapping tables in both docs

3. **New calendar features requiring database changes:**
   - Add to Profit Pipeline if new table/field needed
   - Reference from Scheduling document
   - Update integration point sections

4. **Pricing calculation structure changes:**
   - Update Profit Pipeline Phase 2 `calculation_data` structure
   - Update Scheduling document extraction code
   - Verify field mapping table is current

---

## Document Health Metrics

| Metric | Status | Notes |
|--------|--------|-------|
| Schema Consistency | ✅ 100% | All table schemas match between docs |
| Field Name Consistency | ✅ 100% | No naming conflicts |
| SQL Query Consistency | ✅ 100% | Queries are identical |
| Data Flow Diagrams | ✅ Aligned | Same flow shown in both |
| Cross-References | ✅ Complete | Bidirectional links added |
| Code Examples | ✅ Consistent | Same patterns used |
| JSONB Structures | ✅ Matched | Same examples shown |

---

## Summary

The two documents are now **fully synchronized** with clear separation of concerns:

- **Profit Pipeline:** Database architecture authority (schemas, queries, data flow)
- **Scheduling Calendar:** UI/UX implementation guide (components, interactions, visual design)

Both documents cross-reference each other extensively, ensuring developers can navigate between database architecture and UI implementation seamlessly.

**Key Achievement:** A developer can now implement the scheduling calendar by:
1. Reading Scheduling document for UI structure
2. Referencing Profit Pipeline for exact database operations
3. Following the integration points to connect UI to database
4. Using the provided SQL queries and code examples

**No guesswork. No assumptions. Database-first, fully documented.**

---

**Synchronized By:** Claude (AI Assistant)
**Review Status:** Ready for developer implementation
**Next Action:** Begin Scheduling Calendar implementation using both documents
