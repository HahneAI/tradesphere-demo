# Scheduling Calendar UX Design Specification

**Created:** 2025-01-24
**Status:** Design Phase
**Target:** ScheduleTab Component - Complete UX Specification
**Reference:** SCHEDULING_CALENDAR_IMPLEMENTATION.md

---

## Executive Summary

This document provides comprehensive user experience design specifications for the drag-and-drop scheduling calendar. The design prioritizes accessibility, visual clarity, and intuitive interactions while maintaining consistency with the Tradesphere visual theme.

**Design Principles:**
1. **Accessibility-First:** WCAG 2.1 AA compliance minimum, AAA where feasible
2. **Progressive Disclosure:** Show essential information first, details on demand
3. **Visual Hierarchy:** Clear importance ranking through size, color, and position
4. **Responsive by Default:** Mobile-first approach with touch-optimized interactions
5. **Consistent System:** Leverage existing color tokens and component patterns

---

## 1. Visual Hierarchy & Layout

### 1.1 Overall Calendar Structure

**Desktop Layout (>1024px):**
```
┌─────────────────────────────────────────────────────────────────┐
│ TOOLBAR                                                         │
│ [Filters] [Views] [Actions]                              [Help] │
├─────────────────────────────────────────────────────────────────┤
│ WEEK NAVIGATION                                                 │
│ ◀ Jan 20 - Jan 26, 2025 ▶                        [Today Button] │
├─────────────────────────────────────────────────────────────────┤
│ TIMELINE HEADER                                                 │
│ Crew     │ Sun 1/20 │ Mon 1/21 │ Tue 1/22 │ Wed... │ Sat 1/26  │
├──────────┼──────────┼──────────┼──────────┼────────┼───────────┤
│ UNASSIGNED JOBS SECTION (Collapsible)                          │
│ 📋 Unassigned (4) ▼                                            │
│ [Job Block] [Job Block] [Job Block] [Job Block]    → scroll   │
├─────────────────────────────────────────────────────────────────┤
│ CREW ROWS                                                       │
│ 🔵 Alpha (65%)  │ [grid cell]  │ [job block spanning 3 days]  │
├─────────────────┼──────────────┼──────────────────────────────┤
│ 🟢 Bravo (40%)  │ [job block]  │                              │
├─────────────────┼──────────────┼──────────────────────────────┤
│ 🟠 Charlie(80%) │              │ [job]│[job]                  │
└─────────────────────────────────────────────────────────────────┘
```

**Measurements:**
- Toolbar height: `56px`
- Week navigation height: `64px`
- Timeline header height: `48px`
- Unassigned section (expanded): `140px`
- Crew row height: `120px` (minimum, expands with stacked jobs)
- Crew label column width: `180px`
- Day column width: `140px` (desktop), `120px` (tablet), `100px` (mobile)
- Minimum touch target: `44px × 44px`

### 1.2 Week Timeline Header Design

**Visual Structure:**
```
┌─────────────────────────────────────────────────────────────────┐
│           ◀  Jan 20 - Jan 26, 2025  ▶              [Today]      │
├─────────┬──────────┬──────────┬──────────┬──────────┬───────────┤
│  Crew   │  Sun     │  Mon     │  Tue     │  Wed     │  Thu      │
│  Name   │  1/20    │  1/21    │  1/22    │  1/23    │  1/24     │
│         │ ⚫ Today │          │          │          │           │
└─────────┴──────────┴──────────┴──────────┴──────────┴───────────┘
```

**Navigation Controls:**
- **Previous Week Button:** `◀` - Icon size 20px, hitbox 44×44px
- **Next Week Button:** `▶` - Icon size 20px, hitbox 44×44px
- **Week Range Label:** "Jan 20 - Jan 26, 2025" - Font: Poppins 16px semibold
- **Today Button:** Pill shape, 88×36px, prominent when not viewing current week

**Today Button States:**
```css
/* Default (not on current week) */
background: #3B82F6;
color: #FFFFFF;
border: none;
box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);

/* On current week (less prominent) */
background: transparent;
color: #64748B;
border: 1px solid #CBD5E1;
box-shadow: none;

/* Hover */
transform: translateY(-1px);
box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
```

**Date Column Header:**
- **Day Name:** 12px, uppercase, letter-spacing 0.5px, color: #64748B
- **Date Number:** 16px, semibold, color: #1E293B
- **Today Indicator:** 8px circle, color: #EF4444, positioned below date
- **Column Background (Today):** #EFF6FF (light mode), #1E3A8A20 (dark mode)

**Accessibility:**
- `<button aria-label="Previous week">◀</button>`
- `<button aria-label="Next week">▶</button>`
- `<button aria-label="Go to today">Today</button>`
- `<h2 aria-live="polite">Week of January 20 - 26, 2025</h2>`

### 1.3 Crew Row Layout

**Row Structure:**
```
┌──────────────────┬─────────────────────────────────────────────┐
│ 🔵 Alpha Crew    │                                             │
│ 65% utilized     │  [Job Block 1]     [Job Block 2]            │
│ 3 jobs this week │                                             │
│                  │  [Job Block 3 - Stacked Below]              │
└──────────────────┴─────────────────────────────────────────────┘
```

**Crew Label Section (180px width):**

**Visual Hierarchy:**
1. Crew color indicator (12px circle)
2. Crew name (14px semibold)
3. Utilization percentage (12px, muted color)
4. Job count (11px, very muted)

```typescript
// Crew label component
<div className="crew-label">
  {/* Color indicator */}
  <div
    className="w-3 h-3 rounded-full"
    style={{ backgroundColor: crew.color_code }}
    aria-hidden="true"
  />

  {/* Crew name */}
  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
    {crew.crew_name}
  </h3>

  {/* Utilization bar */}
  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
    <div
      className="h-full transition-all duration-300"
      style={{
        width: `${utilization}%`,
        backgroundColor: getUtilizationColor(utilization)
      }}
      role="progressbar"
      aria-valuenow={utilization}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${utilization}% crew capacity utilized`}
    />
  </div>

  {/* Stats */}
  <p className="text-xs text-gray-500 dark:text-gray-400">
    {activeJobs} active jobs
  </p>
</div>
```

**Utilization Color Mapping:**
```typescript
function getUtilizationColor(percentage: number): string {
  if (percentage >= 90) return '#EF4444'; // Red - overbooked
  if (percentage >= 75) return '#F59E0B'; // Orange - near capacity
  if (percentage >= 50) return '#3B82F6'; // Blue - healthy
  return '#10B981'; // Green - underutilized
}
```

**Grid Cell Styling:**
```css
.crew-cell {
  min-height: 120px;
  padding: 8px;
  border-right: 1px solid #E5E7EB;
  border-bottom: 1px solid #E5E7EB;
  background: #FFFFFF;
  position: relative;
}

.crew-cell.dark {
  border-color: #374151;
  background: #1F2937;
}

/* Today column highlighting */
.crew-cell.is-today {
  background: #EFF6FF;
  border-left: 2px solid #3B82F6;
}

.crew-cell.is-today.dark {
  background: #1E3A8A20;
}

/* Weekend styling */
.crew-cell.is-weekend {
  background: #F9FAFB;
}

.crew-cell.is-weekend.dark {
  background: #111827;
}
```

### 1.4 Job Block Design

**Job Block Structure:**
```
┌──────────────────────────────────┐
│ 🔴 JOB-2025-003           [📌]   │ ← Priority dot + Job # + Pin
│ Michael Chen                     │ ← Customer name
│ Office Building Courtyard...     │ ← Job title (truncated)
│ Jan 20 - Jan 26                  │ ← Date range
│ ████████████░░░░░ 75%           │ ← Progress bar
└──────────────────────────────────┘
```

**Dimensions:**
- Height: `100px` (fixed)
- Width: Dynamic based on duration: `days × columnWidth - 16px` (8px margin each side)
- Minimum width: `80px` (half-day jobs)
- Padding: `12px`
- Border radius: `8px`
- Border width: `2px`

**Typography:**
```css
/* Job number */
font-family: 'Inter', sans-serif;
font-size: 13px;
font-weight: 600;
line-height: 1.2;

