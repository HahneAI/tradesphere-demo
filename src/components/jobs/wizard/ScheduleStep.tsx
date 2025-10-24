/**
 * Schedule Step (Step 5)
 *
 * Optional crew scheduling with conflict detection.
 * Allows skipping if crews aren't available or scheduling not needed.
 */

import React, { useState, useEffect } from 'react';
import { ScheduleData } from '../../../hooks/useJobCreationWizard';
import { ConflictWarning } from './components/ConflictWarning';
import { getSupabase } from '../../../services/supabase';
import { ScheduleConflict } from '../../../types/crm';
import { jobServiceWizardExtensions } from '../../../services/JobServiceExtensions';

interface ScheduleStepProps {
  companyId: string;
  schedule: ScheduleData | null;
  onUpdate: (schedule: ScheduleData | null) => void;
}

interface Crew {
  id: string;
  crew_name: string;
  crew_code?: string;
  color_code?: string;
}

export const ScheduleStep: React.FC<ScheduleStepProps> = ({
  companyId,
  schedule,
  onUpdate,
}) => {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [isLoadingCrews, setIsLoadingCrews] = useState(true);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

  const supabase = getSupabase();

  useEffect(() => {
    loadCrews();
  }, [companyId]);

  const loadCrews = async () => {
    try {
      setIsLoadingCrews(true);
      const { data, error } = await supabase
        .from('ops_crews')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('crew_name');

      if (error) throw error;
      setCrews(data || []);
    } catch (err) {
      console.error('Error loading crews:', err);
    } finally {
      setIsLoadingCrews(false);
    }
  };

  const checkConflicts = async () => {
    if (!schedule?.crew_id || !schedule?.scheduled_start || !schedule?.scheduled_end) return;

    try {
      setIsCheckingConflicts(true);
      const result = await jobServiceWizardExtensions.checkScheduleConflicts(
        schedule.crew_id,
        schedule.scheduled_start,
        schedule.scheduled_end
      );

      if (result.success) {
        setConflicts(result.data || []);
      }
    } catch (err) {
      console.error('Error checking conflicts:', err);
    } finally {
      setIsCheckingConflicts(false);
    }
  };

  useEffect(() => {
    if (schedule?.crew_id && schedule?.scheduled_start && schedule?.scheduled_end) {
      checkConflicts();
    } else {
      setConflicts([]);
    }
  }, [schedule?.crew_id, schedule?.scheduled_start, schedule?.scheduled_end]);

  const handleSkipScheduling = () => {
    onUpdate(null);
  };

  if (isLoadingCrews) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading crews...</p>
        </div>
      </div>
    );
  }

  if (crews.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No crews available yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create crews in your operations settings to schedule jobs
          </p>
          <button
            type="button"
            onClick={handleSkipScheduling}
            className="h-10 px-6 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            Skip Scheduling & Create Job
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Schedule Crew
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Assign a crew and set schedule dates (optional)
        </p>
      </div>

      {/* Conflicts Warning */}
      {conflicts.length > 0 && (
        <ConflictWarning conflicts={conflicts} />
      )}

      {/* Crew Selection */}
      <div className="space-y-2">
        <label htmlFor="crew" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Crew
        </label>
        <select
          id="crew"
          value={schedule?.crew_id || ''}
          onChange={(e) => onUpdate(schedule ? { ...schedule, crew_id: e.target.value } : { crew_id: e.target.value, scheduled_start: '', scheduled_end: '' })}
          className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a crew...</option>
          {crews.map((crew) => (
            <option key={crew.id} value={crew.id}>
              {crew.crew_name} {crew.crew_code && `(${crew.crew_code})`}
            </option>
          ))}
        </select>
      </div>

      {/* Date Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Scheduled Start
          </label>
          <input
            id="startDate"
            type="datetime-local"
            value={schedule?.scheduled_start || ''}
            onChange={(e) => onUpdate(schedule ? { ...schedule, scheduled_start: e.target.value } : { crew_id: '', scheduled_start: e.target.value, scheduled_end: '' })}
            className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Scheduled End
          </label>
          <input
            id="endDate"
            type="datetime-local"
            value={schedule?.scheduled_end || ''}
            onChange={(e) => onUpdate(schedule ? { ...schedule, scheduled_end: e.target.value } : { crew_id: '', scheduled_start: '', scheduled_end: e.target.value })}
            className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Estimated Hours */}
      <div className="space-y-2">
        <label htmlFor="estimatedHours" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Estimated Hours
        </label>
        <input
          id="estimatedHours"
          type="number"
          min="0"
          step="0.5"
          value={schedule?.estimated_hours || ''}
          onChange={(e) => onUpdate(schedule ? { ...schedule, estimated_hours: parseFloat(e.target.value) } : { crew_id: '', scheduled_start: '', scheduled_end: '', estimated_hours: parseFloat(e.target.value) })}
          placeholder="e.g., 8"
          className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Assignment Notes
        </label>
        <textarea
          id="notes"
          value={schedule?.assignment_notes || ''}
          onChange={(e) => onUpdate(schedule ? { ...schedule, assignment_notes: e.target.value } : { crew_id: '', scheduled_start: '', scheduled_end: '', assignment_notes: e.target.value })}
          placeholder="Any special instructions for the crew..."
          rows={3}
          className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Skip Scheduling Option */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <button
          type="button"
          onClick={handleSkipScheduling}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline"
        >
          Skip scheduling and create job without crew assignment
        </button>
      </div>
    </div>
  );
};
