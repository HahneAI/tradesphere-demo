/**
 * Conflict Detection Utility
 *
 * Detects scheduling conflicts between jobs assigned to the same crew
 * Supports multiple conflict types: full overlap, partial overlap, same-day double booking
 *
 * @module utils/conflictDetection
 */

import { CalendarJobBlock } from '../types/jobs-views';

/**
 * Types of scheduling conflicts
 */
export type ConflictType =
  | 'full-overlap'      // Job A completely overlaps Job B
  | 'partial-overlap'   // Jobs overlap by one or more days
  | 'same-day-double'   // Multiple jobs scheduled on the same day
  | 'back-to-back';     // Jobs scheduled consecutively (warning, not error)

/**
 * Conflict severity levels
 */
export type ConflictSeverity = 'error' | 'warning';

/**
 * Represents a detected scheduling conflict
 */
export interface ScheduleConflict {
  type: ConflictType;
  severity: ConflictSeverity;
  job1: CalendarJobBlock;
  job2: CalendarJobBlock;
  crewId: string;
  overlapDays: number;
  message: string;
}

/**
 * Conflict detection result for a single job
 */
export interface JobConflictInfo {
  jobId: string;
  hasConflict: boolean;
  conflictCount: number;
  highestSeverity: ConflictSeverity | null;
  conflicts: ScheduleConflict[];
}

/**
 * Overall conflict detection result
 */
export interface ConflictDetectionResult {
  hasConflicts: boolean;
  totalConflicts: number;
  errorCount: number;
  warningCount: number;
  conflicts: ScheduleConflict[];
  jobConflicts: Map<string, JobConflictInfo>;
}

/**
 * Check if two date ranges overlap
 */
function doDateRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 <= end2 && start2 <= end1;
}

/**
 * Calculate the number of overlapping days between two date ranges
 */
