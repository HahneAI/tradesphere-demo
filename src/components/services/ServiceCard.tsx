/**
 * ServiceCard - Mobile-optimized card view for services
 *
 * Features:
 * - Full inline editing with EditableField component
 * - All Supabase update calls preserved
 * - Profit margin formatting and validation
 * - Admin-only editing with visual feedback
 * - 48px touch targets for all interactive elements
 * - Material settings dynamic key handling
 */

import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { SmartVisualTheme } from '../../config/industry';

interface ServiceCardProps {
  service: any; // Full service object from useServiceBaseSettings
  visualConfig: SmartVisualTheme;
  theme: 'light' | 'dark';
  isAdmin: boolean;
  updateBaseSetting: (serviceId: string, setting: string, value: number) => void;
  onOpenSpecifics: (serviceId: string, serviceName: string) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  visualConfig,
  theme,
  isAdmin,
  updateBaseSetting,
  onOpenSpecifics,
}) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  // Format profit margin for display (0.3 → 30%)
  const formatProfitMarginDisplay = (value: number) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  // Parse profit margin input (30% or 30 → 0.3)
  const parseProfitMarginInput = (input: string): number => {
    const cleanInput = input.replace('%', '');
    const percentage = parseFloat(cleanInput);
    return percentage / 100;
  };

  // Validate profit margin (5% to 50%)
  const validateProfitMargin = (value: number): boolean => {
    const percentage = value * 100;
    return percentage >= 5 && percentage <= 50;
  };

  // Start editing a field
  const handleFieldEdit = (setting: string, currentValue: number) => {
    if (!isAdmin) return;
    setEditingField(setting);

    // Special handling for profit margin display
    if (setting === 'businessSettings.profitMarginTarget') {
      setTempValue((currentValue * 100).toFixed(0));
    } else {
      setTempValue(currentValue.toString());
    }
  };

  // Save field edit
  const handleFieldSave = (setting: string) => {
    if (!editingField) return;
    let numValue: number;

    // Handle profit margin conversion
    if (setting === 'businessSettings.profitMarginTarget') {
      numValue = parseProfitMarginInput(tempValue);
      if (!validateProfitMargin(numValue)) {
        alert('Profit margin must be between 5% and 50%');
        return;
      }
    } else {
      numValue = parseFloat(tempValue);
      if (isNaN(numValue)) return;
    }

    // Call updateBaseSetting which triggers Supabase update
    updateBaseSetting(service.serviceId, setting, numValue);
    setEditingField(null);
    setTempValue('');
  };

  // Cancel field edit
  const handleFieldCancel = () => {
    setEditingField(null);
    setTempValue('');
  };

  // EditableField component for inline editing
  const EditableField = ({
    label,
    setting,
    value,
    unit,
    validation,
    isProfitMargin = false,
  }: {
    label: string;
    setting: string;
    value: number;
    unit: string;
    validation?: { min: number; max: number; step: number };
    isProfitMargin?: boolean;
  }) => {
    const isEditing = editingField === setting;

    if (isEditing) {
      return (
        <div className="space-y-2">
          <span className="text-xs font-medium" style={{ color: visualConfig.colors.text.secondary }}>
            {label}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFieldSave(setting);
                if (e.key === 'Escape') handleFieldCancel();
              }}
              min={validation?.min}
              max={validation?.max}
              step={validation?.step}
              className="flex-1 px-3 h-11 min-h-[44px] text-sm border rounded-lg focus:outline-none focus:ring-2"
              style={{
                backgroundColor: visualConfig.colors.surface,
                borderColor: theme === 'light' ? '#e5e7eb' : '#374151',
                color: visualConfig.colors.text.primary,
                '--tw-ring-color': visualConfig.colors.primary,
              }}
              autoFocus
            />
            <button
              onClick={() => handleFieldSave(setting)}
              className="h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-all active:scale-95"
              style={{ backgroundColor: '#10B981', color: 'white' }}
            >
              <Icons.Check className="h-5 w-5" />
            </button>
            <button
              onClick={handleFieldCancel}
              className="h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-all active:scale-95"
              style={{ backgroundColor: '#EF4444', color: 'white' }}
            >
              <Icons.X className="h-5 w-5" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <span className="text-xs font-medium" style={{ color: visualConfig.colors.text.secondary }}>
          {label}
        </span>
        <button
          onClick={() => handleFieldEdit(setting, value)}
          disabled={!isAdmin}
          className="w-full text-left px-3 h-11 min-h-[44px] rounded-lg transition-all active:scale-[0.97] disabled:opacity-50"
          style={{
            backgroundColor: visualConfig.colors.surface,
            color: visualConfig.colors.text.primary,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {isProfitMargin ? formatProfitMarginDisplay(value) : `${value} ${unit}`}
            </span>
            {isAdmin && <Icons.Edit2 className="h-4 w-4 opacity-40" />}
          </div>
        </button>
      </div>
    );
  };

  // Get first material setting dynamically (different per service)
  const materialSettingKey = Object.keys(service.baseSettings.materialSettings)[0];
  const materialSetting = service.baseSettings.materialSettings[materialSettingKey];

  return (
    <div
      className="rounded-lg border p-4 space-y-4 transition-colors active:bg-opacity-90"
      style={{
        backgroundColor: visualConfig.colors.surface,
        borderColor: theme === 'light' ? '#e5e7eb' : '#374151',
      }}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate" style={{ color: visualConfig.colors.text.primary }}>
            {service.service}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
              style={{
                backgroundColor: visualConfig.colors.primary + '20',
                color: visualConfig.colors.primary,
              }}
            >
              {service.category}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <div className="w-2 h-2 rounded-full mr-1 bg-green-400" />
            Active
          </div>
        </div>
      </div>

      {/* Editable Fields Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Base Rate */}
        <EditableField
          label="Base Rate"
          setting="laborSettings.hourlyLaborRate"
          value={service.baseSettings.laborSettings.hourlyLaborRate.value}
          unit={service.baseSettings.laborSettings.hourlyLaborRate.unit}
          validation={service.baseSettings.laborSettings.hourlyLaborRate.validation}
        />

        {/* Team Size */}
        <EditableField
          label="Team Size"
          setting="laborSettings.optimalTeamSize"
          value={service.baseSettings.laborSettings.optimalTeamSize.value}
          unit={service.baseSettings.laborSettings.optimalTeamSize.unit}
          validation={service.baseSettings.laborSettings.optimalTeamSize.validation}
        />

        {/* Productivity */}
        <EditableField
          label="Productivity"
          setting="laborSettings.baseProductivity"
          value={service.baseSettings.laborSettings.baseProductivity.value}
          unit={service.baseSettings.laborSettings.baseProductivity.unit}
          validation={service.baseSettings.laborSettings.baseProductivity.validation}
        />

        {/* Material Cost (dynamic key) */}
        <EditableField
          label="Material Cost"
          setting={`materialSettings.${materialSettingKey}`}
          value={materialSetting.value}
          unit={materialSetting.unit}
          validation={materialSetting.validation}
        />

        {/* Profit Margin */}
        <div className="col-span-2">
          <EditableField
            label="Profit Margin"
            setting="businessSettings.profitMarginTarget"
            value={service.baseSettings.businessSettings.profitMarginTarget.value}
            unit={service.baseSettings.businessSettings.profitMarginTarget.unit}
            validation={service.baseSettings.businessSettings.profitMarginTarget.validation}
            isProfitMargin={true}
          />
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={() => onOpenSpecifics(service.serviceId, service.service)}
        className="w-full h-12 min-h-[48px] flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 active:scale-[0.97]"
        style={{
          backgroundColor: visualConfig.colors.primary,
          color: visualConfig.colors.text.onPrimary,
        }}
      >
        <Icons.Settings className="h-5 w-5" />
        <span>Open Specifics</span>
      </button>
    </div>
  );
};
