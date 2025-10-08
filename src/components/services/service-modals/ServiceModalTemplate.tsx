/**
 * ============================================================================
 * SERVICE MODAL TEMPLATE - UPDATED FOR STANDARDIZED JSONB
 * ============================================================================
 *
 * ⚠️ IMPORTANT: Most services should use DynamicServiceModal instead!
 *
 * DynamicServiceModal automatically:
 * - Reads standardized JSONB variables_config structure
 * - Creates tabs for multi-category services (labor, materials, etc.)
 * - Renders all variable types using improved input components:
 *   * NumberInput - Smooth editing, no auto-zero on delete
 *   * OptionValueEditor - Edit values inside options (equipment costs, etc.)
 *   * ToggleInput - Boolean switches
 * - Handles save/cancel with proper change tracking
 * - All improvements automatically apply to new services!
 *
 * ONLY USE THIS TEMPLATE IF:
 * - You need HIGHLY custom UI that DynamicServiceModal cannot provide
 * - You have complex variable interactions requiring custom logic
 * - You need specialized validation or conditional rendering
 *
 * FOR STANDARD SERVICES (RECOMMENDED):
 * 1. Define your JSONB structure in Supabase with standardized format
 * 2. Add service_id to DynamicServiceModal router in ServiceSpecificsModal.tsx
 * 3. Done! No custom modal needed - gets all improvements automatically!
 *
 * Standardized JSONB Structure:
 * {
 *   "formulaType": "volume_based",
 *   "formulaDescription": "Description here",
 *   "categoryName": {
 *     "label": "Category Label",
 *     "description": "Category description",
 *     "variableName": {
 *       "type": "number|select|slider|toggle",
 *       "label": "Variable Label",
 *       "default": value,
 *       "options": {  // For select types - edit values inside each option
 *         "optionKey": {
 *           "label": "Option Label",
 *           "value": 100,  // Admin edits this in Services Config
 *           "laborPercentage": 20,  // Optional fields
 *           "materialWaste": 15
 *         }
 *       },
 *       "min": 0,
 *       "max": 100,
 *       ...
 *     }
 *   }
 * }
 *
 * ============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useServiceBaseSettings } from '../../../stores/serviceBaseSettingsStore';
import { NumberInput, OptionValueEditor, ToggleInput } from './shared';

interface ServiceSpecificsModalProps {
  isOpen: boolean;
  serviceId: string;
  serviceName: string;
  onClose: () => void;
  visualConfig: any;
  theme: string;
}

/**
 * STEP 1: Define your service's variable structure
 *
 * Create an interface that matches your variables_config JSONB categories.
 * Example: If your service has "calculationSettings" and "materials" categories,
 * create interfaces for each.
 */
interface MyServiceSettings {
  // Replace with your actual variables
  myVariable1: number;
  myVariable2: string;
  myVariable3: number;
}

/**
 * STEP 2: Create the modal component
 *
 * Replace [SERVICE_NAME] with your service name (e.g., "LawnMowing")
 */
