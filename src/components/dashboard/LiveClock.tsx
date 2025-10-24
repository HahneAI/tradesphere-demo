/**
 * Live Clock Component
 *
 * Displays real-time clock that updates every minute
 * Shows time in 12-hour format with timezone (America/Chicago)
 *
 * @module LiveClock
 */

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';

interface LiveClockProps {
  visualConfig: any;
  showIcon?: boolean;
  showTimezone?: boolean;
  className?: string;
  compact?: boolean;
}

/**
 * Live Clock Component
 * Updates every minute with current time in America/Chicago timezone
 */
export const LiveClock: React.FC<LiveClockProps> = ({
  visualConfig,
  showIcon = true,
  showTimezone = true,
  className = '',
  compact = false
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  /**
   * Update time every minute
   */
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every 60 seconds

    return () => clearInterval(timer);
  }, []);

  /**
   * Format time as HH:MM AM/PM in America/Chicago timezone
   */
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Chicago'
    });
  };

  /**
   * Get timezone abbreviation for America/Chicago (CST/CDT)
   */
  const getTimezone = (): string => {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: 'America/Chicago',
      timeZoneName: 'short'
    }).split(' ').pop() || '';
  };

  // Compact version for mobile
  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {showIcon && (
          <Icons.Clock
            className="h-3.5 w-3.5"
            style={{ color: visualConfig.colors.text.secondary }}
          />
        )}
        <span
          className="text-xs font-medium tabular-nums"
          style={{ color: visualConfig.colors.text.primary }}
        >
          {formatTime(currentTime)}
        </span>
      </div>
    );
  }

  // Desktop version
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${className}`}
      style={{
        backgroundColor: `${visualConfig.colors.text.secondary}08`,
      }}
    >
      {showIcon && (
        <Icons.Clock
          className="h-4 w-4"
          style={{ color: visualConfig.colors.text.secondary }}
        />
      )}
      <span
        className="text-sm font-medium tabular-nums"
        style={{ color: visualConfig.colors.text.primary }}
      >
        {formatTime(currentTime)}
      </span>
      {showTimezone && (
        <span
          className="text-xs"
          style={{ color: visualConfig.colors.text.secondary }}
        >
          {getTimezone()}
        </span>
      )}
    </div>
  );
};

export default LiveClock;
