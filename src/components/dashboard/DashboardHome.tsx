/**
 * Dashboard Home Screen - Main CRM Dashboard
 *
 * Replaces ChatInterface as the primary home screen.
 * Displays KPIs, recent activity, upcoming jobs, and quick actions.
 *
 * Features:
 * - Real-time KPI metrics with trend indicators
 * - Activity feed with 30s polling
 * - Upcoming jobs list with expand/collapse
 * - Quick action navigation buttons
 * - Mobile-responsive with bottom nav
 *
 * @module DashboardHome
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../../config/industry';
import { dashboardService } from '../../services/DashboardService';
import { getSupabase } from '../../services/supabase';
import { DashboardMetrics } from '../../types/crm';
import { hapticFeedback, isMobileDevice } from '../../utils/mobile-gestures';
import { KPIGrid } from './KPIGrid';
import { RecentActivityFeed } from './RecentActivityFeed';
import { UpcomingJobsList } from './UpcomingJobsList';
import { QuickActionsPanel } from './QuickActionsPanel';
import { DashboardHeader } from './DashboardHeader';
import { BottomNav } from './BottomNav';
import { HeaderMenu } from './HeaderMenu';

interface DashboardHomeProps {
  onNavigate: (tab: 'jobs' | 'schedule' | 'crews' | 'customers' | 'billing') => void;
  onChatClick: () => void;
  onCompanySettingsClick: () => void;
  onServicesClick: () => void;
  onMaterialsClick: () => void;
  onQuickCalculatorClick: () => void;
  onAvatarClick: () => void;
  onNotesClick: () => void;
  onFeedbackClick: () => void;
}

/**
 * Main Dashboard Home component
 * Primary screen for CRM system
 */
