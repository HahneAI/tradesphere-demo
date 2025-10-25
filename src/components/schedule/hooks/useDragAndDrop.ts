import { useCallback } from 'react';
import type { CalendarJobBlock } from '../../../types/jobs-views';
import { useDragDrop } from '../context/DragDropContext';

/**
 * HTML5 Drag and Drop hook for job scheduling
 * Provides drag/drop handlers for job blocks and crew cells
 */

interface DragData {
  type: 'job-block';
  jobId: string;
  assignmentId: string | null;
  sourceCrewId: string | null;
  estimatedHours: number;
  estimatedDays: number;
}

export function useDragAndDrop() {
  const { startDrag, endDrag, setDropTarget, onDrop, draggedJob } = useDragDrop();

  /**
   * Handle drag start on job block
   */
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, job: CalendarJobBlock, sourceCrewId: string | null) => {
      const dragData: DragData = {
        type: 'job-block',
        jobId: job.job_id,
        assignmentId: job.assignment_id,
        sourceCrewId: sourceCrewId,
        estimatedHours: job.estimated_hours,
        estimatedDays: job.estimated_days,
      };

      // Set drag data
      e.dataTransfer.setData('application/json', JSON.stringify(dragData));
      e.dataTransfer.effectAllowed = 'move';

      // Set drag image with semi-transparent copy of element
      if (e.currentTarget instanceof HTMLElement) {
        const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
        dragImage.style.opacity = '0.8';
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, 50, 50);
        setTimeout(() => document.body.removeChild(dragImage), 0);
      }

      // Update context state
      startDrag(job, sourceCrewId);
    },
    [startDrag]
  );

  /**
   * Handle drag end
   */
  const handleDragEnd = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      endDrag();
    },
    [endDrag]
  );

  /**
   * Handle drag over (must preventDefault to allow drop)
   */
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  /**
   * Handle drag enter on crew cell
   */
  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>, crewId: string, date: Date) => {
      e.preventDefault();
      setDropTarget({ crewId, date });
    },
    [setDropTarget]
  );

  /**
   * Handle drag leave
   */
  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      // Only clear if leaving the drop zone completely
      if (e.currentTarget === e.target) {
        setDropTarget(null);
      }
    },
    [setDropTarget]
  );

  /**
   * Handle drop on crew cell
   * Implements 8am-5pm time-block scheduling
   */
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>, crewId: string, dropDate: Date) => {
      e.preventDefault();

      try {
        // Parse drag data
        const dragDataStr = e.dataTransfer.getData('application/json');
        if (!dragDataStr) return;

        const dragData: DragData = JSON.parse(dragDataStr);

        if (dragData.type !== 'job-block') return;

        // Execute drop handler with crew, date
        // The parent handler will apply 8am-5pm time logic
        await onDrop(dragData.jobId, crewId, dropDate);
      } catch (error) {
        console.error('Drop failed:', error);
      } finally {
        endDrag();
      }
    },
    [onDrop, endDrag]
  );

  return {
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    draggedJob,
  };
}