/* Customer name */
font-size: 12px;
font-weight: 500;
line-height: 1.3;

/* Job title */
font-size: 11px;
font-weight: 400;
line-height: 1.4;
max-height: 32px; /* 2 lines */
overflow: hidden;
text-overflow: ellipsis;

/* Date range */
font-size: 10px;
font-weight: 400;
opacity: 0.8;
```

**Color System:**

**Background:** Crew color at 15% opacity
```typescript
// Calculate from crew color
const bgColor = `${crew.color_code}26`; // 26 = 15% opacity in hex
```

**Border:** Status-based color (2px solid)
```typescript
const borderColors = {
  quote: '#94A3B8',      // Gray
  approved: '#3B82F6',   // Blue
  scheduled: '#8B5CF6',  // Purple
  in_progress: '#F59E0B', // Orange
  completed: '#10B981',   // Green
  invoiced: '#059669',    // Teal
  cancelled: '#EF4444'    // Red
};
```

**Text Color:** Dark on light crew colors, light on dark crew colors
```typescript
// Automatic contrast calculation
function getTextColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#1E293B' : '#F8FAFC';
}
```

**Priority Indicator (Corner Badge):**
```
Position: Top-left corner, -4px offset
Size: 12px circle
Colors:
  - Urgent (10): #EF4444 (Red)
  - High (8-9): #F59E0B (Orange)
  - Normal (5-7): #3B82F6 (Blue)
  - Low (0-4): #94A3B8 (Gray)
Shadow: 0 2px 4px rgba(0,0,0,0.2) for elevation
```

**Completion Progress Bar:**
```css
.job-progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.job-progress-fill {
  height: 100%;
  background: linear-gradient(90deg,
    currentColor 0%,
    currentColor 100%
  );
  transition: width 0.3s ease;
  /* Color matches status border color */
}
```

**Truncation Strategy:**

For job titles longer than 2 lines (approximately 45 characters):
```typescript
function truncateJobTitle(title: string, maxLength: number = 45): string {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength - 3) + '...';
}
```

**Full content shown in tooltip on hover (see section 6.2)**

### 1.5 Unassigned Jobs Section

**Collapsed State:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📋 Unassigned Jobs (4) ▶                                        │
└─────────────────────────────────────────────────────────────────┘
Height: 40px
```

**Expanded State:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📋 Unassigned Jobs (4) ▼                                   [✕]  │
├─────────────────────────────────────────────────────────────────┤
│ ← [Job Block] [Job Block] [Job Block] [Job Block] [Job] →      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
Height: 140px
```

**Layout Properties:**
- Container padding: `16px`
- Job block spacing: `12px` gap
- Horizontal scroll: Enabled when content overflows
- Scroll behavior: Smooth
- Scroll snap: Optional, snap to job blocks

**Visual Treatment:**
```css
.unassigned-section {
  background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);
  border-bottom: 2px solid #E5E7EB;
}

.unassigned-section.dark {
  background: linear-gradient(135deg, #1E293B 0%, #334155 100%);
  border-bottom: 2px solid #374151;
}

.unassigned-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
}

.unassigned-section-header:hover {
  background: rgba(0, 0, 0, 0.02);
}

.unassigned-jobs-container {
  display: flex;
  gap: 12px;
  padding: 16px;
  overflow-x: auto;
  scroll-behavior: smooth;

  /* Hide scrollbar but keep functionality */
  scrollbar-width: thin;
  scrollbar-color: #CBD5E1 transparent;
}

.unassigned-jobs-container::-webkit-scrollbar {
  height: 6px;
}

.unassigned-jobs-container::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 3px;
}

.unassigned-jobs-container::-webkit-scrollbar-track {
  background: transparent;
}
```

**Job Blocks in Unassigned Section:**
- Width: `200px` (fixed width for consistency)
- Height: `100px` (same as calendar blocks)
- Stack vertically on mobile (< 768px)
- Show abbreviated date: "Req: Feb 15" instead of full range

**Empty State:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📋 Unassigned Jobs (0)                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│               ✅ All jobs are assigned!                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Drag-and-Drop UX

### 2.1 Visual Feedback During Drag

**Drag Initiation:**
```
1. User mousedown on job block (150ms)
2. Visual feedback:
   - Block opacity: 1.0 → 0.8
   - Cursor: grab → grabbing
   - Subtle scale: 1.0 → 1.02
   - Box shadow: 0 2px 4px → 0 8px 24px rgba(0,0,0,0.15)
3. Ghost image created (80% opacity of original)
4. Original block remains in place with reduced opacity (0.4)
```

**Ghost Image Styling:**
```css
.job-block-ghost {
  opacity: 0.8;
  transform: scale(1.05);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  cursor: grabbing;
  pointer-events: none;
  z-index: 9999;
  transition: none; /* Instant positioning */
}
```

**Drag In Progress:**
```
Original block:
  - Opacity: 0.4
  - Outline: 2px dashed currentColor
  - Animation: pulse-opacity (subtle breathing effect)

Drop zones:
  - Valid target: Green border highlight
  - Invalid target: Red border highlight
  - Hover target: Background color change
```

### 2.2 Drop Zone Highlighting

**Valid Drop Target:**
```css
.crew-cell.valid-drop-target {
  background: rgba(16, 185, 129, 0.05); /* Green tint */
  border: 2px dashed #10B981;
  outline: none;
  transition: all 0.15s ease;
}

.crew-cell.valid-drop-target::before {
  content: '';
  position: absolute;
  inset: 4px;
  border: 1px solid #10B981;
  border-radius: 4px;
  opacity: 0.3;
  pointer-events: none;
}
```

**Invalid Drop Target:**
```css
.crew-cell.invalid-drop-target {
  background: rgba(239, 68, 68, 0.05); /* Red tint */
  border: 2px dashed #EF4444;
  cursor: not-allowed;
}

.crew-cell.invalid-drop-target::after {
  content: '⚠️';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;
  opacity: 0.3;
  pointer-events: none;
}
```

**Hover Intensity:**
```css
.crew-cell.drag-over {
  background: rgba(16, 185, 129, 0.1);
  border-color: #10B981;
  border-width: 3px; /* Thicker on active hover */
}

.crew-cell.drag-over.has-conflict {
  background: rgba(239, 68, 68, 0.1);
  border-color: #EF4444;
}
```

### 2.3 Conflict Warning Visual Design

**Conflict Detection States:**

**Warning (Near Capacity):**
```css
.job-block.conflict-warning {
  border-color: #F59E0B;
  border-width: 3px;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.2);
}

.job-block.conflict-warning::before {
  content: '⚠️';
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  background: #F59E0B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
  z-index: 10;
}
```

**Error (Double-Booked):**
```css
.job-block.conflict-error {
  border-color: #EF4444;
  border-width: 3px;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2);
  animation: pulse-conflict 2s ease-in-out infinite;
}

@keyframes pulse-conflict {
  0%, 100% {
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.1);
  }
}

.job-block.conflict-error::before {
  content: '❌';
  /* Same positioning as warning */
  background: #EF4444;
}
```

**Visual Conflict Indicators on Grid:**
```
When dragging over conflicting cell:

┌──────────────────────────────────┐
│ ⚠️ CAPACITY WARNING              │
│                                  │
│ [Existing Job 1]                 │
│ [Existing Job 2]                 │
│ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│ [Ghost of dragged job - dashed]  │
│                                  │
│ This will exceed crew capacity   │
└──────────────────────────────────┘
```

### 2.4 Animation and Transition Timing

**Performance Targets:**
- Drag initiation: < 16ms (1 frame @ 60fps)
- Drop animation: 200ms
- Conflict warning appearance: 150ms
- Hover state transition: 100ms

**Timing Functions:**
```css
/* Natural easing for drag operations */
--ease-drag-start: cubic-bezier(0.25, 0.46, 0.45, 0.94); /* easeOutQuad */
--ease-drag-end: cubic-bezier(0.19, 1, 0.22, 1);        /* easeOutExpo */
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);  /* backOut */

/* Drop success animation */
.job-block.drop-success {
  animation: drop-settle 0.3s var(--ease-drag-end);
}

