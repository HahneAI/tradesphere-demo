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
import { LiveClock } from './LiveClock';

interface DashboardHeaderProps {
  lastRefreshed: Date;
  onRefresh: () => void;
  isRefreshing: boolean;
  visualConfig: any;
  theme: any;
  onMenuToggle: () => void;
  onThemeToggle: () => void;
  isMenuOpen?: boolean;
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
  theme,
  onMenuToggle,
  onThemeToggle,
  isMenuOpen = false
}) => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  /**
   * Update current time every minute (for greeting and date)
   */
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  /**
   * Get user's first name
   */
  const getUserFirstName = (): string => {
    const name = user?.name || user?.full_name;
    if (!name) return 'there';
    return name.split(' ')[0];
  };

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

  /**
   * Handle menu toggle
   */
  const handleMenuToggle = () => {
    hapticFeedback.impact('light');
    onMenuToggle();
  };

  /**
   * Handle theme toggle
   */
  const handleThemeToggle = () => {
    hapticFeedback.impact('light');
    onThemeToggle();
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
        <div className="hidden md:flex items-center justify-between gap-4">
          {/* Left: Menu + Greeting */}
          <div className="flex items-center gap-4">
            {/* Hamburger Menu Button */}
            <button
              onClick={handleMenuToggle}
              className="p-2.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                backgroundColor: `${visualConfig.colors.text.secondary}10`,
                color: visualConfig.colors.text.primary,
              }}
              aria-label="Open navigation menu"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? (
                <Icons.X className="h-5 w-5" />
              ) : (
                <Icons.Menu className="h-5 w-5" />
              )}
            </button>

            {/* Greeting */}
            <div>
              <h1
                className="text-2xl font-bold mb-1"
                style={{ color: visualConfig.colors.text.primary }}
              >
                {getGreeting()}, {getUserFirstName()}!
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
          </div>

          {/* Right: Clock + Theme + Refresh */}
          <div className="flex items-center gap-3">
            {/* Live Clock */}
            <LiveClock
              visualConfig={visualConfig}
              showIcon={true}
              showTimezone={true}
            />

            {/* Theme Toggle Button */}
            <button
              onClick={handleThemeToggle}
              className="p-2.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                backgroundColor: `${visualConfig.colors.primary}15`,
                color: visualConfig.colors.primary,
              }}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <Icons.Moon className="h-5 w-5 transition-transform duration-500" />
              ) : (
                <Icons.Sun className="h-5 w-5 transition-transform duration-500 rotate-180" />
              )}
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: visualConfig.colors.primary + '15',
                color: visualConfig.colors.primary,
              }}
              title={`Last updated ${formatLastRefreshed()}`}
              aria-label="Refresh dashboard"
            >
              <Icons.RefreshCw
                className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          {/* Top Row: Menu + Greeting + Refresh */}
          <div className="flex items-center justify-between mb-3">
            {/* Left: Menu + Greeting */}
            <div className="flex items-center gap-3">
              {/* Hamburger Menu Button */}
              <button
                onClick={handleMenuToggle}
                className="p-2 rounded-lg transition-all"
                style={{
                  backgroundColor: `${visualConfig.colors.text.secondary}10`,
                  color: visualConfig.colors.text.primary,
                }}
                aria-label="Open navigation menu"
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? (
                  <Icons.X className="h-5 w-5" />
                ) : (
                  <Icons.Menu className="h-5 w-5" />
                )}
              </button>

              {/* Greeting */}
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
            </div>

            {/* Right: Refresh */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg transition-all disabled:opacity-50"
              style={{
                backgroundColor: visualConfig.colors.primary + '15',
                color: visualConfig.colors.primary
              }}
              aria-label="Refresh dashboard"
            >
              <Icons.RefreshCw
                className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>

          {/* Bottom Row: Clock + Theme + Last Updated */}
          <div className="flex items-center justify-between text-xs">
            {/* Left: Clock + Theme */}
            <div className="flex items-center gap-2">
              {/* Live Clock */}
              <LiveClock
                visualConfig={visualConfig}
                showIcon={true}
                showTimezone={false}
                compact={true}
              />

              {/* Theme Toggle Button */}
              <button
                onClick={handleThemeToggle}
                className="p-1.5 rounded transition-all"
                style={{
                  backgroundColor: `${visualConfig.colors.primary}10`,
                  color: visualConfig.colors.primary,
                }}
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? (
                  <Icons.Moon className="h-3.5 w-3.5" />
                ) : (
                  <Icons.Sun className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Right: Last Updated */}
            <span style={{ color: visualConfig.colors.text.secondary }}>
              Updated {formatLastRefreshed()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
