/**
 * Phase 2: Material Calculations Engine
 *
 * Core calculation engine for materials management system.
 * Replaces old multiplier-based system with real material costs from database.
 *
 * Three calculation methods:
 * 1. volume_depth - For base materials (cubic yards)
 * 2. area_coverage - For surface materials (square footage)
 * 3. linear_perimeter - For edging materials (linear feet)
 *
 * Features:
 * - Unit conversion for purchasing (rolls, pallets, sections, etc.)
 * - Waste and compaction factors
 * - Cost per square foot calculation
 * - Detailed breakdown for quotes
 */

import type {
  MaterialCategory,
  ServiceMaterial,
  MaterialQuantityResult,
  CategoryCalculationResult,
  MaterialCalculationInput,
  MaterialCalculationResult
} from '../types/materials';
import {
  fetchMaterialCategories,
  fetchMaterialById,
  getDefaultMaterial
} from './materialsService';

/**
 * Round UP to nearest tenth (0.1)
 *
 * Examples:
 * - 10.821 → 10.9
 * - 6.05 → 6.1
 * - 8.0 → 8.0
 *
 * Critical for purchase unit calculations (can't buy 0.05 of a section)
 */
function roundUpToTenth(value: number): number {
  return Math.ceil(value * 10) / 10;
}

/**
 * Get display label for unit type
 *
 * Converts database unit_type to human-readable plural form
 */
function getUnitLabel(unitType: string, coverage: number | null): string {
  // Check if this material uses packaging (coverage_per_unit > 1)
  if (coverage && coverage > 1) {
    if (unitType === 'linear_foot') return 'sections';
    if (unitType === 'square_foot') return 'rolls';
    if (unitType === 'piece') return 'pallets';
    if (unitType === 'bag') return 'bags';
  }

  // Standard unit types
  const labelMap: Record<string, string> = {
    'cubic_yard': 'cubic yards',
    'square_foot': 'square feet',
    'linear_foot': 'linear feet',
    'piece': 'pieces',
    'pallet': 'pallets',
    'bag': 'bags'
  };

  return labelMap[unitType] || unitType;
}

/**
 * Calculate Volume-Based Materials (Base Rock, Clean Rock)
 *
 * Formula:
 * 1. Calculate cubic feet: (sqft × depth_inches) / 12
 * 2. Convert to cubic yards: cubic_feet / 27
 * 3. Apply compaction factor: cy × (1 + compaction_percent/100)
 * 4. Apply waste factor: cy × (1 + waste_percent/100)
 * 5. Calculate cost: final_cy × price_per_unit
 *
 * Example (360 sqft, 6-inch base rock):
 * - Cubic feet: (360 × 6) / 12 = 180 cf
 * - Cubic yards: 180 / 27 = 6.67 cy
 * - With 20% compaction: 6.67 × 1.20 = 8.00 cy
 * - With 10% waste: 8.00 × 1.10 = 8.80 cy
 * - Cost: 8.80 × $36.75 = $323.40
 */
export function calculateVolumeMaterial(
  squareFootage: number,
  material: ServiceMaterial,
  category: MaterialCategory
): MaterialQuantityResult {
  const depthInches = category.default_depth_inches || material.coverage_depth_inches || 6.0;
  const wasteFactor = material.waste_factor_percentage || 10.0;
  const compactionFactor = material.compaction_factor_percentage || 0.0;

  // Step 1: Calculate cubic feet
  const cubicFeet = (squareFootage * depthInches) / 12;

  // Step 2: Convert to cubic yards
  const cubicYards = cubicFeet / 27;

  // Step 3: Apply compaction factor (base materials settle)
  const withCompaction = cubicYards * (1 + compactionFactor / 100);

  // Step 4: Apply waste factor
  const withWaste = withCompaction * (1 + wasteFactor / 100);

  // Step 5: Unit conversion (volume materials sold per cubic yard, no packaging)
  const purchaseUnits = withWaste;
  const purchaseUnitsRounded = roundUpToTenth(purchaseUnits);

  // Step 6: Calculate cost
  const totalCost = purchaseUnitsRounded * material.price_per_unit;

  // Build display string
  const unitLabel = getUnitLabel(material.unit_type, material.coverage_per_unit);
  const quantityDisplay = `${purchaseUnitsRounded.toFixed(1)} ${unitLabel}`;

  return {
    quantityNeeded: cubicYards,
    quantityWithWaste: withWaste,
    quantityWithCompaction: withCompaction,
    purchaseUnits,
    purchaseUnitsRounded,
    unitCost: material.price_per_unit,
    totalCost,
    unitLabel,
    quantityDisplay,
    wasteFactorPercent: wasteFactor,
    compactionFactorPercent: compactionFactor
  };
}

