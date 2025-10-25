# Scheduling Calendar Implementation Plan

**Created:** 2025-10-24
**Status:** Planning Phase
**Target:** ScheduleTab with Drag-and-Drop Calendar

---

## Executive Summary

This document outlines the implementation plan for building a functional drag-and-drop scheduling calendar in the ScheduleTab component. The calendar will display the 4 test jobs across a weekly timeline with crew assignment capability.

---

## Current State Analysis

### Database Status

**Jobs Table (`ops_jobs`):**
- ✅ 4 test jobs with complete scheduling data
- ✅ 3 test customers: Sarah Johnson, Michael Chen, Emily Rodriguez
- ✅ Jobs have `scheduled_start_date` and `scheduled_end_date` fields
- ✅ Status tracking: quote, scheduled, in_progress, completed

**Test Jobs:**
1. `JOB-2025-001` - Backyard Paver Patio Installation (Sarah Johnson)
   - Status: quote
   - Scheduled: None (requested: Feb 15, 2025)
   - Priority: 5

2. `JOB-2025-002` - Front Walkway Paver Installation (Sarah Johnson)
   - Status: scheduled
   - Scheduled: Jan 27-28, 2025
   - Priority: 8

3. `JOB-2025-003` - Office Building Courtyard Patio (Michael Chen)
   - Status: in_progress
   - Scheduled: Jan 20-26, 2025
   - Priority: 10 (commercial, high-traffic)

4. `JOB-2025-004` - Driveway Extension with Pavers (Emily Rodriguez)
   - Status: completed
   - Scheduled: Jan 10-12, 2025
   - Priority: 5

**Missing Data:**
- ❌ No crew records exist (`ops_crews` table is empty)
- ❌ No job assignments exist (`ops_job_assignments` table is empty)

**Implication:** We'll use mock crew data for initial implementation.

---

### Codebase Status

**✅ Existing Infrastructure:**

1. **Type Definitions** (`src/types/jobs-views.ts`):
   - `CalendarJobBlock` - Job block for calendar display
   - `CalendarCrewRow` - Crew row in calendar view
   - `CalendarConflict` - Scheduling conflict indicator
   - `CalendarTimeline` - Timeline configuration

2. **Helper Functions** (`src/types/jobs-views.ts`):
   - `detectScheduleConflicts()` - Find overlapping assignments
   - `doDateRangesOverlap()` - Date range overlap check
   - `calculateCrewUtilization()` - Crew capacity calculation
   - `formatShortDate()`, `formatCurrency()` - Display utilities

3. **Services** (`src/services/ScheduleService.ts`):
   - `createAssignment()` - Create crew assignment with conflict checking
   - `updateAssignment()` - Update assignment with rescheduling
   - `deleteAssignment()` - Delete assignment
   - `getSchedule()` - Fetch schedule events for calendar
   - `checkScheduleConflicts()` - Detect overlapping assignments
   - `rescheduleAssignment()` - Reschedule with validation

4. **Related Components:**
   - `JobsCalendarView.tsx` - Partial implementation (week navigation working)
   - `JobDetailModal.tsx` - Full job detail view
   - `StatusBadge.tsx`, `PriorityIndicator.tsx` - UI components

**❌ Gaps:**

1. **ScheduleTab.tsx** - Currently a skeleton placeholder
2. No drag-and-drop implementation
3. No calendar grid rendering
4. No job block components

---

## Database Architecture Reference

**📚 Primary Reference:** [docs/architecture/PROFIT-PIPELINE-MASTER-FLOW.md](./architecture/PROFIT-PIPELINE-MASTER-FLOW.md)

This scheduling calendar implementation is the **UI/UX layer** for Phase 6 (Job Scheduling) and Phase 7 (Crew Assignment) of the profit pipeline. The database architecture document is the authoritative source for table schemas, field names, and data flow.

### Critical Database Tables

#### 1. `ops_crews` Table (14 columns)
**Reference:** Profit Pipeline Phase 7

Complete schema from database:
- `id` (uuid, PK)
- `company_id` (uuid, FK)
- `crew_name` (varchar) - Display name
- `crew_code` (varchar) - Short code (e.g., "CREW-01")
- `description` (text)
- `crew_lead_user_id` (uuid, FK → users.id)
- `is_active` (boolean, default true)
- `specializations` (text[]) - Array of skills
- `max_capacity` (integer, default 5) - Max concurrent jobs
- `metadata` (JSONB) - Extensible data
- `color_code` (varchar) - For calendar display
- `created_by_user_id` (uuid, FK → users.id)
- `created_at`, `updated_at` (timestamptz)

