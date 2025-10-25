/**
 * Jobs View-Specific Type Definitions
 *
 * Additional types for Jobs UI views (Kanban, Table, Calendar)
 * Extends base Job types from crm.ts
 *
 * @module jobs-views
 */

import {
  Job,
  JobStatus,
  JobListItem,
  JobWithDetails,
  JobAssignment,
  Crew
} from './crm';

// ============================================================================
// View Type Definitions
// ============================================================================

/**
 * Available view modes for Jobs page
 */
export type JobsViewMode = 'kanban' | 'table' | 'calendar';

// ============================================================================
// Kanban View Types
// ============================================================================

/**
 * Kanban column configuration
 */
export interface KanbanColumn {
  id: JobStatus;
  label: string;
  color: string;
  jobs: JobKanbanCard[];
}

/**
 * Job card for Kanban view
 * Optimized for card display with customer and crew info
 */
export interface JobKanbanCard extends JobListItem {
  customer_name: string;
  customer_email?: string | null;
  crew_assigned?: {
    crew_id: string;
    crew_name: string;
    color_code?: string | null;
  } | null;
  services_count: number;
}

/**
 * Drag and drop event data for Kanban
 */
export interface KanbanDragEvent {
  jobId: string;
  sourceStatus: JobStatus;
  targetStatus: JobStatus;
  sourceIndex: number;
  targetIndex: number;
}

// ============================================================================
// Table View Types
// ============================================================================

/**
 * Table column definition
 */
export interface TableColumn {
  key: string;
  label: string;
  sortable: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

/**
 * Table sort configuration
 */
export interface TableSort {
  column: string;
  direction: 'asc' | 'desc';
}

/**
 * Table pagination state
 */
export interface TablePagination {
  page: number;
  pageSize: number;
  total: number;
}

// ============================================================================
// Calendar View Types
// ============================================================================

/**
 * Calendar timeline configuration
 */
export interface CalendarTimeline {
  start: Date;
  end: Date;
  days: Date[];
  viewType: 'week' | 'month';
}

/**
 * Crew row in calendar view
 */
export interface CalendarCrewRow {
  crew: Crew;
  assignments: CalendarJobBlock[];
  utilization: number; // 0-100 percentage
  conflicts: CalendarConflict[];
}

/**
 * Job block for calendar display
 */
export interface CalendarJobBlock {
  assignment_id: string;
  job_id: string;
  job_number: string;
  job_title: string;
  customer_name: string;
  start: Date;
  end: Date;
  color: string;
  status: JobStatus;
  priority: number;
  estimated_total?: number | null;
  completion_percentage: number;
}

/**
 * Scheduling conflict indicator
 */
export interface CalendarConflict {
  crew_id: string;
  date: Date;
  assignments: CalendarJobBlock[];
  severity: 'warning' | 'error'; // warning = over capacity, error = double-booked
}

// ============================================================================
// Filter & Search Types
// ============================================================================

/**
 * Jobs filter state
 * UI-specific filter state management
 */
export interface JobsFilterState {
  // Status filters
  statuses: JobStatus[];

  // Date range
  dateRange: {
    start: Date | null;
    end: Date | null;
    field: 'created_at' | 'scheduled_start_date' | 'scheduled_end_date';
  } | null;

  // Customer filter
  customerIds: string[];

  // Crew filter
  crewIds: string[];

  // Priority filters
  priorities: number[];
  minPriority: number | null;
  maxPriority: number | null;

  // Financial filters
  minValue: number | null;
  maxValue: number | null;

  // Tags
  tags: string[];

