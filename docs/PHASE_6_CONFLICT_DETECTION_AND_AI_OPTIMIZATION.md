# Phase 6: Conflict Detection & AI-Powered Schedule Optimization

**Created:** 2025-01-24
**Status:** Planning
**Prerequisites:** Phases 1-5 Complete
**Target:** Intelligent conflict detection with AI optimization suggestions

---

## Executive Summary

Phase 6 introduces **intelligent conflict detection** and **AI-powered schedule optimization** to the scheduling calendar. Beyond simply detecting when two jobs overlap, this phase adds smart suggestions for resolving conflicts, optimizing crew utilization, and making scheduling decisions based on job priority, crew expertise, travel time, and workload balance.

---

## Previous Phases Recap (Context for AI)

### Phase 1: Foundation ✅
**What was built:**
- Type definitions for calendar components (`CalendarJobBlock`, `CalendarCrewRow`, `CalendarConflict`)
- Helper functions: `detectScheduleConflicts()`, `doDateRangesOverlap()`, `calculateCrewUtilization()`
- Date utilities: `formatShortDate()`, `addDays()`, `isSameDay()`

**Key infrastructure:**
- Mock crew data (3 crews: Alpha, Bravo, Charlie)
- Job transformation logic from database to calendar format
- Conflict detection algorithm (checks for overlapping date ranges)

### Phase 2: Data Layer ✅
**What was built:**
- Supabase integration via `useScheduleCalendar` hook
- Real-time job fetching from `ops_jobs` table
- Assignment tracking via `ops_job_assignments` table
- Crew utilization calculations

**Data flow:**
```typescript
Database (ops_jobs + ops_job_assignments)
    ↓
useScheduleCalendar hook
    ↓
CalendarJobBlock[] (transformed for UI)
    ↓
Calendar components
```

**Key fields used:**
- `job_id`, `job_number`, `customer_name`, `title`
- `scheduled_start`, `scheduled_end` (timestamptz with 8am-5pm blocks)
- `estimated_hours`, `estimated_days` (from pricing calculation)
- `status`, `priority`, `completion_percentage`

### Phase 3: Static Calendar UI ✅
**What was built:**
- `WeekHeader` component (7-day timeline with navigation)
- `CalendarGrid` component (main grid layout)
- `CrewRow` component (individual crew rows with 7-day cells)
- `JobBlock` component (visual job cards with priority indicators)
- `UnassignedSection` component (draggable job source)

**Visual design:**
- Job blocks span multiple days based on `estimated_days`
- Color-coded by crew (background) and status (border)
- Priority badges (red=urgent, orange=high, blue=normal, gray=low)
- Completion percentage progress bar

### Phase 4: Drag-and-Drop ✅
**What was built:**
- HTML5 Drag-and-Drop API implementation
- Job blocks draggable from unassigned section to crew rows
- 8am-5pm time-block scheduling system
- Database persistence on drop with dual-table sync

**Business hours logic:**
```typescript
// When job is dropped on a date:
scheduledStart = dropDate at 8:00 AM
scheduledEnd = dropDate + estimatedDays at 5:00 PM

// Example: 3-day job dropped on Monday Jan 20
// Start: 2025-01-20 08:00:00
// End:   2025-01-23 17:00:00
```

**Database sync:**
- Creates `ops_job_assignments` record (timestamptz with hours)
- Updates `ops_jobs` record (date-only fields)
- Database trigger auto-syncs between tables
- Function `cancel_existing_job_assignments()` handles re-dragging

### Phase 5: Quick Actions & Interactions ✅
**What was built:**
- **ContextMenu**: Right-click menu with 6 actions (View Details, Reschedule, Change Crew, Mark Completed, Remove Assignment, Copy Job Number)
- **Toolbar**: Status/priority filters with multi-select dropdowns
- **Keyboard Shortcuts**: Navigation (←/→/T), Actions (N/F/?), Help (?)
- **JobDetailModal Integration**: Single-click opens full job details
- **Filtered Views**: Client-side filtering by status and priority

**User interactions:**
- Click job block → Open details modal
- Double-click job block → Quick edit placeholder (Phase 6)
- Right-click job block → Context menu
- `?` key → Show keyboard shortcuts help
- Filter toolbar → Live job filtering