/**
 * Calculate Area-Based Materials (Pavers, Fabric, Polymeric Sand)
 *
 * Formula:
 * 1. Calculate needed sqft: project squareFootage (direct coverage)
 * 2. Apply waste factor: sqft × (1 + waste_percent/100)
 * 3. Convert to purchase units: sqft / coverage_per_unit
 * 4. Round up to 0.1
 * 5. Calculate cost: units × price_per_unit
 *
 * Example 1 - Pavers (sold per sqft, 1:1 coverage):
 * - Needed: 360 sqft
 * - With 10% waste: 360 × 1.10 = 396 sqft
 * - Purchase units: 396 / 1.0 = 396 sqft
 * - Cost: 396 × $5.17 = $2,047.32 ✅
 *
 * Example 2 - Fabric (sold per ROLL, 1800 sqft per roll):
 * - Needed: 100 sqft
 * - With 15% waste: 100 × 1.15 = 115 sqft
 * - Rolls needed: 115 / 1800 = 0.0639 rolls
 * - Rounded: 0.1 rolls
 * - Cost: 0.1 × $199.66 = $19.97 ✅
 */
export function calculateAreaMaterial(
  squareFootage: number,
  material: ServiceMaterial
): MaterialQuantityResult {
  const wasteFactor = material.waste_factor_percentage || 10.0;
  const coveragePerUnit = material.coverage_per_unit || 1.0;

  // Step 1: Calculate needed square footage (direct coverage required)
  const neededSqft = squareFootage;  // We need to cover this much area

  // Step 2: Apply waste factor
  const withWaste = neededSqft * (1 + wasteFactor / 100);

  // Step 3: Convert to purchase units
  let purchaseUnits: number;
  let actualQuantity: number;

  if (coveragePerUnit > 1) {
    // Material sold in packages (rolls, pallets)
    purchaseUnits = withWaste / coveragePerUnit;
    actualQuantity = withWaste;
  } else {
    // Material sold per unit (sqft)
    purchaseUnits = withWaste;
    actualQuantity = withWaste;
  }

  // Step 4: Round up to 0.1
  const purchaseUnitsRounded = roundUpToTenth(purchaseUnits);

  // Step 5: Calculate cost (price_per_unit is already per purchase unit)
  const totalCost = purchaseUnitsRounded * material.price_per_unit;

  // Build display string
  const unitLabel = getUnitLabel(material.unit_type, material.coverage_per_unit);
  let quantityDisplay: string;

  if (coveragePerUnit > 1) {
    const actualCoverage = purchaseUnitsRounded * coveragePerUnit;
    quantityDisplay = `${purchaseUnitsRounded.toFixed(1)} ${unitLabel} (${actualCoverage.toFixed(0)} sqft coverage)`;
  } else {
    quantityDisplay = `${purchaseUnitsRounded.toFixed(1)} ${unitLabel}`;
  }

  return {
    quantityNeeded: neededSqft,
    quantityWithWaste: withWaste,
    quantityWithCompaction: 0,
    purchaseUnits,
    purchaseUnitsRounded,
    unitCost: material.price_per_unit,
    totalCost,
    unitLabel,
    quantityDisplay,
    wasteFactorPercent: wasteFactor,
    compactionFactorPercent: 0
  };
}

/**
 * Calculate Linear Materials (Edging)
 *
 * Formula:
 * 1. Estimate perimeter from sqft (or use custom)
 * 2. Apply waste factor: lf × (1 + waste_percent/100)
 * 3. Convert to sections: lf / coverage_per_unit
 * 4. Round up to 0.1
 * 5. Calculate cost: sections × price_per_unit
 *
 * Perimeter Estimation:
 * - Assume square/rectangular shape
 * - Perimeter ≈ √sqft × 4.15 (geometric approximation)
 * - For 360 sqft → √360 × 4.15 ≈ 78.7 linear feet
 *
 * Example (360 sqft, 8ft sections, $1.24/section):
 * - Perimeter: √360 × 4.15 = 78.7 lf
 * - With 10% waste: 78.7 × 1.10 = 86.57 lf
 * - Sections needed: 86.57 / 8 = 10.821 sections
 * - Rounded: 10.9 sections
 * - Cost: 10.9 × $1.24 = $13.52 ✅
 */
export function calculateLinearMaterial(
  squareFootage: number,
  material: ServiceMaterial,
  customPerimeter?: number
): MaterialQuantityResult {
  const wasteFactor = material.waste_factor_percentage || 10.0;
  const coveragePerUnit = material.coverage_per_unit || 8.0; // Default 8ft sections

  // Step 1: Calculate or use custom perimeter
  const estimatedPerimeter = Math.sqrt(squareFootage) * 4.15;
  const perimeter = customPerimeter ?? estimatedPerimeter;

  // Step 2: Apply waste factor
  const withWaste = perimeter * (1 + wasteFactor / 100);

  // Step 3: Convert to sections/units
  const purchaseUnits = withWaste / coveragePerUnit;

  // Step 4: Round up to 0.1
  const purchaseUnitsRounded = roundUpToTenth(purchaseUnits);

  // Step 5: Calculate cost (price_per_unit is already per purchase unit)
  const totalCost = purchaseUnitsRounded * material.price_per_unit;

  // Build display string
  const unitLabel = getUnitLabel(material.unit_type, material.coverage_per_unit);
  const actualLinearFeet = purchaseUnitsRounded * coveragePerUnit;
  const quantityDisplay = `${purchaseUnitsRounded.toFixed(1)} ${unitLabel} (${actualLinearFeet.toFixed(1)} linear feet)`;

  return {
    quantityNeeded: perimeter,
    quantityWithWaste: withWaste,
    quantityWithCompaction: 0,
    purchaseUnits,
    purchaseUnitsRounded,
    unitCost: material.price_per_unit,
    totalCost,
    unitLabel,
    quantityDisplay,
    wasteFactorPercent: wasteFactor,
    compactionFactorPercent: 0
  };
}

