import React, { useState, useEffect, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useServiceBaseSettings } from '../../../stores/serviceBaseSettingsStore';
import { NumberInput, SelectInput } from './shared';

interface ServiceSpecificsModalProps {
  isOpen: boolean;
  serviceId: string;
  serviceName: string;
  onClose: () => void;
  visualConfig: any;
  theme: string;
}

interface CalculationSettings {
  defaultDepth: number;
  wasteFactor: number;
  compactionFactor: number;
  roundingRule: string;
}

export const ExcavationSpecificsModal: React.FC<ServiceSpecificsModalProps> = ({
  isOpen,
  serviceId,
  serviceName,
  onClose,
  visualConfig,
  theme,
}) => {
  const { user } = useAuth();
  const { getService, updateServiceVariables, refreshServices, services } = useServiceBaseSettings(user?.company_id);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAdmin = user?.is_admin || false;

  // State for calculationSettings values
  const [calculationSettings, setCalculationSettings] = useState<CalculationSettings>({
    defaultDepth: 12,
    wasteFactor: 10,
    compactionFactor: 0,
    roundingRule: 'up_whole',
  });

  // CRITICAL FIX: Refresh services from Supabase when modal opens with loading state
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 [EXCAVATION MODAL] Modal opened, forcing fresh load from database');
      setIsRefreshing(true);
      refreshServices().then(() => {
        console.log('✅ [EXCAVATION MODAL] Fresh data loaded from database');
        setIsRefreshing(false);
      });
    }
  }, [isOpen, refreshServices]);

  // Use useMemo to ensure proper reactivity when services state updates
  const service = useMemo(() => {
    const svc = getService(serviceId);
    console.log('🔍 [EXCAVATION MODAL] Service retrieved:', {
      found: !!svc,
      serviceId,
      hasCalculationSettings: !!svc?.variables_config?.calculationSettings,
    });
    return svc;
  }, [getService, serviceId, services]);

  // Load values from variables_config.calculationSettings
  useEffect(() => {
    if (!isRefreshing && service?.variables_config?.calculationSettings) {
      const settings = service.variables_config.calculationSettings;
      console.log('📝 [EXCAVATION MODAL] Loading calculationSettings:', settings);

      setCalculationSettings({
        defaultDepth: settings.defaultDepth?.default ?? 12,
        wasteFactor: settings.wasteFactor?.default ?? 10,
        compactionFactor: settings.compactionFactor?.default ?? 0,
        roundingRule: settings.roundingRule?.default ?? 'up_whole',
      });
    }
  }, [service, isRefreshing]);

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        setHasUnsavedChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    try {
      console.log('💾 [EXCAVATION MODAL] Saving calculationSettings:', calculationSettings);

      // Update the variables_config with new calculationSettings values
      updateServiceVariables(serviceId, {
        calculationSettings: {
          defaultDepth: {
            ...service?.variables_config?.calculationSettings?.defaultDepth,
            default: calculationSettings.defaultDepth,
          },
          wasteFactor: {
            ...service?.variables_config?.calculationSettings?.wasteFactor,
            default: calculationSettings.wasteFactor,
          },
          compactionFactor: {
            ...service?.variables_config?.calculationSettings?.compactionFactor,
            default: calculationSettings.compactionFactor,
          },
          roundingRule: {
            ...service?.variables_config?.calculationSettings?.roundingRule,
            default: calculationSettings.roundingRule,
          },
        },
      });

      console.log('✅ [EXCAVATION MODAL] Calculation settings saved successfully');
      setHasUnsavedChanges(false);
      onClose();
    } catch (error) {
      console.error('❌ [EXCAVATION MODAL] Failed to save:', error);
      alert('Failed to save configuration. Please try again.');
    }
  };

  const updateSetting = (key: keyof CalculationSettings, value: number | string) => {
    setCalculationSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  if (!isOpen) return null;

  // Get rounding options from variables_config or use defaults
  const roundingOptions = service?.variables_config?.calculationSettings?.roundingRule?.options || {
    up_whole: { label: 'Round up to nearest whole yard', value: 0 },
    up_half: { label: 'Round up to nearest 0.5 yard', value: 0 },
    exact: { label: 'Use exact calculation', value: 0 },
  };

  return (
    <>
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl flex flex-col"
          style={{ backgroundColor: visualConfig.colors.surface }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            className="flex items-center justify-between p-6 border-b flex-shrink-0"
            style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}
          >
            <div>
              <h2 className="text-xl font-semibold" style={{ color: visualConfig.colors.text.primary }}>
                Service Configuration: {serviceName}
              </h2>
              <p className="text-sm mt-1" style={{ color: visualConfig.colors.text.secondary }}>
                {isAdmin
                  ? 'Edit excavation calculation parameters'
                  : 'View current settings (admin access required to edit)'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                  Unsaved changes
                </span>
              )}
              <button
                onClick={handleClose}
                className="p-1 rounded-lg hover:bg-opacity-20 transition-colors"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                <Icons.X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-3" style={{ color: visualConfig.colors.text.primary }}>
                  Calculation Settings
                </h3>
                <p className="text-sm mb-4" style={{ color: visualConfig.colors.text.secondary }}>
                  Core calculation parameters for excavation and removal services.
                </p>
              </div>

              <div className="space-y-6">
                {/* Default Depth */}
                <div className="p-4 rounded-lg border" style={{
                  borderColor: visualConfig.colors.text.secondary + '40',
                  backgroundColor: visualConfig.colors.background
                }}>
                  <NumberInput
                    label="Default Excavation Depth"
                    value={calculationSettings.defaultDepth}
                    onChange={(value) => updateSetting('defaultDepth', value)}
                    unit="inches"
                    min={1}
                    max={36}
                    step={1}
                    isAdmin={isAdmin}
                    visualConfig={visualConfig}
                    description="Standard excavation depth for most jobs"
                  />
                </div>

                {/* Waste Factor */}
                <div className="p-4 rounded-lg border" style={{
                  borderColor: visualConfig.colors.text.secondary + '40',
                  backgroundColor: visualConfig.colors.background
                }}>
                  <NumberInput
                    label="Waste Factor"
                    value={calculationSettings.wasteFactor}
                    onChange={(value) => updateSetting('wasteFactor', value)}
                    unit="%"
                    min={0}
                    max={50}
                    step={5}
                    isAdmin={isAdmin}
                    visualConfig={visualConfig}
                    description="Additional material to account for settling and spillage"
                  />
                </div>

                {/* Compaction Factor */}
                <div className="p-4 rounded-lg border" style={{
                  borderColor: visualConfig.colors.text.secondary + '40',
                  backgroundColor: visualConfig.colors.background
                }}>
                  <NumberInput
                    label="Compaction Factor"
                    value={calculationSettings.compactionFactor}
                    onChange={(value) => updateSetting('compactionFactor', value)}
                    unit="%"
                    min={0}
                    max={50}
                    step={5}
                    isAdmin={isAdmin}
                    visualConfig={visualConfig}
                    description="Soil compaction percentage for volume calculations"
                  />
                </div>

                {/* Rounding Rule */}
                <div className="p-4 rounded-lg border" style={{
                  borderColor: visualConfig.colors.text.secondary + '40',
                  backgroundColor: visualConfig.colors.background
                }}>
                  <SelectInput
                    label="Cubic Yard Rounding"
                    value={calculationSettings.roundingRule}
                    onChange={(value) => updateSetting('roundingRule', value)}
                    options={roundingOptions}
                    isAdmin={isAdmin}
                    visualConfig={visualConfig}
                    description="How to round final cubic yard calculation"
                  />
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 rounded-lg" style={{
                backgroundColor: visualConfig.colors.primary + '10',
                borderLeft: `4px solid ${visualConfig.colors.primary}`
              }}>
                <div className="flex items-start gap-3">
                  <Icons.Info className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: visualConfig.colors.primary }} />
                  <div>
                    <h4 className="text-sm font-medium mb-1" style={{ color: visualConfig.colors.text.primary }}>
                      How These Settings Work
                    </h4>
                    <ul className="text-xs space-y-1" style={{ color: visualConfig.colors.text.secondary }}>
                      <li>• <strong>Default Depth:</strong> Pre-filled excavation depth in the calculator</li>
                      <li>• <strong>Waste Factor:</strong> Adds percentage to account for material loss during excavation</li>
                      <li>• <strong>Compaction Factor:</strong> Adjusts volume for soil compression</li>
                      <li>• <strong>Rounding Rule:</strong> Determines how cubic yards are rounded for pricing</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div
            className="flex items-center justify-between p-6 border-t flex-shrink-0"
            style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}
          >
            <div className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
              {isAdmin
                ? 'Changes will be saved to service configuration'
                : 'Read-only view - admin access required to make changes'}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 border rounded-lg font-medium transition-colors"
                style={{
                  borderColor: visualConfig.colors.text.secondary + '40',
                  color: visualConfig.colors.text.secondary,
                }}
              >
                {isAdmin ? 'Cancel' : 'Close'}
              </button>
              {isAdmin && (
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: visualConfig.colors.primary,
                    color: 'white',
                  }}
                >
                  Save Configuration
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