export const DashboardHome: React.FC<DashboardHomeProps> = ({
  onNavigate,
  onChatClick,
  onCompanySettingsClick,
  onServicesClick,
  onMaterialsClick,
  onQuickCalculatorClick,
  onAvatarClick,
  onNotesClick,
  onFeedbackClick
}) => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);
  const isMobile = isMobileDevice();

  // State management
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [companyTimezone, setCompanyTimezone] = useState<string>('America/Chicago');

  // Polling ref
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch dashboard metrics
   */
  const fetchMetrics = useCallback(async (showLoading = true) => {
    if (!user?.company_id) return;

    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await dashboardService.getDashboardMetrics(user.company_id);

      if (!response.success) {
        setError(response.error || 'Failed to load dashboard metrics');
        return;
      }

      setMetrics(response.data!);
      setLastRefreshed(new Date());

      if (!showLoading) {
        // Silent refresh - show success haptic
        hapticFeedback.impact('light');
      }

    } catch (err: any) {
      console.error('[DashboardHome] Error fetching metrics:', err);
      setError('Failed to load dashboard data');
      hapticFeedback.notification('error');
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [user?.company_id]);

  /**
   * Load company timezone from database
   */
  useEffect(() => {
    const loadTimezone = async () => {
      if (!user?.company_id) return;

      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('companies')
          .select('timezone')
          .eq('id', user.company_id)
          .single();

        if (!error && data?.timezone) {
          setCompanyTimezone(data.timezone);
        }
      } catch (err) {
        console.error('[DashboardHome] Error loading timezone:', err);
        // Keep default timezone on error
      }
    };

    loadTimezone();
  }, [user?.company_id]);

  /**
   * Setup polling for real-time updates
   * Polls activity feed every 30 seconds
   */
  useEffect(() => {
    // Initial load
    fetchMetrics(true);

    // Setup polling (30s interval)
    pollingIntervalRef.current = setInterval(() => {
      fetchMetrics(false); // Silent refresh
    }, 30000);

    // Cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchMetrics]);

  /**
   * Handle manual refresh
   */
  const handleRefresh = useCallback(async () => {
    hapticFeedback.impact('medium');
    await fetchMetrics(true);
  }, [fetchMetrics]);

  /**
   * Handle KPI card click - navigate to filtered view
   */
  const handleKPIClick = useCallback((filterType: string) => {
    hapticFeedback.selection();
    // Navigate to jobs tab with filter
    onNavigate('jobs');
    // TODO: Pass filter context to JobsTab
  }, [onNavigate]);

  /**
   * Handle menu toggle
   */
  const handleMenuToggle = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  /**
   * Handle menu close
   */
  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  /**
   * Handle sign out
   */
  const handleSignOut = useCallback(async () => {
    hapticFeedback.impact('medium');
    await signOut();
  }, [signOut]);

  // Loading state
  if (isLoading && !metrics) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: visualConfig.colors.background }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4 mx-auto"
               style={{ borderColor: visualConfig.colors.primary }} />
          <p className="font-medium" style={{ color: visualConfig.colors.text.secondary }}>
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !metrics) {
    return (
      <div
        className="flex items-center justify-center min-h-screen p-4"
        style={{ backgroundColor: visualConfig.colors.background }}
      >
        <div className="text-center max-w-md">
          <Icons.AlertCircle
            className="h-16 w-16 mx-auto mb-4"
            style={{ color: visualConfig.colors.error || '#EF4444' }}
          />
          <h2 className="text-xl font-bold mb-2" style={{ color: visualConfig.colors.text.primary }}>
            Failed to Load Dashboard
          </h2>
          <p className="mb-6" style={{ color: visualConfig.colors.text.secondary }}>
            {error}
          </p>
          <button
            onClick={handleRefresh}
            className="px-6 py-3 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: visualConfig.colors.primary,
              color: visualConfig.colors.text.onPrimary
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: visualConfig.colors.background }}
    >
      {/* Header Menu */}
      <HeaderMenu
        isOpen={isMenuOpen}
        onClose={handleMenuClose}
        onNavigate={(tab) => {
          onNavigate(tab);
          handleMenuClose();
        }}
        onChatClick={() => {
          onChatClick();
          handleMenuClose();
        }}
        onCompanySettingsClick={() => {
          onCompanySettingsClick();
          handleMenuClose();
        }}
        onServicesClick={onServicesClick}
        onMaterialsClick={onMaterialsClick}
        onQuickCalculatorClick={onQuickCalculatorClick}
        onAvatarClick={onAvatarClick}
        onNotesClick={onNotesClick}
        onFeedbackClick={onFeedbackClick}
        onSignOut={handleSignOut}
        visualConfig={visualConfig}
        theme={theme}
        user={user}
      />

      {/* Header */}
      <DashboardHeader
        lastRefreshed={lastRefreshed}
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
        visualConfig={visualConfig}
        theme={theme}
        timezone={companyTimezone}
        onMenuToggle={handleMenuToggle}
        onThemeToggle={toggleTheme}
        isMenuOpen={isMenuOpen}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-20 md:pb-6">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

          {/* Quick Actions Panel */}
          <QuickActionsPanel
            onNavigate={onNavigate}
            visualConfig={visualConfig}
            theme={theme}
          />

          {/* Visual Separator */}
          <div
            className="relative h-px"
            style={{
              background: theme === 'light'
                ? `linear-gradient(to right, transparent, ${visualConfig.colors.text.secondary}20, transparent)`
                : `linear-gradient(to right, transparent, ${visualConfig.colors.text.secondary}30, transparent)`
            }}
          >
            {/* Optional decorative dot in center */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: visualConfig.colors.primary,
                opacity: 0.6
              }}
            />
          </div>

          {/* KPI Grid */}
          {metrics && (
            <KPIGrid
              metrics={metrics}
              onKPIClick={handleKPIClick}
              visualConfig={visualConfig}
              theme={theme}
            />
          )}

          {/* Two-column layout on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Recent Activity Feed */}
            <div>
              <RecentActivityFeed
                companyId={user?.company_id || ''}
                visualConfig={visualConfig}
                theme={theme}
                onActivityClick={(activity) => {
                  hapticFeedback.selection();
                  // Navigate based on activity type
                  if (activity.type === 'job_created' || activity.type === 'status_change') {
                    onNavigate('jobs');
                  }
                }}
              />
            </div>

            {/* Upcoming Jobs */}
            <div>
              <UpcomingJobsList
                companyId={user?.company_id || ''}
                visualConfig={visualConfig}
                theme={theme}
                onJobClick={(jobId) => {
                  hapticFeedback.selection();
                  // Navigate to job detail
                  onNavigate('jobs');
                  // TODO: Pass job ID to JobsTab for detail modal
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <BottomNav
          currentTab="dashboard"
          onNavigate={onNavigate}
          visualConfig={visualConfig}
          theme={theme}
        />
      )}
    </div>
  );
};

export default DashboardHome;
