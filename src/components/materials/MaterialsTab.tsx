/**
 * Phase 2: Materials Management Tab
 *
 * Main component for materials management. Displays material categories
 * for a selected service, similar to Services Database tab layout.
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

interface MaterialsTabProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MaterialsTab: React.FC<MaterialsTabProps> = ({ isOpen, onClose }) => {
  const { user, canEditMaterials } = useAuth();
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);

  const [availableServices, setAvailableServices] = useState<Array<{ id: string; service_name: string }>>([]);
  const [selectedService, setSelectedService] = useState<string>('paver_patio_sqft');
  const [selectedServiceConfigId, setSelectedServiceConfigId] = useState<string>('');
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [materialsByCategory, setMaterialsByCategory] = useState<MaterialsByCategory>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      }
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

  // Handle "Manage Materials" button click
  const handleManageMaterials = (category: MaterialCategory) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
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

  if (!isOpen) return null;

  return (
    <>
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-overlay-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-5xl h-[85vh] rounded-lg shadow-xl animate-scale-in flex flex-col"
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
                Materials Management
              </h2>
              <p className="text-sm mt-1" style={{ color: visualConfig.colors.text.secondary }}>
                {canEditMaterials
                  ? 'Manage material library and pricing for service calculations'
                  : 'View material library and pricing (read-only)'
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-opacity-20 transition-colors"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              <Icons.X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Service Selector & Role Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
                      Service:
                    </label>
                    <div className="relative">
                      <select
                        value={selectedService}
                        onChange={(e) => handleServiceChange(e.target.value)}
                        className="pl-3 pr-10 py-2 border rounded-lg text-sm appearance-none cursor-pointer"
                        style={{
                          backgroundColor: visualConfig.colors.surface,
                          borderColor: visualConfig.colors.text.secondary + '40',
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
                  </div>

                  {/* Role Badge (only show for non-admin) */}
                  {!canEditMaterials && (
                    <div
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg"
                      style={{
                        backgroundColor: visualConfig.colors.text.secondary + '15',
                        border: `1px solid ${visualConfig.colors.text.secondary}40`,
                      }}
                    >
                      <Icons.Eye className="h-4 w-4" style={{ color: visualConfig.colors.text.secondary }} />
                      <span className="text-sm font-medium" style={{ color: visualConfig.colors.text.secondary }}>
                        Read-Only View
                      </span>
                    </div>
                  )}
                </div>

                {/* Info Banner */}
                {!canEditMaterials && (
                  <div
                    className="p-4 rounded-lg border-l-4"
                    style={{
                      backgroundColor: visualConfig.colors.primary + '08',
                      borderLeftColor: visualConfig.colors.primary,
                    }}
                  >
                    <div className="flex items-start">
                      <Icons.Info className="h-5 w-5 mr-3 mt-0.5" style={{ color: visualConfig.colors.primary }} />
                      <div>
                        <p className="text-sm font-medium mb-1" style={{ color: visualConfig.colors.text.primary }}>
                          Read-Only Access
                        </p>
                        <p className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                          You can view materials and pricing but cannot make changes. Contact an administrator or owner to request material updates.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {isLoading && (
                  <div className="flex items-center justify-center p-8">
                    <div
                      className="animate-spin rounded-full h-8 w-8 border-b-2"
                      style={{ borderColor: visualConfig.colors.primary }}
                    />
                    <span className="ml-3" style={{ color: visualConfig.colors.text.primary }}>
                      Loading materials...
                    </span>
                  </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                  <div
                    className="p-4 rounded-lg border-l-4"
                    style={{
                      backgroundColor: '#fee2e2',
                      borderLeftColor: '#dc2626',
                    }}
                  >
                    <div className="flex items-center">
                      <Icons.AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                      <span className="text-red-800 font-medium">Error loading materials</span>
                    </div>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                )}

                {/* Empty State - No Categories */}
                {!isLoading && !error && categories.length === 0 && (
                  <div className="text-center py-12">
                    <Icons.Package className="mx-auto h-12 w-12 mb-4" style={{ color: visualConfig.colors.text.secondary }} />
                    <h3 className="text-lg font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
                      No Material Categories Configured
                    </h3>
                    <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                      This service doesn't have material categories set up yet.
                    </p>
                  </div>
                )}

                {/* Categories List */}
                {!isLoading && !error && categories.length > 0 && (
                  <div className="grid gap-4">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="border rounded-lg p-4"
                        style={{
                          backgroundColor: visualConfig.colors.surface,
                          borderColor: visualConfig.colors.text.secondary + '20',
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-base font-medium" style={{ color: visualConfig.colors.text.primary }}>
                                {category.category_label}
                              </h3>

                              {/* Material Count Badge */}
                              <span
                                className="text-xs px-2 py-1 rounded"
                                style={{
                                  backgroundColor: visualConfig.colors.primary + '20',
                                  color: visualConfig.colors.primary,
                                }}
                              >
                                {getMaterialCount(category.category_key)} {getMaterialCount(category.category_key) === 1 ? 'material' : 'materials'}
                              </span>

                              {/* Required Badge */}
                              {category.is_required && (
                                <span
                                  className="text-xs px-2 py-1 rounded"
                                  style={{
                                    backgroundColor: '#fef3c7',
                                    color: '#92400e',
                                  }}
                                >
                                  Required
                                </span>
                              )}
                            </div>

                            {category.category_description && (
                              <p className="text-sm mt-1" style={{ color: visualConfig.colors.text.secondary }}>
                                {category.category_description}
                              </p>
                            )}

                            {/* Calculation Method */}
                            <div className="flex items-center space-x-2 mt-2">
                              <Icons.Calculator className="h-3 w-3" style={{ color: visualConfig.colors.text.secondary }} />
                              <span className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                                {category.calculation_method === 'volume_depth' && 'Volume Depth Calculation'}
                                {category.calculation_method === 'area_coverage' && 'Area Coverage Calculation'}
                                {category.calculation_method === 'linear_perimeter' && 'Linear Perimeter Calculation'}
                              </span>
                            </div>
                          </div>

                          {/* Manage Materials Button */}
                          <button
                            onClick={() => handleManageMaterials(category)}
                            className="ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            style={{
                              backgroundColor: visualConfig.colors.primary,
                              color: '#ffffff',
                            }}
                          >
                            Manage Materials
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Materials Modal */}
      <CategoryMaterialsModal
        isOpen={isModalOpen}
        category={selectedCategory}
        onClose={handleCloseModal}
        companyId={user?.company_id || ''}
        serviceConfigId={selectedServiceConfigId}
        canEditMaterials={canEditMaterials}
      />
    </>
  );
};
