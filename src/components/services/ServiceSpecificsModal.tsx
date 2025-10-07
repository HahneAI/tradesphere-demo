import React, { useState, useEffect, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useServiceBaseSettings } from '../../stores/serviceBaseSettingsStore';

interface ServiceSpecificsModalProps {
  isOpen: boolean;
  serviceId: string;
  serviceName: string;
  onClose: () => void;
  visualConfig: any;
  theme: string;
}

// Define NumberInput as a separate component to prevent re-creation and focus loss
interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  isAdmin: boolean;
  visualConfig: any;
}

const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  unit = '',
  min = 0,
  max = 1000,
  step = 1,
  isAdmin,
  visualConfig
}) => (
  <div className="space-y-1">
    <label className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
      {label}
    </label>
    <div className="flex items-center space-x-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        disabled={!isAdmin}
        className={`flex-1 p-2 border rounded-lg text-sm ${!isAdmin ? 'cursor-not-allowed opacity-60' : ''}`}
        style={{
          backgroundColor: visualConfig.colors.surface,
          borderColor: visualConfig.colors.text.secondary + '40',
          color: visualConfig.colors.text.primary,
        }}
      />
      {unit && (
        <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
          {unit}
        </span>
      )}
    </div>
  </div>
);

export const ServiceSpecificsModal: React.FC<ServiceSpecificsModalProps> = ({
  isOpen,
  serviceId,
  serviceName,
  onClose,
  visualConfig,
  theme,
}) => {
  const { user } = useAuth();
  const { getService, updateServiceVariables, refreshServices, services } = useServiceBaseSettings(user?.company_id);
  const [activeTab, setActiveTab] = useState<'equipment' | 'cutting' | 'labor' | 'materials' | 'complexity' | 'obstacles'>('equipment');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAdmin = user?.is_admin || false;

  // Equipment state
  const [equipmentCosts, setEquipmentCosts] = useState({
    handTools: 0,
    attachments: 125,
    lightMachinery: 250,
    heavyMachinery: 350,
  });

  // Cutting complexity state
  const [cuttingComplexity, setCuttingComplexity] = useState({
    minimal: { laborPercentage: 0, materialWaste: 0 },
    moderate: { laborPercentage: 20, materialWaste: 15 },
    complex: { laborPercentage: 30, materialWaste: 25 },
  });

  // Other variable states
  const [laborMultipliers, setLaborMultipliers] = useState({
    tearoutGrass: 0,
    tearoutConcrete: 20,
    tearoutAsphalt: 30,
    accessEasy: 0,
    accessModerate: 50,
    accessDifficult: 100,
    teamTwoPerson: 40,
    teamThreePlus: 0,
  });

  const [materialSettings, setMaterialSettings] = useState({
    standardGrade: 0,
    premiumGrade: 20,
  });

  // Complexity state - FIXED: Store as percentages (0, 10, 30, 50) not multipliers
  const [complexitySettings, setComplexitySettings] = useState({
    simple: 0,
    standard: 10,
    complex: 30,
    extreme: 50
  });

  // Obstacle removal state - flat dollar amounts
  const [obstacleSettings, setObstacleSettings] = useState({
    none: 0,
    minor: 500,
    major: 1000,
  });

  // CRITICAL FIX: Refresh services from Supabase when modal opens with loading state
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 [SPECIFICS MODAL] Modal opened, forcing fresh load from database (bypassing all caches)');
      setIsRefreshing(true);
      refreshServices().then(() => {
        console.log('✅ [SPECIFICS MODAL] Fresh data loaded from database, loading values now');
        setIsRefreshing(false);
      });
    }
  }, [isOpen, refreshServices]);

  // Use useMemo to ensure proper reactivity when services state updates
  const service = useMemo(() => {
    const svc = getService(serviceId);
    console.log('🔍 [SPECIFICS MODAL] Service retrieved:', {
      found: !!svc,
      serviceId,
      hasEquipment: !!svc?.variables?.excavation?.equipmentRequired,
      lightMachineryValue: svc?.variables?.excavation?.equipmentRequired?.options?.lightMachinery?.value
    });
    return svc;
  }, [getService, serviceId, services]);

  // Load values only AFTER refresh completes to avoid race condition
  useEffect(() => {
    if (!isRefreshing && service && service.variables) {
      console.log('📝 [SPECIFICS MODAL] Loading fresh service variables:', {
        serviceId,
        isRefreshing,
        hasPremiumValue: !!service.variables.materials?.paverStyle?.options?.premium?.value,
        premiumValue: service.variables.materials?.paverStyle?.options?.premium?.value,
        premiumMultiplier: service.variables.materials?.paverStyle?.options?.premium?.multiplier,
        lightMachineryValue: service.variables.excavation?.equipmentRequired?.options?.lightMachinery?.value
      });

      // Load current values from service configuration
      const vars = service.variables;

      console.log('📊 [MODAL LOAD] DATA SOURCE: Loading from fresh Supabase query (not cache, not JSON)');

      // Load equipment costs
      if (vars.excavation?.equipmentRequired?.options) {
        const equipmentOptions = vars.excavation.equipmentRequired.options;
        const loadedCosts = {
          handTools: equipmentOptions.handTools?.value || 0,
          attachments: equipmentOptions.attachments?.value || 125,
          lightMachinery: equipmentOptions.lightMachinery?.value || 250,
          heavyMachinery: equipmentOptions.heavyMachinery?.value || 350,
        };
        console.log('🔧 [MODAL LOAD] Equipment costs from DATABASE:', {
          dataSource: 'Supabase service_pricing_configs table',
          fromDatabase: {
            handTools: equipmentOptions.handTools?.value,
            attachments: equipmentOptions.attachments?.value,
            lightMachinery: equipmentOptions.lightMachinery?.value,
            heavyMachinery: equipmentOptions.heavyMachinery?.value,
          },
          afterDefaults: loadedCosts
        });
        setEquipmentCosts(loadedCosts);
      }

      // Load cutting complexity
      if (vars.materials?.cuttingComplexity?.options) {
        const cuttingOptions = vars.materials.cuttingComplexity.options;
        setCuttingComplexity({
          minimal: {
            laborPercentage: cuttingOptions.minimal?.laborPercentage || 0,
            materialWaste: cuttingOptions.minimal?.materialWaste || 0,
          },
          moderate: {
            laborPercentage: cuttingOptions.moderate?.laborPercentage || 20,
            materialWaste: cuttingOptions.moderate?.materialWaste || 15,
          },
          complex: {
            laborPercentage: cuttingOptions.complex?.laborPercentage || 30,
            materialWaste: cuttingOptions.complex?.materialWaste || 25,
          },
        });
      }

      // Load labor multipliers
      if (vars.excavation?.tearoutComplexity?.options && vars.siteAccess?.accessDifficulty?.options && vars.labor?.teamSize?.options) {
        setLaborMultipliers({
          tearoutGrass: vars.excavation.tearoutComplexity.options.grass?.value || 0,
          tearoutConcrete: vars.excavation.tearoutComplexity.options.concrete?.value || 20,
          tearoutAsphalt: vars.excavation.tearoutComplexity.options.asphalt?.value || 30,
          accessEasy: vars.siteAccess.accessDifficulty.options.easy?.value || 0,
          accessModerate: vars.siteAccess.accessDifficulty.options.moderate?.value || 50,
          accessDifficult: vars.siteAccess.accessDifficulty.options.difficult?.value || 100,
          teamTwoPerson: vars.labor.teamSize.options.twoPerson?.value || 40,
          teamThreePlus: vars.labor.teamSize.options.threePlus?.value || 0,
        });
      }

      // Load material settings
      if (vars.materials?.paverStyle?.options) {
        setMaterialSettings({
          standardGrade: vars.materials.paverStyle.options.standard?.value || 0,
          premiumGrade: vars.materials.paverStyle.options.premium?.value || 20,
        });
      }

      // Load complexity settings - FIXED: Load as percentages (value field) not multipliers
      if (vars.complexity?.overallComplexity?.options) {
        const complexityOptions = vars.complexity.overallComplexity.options;
        setComplexitySettings({
          simple: complexityOptions.simple?.value ?? 0,
          standard: complexityOptions.standard?.value ?? 10,
          complex: complexityOptions.complex?.value ?? 30,
          extreme: complexityOptions.extreme?.value ?? 50,
        });
      }

      // Load obstacle removal settings
      if (vars.siteAccess?.obstacleRemoval?.options) {
        const obstacleOptions = vars.siteAccess.obstacleRemoval.options;
        setObstacleSettings({
          none: obstacleOptions.none?.value ?? 0,
          minor: obstacleOptions.minor?.value ?? 500,
          major: obstacleOptions.major?.value ?? 1000,
        });
      }
    }
  }, [service, serviceId, isRefreshing]);

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
      console.log('🔧 [MODAL SAVE] Saving equipment costs:', equipmentCosts);
      updateServiceVariables(serviceId, {
        equipmentCosts,
        cuttingComplexity,
        laborMultipliers,
        materialSettings,
        complexitySettings,
        obstacleSettings,
      });
      console.log('✅ Service variables saved successfully');
      setHasUnsavedChanges(false);
      onClose();
    } catch (error) {
      console.error('Failed to save service variables:', error);
      alert('Failed to save configuration. Please try again.');
    }
  };

  const updateEquipmentCost = (equipment: string, cost: number) => {
    setEquipmentCosts(prev => ({ ...prev, [equipment]: cost }));
    setHasUnsavedChanges(true);
  };

  const updateCuttingComplexity = (level: string, field: string, value: number) => {
    setCuttingComplexity(prev => ({
      ...prev,
      [level]: {
        ...prev[level],
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const updateLaborMultiplier = (key: string, value: number) => {
    setLaborMultipliers(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const updateMaterialSetting = (key: string, value: number) => {
    setMaterialSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const updateComplexitySettings = (key: string, value: number) => {
    setComplexitySettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const updateObstacleSetting = (key: string, value: number) => {
    setObstacleSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  if (!isOpen) return null;

  const tabs = [
    { key: 'equipment' as const, label: 'Equipment Costs', icon: Icons.Wrench },
    { key: 'cutting' as const, label: 'Cutting Complexity', icon: Icons.Scissors },
    { key: 'labor' as const, label: 'Labor Factors', icon: Icons.Users },
    { key: 'materials' as const, label: 'Material Settings', icon: Icons.Package },
    { key: 'complexity' as const, label: 'Project Complexity', icon: Icons.Settings },
    { key: 'obstacles' as const, label: 'Obstacle Costs', icon: Icons.AlertTriangle },
  ];

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
                  ? 'Edit detailed variables and pricing factors'
                  : 'View current variable settings (admin access required to edit)'}
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

          {/* Tab Navigation */}
          <div
            className="flex border-b flex-shrink-0"
            style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}
          >
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.key ? 'border-current' : 'border-transparent'
                }`}
                style={{
                  color: activeTab === tab.key
                    ? visualConfig.colors.primary
                    : visualConfig.colors.text.secondary
                }}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Equipment Costs Tab */}
            {activeTab === 'equipment' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3" style={{ color: visualConfig.colors.text.primary }}>
                    Daily Equipment Costs
                  </h3>
                  <p className="text-sm mb-4" style={{ color: visualConfig.colors.text.secondary }}>
                    Set the daily rental/depreciation costs for different equipment categories.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <NumberInput
                    key="handTools"
                    label="Hand Tools Only"
                    value={equipmentCosts.handTools}
                    onChange={(value) => updateEquipmentCost('handTools', value)}
                    unit="$/day"
                    min={0}
                    max={100}
                    step={5}
                    isAdmin={isAdmin}
                    visualConfig={visualConfig}
                  />
                  <NumberInput
                    key="attachments"
                    label="Attachments/Jackhammers"
                    value={equipmentCosts.attachments}
                    onChange={(value) => updateEquipmentCost('attachments', value)}
                    unit="$/day"
                    min={0}
                    max={500}
                    step={25}
                    isAdmin={isAdmin}
                    visualConfig={visualConfig}
                  />
                  <NumberInput
                    key="lightMachinery"
                    label="Light Machinery"
                    value={equipmentCosts.lightMachinery}
                    onChange={(value) => updateEquipmentCost('lightMachinery', value)}
                    unit="$/day"
                    min={0}
                    max={1000}
                    step={25}
                    isAdmin={isAdmin}
                    visualConfig={visualConfig}
                  />
                  <NumberInput
                    key="heavyMachinery"
                    label="Heavy Machinery"
                    value={equipmentCosts.heavyMachinery}
                    onChange={(value) => updateEquipmentCost('heavyMachinery', value)}
                    unit="$/day"
                    min={0}
                    max={1000}
                    step={25}
                    isAdmin={isAdmin}
                    visualConfig={visualConfig}
                  />
                </div>
              </div>
            )}

            {/* Cutting Complexity Tab */}
            {activeTab === 'cutting' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3" style={{ color: visualConfig.colors.text.primary }}>
                    Cutting Complexity Settings
                  </h3>
                  <p className="text-sm mb-4" style={{ color: visualConfig.colors.text.secondary }}>
                    Configure labor hour percentages (% of base hours) and material waste for different cutting complexity levels.
                  </p>
                </div>

                <div className="space-y-6">
                  {(['minimal', 'moderate', 'complex'] as const).map(level => (
                    <div key={level} className="p-4 rounded-lg border" style={{
                      borderColor: visualConfig.colors.text.secondary + '40',
                      backgroundColor: visualConfig.colors.background
                    }}>
                      <h4 className="text-md font-medium mb-3 capitalize" style={{ color: visualConfig.colors.text.primary }}>
                        {level} Cutting
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <NumberInput
                          key={`${level}-laborPercentage`}
                          label="Labor Hour Percentage"
                          value={cuttingComplexity[level].laborPercentage}
                          onChange={(value) => updateCuttingComplexity(level, 'laborPercentage', value)}
                          unit="%"
                          min={0}
                          max={50}
                          step={5}
                          isAdmin={isAdmin}
                          visualConfig={visualConfig}
                        />
                        <NumberInput
                          key={`${level}-materialWaste`}
                          label="Material Waste"
                          value={cuttingComplexity[level].materialWaste}
                          onChange={(value) => updateCuttingComplexity(level, 'materialWaste', value)}
                          unit="%"
                          min={0}
                          max={50}
                          step={5}
                          isAdmin={isAdmin}
                          visualConfig={visualConfig}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Labor Factors Tab */}
            {activeTab === 'labor' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3" style={{ color: visualConfig.colors.text.primary }}>
                    Labor Time Multipliers
                  </h3>
                  <p className="text-sm mb-4" style={{ color: visualConfig.colors.text.secondary }}>
                    Percentage multipliers that affect base labor time calculations.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Tearout Complexity */}
                  <div className="p-4 rounded-lg border" style={{
                    borderColor: visualConfig.colors.text.secondary + '40',
                    backgroundColor: visualConfig.colors.background
                  }}>
                    <h4 className="text-md font-medium mb-3" style={{ color: visualConfig.colors.text.primary }}>
                      Tearout Complexity
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <NumberInput
                        key="tearoutGrass"
                        label="Grass/Sod Only"
                        value={laborMultipliers.tearoutGrass}
                        onChange={(value) => updateLaborMultiplier('tearoutGrass', value)}
                        unit="%"
                        min={0}
                        max={100}
                        step={5}
                        isAdmin={isAdmin}
                        visualConfig={visualConfig}
                      />
                      <NumberInput
                        key="tearoutConcrete"
                        label="Concrete/Pavement"
                        value={laborMultipliers.tearoutConcrete}
                        onChange={(value) => updateLaborMultiplier('tearoutConcrete', value)}
                        unit="%"
                        min={0}
                        max={100}
                        step={5}
                        isAdmin={isAdmin}
                        visualConfig={visualConfig}
                      />
                      <NumberInput
                        key="tearoutAsphalt"
                        label="Heavy Asphalt"
                        value={laborMultipliers.tearoutAsphalt}
                        onChange={(value) => updateLaborMultiplier('tearoutAsphalt', value)}
                        unit="%"
                        min={0}
                        max={100}
                        step={5}
                        isAdmin={isAdmin}
                        visualConfig={visualConfig}
                      />
                    </div>
                  </div>

                  {/* Access Difficulty */}
                  <div className="p-4 rounded-lg border" style={{
                    borderColor: visualConfig.colors.text.secondary + '40',
                    backgroundColor: visualConfig.colors.background
                  }}>
                    <h4 className="text-md font-medium mb-3" style={{ color: visualConfig.colors.text.primary }}>
                      Access Difficulty
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <NumberInput
                        key="accessEasy"
                        label="Easy Access"
                        value={laborMultipliers.accessEasy}
                        onChange={(value) => updateLaborMultiplier('accessEasy', value)}
                        unit="%"
                        min={0}
                        max={200}
                        step={10}
                        isAdmin={isAdmin}
                        visualConfig={visualConfig}
                      />
                      <NumberInput
                        key="accessModerate"
                        label="Moderate Access"
                        value={laborMultipliers.accessModerate}
                        onChange={(value) => updateLaborMultiplier('accessModerate', value)}
                        unit="%"
                        min={0}
                        max={200}
                        step={10}
                        isAdmin={isAdmin}
                        visualConfig={visualConfig}
                      />
                      <NumberInput
                        key="accessDifficult"
                        label="Difficult Access"
                        value={laborMultipliers.accessDifficult}
                        onChange={(value) => updateLaborMultiplier('accessDifficult', value)}
                        unit="%"
                        min={0}
                        max={200}
                        step={10}
                        isAdmin={isAdmin}
                        visualConfig={visualConfig}
                      />
                    </div>
                  </div>

                  {/* Team Size */}
                  <div className="p-4 rounded-lg border" style={{
                    borderColor: visualConfig.colors.text.secondary + '40',
                    backgroundColor: visualConfig.colors.background
                  }}>
                    <h4 className="text-md font-medium mb-3" style={{ color: visualConfig.colors.text.primary }}>
                      Team Size Factors
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberInput
                        key="teamTwoPerson"
                        label="Two Person Team"
                        value={laborMultipliers.teamTwoPerson}
                        onChange={(value) => updateLaborMultiplier('teamTwoPerson', value)}
                        unit="%"
                        min={0}
                        max={100}
                        step={5}
                        isAdmin={isAdmin}
                        visualConfig={visualConfig}
                      />
                      <NumberInput
                        key="teamThreePlus"
                        label="Three+ Person Team"
                        value={laborMultipliers.teamThreePlus}
                        onChange={(value) => updateLaborMultiplier('teamThreePlus', value)}
                        unit="%"
                        min={0}
                        max={100}
                        step={5}
                        isAdmin={isAdmin}
                        visualConfig={visualConfig}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Materials Tab */}
            {activeTab === 'materials' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3" style={{ color: visualConfig.colors.text.primary }}>
                    Material Cost Multipliers
                  </h3>
                  <p className="text-sm mb-4" style={{ color: visualConfig.colors.text.secondary }}>
                    Percentage multipliers for material costs based on paver quality grade.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Paver Quality */}
                  <div className="p-4 rounded-lg border" style={{
                    borderColor: visualConfig.colors.text.secondary + '40',
                    backgroundColor: visualConfig.colors.background
                  }}>
                    <h4 className="text-md font-medium mb-3" style={{ color: visualConfig.colors.text.primary }}>
                      Paver Quality
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberInput
                        key="standardGrade"
                        label="Standard Grade"
                        value={materialSettings.standardGrade}
                        onChange={(value) => updateMaterialSetting('standardGrade', value)}
                        unit="%"
                        min={0}
                        max={100}
                        step={5}
                        isAdmin={isAdmin}
                        visualConfig={visualConfig}
                      />
                      <NumberInput
                        key="premiumGrade"
                        label="Premium Grade"
                        value={materialSettings.premiumGrade}
                        onChange={(value) => updateMaterialSetting('premiumGrade', value)}
                        unit="%"
                        min={0}
                        max={100}
                        step={5}
                        isAdmin={isAdmin}
                        visualConfig={visualConfig}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Complexity Tab */}
            {activeTab === 'complexity' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3" style={{ color: visualConfig.colors.text.primary }}>
                    Overall Project Complexity Multiplier
                  </h3>
                  <p className="text-sm mb-4" style={{ color: visualConfig.colors.text.secondary }}>
                    Final multiplier applied to total project cost. Choose from 4 complexity levels based on project requirements.
                  </p>
                </div>

                <div className="p-4 rounded-lg border" style={{
                  borderColor: visualConfig.colors.text.secondary + '40',
                  backgroundColor: visualConfig.colors.background
                }}>
                  <h4 className="text-md font-medium mb-3" style={{ color: visualConfig.colors.text.primary }}>
                    Complexity Level Settings
                  </h4>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <NumberInput
                        label="Simple Project"
                        value={complexitySettings.simple}
                        onChange={(value) => updateComplexitySettings('simple', value)}
                        unit="%"
                        min={0}
                        max={20}
                        step={5}
                        isAdmin={isAdmin}
                        visualConfig={visualConfig}
                      />
                      <NumberInput
                        label="Standard Project"
                        value={complexitySettings.standard}
                        onChange={(value) => updateComplexitySettings('standard', value)}
                        unit="%"
                        min={0}
                        max={30}
                        step={5}
                        isAdmin={isAdmin}
                        visualConfig={visualConfig}
                      />
                      <NumberInput
                        label="Complex Project"
                        value={complexitySettings.complex}
                        onChange={(value) => updateComplexitySettings('complex', value)}
                        unit="%"
                        min={20}
                        max={50}
                        step={5}
                        isAdmin={isAdmin}
                        visualConfig={visualConfig}
                      />
                      <NumberInput
                        label="Extreme Complexity"
                        value={complexitySettings.extreme}
                        onChange={(value) => updateComplexitySettings('extreme', value)}
                        unit="%"
                        min={30}
                        max={100}
                        step={5}
                        isAdmin={isAdmin}
                        visualConfig={visualConfig}
                      />
                    </div>

                    <div className="mt-4 p-3 rounded" style={{ backgroundColor: visualConfig.colors.background }}>
                      <h5 className="text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
                        Complexity Level Descriptions
                      </h5>
                      <div className="space-y-2 text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                        <div>• <strong>Simple (0% increase)</strong> - Straightforward rectangular patio, baseline pricing</div>
                        <div>• <strong>Standard (10% increase)</strong> - Typical patio with some features</div>
                        <div>• <strong>Complex (30% increase)</strong> - Multiple levels, curves, or features</div>
                        <div>• <strong>Extreme (50% increase)</strong> - Highly complex design with multiple challenges</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Obstacles Tab */}
            {activeTab === 'obstacles' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3" style={{ color: visualConfig.colors.text.primary }}>
                    Obstacle Removal Costs
                  </h3>
                  <p className="text-sm mb-4" style={{ color: visualConfig.colors.text.secondary }}>
                    Flat additional costs for obstacle removal at job site.
                  </p>
                </div>

                <div className="p-4 rounded-lg border" style={{
                  borderColor: visualConfig.colors.text.secondary + '40',
                  backgroundColor: visualConfig.colors.background
                }}>
                  <h4 className="text-md font-medium mb-3" style={{ color: visualConfig.colors.text.primary }}>
                    Obstacle Removal Levels
                  </h4>

                  <div className="grid grid-cols-3 gap-4">
                    <NumberInput
                      label="No Obstacles"
                      value={obstacleSettings.none}
                      onChange={(value) => updateObstacleSetting('none', value)}
                      unit="$"
                      min={0}
                      max={500}
                      step={50}
                      isAdmin={isAdmin}
                      visualConfig={visualConfig}
                    />
                    <NumberInput
                      label="Minor Obstacles"
                      value={obstacleSettings.minor}
                      onChange={(value) => updateObstacleSetting('minor', value)}
                      unit="$"
                      min={0}
                      max={2000}
                      step={100}
                      isAdmin={isAdmin}
                      visualConfig={visualConfig}
                    />
                    <NumberInput
                      label="Major Obstacles"
                      value={obstacleSettings.major}
                      onChange={(value) => updateObstacleSetting('major', value)}
                      unit="$"
                      min={0}
                      max={5000}
                      step={250}
                      isAdmin={isAdmin}
                      visualConfig={visualConfig}
                    />
                  </div>

                  <div className="mt-4 p-3 rounded" style={{ backgroundColor: visualConfig.colors.background }}>
                    <h5 className="text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
                      Obstacle Level Descriptions
                    </h5>
                    <div className="space-y-2 text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                      <div>• <strong>No Obstacles ($0)</strong> - Clear site, no obstructions</div>
                      <div>• <strong>Minor Obstacles ($500)</strong> - Small items, minor landscaping, simple removal</div>
                      <div>• <strong>Major Obstacles ($1000)</strong> - Large structures, trees, complex removal work</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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