**Current state:**
- Conflict detection function exists (`detectScheduleConflicts()`)
- "Show Conflicts" toggle in toolbar (not yet functional)
- No visual conflict indicators yet
- No conflict resolution workflow

---

## Phase 6 Goals & Scope

### 🎯 Primary Objectives

1. **Real-Time Conflict Detection**
   - Detect overlapping assignments during drag-drop (before commit)
   - Detect conflicts when "Show Conflicts" toggle is enabled
   - Visual indicators on conflicting job blocks
   - Conflict count badge in toolbar

2. **Conflict Resolution UI**
   - Modal with conflict details and resolution options
   - Options: Force Assign, Reassign to Different Crew, Cancel
   - Show affected jobs with dates, durations, and crew info
   - One-click resolution actions

3. **AI-Powered Schedule Optimization**
   - Backend API endpoint for schedule analysis
   - AI suggestions for resolving conflicts
   - Consider: job priority, crew expertise, travel time, workload balance
   - Smart crew recommendations based on job requirements

4. **Enhanced Time-Block Precision**
   - Hourly-level job placement visualization
   - Show actual time spans within 8am-5pm blocks
   - Visual gaps between jobs on same crew/day
   - Better utilization visibility

---

## Conflict Detection Deep Dive

### What Constitutes a Conflict?

**Same-Day Full Overlap:**
```
Alpha Crew - Monday, Jan 20
━━━━━━━━━━━━━━━━━━━━━━━━━━━
8am              12pm       5pm
[████ Job A (9 hours) ████]
[████ Job B (8 hours) ████]  ← CONFLICT
```

**Multi-Day Partial Overlap:**
```
Bravo Crew
        Mon    Tue    Wed    Thu
Job A: [████][████][████]
Job B:        [████][████][████]
              ↑ CONFLICT on Tue + Wed
```

**Hour-Level Overlap (Phase 6 Enhancement):**
```
Charlie Crew - Monday, Jan 20
━━━━━━━━━━━━━━━━━━━━━━━━━━━
8am   10am   12pm   2pm    5pm
[Job A: 4hrs]
              [Job B: 5hrs]      ← NO CONFLICT (gap)
[Job C: 8hrs  ━━━━━━━━━━━]
      [Job D: 3hrs]              ← CONFLICT with C
```

### Conflict Detection Algorithm (Enhanced)

```typescript
interface ConflictDetectionInput {
  crewId: string;
  newJobStart: Date;
  newJobEnd: Date;
  newJobHours: number;
  existingAssignments: Assignment[];
}

interface ConflictResult {
  hasConflict: boolean;
  conflicts: ConflictDetail[];
  suggestions: AISuggestion[];
  severity: 'critical' | 'warning' | 'info';
}

async function detectConflictsWithAI(
  input: ConflictDetectionInput
): Promise<ConflictResult> {
  // Step 1: Database-level conflict check (fast)
  const dbConflicts = await checkScheduleConflicts(
    input.crewId,
    input.newJobStart.toISOString(),
    input.newJobEnd.toISOString()
  );

  if (dbConflicts.length === 0) {
    return { hasConflict: false, conflicts: [], suggestions: [], severity: 'info' };
  }

  // Step 2: Hour-level analysis
  const hourlyConflicts = analyzeHourlyOverlap(
    input.newJobHours,
    input.newJobStart,
    dbConflicts
  );

  // Step 3: AI optimization (backend API call)
  const aiSuggestions = await callAIScheduleOptimizer({
    conflict: hourlyConflicts,
    allCrews: crews,
    allJobs: jobs,
    context: {
      travelTimes: calculateTravelTimes(),
      crewExpertise: getCrewSpecializations(),
      currentUtilization: calculateUtilization()
    }
  });

  return {
    hasConflict: true,
    conflicts: hourlyConflicts,
    suggestions: aiSuggestions,
    severity: calculateSeverity(hourlyConflicts)
  };
}
```

---

## AI-Powered Optimization

### Backend API Design

**Endpoint:** `POST /api/schedule/optimize`