  // Special filters
  overdueOnly: boolean;
  highPriorityOnly: boolean;
}

/**
 * Search suggestion result
 */
export interface SearchSuggestion {
  type: 'job' | 'customer' | 'address';
  id: string;
  label: string;
  subtitle?: string;
  icon?: string;
}

// ============================================================================
// Status & Priority Mappings
// ============================================================================

/**
 * Status color mapping for UI
 */
export interface StatusColorConfig {
  bg: string;
  text: string;
  border: string;
}

/**
 * Priority level configuration
 */
export interface PriorityLevel {
  label: string;
  value: number;
  color: string;
}

/**
 * Complete status color map
 */
export const STATUS_COLORS: Record<JobStatus, StatusColorConfig> = {
  quote: {
    bg: '#F1F5F9',
    text: '#475569',
    border: '#CBD5E1'
  },
  approved: {
    bg: '#DBEAFE',
    text: '#1E40AF',
    border: '#3B82F6'
  },
  scheduled: {
    bg: '#EDE9FE',
    text: '#6D28D9',
    border: '#8B5CF6'
  },
  in_progress: {
    bg: '#FEF3C7',
    text: '#92400E',
    border: '#F59E0B'
  },
  completed: {
    bg: '#D1FAE5',
    text: '#065F46',
    border: '#10B981'
  },
  invoiced: {
    bg: '#D1FAE5',
    text: '#047857',
    border: '#059669'
  },
  cancelled: {
    bg: '#FEE2E2',
    text: '#991B1B',
    border: '#EF4444'
  }
};

/**
 * Priority levels mapping
 */
export const PRIORITY_LEVELS: PriorityLevel[] = [
  { label: 'Low', value: 0, color: '#94A3B8' },
  { label: 'Normal', value: 5, color: '#3B82F6' },
  { label: 'High', value: 8, color: '#F59E0B' },
  { label: 'Urgent', value: 10, color: '#EF4444' }
];

/**
 * Kanban columns configuration
 */
export const KANBAN_COLUMNS: Array<{ id: JobStatus; label: string; color: string }> = [
  { id: 'quote', label: 'Quote', color: '#94A3B8' },
  { id: 'approved', label: 'Approved', color: '#3B82F6' },
  { id: 'scheduled', label: 'Scheduled', color: '#8B5CF6' },
  { id: 'in_progress', label: 'In Progress', color: '#F59E0B' },
  { id: 'completed', label: 'Completed', color: '#10B981' },
  { id: 'invoiced', label: 'Invoiced', color: '#059669' }
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get priority label from number value
 */
export const getPriorityLabelFromValue = (priority: number): string => {
  if (priority >= 10) return 'Urgent';
  if (priority >= 8) return 'High';
  if (priority >= 5) return 'Normal';
  return 'Low';
};

/**
 * Get priority color from number value
 */
export const getPriorityColorFromValue = (priority: number): string => {
  if (priority >= 10) return '#EF4444';
  if (priority >= 8) return '#F59E0B';
  if (priority >= 5) return '#3B82F6';
  return '#94A3B8';
};

/**
 * Get status color configuration
 */
export const getStatusColor = (status: JobStatus): StatusColorConfig => {
  return STATUS_COLORS[status];
};

/**
 * Check if two date ranges overlap
 */
export const doDateRangesOverlap = (
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean => {
  return start1 < end2 && start2 < end1;
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format date for display
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(d);
};

/**
 * Format short date (no year if current year)
 */
export const formatShortDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();

  if (d.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(d);
  }

  return formatDate(date);
};

/**
 * Get relative time string (e.g., "2 days ago")
 */
export const getRelativeTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

/**
 * Calculate crew utilization percentage
 */
export const calculateCrewUtilization = (
  assignments: CalendarJobBlock[],
  maxCapacity: number,
  hoursPerDay: number = 8
): number => {
  if (maxCapacity === 0) return 0;

  const totalHours = assignments.reduce((sum, assignment) => {
    const hours = (assignment.end.getTime() - assignment.start.getTime()) / (1000 * 60 * 60);
    return sum + hours;
  }, 0);

  const availableHours = maxCapacity * hoursPerDay;
  return Math.min(100, (totalHours / availableHours) * 100);
};

/**
 * Detect scheduling conflicts for a crew
 */
export const detectScheduleConflicts = (
  assignments: CalendarJobBlock[]
): CalendarConflict[] => {
  const conflicts: CalendarConflict[] = [];
  const sortedAssignments = [...assignments].sort((a, b) =>
    a.start.getTime() - b.start.getTime()
  );

  for (let i = 0; i < sortedAssignments.length; i++) {
    for (let j = i + 1; j < sortedAssignments.length; j++) {
      const a = sortedAssignments[i];
      const b = sortedAssignments[j];

      if (doDateRangesOverlap(a.start, a.end, b.start, b.end)) {
        // Find existing conflict for this date or create new
        const conflictDate = new Date(Math.max(a.start.getTime(), b.start.getTime()));
        conflictDate.setHours(0, 0, 0, 0);

        const existingConflict = conflicts.find(c =>
          c.date.getTime() === conflictDate.getTime()
        );

        if (existingConflict) {
          if (!existingConflict.assignments.includes(b)) {
            existingConflict.assignments.push(b);
          }
        } else {
          conflicts.push({
            crew_id: '', // Will be set by caller
            date: conflictDate,
            assignments: [a, b],
            severity: 'error'
          });
        }
      }
    }
  }

  return conflicts;
};

/**
 * Get default filter state
 */
export const getDefaultFilterState = (): JobsFilterState => ({
  statuses: [],
  dateRange: null,
  customerIds: [],
  crewIds: [],
  priorities: [],
  minPriority: null,
  maxPriority: null,
  minValue: null,
  maxValue: null,
  tags: [],
  overdueOnly: false,
  highPriorityOnly: false
});

/**
 * Check if any filters are active
 */
export const hasActiveFilters = (filters: JobsFilterState): boolean => {
  return (
    filters.statuses.length > 0 ||
    filters.dateRange !== null ||
    filters.customerIds.length > 0 ||
    filters.crewIds.length > 0 ||
    filters.priorities.length > 0 ||
    filters.minPriority !== null ||
    filters.maxPriority !== null ||
    filters.minValue !== null ||
    filters.maxValue !== null ||
    filters.tags.length > 0 ||
    filters.overdueOnly ||
    filters.highPriorityOnly
  );
};
