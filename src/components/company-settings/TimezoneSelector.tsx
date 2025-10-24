/**
 * Timezone Selector Component
 *
 * Dropdown selector for company timezone setting
 * Updates companies table and affects all time displays in the application
 *
 * @module TimezoneSelector
 */

import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { getSupabase } from '../../services/supabase';
import { hapticFeedback } from '../../utils/mobile-gestures';

interface TimezoneSelectorProps {
  currentTimezone: string;
  companyId: string;
  visualConfig: any;
  onTimezoneChange: (timezone: string) => void;
}

/**
 * Common US Timezones
 */
const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)', offset: 'UTC-5/-4' },
  { value: 'America/Chicago', label: 'Central Time (CT)', offset: 'UTC-6/-5' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', offset: 'UTC-7/-6' },
  { value: 'America/Phoenix', label: 'Arizona (MST - no DST)', offset: 'UTC-7' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: 'UTC-8/-7' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)', offset: 'UTC-9/-8' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)', offset: 'UTC-10' },
];

/**
 * Timezone Selector Component
 * Allows owners to set company-wide timezone
 */
export const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({
  currentTimezone,
  companyId,
  visualConfig,
  onTimezoneChange
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * Handle timezone change
   */
  const handleTimezoneChange = async (newTimezone: string) => {
    if (newTimezone === currentTimezone) return;

    setIsUpdating(true);
    setError(null);
    setSuccess(false);
    hapticFeedback.impact('medium');

    try {
      const supabase = getSupabase();

      // Update companies table
      const { error: updateError } = await supabase
        .from('companies')
        .update({ timezone: newTimezone })
        .eq('id', companyId);

      if (updateError) {
        throw updateError;
      }

      // Success!
      setSuccess(true);
      hapticFeedback.notification('success');
      onTimezoneChange(newTimezone);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (err: any) {
      console.error('[TimezoneSelector] Error updating timezone:', err);
      setError(err.message || 'Failed to update timezone');
      hapticFeedback.notification('error');
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Get display label for current timezone
   */
  const getCurrentLabel = (): string => {
    const tz = COMMON_TIMEZONES.find(t => t.value === currentTimezone);
    return tz ? `${tz.label} (${tz.offset})` : currentTimezone;
  };

  return (
    <div className="space-y-3">
      {/* Label */}
      <label
        className="block text-sm font-medium"
        style={{ color: visualConfig.colors.text.primary }}
      >
        Company Timezone
      </label>

      {/* Selector */}
      <div className="relative">
        <select
          value={currentTimezone}
          onChange={(e) => handleTimezoneChange(e.target.value)}
          disabled={isUpdating}
          className="w-full px-4 py-3 pr-10 rounded-lg border transition-all duration-200 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: visualConfig.colors.surface,
            borderColor: visualConfig.colors.text.secondary + '40',
            color: visualConfig.colors.text.primary,
          }}
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label} ({tz.offset})
            </option>
          ))}
        </select>

        {/* Dropdown Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isUpdating ? (
            <Icons.Loader2
              className="h-5 w-5 animate-spin"
              style={{ color: visualConfig.colors.text.secondary }}
            />
          ) : (
            <Icons.ChevronDown
              className="h-5 w-5"
              style={{ color: visualConfig.colors.text.secondary }}
            />
          )}
        </div>
      </div>

      {/* Helper Text */}
      <p className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
        This timezone will be used for all time displays in the application, including the dashboard clock, job scheduling, and timestamps.
      </p>

      {/* Success Message */}
      {success && (
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            backgroundColor: '#10B98120',
            color: '#10B981',
          }}
        >
          <Icons.CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">Timezone updated successfully!</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg"
          style={{
            backgroundColor: '#EF444420',
            color: '#EF4444',
          }}
        >
          <Icons.AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}
    </div>
  );
};

export default TimezoneSelector;