**Request Payload:**
```typescript
interface OptimizationRequest {
  conflict: {
    crewId: string;
    conflictingJobs: {
      jobId: string;
      jobNumber: string;
      priority: number;
      estimatedHours: number;
      scheduledStart: string;
      scheduledEnd: string;
      services: string[];  // e.g., ["hardscape", "patio"]
    }[];
    newJob: {
      jobId: string;
      jobNumber: string;
      priority: number;
      estimatedHours: number;
      requestedStart: string;
      requestedEnd: string;
      services: string[];
    };
  };
  crews: {
    crewId: string;
    crewName: string;
    specializations: string[];
    currentUtilization: number;
    maxCapacity: number;
    currentJobs: string[];
  }[];
  constraints: {
    maxTravelTimeMinutes: number;
    preferSameCrew: boolean;
    balanceWorkload: boolean;
  };
}
```

**Response Payload:**
```typescript
interface OptimizationResponse {
  recommendations: {
    rank: number;
    strategy: 'reassign_new' | 'reassign_existing' | 'reschedule' | 'force_assign';
    description: string;
    targetCrew?: string;
    targetDate?: string;
    confidence: number;  // 0-1
    reasoning: string[];
    pros: string[];
    cons: string[];
    impactScore: number;  // 0-100
  }[];
  visualizationData: {
    beforeUtilization: CrewUtilization[];
    afterUtilization: CrewUtilization[];
  };
}
```

### AI Reasoning Factors

The AI optimization engine considers:

1. **Job Priority**
   - Urgent jobs (priority 10) should take precedence
   - Commercial jobs may have stricter deadlines
   - Customer history (repeat customers vs. new)

2. **Crew Expertise**
   - Crew specializations match job services
   - Past performance on similar jobs
   - Skill level requirements

3. **Travel Time**
   - Geographic proximity of job sites
   - Current crew location
   - Minimize drive time between jobs

4. **Workload Balance**
   - Even distribution across crews
   - Avoid overloading single crew
   - Consider crew capacity limits

5. **Schedule Continuity**
   - Prefer keeping job with original crew (familiarity)
   - Minimize job fragmentation across days
   - Respect customer requested dates when possible

### Example AI Suggestion Output

```
📊 AI Optimization Suggestions

┌─────────────────────────────────────────────────┐
│ Recommendation #1 (Confidence: 92%)            │
├─────────────────────────────────────────────────┤
│ Strategy: Reassign New Job to Different Crew   │
│                                                 │
│ 💡 Move Job #2025-005 (Johnson Property)      │
│    FROM: Alpha Crew (Mon Jan 20)              │
│    TO:   Bravo Crew (Mon Jan 20)              │
│                                                 │
│ ✅ Pros:                                        │
│  • Bravo Crew has 40% utilization (capacity)  │
│  • Bravo specializes in walkways (job match)  │
│  • Only 15 min travel from current location   │
│                                                 │
│ ⚠️  Cons:                                        │
│  • Bravo crew not familiar with customer      │
│                                                 │
│ Impact Score: 85/100                           │
│                                                 │
│ [Apply Suggestion]  [View Details]             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Recommendation #2 (Confidence: 78%)            │
├─────────────────────────────────────────────────┤
│ Strategy: Reschedule Existing Job              │
│                                                 │
│ 💡 Move Job #2025-001 (Miller Residence)      │
│    FROM: Alpha Crew (Mon Jan 20)              │
│    TO:   Alpha Crew (Tue Jan 21)              │
│                                                 │
│ ✅ Pros:                                        │
│  • Keeps both jobs with Alpha crew            │
│  • Miller job is lower priority (5 vs. 8)     │
│  • Tuesday is available                        │
│                                                 │
│ ⚠️  Cons:                                        │
│  • Changes customer-requested date            │
│  • Requires customer notification             │
│                                                 │
│ Impact Score: 72/100                           │
│                                                 │
│ [Apply Suggestion]  [Contact Customer]         │
└─────────────────────────────────────────────────┘
```

---

## Hour-Level Time Block Visualization

### Current State (Phase 4)
```
Monday, Jan 20 (Alpha Crew)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
8am              12pm       5pm
[████████████████████████████]  Job A (full day)
```