**Calendar Usage:**
- `crew_name` → Display in crew row header
- `color_code` → Job block background color
- `max_capacity` → Utilization calculation
- `specializations` → Filter jobs that crew can handle

#### 2. `ops_job_assignments` Table (19 columns)
**Reference:** Profit Pipeline Phase 6

Complete schema from database:
- `id` (uuid, PK)
- `job_id` (uuid, FK → ops_jobs.id)
- `crew_id` (uuid, FK → ops_crews.id)
- `scheduled_start` (timestamptz) - Planned start
- `scheduled_end` (timestamptz) - Planned end
- `work_description` (text)
- `estimated_hours` (numeric) - **FROM PRICING CALCULATION**
- `actual_hours` (numeric) - Filled during field work
- `actual_start` (timestamptz) - Clock-in time
- `actual_end` (timestamptz) - Clock-out time
- `status` (varchar: scheduled, in_progress, completed, cancelled)
- `completion_percentage` (integer, 0-100)
- `notes` (text)
- `requires_special_equipment` (boolean)
- `special_equipment_notes` (text)
- `metadata` (JSONB) - **CRITICAL: Stores check-ins, GPS, field data**
- `assigned_by_user_id` (uuid, FK → users.id)
- `created_at`, `updated_at` (timestamptz)

**Calendar Usage:**
- `scheduled_start/end` → Job block position and width
- `status` → Job block border color
- `completion_percentage` → Progress bar
- `estimated_hours` → Crew utilization calculation
- `metadata` → Can store calendar UI preferences

#### 3. `ops_jobs` Table (35 columns)
**Reference:** Profit Pipeline Phase 2

Key fields for scheduling:
- `id` (uuid, PK)
- `job_number` (varchar)
- `customer_id` (uuid, FK → crm_customers.id)
- `title` (varchar)
- `status` (varchar: quote, approved, scheduled, in_progress, completed, invoiced, cancelled)
- `priority` (integer, 1-10)
- `scheduled_start_date` (date)
- `scheduled_end_date` (date)
- `estimated_total` (numeric)
- `tags` (text[])

**Calendar Usage:**
- Job blocks display these fields
- Status determines visual styling
- Priority affects sort order and visual indicators

#### 4. `ops_job_services` Table (18 columns)
**Reference:** Profit Pipeline Phase 2

**CRITICAL INTEGRATION POINT:**
- `calculation_data` (JSONB) - Contains pricing engine output
  - `tier1Results.totalManHours` → **Feeds into `ops_job_assignments.estimated_hours`**
  - `tier1Results.totalDays` → **Used to calculate job duration**

**Data Flow:**
```
Pricing Engine Calculation
    ↓
ops_job_services.calculation_data = {
  tier1Results: {
    totalManHours: 24,  ← SCHEDULING INPUT
    totalDays: 3        ← SCHEDULING INPUT
  }
}
    ↓
When creating assignment via calendar drag-drop:
  ops_job_assignments.estimated_hours = 24
  scheduled_end = scheduled_start + 3 days
```

### Crew Utilization Query

**Reference:** Profit Pipeline Phase 7 - Crew Utilization Calculation

```sql
-- Current crew workload (from profit pipeline doc)
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

**Calendar Implementation:**
- Run this query to populate crew utilization percentages
- Display as "Alpha Crew (65%)" in row headers

### Assignment Conflict Detection

**Reference:** Profit Pipeline Phase 6 - Validation Checks

```sql
-- Check for overlapping assignments (from profit pipeline doc)
SELECT ja.*, j.job_number, j.title
FROM ops_job_assignments ja
JOIN ops_jobs j ON j.id = ja.job_id
WHERE ja.crew_id = :crew_id
  AND ja.status IN ('scheduled', 'in_progress')
  AND (
    (ja.scheduled_start BETWEEN :new_start AND :new_end)
    OR (ja.scheduled_end BETWEEN :new_start AND :new_end)
    OR (ja.scheduled_start <= :new_start AND ja.scheduled_end >= :new_end)
  );
```

**Calendar Implementation:**
- Run before allowing drop
- Show conflict modal if results returned
- Visual indicators on conflicting blocks

---

## Implementation Strategy

### Phase 1: Database Integration Setup

**Step 1: Fetch Real Crews (or Mock if Empty)**

```typescript
// Fetch from database
const { data: crews, error } = await supabase
  .from('ops_crews')
  .select('*')
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('crew_name');

