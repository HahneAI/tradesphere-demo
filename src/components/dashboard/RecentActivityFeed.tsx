/**
 * Recent Activity Feed Component
 *
 * Displays chronological feed of recent activities (jobs created, status changes, etc.)
 * Polls every 30 seconds for real-time updates
 *
 * @module RecentActivityFeed
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as Icons from 'lucide-react';
import { dashboardService } from '../../services/DashboardService';
import { hapticFeedback } from '../../utils/mobile-gestures';

interface Activity {
  id: string;
  type: 'job_created' | 'status_change' | 'assignment_created' | 'note_added';
  title: string;
  description: string;
  timestamp: string;
  metadata: any;
}

interface RecentActivityFeedProps {
  companyId: string;
  visualConfig: any;
  theme: any;
  onActivityClick?: (activity: Activity) => void;
}

/**
 * Recent Activity Feed
 * Shows last 10 activities with auto-refresh
 */
export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({
  companyId,
  visualConfig,
  theme,
  onActivityClick
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch recent activities
   */
  const fetchActivities = useCallback(async (showLoading = true) => {
    if (!companyId) return;

    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await dashboardService.getRecentActivity(companyId, 10);

      if (!response.success) {
        setError(response.error || 'Failed to load activity feed');
        return;
      }

      setActivities(response.data || []);

    } catch (err: any) {
      console.error('[RecentActivityFeed] Error fetching activities:', err);
      setError('Failed to load activity feed');
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [companyId]);

  /**
   * Setup polling for real-time updates
   */
  useEffect(() => {
    fetchActivities(true);

    // Poll every 30 seconds
    pollingIntervalRef.current = setInterval(() => {
      fetchActivities(false); // Silent refresh
    }, 30000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchActivities]);

  /**
   * Toggle expansion
   */
  const handleToggle = useCallback(() => {
    hapticFeedback.selection();
    setIsExpanded(prev => !prev);
  }, []);

  /**
   * Handle activity click
   */
  const handleActivityClick = useCallback((activity: Activity) => {
    hapticFeedback.selection();
    onActivityClick?.(activity);
  }, [onActivityClick]);

  /**
   * Get icon for activity type
   */
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'job_created':
        return Icons.FileText;
      case 'status_change':
        return Icons.RefreshCw;
      case 'assignment_created':
        return Icons.Users;
      case 'note_added':
        return Icons.MessageSquare;
      default:
        return Icons.Activity;
    }
  };

  /**
   * Format relative time
   */
  const formatRelativeTime = (timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return then.toLocaleDateString();
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
          <Icons.Activity
            className="h-5 w-5"
            style={{ color: visualConfig.colors.primary }}
          />
          <h3 className="font-semibold" style={{ color: visualConfig.colors.text.primary }}>
            Recent Activity
          </h3>
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
          {isLoading && activities.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2"
                style={{ borderColor: visualConfig.colors.primary }}
              />
            </div>
          )}

          {/* Error State */}
          {error && !activities.length && (
            <div className="text-center py-8">
              <Icons.AlertCircle
                className="h-12 w-12 mx-auto mb-3"
                style={{ color: visualConfig.colors.error || '#EF4444' }}
              />
              <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                {error}
              </p>
              <button
                onClick={() => fetchActivities(true)}
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

          {/* Activity List */}
          {!isLoading && !error && activities.length === 0 && (
            <div className="text-center py-8">
              <Icons.Inbox
                className="h-12 w-12 mx-auto mb-3"
                style={{ color: visualConfig.colors.text.secondary }}
              />
              <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                No recent activity
              </p>
            </div>
          )}

          {activities.length > 0 && (
            <div className="space-y-3">
              {activities.map((activity) => {
                const IconComponent = getActivityIcon(activity.type);
                return (
                  <div
                    key={activity.id}
                    onClick={() => handleActivityClick(activity)}
                    className="flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer hover:bg-opacity-50"
                    style={{
                      backgroundColor: visualConfig.colors.background,
                      ':hover': {
                        backgroundColor: visualConfig.colors.primary + '10'
                      }
                    }}
                  >
                    <div
                      className="p-2 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: visualConfig.colors.primary + '20' }}
                    >
                      <IconComponent
                        className="h-4 w-4"
                        style={{ color: visualConfig.colors.primary }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-medium text-sm mb-1"
                        style={{ color: visualConfig.colors.text.primary }}
                      >
                        {activity.title}
                      </p>
                      <p
                        className="text-xs mb-1 line-clamp-2"
                        style={{ color: visualConfig.colors.text.secondary }}
                      >
                        {activity.description}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: visualConfig.colors.text.secondary }}
                      >
                        {formatRelativeTime(activity.timestamp)}
                      </p>
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

export default RecentActivityFeed;