### Phase 6 Enhancement
```
Monday, Jan 20 (Alpha Crew)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
8am   9    10   11   12   1    2    3    4    5pm
[Job A: 4hrs ██]
                  [Job B: 3hrs ███]
                               [C: 2hrs ██]

Available hours: 0 (9 hours scheduled out of 9)
```

### Implementation Approach

**Data Structure:**
```typescript
interface HourlyTimeBlock {
  jobId: string;
  startHour: number;  // 0-23 (8 = 8am)
  endHour: number;    // 0-23 (17 = 5pm)
  durationHours: number;
}

interface DaySchedule {
  date: Date;
  crewId: string;
  availableHours: number;  // 0-9 (8am-5pm = 9 hours)
  scheduledBlocks: HourlyTimeBlock[];
  gaps: { startHour: number; endHour: number; durationHours: number }[];
}
```

**Calculation Logic:**
```typescript
function calculateHourlySchedule(
  assignments: Assignment[],
  date: Date,
  crewId: string
): DaySchedule {
  const blocks: HourlyTimeBlock[] = [];
  const workDayStart = 8;  // 8am
  const workDayEnd = 17;   // 5pm
  const totalHours = workDayEnd - workDayStart;  // 9 hours

  // Filter assignments for this crew and date
  const dayAssignments = assignments.filter(a =>
    a.crew_id === crewId &&
    isSameDay(a.scheduled_start, date)
  );

  // Sort by start time
  dayAssignments.sort((a, b) =>
    new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
  );

  let currentHour = workDayStart;

  for (const assignment of dayAssignments) {
    const start = new Date(assignment.scheduled_start);
    const startHour = start.getHours();
    const durationHours = assignment.estimated_hours;

    blocks.push({
      jobId: assignment.job_id,
      startHour: startHour,
      endHour: startHour + durationHours,
      durationHours: durationHours
    });

    currentHour = startHour + durationHours;
  }

  // Calculate gaps
  const gaps = [];
  let lastEnd = workDayStart;

  for (const block of blocks) {
    if (block.startHour > lastEnd) {
      gaps.push({
        startHour: lastEnd,
        endHour: block.startHour,
        durationHours: block.startHour - lastEnd
      });
    }
    lastEnd = Math.max(lastEnd, block.endHour);
  }

  // Add end-of-day gap if exists
  if (lastEnd < workDayEnd) {
    gaps.push({
      startHour: lastEnd,
      endHour: workDayEnd,
      durationHours: workDayEnd - lastEnd
    });
  }

  const scheduledHours = blocks.reduce((sum, b) => sum + b.durationHours, 0);

  return {
    date,
    crewId,
    availableHours: totalHours - scheduledHours,
    scheduledBlocks: blocks,
    gaps
  };
}
```

**Visual Rendering:**
```tsx
// Job block with hour-level positioning
<div
  style={{
    position: 'absolute',
    left: `${((startHour - 8) / 9) * 100}%`,  // Percentage of day
    width: `${(durationHours / 9) * 100}%`,   // Percentage of day
    backgroundColor: crewColor,
    border: `2px solid ${statusColor}`
  }}
>
  <div className="job-time-indicator">
    {startHour}:00 - {endHour}:00 ({durationHours}h)
  </div>
</div>
```

---

## Implementation Plan

### Step 1: Enhanced Conflict Detection
**Files to create:**
- `src/components/schedule/hooks/useConflictDetection.ts`
- `src/components/schedule/calendar/ConflictIndicator.tsx`

**Tasks:**
- [ ] Hook that runs `detectScheduleConflicts()` on filtered jobs
- [ ] Return conflicts grouped by crew and date
- [ ] Expose conflict count for toolbar badge
- [ ] Trigger detection when "Show Conflicts" toggle enabled
- [ ] Real-time detection during drag-drop

### Step 2: Conflict Resolution Modal
**Files to create:**
- `src/components/schedule/calendar/ConflictModal.tsx`
- `src/components/schedule/calendar/ConflictResolutionOptions.tsx`

**Tasks:**
- [ ] Modal showing conflicting jobs with details
- [ ] Visual timeline of overlap
- [ ] Resolution action buttons (Force, Reassign, Cancel)
- [ ] Confirmation dialogs for destructive actions

