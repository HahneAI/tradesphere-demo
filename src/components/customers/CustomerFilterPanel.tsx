/**
 * CustomerFilterPanel Component
 *
 * Advanced filtering interface for customer list.
 * Supports lifecycle stage, tags, source, date range, contact info, and sorting.
 */

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../../config/industry';
import { CustomerSearchFilters } from '../../types/customer';
import { hapticFeedback, getTouchTargetSize, isMobileDevice } from '../../utils/mobile-gestures';
import type { LifecycleStage } from './LifecycleBadge';
import type { CustomerSource } from './SourceBadge';

export interface CustomerFilterPanelProps {
  filters: CustomerSearchFilters;
  onFiltersChange: (filters: CustomerSearchFilters) => void;
  onClose: () => void;
  allTags: string[];
  isOpen: boolean;
}

export const CustomerFilterPanel: React.FC<CustomerFilterPanelProps> = ({
  filters,
  onFiltersChange,
  onClose,
  allTags,
  isOpen
}) => {
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);
  const touchTargetSize = getTouchTargetSize();
  const isMobile = isMobileDevice();

  const [localFilters, setLocalFilters] = useState<CustomerSearchFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApplyFilters = () => {
    hapticFeedback.selection();
    onFiltersChange(localFilters);
    if (isMobile) {
      onClose();
    }
  };

  const handleClearFilters = () => {
    hapticFeedback.impact('light');
    const clearedFilters: CustomerSearchFilters = {
      searchQuery: '',
      lifecycle_stage: undefined,
      tags: undefined,
      source: undefined,
      has_email: undefined,
      has_phone: undefined,
      has_address: undefined,
      date_range: undefined,
      sort_by: 'last_interaction_at',
      sort_order: 'desc'
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const toggleLifecycleStage = (stage: LifecycleStage) => {
    const current = localFilters.lifecycle_stage || [];
    const updated = current.includes(stage)
      ? current.filter(s => s !== stage)
      : [...current, stage];
    setLocalFilters({ ...localFilters, lifecycle_stage: updated.length > 0 ? updated : undefined });
  };

  const toggleTag = (tag: string) => {
    const current = localFilters.tags || [];
    const updated = current.includes(tag)
      ? current.filter(t => t !== tag)
      : [...current, tag];
    setLocalFilters({ ...localFilters, tags: updated.length > 0 ? updated : undefined });
  };

  const toggleSource = (source: CustomerSource) => {
    const current = localFilters.source || [];
    const updated = current.includes(source)
      ? current.filter(s => s !== source)
      : [...current, source];
    setLocalFilters({ ...localFilters, source: updated.length > 0 ? updated : undefined });
  };

  const isLifecycleSelected = (stage: LifecycleStage) => localFilters.lifecycle_stage?.includes(stage) || false;
  const isTagSelected = (tag: string) => localFilters.tags?.includes(tag) || false;
  const isSourceSelected = (source: CustomerSource) => localFilters.source?.includes(source) || false;

  if (!isOpen) return null;

  return (
    <>
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 animate-overlay-fade-in"
        onClick={onClose}
      />

      {/* Filter Panel */}
      <div
        className={`fixed z-50 ${
          isMobile
            ? 'inset-0 animate-slide-in-right'
            : 'right-0 top-0 bottom-0 w-96 animate-slide-in-right shadow-2xl'
        }`}
        style={{
          backgroundColor: visualConfig.colors.surface,
          borderLeft: isMobile ? 'none' : `1px solid ${theme === 'light' ? '#e5e7eb' : '#374151'}`
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}
        >
          <div className="flex items-center gap-2">
            <Icons.Filter className="h-5 w-5" style={{ color: visualConfig.colors.primary }} />
            <h2 className="text-lg font-semibold" style={{ color: visualConfig.colors.text.primary }}>
              Filter Customers
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-opacity-10 transition-colors"
            style={{
              backgroundColor: 'transparent',
              color: visualConfig.colors.text.secondary,
              minHeight: `${touchTargetSize.minSize}px`,
              minWidth: `${touchTargetSize.minSize}px`
            }}
            aria-label="Close filter panel"
          >
            <Icons.X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Content */}
        <div className="overflow-y-auto p-4 space-y-6" style={{ height: 'calc(100% - 140px)' }}>
          {/* Lifecycle Stage Filter */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: visualConfig.colors.text.primary }}>
              Lifecycle Stage
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['prospect', 'lead', 'customer', 'churned'] as LifecycleStage[]).map(stage => (
                <button
                  key={stage}
                  onClick={() => toggleLifecycleStage(stage)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isLifecycleSelected(stage) ? 'ring-2' : ''
                  }`}
                  style={{
                    backgroundColor: isLifecycleSelected(stage)
                      ? visualConfig.colors.primary + '20'
                      : visualConfig.colors.background,
                    color: isLifecycleSelected(stage)
                      ? visualConfig.colors.primary
                      : visualConfig.colors.text.secondary,
                    borderColor: isLifecycleSelected(stage)
                      ? visualConfig.colors.primary
                      : theme === 'light' ? '#d1d5db' : '#4b5563',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    minHeight: `${touchTargetSize.recommendedSize}px`
                  }}
                >
                  {stage.charAt(0).toUpperCase() + stage.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: visualConfig.colors.text.primary }}>
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200`}
                    style={{
                      backgroundColor: isTagSelected(tag)
                        ? visualConfig.colors.primary + '20'
                        : visualConfig.colors.background,
                      color: isTagSelected(tag)
                        ? visualConfig.colors.primary
                        : visualConfig.colors.text.secondary,
                      borderColor: isTagSelected(tag)
                        ? visualConfig.colors.primary
                        : theme === 'light' ? '#d1d5db' : '#4b5563',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      minHeight: `${touchTargetSize.minSize}px`
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Source Filter */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: visualConfig.colors.text.primary }}>
              Source
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['chat', 'manual', 'import'] as CustomerSource[]).map(source => (
                <button
                  key={source}
                  onClick={() => toggleSource(source)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200`}
                  style={{
                    backgroundColor: isSourceSelected(source)
                      ? visualConfig.colors.primary + '20'
                      : visualConfig.colors.background,
                    color: isSourceSelected(source)
                      ? visualConfig.colors.primary
                      : visualConfig.colors.text.secondary,
                    borderColor: isSourceSelected(source)
                      ? visualConfig.colors.primary
                      : theme === 'light' ? '#d1d5db' : '#4b5563',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    minHeight: `${touchTargetSize.recommendedSize}px`
                  }}
                >
                  {source.charAt(0).toUpperCase() + source.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Info Filters */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: visualConfig.colors.text.primary }}>
              Contact Information
            </label>
            <div className="space-y-2">
              {[
                { key: 'has_email' as const, label: 'Has Email', icon: 'Mail' as const },
                { key: 'has_phone' as const, label: 'Has Phone', icon: 'Phone' as const },
                { key: 'has_address' as const, label: 'Has Address', icon: 'MapPin' as const }
              ].map(({ key, label, icon }) => {
                const Icon = Icons[icon] as React.ComponentType<{ className?: string }>;
                return (
                  <label
                    key={key}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-opacity-5 transition-colors"
                    style={{
                      backgroundColor: localFilters[key] ? visualConfig.colors.primary + '10' : 'transparent',
                      minHeight: `${touchTargetSize.recommendedSize}px`
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={localFilters[key] || false}
                      onChange={(e) => setLocalFilters({ ...localFilters, [key]: e.target.checked || undefined })}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: visualConfig.colors.primary }}
                    />
                    <Icon className="h-4 w-4" style={{ color: visualConfig.colors.text.secondary }} />
                    <span style={{ color: visualConfig.colors.text.primary }}>{label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: visualConfig.colors.text.primary }}>
              Sort By
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={localFilters.sort_by || 'last_interaction_at'}
                onChange={(e) => setLocalFilters({ ...localFilters, sort_by: e.target.value as any })}
                className="px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: visualConfig.colors.background,
                  borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
                  color: visualConfig.colors.text.primary,
                  minHeight: `${touchTargetSize.recommendedSize}px`
                }}
              >
                <option value="name">Name</option>
                <option value="created_at">Created Date</option>
                <option value="last_interaction_at">Last Seen</option>
                <option value="total_conversations">Conversations</option>
              </select>

              <button
                onClick={() => setLocalFilters({
                  ...localFilters,
                  sort_order: localFilters.sort_order === 'asc' ? 'desc' : 'asc'
                })}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all"
                style={{
                  backgroundColor: visualConfig.colors.background,
                  borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
                  color: visualConfig.colors.text.primary,
                  minHeight: `${touchTargetSize.recommendedSize}px`
                }}
              >
                {localFilters.sort_order === 'asc' ? (
                  <>
                    <Icons.ArrowUp className="h-4 w-4" />
                    <span className="text-sm">Asc</span>
                  </>
                ) : (
                  <>
                    <Icons.ArrowDown className="h-4 w-4" />
                    <span className="text-sm">Desc</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-3 p-4 border-t"
          style={{
            backgroundColor: visualConfig.colors.surface,
            borderColor: theme === 'light' ? '#e5e7eb' : '#374151'
          }}
        >
          <button
            onClick={handleClearFilters}
            className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: 'transparent',
              color: visualConfig.colors.text.secondary,
              border: `1px solid ${theme === 'light' ? '#d1d5db' : '#4b5563'}`,
              minHeight: `${touchTargetSize.recommendedSize}px`
            }}
          >
            Clear All
          </button>
          <button
            onClick={handleApplyFilters}
            className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: visualConfig.colors.primary,
              color: visualConfig.colors.text.onPrimary,
              minHeight: `${touchTargetSize.recommendedSize}px`
            }}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
};

export default CustomerFilterPanel;
