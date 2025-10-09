/**
 * Phase 2: Materials Management System - TypeScript Types
 *
 * These types match the database schema for service_material_categories
 * and service_materials tables.
 */

/**
 * Material Category Definition
 *
 * Defines what material types a service needs (e.g., paver patios need:
 * base rock, fabric, pavers, edging, sand).
 */
export interface MaterialCategory {
  id: string;
  company_id: string;
  service_config_id: string;
  category_key: string;
  category_label: string;
  category_description: string | null;
  sort_order: number;
  is_required: boolean;
  calculation_method: 'volume_depth' | 'area_coverage' | 'linear_perimeter';
  default_depth_inches: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Service Material Record
 *
 * Individual material within a category (e.g., "Bulk Limestone Class II Road Base"
 * under base_rock category). Contains pricing, coverage rates, physical properties, and images.
 */
export interface ServiceMaterial {
  id: string;
  company_id: string;
  service_config_id: string;
  material_name: string;
  material_category: string;
  material_description: string | null;
  supplier_name: string | null;

  // Images (Supabase Storage)
  image_url: string | null;
  image_thumbnail_url: string | null;

  // Pricing
  unit_type: string;  // 'cubic_yard', 'square_foot', 'linear_foot', 'piece', 'pallet', 'bag'
  price_per_unit: number;
  units_per_package: number | null;

  // Coverage
  coverage_per_unit: number | null;
  coverage_depth_inches: number | null;

  // Physical Properties
  length_inches: number | null;
  width_inches: number | null;
  thickness_inches: number | null;
  weight_lbs: number | null;

  // Calculation Modifiers
  waste_factor_percentage: number;  // Default 10.0
  compaction_factor_percentage: number;  // Default 0.0, 20.0 for base materials

  // Metadata
  is_active: boolean;
  is_default: boolean;
  material_grade: string | null;  // 'Standard', 'Premium', 'Economy', 'Luxury'
  color: string | null;
  finish: string | null;  // 'Smooth', 'Textured', 'Tumbled', etc.

  // Audit Fields
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Material Selection State
 *
 * Tracks which material is selected per category, plus calculated
 * quantity and cost for that selection.
 */
export interface MaterialSelection {
  categoryKey: string;
  materialId: string;
  quantity: number;
  cost: number;
}

/**
 * Materials by Category Map
 *
 * Object mapping category keys to arrays of materials
 */
export type MaterialsByCategory = Record<string, ServiceMaterial[]>;

/**
 * Material Calculation Result
 *
 * Result from material quantity calculation for a single category
 */
export interface MaterialCalculationResult {
  categoryKey: string;
  materialId: string;
  materialName: string;
  unitType: string;
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
  wasteFactorApplied: number;
  compactionFactorApplied: number;
}

/**
 * Total Materials Cost Breakdown
 *
 * Complete breakdown of material costs across all categories
 */
export interface MaterialsCostBreakdown {
  results: MaterialCalculationResult[];
  totalMaterialsCost: number;
  costPerSquareFoot: number;
}