### Step 3: Visual Conflict Indicators
**Files to modify:**
- `src/components/schedule/calendar/JobBlock.tsx`
- `src/components/schedule/calendar/CrewRow.tsx`
- `src/styles/animations.css`

**Tasks:**
- [ ] Red pulsing border on conflicting job blocks
- [ ] Warning icon (⚠️) overlay
- [ ] Shake animation on hover
- [ ] Tooltip showing conflict details
- [ ] Highlight conflicting day cells in crew row

### Step 4: AI Optimization API Integration
**Files to create:**
- `src/services/ScheduleOptimizationService.ts`
- `src/types/schedule-optimization.ts`

**Tasks:**
- [ ] TypeScript interfaces for API request/response
- [ ] API client function for `/api/schedule/optimize`
- [ ] Error handling and loading states
- [ ] Cache optimization results (5 min TTL)
- [ ] Fallback to basic suggestions if API fails

### Step 5: AI Suggestion UI
**Files to create:**
- `src/components/schedule/calendar/AISuggestionPanel.tsx`
- `src/components/schedule/calendar/SuggestionCard.tsx`

**Tasks:**
- [ ] Panel showing ranked AI suggestions
- [ ] Visual before/after crew utilization charts
- [ ] One-click apply suggestion buttons
- [ ] Confidence score display
- [ ] Reasoning explanation (pros/cons)

### Step 6: Hour-Level Visualization
**Files to modify:**
- `src/components/schedule/hooks/useJobPositioning.ts`
- `src/components/schedule/calendar/JobBlock.tsx`
- `src/components/schedule/calendar/CrewRow.tsx`

**Tasks:**
- [ ] Calculate hour-level positions for job blocks
- [ ] Show time labels on blocks (e.g., "8am-12pm")
- [ ] Display gaps between jobs
- [ ] Show available hours remaining in day
- [ ] Tooltip with detailed time breakdown

---

## Backend API Specification

### Endpoint: Schedule Optimization

**URL:** `POST /api/schedule/optimize`

**Authentication:** Bearer token (user must have scheduling permissions)

**Rate Limiting:** 10 requests per minute per user

**Request Body:**
```json
{
  "conflict": {
    "crewId": "crew-alpha-001",
    "conflictingJobs": [
      {
        "jobId": "job-2025-001",
        "jobNumber": "JOB-2025-001",
        "priority": 5,
        "estimatedHours": 8,
        "scheduledStart": "2025-01-20T08:00:00Z",
        "scheduledEnd": "2025-01-20T17:00:00Z",
        "services": ["hardscape", "patio"]
      },
      {
        "jobId": "job-2025-005",
        "jobNumber": "JOB-2025-005",
        "priority": 8,
        "estimatedHours": 6,
        "scheduledStart": "2025-01-20T08:00:00Z",
        "scheduledEnd": "2025-01-20T17:00:00Z",
        "services": ["walkway"]
      }
    ]
  },
  "crews": [
    {
      "crewId": "crew-alpha-001",
      "crewName": "Alpha Crew",
      "specializations": ["hardscape", "patio"],
      "currentUtilization": 75,
      "maxCapacity": 4
    },
    {
      "crewId": "crew-bravo-002",
      "crewName": "Bravo Crew",
      "specializations": ["walkway", "driveway"],
      "currentUtilization": 40,
      "maxCapacity": 3
    }
  ],
  "constraints": {
    "maxTravelTimeMinutes": 30,
    "preferSameCrew": true,
    "balanceWorkload": true
  }
}
```