export const [SERVICE_NAME]SpecificsModal: React.FC<ServiceSpecificsModalProps> = ({
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

  /**
   * STEP 3: Define state for your service's variables
   *
   * Initialize with default values that match your JSONB structure.
   */
  const [mySettings, setMySettings] = useState<MyServiceSettings>({
    myVariable1: 0, // Replace with actual default
    myVariable2: 'default_value', // Replace with actual default
    myVariable3: 100, // Replace with actual default
  });

  // Refresh services from Supabase when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 [[SERVICE_NAME] MODAL] Modal opened, forcing fresh load from database');
      setIsRefreshing(true);
      refreshServices().then(() => {
        console.log('✅ [[SERVICE_NAME] MODAL] Fresh data loaded from database');
        setIsRefreshing(false);
      });
    }
  }, [isOpen, refreshServices]);

  // Get service using useMemo for reactivity
  const service = useMemo(() => {
    const svc = getService(serviceId);
    console.log('🔍 [[SERVICE_NAME] MODAL] Service retrieved:', {
      found: !!svc,
      serviceId,
      // Add your own debug checks here
    });
    return svc;
  }, [getService, serviceId, services]);

  /**
   * STEP 4: Load values from variables_config JSONB
   *
   * Replace 'myCategoryName' with your actual category name from JSONB.
   * Map the JSONB structure to your state variables.
   */
  useEffect(() => {
    if (!isRefreshing && service?.variables_config?.myCategoryName) {
      const config = service.variables_config.myCategoryName;
      console.log('📝 [[SERVICE_NAME] MODAL] Loading settings:', config);

      setMySettings({
        // Map JSONB defaults to state
        myVariable1: config.myVariable1?.default ?? 0,
        myVariable2: config.myVariable2?.default ?? 'default_value',
        myVariable3: config.myVariable3?.default ?? 100,
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

  /**
   * STEP 5: Implement save handler
   *
   * Update the variables_config with new values.
   * Preserve the full JSONB structure while updating defaults.
   */
  const handleSave = () => {
    try {
      console.log('💾 [[SERVICE_NAME] MODAL] Saving settings:', mySettings);

      // Update the variables_config with new values
      updateServiceVariables(serviceId, {
        myCategoryName: {
          ...service?.variables_config?.myCategoryName,
          myVariable1: {
            ...service?.variables_config?.myCategoryName?.myVariable1,
            default: mySettings.myVariable1,
          },
          myVariable2: {
            ...service?.variables_config?.myCategoryName?.myVariable2,
            default: mySettings.myVariable2,
          },
          myVariable3: {
            ...service?.variables_config?.myCategoryName?.myVariable3,
            default: mySettings.myVariable3,
          },
        },
      });

      console.log('✅ [[SERVICE_NAME] MODAL] Settings saved successfully');
      setHasUnsavedChanges(false);
      onClose();
    } catch (error) {
      console.error('❌ [[SERVICE_NAME] MODAL] Failed to save:', error);
      alert('Failed to save configuration. Please try again.');
    }
  };

  const updateSetting = (key: keyof MyServiceSettings, value: any) => {
    setMySettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  if (!isOpen) return null;

  /**
   * STEP 6: Render your custom modal UI
   *
   * Use NumberInput, SelectInput, or SliderInput components.
   * Customize the layout to fit your service's needs.
   */
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
                  ? 'Edit service-specific parameters'
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
                  My Category Name
                </h3>
                <p className="text-sm mb-4" style={{ color: visualConfig.colors.text.secondary }}>
                  Description of what these settings control
                </p>
              </div>

              {/* EXAMPLE: Render your inputs here */}
              <div className="space-y-6">
                {/* Number Input Example */}
                <div className="p-4 rounded-lg border" style={{
                  borderColor: visualConfig.colors.text.secondary + '40',
                  backgroundColor: visualConfig.colors.background
                }}>
                  <NumberInput
                    label="My Variable 1"
                    value={mySettings.myVariable1}
                    onChange={(value) => updateSetting('myVariable1', value)}
                    unit="units"
                    min={0}
                    max={100}
                    step={1}
                    isAdmin={isAdmin}
                    visualConfig={visualConfig}
                    description="Description of what this variable does"
                  />
                </div>

                {/* Select Input Example */}
                <div className="p-4 rounded-lg border" style={{
                  borderColor: visualConfig.colors.text.secondary + '40',
                  backgroundColor: visualConfig.colors.background
                }}>
                  <SelectInput
                    label="My Variable 2"
                    value={mySettings.myVariable2}
                    onChange={(value) => updateSetting('myVariable2', value)}
                    options={{
                      option1: { label: 'Option 1', value: 0 },
                      option2: { label: 'Option 2', value: 10 },
                    }}
                    isAdmin={isAdmin}
                    visualConfig={visualConfig}
                    description="Choose the appropriate option"
                  />
                </div>

                {/* Slider Input Example */}
                <div className="p-4 rounded-lg border" style={{
                  borderColor: visualConfig.colors.text.secondary + '40',
                  backgroundColor: visualConfig.colors.background
                }}>
                  <SliderInput
                    label="My Variable 3"
                    value={mySettings.myVariable3}
                    onChange={(value) => updateSetting('myVariable3', value)}
                    min={0}
                    max={200}
                    step={5}
                    unit="%"
                    isAdmin={isAdmin}
                    visualConfig={visualConfig}
                    description="Adjust using the slider"
                  />
                </div>
              </div>

              {/* Optional: Info Box */}
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
                      <li>• Explain how your variables affect calculations</li>
                      <li>• Provide guidance on typical values</li>
                      <li>• Note any important relationships between variables</li>
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

/**
 * ============================================================================
 * STEP 7: Add routing to ServiceSpecificsModal.tsx
 * ============================================================================
 *
 * After creating your modal, add it to the router:
 *
 * 1. Import your modal:
 *    import { [SERVICE_NAME]SpecificsModal } from './service-modals/[SERVICE_NAME]SpecificsModal';
 *
 * 2. Add routing condition BEFORE the DynamicServiceModal check:
 *    if (serviceId === 'your_service_id') {
 *      return <[SERVICE_NAME]SpecificsModal {...props} />;
 *    }
 *
 * Current router logic:
 * - Custom modals route first (if you need highly custom UI)
 * - DynamicServiceModal handles paver_patio_sqft and excavation_removal
 * - GenericServiceModal is final fallback
 *
 * REMINDER: Most services work perfectly with DynamicServiceModal!
 * Only create custom modals when absolutely necessary.
 *
 * ============================================================================
 */
