/**
 * Schedule Tab Component
 *
 * Current Implementation:
 * ✅ Phase 1: Foundation (utilities, hooks, types)
 * ✅ Phase 2: Data Layer (Supabase integration, mock crews)
 * ✅ Phase 3: Static Calendar (grid, rows, blocks)
 * ✅ Phase 4: Drag-and-Drop (8am-5pm time blocks)
 * ⏳ Phase 5: Conflict Detection
 * ⏳ Phase 6: Interactions
 * ⏳ Phase 7: Polish
 *
 * @module ScheduleTab
 */

import React, { useCallback } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../../config/industry';
import { hapticFeedback } from '../../utils/mobile-gestures';
import { useWeekNavigation } from './hooks/useWeekNavigation';
import { useScheduleCalendar } from './hooks/useScheduleCalendar';
import { WeekHeader } from './calendar/WeekHeader';
import { CalendarGrid } from './calendar/CalendarGrid';
import { DragDropProvider } from './context/DragDropContext';
import { formatCurrency, formatDate } from '../../types/jobs-views';
import { supabase } from '../../lib/supabase';

interface ScheduleTabProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Schedule Tab - Drag-and-Drop Calendar
 * Phase 4: Full drag-drop with 8am-5pm time-block scheduling
 */
export const ScheduleTab: React.FC<ScheduleTabProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);

  // Week navigation
  const {
    weekDates,
    weekRange,
    goToNextWeek,
    goToPreviousWeek,
    goToToday,
    isCurrentWeek
  } = useWeekNavigation();

  // Calendar data
  const {
    crews,
    calendarJobs,
    unassignedJobs,
    assignedJobs,
    isLoading,
    error,
    refreshCalendar
  } = useScheduleCalendar(
    user?.company_id || '',
    weekDates[0],
    weekDates[6]
  );

  /**
   * Handle job drop with 8am-5pm time-block scheduling
   * Properly handles re-dragging by canceling old assignments first
   * Database trigger auto-syncs ops_jobs table
   */
  const handleJobDrop = useCallback(
    async (jobId: string, crewId: string, dropDate: Date) => {
      try {
        // Find the job to get estimated hours and days
        const job = calendarJobs.find(j => j.job_id === jobId);
        if (!job) {
          console.error('Job not found:', jobId);
          return;
        }

        const estimatedHours = job.estimated_hours || 0;
        const estimatedDays = job.estimated_days || 1;

        // Set start time to 8:00 AM
        const scheduledStart = new Date(dropDate);
        scheduledStart.setHours(8, 0, 0, 0);

        // Set end time to 5:00 PM on the final business day
        const scheduledEnd = new Date(dropDate);
        scheduledEnd.setDate(scheduledEnd.getDate() + estimatedDays);
        scheduledEnd.setHours(17, 0, 0, 0);

        // TODO Phase 5: Check for conflicts
        // const conflicts = await checkScheduleConflicts(crewId, scheduledStart, scheduledEnd);

        // CRITICAL FIX: Cancel any existing active assignments for this job
        // This handles the re-dragging scenario (moving from Crew A to Crew B)
        const { error: cancelError } = await supabase.rpc(
          'cancel_existing_job_assignments',
          { p_job_id: jobId }
        );

        if (cancelError) {
          console.error('Failed to cancel existing assignments:', cancelError);
          // Continue anyway - the unique index will prevent duplicates
        }

        // Insert new assignment (NOT upsert - we cancelled old ones above)
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('ops_job_assignments')
          .insert({
            job_id: jobId,
            crew_id: crewId,
            scheduled_start: scheduledStart.toISOString(),
            scheduled_end: scheduledEnd.toISOString(),
            estimated_hours: estimatedHours,
            status: 'scheduled',
            completion_percentage: 0,
            assigned_by_user_id: user?.id,
            metadata: {
              assigned_via: 'calendar_drag_drop',
              assigned_at: new Date().toISOString(),
              business_hours: '8:00 AM - 5:00 PM',
              drop_date: dropDate.toISOString()
            }
          })
          .select()
          .single();

        if (assignmentError) {
          console.error('Assignment creation failed:', assignmentError);
          return;
        }

        // NOTE: ops_jobs table is auto-synced by database trigger
        // No manual update needed - trigger handles:
        // - scheduled_start_date
        // - scheduled_end_date
        // - status transition (quote/approved → scheduled)

        // Success - refresh calendar
        console.log('✅ Job assigned successfully:', {
          jobId,
          crewId,
          scheduledStart: scheduledStart.toISOString(),
          scheduledEnd: scheduledEnd.toISOString(),
          assignmentId: assignmentData.id
        });

        refreshCalendar();
      } catch (error) {
        console.error('❌ Job drop failed:', error);
      }
    },
    [calendarJobs, user?.id, refreshCalendar]
  );

  if (!isOpen) return null;

  const handleClose = () => {
    hapticFeedback.impact('light');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: visualConfig.colors.background }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: visualConfig.colors.text.secondary + '20' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: '#8B5CF6' + '20' }}
          >
            <Icons.Calendar className="h-6 w-6" style={{ color: '#8B5CF6' }} />
          </div>
          <div>
            <h2
              className="text-2xl font-bold"
              style={{ color: visualConfig.colors.text.primary }}
            >
              Schedule Management
            </h2>
            <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
              📊 Phase 1-2 Complete: Data Layer Active • Phase 3: Calendar UI In Progress
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-2 rounded-lg transition-colors"
          style={{
            color: visualConfig.colors.text.secondary,
            backgroundColor: visualConfig.colors.text.secondary + '10'
          }}
        >
          <Icons.X className="h-6 w-6" />
        </button>
      </div>

      {/* Week Navigation Header */}
      <WeekHeader
        weekDates={weekDates}
        weekRange={weekRange}
        onPreviousWeek={goToPreviousWeek}
        onNextWeek={goToNextWeek}
        onToday={goToToday}
        isCurrentWeek={isCurrentWeek()}
        visualConfig={visualConfig}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div
                className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
                style={{ borderColor: visualConfig.colors.primary }}
              />
              <p style={{ color: visualConfig.colors.text.secondary }}>Loading schedule data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center p-8">
            <Icons.AlertCircle className="h-16 w-16 mx-auto mb-4" style={{ color: '#EF4444' }} />
            <h3 className="text-xl font-bold mb-2" style={{ color: visualConfig.colors.text.primary }}>
              Error Loading Data
            </h3>
            <p style={{ color: visualConfig.colors.text.secondary }}>{error}</p>
          </div>
        ) : (
          <DragDropProvider onDrop={handleJobDrop}>
            <div className="flex flex-col h-full">
              {/* Calendar Grid */}
              <CalendarGrid
                crews={crews}
                weekStart={weekDates[0]}
                assignedJobs={assignedJobs}
                unassignedJobs={unassignedJobs}
                visualConfig={visualConfig}
                onJobClick={(jobId) => console.log('Job clicked:', jobId)}
              />

            {/* Stats Summary (collapsed below calendar) */}
            <div className="p-6 space-y-6 border-t" style={{ borderColor: visualConfig.colors.text.secondary + '20' }}>
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: visualConfig.colors.surface,
                  borderColor: visualConfig.colors.text.secondary + '20'
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icons.Users size={20} style={{ color: '#3B82F6' }} />
                  <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                    Crews
                  </span>
                </div>
                <p className="text-3xl font-bold" style={{ color: visualConfig.colors.text.primary }}>
                  {crews.length}
                </p>
              </div>

              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: visualConfig.colors.surface,
                  borderColor: visualConfig.colors.text.secondary + '20'
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icons.Briefcase size={20} style={{ color: '#10B981' }} />
                  <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                    Total Jobs
                  </span>
                </div>
                <p className="text-3xl font-bold" style={{ color: visualConfig.colors.text.primary }}>
                  {calendarJobs.length}
                </p>
              </div>

              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: visualConfig.colors.surface,
                  borderColor: visualConfig.colors.text.secondary + '20'
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icons.Calendar size={20} style={{ color: '#F59E0B' }} />
                  <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                    Assigned
                  </span>
                </div>
                <p className="text-3xl font-bold" style={{ color: visualConfig.colors.text.primary }}>
                  {assignedJobs.length}
                </p>
              </div>

              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: visualConfig.colors.surface,
                  borderColor: visualConfig.colors.text.secondary + '20'
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icons.AlertCircle size={20} style={{ color: '#EF4444' }} />
                  <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                    Unassigned
                  </span>
                </div>
                <p className="text-3xl font-bold" style={{ color: visualConfig.colors.text.primary }}>
                  {unassignedJobs.length}
                </p>
              </div>
            </div>

            {/* Crews List */}
            <div>
              <h3 className="text-lg font-bold mb-3" style={{ color: visualConfig.colors.text.primary }}>
                Available Crews
              </h3>
              <div className="space-y-2">
                {crews.map(crew => (
                  <div
                    key={crew.id}
                    className="p-4 rounded-lg border flex items-center justify-between"
                    style={{
                      backgroundColor: visualConfig.colors.surface,
                      borderColor: visualConfig.colors.text.secondary + '20'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: crew.color_code }}
                      />
                      <div>
                        <p className="font-semibold" style={{ color: visualConfig.colors.text.primary }}>
                          {crew.crew_name}
                        </p>
                        <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                          {crew.specializations?.join(', ')} • Max Capacity: {crew.max_capacity}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Jobs List */}
            <div>
              <h3 className="text-lg font-bold mb-3" style={{ color: visualConfig.colors.text.primary }}>
                Jobs (All Statuses)
              </h3>
              <div className="space-y-2">
                {calendarJobs.map(job => (
                  <div
                    key={job.job_id}
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: visualConfig.colors.surface,
                      borderColor: job.crew_id ? job.color + '40' : visualConfig.colors.text.secondary + '20',
                      borderLeftWidth: '4px',
                      borderLeftColor: job.crew_id ? job.color : '#94A3B8'
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold" style={{ color: visualConfig.colors.text.primary }}>
                            {job.job_number}
                          </p>
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              backgroundColor: job.crew_id ? job.color + '20' : '#F3F4F6',
                              color: job.crew_id ? job.color : '#6B7280'
                            }}
                          >
                            {job.crew_id ? 'Assigned' : 'Unassigned'}
                          </span>
                        </div>
                        <p className="text-sm mb-2" style={{ color: visualConfig.colors.text.primary }}>
                          {job.job_title}
                        </p>
                        <div className="flex items-center gap-4 text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                          <span>👤 {job.customer_name}</span>
                          <span>📅 {job.start ? formatDate(job.start) : 'Not scheduled'}</span>
                          <span>💰 {formatCurrency(job.estimated_total)}</span>
                          <span>⏱️ {job.estimated_hours}h ({job.estimated_days}d)</span>
                          <span>🎯 Priority: {job.priority}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Phase Progress */}
            <div
              className="p-6 rounded-lg"
              style={{
                backgroundColor: '#8B5CF6' + '10',
                border: '1px solid #8B5CF640'
              }}
            >
              <h3 className="font-bold mb-3" style={{ color: visualConfig.colors.text.primary }}>
                🚀 Implementation Progress
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Icons.CheckCircle size={16} style={{ color: '#10B981' }} />
                  <span style={{ color: visualConfig.colors.text.secondary }}>
                    Phase 1: Foundation (utilities, hooks, types) ✅
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Icons.CheckCircle size={16} style={{ color: '#10B981' }} />
                  <span style={{ color: visualConfig.colors.text.secondary }}>
                    Phase 2: Data Layer (Supabase, mock crews, transformations) ✅
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Icons.Clock size={16} style={{ color: '#F59E0B' }} />
                  <span style={{ color: visualConfig.colors.text.secondary }}>
                    Phase 3: Static Calendar (grid, rows, blocks) 🚧
                  </span>
                </div>
              </div>
            </div>
          </div>
            </div>
          </DragDropProvider>
        )}
      </div>
    </div>
  );
};

export default ScheduleTab;
