/**
 * ConflictPanel Component
 *
 * Detailed panel showing all scheduling conflicts
 * Displays conflicts grouped by crew with resolution actions
 *
 * @module ConflictPanel
 */

import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import * as Icons from 'lucide-react';
import {
  ScheduleConflict,
  ConflictDetectionResult,
  ConflictSeverity
} from '../../../utils/conflictDetection';
import { formatDate } from '../../../types/jobs-views';

export interface ConflictPanelProps {
  isOpen: boolean;
  onClose: () => void;
  conflictResult: ConflictDetectionResult;
  onJobClick?: (jobId: string) => void;
  visualConfig: any;
  theme: 'light' | 'dark';
}

/**
 * Panel component showing detailed conflict information
 * Groups conflicts by crew and provides quick actions
 */
export const ConflictPanel: React.FC<ConflictPanelProps> = ({
  isOpen,
  onClose,
  conflictResult,
  onJobClick,
  visualConfig,
  theme
}) => {
  // Group conflicts by crew
  const conflictsByCrew = useMemo(() => {
    const grouped = new Map<string, ScheduleConflict[]>();

    conflictResult.conflicts.forEach(conflict => {
      if (!grouped.has(conflict.crewId)) {
        grouped.set(conflict.crewId, []);
      }
      grouped.get(conflict.crewId)!.push(conflict);
    });

    return grouped;
  }, [conflictResult]);

  if (!isOpen) {
    return null;
  }

  const getSeverityIcon = (severity: ConflictSeverity) => {
    return severity === 'error' ? Icons.AlertCircle : Icons.AlertTriangle;
  };

  const getSeverityColor = (severity: ConflictSeverity) => {
    return severity === 'error' ? '#EF4444' : '#F59E0B';
  };

  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case 'full-overlap':
        return 'Full Overlap';
      case 'partial-overlap':
        return 'Partial Overlap';
      case 'same-day-double':
        return 'Same-Day Double Booking';
      case 'back-to-back':
        return 'Back-to-Back';
      default:
        return 'Unknown';
    }
  };

  const handleJobClick = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onJobClick) {
      onJobClick(jobId);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[80vh] rounded-lg shadow-2xl overflow-hidden"
        style={{
          backgroundColor: visualConfig.colors.background,
          animation: 'modalSlideIn 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: visualConfig.colors.text.secondary + '20' }}
        >
          <div className="flex items-center gap-3">
            <Icons.AlertCircle size={24} style={{ color: '#EF4444' }} />
            <div>
              <h2
                className="text-xl font-bold"
                style={{ color: visualConfig.colors.text.primary }}
              >
                Scheduling Conflicts
              </h2>
              <p
                className="text-sm mt-1"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                {conflictResult.totalConflicts} conflict{conflictResult.totalConflicts !== 1 ? 's' : ''} detected
                {conflictResult.errorCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#EF4444' + '20', color: '#EF4444' }}>
                    {conflictResult.errorCount} error{conflictResult.errorCount !== 1 ? 's' : ''}
                  </span>
                )}
                {conflictResult.warningCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#F59E0B' + '20', color: '#F59E0B' }}>
                    {conflictResult.warningCount} warning{conflictResult.warningCount !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            style={{ color: visualConfig.colors.text.secondary }}
          >
            <Icons.X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-6">
          {conflictResult.totalConflicts === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Icons.CheckCircle size={64} style={{ color: '#10B981' }} className="mb-4" />
              <p className="text-lg font-medium" style={{ color: visualConfig.colors.text.primary }}>
                No conflicts detected
              </p>
              <p className="text-sm mt-2" style={{ color: visualConfig.colors.text.secondary }}>
                All jobs are scheduled without overlaps
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(conflictsByCrew.entries()).map(([crewId, conflicts]) => (
                <div
                  key={crewId}
                  className="rounded-lg border p-4"
                  style={{
                    borderColor: visualConfig.colors.text.secondary + '20',
                    backgroundColor: visualConfig.colors.surface
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Icons.Users size={18} style={{ color: visualConfig.colors.text.secondary }} />
                    <h3 className="font-semibold" style={{ color: visualConfig.colors.text.primary }}>
                      Crew Conflicts
                    </h3>
                    <span
                      className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: '#EF4444' + '20',
                        color: '#EF4444'
                      }}
                    >
                      {conflicts.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {conflicts.map((conflict, index) => {
                      const SeverityIcon = getSeverityIcon(conflict.severity);
                      const severityColor = getSeverityColor(conflict.severity);

                      return (
                        <div
                          key={`${conflict.job1.job_id}-${conflict.job2.job_id}-${index}`}
                          className="rounded-lg border p-4"
                          style={{
                            borderColor: severityColor + '40',
                            backgroundColor: visualConfig.colors.background
                          }}
                        >
                          {/* Conflict Header */}
                          <div className="flex items-start gap-3 mb-3">
                            <SeverityIcon size={20} style={{ color: severityColor }} className="mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className="px-2 py-0.5 rounded text-xs font-medium"
                                  style={{
                                    backgroundColor: severityColor + '20',
                                    color: severityColor
                                  }}
                                >
                                  {getConflictTypeLabel(conflict.type)}
                                </span>
                                {conflict.overlapDays > 0 && (
                                  <span
                                    className="text-xs"
                                    style={{ color: visualConfig.colors.text.secondary }}
                                  >
                                    {conflict.overlapDays} day{conflict.overlapDays > 1 ? 's' : ''} overlap
                                  </span>
                                )}
                              </div>
                              <p
                                className="text-sm font-medium"
                                style={{ color: visualConfig.colors.text.primary }}
                              >
                                {conflict.message}
                              </p>
                            </div>
                          </div>

                          {/* Job Cards */}
                          <div className="grid grid-cols-2 gap-3 mt-4">
                            {[conflict.job1, conflict.job2].map((job) => (
                              <div
                                key={job.job_id}
                                onClick={(e) => handleJobClick(job.job_id, e)}
                                className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                                style={{
                                  borderColor: visualConfig.colors.text.secondary + '20',
                                  backgroundColor: visualConfig.colors.surface
                                }}
                              >
                                <div
                                  className="font-bold text-sm mb-1"
                                  style={{ color: visualConfig.colors.text.primary }}
                                >
                                  {job.job_number}
                                </div>
                                <div
                                  className="text-xs mb-2 line-clamp-1"
                                  style={{ color: visualConfig.colors.text.secondary }}
                                >
                                  {job.customer_name}
                                </div>
                                <div
                                  className="text-xs mb-1"
                                  style={{ color: visualConfig.colors.text.primary }}
                                >
                                  {job.job_title}
                                </div>
                                <div
                                  className="text-xs mt-2 pt-2 border-t"
                                  style={{
                                    borderColor: visualConfig.colors.text.secondary + '20',
                                    color: visualConfig.colors.text.secondary
                                  }}
                                >
                                  {formatDate(new Date(job.scheduled_start))} - {formatDate(new Date(job.scheduled_end))}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: visualConfig.colors.text.secondary + '20' }}>
                            <button
                              onClick={(e) => handleJobClick(conflict.job1.job_id, e)}
                              className="text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              style={{
                                borderColor: visualConfig.colors.text.secondary + '40',
                                color: visualConfig.colors.text.primary
                              }}
                            >
                              View {conflict.job1.job_number}
                            </button>
                            <button
                              onClick={(e) => handleJobClick(conflict.job2.job_id, e)}
                              className="text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              style={{
                                borderColor: visualConfig.colors.text.secondary + '40',
                                color: visualConfig.colors.text.primary
                              }}
                            >
                              View {conflict.job2.job_number}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 p-6 border-t"
          style={{ borderColor: visualConfig.colors.text.secondary + '20' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            style={{ color: visualConfig.colors.text.primary }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ConflictPanel;
