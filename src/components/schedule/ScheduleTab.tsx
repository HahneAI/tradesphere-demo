/**
 * Schedule Tab Component - VISUAL PREVIEW (Phase 1-2 Complete)
 *
 * Current Implementation:
 * ✅ Phase 1: Foundation (utilities, hooks, types)
 * ✅ Phase 2: Data Layer (Supabase integration, mock crews)
 * 🚧 Phase 3: Static Calendar (In Progress)
 * ⏳ Phase 4: Drag-and-Drop
 * ⏳ Phase 5: Conflict Detection
 * ⏳ Phase 6: Interactions
 * ⏳ Phase 7: Polish
 *
 * @module ScheduleTab
 */

import React from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../../config/industry';
import { hapticFeedback } from '../../utils/mobile-gestures';
import { useWeekNavigation } from './hooks/useWeekNavigation';
import { useScheduleCalendar } from './hooks/useScheduleCalendar';
import { WeekHeader } from './calendar/WeekHeader';
import { formatCurrency, formatDate } from '../../types/jobs-views';

interface ScheduleTabProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Schedule Tab - Visual Preview
 * Showing Phase 1-2 infrastructure with real data
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
    error
  } = useScheduleCalendar(
    user?.company_id || '',
    weekDates[0],
    weekDates[6]
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
      <div className="flex-1 overflow-y-auto p-6">
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
          <div className="space-y-6">
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
        )}
      </div>
    </div>
  );
};

export default ScheduleTab;
