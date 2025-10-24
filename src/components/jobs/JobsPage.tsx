/**
 * Jobs Page - Main Component
 *
 * Full-screen jobs management interface with 3 view patterns:
 * - Kanban: Visual pipeline with drag-drop status updates
 * - Table: Sortable list view with bulk operations
 * - Calendar: Timeline view with crew scheduling
 *
 * Features:
 * - Global search across jobs, customers, addresses
 * - Advanced filtering (status, date, priority, etc.)
 * - View switching with state persistence
 * - Empty state handling
 *
 * @module JobsPage
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../../config/industry';
import { jobService } from '../../services/JobService';
import { JobListItem, JobSearchFilters } from '../../types/crm';
import {
  JobsViewMode,
  JobsFilterState,
  getDefaultFilterState,
  hasActiveFilters
} from '../../types/jobs-views';
import { hapticFeedback } from '../../utils/mobile-gestures';

// View components (will be implemented)
import { JobsKanbanView } from './views/JobsKanbanView';
import { JobsTableView } from './views/JobsTableView';
import { JobsCalendarView } from './views/JobsCalendarView';
import { EmptyState } from './shared/EmptyState';
import { JobCreationWizard } from './JobCreationWizard';

interface JobsPageProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Main Jobs Page Component
 * Manages view state and coordinates between different view modes
 */