// If no crews exist, use mock data for development
const MOCK_CREWS = crews && crews.length > 0 ? crews : [
  {
    id: 'crew-alpha-mock',
    crew_name: 'Alpha Crew (Mock)',
    color_code: '#3B82F6',
    max_capacity: 4,
    specializations: ['hardscape', 'patio'],
    is_active: true
  },
  {
    id: 'crew-bravo-mock',
    crew_name: 'Bravo Crew (Mock)',
    color_code: '#10B981',
    max_capacity: 3,
    specializations: ['driveway', 'walkway'],
    is_active: true
  },
  {
    id: 'crew-charlie-mock',
    crew_name: 'Charlie Crew (Mock)',
    color_code: '#F59E0B',
    max_capacity: 5,
    specializations: ['commercial', 'large-projects'],
    is_active: true
  }
];
```

**Step 2: Fetch Jobs with Services (for estimated_hours)**

```typescript
// Fetch jobs with their services to get calculation_data
const { data: jobs, error } = await supabase
  .from('ops_jobs')
  .select(`
    *,
    customer:crm_customers!inner(customer_name),
    services:ops_job_services(
      calculation_data,
      total_price
    ),
    assignments:ops_job_assignments(
      id,
      crew_id,
      scheduled_start,
      scheduled_end,
      estimated_hours,
      status,
      completion_percentage
    )
  `)
  .eq('company_id', companyId)
  .in('status', ['quote', 'scheduled', 'in_progress']);
```

**Step 3: Transform to Calendar Format**

```typescript
// Transform jobs to CalendarJobBlock format
const calendarJobs: CalendarJobBlock[] = jobs.map(job => {
  // Extract estimated hours from calculation_data
  const estimatedHours = job.services.reduce((sum, svc) => {
    return sum + (svc.calculation_data?.tier1Results?.totalManHours || 0);
  }, 0);

  // Extract estimated days
  const estimatedDays = Math.max(...job.services.map(svc =>
    svc.calculation_data?.tier1Results?.totalDays || 1
  ));

  return {
    job_id: job.id,
    job_number: job.job_number,
    title: job.title,
    customer_name: job.customer.customer_name,
    status: job.status,
    priority: job.priority,
    start: job.scheduled_start_date,
    end: job.scheduled_end_date,
    estimated_hours: estimatedHours, // From pricing calculation
    estimated_days: estimatedDays,   // From pricing calculation
    assignment_id: job.assignments[0]?.id,
    crew_id: job.assignments[0]?.crew_id,
    completion_percentage: job.assignments[0]?.completion_percentage || 0
  };
});
```

**Step 4: Create Assignment on Drag-Drop**

```typescript
// When user drops job on crew cell
async function handleJobDrop(
  jobId: string,
  crewId: string,
  dropDate: Date,
  estimatedHours: number,
  estimatedDays: number
) {
  // Calculate scheduled_end from estimated_days
  const scheduledStart = dropDate;
  const scheduledEnd = new Date(dropDate);
  scheduledEnd.setDate(scheduledEnd.getDate() + estimatedDays);

  // Check for conflicts first
  const conflicts = await checkScheduleConflicts(
    crewId,
    scheduledStart.toISOString(),
    scheduledEnd.toISOString()
  );

  if (conflicts.length > 0) {
    // Show conflict modal
    setConflictModalOpen(true);
    return;
  }

  // Create assignment in database
  const { data, error } = await supabase
    .from('ops_job_assignments')
    .insert({
      job_id: jobId,
      crew_id: crewId,
      scheduled_start: scheduledStart.toISOString(),
      scheduled_end: scheduledEnd.toISOString(),
      estimated_hours: estimatedHours, // FROM PRICING CALCULATION
      status: 'scheduled',
      completion_percentage: 0,
      assigned_by_user_id: currentUserId,
      metadata: {
        assigned_via: 'calendar_drag_drop',
        assigned_at: new Date().toISOString()
      }
    })
    .select()
    .single();

  // Update job status
  await supabase
    .from('ops_jobs')
    .update({
      status: 'scheduled',
      scheduled_start_date: scheduledStart.toISOString().split('T')[0],
      scheduled_end_date: scheduledEnd.toISOString().split('T')[0]
    })
    .eq('id', jobId);

  // Refresh calendar
  refreshCalendar();
}
```

**Key Database Considerations:**
1. ✅ Always populate `estimated_hours` from `calculation_data.tier1Results.totalManHours`
2. ✅ Calculate duration from `calculation_data.tier1Results.totalDays`
3. ✅ Check conflicts before creating assignment
4. ✅ Update both `ops_job_assignments` AND `ops_jobs` tables
5. ✅ Store assignment metadata (who assigned, when, via what method)

---

---

### Phase 2: Calendar UI Framework

**Database Integration Note:** All UI components read from and write to the database tables documented in Phase 1. See [Profit Pipeline Phase 6](./architecture/PROFIT-PIPELINE-MASTER-FLOW.md#phase-6-job-scheduling) for complete data flow diagrams.

#### 2.1 Week Timeline Header

**Requirements:**
- 7-day column headers (Sunday - Saturday)
- Date labels with "today" highlighting
- Navigation controls (previous/next week, today button)
- Week range display (e.g., "Jan 20 - Jan 26, 2025")

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  < Jan 20 - Jan 26, 2025 >              [Today]        │
├─────────────────────────────────────────────────────────┤
│ Sun  │ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat         │
│ 1/20 │ 1/21 │ 1/22 │ 1/23 │ 1/24 │ 1/25 │ 1/26        │
└─────────────────────────────────────────────────────────┘
```

