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
 * Material Quantity Result with Unit Conversion
 *
 * Complete quantity breakdown including unit conversion for purchasing
 */
export interface MaterialQuantityResult {
  // Calculated quantities
  quantityNeeded: number;           // Raw quantity (e.g., 44 linear feet)
  quantityWithWaste: number;        // After waste factor (e.g., 48.4 linear feet)
  quantityWithCompaction: number;   // After compaction factor (base materials only)

  // Unit conversion for purchasing
  purchaseUnits: number;            // How many packages to buy (e.g., 6.05 sections)
  purchaseUnitsRounded: number;     // Rounded up to 0.1 (e.g., 6.1 sections)

  // Cost breakdown
  unitCost: number;                 // Price per single unit
  totalCost: number;                // Final cost (purchaseUnitsRounded × unitCost × coverage)

  // Display strings
  unitLabel: string;                // "sections" or "rolls" or "cubic yards"
  quantityDisplay: string;          // "6.1 sections (48.4 linear feet)"

  // Applied factors
  wasteFactorPercent: number;       // Waste factor used in calculation
  compactionFactorPercent: number;  // Compaction factor used (if applicable)
}

/**
 * Category Calculation Result with Unit Conversion
 *
 * Result from material quantity calculation for a single category
 */
export interface CategoryCalculationResult {
  categoryKey: string;
  categoryLabel: string;
  materialId: string;
  materialName: string;
  calculationMethod: 'volume_depth' | 'area_coverage' | 'linear_perimeter';

  // Detailed quantity breakdown with unit conversion
  quantities: MaterialQuantityResult;

  // Cost
  subtotal: number;
}

/**
 * Material Calculation Input Parameters
 *
 * Input data needed for material calculations
 */
export interface MaterialCalculationInput {
  squareFootage: number;
  selectedMaterials?: Record<string, string>; // categoryKey → materialId (optional, uses defaults if not provided)
  customPerimeter?: number;                    // Optional user override for linear calculations
}

/**
 * Complete Material Calculation Result
 *
 * Full breakdown of material costs with unit conversion details
 */
export interface MaterialCalculationResult {
  categories: CategoryCalculationResult[];
  totalMaterialCost: number;
  costPerSquareFoot: number;        // Total cost ÷ square footage
  breakdown: string;                 // Human-readable summary
  detailedUnits: {                   // Purchasable units summary
    [categoryKey: string]: {
      unitsNeeded: number;          // e.g., 6.1
      unitLabel: string;            // e.g., "sections"
      displayText: string;          // e.g., "6.1 sections (48.4 linear feet)"
    };
  };
}

/**
 * Total Materials Cost Breakdown (Legacy - kept for compatibility)
 *
 * Simple breakdown of material costs across all categories
 */
export interface MaterialsCostBreakdown {
  results: CategoryCalculationResult[];
  totalMaterialsCost: number;
  costPerSquareFoot: number;
}
