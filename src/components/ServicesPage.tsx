import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../config/industry';
import { useServiceBaseSettings } from '../stores/serviceBaseSettingsStore';
import { ServiceSpecificsModal } from './services/ServiceSpecificsModal';
import { serviceConfigManager } from '../services/ServiceConfigManager';

interface ServicesPageProps {
  onBackClick: () => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ onBackClick }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);
  const { services, isLoading, error, updateBaseSetting } = useServiceBaseSettings(user?.company_id);
  
  const [filter, setFilter] = useState('');
  const [editingCell, setEditingCell] = useState<{ serviceId: string, setting: string } | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [specificsModalOpen, setSpecificsModalOpen] = useState<{ serviceId: string; serviceName: string } | null>(null);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" 
             style={{ borderColor: visualConfig.colors.primary }}></div>
        <span className="ml-3" style={{ color: visualConfig.colors.text.primary }}>
          Loading services...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg border-l-4 bg-red-50 border-red-400">
        <div className="flex items-center">
          <Icons.AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800 font-medium">Error loading services</span>
        </div>
        <p className="text-red-700 text-sm mt-1">{error}</p>
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

  const handleInsertService = async () => {
    console.log('➕ [INSERT SERVICE] Button clicked');

    // For now: Test with hardcoded service to verify ServiceConfigManager works
    const testServiceId = 'lawn_mowing_sqft';
    const testServiceName = 'Lawn Mowing';
    const testCategory = 'Lawn Care';

    console.log('🧪 [INSERT SERVICE] Creating test service:', {
      id: testServiceId,
      name: testServiceName,
      category: testCategory,
      companyId: user?.company_id,
      userId: user?.id
    });

    if (!user?.company_id) {
      alert('No company ID available. Please log in.');
      return;
    }

    try {
      await serviceConfigManager.createService(
        testServiceId,
        testServiceName,
        testCategory,
        user.company_id,
        user.id
      );

      console.log('✅ [INSERT SERVICE] Service created successfully!');
      alert('✅ Test service "Lawn Mowing" created!\n\nCheck:\n- Console for debug logs\n- Supabase table for new row\n- Quick Calculator should show it after refresh');

      // TODO: Refresh services list to show new service
      window.location.reload(); // Temporary: Force refresh to show new service
    } catch (error) {
      console.error('❌ [INSERT SERVICE] Failed:', error);
      alert('Failed to create service: ' + (error as Error).message);
    }
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
    <div className="h-full flex flex-col" style={{ backgroundColor: visualConfig.colors.background }}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b"
           style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}>
        <div className="flex items-center gap-4">
          {/* Back button with breadcrumb */}
          <button
            onClick={onBackClick}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-opacity-80"
            style={{
              color: visualConfig.colors.text.secondary,
              backgroundColor: 'transparent'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = visualConfig.colors.background}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Icons.ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Dashboard</span>
          </button>
          <Icons.ChevronRight className="h-4 w-4" style={{ color: visualConfig.colors.text.secondary }} />

          <h1 className="text-2xl font-bold" style={{ color: visualConfig.colors.text.primary }}>
            Services Configuration
          </h1>
          <div className="flex items-center gap-2 text-sm" style={{ color: visualConfig.colors.text.secondary }}>
            <Icons.Database className="h-4 w-4" />
            <span>{filteredServices.length} services</span>
            <span>•</span>
            <span>Edit baseline values for your company</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Filter Input */}
          <div className="relative">
            <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" 
                          style={{ color: visualConfig.colors.text.secondary }} />
            <input
              type="text"
              placeholder="Search services..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
              style={{
                backgroundColor: visualConfig.colors.surface,
                borderColor: theme === 'light' ? '#e5e7eb' : '#374151',
                color: visualConfig.colors.text.primary
              }}
            />
          </div>
          
          {/* Insert Button */}
          <button
            onClick={handleInsertService}
            disabled={!user?.company_id || !isAdmin}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: visualConfig.colors.primary,
              color: 'white',
              opacity: (!user?.company_id || !isAdmin) ? 0.5 : 1,
              cursor: (!user?.company_id || !isAdmin) ? 'not-allowed' : 'pointer'
            }}
            title={!isAdmin ? 'Admin access required' : !user?.company_id ? 'Please log in' : 'Create test service'}
          >
            <Icons.Plus className="h-4 w-4" />
            Insert (Test)
          </button>
          
          {/* Sort Button */}
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors"
                  style={{
                    borderColor: theme === 'light' ? '#e5e7eb' : '#374151',
                    color: visualConfig.colors.text.primary
                  }}>
            <Icons.ArrowUpDown className="h-4 w-4" />
            Sort
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto">
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
    </div>
  );
};