/**
 * Calculate All Material Costs
 *
 * Main orchestrator that:
 * 1. Fetches all categories for service
 * 2. Gets selected material (or default) for each category
 * 3. Runs appropriate calculation method
 * 4. Sums total cost and builds breakdown
 *
 * @param input - Square footage and optional material selections
 * @param companyId - Company UUID
 * @param serviceConfigId - Service config UUID
 * @returns Complete breakdown with unit conversion details
 */
export async function calculateAllMaterialCosts(
  input: MaterialCalculationInput,
  companyId: string,
  serviceConfigId: string
): Promise<MaterialCalculationResult> {
  console.log('📦 [MATERIAL CALC] Starting calculation:', {
    sqft: input.squareFootage,
    hasSelections: !!input.selectedMaterials,
    customPerimeter: input.customPerimeter
  });

  // Step 1: Fetch all categories for service
  const { data: categories, error: categoriesError } = await fetchMaterialCategories(
    companyId,
    serviceConfigId
  );

  if (categoriesError || !categories) {
    console.error('❌ [MATERIAL CALC] Failed to fetch categories:', categoriesError);
    throw new Error(`Failed to fetch material categories: ${categoriesError}`);
  }

  console.log(`✅ [MATERIAL CALC] Found ${categories.length} categories`);

  // Step 2: Calculate each category
  const results: CategoryCalculationResult[] = [];

  for (const category of categories) {
    // Get selected material or default
    const materialId = input.selectedMaterials?.[category.category_key];

    let material: ServiceMaterial | null = null;

    if (materialId) {
      const { data } = await fetchMaterialById(materialId);
      material = data;
    } else {
      const { data } = await getDefaultMaterial(companyId, serviceConfigId, category.category_key);
      material = data;
    }

    if (!material) {
      console.warn(`⚠️ [MATERIAL CALC] No material found for category: ${category.category_key}, skipping`);
      continue;
    }

    // Step 3: Calculate based on method
    let quantities: MaterialQuantityResult;

    switch (category.calculation_method) {
      case 'volume_depth':
        quantities = calculateVolumeMaterial(input.squareFootage, material, category);
        console.log(`  📊 Volume calculation (${category.category_key}):`, quantities);
        break;

      case 'area_coverage':
        quantities = calculateAreaMaterial(input.squareFootage, material);
        console.log(`  📊 Area calculation (${category.category_key}):`, quantities);
        break;

      case 'linear_perimeter':
        quantities = calculateLinearMaterial(input.squareFootage, material, input.customPerimeter);
        console.log(`  📊 Linear calculation (${category.category_key}):`, quantities);
        break;

      default:
        console.error(`❌ Unknown calculation method: ${category.calculation_method}`);
        continue;
    }

    results.push({
      categoryKey: category.category_key,
      categoryLabel: category.category_label,
      materialId: material.id,
      materialName: material.material_name,
      calculationMethod: category.calculation_method,
      quantities,
      subtotal: quantities.totalCost
    });
  }

  // Step 4: Calculate totals
  const totalMaterialCost = results.reduce((sum, r) => sum + r.subtotal, 0);
  const costPerSquareFoot = totalMaterialCost / input.squareFootage;

  // Step 5: Build detailed units summary
  const detailedUnits: MaterialCalculationResult['detailedUnits'] = {};
  results.forEach(r => {
    detailedUnits[r.categoryKey] = {
      unitsNeeded: r.quantities.purchaseUnitsRounded,
      unitLabel: r.quantities.unitLabel,
      displayText: r.quantities.quantityDisplay
    };
  });

  // Step 6: Generate breakdown text
  const breakdown = results.map(r =>
    `${r.categoryLabel}: ${r.quantities.quantityDisplay} = $${r.subtotal.toFixed(2)}`
  ).join('\n');

  console.log('💰 [MATERIAL CALC] Calculation complete:', {
    categories: results.length,
    totalCost: totalMaterialCost.toFixed(2),
    costPerSqft: costPerSquareFoot.toFixed(2)
  });

  return {
    categories: results,
    totalMaterialCost,
    costPerSquareFoot,
    breakdown,
    detailedUnits
  };
}