**Implementation Notes:**
- Use `useMemo()` to calculate week dates
- Highlight today's column with accent color
- Mobile: Show abbreviated day names (S, M, T, W, T, F, S)

#### 2.2 Crew Rows

**Requirements:**
- Row for each mock crew
- Crew name + color indicator
- Utilization percentage (e.g., "Alpha Crew - 65% utilized")
- Grid cells aligned with date columns
- Drop zones for each date cell

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ 🔵 Alpha Crew (65%)  │ [grid cells for each day]       │
├─────────────────────────────────────────────────────────┤
│ 🟢 Bravo Crew (40%)  │ [grid cells for each day]       │
├─────────────────────────────────────────────────────────┤
│ 🟠 Charlie Crew (80%)│ [grid cells for each day]       │
└─────────────────────────────────────────────────────────┘
```

**Styling:**
- Row height: 120px (enough for 2 stacked job blocks)
- Cell borders: light gray (#E5E7EB)
- Hover state: highlight drop zone
- Color indicator: 12px circle with crew color

#### 2.3 Unassigned Jobs Section

**Requirements:**
- Special row at the top for jobs without crew assignments
- Expandable/collapsible
- Shows job count badge (e.g., "Unassigned (4)")
- Horizontal scroll if many jobs
- Acts as both source and drop target

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ 📋 Unassigned Jobs (4)                              [▼] │
├─────────────────────────────────────────────────────────┤
│ [JOB-001] [JOB-002] [JOB-003] [JOB-004]                │
└─────────────────────────────────────────────────────────┘
```

---

### Phase 3: Job Blocks

#### 3.1 Visual Design

**Job Block Structure:**
```
┌────────────────────────────┐
│ 🔴 JOB-2025-003           │ ← Priority indicator + Job number
│ Michael Chen              │ ← Customer name
│ Office Building Courtyard │ ← Job title (truncated)
│ Jan 20 - Jan 26          │ ← Date range
│ ███████████░░░ 75%       │ ← Completion bar
└────────────────────────────┘
```

**Size & Positioning:**
- Height: 100px
- Width: Calculated based on duration (days × column width)
- Left position: Calculated from start date
- Multi-day jobs span across columns
- Stacked vertically if overlapping on same crew

**Color Coding:**
- **Background**: Crew color at 20% opacity
- **Border**: Status color (2px solid)
  - `scheduled` = #8B5CF6 (purple)
  - `in_progress` = #F59E0B (orange)
  - `completed` = #10B981 (green)
  - `quote` = #94A3B8 (gray)
- **Priority Badge**: Corner indicator
  - 10 (Urgent) = Red circle
  - 8-9 (High) = Orange circle
  - 5-7 (Normal) = Blue circle
  - 0-4 (Low) = Gray circle

**Text Hierarchy:**
1. Job number (bold, 14px)
2. Customer name (medium, 12px)
3. Job title (regular, 11px, truncated)
4. Date range (small, 10px, muted)

