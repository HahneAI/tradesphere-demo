/**
 * Dashboard Header Component
 *
 * Top header for the Dashboard with branding, refresh, and last updated time
 * Includes user greeting and real-time clock
 *
 * @module DashboardHeader
 */

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hapticFeedback } from '../../utils/mobile-gestures';

interface DashboardHeaderProps {
  lastRefreshed: Date;
  onRefresh: () => void;
  isRefreshing: boolean;
  visualConfig: any;
  theme: any;
}

/**
 * Dashboard Header
 * Shows greeting, time, and refresh controls
 */
export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  lastRefreshed,
  onRefresh,
  isRefreshing,
  visualConfig,
  theme
}) => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  /**
   * Update current time every minute
   */
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  /**
   * Get greeting based on time of day
   */
  const getGreeting = (): string => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  /**
   * Format last refreshed time
   */
  const formatLastRefreshed = (): string => {
    const now = new Date();
    const diffMs = now.getTime() - lastRefreshed.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;

    return lastRefreshed.toLocaleString();
  };

  /**
   * Handle refresh click
   */
  const handleRefresh = () => {
    hapticFeedback.impact('medium');
    onRefresh();
  };

  return (
    <div
      className="border-b"
      style={{
        backgroundColor: visualConfig.colors.surface,
        borderColor: visualConfig.colors.text.secondary + '20'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between">
          {/* Left: Greeting */}
          <div>
            <h1
              className="text-2xl font-bold mb-1"
              style={{ color: visualConfig.colors.text.primary }}
            >
              {getGreeting()}, {user?.full_name?.split(' ')[0] || 'there'}!
            </h1>
            <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>

          {/* Right: Refresh */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs mb-1" style={{ color: visualConfig.colors.text.secondary }}>
                Last updated
              </p>
              <p
                className="text-sm font-medium"
                style={{ color: visualConfig.colors.text.primary }}
              >
                {formatLastRefreshed()}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-3 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: visualConfig.colors.primary + '20',
                color: visualConfig.colors.primary
              }}
              title="Refresh dashboard"
            >
              <Icons.RefreshCw
                className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          {/* Top Row: Greeting + Refresh */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <h1
                className="text-xl font-bold mb-1"
                style={{ color: visualConfig.colors.text.primary }}
              >
                {getGreeting()}!
              </h1>
              <p className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                {currentTime.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg transition-all disabled:opacity-50"
              style={{
                backgroundColor: visualConfig.colors.primary + '20',
                color: visualConfig.colors.primary
              }}
            >
              <Icons.RefreshCw
                className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>

          {/* Bottom Row: Last Updated */}
          <div
            className="text-xs flex items-center gap-1"
            style={{ color: visualConfig.colors.text.secondary }}
          >
            <Icons.Clock className="h-3 w-3" />
            Updated {formatLastRefreshed()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
