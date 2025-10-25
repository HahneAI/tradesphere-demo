import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../config/industry';
import { useServiceBaseSettings } from '../stores/serviceBaseSettingsStore';
import { ServiceSpecificsModal } from './services/ServiceSpecificsModal';
import { ServiceCard } from './services/ServiceCard';
import { CustomServiceWizard } from './services/wizard/CustomServiceWizard';

interface ServicesPageProps {
  isOpen: boolean;
  onBackClick: () => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ isOpen, onBackClick }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);
  const { services, isLoading, error, updateBaseSetting } = useServiceBaseSettings(user?.company_id, user?.id);

  // Debug logging to help troubleshoot issues
  console.log('[ServicesPage] Render state:', {
    isOpen,
    isLoading,
    error,
    servicesCount: services?.length,
    hasUserId: !!user?.id,
    hasCompanyId: !!user?.company_id
  });

  const [filter, setFilter] = useState('');
  const [editingCell, setEditingCell] = useState<{ serviceId: string, setting: string } | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [specificsModalOpen, setSpecificsModalOpen] = useState<{ serviceId: string; serviceName: string } | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  const isAdmin = user?.is_admin || false;

  const handleCellEdit = (serviceId: string, setting: string, currentValue: number) => {
    if (!isAdmin) return;
    setEditingCell({ serviceId, setting });

    // Handle profit margin display in edit mode
    if (setting === 'businessSettings.profitMarginTarget') {
      setTempValue((currentValue * 100).toFixed(0));
    } else {
      setTempValue(currentValue.toString());
    }
  };

  const handleCellSave = () => {
    if (!editingCell) return;
    let numValue: number;

    // Handle profit margin conversion
    if (editingCell.setting === 'businessSettings.profitMarginTarget') {
      numValue = parseProfitMarginInput(tempValue);
      if (!validateProfitMargin(numValue)) {
        alert('Profit margin must be between 5% and 50%');
        return;
      }
    } else {
      numValue = parseFloat(tempValue);
      if (isNaN(numValue)) return;
    }

    updateBaseSetting(editingCell.serviceId, editingCell.setting, numValue);
    setEditingCell(null);
    setTempValue('');
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setTempValue('');
  };

  const filteredServices = services.filter(service =>
    service.service.toLowerCase().includes(filter.toLowerCase()) ||
    service.category.toLowerCase().includes(filter.toLowerCase())
  );

  // Don't render if not open
  if (!isOpen) return null;

  // Wrap loading and error states in proper full-page container
  if (isLoading || error) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: visualConfig.colors.background }}>
        <div className="flex-1 flex items-center justify-center p-8">
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2"
                   style={{ borderColor: visualConfig.colors.primary }}></div>
              <span className="ml-3" style={{ color: visualConfig.colors.text.primary }}>
                Loading services...
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-lg border-l-4 bg-red-50 border-red-400 max-w-2xl">
              <div className="flex items-center">
                <Icons.AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-800 font-medium">Error loading services</span>
              </div>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <button
                onClick={onBackClick}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const formatProfitMarginDisplay = (value: number) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  const parseProfitMarginInput = (input: string): number => {
    // Remove % if present and convert to decimal
    const cleanInput = input.replace('%', '');
    const percentage = parseFloat(cleanInput);
    return percentage / 100;
  };

  const validateProfitMargin = (value: number): boolean => {
    const percentage = value * 100;
    return percentage >= 5 && percentage <= 50;
  };

  const EditableCell = ({
    serviceId,
    setting,
    value,
    unit,
    validation,
    isProfitMargin = false
  }: {
    serviceId: string;
    setting: string;
    value: number;
    unit: string;
    validation?: { min: number; max: number; step: number };
    isProfitMargin?: boolean;
  }) => {
    const isEditing = editingCell?.serviceId === serviceId && editingCell?.setting === setting;
    
    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCellSave();
              if (e.key === 'Escape') handleCellCancel();
            }}
            min={validation?.min}
            max={validation?.max}
            step={validation?.step}
            className="w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2"
            style={{
              backgroundColor: visualConfig.colors.surface,
              borderColor: theme === 'light' ? '#e5e7eb' : '#374151',
              color: visualConfig.colors.text.primary
            }}
            autoFocus
          />
          <button onClick={handleCellSave} className="text-green-600 hover:text-green-800">
            <Icons.Check className="h-4 w-4" />
          </button>
          <button onClick={handleCellCancel} className="text-red-600 hover:text-red-800">
            <Icons.X className="h-4 w-4" />
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => handleCellEdit(serviceId, setting, value)}
        className="text-left hover:bg-opacity-10 p-1 rounded transition-colors"
        style={{ color: visualConfig.colors.text.primary }}
        disabled={!isAdmin}
      >
        {isProfitMargin ? formatProfitMarginDisplay(value) : `${value} ${unit}`}
        {isAdmin && <Icons.Edit2 className="h-3 w-3 ml-1 inline opacity-40" />}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: visualConfig.colors.background }}>
      {/* Header */}
      <div className="flex flex-col gap-3 p-4 md:p-6 border-b"
           style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}>
        {/* Title Row - Always horizontal */}
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          {/* Back button - inline with title */}
          <button
            onClick={onBackClick}
            className="flex items-center gap-1.5 px-2 md:px-3 h-10 md:h-11 min-h-[40px] md:min-h-[44px] rounded-lg transition-all duration-150 hover:bg-opacity-80 active:scale-95 flex-shrink-0"
            style={{
              color: visualConfig.colors.text.secondary,
              backgroundColor: 'transparent'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Icons.ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
            <span className="text-xs md:text-sm">Dashboard</span>
          </button>

          <Icons.ChevronRight className="h-4 w-4 hidden md:block flex-shrink-0" style={{ color: visualConfig.colors.text.secondary }} />

          {/* Title and info */}
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <h1 className="text-lg md:text-2xl font-bold truncate" style={{ color: visualConfig.colors.text.primary }}>
              <span className="md:hidden">Services Config</span>
              <span className="hidden md:inline">Services Configuration</span>
            </h1>
            <div className="flex items-center gap-2 text-xs md:text-sm" style={{ color: visualConfig.colors.text.secondary }}>
              <Icons.Database className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span>{filteredServices.length} services</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">Edit baseline values for your company</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Row - Horizontal scroll on mobile */}
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
          {/* Filter Input */}
          <div className="relative flex-shrink-0 w-40 md:w-auto">
            <Icons.Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4"
                          style={{ color: visualConfig.colors.text.secondary }} />
            <input
              type="text"
              placeholder="Search..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-8 md:pl-10 pr-3 md:pr-4 h-10 md:h-11 min-h-[40px] md:min-h-[44px] border rounded-lg focus:outline-none focus:ring-2 transition-all text-xs md:text-sm w-full"
              style={{
                backgroundColor: visualConfig.colors.surface,
                borderColor: theme === 'light' ? '#e5e7eb' : '#374151',
                color: visualConfig.colors.text.primary,
                '--tw-ring-color': visualConfig.colors.primary
              }}
            />
          </div>

          {/* Create Custom Service Button - Only for Admins */}
          {isAdmin && (
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-1.5 px-3 md:px-4 h-10 md:h-11 min-h-[40px] md:min-h-[44px] rounded-lg font-medium transition-all duration-150 active:scale-[0.97] flex-shrink-0 whitespace-nowrap"
              style={{
                backgroundColor: visualConfig.colors.primary,
                color: 'white'
              }}
            >
              <Icons.Plus className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-xs md:text-sm">Create Custom Service</span>
            </button>
          )}

          {/* Sort Button */}
          <button className="flex items-center gap-1.5 px-3 md:px-4 h-10 md:h-11 min-h-[40px] md:min-h-[44px] border rounded-lg transition-all duration-150 active:scale-95 flex-shrink-0"
                  style={{
                    borderColor: theme === 'light' ? '#e5e7eb' : '#374151',
                    color: visualConfig.colors.text.primary
                  }}>
            <Icons.ArrowUpDown className="h-4 w-4" />
            <span className="hidden md:inline text-sm">Sort</span>
          </button>
        </div>
      </div>

      {/* Mobile Card Layout (< 768px) */}
      <div className="block md:hidden flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.serviceId}
              service={service}
              visualConfig={visualConfig}
              theme={theme}
              isAdmin={isAdmin}
              updateBaseSetting={updateBaseSetting}
              onOpenSpecifics={(serviceId, serviceName) => setSpecificsModalOpen({ serviceId, serviceName })}
            />
          ))}
        </div>
      </div>

      {/* Desktop Table Layout (>= 768px) */}
      <div className="hidden md:block flex-1 overflow-auto">
        <table className="w-full">
          <thead style={{ backgroundColor: theme === 'light' ? '#f9fafb' : '#1f2937' }}>
            <tr>
              <th className="px-3 py-2 text-center text-sm font-medium border-b"
                  style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}>
                Service Name
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium border-b"
                  style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}>
                Category
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium border-b"
                  style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}>
                Base Rate
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium border-b"
                  style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}>
                Optimal Team Size
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium border-b"
                  style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}>
                Base Productivity
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium border-b"
                  style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}>
                Material Cost
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium border-b"
                  style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}>
                Profit Margin
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium border-b"
                  style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}>
                Status
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium border-b"
                  style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}>
                Configuration
              </th>
            </tr>
          </thead>
          
          <tbody>
            {filteredServices.map((service) => (
              <tr key={service.serviceId} 
                  className="hover:bg-opacity-10 transition-colors"
                  style={{ 
                    borderBottom: `1px solid ${theme === 'light' ? '#e5e7eb' : '#374151'}`
                  }}>
                <td className="px-3 py-2 text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
                  {service.service}
                </td>
                <td className="px-3 py-2 text-sm" style={{ color: visualConfig.colors.text.primary }}>
                  {service.category}
                </td>
                <td className="px-3 py-2">
                  <EditableCell
                    serviceId={service.serviceId}
                    setting="laborSettings.hourlyLaborRate"
                    value={service.baseSettings.laborSettings.hourlyLaborRate.value}
                    unit={service.baseSettings.laborSettings.hourlyLaborRate.unit}
                    validation={service.baseSettings.laborSettings.hourlyLaborRate.validation}
                  />
                </td>
                <td className="px-3 py-2 text-sm">
                  <EditableCell
                    serviceId={service.serviceId}
                    setting="laborSettings.optimalTeamSize"
                    value={service.baseSettings.laborSettings.optimalTeamSize.value}
                    unit={service.baseSettings.laborSettings.optimalTeamSize.unit}
                    validation={service.baseSettings.laborSettings.optimalTeamSize.validation}
                  />
                </td>
                <td className="px-3 py-2 text-sm">
                  <EditableCell
                    serviceId={service.serviceId}
                    setting="laborSettings.baseProductivity"
                    value={service.baseSettings.laborSettings.baseProductivity.value}
                    unit={service.baseSettings.laborSettings.baseProductivity.unit}
                    validation={service.baseSettings.laborSettings.baseProductivity.validation}
                  />
                </td>
                <td className="px-3 py-2 text-sm">
                  {(() => {
                    // Dynamically get first material setting key (different per service)
                    const materialSettingKey = Object.keys(service.baseSettings.materialSettings)[0];
                    const materialSetting = service.baseSettings.materialSettings[materialSettingKey];

                    return (
                      <EditableCell
                        serviceId={service.serviceId}
                        setting={`materialSettings.${materialSettingKey}`}
                        value={materialSetting.value}
                        unit={materialSetting.unit}
                        validation={materialSetting.validation}
                      />
                    );
                  })()}
                </td>
                <td className="px-3 py-2 text-sm">
                  <EditableCell
                    serviceId={service.serviceId}
                    setting="businessSettings.profitMarginTarget"
                    value={service.baseSettings.businessSettings.profitMarginTarget.value}
                    unit={service.baseSettings.businessSettings.profitMarginTarget.unit}
                    validation={service.baseSettings.businessSettings.profitMarginTarget.validation}
                    isProfitMargin={true}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <div className="w-2 h-2 rounded-full mr-1 bg-green-400" />
                    Active
                  </div>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => setSpecificsModalOpen({
                      serviceId: service.serviceId,
                      serviceName: service.service
                    })}
                    className="flex items-center gap-2 px-4 h-11 min-h-[44px] text-sm rounded-lg border transition-all duration-150 hover:bg-opacity-10 active:scale-[0.97]"
                    style={{
                      borderColor: visualConfig.colors.primary,
                      color: visualConfig.colors.primary
                    }}
                  >
                    <Icons.Settings className="h-5 w-5" />
                    Open Specifics
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Service Specifics Modal */}
      {specificsModalOpen && (
        <ServiceSpecificsModal
          isOpen={!!specificsModalOpen}
          serviceId={specificsModalOpen.serviceId}
          serviceName={specificsModalOpen.serviceName}
          onClose={() => setSpecificsModalOpen(null)}
          visualConfig={visualConfig}
          theme={theme}
        />
      )}

      {/* Custom Service Creation Wizard */}
      <CustomServiceWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        companyId={user?.company_id || ''}
        visualConfig={visualConfig}
      />
    </div>
  );
};