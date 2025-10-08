import React, { useState } from 'react';
import * as Icons from 'lucide-react';

interface AdminEditableFieldProps {
  label: string;
  value: number;
  unit: string;
  description: string;
  isAdmin: boolean;
  onSave: (newValue: number) => void;
  validation?: {
    min: number;
    max: number;
    step: number;
  };
  visualConfig: any;
}

export const AdminEditableField: React.FC<AdminEditableFieldProps> = ({
  label,
  value,
  unit,
  description,
  isAdmin,
  onSave,
  validation,
  visualConfig
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleSave = async () => {
    const numValue = parseFloat(editValue);
    
    // Validation
    if (isNaN(numValue)) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
      return;
    }
    
    if (validation) {
      if (numValue < validation.min || numValue > validation.max) {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 2000);
        return;
      }
    }

    setSaveStatus('saving');
    
    try {
      onSave(numValue);
      setSaveStatus('saved');
      setIsEditing(false);
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleCancel = () => {
    setEditValue(value.toString());
    setIsEditing(false);
    setSaveStatus('idle');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const formatDisplayValue = (val: number) => {
    // Handle zero material cost - show em dash instead of $0.00
    if (val === 0 && unit === '$/sqft') {
      return '—';  // Em dash
    }

    if (unit === 'percentage') {
      return `${(val * 100).toFixed(0)}%`;
    }
    if (unit === 'hrs/sqft') {
      return `${val.toFixed(2)} ${unit}`;
    }
    if (unit === '$' || unit === '$/sqft') {
      return `$${val.toFixed(2)}${unit === '$/sqft' ? '/sqft' : ''}`;
    }
    if (unit === '$/hr') {
      return `$${val.toFixed(0)}/hr`;
    }
    if (unit === '$/hour/person') {
      return `$${val.toFixed(0)}/hr/person`;
    }
    // Excavation-specific units
    if (unit === '$ per cubic yard') {
      return `$${val.toFixed(0)} per yd³`;
    }
    if (unit === 'cubic yards/day') {
      return `${val.toFixed(0)} yd³/day`;
    }
    if (unit === 'people') {
      return `${val.toFixed(0)} ${unit}`;
    }
    if (unit === 'sqft/day') {
      return `${val.toFixed(0)} ${unit}`;
    }
    return `${val} ${unit}`;
  };

  if (!isAdmin) {
    // Employee view - read-only
    return (
      <div className="flex flex-col space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
            {label}:
          </span>
          <span 
            className="text-sm font-mono px-2 py-1 rounded"
            style={{ 
              backgroundColor: visualConfig.colors.background,
              color: visualConfig.colors.text.primary,
              border: `1px solid ${visualConfig.colors.text.secondary}20`
            }}
          >
            {formatDisplayValue(value)}
          </span>
        </div>
        <p className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
          {description}
        </p>
      </div>
    );
  }

  // Admin view - editable
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
          {label}:
        </span>
        
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-2 px-2 py-1 rounded transition-colors hover:opacity-80"
            style={{ 
              backgroundColor: visualConfig.colors.primary + '10',
              border: `1px solid ${visualConfig.colors.primary}40`
            }}
          >
            <span 
              className="text-sm font-mono"
              style={{ color: visualConfig.colors.text.primary }}
            >
              {formatDisplayValue(value)}
            </span>
            <Icons.Edit2 className="h-3 w-3" style={{ color: visualConfig.colors.primary }} />
          </button>
        ) : (
          <div className="flex items-center space-x-1">
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyPress={handleKeyPress}
              min={validation?.min}
              max={validation?.max}
              step={validation?.step}
              className="w-20 px-2 py-1 text-sm border rounded"
              style={{
                backgroundColor: visualConfig.colors.surface,
                borderColor: saveStatus === 'error' ? '#dc2626' : visualConfig.colors.text.secondary + '40',
                color: visualConfig.colors.text.primary,
              }}
              autoFocus
            />
            
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="p-1 rounded transition-colors hover:opacity-80 disabled:opacity-50"
              style={{ 
                backgroundColor: visualConfig.colors.primary,
                color: visualConfig.colors.text.onPrimary
              }}
            >
              {saveStatus === 'saving' ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
              ) : saveStatus === 'saved' ? (
                <Icons.Check className="h-3 w-3" />
              ) : saveStatus === 'error' ? (
                <Icons.AlertTriangle className="h-3 w-3" />
              ) : (
                <Icons.Save className="h-3 w-3" />
              )}
            </button>
            
            <button
              onClick={handleCancel}
              className="p-1 rounded transition-colors hover:opacity-80"
              style={{ 
                backgroundColor: visualConfig.colors.text.secondary + '20',
                color: visualConfig.colors.text.secondary
              }}
            >
              <Icons.X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      <p className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
        {description}
        {validation && (
          <span className="ml-2 opacity-75">
            (Range: {validation.min} - {validation.max})
          </span>
        )}
      </p>

      {saveStatus === 'saved' && (
        <div 
          className="text-xs px-2 py-1 rounded"
          style={{ 
            backgroundColor: visualConfig.colors.primary + '20',
            color: visualConfig.colors.primary
          }}
        >
          ✓ Setting updated successfully
        </div>
      )}

      {saveStatus === 'error' && (
        <div 
          className="text-xs px-2 py-1 rounded"
          style={{ 
            backgroundColor: '#fee2e2',
            color: '#dc2626'
          }}
        >
          ⚠ Invalid value. Please check the range.
        </div>
      )}
    </div>
  );
};