/**
 * Toolbar Component
 *
 * Provides filtering and actions for the scheduling calendar.
 *
 * Features:
 * - Status filter (multi-select dropdown)
 * - Priority filter (discrete buttons: Low, Normal, High, Urgent)
 * - Show Conflicts toggle
 * - Export/Print buttons (placeholder)
 *
 * @module Toolbar
 */

import React, { useState, useRef, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { SmartVisualThemeConfig } from '../../../config/industry';
import { hapticFeedback } from '../../../utils/mobile-gestures';

export type JobStatus = 'quote' | 'scheduled' | 'in_progress' | 'completed';
export type PriorityLevel = 'low' | 'normal' | 'high' | 'urgent';

export interface ToolbarProps {
  selectedStatuses: JobStatus[];
  onStatusChange: (statuses: JobStatus[]) => void;
  selectedPriority: PriorityLevel[];
  onPriorityChange: (priorities: PriorityLevel[]) => void;
  showConflicts: boolean;
  onToggleConflicts: () => void;
  conflictCount: number;
  filteredJobCount: number;
  totalJobCount: number;
  visualConfig: SmartVisualThemeConfig;
  theme: string;
}

const STATUS_OPTIONS: { value: JobStatus; label: string; color: string }[] = [
  { value: 'quote', label: 'Quote', color: '#94A3B8' },
  { value: 'scheduled', label: 'Scheduled', color: '#8B5CF6' },
  { value: 'in_progress', label: 'In Progress', color: '#F59E0B' },
  { value: 'completed', label: 'Completed', color: '#10B981' }
];

const PRIORITY_OPTIONS: { value: PriorityLevel; label: string; range: string }[] = [
  { value: 'low', label: 'Low', range: '0-4' },
  { value: 'normal', label: 'Normal', range: '5-7' },
  { value: 'high', label: 'High', range: '8-9' },
  { value: 'urgent', label: 'Urgent', range: '10' }
];

/**
 * Toolbar Component
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  selectedStatuses,
  onStatusChange,
  selectedPriority,
  onPriorityChange,
  showConflicts,
  onToggleConflicts,
  conflictCount,
  filteredJobCount,
  totalJobCount,
  visualConfig,
  theme
}) => {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside for status dropdown
  useEffect(() => {
    if (!statusDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [statusDropdownOpen]);

  // Status filter handlers
  const handleStatusToggle = (status: JobStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter(s => s !== status));
    } else {
      onStatusChange([...selectedStatuses, status]);
    }
    hapticFeedback.impact('light');
  };

  const handleSelectAllStatuses = () => {
    onStatusChange(STATUS_OPTIONS.map(opt => opt.value));
    hapticFeedback.impact('light');
  };

  const handleClearAllStatuses = () => {
    onStatusChange([]);
    hapticFeedback.impact('light');
  };

  // Priority filter handlers
  const handlePriorityToggle = (priority: PriorityLevel) => {
    if (selectedPriority.includes(priority)) {
      onPriorityChange(selectedPriority.filter(p => p !== priority));
    } else {
      onPriorityChange([...selectedPriority, priority]);
    }
    hapticFeedback.impact('light');
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minHeight: '56px',
        padding: '12px 16px',
        backgroundColor: visualConfig.colors.surface,
        borderBottom: `1px solid ${visualConfig.colors.text.secondary}20`,
        flexWrap: 'wrap'
      }}
      role="toolbar"
      aria-label="Calendar filters and actions"
    >
      {/* Status Filter */}
      <div ref={statusDropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '36px',
            padding: '8px 12px',
            backgroundColor: statusDropdownOpen
              ? `${visualConfig.colors.primary}1A`
              : visualConfig.colors.background,
            border: `1px solid ${statusDropdownOpen ? visualConfig.colors.primary : `${visualConfig.colors.text.secondary}20`}`,
            borderRadius: '6px',
            color: visualConfig.colors.text.primary,
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            boxShadow: statusDropdownOpen ? `0 0 0 3px ${visualConfig.colors.primary}1A` : 'none'
          }}
          aria-label="Filter by status"
          aria-expanded={statusDropdownOpen}
        >
          <Icons.Filter size={16} />
          <span>Status</span>
          {selectedStatuses.length > 0 && selectedStatuses.length < STATUS_OPTIONS.length && (
            <span
              style={{
                backgroundColor: visualConfig.colors.primary,
                color: visualConfig.colors.text.onPrimary,
                fontSize: '12px',
                fontWeight: '600',
                padding: '2px 6px',
                borderRadius: '10px',
                minWidth: '20px',
                textAlign: 'center'
              }}
            >
              {selectedStatuses.length}
            </span>
          )}
          <Icons.ChevronDown size={16} style={{
            transform: statusDropdownOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 150ms ease'
          }} />
        </button>

        {/* Status Dropdown Panel */}
        {statusDropdownOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              backgroundColor: visualConfig.colors.elevated,
              border: `1px solid ${visualConfig.colors.text.secondary}20`,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              padding: '8px',
              minWidth: '240px',
              zIndex: 1000,
              animation: 'dropdownSlideIn 150ms ease-out'
            }}
            role="menu"
          >
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button
                onClick={handleSelectAllStatuses}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: visualConfig.colors.primary,
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 100ms ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${visualConfig.colors.primary}1A`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Select All
              </button>
              <button
                onClick={handleClearAllStatuses}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: visualConfig.colors.text.secondary,
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 100ms ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${visualConfig.colors.text.secondary}1A`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Clear All
              </button>
            </div>

            {/* Status options */}
            {STATUS_OPTIONS.map((option) => {
              const isSelected = selectedStatuses.includes(option.value);
              return (
                <label
                  key={option.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background-color 100ms ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${visualConfig.colors.primary}1A`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleStatusToggle(option.value)}
                    style={{ cursor: 'pointer' }}
                  />
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: option.color
                    }}
                  />
                  <span style={{ color: visualConfig.colors.text.primary, fontSize: '14px' }}>
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Priority Filter */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <span
          style={{
            fontSize: '14px',
            fontWeight: '500',
            color: visualConfig.colors.text.secondary,
            marginRight: '4px'
          }}
        >
          Priority:
        </span>
        {PRIORITY_OPTIONS.map((option) => {
          const isSelected = selectedPriority.includes(option.value);
          return (
            <button
              key={option.value}
              onClick={() => handlePriorityToggle(option.value)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: '500',
                color: isSelected ? visualConfig.colors.text.onPrimary : visualConfig.colors.text.primary,
                backgroundColor: isSelected ? visualConfig.colors.primary : visualConfig.colors.background,
                border: `1px solid ${isSelected ? visualConfig.colors.primary : `${visualConfig.colors.text.secondary}20`}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 150ms ease'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = `${visualConfig.colors.primary}0D`;
                  e.currentTarget.style.borderColor = visualConfig.colors.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = visualConfig.colors.background;
                  e.currentTarget.style.borderColor = `${visualConfig.colors.text.secondary}20`;
                }
              }}
              aria-label={`Filter priority ${option.label} (${option.range})`}
              aria-pressed={isSelected}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Show Conflicts Toggle */}
      <button
        onClick={() => {
          onToggleConflicts();
          hapticFeedback.impact('medium');
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: visualConfig.colors.background,
          border: `1px solid ${showConflicts ? visualConfig.colors.primary : `${visualConfig.colors.text.secondary}20`}`,
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 150ms ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = visualConfig.colors.primary;
          e.currentTarget.style.backgroundColor = `${visualConfig.colors.primary}0D`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = showConflicts ? visualConfig.colors.primary : `${visualConfig.colors.text.secondary}20`;
          e.currentTarget.style.backgroundColor = visualConfig.colors.background;
        }}
        aria-label="Toggle conflict highlighting"
        aria-pressed={showConflicts}
      >
        <div
          style={{
            width: '44px',
            height: '24px',
            backgroundColor: showConflicts ? visualConfig.colors.primary : `${visualConfig.colors.text.secondary}40`,
            borderRadius: '12px',
            position: 'relative',
            transition: 'background-color 200ms ease'
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              backgroundColor: visualConfig.colors.elevated,
              borderRadius: '50%',
              position: 'absolute',
              top: '2px',
              left: showConflicts ? '22px' : '2px',
              transition: 'left 200ms ease',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
            }}
          />
        </div>
        <span style={{ color: visualConfig.colors.text.primary, fontSize: '14px', fontWeight: '500' }}>
          Show Conflicts
        </span>
        {showConflicts && conflictCount > 0 && (
          <span
            style={{
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: '600',
              padding: '2px 8px',
              borderRadius: '10px',
              minWidth: '24px',
              textAlign: 'center'
            }}
          >
            {conflictCount}
          </span>
        )}
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Job count */}
      <span
        style={{
          fontSize: '13px',
          color: visualConfig.colors.text.secondary
        }}
      >
        Showing {filteredJobCount} of {totalJobCount} jobs
      </span>
    </div>
  );
};
