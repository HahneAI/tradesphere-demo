/**
 * Phase 2: Category Materials Modal
 *
 * Modal for viewing and managing materials within a specific category.
 * Displays materials as cards with pricing, images, and role-based actions.
 */

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../../config/industry';
import { fetchMaterialsForCategory } from '../../services/materialsService';
import type { MaterialCategory, ServiceMaterial } from '../../types/materials';

interface CategoryMaterialsModalProps {
  isOpen: boolean;
  category: MaterialCategory | null;
  onClose: () => void;
  companyId: string;
  serviceConfigId: string;
  isAdminOrOwner: boolean;
}

export const CategoryMaterialsModal: React.FC<CategoryMaterialsModalProps> = ({
  isOpen,
  category,
  onClose,
  companyId,
  serviceConfigId,
  isAdminOrOwner,
}) => {
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);

  const [materials, setMaterials] = useState<ServiceMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch materials when modal opens
  useEffect(() => {
    if (!isOpen || !category || !companyId || !serviceConfigId) {
      setMaterials([]);
      return;
    }

    const loadMaterials = async () => {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await fetchMaterialsForCategory(
        companyId,
        serviceConfigId,
        category.category_key
      );

      if (fetchError) {
        setError(fetchError);
      } else {
        setMaterials(data || []);
      }

      setIsLoading(false);
    };

    loadMaterials();
  }, [isOpen, category, companyId, serviceConfigId]);

  // Placeholder action handlers
  const handleAddMaterial = () => {
    console.log('Add material to category:', category?.category_key);
  };

  const handleEditMaterial = (materialId: string) => {
    console.log('Edit material:', materialId);
  };

  const handleDeleteMaterial = (materialId: string) => {
    console.log('Delete material:', materialId);
  };

  const handleViewMaterial = (materialId: string) => {
    console.log('View material:', materialId);
  };

  // Format price display
  const formatPrice = (price: number, unitType: string): string => {
    const formattedPrice = `$${price.toFixed(2)}`;
    const unitAbbrev = unitType
      .replace('cubic_yard', 'cy')
      .replace('square_foot', 'sqft')
      .replace('linear_foot', 'lf')
      .replace('piece', 'ea')
      .replace('bag', 'bag')
      .replace('pallet', 'plt');
    return `${formattedPrice} / ${unitAbbrev}`;
  };

  if (!isOpen || !category) return null;

  return (
    <>
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[60] animate-overlay-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-6xl h-[85vh] rounded-lg shadow-xl animate-scale-in flex flex-col"
          style={{ backgroundColor: visualConfig.colors.surface }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            className="px-6 py-4 border-b flex-shrink-0"
            style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-semibold" style={{ color: visualConfig.colors.text.primary }}>
                  {category.category_label}
                </h2>
                {category.category_description && (
                  <p className="text-sm mt-1" style={{ color: visualConfig.colors.text.secondary }}>
                    {category.category_description}
                  </p>
                )}
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                    {materials.length} {materials.length === 1 ? 'material' : 'materials'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Add Material Button (Admin Only) */}
                {isAdminOrOwner && (
                  <button
                    onClick={handleAddMaterial}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: visualConfig.colors.primary,
                      color: '#ffffff',
                    }}
                  >
                    <Icons.Plus className="h-4 w-4" />
                    <span>Add Material</span>
                  </button>
                )}

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-opacity-20 transition-colors"
                  style={{ color: visualConfig.colors.text.secondary }}
                >
                  <Icons.X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center p-12">
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

            {/* Empty State */}
            {!isLoading && !error && materials.length === 0 && (
              <div className="text-center py-16">
                <Icons.Package className="mx-auto h-16 w-16 mb-4" style={{ color: visualConfig.colors.text.secondary }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
                  No Materials Added Yet
                </h3>
                <p className="text-sm mb-6" style={{ color: visualConfig.colors.text.secondary }}>
                  Get started by adding materials to this category.
                </p>
                {isAdminOrOwner && (
                  <button
                    onClick={handleAddMaterial}
                    className="flex items-center space-x-2 px-6 py-3 rounded-lg text-sm font-medium transition-colors mx-auto"
                    style={{
                      backgroundColor: visualConfig.colors.primary,
                      color: '#ffffff',
                    }}
                  >
                    <Icons.Plus className="h-4 w-4" />
                    <span>Add Material</span>
                  </button>
                )}
              </div>
            )}

            {/* Materials Grid */}
            {!isLoading && !error && materials.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {materials.map((material) => (
                  <div
                    key={material.id}
                    className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
                    style={{
                      backgroundColor: visualConfig.colors.surface,
                      borderColor: visualConfig.colors.text.secondary + '30',
                    }}
                  >
                    {/* Material Image or Placeholder */}
                    <div
                      className="relative w-full h-40 mb-3 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: visualConfig.colors.text.secondary + '10',
                      }}
                    >
                      {material.image_thumbnail_url ? (
                        <img
                          src={material.image_thumbnail_url}
                          alt={material.material_name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Icons.ImagePlus
                          className="h-12 w-12"
                          style={{ color: visualConfig.colors.text.secondary }}
                        />
                      )}

                      {/* Default Star Badge */}
                      {material.is_default && (
                        <div className="absolute top-2 right-2 bg-yellow-400 rounded-full p-1.5">
                          <Icons.Star className="h-4 w-4 text-yellow-900 fill-yellow-900" />
                        </div>
                      )}
                    </div>

                    {/* Material Name */}
                    <h4 className="font-medium text-sm mb-2 line-clamp-2" style={{ color: visualConfig.colors.text.primary }}>
                      {material.material_name}
                    </h4>

                    {/* Price */}
                    <div className="text-base font-semibold mb-2" style={{ color: visualConfig.colors.primary }}>
                      {formatPrice(material.price_per_unit, material.unit_type)}
                    </div>

                    {/* Supplier */}
                    {material.supplier_name && (
                      <div className="flex items-center space-x-1 mb-2">
                        <Icons.Store className="h-3 w-3" style={{ color: visualConfig.colors.text.secondary }} />
                        <span className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                          {material.supplier_name}
                        </span>
                      </div>
                    )}

                    {/* Badges Row */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {/* Color Badge */}
                      {material.color && (
                        <span
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            backgroundColor: visualConfig.colors.primary + '15',
                            color: visualConfig.colors.primary,
                          }}
                        >
                          {material.color}
                        </span>
                      )}

                      {/* Material Grade Badge */}
                      {material.material_grade && (
                        <span
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            backgroundColor: visualConfig.colors.text.secondary + '15',
                            color: visualConfig.colors.text.secondary,
                          }}
                        >
                          {material.material_grade}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 mt-3 pt-3 border-t" style={{ borderColor: visualConfig.colors.text.secondary + '20' }}>
                      {isAdminOrOwner ? (
                        <>
                          {/* Edit Button */}
                          <button
                            onClick={() => handleEditMaterial(material.id)}
                            className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: visualConfig.colors.primary + '15',
                              color: visualConfig.colors.primary,
                            }}
                          >
                            <Icons.Edit2 className="h-3 w-3" />
                            <span>Edit</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteMaterial(material.id)}
                            className="flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                            }}
                          >
                            <Icons.Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          {/* View Details Button (Non-Admin) */}
                          <button
                            onClick={() => handleViewMaterial(material.id)}
                            className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: visualConfig.colors.primary + '15',
                              color: visualConfig.colors.primary,
                            }}
                          >
                            <Icons.Eye className="h-3 w-3" />
                            <span>View Details</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div
            className="px-6 py-4 border-t flex justify-end flex-shrink-0"
            style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}
          >
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: visualConfig.colors.text.secondary + '15',
                color: visualConfig.colors.text.secondary,
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
