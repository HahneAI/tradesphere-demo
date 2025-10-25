/**
 * useJobPositioning Hook
 *
 * Calculates job block positioning and dimensions for calendar layout
 * Handles multi-day spans, stacking for overlapping jobs, and responsive sizing
 *
 * @module useJobPositioning
 */

import { useMemo, useCallback } from 'react';
import { getDurationInDays, getDayOffsetFromWeekStart, doDateRangesOverlap } from '../../../utils/date-helpers';
import { CalendarJobBlock } from '../../../types/jobs-views';

export interface JobPosition {
  left: number;       // Pixels from left edge of calendar
  width: number;      // Pixels wide (spans multiple columns for multi-day jobs)
  top: number;        // Pixels from top (for stacking overlapping jobs)
  zIndex: number;     // Z-index for layering
}

export interface UseJobPositioningReturn {
  /**
   * Calculate position for a single job block
   */
  getJobPosition: (
    job: CalendarJobBlock,
    weekStart: Date,
    crewAssignments: CalendarJobBlock[]
  ) => JobPosition;

  /**
   * Calculate width for a job based on duration
   */
  calculateBlockWidth: (start: Date, end: Date) => number;

  /**
   * Calculate left position for a job based on start date
   */
  calculateBlockLeft: (start: Date, weekStart: Date) => number;

  /**
   * Calculate top position for stacking overlapping jobs
   */
  calculateBlockTop: (job: CalendarJobBlock, crewAssignments: CalendarJobBlock[]) => number;

  /**
   * Check if two jobs overlap in time
   */
  checkOverlap: (job1: CalendarJobBlock, job2: CalendarJobBlock) => boolean;

  // Layout constants
  COLUMN_WIDTH: number;
  JOB_BLOCK_HEIGHT: number;
  STACK_GAP: number;
  MIN_BLOCK_WIDTH: number;
}

/**
 * Custom hook for calculating job block positions in calendar grid
 *
 * @param columnWidth - Width of a single day column in pixels (default: 140)
 * @param blockHeight - Height of a job block in pixels (default: 100)
 * @param stackGap - Gap between stacked blocks in pixels (default: 8)
 * @returns Positioning utilities and constants
 *
 * @example
 * ```tsx
 * function JobBlock({ job, weekStart, crewAssignments }) {
 *   const { getJobPosition } = useJobPositioning();
 *   const position = getJobPosition(job, weekStart, crewAssignments);
 *
 *   return (
 *     <div
 *       style={{
 *         position: 'absolute',
 *         left: position.left,
 *         width: position.width,
 *         top: position.top,
 *         zIndex: position.zIndex
 *       }}
 *     >
 *       {job.job_number}
 *     </div>
 *   );
 * }
 * ```
 */
export function useJobPositioning(
  columnWidth: number = 140,
  blockHeight: number = 100,
  stackGap: number = 8
): UseJobPositioningReturn {
  const COLUMN_WIDTH = columnWidth;
  const JOB_BLOCK_HEIGHT = blockHeight;
  const STACK_GAP = stackGap;
  const MIN_BLOCK_WIDTH = 60; // Minimum width for readability

  /**
   * Calculate block width based on job duration
   * Multi-day jobs span multiple columns
   */
  const calculateBlockWidth = useCallback((start: Date, end: Date): number => {
    const durationDays = getDurationInDays(start, end);
    const calculatedWidth = durationDays * COLUMN_WIDTH;

    // Ensure minimum width for single-day jobs
    return Math.max(calculatedWidth, MIN_BLOCK_WIDTH);
  }, [COLUMN_WIDTH, MIN_BLOCK_WIDTH]);

  /**
   * Calculate block left position based on start date offset from week start
   */
  const calculateBlockLeft = useCallback((start: Date, weekStart: Date): number => {
    const dayOffset = getDayOffsetFromWeekStart(start, weekStart);

    // Clamp to 0-6 (Sunday-Saturday) to prevent overflow
    const clampedOffset = Math.max(0, Math.min(6, dayOffset));

    return clampedOffset * COLUMN_WIDTH;
  }, [COLUMN_WIDTH]);

  /**
   * Check if two job blocks overlap in time
   */
  const checkOverlap = useCallback((job1: CalendarJobBlock, job2: CalendarJobBlock): boolean => {
    // Handle null dates (unassigned jobs)
    if (!job1.start || !job1.end || !job2.start || !job2.end) {
      return false;
    }

    return doDateRangesOverlap(job1.start, job1.end, job2.start, job2.end);
  }, []);

  /**
   * Calculate block top position for stacking
   * Jobs that overlap in time are stacked vertically
   */
  const calculateBlockTop = useCallback((
    job: CalendarJobBlock,
    crewAssignments: CalendarJobBlock[]
  ): number => {
    // Handle unassigned jobs (no positioning needed)
    if (!job.start || !job.end) {
      return 0;
    }

    // Find all jobs that overlap with this job
    const overlappingJobs = crewAssignments.filter(assignment => {
      // Don't compare job with itself
      if (assignment.job_id === job.job_id) {
        return false;
      }

      // Check for time overlap
      return checkOverlap(job, assignment);
    });

    // If no overlaps, place at top (0)
    if (overlappingJobs.length === 0) {
      return 0;
    }

    // Calculate stack index based on jobs that start before this one
    const jobsStartingBefore = overlappingJobs.filter(assignment =>
      assignment.start && job.start && assignment.start <= job.start
    );

    const stackIndex = jobsStartingBefore.length;

    return stackIndex * (JOB_BLOCK_HEIGHT + STACK_GAP);
  }, [JOB_BLOCK_HEIGHT, STACK_GAP, checkOverlap]);

  /**
   * Calculate complete position for a job block
   */
  const getJobPosition = useCallback((
    job: CalendarJobBlock,
    weekStart: Date,
    crewAssignments: CalendarJobBlock[]
  ): JobPosition => {
    // Handle unassigned jobs (no valid dates)
    if (!job.start || !job.end) {
      return {
        left: 0,
        width: MIN_BLOCK_WIDTH,
        top: 0,
        zIndex: 1
      };
    }

    const left = calculateBlockLeft(job.start, weekStart);
    const width = calculateBlockWidth(job.start, job.end);
    const top = calculateBlockTop(job, crewAssignments);

    // Z-index increases with priority (higher priority on top)
    const zIndex = Math.max(1, Math.floor(job.priority / 2));

    return {
      left,
      width,
      top,
      zIndex
    };
  }, [calculateBlockLeft, calculateBlockWidth, calculateBlockTop, MIN_BLOCK_WIDTH]);

  return {
    getJobPosition,
    calculateBlockWidth,
    calculateBlockLeft,
    calculateBlockTop,
    checkOverlap,
    COLUMN_WIDTH,
    JOB_BLOCK_HEIGHT,
    STACK_GAP,
    MIN_BLOCK_WIDTH
  };
}

export default useJobPositioning;
