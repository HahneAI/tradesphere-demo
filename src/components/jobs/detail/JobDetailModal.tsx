/**
 * Job Detail Modal Component
 *
 * Full-featured modal for viewing and managing job details
 * Includes tabbed interface for different aspects of the job
 *
 * Tabs:
 * - Overview: Basic job information, customer details, priority
 * - Services: Line items, pricing breakdown, totals
 * - Notes: Timeline of manual notes and AI insights
 * - Schedule: Crew assignments, dates, progress
 * - Activity: Audit trail of all changes and events
 *
 * @module JobDetailModal
 */

import React, { useState, useEffect, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { jobService } from '../../../services/JobService';
import { JobWithDetails } from '../../../types/crm';
import { hapticFeedback } from '../../../utils/mobile-gestures';

// Tab components
import { OverviewTab } from './tabs/OverviewTab';
import { ServicesTab } from './tabs/ServicesTab';
import { NotesTab } from './tabs/NotesTab';
import { ScheduleTab } from './tabs/ScheduleTab';
import { ActivityTab } from './tabs/ActivityTab';

interface JobDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  companyId: string;
  userId: string;
  onJobUpdated?: () => void;
  visualConfig: any;
  theme: any;
}

type TabId = 'overview' | 'services' | 'notes' | 'schedule' | 'activity';

interface TabDefinition {
  id: TabId;
  label: string;
  icon: keyof typeof Icons;
}

/**
 * Job Detail Modal
 * Main container for job detail interface
 */
export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  isOpen,
  onClose,
  jobId,
  companyId,
  userId,
  onJobUpdated,
  visualConfig,
  theme
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [jobData, setJobData] = useState<JobWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Tab definitions
   */
  const tabs: TabDefinition[] = [
    { id: 'overview', label: 'Overview', icon: 'FileText' },
    { id: 'services', label: 'Services', icon: 'ShoppingCart' },
    { id: 'notes', label: 'Notes', icon: 'MessageSquare' },
    { id: 'schedule', label: 'Schedule', icon: 'Calendar' },
    { id: 'activity', label: 'Activity', icon: 'Activity' }
  ];

  /**
   * Fetch job details
   */
  const fetchJobDetails = useCallback(async () => {
    if (!jobId || !companyId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await jobService.getJobDetails(companyId, jobId);
      setJobData(data);
    } catch (err: any) {
      console.error('[JobDetailModal] Error fetching job:', err);
      setError('Failed to load job details');
      hapticFeedback.notification('error');
    } finally {
      setIsLoading(false);
    }
  }, [jobId, companyId]);

  /**
   * Load job on mount and when jobId changes
   */
  useEffect(() => {
    if (isOpen && jobId) {
      fetchJobDetails();
    }
  }, [isOpen, jobId, fetchJobDetails]);

  /**
   * Handle tab change
   */
  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
    hapticFeedback.selection();
  }, []);

  /**
   * Handle close
   */
  const handleClose = useCallback(() => {
    hapticFeedback.impact('medium');
    onClose();
    // Reset state after closing
    setTimeout(() => {
      setActiveTab('overview');
      setJobData(null);
      setError(null);
    }, 300);
  }, [onClose]);

  /**
   * Handle job update
   */
  const handleJobUpdate = useCallback(async () => {
    await fetchJobDetails();
    onJobUpdated?.();
  }, [fetchJobDetails, onJobUpdated]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col"
        style={{ backgroundColor: visualConfig.colors.background }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: visualConfig.colors.text.secondary + '20' }}
        >
          {/* Left: Job info */}
          <div className="flex items-center gap-4">
            {!isLoading && jobData && (
              <>
                <div>
                  <div className="flex items-center gap-2">
                    <h2
                      className="text-xl font-bold"
                      style={{ color: visualConfig.colors.text.primary }}
                    >
                      {jobData.job_number}
                    </h2>
                    <span
                      className="px-2 py-1 text-xs font-semibold rounded-full"
                      style={{
                        backgroundColor: getStatusColor(jobData.status) + '20',
                        color: getStatusColor(jobData.status)
                      }}
                    >
                      {jobData.status}
                    </span>
                  </div>
                  <p
                    className="text-sm mt-1"
                    style={{ color: visualConfig.colors.text.secondary }}
                  >
                    {jobData.customer?.customer_name} • {jobData.title}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Right: Close button */}
          <button
            onClick={handleClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: visualConfig.colors.text.secondary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = visualConfig.colors.text.secondary + '10';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Icons.X size={24} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className="flex gap-1 px-6 pt-4 border-b overflow-x-auto"
          style={{ borderColor: visualConfig.colors.text.secondary + '20' }}
        >
          {tabs.map((tab) => {
            const IconComponent = Icons[tab.icon] as React.ComponentType<any>;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className="flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap"
                style={{
                  color: isActive ? visualConfig.colors.primary : visualConfig.colors.text.secondary,
                  borderBottom: isActive ? `2px solid ${visualConfig.colors.primary}` : '2px solid transparent',
                  marginBottom: '-2px'
                }}
              >
                <IconComponent size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div
                  className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
                  style={{ borderColor: visualConfig.colors.primary }}
                />
                <p style={{ color: visualConfig.colors.text.secondary }}>
                  Loading job details...
                </p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Icons.AlertCircle
                  className="h-16 w-16 mx-auto mb-4"
                  style={{ color: visualConfig.colors.error || '#EF4444' }}
                />
                <h3
                  className="text-lg font-bold mb-2"
                  style={{ color: visualConfig.colors.text.primary }}
                >
                  Error Loading Job
                </h3>
                <p
                  className="mb-4"
                  style={{ color: visualConfig.colors.text.secondary }}
                >
                  {error}
                </p>
                <button
                  onClick={fetchJobDetails}
                  className="px-4 py-2 rounded-lg font-medium"
                  style={{
                    backgroundColor: visualConfig.colors.primary,
                    color: visualConfig.colors.text.onPrimary
                  }}
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Tab content */}
          {!isLoading && !error && jobData && (
            <>
              {activeTab === 'overview' && (
                <OverviewTab
                  job={jobData}
                  onUpdate={handleJobUpdate}
                  visualConfig={visualConfig}
                  theme={theme}
                />
              )}
              {activeTab === 'services' && (
                <ServicesTab
                  job={jobData}
                  onUpdate={handleJobUpdate}
                  visualConfig={visualConfig}
                  theme={theme}
                />
              )}
              {activeTab === 'notes' && (
                <NotesTab
                  jobId={jobData.id}
                  companyId={companyId}
                  userId={userId}
                  onUpdate={handleJobUpdate}
                  visualConfig={visualConfig}
                  theme={theme}
                />
              )}
              {activeTab === 'schedule' && (
                <ScheduleTab
                  job={jobData}
                  companyId={companyId}
                  userId={userId}
                  onUpdate={handleJobUpdate}
                  visualConfig={visualConfig}
                  theme={theme}
                />
              )}
              {activeTab === 'activity' && (
                <ActivityTab
                  jobId={jobData.id}
                  companyId={companyId}
                  visualConfig={visualConfig}
                  theme={theme}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Helper: Get status color
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    quote: '#64748B',
    approved: '#3B82F6',
    scheduled: '#8B5CF6',
    in_progress: '#F59E0B',
    completed: '#10B981',
    invoiced: '#059669',
    cancelled: '#EF4444'
  };
  return colors[status] || '#64748B';
}

export default JobDetailModal;