**Response (200 OK):**
```json
{
  "recommendations": [
    {
      "rank": 1,
      "strategy": "reassign_new",
      "description": "Move Job #2025-005 to Bravo Crew on same date",
      "targetCrew": "crew-bravo-002",
      "targetDate": "2025-01-20",
      "confidence": 0.92,
      "reasoning": [
        "Bravo Crew has 40% utilization (has capacity)",
        "Bravo specializes in walkways (exact match)",
        "Only 15 min travel from current location"
      ],
      "pros": [
        "Resolves conflict immediately",
        "Better crew match for walkway service",
        "Balances workload across crews"
      ],
      "cons": [
        "Bravo crew not familiar with customer"
      ],
      "impactScore": 85
    },
    {
      "rank": 2,
      "strategy": "reschedule",
      "description": "Move Job #2025-001 to next available day",
      "targetCrew": "crew-alpha-001",
      "targetDate": "2025-01-21",
      "confidence": 0.78,
      "reasoning": [
        "Keeps both jobs with Alpha crew",
        "Job #2025-001 is lower priority (5 vs. 8)",
        "Tuesday Jan 21 is available"
      ],
      "pros": [
        "Maintains crew continuity",
        "Respects higher priority job"
      ],
      "cons": [
        "Changes customer-requested date",
        "Requires customer notification"
      ],
      "impactScore": 72
    }
  ],
  "visualizationData": {
    "beforeUtilization": [
      { "crewId": "crew-alpha-001", "utilization": 155 },
      { "crewId": "crew-bravo-002", "utilization": 40 }
    ],
    "afterUtilization": [
      { "crewId": "crew-alpha-001", "utilization": 75 },
      { "crewId": "crew-bravo-002", "utilization": 60 }
    ]
  }
}
```

**Error Responses:**
```json
// 400 Bad Request
{
  "error": "Invalid request",
  "details": "conflictingJobs array cannot be empty"
}

// 429 Too Many Requests
{
  "error": "Rate limit exceeded",
  "retryAfter": 45
}

// 500 Internal Server Error
{
  "error": "AI service unavailable",
  "fallbackSuggestions": [
    {
      "rank": 1,
      "strategy": "reassign_new",
      "description": "Basic suggestion: Try Bravo Crew (lower utilization)",
      "confidence": 0.5
    }
  ]
}
```

---

## AI Model Considerations

### Option 1: OpenAI GPT-4 (Recommended for MVP)
**Pros:**
- Excellent reasoning capabilities
- Easy API integration
- Good at explaining decisions

**Cons:**
- Cost per request (~$0.03-0.06)
- External dependency
- Potential latency (2-5 seconds)

**Implementation:**
```typescript
const prompt = `
You are a scheduling optimization AI for a landscaping company.

Given the following conflict:
- Crew: ${conflict.crewName}
- Conflicting Jobs: ${JSON.stringify(conflict.jobs)}

And available crews:
${JSON.stringify(crews)}

Provide 2-3 ranked recommendations to resolve this conflict.
Consider: job priority, crew expertise, travel time, workload balance.

Return JSON format:
{
  "recommendations": [
    {
      "rank": 1,
      "strategy": "reassign_new | reassign_existing | reschedule",
      "reasoning": ["reason 1", "reason 2"],
      "pros": ["pro 1"],
      "cons": ["con 1"],
      "confidence": 0.85
    }
  ]
}
`;

const response = await openai.chat.completions.create({
  model: "gpt-4-turbo-preview",
  messages: [{ role: "user", content: prompt }],
  response_format: { type: "json_object" }
});
```

### Option 2: Local ML Model (Future)
**Pros:**
- No per-request cost
- Lower latency (<500ms)
- Data privacy

**Cons:**
- Requires training data
- Maintenance overhead
- Lower reasoning quality initially

### Option 3: Rule-Based Heuristics (Fallback)
**Pros:**
- Instant response
- No external dependencies
- Predictable

**Cons:**
- Less intelligent
- Doesn't learn from usage

**Implementation:**
```typescript
function generateBasicSuggestions(conflict, crews) {
  const suggestions = [];

  // Rule 1: Recommend least utilized crew
  const leastUtilized = crews
    .filter(c => c.crewId !== conflict.crewId)
    .sort((a, b) => a.currentUtilization - b.currentUtilization)[0];

  if (leastUtilized) {
    suggestions.push({
      rank: 1,
      strategy: 'reassign_new',
      targetCrew: leastUtilized.crewId,
      reasoning: [`${leastUtilized.crewName} has lower utilization`],
      confidence: 0.6
    });
  }

  // Rule 2: Suggest rescheduling lower priority job
  const lowestPriority = conflict.jobs
    .sort((a, b) => a.priority - b.priority)[0];

  suggestions.push({
    rank: 2,
    strategy: 'reschedule',
    jobId: lowestPriority.jobId,
    reasoning: ['Lower priority job can be rescheduled'],
    confidence: 0.5
  });

  return suggestions;
}
```

