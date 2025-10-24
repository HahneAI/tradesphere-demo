/**
 * Job Activity Tab
 *
 * Displays audit trail of all job changes and events
 * Shows status changes, edits, and system events in timeline format
 *
 * @module ActivityTab
 */

import React, { useState, useEffect, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { jobNotesService } from '../../../../services/JobNotesService';
import { formatDate } from '../../../../utils/formatting';

interface ActivityTabProps {
  jobId: string;
  companyId: string;
  visualConfig: any;
  theme: any;
}

interface ActivityEvent {
  id: string;
  subject: string;
  content: string;
  note_type: string;
  created_at: string;
  created_by?: {
    name: string;
  };
}

/**
 * Activity Tab Component
 * Displays chronological audit trail
 */
export const ActivityTab: React.FC<ActivityTabProps> = ({
  jobId,
  companyId,
  visualConfig,
  theme
}) => {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch activity log
   */
  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all notes (which includes status changes and other events)
      const notes = await jobNotesService.getJobNotes(jobId);
      setActivities(notes);
    } catch (err) {
      console.error('[ActivityTab] Error fetching activities:', err);
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  /**
   * Load activities on mount
   */
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  /**
   * Get icon for activity type
   */
  const getActivityIcon = (noteType: string) => {
    switch (noteType) {
      case 'status_change':
        return Icons.RefreshCw;
      case 'schedule_change':
        return Icons.Calendar;
      case 'customer_communication':
        return Icons.Mail;
      case 'ai_insight':
        return Icons.Bot;
      default:
        return Icons.FileText;
    }
  };

  /**
   * Get icon color for activity type
   */
  const getActivityColor = (noteType: string) => {
    switch (noteType) {
      case 'status_change':
        return '#3B82F6';
      case 'schedule_change':
        return '#8B5CF6';
      case 'customer_communication':
        return '#10B981';
      case 'ai_insight':
        return visualConfig.colors.primary;
      default:
        return visualConfig.colors.text.secondary;
    }
  };

  return (
    <div className="space-y-6">
      <h3
        className="text-lg font-semibold"
        style={{ color: visualConfig.colors.text.primary }}
      >
        Activity Timeline
      </h3>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2"
            style={{ borderColor: visualConfig.colors.primary }}
          />
          <p style={{ color: visualConfig.colors.text.secondary }}>
            Loading activity...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && activities.length === 0 && (
        <div
          className="text-center py-12 rounded-lg"
          style={{ backgroundColor: visualConfig.colors.surface }}
        >
          <Icons.Activity
            className="h-12 w-12 mx-auto mb-4"
            style={{ color: visualConfig.colors.text.secondary }}
          />
          <p
            className="text-lg font-medium mb-2"
            style={{ color: visualConfig.colors.text.primary }}
          >
            No Activity Yet
          </p>
          <p
            className="text-sm"
            style={{ color: visualConfig.colors.text.secondary }}
          >
            Activity will appear here as changes are made
          </p>
        </div>
      )}

      {/* Activity Timeline */}
      {!isLoading && activities.length > 0 && (
        <div className="relative">
          {/* Timeline line */}
          <div
            className="absolute left-4 top-0 bottom-0 w-0.5"
            style={{ backgroundColor: visualConfig.colors.text.secondary + '20' }}
          />

          {/* Activity items */}
          <div className="space-y-6">
            {activities.map((activity, index) => {
              const IconComponent = getActivityIcon(activity.note_type);
              const iconColor = getActivityColor(activity.note_type);

              return (
                <div key={activity.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div
                    className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: visualConfig.colors.background,
                      border: `2px solid ${iconColor}`
                    }}
                  >
                    <IconComponent size={14} style={{ color: iconColor }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: visualConfig.colors.surface }}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <h4
                          className="font-medium"
                          style={{ color: visualConfig.colors.text.primary }}
                        >
                          {activity.subject}
                        </h4>
                        <span
                          className="text-xs"
                          style={{ color: visualConfig.colors.text.secondary }}
                        >
                          {formatDate(activity.created_at)}
                        </span>
                      </div>

                      {/* Content */}
                      <p
                        className="text-sm mb-2"
                        style={{ color: visualConfig.colors.text.primary }}
                      >
                        {activity.content}
                      </p>

                      {/* Footer */}
                      <div
                        className="text-xs flex items-center gap-2"
                        style={{ color: visualConfig.colors.text.secondary }}
                      >
                        <Icons.User size={12} />
                        <span>{activity.created_by?.name || 'System'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityTab;
