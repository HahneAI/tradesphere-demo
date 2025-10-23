/**
 * Upcoming Jobs List Component
 *
 * Displays jobs scheduled in the next 7 days
 * Collapsible list with job details and status indicators
 *
 * @module UpcomingJobsList
 */

import React, { useState, useEffect, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { dashboardService } from '../../services/DashboardService';
import { JobStatus, getJobStatusColor, getJobStatusLabel } from '../../types/crm';
import { hapticFeedback } from '../../utils/mobile-gestures';

interface UpcomingJob {
  id: string;
  job_number: string;
  title: string;
  customer_name: string;
  scheduled_start_date: string;
  scheduled_end_date: string;
  status: JobStatus;
  assigned_crews_count: number;
}

interface UpcomingJobsListProps {
  companyId: string;
  visualConfig: any;
  theme: any;
  onJobClick?: (jobId: string) => void;
}

/**
 * Upcoming Jobs List
 * Shows next 7 days of scheduled jobs
 */
export const UpcomingJobsList: React.FC<UpcomingJobsListProps> = ({
  companyId,
  visualConfig,
  theme,
  onJobClick
}) => {
  const [jobs, setJobs] = useState<UpcomingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  /**
   * Fetch upcoming jobs
   */
  const fetchJobs = useCallback(async () => {
    if (!companyId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await dashboardService.getUpcomingJobs(companyId, 7);

      if (!response.success) {
        setError(response.error || 'Failed to load upcoming jobs');
        return;
      }

      setJobs(response.data || []);

    } catch (err: any) {
      console.error('[UpcomingJobsList] Error fetching jobs:', err);
      setError('Failed to load upcoming jobs');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  /**
   * Toggle expansion
   */
  const handleToggle = useCallback(() => {
    hapticFeedback.selection();
    setIsExpanded(prev => !prev);
  }, []);

  /**
   * Handle job click
   */
  const handleJobClick = useCallback((jobId: string) => {
    hapticFeedback.selection();
    onJobClick?.(jobId);
  }, [onJobClick]);

  /**
   * Format date for display
   */
  const formatJobDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }

    // Check if tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    // Return formatted date
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  /**
   * Get days until job
   */
  const getDaysUntil = (dateStr: string): number => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  /**
   * Get status badge color
   */
  const getStatusBadgeColor = (status: JobStatus): string => {
    const colorMap: Record<string, string> = {
      yellow: '#F59E0B',
      blue: '#3B82F6',
      purple: '#8B5CF6',
      orange: '#F97316',
      green: '#10B981',
      teal: '#14B8A6',
      gray: '#6B7280'
    };
    return colorMap[getJobStatusColor(status)] || '#6B7280';
  };

  return (
    <div
      className="rounded-xl shadow-sm overflow-hidden"
      style={{
        backgroundColor: visualConfig.colors.surface,
        border: `1px solid ${visualConfig.colors.text.secondary}20`
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b cursor-pointer"
        style={{ borderColor: visualConfig.colors.text.secondary + '20' }}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3">
          <Icons.Calendar
            className="h-5 w-5"
            style={{ color: visualConfig.colors.primary }}
          />
          <h3 className="font-semibold" style={{ color: visualConfig.colors.text.primary }}>
            Upcoming Jobs
          </h3>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: visualConfig.colors.primary + '20',
              color: visualConfig.colors.primary
            }}
          >
            {jobs.length}
          </span>
        </div>
        <button
          className="p-1 rounded-lg transition-colors"
          style={{ color: visualConfig.colors.text.secondary }}
        >
          {isExpanded ? <Icons.ChevronUp className="h-5 w-5" /> : <Icons.ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2"
                style={{ borderColor: visualConfig.colors.primary }}
              />
            </div>
          )}

          {/* Error State */}
          {error && !jobs.length && (
            <div className="text-center py-8">
              <Icons.AlertCircle
                className="h-12 w-12 mx-auto mb-3"
                style={{ color: visualConfig.colors.error || '#EF4444' }}
              />
              <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                {error}
              </p>
              <button
                onClick={fetchJobs}
                className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: visualConfig.colors.primary,
                  color: visualConfig.colors.text.onPrimary
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && jobs.length === 0 && (
            <div className="text-center py-8">
              <Icons.CalendarOff
                className="h-12 w-12 mx-auto mb-3"
                style={{ color: visualConfig.colors.text.secondary }}
              />
              <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                No jobs scheduled in the next 7 days
              </p>
            </div>
          )}

          {/* Jobs List */}
          {!isLoading && jobs.length > 0 && (
            <div className="space-y-3">
              {jobs.map((job) => {
                const daysUntil = getDaysUntil(job.scheduled_start_date);
                const statusColor = getStatusBadgeColor(job.status);

                return (
                  <div
                    key={job.id}
                    onClick={() => handleJobClick(job.id)}
                    className="p-3 rounded-lg transition-all duration-200 cursor-pointer hover:shadow-md"
                    style={{
                      backgroundColor: visualConfig.colors.background,
                      border: `1px solid ${visualConfig.colors.text.secondary}20`
                    }}
                  >
                    {/* Date Badge */}
                    <div className="flex items-start justify-between mb-2">
                      <div
                        className="px-3 py-1 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: visualConfig.colors.primary + '20',
                          color: visualConfig.colors.primary
                        }}
                      >
                        {formatJobDate(job.scheduled_start_date)}
                        {daysUntil > 1 && ` (${daysUntil} days)`}
                      </div>
                      <div
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: statusColor + '20',
                          color: statusColor
                        }}
                      >
                        {getJobStatusLabel(job.status)}
                      </div>
                    </div>

                    {/* Job Details */}
                    <div className="mb-2">
                      <p
                        className="font-medium text-sm mb-1"
                        style={{ color: visualConfig.colors.text.primary }}
                      >
                        {job.job_number}: {job.title}
                      </p>
                      <p
                        className="text-xs flex items-center gap-1"
                        style={{ color: visualConfig.colors.text.secondary }}
                      >
                        <Icons.User className="h-3 w-3" />
                        {job.customer_name}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs">
                      <div
                        className="flex items-center gap-1"
                        style={{ color: visualConfig.colors.text.secondary }}
                      >
                        <Icons.Users className="h-3 w-3" />
                        {job.assigned_crews_count > 0
                          ? `${job.assigned_crews_count} crew${job.assigned_crews_count > 1 ? 's' : ''} assigned`
                          : 'No crews assigned'
                        }
                      </div>
                      <Icons.ChevronRight
                        className="h-4 w-4"
                        style={{ color: visualConfig.colors.text.secondary }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UpcomingJobsList;