**Completion Bar:**
- Width: 100% of block
- Height: 4px
- Color: Status color
- Background: Gray (#E5E7EB)
- Shows `completion_percentage` from database

#### 3.2 Responsive States

**Hover:**
- Elevation: box-shadow(0, 4px, 12px, rgba(0,0,0,0.15))
- Cursor: grab
- Slight scale (1.02)

**Dragging:**
- Opacity: 0.6
- Cursor: grabbing
- Ghost image follows mouse

**Conflict State:**
- Red border (3px)
- Warning icon in corner
- Pulsing animation

---

### Phase 4: Drag-and-Drop Implementation

#### 4.1 Technology Choice

**Library:** HTML5 Drag and Drop API (native, no dependencies)

**Why Native?**
- Already available in all browsers
- No bundle size increase
- Sufficient for our needs
- Touch support with polyfill if needed

**Alternative Considered:** `react-dnd` (too heavy for this use case)

#### 4.2 Drag Source (Job Blocks)

**Implementation:**
```typescript
// On JobBlock component
<div
  draggable={true}
  onDragStart={(e) => handleDragStart(e, jobBlock)}
  onDragEnd={(e) => handleDragEnd(e)}
>
```

**handleDragStart:**
1. Store job data in `dataTransfer`
2. Set drag image (ghost)
3. Apply dragging styles
4. Emit drag start event (for global state)

**Data Transfer:**
```typescript
e.dataTransfer.setData('application/json', JSON.stringify({
  type: 'job-block',
  jobId: jobBlock.job_id,
  assignmentId: jobBlock.assignment_id,
  sourceCrewId: crewId,
  startDate: jobBlock.start,
  endDate: jobBlock.end
}));
```

#### 4.3 Drop Targets (Crew Cells)

**Implementation:**
```typescript
// On CrewRow cell
<div
  onDragOver={(e) => handleDragOver(e)}
  onDragEnter={(e) => handleDragEnter(e)}
  onDragLeave={(e) => handleDragLeave(e)}
  onDrop={(e) => handleDrop(e, crewId, date)}
>
```

**handleDragOver:**
- Call `e.preventDefault()` to allow drop
- Check for conflicts and show visual indicator

**handleDrop:**
1. Parse dropped job data
2. Calculate new start/end dates based on drop cell
3. Extract `estimatedHours` and `estimatedDays` from job's `calculation_data`
4. Check for conflicts using database query (see Phase 1)
5. If conflicts: show confirmation modal
6. If no conflicts: create/update assignment in `ops_job_assignments` (see Phase 1, Step 4)
7. Update `ops_jobs.status` and scheduled dates
8. Refresh calendar from database

**Database Persistence (see Phase 1 for complete code):**
```typescript
// Uses the handleJobDrop() function from Phase 1
// which creates ops_job_assignments record and updates ops_jobs
await handleJobDrop(jobId, crewId, dropDate, estimatedHours, estimatedDays);
```

**Conflict Detection:**
```typescript
const conflicts = detectScheduleConflicts([
  ...existingAssignments,
  newAssignment
]);

if (conflicts.length > 0) {
  showConflictModal({
    message: 'This assignment overlaps with existing jobs',
    conflicts: conflicts,
    actions: ['Force Assign', 'Cancel']
  });
}
```

#### 4.4 Visual Feedback

**Drop Zone Highlighting:**
- Valid drop target: Green border (#10B981), 2px dashed
- Invalid drop target: Red border (#EF4444), 2px dashed
- Hover state: Background color at 5% opacity

**Drag Image:**
- Clone of job block at 80% opacity
- Shadow effect
- Cursor offset to center

**Conflict Indicators:**
- Red outline on conflicting blocks
- Warning icon overlay
- Shake animation (subtle)

---

### Phase 5: Quick Actions & Interactions

#### 5.1 Click Actions

**Single Click on Job Block:**
- Open `JobDetailModal` with full job information
- Modal shows all tabs: Details, Services, Schedule, Notes
- Already implemented in codebase

**Double Click on Job Block:**
- Quick edit mode (inline)
- Change dates with date picker
- Save or cancel

#### 5.2 Context Menu (Right-Click)

**Menu Options:**
```
┌─────────────────────────┐
│ 👁️  View Details        │
│ 📅 Reschedule...       │
│ 👷 Change Crew...      │
│ ✅ Mark Completed      │
│ ❌ Remove Assignment   │
│ 📋 Copy Job Number     │
└─────────────────────────┘
```

**Implementation:**
```typescript
<div
  onContextMenu={(e) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      jobId: jobBlock.job_id
    });
  }}
>
```

#### 5.3 Toolbar Actions

**Top Toolbar:**
```
┌─────────────────────────────────────────────────────────┐
│ [Filter by Status ▼] [Filter by Priority ▼] [🚨 Show Conflicts] │
│ [Week View] [Month View*] [Export...] [Print]          │
└─────────────────────────────────────────────────────────┘
```

**Filter by Status:**
- Multi-select dropdown
- Options: Quote, Scheduled, In Progress, Completed
- Live filtering (no refresh needed)

**Filter by Priority:**
- Slider: Low (0) to Urgent (10)
- Or discrete buttons: Low, Normal, High, Urgent

**Show Conflicts Toggle:**
- When ON: Highlight all conflicting blocks
- Show conflict count badge
- Panel with conflict list

#### 5.4 Keyboard Shortcuts

**Navigation:**
- `←` / `→` - Previous/Next week
- `T` - Jump to Today
- `Esc` - Close modals/menus

**Actions:**
- `N` - New job (open creation wizard)
- `F` - Focus search/filter
- `?` - Show keyboard shortcuts help

---

## File Structure

### Files to Create

1. **`src/components/schedule/CalendarGrid.tsx`** (~200 lines)
   - Reusable calendar grid component
   - Handles timeline rendering and layout
   - Week/month view switching logic

2. **`src/components/schedule/JobBlock.tsx`** (~150 lines)
   - Individual draggable job block component
   - Handles drag events and styling
   - Tooltip and click handlers

3. **`src/components/schedule/CrewRow.tsx`** (~180 lines)
   - Single crew row with drop zones
   - Utilization calculation display
   - Conflict visualization

4. **`src/components/schedule/UnassignedSection.tsx`** (~120 lines)
   - Unassigned jobs container
   - Horizontal scroll for overflow
   - Expand/collapse functionality

5. **`src/components/schedule/ConflictModal.tsx`** (~100 lines)
   - Modal for conflict resolution
   - Shows overlapping jobs
   - Force/cancel options

6. **`src/hooks/useScheduleCalendar.ts`** (~200 lines)
   - Custom hook for calendar state management
   - Drag-drop handlers
   - Conflict detection integration

### Files to Modify

1. **`src/components/schedule/ScheduleTab.tsx`** (major rewrite)
   - Replace skeleton with full calendar implementation
   - Integrate all sub-components
   - ~400-500 lines of code

---

## Implementation Checklist

### Milestone 1: Basic Calendar Layout
- [ ] Create CalendarGrid component with week view
- [ ] Implement week navigation (prev/next/today)
- [ ] Add date column headers
- [ ] Style with theme-aware colors

### Milestone 2: Crew Rows & Job Blocks
- [ ] Create CrewRow component with mock data
- [ ] Create JobBlock component
- [ ] Fetch 4 test jobs from database
- [ ] Transform jobs to CalendarJobBlock format
- [ ] Position job blocks based on dates
- [ ] Implement UnassignedSection

### Milestone 3: Drag-and-Drop
- [ ] Make JobBlock draggable
- [ ] Implement drop zones on crew cells
- [ ] Handle drag start/end events
- [ ] Update job position on drop
- [ ] Visual feedback during drag

### Milestone 4: Conflict Detection
- [ ] Integrate detectScheduleConflicts()
- [ ] Show conflict indicators on blocks
- [ ] Create ConflictModal component
- [ ] Implement conflict resolution flow

### Milestone 5: Interactions
- [ ] Click to open JobDetailModal
- [ ] Right-click context menu
- [ ] Toolbar filters
- [ ] Keyboard shortcuts

### Milestone 6: Polish
- [ ] Mobile responsive layout
- [ ] Loading states
- [ ] Error handling
- [ ] Accessibility (ARIA labels, keyboard nav)
- [ ] Theme support (light/dark)
- [ ] Performance optimization (virtualization if needed)

---

## Technical Specifications

### Layout Calculations

**Column Width:**
```typescript
const COLUMN_WIDTH = 140; // pixels per day
const MIN_COLUMN_WIDTH = 100; // mobile
```

**Job Block Width:**
```typescript
const calculateBlockWidth = (startDate: Date, endDate: Date): number => {
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
  return durationDays * COLUMN_WIDTH;
};
```

**Job Block Left Position:**
```typescript
const calculateBlockLeft = (startDate: Date, weekStart: Date): number => {
  const diffMs = startDate.getTime() - weekStart.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays * COLUMN_WIDTH;
};
```

**Stacking Logic:**
```typescript
// If two jobs overlap on same crew row, stack vertically
const calculateBlockTop = (
  jobBlock: CalendarJobBlock,
  existingBlocks: CalendarJobBlock[]
): number => {
  const overlapping = existingBlocks.filter(block =>
    doDateRangesOverlap(
      jobBlock.start, jobBlock.end,
      block.start, block.end
    )
  );

  const stackIndex = overlapping.length;
  return stackIndex * (JOB_BLOCK_HEIGHT + 8); // 8px gap
};
```

### State Management

**Main State Object:**
```typescript
interface ScheduleState {
  // Data
  crews: Crew[];
  jobs: CalendarJobBlock[];
  assignments: Map<string, string>; // jobId -> crewId

  // UI State
  currentWeekStart: Date;
  viewMode: 'week' | 'month';
  filters: {
    statuses: JobStatus[];
    priorities: number[];
    crewIds: string[];
  };

  // Drag State
  draggedJob: CalendarJobBlock | null;
  dropTarget: { crewId: string; date: Date } | null;

  // Conflicts
  conflicts: CalendarConflict[];
  showConflicts: boolean;
}
```

**Actions:**
```typescript
// Navigation
const goToNextWeek = () => { ... };
const goToPreviousWeek = () => { ... };
const goToToday = () => { ... };

// Assignment
const assignJobToCrew = (jobId: string, crewId: string, date: Date) => { ... };
const removeAssignment = (jobId: string) => { ... };
const rescheduleJob = (jobId: string, newStart: Date, newEnd: Date) => { ... };

// Filters
const setStatusFilter = (statuses: JobStatus[]) => { ... };
const setPriorityFilter = (min: number, max: number) => { ... };

// Conflicts
const checkForConflicts = () => { ... };
const resolveConflict = (conflictId: string, action: 'force' | 'cancel') => { ... };
```

---

## Test Scenarios

### Scenario 1: Display Test Jobs
**Given:** 4 test jobs in database
**When:** Open ScheduleTab
**Then:**
- All 4 jobs appear in Unassigned section
- Jobs show correct customer names, dates, priorities
- Week navigation shows Jan 10-Feb 15 range (to cover all jobs)

### Scenario 2: Assign Job to Crew
**Given:** Unassigned job visible
**When:** Drag JOB-2025-003 to Alpha Crew on Jan 20
**Then:**
- Job block moves to Alpha Crew row
- Block spans Jan 20-26 (6 days)
- Block shows blue background (Alpha Crew color)
- Unassigned count decreases to 3

### Scenario 3: Detect Overlap Conflict
**Given:** JOB-2025-003 assigned to Alpha Crew (Jan 20-26)
**When:** Drag JOB-2025-002 to Alpha Crew on Jan 27
**Then:**
- No conflict (dates don't overlap)
- Job is assigned successfully

**When:** Drag JOB-2025-002 to Alpha Crew on Jan 25
**Then:**
- Conflict detected (overlaps with JOB-003)
- Red border appears on both blocks
- ConflictModal shows warning
- User can force assign or cancel

### Scenario 4: Multi-Day Job Display
**Given:** JOB-2025-003 (6-day duration)
**When:** View in calendar
**Then:**
- Block spans 6 columns (Jan 20-26)
- Text remains readable (not stretched)
- Dates shown as range: "Jan 20 - Jan 26"

### Scenario 5: Mobile View
**Given:** Screen width < 768px
**When:** Open ScheduleTab
**Then:**
- Crew rows stack vertically
- Column width adjusts to fit screen
- Horizontal scroll enabled for week view
- Touch drag works for job blocks

---

## Performance Considerations

### Optimization Strategies

1. **Virtualization (if needed)**
   - Use `react-window` for crew rows if > 20 crews
   - Not needed for current scope (3 mock crews)

2. **Memoization**
   ```typescript
   const weekDates = useMemo(() => calculateWeekDates(weekStart), [weekStart]);
   const filteredJobs = useMemo(() => applyFilters(jobs, filters), [jobs, filters]);
   const conflicts = useMemo(() => detectScheduleConflicts(assignments), [assignments]);
   ```

3. **Debouncing**
   - Debounce filter inputs (300ms)
   - Throttle scroll/resize events

4. **Lazy Loading**
   - Load jobs for current week only
   - Prefetch adjacent weeks on navigation

5. **Render Optimization**
   ```typescript
   // Avoid re-renders
   const JobBlock = React.memo(JobBlockComponent);
   const CrewRow = React.memo(CrewRowComponent);
   ```

---

## Accessibility (A11y)

### ARIA Labels
```tsx
<div
  role="button"
  tabIndex={0}
  aria-label={`Job ${jobNumber} for ${customerName}, ${formatDate(start)} to ${formatDate(end)}`}
  aria-describedby={`job-${jobId}-details`}
>
```

### Keyboard Navigation
- Tab: Focus next job block
- Shift+Tab: Focus previous job block
- Enter/Space: Open job detail
- Arrow keys: Navigate week
- Escape: Close modals

### Screen Reader Support
- Announce drag start/end
- Announce conflict warnings
- Describe crew utilization percentages

### Color Contrast
- Ensure text contrast ratio ≥ 4.5:1
- Use patterns in addition to colors for status
- High contrast mode support

---

## Future Enhancements (Out of Scope)

### Phase 2 Features
- [ ] Month view calendar
- [ ] Multi-crew assignment (assign job to multiple crews)
- [ ] Recurring job patterns
- [ ] Crew availability tracking (vacation, sick days)
- [ ] Weather integration (show forecast on calendar)
- [ ] Time-of-day scheduling (hour-level granularity)

### Phase 3 Features
- [ ] AI-powered schedule optimization
- [ ] Resource capacity planning
- [ ] Gantt chart timeline view
- [ ] Export to Google Calendar / Outlook
- [ ] Push notifications for schedule changes
- [ ] Real-time collaboration (WebSocket updates)
- [ ] Mobile app with offline support

### Integration Features
- [ ] Connect to real crews table (when populated)
- [ ] Persist assignments to database
- [ ] Sync with job status changes
- [ ] Email notifications on assignment changes

---

## Success Metrics

### Functional Requirements
✅ Week timeline displays correctly with date navigation
✅ 4 test jobs appear as draggable blocks with correct dates
✅ Jobs can be dragged between crew rows and unassigned section
✅ Visual conflict detection when jobs overlap on same crew
✅ Job details appear on click
✅ Mobile-responsive layout (stack crews vertically on small screens)
✅ Theme-aware styling (light/dark mode support)

### User Experience Goals
- Drag-drop feels smooth (< 16ms response time)
- Conflicts are immediately visible
- Calendar loads in < 1 second
- Works on mobile (touch drag)
- Intuitive without training

### Code Quality Standards
- TypeScript strict mode (no `any` types)
- All components have prop types
- 80%+ test coverage (future)
- Documented with TSDoc comments
- Follows existing code style

---

## Estimated Effort

**Total Lines of Code:** ~800 new lines

**Component Breakdown:**
- `ScheduleTab.tsx` (major rewrite): 400 lines
- `CalendarGrid.tsx`: 200 lines
- `JobBlock.tsx`: 150 lines
- `CrewRow.tsx`: 180 lines
- `UnassignedSection.tsx`: 120 lines
- `ConflictModal.tsx`: 100 lines
- `useScheduleCalendar.ts`: 200 lines

**Complexity:** Medium
- Drag-drop API (moderate)
- Date calculations (moderate)
- Layout logic (moderate)
- Conflict detection (already implemented)

**Timeline Estimate:**
- Milestone 1-2: 2-3 hours
- Milestone 3-4: 2-3 hours
- Milestone 5-6: 1-2 hours
- **Total: 5-8 hours**

---

## References

### Database Architecture (AUTHORITATIVE)
**📚 [docs/architecture/PROFIT-PIPELINE-MASTER-FLOW.md](./architecture/PROFIT-PIPELINE-MASTER-FLOW.md)**
- **Phase 6: Job Scheduling** - Complete `ops_job_assignments` schema and data flow
- **Phase 7: Crew Assignment** - Complete `ops_crews` and `ops_crew_members` schemas
- **Crew Utilization SQL** - Exact queries for calculating crew workload
- **Conflict Detection SQL** - Database queries for overlap detection
- **Pricing Integration** - How `calculation_data.tier1Results` feeds into scheduling

**Critical Sections:**
- Phase 6 → `ops_job_assignments` table (19 columns) - ALL fields used in calendar
- Phase 7 → `ops_crews` table (14 columns) - Crew row data source
- Data Synchronization Map → Field-by-field pipeline flow
- JSONB Field Structures → `metadata`, `calculation_data` examples

### Existing Code to Leverage
- [src/types/jobs-views.ts](../src/types/jobs-views.ts) - Type definitions
- [src/services/ScheduleService.ts](../src/services/ScheduleService.ts) - Business logic (uses profit pipeline queries)
- [src/components/jobs/views/JobsCalendarView.tsx](../src/components/jobs/views/JobsCalendarView.tsx) - Week navigation example
- [src/components/jobs/JobDetailModal.tsx](../src/components/jobs/detail/JobDetailModal.tsx) - Job detail modal

### External Resources
- [MDN: HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
- [React DnD (alternative)](https://react-dnd.github.io/react-dnd/) - Not using, but good reference
- [FullCalendar](https://fullcalendar.io/) - Inspiration for UI patterns

---

## Notes

### Database Integration Status
- ✅ **Database schema fully documented** in Profit Pipeline Master Flow document
- ✅ **Field mappings defined** - UI components map directly to database fields
- ✅ **SQL queries provided** - Crew utilization and conflict detection
- ✅ **Pricing integration mapped** - `calculation_data` → `estimated_hours` flow documented
- 🔄 **Mock data fallback** - If `ops_crews` table empty, use mock crews for development
- 🔄 **Real crew integration** - Automatic when crews are created in database (no code changes needed)

### Implementation Philosophy
- **Database-first design:** All UI reads from and writes to actual database tables
- **Profit pipeline alignment:** This calendar is the visual interface for Phases 6-7
- **Persistence by default:** Drag-drop operations persist immediately to `ops_job_assignments`
- **Pricing-driven scheduling:** Labor estimates from pricing engine drive job duration and crew workload
- **Metadata extensibility:** `metadata` JSONB fields allow calendar-specific data without schema changes

---

**Last Updated:** 2025-01-24 (Database architecture sync)
**Document Owner:** Development Team
**Next Review:** After implementation milestone 3

**Synchronized With:** [docs/architecture/PROFIT-PIPELINE-MASTER-FLOW.md](./architecture/PROFIT-PIPELINE-MASTER-FLOW.md) - Phase 6 & 7