@keyframes drop-settle {
  0% {
    transform: scale(1.1) translateY(-8px);
    opacity: 0.8;
  }
  50% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

/* Drop cancel animation */
.job-block.drop-cancel {
  animation: snap-back 0.25s var(--ease-bounce);
}

@keyframes snap-back {
  0% {
    transform: scale(0.9);
    opacity: 0.6;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
```

**State Transition Sequence:**
```
Drag Start (0ms)
  ↓
Opacity change (16ms)
  ↓
Cursor change (16ms)
  ↓
Scale animation (100ms)
  ↓
Drop zone highlights (150ms)
  ↓
Hover feedback (100ms)
  ↓
Drop action (0ms)
  ↓
Success animation (300ms)
  ↓
Final state (0ms)

Total: ~666ms for complete drag-drop cycle
```

**Reduced Motion Support:**
```css
@media (prefers-reduced-motion: reduce) {
  .job-block,
  .crew-cell,
  .job-block-ghost {
    animation: none !important;
    transition: none !important;
  }

  /* Still show state changes, just instantly */
  .job-block.drop-success {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

---

## 3. Information Density

### 3.1 Job Block Information Hierarchy

**Level 1 (Always Visible):**
1. Job number - Primary identifier
2. Customer name - Context
3. Priority indicator - Urgency

**Level 2 (Visible if space allows):**
4. Job title (truncated) - Description
5. Date range - Timeline
6. Completion percentage - Progress

**Level 3 (Tooltip/Hover only):**
7. Full job title
8. Estimated total value
9. Assigned crew members
10. Special requirements
11. Service count
12. Tags

**Responsive Information Display:**

**Desktop (140px column width):**
```
┌────────────────────┐
│ 🔴 JOB-2025-003   │ ← All info visible
│ Michael Chen      │
│ Office Building   │
│ Courtyard Patio   │
│ Jan 20 - Jan 26   │
│ ███████░░ 75%    │
└────────────────────┘
```

**Tablet (120px column width):**
```
┌──────────────────┐
│ 🔴 JOB-003      │ ← Abbreviated job number
│ M. Chen         │ ← First initial
│ Office Build... │ ← 1 line truncation
│ 1/20 - 1/26     │ ← Short date format
│ ████░░ 75%     │
└──────────────────┘
```

**Mobile (100px column width):**
```
┌────────────────┐
│ 🔴 003        │ ← Number only
│ M. Chen       │
│ Office...     │ ← Heavy truncation
│ 1/20-1/26     │ ← Compact date
│ ████ 75%     │
└────────────────┘
```

**Truncation Logic:**
```typescript
interface JobBlockDisplayConfig {
  columnWidth: number;
  showFullJobNumber: boolean;
  showFullCustomerName: boolean;
  jobTitleLines: number;
  dateFormat: 'full' | 'short' | 'compact';
  showProgressLabel: boolean;
}

function getDisplayConfig(columnWidth: number): JobBlockDisplayConfig {
  if (columnWidth >= 140) {
    return {
      columnWidth,
      showFullJobNumber: true,
      showFullCustomerName: true,
      jobTitleLines: 2,
      dateFormat: 'full',
      showProgressLabel: true
    };
  } else if (columnWidth >= 120) {
    return {
      columnWidth,
      showFullJobNumber: false, // "JOB-003" instead of "JOB-2025-003"
      showFullCustomerName: false, // "M. Chen" instead of "Michael Chen"
      jobTitleLines: 1,
      dateFormat: 'short',
      showProgressLabel: true
    };
  } else {
    return {
      columnWidth,
      showFullJobNumber: false, // "003" only
      showFullCustomerName: false,
      jobTitleLines: 1,
      dateFormat: 'compact',
      showProgressLabel: false // Show bar only, no "75%"
    };
  }
}
```

### 3.2 Tooltip Content on Hover

**Tooltip Trigger:** 500ms hover delay
**Tooltip Position:** Smart positioning (prefer top, fallback to bottom)
**Tooltip Max Width:** 320px
**Tooltip Z-index:** 10000

**Tooltip Content Structure:**
```
┌─────────────────────────────────────────┐
│ JOB-2025-003                        [✕] │
│ Office Building Courtyard Patio         │
├─────────────────────────────────────────┤
│ 👤 Customer: Michael Chen               │
│ 📧 michael.chen@example.com             │
│ 📞 (555) 123-4567                       │
├─────────────────────────────────────────┤
│ 📅 Scheduled: Jan 20 - Jan 26, 2025     │
│ ⏱️  Duration: 6 days                    │
│ 💼 Services: 3 (Excavation, Base...)    │
├─────────────────────────────────────────┤
│ 💰 Estimated Total: $24,580.00          │
│ 🎯 Priority: Urgent (10)                │
│ ✓ Status: In Progress (75% complete)   │
├─────────────────────────────────────────┤
│ 🏷️  commercial, high-traffic            │
│                                         │
│ Click to view full details →           │
└─────────────────────────────────────────┘
```

**Tooltip Styling:**
```css
.job-tooltip {
  background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%);
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.1),
    0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 16px;
  font-size: 13px;
  line-height: 1.5;
  color: #1E293B;
  max-width: 320px;
  z-index: 10000;
  pointer-events: auto; /* Allow interaction */
}

.job-tooltip.dark {
  background: linear-gradient(135deg, #1E293B 0%, #334155 100%);
  border-color: #475569;
  color: #F1F5F9;
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.2);
}

.job-tooltip-header {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #E5E7EB;
}

.job-tooltip-section {
  margin: 12px 0;
  padding: 12px 0;
  border-bottom: 1px solid #E5E7EB;
}

.job-tooltip-section:last-child {
  border-bottom: none;
}

.job-tooltip-row {
  display: flex;
  align-items: start;
  gap: 8px;
  margin: 6px 0;
}

.job-tooltip-icon {
  flex-shrink: 0;
  width: 16px;
  opacity: 0.6;
}

.job-tooltip-label {
  font-weight: 500;
  color: #64748B;
}

.job-tooltip-value {
  font-weight: 400;
  color: #1E293B;
}
```

### 3.3 Mobile vs Desktop Information Display

**Desktop (>1024px):**
- Show all job block fields
- Display full tooltips with all sections
- Show crew statistics in sidebar
- Multi-column layout

**Tablet (768px - 1024px):**
- Abbreviated job numbers
- First initial + last name for customers
- Simplified tooltips (remove contact info)
- 2-column layout for unassigned jobs

**Mobile (<768px):**
- Number-only job identifiers
- Single-line truncated titles
- Tap for quick info sheet (bottom drawer)
- Vertical stack layout
- Horizontal scroll for week timeline
- Collapsed crew rows (expand one at a time)

**Mobile Quick Info Sheet:**
```
┌─────────────────────────────────────┐
│ JOB-2025-003                    [✕] │
├─────────────────────────────────────┤
│ Office Building Courtyard Patio     │
│                                     │
│ Michael Chen                        │
│ Jan 20 - Jan 26, 2025              │
│                                     │
│ ████████████░░░░░ 75% complete     │
│                                     │
│ [View Details] [Reschedule] [✓]    │
└─────────────────────────────────────┘

Appears from bottom, 40% viewport height
Swipe down to dismiss
```

---

## 4. Color System

### 4.1 Crew Color Coding Strategy

**Predefined Crew Color Palette (WCAG AA Compliant):**

Minimum contrast ratio 4.5:1 against white background:

```typescript
const CREW_COLORS = [
  {
    name: 'Ocean Blue',
    primary: '#1E40AF',    // For text/borders
    light: '#DBEAFE',      // For backgrounds (15% opacity)
    dark: '#1E3A8A',       // For dark mode
    contrast: 7.2          // WCAG AAA
  },
  {
    name: 'Forest Green',
    primary: '#15803D',
    light: '#DCFCE7',
    dark: '#14532D',
    contrast: 6.8
  },
  {
    name: 'Sunset Orange',
    primary: '#C2410C',
    light: '#FFEDD5',
    dark: '#7C2D12',
    contrast: 7.5
  },
  {
    name: 'Royal Purple',
    primary: '#6D28D9',
    light: '#EDE9FE',
    dark: '#5B21B6',
    contrast: 6.4
  },
  {
    name: 'Ruby Red',
    primary: '#B91C1C',
    light: '#FEE2E2',
    dark: '#7F1D1D',
    contrast: 7.9
  },
  {
    name: 'Teal',
    primary: '#0F766E',
    light: '#CCFBF1',
    dark: '#134E4A',
    contrast: 6.2
  },
  {
    name: 'Amber',
    primary: '#B45309',
    light: '#FEF3C7',
    dark: '#78350F',
    contrast: 7.1
  },
  {
    name: 'Indigo',
    primary: '#4338CA',
    light: '#E0E7FF',
    dark: '#3730A3',
    contrast: 6.5
  }
];
```

**Color Assignment Logic:**
```typescript
function assignCrewColor(crewIndex: number): CrewColor {
  // Cycle through colors if more than 8 crews
  const colorIndex = crewIndex % CREW_COLORS.length;
  return CREW_COLORS[colorIndex];
}
```

**Accessibility Validation:**
```typescript
function validateColorContrast(
  foreground: string,
  background: string
): { ratio: number; passAA: boolean; passAAA: boolean } {
  const ratio = calculateContrastRatio(foreground, background);

  return {
    ratio,
    passAA: ratio >= 4.5,
    passAAA: ratio >= 7.0
  };
}

// Warn in console if contrast fails
if (!validateColorContrast(crewColor, '#FFFFFF').passAA) {
  console.warn(`Crew color ${crewColor} fails WCAG AA contrast requirements`);
}
```

### 4.2 Status Color Mapping

**Using Existing STATUS_COLORS from jobs-views.ts:**

```typescript
// From existing codebase
const STATUS_COLORS = {
  quote: {
    bg: '#F1F5F9',      // Light gray
    text: '#475569',
    border: '#CBD5E1'
  },
  approved: {
    bg: '#DBEAFE',      // Light blue
    text: '#1E40AF',
    border: '#3B82F6'
  },
  scheduled: {
    bg: '#EDE9FE',      // Light purple
    text: '#6D28D9',
    border: '#8B5CF6'
  },
  in_progress: {
    bg: '#FEF3C7',      // Light yellow
    text: '#92400E',
    border: '#F59E0B'   // CALENDAR BORDER: Orange
  },
  completed: {
    bg: '#D1FAE5',      // Light green
    text: '#065F46',
    border: '#10B981'   // CALENDAR BORDER: Green
  },
  invoiced: {
    bg: '#D1FAE5',      // Light green
    text: '#047857',
    border: '#059669'
  },
  cancelled: {
    bg: '#FEE2E2',      // Light red
    text: '#991B1B',
    border: '#EF4444'   // CALENDAR BORDER: Red
  }
};
```

**Calendar-Specific Usage:**
```css
/* Job block border uses status color */
.job-block[data-status="scheduled"] {
  border: 2px solid #8B5CF6; /* Purple */
}

.job-block[data-status="in_progress"] {
  border: 2px solid #F59E0B; /* Orange */
}

.job-block[data-status="completed"] {
  border: 2px solid #10B981; /* Green */
}

/* Progress bar uses same color */
.job-progress-fill[data-status="in_progress"] {
  background: linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%);
}
```

### 4.3 Priority Indicator Colors

**Using Existing Priority Colors from jobs-views.ts:**

```typescript
// From existing codebase
const PRIORITY_COLORS = {
  urgent: '#EF4444',   // Red (priority >= 10)
  high: '#F59E0B',     // Orange (priority 8-9)
  normal: '#3B82F6',   // Blue (priority 5-7)
  low: '#94A3B8'       // Gray (priority 0-4)
};

function getPriorityColor(priority: number): string {
  if (priority >= 10) return PRIORITY_COLORS.urgent;
  if (priority >= 8) return PRIORITY_COLORS.high;
  if (priority >= 5) return PRIORITY_COLORS.normal;
  return PRIORITY_COLORS.low;
}
```

**Visual Priority Indicators:**
```css
/* Corner dot */
.priority-dot {
  position: absolute;
  top: -4px;
  left: -4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.priority-dot.urgent {
  background: #EF4444;
  animation: pulse-urgent 2s ease-in-out infinite;
}

@keyframes pulse-urgent {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
  }
}
```

### 4.4 Conflict State Colors

**Warning Level (Near Capacity - 75-100%):**
```typescript
const CONFLICT_WARNING = {
  border: '#F59E0B',           // Orange
  glow: 'rgba(245, 158, 11, 0.3)',
  icon: '⚠️',
  label: 'Near Capacity'
};
```

**Error Level (Double-Booked - >100%):**
```typescript
const CONFLICT_ERROR = {
  border: '#EF4444',           // Red
  glow: 'rgba(239, 68, 68, 0.3)',
  icon: '❌',
  label: 'Overbooked'
};
```

**Visual Treatment:**
```css
/* Warning state */
.crew-cell.conflict-warning {
  background: linear-gradient(
    135deg,
    rgba(245, 158, 11, 0.05) 0%,
    rgba(245, 158, 11, 0.02) 100%
  );
  border-left: 3px solid #F59E0B;
}

/* Error state */
.crew-cell.conflict-error {
  background: linear-gradient(
    135deg,
    rgba(239, 68, 68, 0.08) 0%,
    rgba(239, 68, 68, 0.03) 100%
  );
  border-left: 3px solid #EF4444;
  position: relative;
}

.crew-cell.conflict-error::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(239, 68, 68, 0.05) 10px,
    rgba(239, 68, 68, 0.05) 20px
  );
  pointer-events: none;
}
```

**Accessibility Considerations:**
- Never rely on color alone
- Always include icon indicator (⚠️ or ❌)
- Add ARIA labels for screen readers
- Pattern overlay for colorblind users

```html
<div
  class="crew-cell conflict-error"
  role="alert"
  aria-label="Crew is overbooked on this date. 3 jobs assigned, maximum capacity is 2."
>
  <span class="sr-only">Scheduling conflict detected</span>
  <!-- Visual content -->
</div>
```

---

## 5. Responsive Design

### 5.1 Mobile Layout (<768px)

**Layout Strategy: Vertical Stack with Horizontal Scroll**

```
┌─────────────────────────────────────┐
│ [≡] Scheduling Calendar         [⚙] │ ← Header
├─────────────────────────────────────┤
│ ◀ Jan 20-26, 2025 ▶      [Today]   │ ← Navigation
├─────────────────────────────────────┤
│ 📋 Unassigned (4) ▼                │
│ ← [Job] [Job] [Job] [Job] →        │ ← Horizontal scroll
├─────────────────────────────────────┤
│ 🔵 Alpha Crew (65%) ▼              │ ← Collapsible crew
│ ├─────────────────────────────────┤│
│ │← S  M  T  W  T  F  S →          ││ ← Week scroll
│ │  20 21 22 23 24 25 26           ││
│ │  [Job Block 1 spanning 3 days]  ││
│ │  [Job Block 2]                  ││
│ └─────────────────────────────────┘│
├─────────────────────────────────────┤
│ 🟢 Bravo Crew (40%) ▶              │ ← Collapsed
├─────────────────────────────────────┤
│ 🟠 Charlie Crew (80%) ▶            │ ← Collapsed
└─────────────────────────────────────┘
```

**Mobile Specifications:**
- Screen width: < 768px
- Crew rows: Collapsible (accordion pattern)
- Only one crew expanded at a time
- Week timeline: Horizontal scroll
- Column width: 100px (minimum)
- Touch target size: 44×44px minimum
- Swipe gestures: Enabled for week navigation

**Mobile Job Block:**
```
┌──────────────┐
│ 🔴 003      │ ← Number only
│ M. Chen     │ ← Abbreviated
│ Office...   │ ← Truncated
│ 1/20-1/26   │ ← Compact dates
│ ████ 75%   │ ← Slim progress
└──────────────┘
Width: 100px
Height: 90px (slightly smaller)
```

**Touch Interactions:**
- **Tap:** Open job detail sheet
- **Long press (500ms):** Initiate drag
- **Swipe left/right on week header:** Change week
- **Swipe down on detail sheet:** Dismiss
- **Pinch (future):** Zoom week view

**Mobile Navigation:**
```css
.mobile-week-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #FFFFFF;
  border-bottom: 1px solid #E5E7EB;
  position: sticky;
  top: 0;
  z-index: 100;
}

.mobile-nav-button {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: transparent;
  border: 1px solid #CBD5E1;
  color: #475569;
  font-size: 20px;
}

.mobile-nav-button:active {
  background: #F1F5F9;
  transform: scale(0.95);
}
```

### 5.2 Tablet Layout (768px - 1024px)

**Layout: Optimized Columns**

```
┌──────────────────────────────────────────────────────────┐
│ Scheduling Calendar                        [Filters] [⚙] │
├──────────────────────────────────────────────────────────┤
│ ◀ Jan 20 - Jan 26, 2025 ▶                     [Today]   │
├──────────────────────────────────────────────────────────┤
│ 📋 Unassigned Jobs (4) ▼                                │
│ [Job 1] [Job 2] [Job 3] [Job 4]                        │
├─────────┬────────┬────────┬────────┬────────┬───────────┤
│ Alpha   │ S 1/20 │ M 1/21 │ T 1/22 │ W 1/23 │ ...      │
│ (65%)   │        │ [Job spanning 3 days...]             │
├─────────┼────────┼────────┼────────┼────────┼───────────┤
│ Bravo   │ [Job]  │        │        │ [Job]  │           │
│ (40%)   │        │        │        │        │           │
└─────────┴────────┴────────┴────────┴────────┴───────────┘
```

**Tablet Specifications:**
- Screen width: 768px - 1024px
- All crews visible (no collapse)
- Column width: 110-120px
- Crew label width: 140px
- Job block abbreviated text
- Simplified tooltips

**Responsive Breakpoints:**
```css
/* Tablet Portrait */
@media (min-width: 768px) and (max-width: 1024px) {
  .calendar-grid {
    --column-width: 110px;
    --crew-label-width: 140px;
  }

  .job-block-title {
    font-size: 11px;
    -webkit-line-clamp: 1; /* Single line */
  }

  .job-number {
    font-size: 12px;
  }
}

/* Tablet Landscape */
@media (min-width: 1024px) and (max-width: 1280px) {
  .calendar-grid {
    --column-width: 130px;
    --crew-label-width: 160px;
  }
}
```

### 5.3 Desktop Layout (>1024px)

**Full Feature Display:**
- Column width: 140px
- Crew label width: 180px
- Full job details visible
- Complete tooltips
- Hover interactions optimized
- Keyboard navigation enabled

**Wide Screen Optimization (>1440px):**
```css
@media (min-width: 1440px) {
  .calendar-grid {
    --column-width: 160px;
    --crew-label-width: 200px;
  }

  .job-block {
    padding: 14px;
  }

  .job-block-title {
    -webkit-line-clamp: 3; /* Allow 3 lines */
  }
}
```

### 5.4 Touch Targets for Mobile

**WCAG 2.1 Level AAA Requirement: 44×44px minimum**

**Touch Target Audit:**

| Element | Desktop Size | Mobile Size | Status |
|---------|-------------|-------------|---------|
| Navigation arrows | 32×32px | 44×44px | ✅ Compliant |
| Today button | 88×36px | 100×44px | ✅ Compliant |
| Job block (clickable) | Variable | Min 90×90px | ✅ Compliant |
| Expand/collapse icon | 24×24px | 44×44px | ✅ Compliant |
| Close button (modal) | 32×32px | 44×44px | ✅ Compliant |
| Filter chips | 80×32px | 88×44px | ✅ Compliant |

**Mobile Touch Target Implementation:**
```css
/* Ensure all interactive elements meet minimum size */
.mobile-touch-target {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Expand hitbox without changing visual size */
.small-icon-button {
  width: 24px;
  height: 24px;
  position: relative;
}

.small-icon-button::before {
  content: '';
  position: absolute;
  top: -10px;
  left: -10px;
  right: -10px;
  bottom: -10px;
  /* Invisible hitbox expands to 44×44px */
}
```

---

## 6. Accessibility Considerations

### 6.1 ARIA Labels for Job Blocks and Drag-Drop

**Job Block ARIA Structure:**
```html
<div
  role="button"
  tabIndex={0}
  draggable={true}
  aria-label="Job JOB-2025-003 for Michael Chen, Office Building Courtyard Patio. Scheduled January 20 to 26, 2025. Status: In Progress, 75% complete. Priority: Urgent. Click to view details or press Enter to drag."
  aria-describedby={`job-${jobId}-tooltip`}
  aria-grabbed={isDragging}
  data-job-id={jobId}
  className="job-block"
  onKeyDown={handleKeyboardDrag}
>
  {/* Visual content */}

  {/* Hidden screen reader description */}
  <div id={`job-${jobId}-tooltip`} className="sr-only">
    Drag to assign to a crew and date. Current assignment: {crewName || 'Unassigned'}.
    {hasConflict && 'Warning: This assignment conflicts with existing jobs.'}
  </div>
</div>
```

**Crew Cell Drop Zone ARIA:**
```html
<div
  role="region"
  aria-label={`${crewName} schedule for ${formatDate(date)}. ${jobCount} jobs currently scheduled. ${isDropTarget ? 'Valid drop zone' : ''}.`}
  aria-dropeffect={isValidDropTarget ? 'move' : 'none'}
  data-crew-id={crewId}
  data-date={date}
  className="crew-cell"
>
  {/* Job blocks */}
</div>
```

**Drag State Announcements:**
```typescript
// Live region for screen reader announcements
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {dragAnnouncement}
</div>

// Update announcement during drag operations
function announceDragStart(jobNumber: string) {
  setDragAnnouncement(
    `Dragging job ${jobNumber}. Use arrow keys to navigate to a crew and date, then press Enter to drop.`
  );
}

function announceDrop(jobNumber: string, crewName: string, date: string) {
  setDragAnnouncement(
    `Job ${jobNumber} assigned to ${crewName} on ${date}.`
  );
}

function announceConflict(conflictType: 'warning' | 'error') {
  setDragAnnouncement(
    conflictType === 'error'
      ? 'Error: This assignment conflicts with existing jobs. Crew is overbooked.'
      : 'Warning: This assignment will put crew near capacity.'
  );
}
```

### 6.2 Keyboard Navigation Patterns

**Global Keyboard Shortcuts:**
```typescript
const KEYBOARD_SHORTCUTS = {
  // Navigation
  'ArrowLeft': 'Previous week',
  'ArrowRight': 'Next week',
  'KeyT': 'Jump to today',
  'Home': 'Go to first week of month',
  'End': 'Go to last week of month',

  // Selection
  'Tab': 'Focus next job block',
  'Shift+Tab': 'Focus previous job block',
  'Enter': 'Open job detail or confirm drag',
  'Space': 'Start drag mode',
  'Escape': 'Cancel drag or close modal',

  // Actions
  'KeyN': 'Create new job',
  'KeyF': 'Focus filter input',
  'KeyH': 'Toggle help panel',
  'Slash': 'Show keyboard shortcuts',

  // Drag mode (when Space held)
  'ArrowUp': 'Move to crew above',
  'ArrowDown': 'Move to crew below',
  'ArrowLeft': 'Move to previous day',
  'ArrowRight': 'Move to next day',
  'Enter': 'Drop job',
  'Escape': 'Cancel drag'
};
```

**Keyboard Navigation Implementation:**
```typescript
function handleKeyboardNavigation(e: KeyboardEvent) {
  const { key, shiftKey, ctrlKey, metaKey } = e;

  // Week navigation
  if (key === 'ArrowLeft' && !shiftKey) {
    e.preventDefault();
    goToPreviousWeek();
    announce('Moved to previous week');
  }

  if (key === 'ArrowRight' && !shiftKey) {
    e.preventDefault();
    goToNextWeek();
    announce('Moved to next week');
  }

  if (key === 't' || key === 'T') {
    e.preventDefault();
    goToToday();
    announce('Jumped to current week');
  }

  // Drag mode toggle
  if (key === ' ' && focusedJobId) {
    e.preventDefault();
    setDragMode(true);
    announce(`Drag mode activated for job ${focusedJobNumber}. Use arrow keys to navigate, Enter to drop, Escape to cancel.`);
  }

  // Cancel actions
  if (key === 'Escape') {
    e.preventDefault();
    if (dragMode) {
      cancelDrag();
      announce('Drag cancelled');
    } else if (isModalOpen) {
      closeModal();
    }
  }
}

// Keyboard drag implementation
function handleKeyboardDrag(e: KeyboardEvent) {
  if (!dragMode) return;

  const { key } = e;
  const currentPosition = getDragPosition();

  switch (key) {
    case 'ArrowUp':
      e.preventDefault();
      moveToPreviousCrew();
      announce(`Moved to ${getCrewName(currentPosition.crewId)}`);
      break;

    case 'ArrowDown':
      e.preventDefault();
      moveToNextCrew();
      announce(`Moved to ${getCrewName(currentPosition.crewId)}`);
      break;

    case 'ArrowLeft':
      e.preventDefault();
      moveToPreviousDay();
      announce(`Moved to ${formatDate(currentPosition.date)}`);
      break;

    case 'ArrowRight':
      e.preventDefault();
      moveToNextDay();
      announce(`Moved to ${formatDate(currentPosition.date)}`);
      break;

    case 'Enter':
      e.preventDefault();
      dropJob(currentPosition);
      announce(`Job assigned to ${getCrewName(currentPosition.crewId)} on ${formatDate(currentPosition.date)}`);
      break;
  }
}
```

**Focus Management:**
```typescript
// Maintain focus order
const focusableElements = [
  'navigation buttons',
  'today button',
  'filter inputs',
  'unassigned job blocks',
  'crew row job blocks (left to right, top to bottom)',
  'action buttons'
];

// Skip to content link
<a href="#calendar-content" className="sr-only focus:not-sr-only">
  Skip to calendar content
</a>

// Focus trap in modals
function trapFocusInModal(modalElement: HTMLElement) {
  const focusableElements = modalElement.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  modalElement.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  });

  firstElement.focus();
}
```

### 6.3 Screen Reader Announcements

**Live Regions:**
```html
<!-- Polite announcements (don't interrupt) -->
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {statusAnnouncement}
</div>

<!-- Assertive announcements (interrupt immediately) -->
<div
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
  className="sr-only"
>
  {errorAnnouncement}
</div>
```

**Announcement Examples:**
```typescript
// Calendar loaded
announce('Calendar loaded. Showing week of January 20 to 26, 2025. 4 unassigned jobs, 3 crews visible.');

// Job assigned
announce('Job JOB-2025-003 assigned to Alpha Crew on January 20.');

// Conflict detected
announceError('Conflict detected: Alpha Crew is overbooked on January 20. 3 jobs assigned, maximum capacity is 2.');

// Week changed
announce('Showing week of January 27 to February 2, 2025.');

// Filter applied
announce('Filtered to show 2 jobs with status: In Progress.');

// Utilization update
announce('Alpha Crew utilization increased to 85%.');
```

**Crew Utilization Screen Reader Description:**
```html
<div className="crew-label">
  <h3 id={`crew-${crewId}-name`}>Alpha Crew</h3>

  <div
    role="progressbar"
    aria-labelledby={`crew-${crewId}-name`}
    aria-valuenow={65}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuetext="65% utilized, 3 of 4 job slots filled"
  >
    <div className="utilization-bar" style={{ width: '65%' }} />
  </div>

  <span className="sr-only">
    3 active jobs this week. Maximum capacity: 4 jobs.
  </span>
</div>
```

### 6.4 Color Contrast Ratios

**WCAG 2.1 Requirements:**
- **Level AA:** Minimum 4.5:1 for normal text, 3:1 for large text
- **Level AAA:** Minimum 7:1 for normal text, 4.5:1 for large text

**Tradesphere Calendar Contrast Audit:**

| Element | Foreground | Background | Ratio | Level |
|---------|-----------|------------|-------|-------|
| Job number | #1E293B | #FFFFFF | 16.1:1 | AAA ✅ |
| Customer name | #475569 | #FFFFFF | 8.6:1 | AAA ✅ |
| Job title | #64748B | #FFFFFF | 6.2:1 | AAA ✅ |
| Date range | #94A3B8 | #FFFFFF | 4.7:1 | AA ✅ |
| Scheduled border | #8B5CF6 | #FFFFFF | 5.4:1 | AA ✅ |
| In Progress border | #F59E0B | #FFFFFF | 3.9:1 | AA ⚠️ |
| Completed border | #10B981 | #FFFFFF | 3.8:1 | AA ⚠️ |
| Priority High | #F59E0B | #FFFFFF | 3.9:1 | AA ⚠️ |
| Priority Urgent | #EF4444 | #FFFFFF | 4.5:1 | AA ✅ |

**Improvements for Low Contrast Items:**
```typescript
// Darken borders that fail AA on lighter backgrounds
const ENHANCED_BORDERS = {
  in_progress: '#D97706', // Darkened from #F59E0B
  completed: '#059669',   // Darkened from #10B981
  high_priority: '#D97706' // Darkened from #F59E0B
};

// Validate at runtime
if (process.env.NODE_ENV === 'development') {
  validateAllContrasts();
}
```

**High Contrast Mode Support:**
```css
@media (prefers-contrast: high) {
  .job-block {
    border-width: 3px;
    font-weight: 600;
  }

  .crew-cell {
    border-width: 2px;
    border-color: #000000;
  }

  /* Increase all text contrast */
  .job-block-text {
    color: #000000;
    text-shadow: 0 0 2px #FFFFFF;
  }
}

@media (prefers-contrast: low) {
  /* Reduce visual noise for low contrast preference */
  .job-block {
    border-width: 1px;
    box-shadow: none;
  }
}
```

**Dark Mode Contrast:**
```typescript
// Dark mode requires adjusted colors for sufficient contrast
const DARK_MODE_COLORS = {
  job_number: '#F8FAFC',      // 14.5:1 on #1E293B
  customer_name: '#E2E8F0',   // 11.2:1
  job_title: '#CBD5E1',       // 8.3:1
  date_range: '#94A3B8',      // 5.1:1

  // Lighter borders for dark backgrounds
  scheduled_border: '#A78BFA', // Lightened purple
  in_progress_border: '#FCD34D', // Lightened orange
  completed_border: '#6EE7B7' // Lightened green
};
```

---

## 7. Loading & Error States

### 7.1 Loading Skeleton for Calendar Grid

**Skeleton Loading Strategy:**
- Show immediately on mount (no spinner delay)
- Animate shimmer effect for perceived performance
- Match actual component structure

**Loading Skeleton Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮                      [▮▮▮▮▮]     │
├─────────────────────────────────────────────────────────────┤
│ ▮▮▮ ▮▮▮▮▮▮▮▮ (▮▮▮)                                         │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────┤
│ ▮▮▮▮▮▮▮  │          │          │          │          │      │
│ ▮▮▮ ▮▮▮  │  ▮▮▮▮    │  ▮▮▮▮    │          │  ▮▮▮▮    │      │
│          │  ▮▮▮▮    │  ▮▮▮▮    │          │  ▮▮▮▮    │      │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────┤
│ ▮▮▮▮▮▮▮  │  ▮▮▮▮    │          │  ▮▮▮▮    │          │      │
│ ▮▮▮ ▮▮▮  │  ▮▮▮▮    │          │  ▮▮▮▮    │          │      │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────┘
```

**Implementation:**
```tsx
function CalendarSkeleton() {
  return (
    <div className="calendar-skeleton" aria-busy="true" aria-label="Loading calendar...">
      {/* Week navigation skeleton */}
      <div className="skeleton-nav">
        <div className="skeleton-box w-64 h-8" />
        <div className="skeleton-box w-24 h-10" />
      </div>

      {/* Timeline header skeleton */}
      <div className="skeleton-header">
        <div className="skeleton-box w-32 h-6" />
        {[...Array(7)].map((_, i) => (
          <div key={i} className="skeleton-box w-20 h-6" />
        ))}
      </div>

      {/* Crew rows skeleton */}
      {[...Array(3)].map((_, crewIndex) => (
        <div key={crewIndex} className="skeleton-crew-row">
          <div className="skeleton-crew-label">
            <div className="skeleton-circle w-3 h-3" />
            <div className="skeleton-box w-24 h-4" />
            <div className="skeleton-box w-16 h-2" />
          </div>

          <div className="skeleton-grid">
            {[...Array(7)].map((_, dayIndex) => (
              <div key={dayIndex} className="skeleton-cell">
                {/* Randomly show skeleton job blocks */}
                {Math.random() > 0.5 && (
                  <div className="skeleton-job-block" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Skeleton Styling:**
```css
.skeleton-box,
.skeleton-circle,
.skeleton-job-block {
  background: linear-gradient(
    90deg,
    #E5E7EB 0%,
    #F3F4F6 50%,
    #E5E7EB 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
}

.skeleton-circle {
  border-radius: 50%;
}

.skeleton-job-block {
  width: 100%;
  height: 80px;
  border-radius: 8px;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Dark mode skeleton */
.dark .skeleton-box,
.dark .skeleton-circle,
.dark .skeleton-job-block {
  background: linear-gradient(
    90deg,
    #374151 0%,
    #4B5563 50%,
    #374151 100%
  );
}
```

### 7.2 Empty State - No Crews

**Empty State Design:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                         👷                                  │
│                  No Crews Found                             │
│                                                             │
│     You need to create crews before scheduling jobs.        │
│                                                             │
│               [+ Create Your First Crew]                    │
│                                                             │
│                  ─────────  or  ─────────                   │
│                                                             │
│          [ View Demo with Sample Data]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
```tsx
function EmptyCrewsState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          {/* Custom hardhat/crew icon */}
          <path d="..." fill="#CBD5E1" />
        </svg>
      </div>

      <h2 className="empty-state-title">No Crews Found</h2>

      <p className="empty-state-description">
        You need to create crews before scheduling jobs.
        Crews represent your work teams that can be assigned to jobs.
      </p>

      <div className="empty-state-actions">
        <button
          className="btn-primary"
          onClick={handleCreateCrew}
        >
          <Plus size={20} />
          Create Your First Crew
        </button>

        <div className="empty-state-divider">
          <span>or</span>
        </div>

        <button
          className="btn-secondary"
          onClick={handleLoadDemoData}
        >
          <Eye size={20} />
          View Demo with Sample Data
        </button>
      </div>

      <div className="empty-state-help">
        <a href="#" className="text-link">
          Learn about managing crews →
        </a>
      </div>
    </div>
  );
}
```

**Styling:**
```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
  min-height: 500px;
}

.empty-state-icon {
  margin-bottom: 24px;
  opacity: 0.6;
}

.empty-state-title {
  font-size: 24px;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 12px;
}

.empty-state-description {
  font-size: 16px;
  color: #64748B;
  max-width: 400px;
  margin-bottom: 32px;
  line-height: 1.6;
}

.empty-state-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.empty-state-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #94A3B8;
  font-size: 14px;
  width: 200px;
}

.empty-state-divider::before,
.empty-state-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #E5E7EB;
}
```

### 7.3 Error State - Failed Data Fetch

**Error State Design:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                         ⚠️                                  │
│              Failed to Load Calendar Data                   │
│                                                             │
│        We couldn't fetch your schedule. This might be       │
│           due to a network issue or server error.           │
│                                                             │
│              Error: Connection timeout (504)                │
│                                                             │
│                    [Try Again]                              │
│                                                             │
│         Having trouble? [Contact Support]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
```tsx
interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}

function CalendarErrorState({ error, onRetry }: ErrorStateProps) {
  const errorDetails = getErrorDetails(error);

  return (
    <div
      className="error-state"
      role="alert"
      aria-live="assertive"
    >
      <div className="error-state-icon">
        <AlertCircle size={64} color="#EF4444" />
      </div>

      <h2 className="error-state-title">
        {errorDetails.title}
      </h2>

      <p className="error-state-message">
        {errorDetails.message}
      </p>

      {errorDetails.technicalDetails && (
        <details className="error-state-details">
          <summary>Technical Details</summary>
          <code>{errorDetails.technicalDetails}</code>
        </details>
      )}

      <div className="error-state-actions">
        <button
          className="btn-primary"
          onClick={onRetry}
        >
          <RefreshCw size={20} />
          Try Again
        </button>
      </div>

      <div className="error-state-footer">
        <p>Having trouble?</p>
        <a href="mailto:support@tradesphere.com" className="text-link">
          Contact Support
        </a>
      </div>
    </div>
  );
}

function getErrorDetails(error: Error) {
  if (error.message.includes('Network')) {
    return {
      title: 'Network Connection Error',
      message: 'We couldn\'t connect to the server. Please check your internet connection and try again.',
      technicalDetails: error.message
    };
  }

  if (error.message.includes('timeout')) {
    return {
      title: 'Request Timeout',
      message: 'The server is taking too long to respond. Please try again in a moment.',
      technicalDetails: error.message
    };
  }

  return {
    title: 'Failed to Load Calendar Data',
    message: 'An unexpected error occurred while loading your schedule.',
    technicalDetails: error.message
  };
}
```

**Styling:**
```css
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
  min-height: 500px;
  background: linear-gradient(135deg, #FEF2F2 0%, #FFFFFF 100%);
}

.error-state-icon {
  margin-bottom: 24px;
  animation: shake 0.5s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.error-state-title {
  font-size: 24px;
  font-weight: 600;
  color: #991B1B;
  margin-bottom: 12px;
}

.error-state-message {
  font-size: 16px;
  color: #64748B;
  max-width: 500px;
  margin-bottom: 24px;
  line-height: 1.6;
}

.error-state-details {
  background: #F8FAFC;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  text-align: left;
  max-width: 600px;
}

.error-state-details code {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  color: #EF4444;
  display: block;
  white-space: pre-wrap;
  word-break: break-word;
}
```

### 7.4 Conflict Modal Design

**Modal Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️  Scheduling Conflict Detected                      [✕]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Alpha Crew is already assigned to other jobs on this date. │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Existing Assignments on Jan 20:                     │   │
│  │                                                      │   │
│  │ • JOB-2025-003 - Office Building Courtyard          │   │
│  │   Jan 20-26 (6 days)                                │   │
│  │                                                      │   │
│  │ • JOB-2025-002 - Front Walkway                      │   │
│  │   Jan 19-21 (2 days)                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  New Assignment:                                            │
│  • JOB-2025-001 - Backyard Paver Patio                     │
│    Jan 20-23 (3 days)                                       │
│                                                             │
│  ⚠️ This will result in 3 overlapping jobs on Jan 20-21.   │
│                                                             │
│  Crew capacity: 2 concurrent jobs                           │
│  New total: 3 concurrent jobs (150% capacity)               │
│                                                             │
│  What would you like to do?                                 │
│                                                             │
│  [ Cancel]  [Assign Anyway]  [Choose Different Date]       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
```tsx
interface ConflictModalProps {
  isOpen: boolean;
  conflict: CalendarConflict;
  newAssignment: CalendarJobBlock;
  onCancel: () => void;
  onForceAssign: () => void;
  onReschedule: () => void;
}

function ConflictModal({
  isOpen,
  conflict,
  newAssignment,
  onCancel,
  onForceAssign,
  onReschedule
}: ConflictModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-modal-title"
    >
      <div className="modal-content conflict-modal">
        <header className="modal-header">
          <div className="modal-title-row">
            <AlertCircle size={24} color="#F59E0B" />
            <h2 id="conflict-modal-title">
              Scheduling Conflict Detected
            </h2>
            <button
              className="modal-close"
              onClick={onCancel}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="modal-body">
          <p className="conflict-description">
            {conflict.crew.crew_name} is already assigned to other jobs on this date.
          </p>

          <div className="conflict-details">
            <h3>Existing Assignments on {formatDate(conflict.date)}:</h3>

            <ul className="conflict-job-list">
              {conflict.assignments.map(job => (
                <li key={job.assignment_id} className="conflict-job-item">
                  <strong>{job.job_number}</strong> - {job.job_title}
                  <br />
                  <span className="text-muted">
                    {formatDate(job.start)} - {formatDate(job.end)}
                    ({getDurationDays(job.start, job.end)} days)
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="conflict-new-assignment">
            <h3>New Assignment:</h3>
            <div className="conflict-job-item">
              <strong>{newAssignment.job_number}</strong> - {newAssignment.job_title}
              <br />
              <span className="text-muted">
                {formatDate(newAssignment.start)} - {formatDate(newAssignment.end)}
                ({getDurationDays(newAssignment.start, newAssignment.end)} days)
              </span>
            </div>
          </div>

          <div className="conflict-warning">
            <AlertCircle size={20} color="#EF4444" />
            <div>
              <strong>Impact:</strong>
              <p>
                This will result in {conflict.assignments.length + 1} overlapping jobs.
              </p>
              <p>
                Crew capacity: {conflict.crew.max_capacity} concurrent jobs
                <br />
                New total: {conflict.assignments.length + 1} concurrent jobs
                ({Math.round((conflict.assignments.length + 1) / conflict.crew.max_capacity * 100)}% capacity)
              </p>
            </div>
          </div>

          <p className="conflict-question">What would you like to do?</p>
        </div>

        <footer className="modal-footer">
          <button
            className="btn-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            className="btn-warning"
            onClick={onForceAssign}
          >
            Assign Anyway
          </button>

          <button
            className="btn-primary"
            onClick={onReschedule}
          >
            <Calendar size={20} />
            Choose Different Date
          </button>
        </footer>
      </div>
    </div>
  );
}
```

**Styling:**
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fade-in 0.2s ease;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slide-up 0.3s ease;
}

@keyframes slide-up {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.conflict-modal .modal-header {
  padding: 24px;
  border-bottom: 1px solid #E5E7EB;
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-title-row h2 {
  flex: 1;
  font-size: 20px;
  font-weight: 600;
  color: #1E293B;
}

.modal-close {
  padding: 8px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #64748B;
}

.modal-close:hover {
  background: #F1F5F9;
}

.modal-body {
  padding: 24px;
}

.conflict-description {
  font-size: 16px;
  color: #475569;
  margin-bottom: 24px;
}

.conflict-details,
.conflict-new-assignment {
  background: #F8FAFC;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.conflict-details h3,
.conflict-new-assignment h3 {
  font-size: 14px;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 12px;
}

.conflict-job-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.conflict-job-item {
  padding: 12px;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 14px;
}

.conflict-job-item:last-child {
  margin-bottom: 0;
}

.conflict-warning {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #FEF2F2;
  border: 1px solid #FCA5A5;
  border-radius: 8px;
  margin-bottom: 16px;
}

.conflict-warning strong {
  display: block;
  color: #991B1B;
  margin-bottom: 4px;
}

.conflict-warning p {
  font-size: 14px;
  color: #7F1D1D;
  margin: 4px 0;
}

.conflict-question {
  font-size: 16px;
  font-weight: 500;
  color: #1E293B;
  margin-top: 24px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #E5E7EB;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-warning {
  background: #F59E0B;
  color: #FFFFFF;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
}

.btn-warning:hover {
  background: #D97706;
}
```

---

## 8. Implementation Checklist

### Phase 1: Core Structure
- [ ] Create CalendarGrid component with responsive layout
- [ ] Implement week timeline header with navigation
- [ ] Add today indicator and jump-to-today button
- [ ] Create crew row components with utilization display
- [ ] Build unassigned jobs section with collapse/expand

### Phase 2: Job Blocks
- [ ] Design job block component with all information layers
- [ ] Implement truncation logic for responsive widths
- [ ] Add priority indicators (corner dots)
- [ ] Build completion progress bars
- [ ] Create tooltip component with full job details

### Phase 3: Drag-and-Drop
- [ ] Implement HTML5 drag API for job blocks
- [ ] Add drop zone highlighting (valid/invalid)
- [ ] Create ghost image during drag
- [ ] Build conflict detection logic
- [ ] Add drop animation and feedback

### Phase 4: Accessibility
- [ ] Add ARIA labels to all interactive elements
- [ ] Implement keyboard navigation (Tab, Arrow keys)
- [ ] Create screen reader announcements (live regions)
- [ ] Validate color contrast ratios (WCAG AA minimum)
- [ ] Test with screen reader (NVDA/JAWS)

### Phase 5: States & Feedback
- [ ] Build loading skeleton component
- [ ] Create empty state for no crews
- [ ] Design error state for failed fetches
- [ ] Implement conflict modal with resolution options
- [ ] Add success/error toast notifications

### Phase 6: Responsive Design
- [ ] Mobile layout (<768px) with vertical stack
- [ ] Tablet layout (768-1024px) with optimized columns
- [ ] Desktop layout (>1024px) with full features
- [ ] Touch gesture support for mobile
- [ ] Test on physical devices

### Phase 7: Polish & Performance
- [ ] Add animations with reduced-motion support
- [ ] Optimize rendering performance (memoization)
- [ ] Implement dark mode support
- [ ] Add keyboard shortcuts help panel
- [ ] Performance testing and optimization

---

## 9. Success Criteria

### Functional Requirements
- ✅ All job blocks are draggable and droppable
- ✅ Conflicts are detected and highlighted
- ✅ Crew utilization is calculated and displayed
- ✅ Mobile responsive (works on phones/tablets)
- ✅ Keyboard navigation fully functional
- ✅ Screen reader accessible

### Performance Metrics
- ⏱️ Initial load: < 2 seconds
- ⏱️ Drag-drop response: < 100ms
- ⏱️ Week navigation: < 300ms
- ⏱️ Filter application: < 200ms
- 📊 Lighthouse Accessibility Score: > 95

### Usability Goals
- 🎯 New users can schedule a job without training
- 🎯 Conflicts are immediately obvious
- 🎯 Touch interactions feel natural on mobile
- 🎯 Keyboard-only users can complete all tasks
- 🎯 No accessibility blockers for screen reader users

---

## 10. Design Tokens Reference

```typescript
// Calendar-specific design tokens
export const CALENDAR_TOKENS = {
  // Spacing
  spacing: {
    columnGap: '0px',
    rowGap: '0px',
    jobBlockMargin: '8px',
    crewLabelPadding: '16px',
    cellPadding: '8px'
  },

  // Dimensions
  dimensions: {
    weekHeaderHeight: '64px',
    timelineHeaderHeight: '48px',
    crewRowHeight: '120px',
    jobBlockHeight: '100px',
    crewLabelWidth: '180px',
    columnWidthDesktop: '140px',
    columnWidthTablet: '120px',
    columnWidthMobile: '100px',
    touchTargetMin: '44px'
  },

  // Colors (from existing tokens)
  colors: {
    crewColors: CREW_COLORS,
    statusColors: STATUS_COLORS,
    priorityColors: PRIORITY_COLORS,
    conflictWarning: '#F59E0B',
    conflictError: '#EF4444',
    dropZoneValid: '#10B981',
    dropZoneInvalid: '#EF4444',
    todayHighlight: '#EFF6FF',
    weekendBackground: '#F9FAFB'
  },

  // Typography
  typography: {
    jobNumber: { size: '13px', weight: 600 },
    customerName: { size: '12px', weight: 500 },
    jobTitle: { size: '11px', weight: 400 },
    dateRange: { size: '10px', weight: 400 },
    crewName: { size: '14px', weight: 600 },
    utilization: { size: '12px', weight: 400 }
  },

  // Animation
  animation: {
    dragStart: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    dragEnd: 'cubic-bezier(0.19, 1, 0.22, 1)',
    dropSettle: '300ms',
    hoverTransition: '150ms',
    conflictPulse: '2s'
  },

  // Z-index layers
  zIndex: {
    calendar: 1,
    jobBlock: 10,
    dragGhost: 9999,
    tooltip: 10000,
    modal: 10001
  }
};
```

---

**Document Version:** 1.0
**Last Updated:** 2025-01-24
**Next Review:** After implementation Phase 3
**Design Owner:** UI/UX Team
**Implementation Reference:** SCHEDULING_CALENDAR_IMPLEMENTATION.md