function calculateOverlapDays(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): number {
  if (!doDateRangesOverlap(start1, end1, start2, end2)) {
    return 0;
  }

  const overlapStart = start1 > start2 ? start1 : start2;
  const overlapEnd = end1 < end2 ? end1 : end2;

  const diffTime = Math.abs(overlapEnd.getTime() - overlapStart.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days

  return diffDays;
}

/**
 * Check if two jobs are on the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Determine the type of conflict between two jobs
 */
function determineConflictType(
  job1: CalendarJobBlock,
  job2: CalendarJobBlock,
  overlapDays: number
): ConflictType {
  const start1 = new Date(job1.scheduled_start);
  const end1 = new Date(job1.scheduled_end);
  const start2 = new Date(job2.scheduled_start);
  const end2 = new Date(job2.scheduled_end);

  // Check if jobs are back-to-back (ending day = starting day of next job)
  const job1EndDay = new Date(end1);
  job1EndDay.setHours(0, 0, 0, 0);
  const job2StartDay = new Date(start2);
  job2StartDay.setHours(0, 0, 0, 0);
  const job2EndDay = new Date(end2);
  job2EndDay.setHours(0, 0, 0, 0);
  const job1StartDay = new Date(start1);
  job1StartDay.setHours(0, 0, 0, 0);

  const timeDiff = Math.abs(job1EndDay.getTime() - job2StartDay.getTime());
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  if (daysDiff === 1) {
    return 'back-to-back';
  }

  // Check if one job completely overlaps the other
  if (
    (start1 <= start2 && end1 >= end2) ||
    (start2 <= start1 && end2 >= end1)
  ) {
    return 'full-overlap';
  }

  // Check if jobs are on the same day
  if (isSameDay(start1, start2) || isSameDay(end1, end2) || isSameDay(start1, end2) || isSameDay(end1, start2)) {
    return 'same-day-double';
  }

  // Otherwise, it's a partial overlap
  return 'partial-overlap';
}

/**
 * Generate a human-readable conflict message
 */
function generateConflictMessage(
  type: ConflictType,
  job1: CalendarJobBlock,
  job2: CalendarJobBlock,
  overlapDays: number
): string {
  const job1Num = job1.job_number;
  const job2Num = job2.job_number;

  switch (type) {
    case 'full-overlap':
      return `Job ${job1Num} completely overlaps with Job ${job2Num}`;
    case 'partial-overlap':
      return `Job ${job1Num} overlaps with Job ${job2Num} by ${overlapDays} day${overlapDays > 1 ? 's' : ''}`;
    case 'same-day-double':
      return `Jobs ${job1Num} and ${job2Num} are both scheduled on the same day`;
    case 'back-to-back':
      return `Jobs ${job1Num} and ${job2Num} are scheduled back-to-back (no gap)`;
    default:
      return `Job ${job1Num} conflicts with Job ${job2Num}`;
  }
}

/**
 * Detect all scheduling conflicts in a list of jobs
 *
 * @param jobs - List of calendar job blocks to check for conflicts
 * @returns Conflict detection result with all detected conflicts
 */
export function detectScheduleConflicts(
  jobs: CalendarJobBlock[]
): ConflictDetectionResult {
  const conflicts: ScheduleConflict[] = [];
  const jobConflicts = new Map<string, JobConflictInfo>();

  // Initialize job conflict info for all jobs
  jobs.forEach(job => {
    jobConflicts.set(job.job_id, {
      jobId: job.job_id,
      hasConflict: false,
      conflictCount: 0,
      highestSeverity: null,
      conflicts: []
    });
  });

  // Group jobs by crew
  const jobsByCrew = new Map<string, CalendarJobBlock[]>();
  jobs.forEach(job => {
    if (job.crew_id) {
      if (!jobsByCrew.has(job.crew_id)) {
        jobsByCrew.set(job.crew_id, []);
      }
      jobsByCrew.get(job.crew_id)!.push(job);
    }
  });

  // Check for conflicts within each crew
  jobsByCrew.forEach((crewJobs, crewId) => {
    // Compare each job with every other job for this crew
    for (let i = 0; i < crewJobs.length; i++) {
      for (let j = i + 1; j < crewJobs.length; j++) {
        const job1 = crewJobs[i];
        const job2 = crewJobs[j];

        const start1 = new Date(job1.scheduled_start);
        const end1 = new Date(job1.scheduled_end);
        const start2 = new Date(job2.scheduled_start);
        const end2 = new Date(job2.scheduled_end);

        // Check if dates overlap
        if (doDateRangesOverlap(start1, end1, start2, end2)) {
          const overlapDays = calculateOverlapDays(start1, end1, start2, end2);
          const conflictType = determineConflictType(job1, job2, overlapDays);
          const severity: ConflictSeverity = conflictType === 'back-to-back' ? 'warning' : 'error';

          const conflict: ScheduleConflict = {
            type: conflictType,
            severity,
            job1,
            job2,
            crewId,
            overlapDays,
            message: generateConflictMessage(conflictType, job1, job2, overlapDays)
          };

          conflicts.push(conflict);

          // Update job conflict info for both jobs
          [job1.job_id, job2.job_id].forEach(jobId => {
            const info = jobConflicts.get(jobId)!;
            info.hasConflict = true;
            info.conflictCount++;
            info.conflicts.push(conflict);

            // Update highest severity
            if (!info.highestSeverity || (severity === 'error' && info.highestSeverity === 'warning')) {
              info.highestSeverity = severity;
            }
          });
        }
      }
    }
  });

  const errorCount = conflicts.filter(c => c.severity === 'error').length;
  const warningCount = conflicts.filter(c => c.severity === 'warning').length;

  return {
    hasConflicts: conflicts.length > 0,
    totalConflicts: conflicts.length,
    errorCount,
    warningCount,
    conflicts,
    jobConflicts
  };
}

/**
 * Get conflict info for a specific job
 */
export function getJobConflictInfo(
  jobId: string,
  conflictResult: ConflictDetectionResult
): JobConflictInfo | null {
  return conflictResult.jobConflicts.get(jobId) || null;
}

/**
 * Check if a job has any conflicts
 */
export function hasJobConflict(
  jobId: string,
  conflictResult: ConflictDetectionResult
): boolean {
  const info = conflictResult.jobConflicts.get(jobId);
  return info ? info.hasConflict : false;
}

/**
 * Get the highest severity conflict for a job
 */
export function getJobHighestSeverity(
  jobId: string,
  conflictResult: ConflictDetectionResult
): ConflictSeverity | null {
  const info = conflictResult.jobConflicts.get(jobId);
  return info ? info.highestSeverity : null;
}