---

## Testing Scenarios

### Test Case 1: Same-Day Conflict Detection
**Setup:**
- Alpha Crew has Job A scheduled Monday 8am-5pm
- User drags Job B to Alpha Crew Monday

**Expected:**
- Conflict detected before drop completes
- Modal appears with conflict details
- Shows both jobs with dates
- Offers resolution options

### Test Case 2: AI Suggestion Acceptance
**Setup:**
- Conflict exists between 2 jobs
- AI suggests moving Job B to Bravo Crew

**Expected:**
- User clicks "Apply Suggestion"
- Job B moves to Bravo Crew seamlessly
- Database updates both assignments
- Conflict disappears
- Success notification shown

### Test Case 3: Hour-Level Visualization
**Setup:**
- Alpha Crew has:
  - Job A: 8am-12pm (4 hours)
  - Job B: 1pm-4pm (3 hours)

**Expected:**
- Job blocks positioned with gap at 12pm-1pm
- Gap shows "1 hour available"
- Blocks show time labels
- Available hours: 2 hours (4pm-5pm + lunch gap)

### Test Case 4: Multi-Day Conflict
**Setup:**
- Job A: Mon-Wed (3 days)
- User drags Job B: Tue-Thu (3 days)

**Expected:**
- Conflict detected for Tue-Wed overlap
- Visual indicator on both days
- AI suggests splitting jobs or rescheduling

### Test Case 5: Force Assign Override
**Setup:**
- Conflict exists, user chooses "Force Assign Anyway"

**Expected:**
- Confirmation dialog with warning
- Both jobs remain assigned (red borders)
- Metadata flag `conflict_override: true`
- Conflict persists in reports for manager review

---

## Success Metrics

**Functional Requirements:**
- ✅ Conflicts detected in <100ms
- ✅ AI suggestions generated in <5 seconds
- ✅ Visual indicators appear on all conflicting blocks
- ✅ Resolution actions work correctly
- ✅ Hour-level visualization is accurate

**User Experience:**
- Conflict modal is intuitive (no training needed)
- AI suggestions are actionable
- One-click apply works smoothly
- Visual timeline is clear

**Business Impact:**
- Reduce scheduling conflicts by 80%
- Improve crew utilization by 15%
- Save manager time (10+ min per conflict resolution)

---

## Implementation Checklist

### Week 1: Conflict Detection
- [ ] `useConflictDetection` hook
- [ ] Visual conflict indicators on JobBlock
- [ ] Conflict count badge in toolbar
- [ ] ConflictModal component
- [ ] Real-time detection during drag-drop

### Week 2: AI Integration
- [ ] `ScheduleOptimizationService.ts`
- [ ] Backend API endpoint (if needed)
- [ ] OpenAI GPT-4 integration
- [ ] Fallback to rule-based heuristics
- [ ] AISuggestionPanel component

### Week 3: Hour-Level Visualization
- [ ] Hour-level positioning logic
- [ ] Time labels on job blocks
- [ ] Gap calculation and display
- [ ] Available hours indicator
- [ ] Tooltip with time breakdown

### Week 4: Polish & Testing
- [ ] Error handling for AI failures
- [ ] Loading states during AI processing
- [ ] Conflict resolution animations
- [ ] Accessibility testing
- [ ] Performance optimization

---

## Future Enhancements (Phase 7+)

- [ ] **Travel Time Integration**: Factor in GPS distances between job sites
- [ ] **Weather Awareness**: Suggest indoor jobs on rainy days
- [ ] **Customer Preferences**: Learn customer time preferences
- [ ] **Recurring Patterns**: Detect and suggest recurring schedules
- [ ] **Multi-Crew Jobs**: Support splitting jobs across crews
- [ ] **Real-Time Crew Location**: Show crew GPS positions
- [ ] **Predictive Conflicts**: Warn about potential conflicts 24 hours ahead

---

**Last Updated:** 2025-01-24
**Document Owner:** Development Team
**Next Milestone:** Week 1 - Conflict Detection Implementation
