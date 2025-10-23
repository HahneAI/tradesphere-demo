import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { AdminEditableField } from './AdminEditableField';

interface ServiceConfig {
  service: string;
  serviceId: string;
  category: string;
  baseSettings: {
    [key: string]: {
      value: number;
      unit: string;
      label: string;
      description: string;
      adminEditable: boolean;
      validation?: {
        min: number;
        max: number;
        step: number;
      };
    };
  };
  variables?: any;
  lastModified: string;
}

interface ServiceRecordCardProps {
  service: ServiceConfig;
  isAdmin: boolean;
  onUpdateSetting: (serviceId: string, setting: string, value: number) => void;
  visualConfig: any;
}

export const ServiceRecordCard: React.FC<ServiceRecordCardProps> = ({
  service,
  isAdmin,
  onUpdateSetting,
  visualConfig
}) => {
  const [showHiddenMultipliers, setShowHiddenMultipliers] = useState(false);

  const handleSettingUpdate = (setting: string, value: number) => {
    console.log('🔍 [UI DEBUG] Admin saving setting:', {
      serviceId: service.serviceId,
      setting,
      oldValue: setting.split('.').reduce((obj: any, key) => obj?.[key], service.baseSettings)?.value,
      newValue: value,
      timestamp: new Date().toISOString()
    });
    onUpdateSetting(service.serviceId, setting, value);
  };

  const getMultiplierCount = () => {
    if (!service.variables) return 0;
    
    let count = 0;
    Object.values(service.variables).forEach((category: any) => {
      Object.keys(category).forEach(key => {
        if (key !== 'label' && key !== 'description') {
          count++;
        }
      });
    });
    return count;
  };

  const multiplierCount = getMultiplierCount();

  return (
    <div 
      className="border rounded-lg overflow-hidden"
      style={{ 
        backgroundColor: visualConfig.colors.surface,
        borderColor: visualConfig.colors.text.secondary + '20'
      }}
    >
      {/* Card Header */}
      <div 
        className="px-4 py-3 border-b"
        style={{ 
          backgroundColor: visualConfig.colors.primary + '08',
          borderColor: visualConfig.colors.text.secondary + '20'
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium" style={{ color: visualConfig.colors.text.primary }}>
              {service.service}
            </h3>
            <div className="flex items-center space-x-4 mt-1">
              <span 
                className="text-xs px-2 py-1 rounded"
                style={{ 
                  backgroundColor: visualConfig.colors.primary + '20',
                  color: visualConfig.colors.primary
                }}
              >
                {service.category}
              </span>
              <span className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                Row: {service.serviceId.split('_').pop()}
              </span>
            </div>
          </div>
          
          <div className="text-right">
            <div 
              className="w-3 h-3 rounded-full mb-1"
              style={{ backgroundColor: visualConfig.colors.primary }}
            />
            <span className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Base Settings - Expert Categorized Structure */}
      <div className="p-4 space-y-6">

        {/* Labor Settings */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center" style={{ color: visualConfig.colors.text.primary }}>
            <Icons.Users className="h-4 w-4 mr-2" style={{ color: visualConfig.colors.primary }} />
            Labor Settings
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(service.baseSettings.laborSettings || {}).map(([key, setting]) => (
              <AdminEditableField
                key={`labor_${key}`}
                label={setting.label}
                value={setting.value}
                unit={setting.unit}
                description={setting.description}
                isAdmin={isAdmin}
                onSave={(value) => handleSettingUpdate(`laborSettings.${key}`, value)}
                validation={setting.validation}
                visualConfig={visualConfig}
              />
            ))}
          </div>
        </div>

        {/* Material Settings */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center" style={{ color: visualConfig.colors.text.primary }}>
            <Icons.Package className="h-4 w-4 mr-2" style={{ color: visualConfig.colors.primary }} />
            Material Settings
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(service.baseSettings.materialSettings || {}).map(([key, setting]) => (
              <AdminEditableField
                key={`material_${key}`}
                label={setting.label}
                value={setting.value}
                unit={setting.unit}
                description={setting.description}
                isAdmin={isAdmin}
                onSave={(value) => handleSettingUpdate(`materialSettings.${key}`, value)}
                validation={setting.validation}
                visualConfig={visualConfig}
              />
            ))}
          </div>
        </div>

        {/* Business Settings */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center" style={{ color: visualConfig.colors.text.primary }}>
            <Icons.TrendingUp className="h-4 w-4 mr-2" style={{ color: visualConfig.colors.primary }} />
            Business Settings
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(service.baseSettings.businessSettings || {}).map(([key, setting]) => (
              <AdminEditableField
                key={`business_${key}`}
                label={setting.label}
                value={setting.value}
                unit={setting.unit}
                description={setting.description}
                isAdmin={isAdmin}
                onSave={(value) => handleSettingUpdate(`businessSettings.${key}`, value)}
                validation={setting.validation}
                visualConfig={visualConfig}
              />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div 
          className="border-t pt-4"
          style={{ borderColor: visualConfig.colors.text.secondary + '20' }}
        >
          {/* Hidden Multipliers Info */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm" style={{ color: visualConfig.colors.text.primary }}>
                Industry Multipliers:
              </span>
              <span className="ml-2 text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                {multiplierCount} configured
              </span>
            </div>
            
            <button
              onClick={() => setShowHiddenMultipliers(!showHiddenMultipliers)}
              className="flex items-center space-x-1 px-2 py-1 rounded transition-colors hover:opacity-80"
              style={{ 
                backgroundColor: visualConfig.colors.background,
                color: visualConfig.colors.text.secondary
              }}
            >
              <span className="text-xs">
                {showHiddenMultipliers ? 'Hide' : 'View'} Details
              </span>
              <Icons.ChevronDown 
                className={`h-3 w-3 transition-transform ${showHiddenMultipliers ? 'transform rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* Expanded Multipliers Display */}
          {showHiddenMultipliers && service.variables && (
            <div className="mt-3 space-y-2">
              {Object.entries(service.variables).map(([categoryKey, category]: [string, any]) => (
                <div 
                  key={categoryKey}
                  className="p-2 rounded text-xs"
                  style={{ backgroundColor: visualConfig.colors.background }}
                >
                  <div className="font-medium mb-1" style={{ color: visualConfig.colors.text.primary }}>
                    {category.label}
                  </div>
                  <div className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                    {Object.keys(category).filter(key => !['label', 'description'].includes(key)).length} variables configured
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Last Modified */}
          <div className="mt-4 pt-3 border-t" style={{ borderColor: visualConfig.colors.text.secondary + '10' }}>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: visualConfig.colors.text.secondary }}>
                Last updated: {service.lastModified}
              </span>
              {isAdmin && (
                <span style={{ color: visualConfig.colors.primary }}>
                  <Icons.Shield className="h-3 w-3 inline mr-1" />
                  Admin Access
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};