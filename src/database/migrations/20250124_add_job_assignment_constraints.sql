-- Migration: Add Job Assignment Constraints and Sync Trigger
-- Created: 2025-01-24
-- Purpose: Ensure data integrity for drag-and-drop job scheduling
--
-- Changes:
-- 1. Add unique partial index to prevent multiple active assignments per job
-- 2. Add trigger to auto-sync ops_jobs when ops_job_assignments changes
-- 3. Add function to handle assignment cleanup on status changes

-- ===========================================================================
-- 1. Unique Constraint: One Active Assignment Per Job
-- ===========================================================================
-- This prevents a job from being assigned to multiple crews simultaneously
-- Only applies to 'scheduled' and 'in_progress' statuses
-- Historical completed/cancelled assignments are allowed
-- NOTE: Removed CONCURRENTLY keyword to allow running in transaction

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_assignments_active_unique
ON public.ops_job_assignments (job_id)
WHERE status IN ('scheduled', 'in_progress');

COMMENT ON INDEX idx_job_assignments_active_unique IS
'Ensures a job can only have one active assignment at a time. Historical assignments (completed, cancelled) are allowed.';

-- ===========================================================================
-- 2. Auto-Sync Function: Update ops_jobs when assignment changes
-- ===========================================================================
-- When ops_job_assignments.scheduled_start/end changes, automatically update
-- ops_jobs.scheduled_start_date and scheduled_end_date

CREATE OR REPLACE FUNCTION sync_job_dates_from_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync for active assignments
  IF NEW.status IN ('scheduled', 'in_progress') THEN
    UPDATE public.ops_jobs
    SET
      scheduled_start_date = DATE(NEW.scheduled_start),
      scheduled_end_date = DATE(NEW.scheduled_end),
      status = CASE
        WHEN status = 'quote' THEN 'scheduled'
        WHEN status = 'approved' THEN 'scheduled'
        ELSE status
      END,
      updated_at = NOW()
    WHERE id = NEW.job_id;
  END IF;

  -- If assignment is cancelled or completed, check if job should revert to unscheduled
  IF NEW.status IN ('cancelled', 'completed') AND TG_OP = 'UPDATE' THEN
    -- Check if there are any other active assignments for this job
    PERFORM 1 FROM public.ops_job_assignments
    WHERE job_id = NEW.job_id
      AND id != NEW.id
      AND status IN ('scheduled', 'in_progress')
    LIMIT 1;

    -- If no other active assignments, clear job dates
    IF NOT FOUND THEN
      UPDATE public.ops_jobs
      SET
        scheduled_start_date = NULL,
        scheduled_end_date = NULL,
        status = CASE
          WHEN NEW.status = 'completed' THEN 'completed'
          ELSE 'approved'  -- Revert to approved if cancelled
        END,
        updated_at = NOW()
      WHERE id = NEW.job_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_job_dates_from_assignment IS
'Auto-syncs ops_jobs.scheduled_start_date/end_date when ops_job_assignments changes. Maintains data consistency between tables.';

-- ===========================================================================
-- 3. Create Trigger on ops_job_assignments
-- ===========================================================================

DROP TRIGGER IF EXISTS trg_sync_job_dates_from_assignment ON public.ops_job_assignments;

CREATE TRIGGER trg_sync_job_dates_from_assignment
  AFTER INSERT OR UPDATE OF scheduled_start, scheduled_end, status
  ON public.ops_job_assignments
  FOR EACH ROW
  EXECUTE FUNCTION sync_job_dates_from_assignment();

COMMENT ON TRIGGER trg_sync_job_dates_from_assignment ON public.ops_job_assignments IS
'Triggers auto-sync to ops_jobs when assignment dates or status change';

-- ===========================================================================
-- 4. Cleanup Function: Cancel old assignments when job is re-assigned
-- ===========================================================================
-- Called by application code BEFORE creating a new assignment
-- Cancels any existing active assignments for the job

CREATE OR REPLACE FUNCTION cancel_existing_job_assignments(
  p_job_id UUID,
  p_new_assignment_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_cancelled_count INTEGER;
BEGIN
  -- Cancel all active assignments for this job except the new one
  UPDATE public.ops_job_assignments
  SET
    status = 'cancelled',
    completion_notes = COALESCE(completion_notes, '') ||
      E'\nAuto-cancelled due to job re-assignment at ' || NOW()::TEXT,
    updated_at = NOW()
  WHERE job_id = p_job_id
    AND status IN ('scheduled', 'in_progress')
    AND (p_new_assignment_id IS NULL OR id != p_new_assignment_id);

  GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;

  RETURN v_cancelled_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cancel_existing_job_assignments IS
'Cancels existing active assignments for a job when it is re-assigned. Called before creating new assignment.';

-- ===========================================================================
-- 5. Grant Permissions
-- ===========================================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION sync_job_dates_from_assignment() TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_existing_job_assignments(UUID, UUID) TO authenticated;

-- ===========================================================================
-- Migration Complete
-- ===========================================================================

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration Complete: Job Assignment Constraints Added';
  RAISE NOTICE '   - Unique index on active assignments';
  RAISE NOTICE '   - Auto-sync trigger for ops_jobs dates';
  RAISE NOTICE '   - Cleanup function for re-assignments';
END $$;