export const JobsPage: React.FC<JobsPageProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);

  // View state
  const [viewMode, setViewMode] = useState<JobsViewMode>('kanban');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Data state
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<JobsFilterState>(getDefaultFilterState());

  /**
   * Fetch jobs from database
   */
  const fetchJobs = useCallback(async () => {
    if (!user?.company_id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Build search filters from UI state
      const searchFilters: JobSearchFilters = {
        searchQuery: searchQuery.trim() || undefined,
        status: filters.statuses.length > 0 ? filters.statuses : undefined,
        customer_id: undefined, // TODO: Add customer filter
        date_range: filters.dateRange ? {
          start: filters.dateRange.start?.toISOString() || '',
          end: filters.dateRange.end?.toISOString() || '',
          field: filters.dateRange.field
        } : undefined,
        priority: filters.priorities.length > 0 ? filters.priorities : undefined,
        min_priority: filters.minPriority ?? undefined,
        max_priority: filters.maxPriority ?? undefined,
        min_estimated_total: filters.minValue ?? undefined,
        max_estimated_total: filters.maxValue ?? undefined,
        tags: filters.tags.length > 0 ? filters.tags : undefined,
        overdue_only: filters.overdueOnly || undefined,
        limit: 200, // Fetch all for client-side filtering
        sort_by: 'created_at',
        sort_order: 'desc'
      };

      console.log('[JobsPage] Fetching jobs with filters:', searchFilters);

      const response = await jobService.getJobs(user.company_id, searchFilters);

      setJobs(response.items);

      if (response.items.length === 0 && !hasActiveFilters(filters) && !searchQuery) {
        console.log('[JobsPage] No jobs found - showing empty state');
      }

    } catch (err: any) {
      console.error('[JobsPage] Error fetching jobs:', err);
      setError('Failed to load jobs. Please try again.');
      hapticFeedback.notification('error');
    } finally {
      setIsLoading(false);
    }
  }, [user?.company_id, searchQuery, filters]);

  /**
   * Load jobs on mount and when filters change
   */
  useEffect(() => {
    if (isOpen) {
      fetchJobs();
    }
  }, [isOpen, fetchJobs]);

  /**
   * Handle view mode change
   */
  const handleViewModeChange = useCallback((mode: JobsViewMode) => {
    setViewMode(mode);
    hapticFeedback.selection();
    // TODO: Persist to localStorage
  }, []);

  /**
   * Handle search input change
   */
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  /**
   * Handle filter change
   */
  const handleFilterChange = useCallback((newFilters: Partial<JobsFilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * Clear all filters
   */
  const handleClearFilters = useCallback(() => {
    setFilters(getDefaultFilterState());
    setSearchQuery('');
    hapticFeedback.impact('medium');
  }, []);

  /**
   * Handle create job button click
   */
  const handleCreateJob = useCallback(() => {
    hapticFeedback.impact('medium');
    setShowWizard(true);
  }, []);

  /**
   * Handle wizard close
   */
  const handleWizardClose = useCallback(() => {
    setShowWizard(false);
    // Refresh jobs list after wizard closes (in case job was created)
    fetchJobs();
  }, [fetchJobs]);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(async () => {
    hapticFeedback.impact('medium');
    await fetchJobs();
  }, [fetchJobs]);

  // Check if we should show empty state
  const showEmptyState = !isLoading && jobs.length === 0 && !hasActiveFilters(filters) && !searchQuery;
  const showNoResults = !isLoading && jobs.length === 0 && (hasActiveFilters(filters) || searchQuery);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: visualConfig.colors.background }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: visualConfig.colors.text.secondary + '20' }}
      >
        {/* Left: Back button and title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{
              color: visualConfig.colors.text.secondary
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = visualConfig.colors.text.secondary + '10';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Icons.ArrowLeft size={20} />
          </button>

          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: visualConfig.colors.text.primary }}
            >
              Jobs
            </h1>
            <p
              className="text-sm"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg transition-colors"
            style={{
              color: visualConfig.colors.text.secondary
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = visualConfig.colors.text.secondary + '10';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Icons.RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {/* Create Job button */}
          <button
            onClick={handleCreateJob}
            className="px-4 py-2 rounded-lg font-medium transition-all hover:shadow-md flex items-center gap-2"
            style={{
              backgroundColor: visualConfig.colors.primary,
              color: visualConfig.colors.text.onPrimary
            }}
          >
            <Icons.Plus size={20} />
            <span>Create Job</span>
          </button>
        </div>
      </div>

      {/* Search and View Toggle Bar */}
      <div
        className="flex items-center gap-4 px-4 py-3 border-b"
        style={{ borderColor: visualConfig.colors.text.secondary + '20' }}
      >
        {/* Search bar */}
        <div className="flex-1 relative">
          <Icons.Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: visualConfig.colors.text.secondary }}
          />
          <input
            type="text"
            placeholder="Search jobs, customers, addresses..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border outline-none transition-colors"
            style={{
              backgroundColor: visualConfig.colors.surface,
              borderColor: visualConfig.colors.text.secondary + '30',
              color: visualConfig.colors.text.primary
            }}
          />
        </div>

        {/* Filter button */}
        <button
          onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
          className="px-4 py-2 rounded-lg border transition-colors flex items-center gap-2"
          style={{
            backgroundColor: isFilterPanelOpen ? visualConfig.colors.primary + '10' : visualConfig.colors.surface,
            borderColor: isFilterPanelOpen ? visualConfig.colors.primary : visualConfig.colors.text.secondary + '30',
            color: isFilterPanelOpen ? visualConfig.colors.primary : visualConfig.colors.text.primary
          }}
        >
          <Icons.Filter size={18} />
          <span>Filters</span>
          {hasActiveFilters(filters) && (
            <span
              className="px-1.5 py-0.5 text-xs font-bold rounded-full"
              style={{
                backgroundColor: visualConfig.colors.primary,
                color: visualConfig.colors.text.onPrimary
              }}
            >
              {filters.statuses.length + filters.priorities.length + filters.tags.length}
            </span>
          )}
        </button>

        {/* View toggle buttons */}
        <div
          className="flex items-center gap-1 p-1 rounded-lg"
          style={{ backgroundColor: visualConfig.colors.text.secondary + '10' }}
        >
          <button
            onClick={() => handleViewModeChange('kanban')}
            className="px-3 py-1.5 rounded-md transition-all flex items-center gap-2"
            style={{
              backgroundColor: viewMode === 'kanban' ? visualConfig.colors.primary : 'transparent',
              color: viewMode === 'kanban' ? visualConfig.colors.text.onPrimary : visualConfig.colors.text.secondary
            }}
          >
            <Icons.LayoutGrid size={16} />
            <span className="text-sm font-medium">Kanban</span>
          </button>
          <button
            onClick={() => handleViewModeChange('table')}
            className="px-3 py-1.5 rounded-md transition-all flex items-center gap-2"
            style={{
              backgroundColor: viewMode === 'table' ? visualConfig.colors.primary : 'transparent',
              color: viewMode === 'table' ? visualConfig.colors.text.onPrimary : visualConfig.colors.text.secondary
            }}
          >
            <Icons.List size={16} />
            <span className="text-sm font-medium">List</span>
          </button>
          <button
            onClick={() => handleViewModeChange('calendar')}
            className="px-3 py-1.5 rounded-md transition-all flex items-center gap-2"
            style={{
              backgroundColor: viewMode === 'calendar' ? visualConfig.colors.primary : 'transparent',
              color: viewMode === 'calendar' ? visualConfig.colors.text.onPrimary : visualConfig.colors.text.secondary
            }}
          >
            <Icons.Calendar size={16} />
            <span className="text-sm font-medium">Calendar</span>
          </button>
        </div>
      </div>

      {/* Filter Panel (collapsible) */}
      {isFilterPanelOpen && (
        <div
          className="px-4 py-3 border-b"
          style={{
            backgroundColor: visualConfig.colors.surface,
            borderColor: visualConfig.colors.text.secondary + '20'
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3
              className="font-semibold"
              style={{ color: visualConfig.colors.text.primary }}
            >
              Filter Jobs
            </h3>
            {hasActiveFilters(filters) && (
              <button
                onClick={handleClearFilters}
                className="text-sm font-medium"
                style={{ color: visualConfig.colors.primary }}
              >
                Clear All
              </button>
            )}
          </div>

          <div className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
            {/* TODO: Implement filter controls - status checkboxes, date pickers, priority selectors */}
            <p>Filter controls coming soon...</p>
            <p className="mt-2 text-xs">Status, Date Range, Priority, Customer, Crew, Tags</p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div
                className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
                style={{ borderColor: visualConfig.colors.primary }}
              />
              <p style={{ color: visualConfig.colors.text.secondary }}>
                Loading jobs...
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center max-w-md">
              <Icons.AlertCircle
                className="h-16 w-16 mx-auto mb-4"
                style={{ color: visualConfig.colors.error || '#EF4444' }}
              />
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: visualConfig.colors.text.primary }}
              >
                Failed to Load Jobs
              </h2>
              <p
                className="mb-6"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                {error}
              </p>
              <button
                onClick={handleRefresh}
                className="px-6 py-3 rounded-lg font-medium"
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

        {/* Empty state - no jobs exist */}
        {showEmptyState && (
          <div className="flex items-center justify-center h-full p-4">
            <EmptyState
              variant="no_jobs"
              onAction={handleCreateJob}
              visualConfig={visualConfig}
            />
          </div>
        )}

        {/* No results state - filters active but no matches */}
        {showNoResults && (
          <div className="flex items-center justify-center h-full p-4">
            <EmptyState
              variant="no_results"
              onAction={handleClearFilters}
              visualConfig={visualConfig}
            />
          </div>
        )}

        {/* Render active view */}
        {!isLoading && !error && jobs.length > 0 && (
          <>
            {viewMode === 'kanban' && (
              <JobsKanbanView
                jobs={jobs}
                onRefresh={fetchJobs}
                visualConfig={visualConfig}
                theme={theme}
              />
            )}

            {viewMode === 'table' && (
              <JobsTableView
                jobs={jobs}
                onRefresh={fetchJobs}
                visualConfig={visualConfig}
                theme={theme}
              />
            )}

            {viewMode === 'calendar' && (
              <JobsCalendarView
                companyId={user?.company_id || ''}
                onRefresh={fetchJobs}
                visualConfig={visualConfig}
                theme={theme}
              />
            )}
          </>
        )}
      </div>

      {/* Job Creation Wizard */}
      <JobCreationWizard
        isOpen={showWizard}
        onClose={handleWizardClose}
        companyId={user?.company_id || ''}
        userId={user?.id || ''}
      />
    </div>
  );
};

export default JobsPage;
