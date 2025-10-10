/**
 * CategoryCard - Mobile-optimized card view for material categories
 *
 * Features:
 * - Displays category information in compact card format
 * - Shows calculation method with icon
 * - Displays material count dynamically
 * - Shows required badge when applicable
 * - 48px touch target for View Materials button
 * - Preserves all click handlers and modal opening logic
 */

import React from 'react';
import * as Icons from 'lucide-react';
import { SmartVisualTheme } from '../../config/industry';
import type { MaterialCategory } from '../../types/materials';

interface CategoryCardProps {
  category: MaterialCategory;
  visualConfig: SmartVisualTheme;
  theme: 'light' | 'dark';
  materialCount: number;
  onViewMaterials: (category: MaterialCategory) => void;
  formatCalculationMethod: (method: string) => string;
  truncateText: (text: string | null | undefined, maxLength: number) => string;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  visualConfig,
  theme,
  materialCount,
  onViewMaterials,
  formatCalculationMethod,
  truncateText,
}) => {
  return (
    <div
      className="rounded-lg border p-4 space-y-3 transition-colors hover:bg-opacity-90"
      style={{
        backgroundColor: visualConfig.colors.surface,
        borderColor: theme === 'light' ? '#e5e7eb' : '#374151',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-base truncate"
            style={{ color: visualConfig.colors.text.primary }}
            title={category.category_label}
          >
            {truncateText(category.category_label, 30)}
          </h3>
          <p
            className="text-sm mt-1 line-clamp-2"
            style={{ color: visualConfig.colors.text.secondary }}
            title={category.category_description || undefined}
          >
            {truncateText(category.category_description, 60)}
          </p>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {/* Calculation Method */}
        <div className="space-y-1">
          <span className="text-xs font-medium" style={{ color: visualConfig.colors.text.secondary }}>
            Calculation
          </span>
          <div
            className="flex items-center gap-2 px-3 h-10 rounded-lg"
            style={{
              backgroundColor: visualConfig.colors.background,
              color: visualConfig.colors.text.primary,
            }}
          >
            <Icons.Calculator className="h-4 w-4 flex-shrink-0" style={{ color: visualConfig.colors.text.secondary }} />
            <span className="truncate text-xs font-medium">
              {formatCalculationMethod(category.calculation_method)}
            </span>
          </div>
        </div>

        {/* Material Count */}
        <div className="space-y-1">
          <span className="text-xs font-medium" style={{ color: visualConfig.colors.text.secondary }}>
            Materials
          </span>
          <div
            className="flex items-center justify-center h-10 rounded-lg px-3"
            style={{
              backgroundColor: visualConfig.colors.primary + '20',
              color: visualConfig.colors.primary,
            }}
          >
            <span className="font-semibold text-sm">
              {materialCount} {materialCount === 1 ? 'material' : 'materials'}
            </span>
          </div>
        </div>
      </div>

      {/* Badges Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Required Badge */}
        {category.is_required && (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            <Icons.AlertCircle className="h-3 w-3 mr-1" />
            Required
          </span>
        )}

        {/* Additional Info Badge */}
        <span
          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
          style={{
            backgroundColor: visualConfig.colors.secondary + '30',
            color: visualConfig.colors.text.secondary,
          }}
        >
          {category.category_key}
        </span>
      </div>

      {/* Action Button */}
      <button
        onClick={() => onViewMaterials(category)}
        className="w-full h-12 min-h-[48px] flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 active:scale-[0.97]"
        style={{
          backgroundColor: visualConfig.colors.primary,
          color: visualConfig.colors.text.onPrimary,
        }}
      >
        <Icons.Eye className="h-5 w-5" />
        <span>View Materials</span>
      </button>
    </div>
  );
};
