/**
 * Jobs Kanban View
 *
 * Visual pipeline with drag-and-drop status management
 * - 6 status columns (quote → invoiced)
 * - Draggable job cards
 * - Real-time status updates
 * - Color-coded columns
 *
 * @module JobsKanbanView
 */

import React, { useState, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useAuth } from '../../../context/AuthContext';
import { jobService } from '../../../services/JobService';
import { JobListItem, JobStatus } from '../../../types/crm';
import { KANBAN_COLUMNS, formatCurrency, formatShortDate } from '../../../types/jobs-views';
import { hapticFeedback } from '../../../utils/mobile-gestures';
import { StatusBadge } from '../shared/StatusBadge';
import { PriorityIndicator } from '../shared/PriorityIndicator';
import { KanbanColumn } from './kanban/KanbanColumn';
import { JobCard } from './kanban/JobCard';
import { JobDetailModal } from '../detail/JobDetailModal';

interface JobsKanbanViewProps {
  jobs: JobListItem[];
  onRefresh: () => void;
  visualConfig: any;
  theme: 'light' | 'dark';
}

/**
 * Kanban Board View
 * Drag-and-drop interface for job status management
 */
export const JobsKanbanView: React.FC<JobsKanbanViewProps> = ({
  jobs,
  onRefresh,
  visualConfig,
  theme
}) => {
  const { user } = useAuth();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Setup drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

  /**
   * Group jobs by status into columns
   */
  const jobsByStatus = useMemo(() => {
    const grouped = KANBAN_COLUMNS.reduce((acc, column) => {
      acc[column.id] = jobs.filter(job => job.status === column.id);
      return acc;
    }, {} as Record<JobStatus, JobListItem[]>);

    return grouped;
  }, [jobs]);

  /**
   * Get the job being dragged
   */
  const activeJob = useMemo(() => {
    if (!activeJobId) return null;
    return jobs.find(job => job.id === activeJobId) || null;
  }, [activeJobId, jobs]);

  /**
   * Handle drag start
   */
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveJobId(active.id as string);
    hapticFeedback.selection();
  };

  /**
   * Handle drag end - update job status
   */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveJobId(null);

    if (!over) return;

    const jobId = active.id as string;
    const newStatus = over.id as JobStatus;
    const job = jobs.find(j => j.id === jobId);

    if (!job || job.status === newStatus) return;

    // Optimistic UI update
    hapticFeedback.impact('medium');

    console.log(`[Kanban] Moving job ${job.job_number} from ${job.status} to ${newStatus}`);

    // Update job status via API
    setIsUpdating(true);
    try {
      const result = await jobService.updateJobStatus(
        jobId,
        user?.company_id || '',
        newStatus,
        user?.id
      );

      if (result.success) {
        console.log('[Kanban] Job status updated successfully');
        hapticFeedback.notification('success');
        onRefresh(); // Refresh data from server
      } else {
        console.error('[Kanban] Failed to update job status:', result.error);
        hapticFeedback.notification('error');
        // TODO: Show error toast
      }
    } catch (error) {
      console.error('[Kanban] Error updating job status:', error);
      hapticFeedback.notification('error');
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle job card click
   */
  const handleJobClick = (jobId: string) => {
    hapticFeedback.selection();
    console.log('[Kanban] Job card clicked:', jobId);
    setSelectedJobId(jobId);
    setShowDetailModal(true);
  };

  /**
   * Handle detail modal close
   */
  const handleDetailModalClose = () => {
    setShowDetailModal(false);
    setSelectedJobId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full overflow-x-auto p-4">
        {/* Kanban Board */}
        <div className="flex gap-4 min-w-max h-full">
          {KANBAN_COLUMNS.map(column => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              label={column.label}
              color={column.color}
              jobs={jobsByStatus[column.id] || []}
              onJobClick={handleJobClick}
              visualConfig={visualConfig}
              theme={theme}
            />
          ))}
        </div>

        {/* Drag Overlay - shows job card while dragging */}
        <DragOverlay>
          {activeJob && (
            <div className="opacity-90 transform rotate-3">
              <JobCard
                job={activeJob}
                isDragging={true}
                onClick={() => {}}
                visualConfig={visualConfig}
                theme={theme}
              />
            </div>
          )}
        </DragOverlay>
      </div>

      {/* Job Detail Modal */}
      {selectedJobId && (
        <JobDetailModal
          isOpen={showDetailModal}
          onClose={handleDetailModalClose}
          jobId={selectedJobId}
          companyId={user?.company_id || ''}
          userId={user?.id || ''}
          onJobUpdated={onRefresh}
          visualConfig={visualConfig}
          theme={theme}
        />
      )}

      {/* Updating indicator */}
      {isUpdating && (
        <div
          className="fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
          style={{
            backgroundColor: visualConfig.colors.surface,
            borderColor: visualConfig.colors.text.secondary + '30'
          }}
        >
          <div
            className="animate-spin rounded-full h-4 w-4 border-b-2"
            style={{ borderColor: visualConfig.colors.primary }}
          />
          <span style={{ color: visualConfig.colors.text.primary }}>
            Updating job...
          </span>
        </div>
      )}
    </DndContext>
  );
};

export default JobsKanbanView;
