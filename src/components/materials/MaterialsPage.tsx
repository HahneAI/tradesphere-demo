/**
 * Phase 2: Materials Management Page
 *
 * Full-page component displaying material categories as table rows.
 * Matches ServicesPage UX pattern where categories are shown in a table
 * and clicking "View Materials" opens CategoryMaterialsModal.
 */

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../../config/industry';
import {
  fetchMaterialCategories,
  fetchAllMaterialsForService,
  fetchServicesWithMaterials
} from '../../services/materialsService';
import type { MaterialCategory, MaterialsByCategory } from '../../types/materials';
import { CategoryMaterialsModal } from './CategoryMaterialsModal';

interface MaterialsPageProps {
  onBackClick: () => void;
}

export const MaterialsPage: React.FC<MaterialsPageProps> = ({ onBackClick }) => {
  const { user, canEditMaterials } = useAuth();
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);

  const [availableServices, setAvailableServices] = useState<Array<{ id: string; service_name: string }>>([]);
  const [selectedService, setSelectedService] = useState<string>('paver_patio_sqft');
  const [selectedServiceConfigId, setSelectedServiceConfigId] = useState<string>('');
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [materialsByCategory, setMaterialsByCategory] = useState<MaterialsByCategory>({});
  const [filter, setFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state for viewing materials in a category
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | null>(null);

  // Fetch available services on mount
  useEffect(() => {
    if (!user?.company_id) return;

    const loadServices = async () => {
      const { data, error: servicesError } = await fetchServicesWithMaterials(user.company_id);
      if (servicesError) {
        console.error('Error loading services:', servicesError);
        return;
      }

      setAvailableServices(data || []);

      // Set the service config ID for the default selected service
      const defaultService = data?.find(s => s.service_name === 'paver_patio_sqft');
      if (defaultService) {
        setSelectedServiceConfigId(defaultService.id);
      } else if (data && data.length > 0) {
        // If paver_patio_sqft not found, use first available service
        setSelectedServiceConfigId(data[0].id);
        setSelectedService(data[0].service_name);
      }
      // If no services available, selectedServiceConfigId remains empty
      // and the loading state will resolve to empty state
    };

    loadServices();
  }, [user?.company_id]);

  // Fetch categories and materials when service changes
  useEffect(() => {
    if (!user?.company_id || !selectedServiceConfigId) {
      setIsLoading(false);
      return;
    }

    const loadMaterialsData = async () => {
      setIsLoading(true);
      setError(null);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await fetchMaterialCategories(
        user.company_id,
        selectedServiceConfigId
      );

      if (categoriesError) {
        setError(categoriesError);
        setIsLoading(false);
        return;
      }

      setCategories(categoriesData || []);

      // Fetch all materials for the service
      const { data: materialsData, error: materialsError } = await fetchAllMaterialsForService(
        user.company_id,
        selectedServiceConfigId
      );

      if (materialsError) {
        setError(materialsError);
        setIsLoading(false);
        return;
      }

      setMaterialsByCategory(materialsData || {});
      setIsLoading(false);
    };

    loadMaterialsData();
  }, [user?.company_id, selectedServiceConfigId]);

  // Handle service selection change
  const handleServiceChange = (serviceName: string) => {
    setSelectedService(serviceName);
    const service = availableServices.find(s => s.service_name === serviceName);
    if (service) {
      setSelectedServiceConfigId(service.id);
    }
  };

  // Get material count for a category
  const getMaterialCount = (categoryKey: string): number => {
    return materialsByCategory[categoryKey]?.length || 0;
  };

  // Format service name for display
  const formatServiceName = (serviceName: string): string => {
    return serviceName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Format calculation method for display
  const formatCalculationMethod = (method: string): string => {
    const methodMap: Record<string, string> = {
      'volume_depth': 'Volume × Depth',
      'area_coverage': 'Area Coverage',
      'linear_perimeter': 'Linear Perimeter'
    };
    return methodMap[method] || method;
  };

  // Truncate text with ellipsis
  const truncateText = (text: string | null | undefined, maxLength: number): string => {
    if (!text) return '—';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Filter categories based on search
  const filteredCategories = categories.filter(category =>
    category.category_label.toLowerCase().includes(filter.toLowerCase()) ||
    category.category_description?.toLowerCase().includes(filter.toLowerCase()) ||
    category.category_key.toLowerCase().includes(filter.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: visualConfig.colors.primary }}
        />
        <span className="ml-3" style={{ color: visualConfig.colors.text.primary }}>
          Loading materials...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg border-l-4 bg-red-50 border-red-400">
        <div className="flex items-center">
          <Icons.AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800 font-medium">Error loading materials</span>
        </div>
        <p className="text-red-700 text-sm mt-1">{error}</p>
      </div>
    );
  }

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
            Materials Management
          </h1>
          <div className="flex items-center gap-2 text-sm" style={{ color: visualConfig.colors.text.secondary }}>
            <Icons.Package className="h-4 w-4" />
            <span>{filteredCategories.length} categories</span>
            <span>•</span>
            <span>{formatServiceName(selectedService)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Service Selector */}
          <div className="relative">
            <select
              value={selectedService}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="pl-3 pr-10 py-2 border rounded-lg text-sm appearance-none cursor-pointer"
              style={{
                backgroundColor: visualConfig.colors.surface,
                borderColor: theme === 'light' ? '#e5e7eb' : '#374151',
                color: visualConfig.colors.text.primary,
              }}
            >
              {availableServices.map((service) => (
                <option key={service.id} value={service.service_name}>
                  {formatServiceName(service.service_name)}
                </option>
              ))}
            </select>
            <Icons.ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none"
              style={{ color: visualConfig.colors.text.secondary }}
            />
          </div>

          {/* Filter Input */}
          <div className="relative">
            <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                          style={{ color: visualConfig.colors.text.secondary }} />
            <input
              type="text"
              placeholder="Search categories..."
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

          {/* Add Category Button (Coming Soon) - Commented out until implementation
          {canEditMaterials && (
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: visualConfig.colors.primary,
                color: 'white',
              }}
              title="Add new material category"
            >
              <Icons.Plus className="h-4 w-4" />
              Add Category
            </button>
          )}
          */}
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto">
        {availableServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Icons.Package className="h-16 w-16 mb-4" style={{ color: visualConfig.colors.text.secondary }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
              No Services with Materials Configured
            </h3>
            <p className="text-sm text-center max-w-md" style={{ color: visualConfig.colors.text.secondary }}>
              No services have material categories set up yet. Material categories need to be configured for each service before they can be managed here.
            </p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Icons.Package className="h-16 w-16 mb-4" style={{ color: visualConfig.colors.text.secondary }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
              No Material Categories Found
            </h3>
            <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
              {filter ? 'Try adjusting your search filter.' : 'This service doesn\'t have material categories configured yet.'}
            </p>
          </div>
        ) : (
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '18%' }} /> {/* Category Name */}
              <col style={{ width: '28%' }} /> {/* Description */}
              <col style={{ width: '16%' }} /> {/* Calculation Method */}
              <col style={{ width: '12%' }} /> {/* Materials */}
              <col style={{ width: '12%' }} /> {/* Required */}
              <col style={{ width: '14%' }} /> {/* Actions */}
            </colgroup>
            <thead style={{ backgroundColor: theme === 'light' ? '#f9fafb' : '#1f2937' }}>
              <tr>
                <th className="px-3 py-2 text-center text-sm font-medium border-b"
                    style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}>
                  Category Name
                </th>
                <th className="px-3 py-2 text-center text-sm font-medium border-b"
                    style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}>
                  Description
                </th>
                <th className="px-3 py-2 text-center text-sm font-medium border-b"
                    style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}>
                  Calculation Method
                </th>
                <th className="px-3 py-2 text-center text-sm font-medium border-b"
                    style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}>
                  Materials
                </th>
                <th className="px-3 py-2 text-center text-sm font-medium border-b"
                    style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}>
                  Required
                </th>
                <th className="px-3 py-2 text-center text-sm font-medium border-b"
                    style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredCategories.map((category) => (
                <tr key={category.id}
                    className="hover:bg-opacity-10 transition-colors"
                    style={{
                      borderBottom: `1px solid ${theme === 'light' ? '#e5e7eb' : '#374151'}`
                    }}>
                  <td className="px-3 py-2 text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
                    <div className="truncate" title={category.category_label}>
                      {truncateText(category.category_label, 25)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                    <div className="truncate" title={category.category_description || undefined}>
                      {truncateText(category.category_description, 40)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm" style={{ color: visualConfig.colors.text.primary }}>
                    <div className="flex items-center gap-2">
                      <Icons.Calculator className="h-4 w-4" style={{ color: visualConfig.colors.text.secondary }} />
                      <span className="truncate">{formatCalculationMethod(category.calculation_method)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: visualConfig.colors.primary + '20',
                        color: visualConfig.colors.primary,
                      }}
                    >
                      {getMaterialCount(category.category_key)} {getMaterialCount(category.category_key) === 1 ? 'material' : 'materials'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {category.is_required ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        Required
                      </span>
                    ) : (
                      <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setSelectedCategory(category)}
                      className="flex items-center gap-2 px-4 h-11 min-h-[44px] text-sm rounded-lg border transition-all duration-150 hover:bg-opacity-10 active:scale-[0.97]"
                      style={{
                        borderColor: visualConfig.colors.primary,
                        color: visualConfig.colors.primary
                      }}
                    >
                      <Icons.Eye className="h-5 w-5" />
                      View Materials
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Category Materials Modal */}
      {selectedCategory && (
        <CategoryMaterialsModal
          isOpen={!!selectedCategory}
          category={selectedCategory}
          onClose={() => setSelectedCategory(null)}
          companyId={user?.company_id || ''}
          serviceConfigId={selectedServiceConfigId}
          canEditMaterials={canEditMaterials}
        />
      )}
    </div>
  );
};
