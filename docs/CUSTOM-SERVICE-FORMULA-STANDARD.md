# Custom Service Formula Standard

**Purpose**: Universal calculation framework for building custom landscaping and hardscaping services
**Applies to**: All contractor services (paver patios, mulch, retaining walls, concrete, excavation, etc.)
**Status**: Standard for AI Chat integration and custom service wizard

---

## Overview

This document defines the **standard formula structure** that ALL custom services must follow. By adhering to this standard, contractors can create unlimited custom services while the AI system maintains full understanding of pricing calculations.

### Core Principle: Two-Tier Separation

Every service calculates in TWO distinct phases:
1. **Tier 1 (Labor Hours)**: How long the job takes → TIME
2. **Tier 2 (Total Price)**: How much the job costs → PRICE

This separation prevents exponential pricing errors and mirrors real-world construction estimating.

---

## SECTION 1: Two-Tier Formula Foundation

### Tier 1: Labor Hours Calculation

**Purpose**: Determine man-hours required for the project

**Base Formula**:
```
Base Hours = (measurement_value ÷ base_productivity) × team_size × 8_hours_per_day
```

**Example** (Paver Patio):
```
100 sqft ÷ 50 sqft/day = 2 days
2 days × 3 people × 8 hours/day = 48 base hours
```

**Variable Adjustments** (applied to base hours):
```
Adjusted Hours = Base Hours + Σ(Variable Impacts)
```

**Variables that affect Tier 1**:
- `labor_time_percentage`: Adds % of base hours
- `cutting_complexity`: Adds fixed hours
- Any variable with `calculationTier: 1`

**Critical Rule**: All percentage-based adjustments apply to BASE hours independently (not cascading).

### Tier 2: Total Price Calculation

**Purpose**: Convert labor hours to final project cost

**Cost Components** (in order):
```
1. Labor Cost = total_hours × hourly_labor_rate
2. Material Cost = Σ(Material Category Calculations) + waste
3. Equipment Cost = daily_rate × project_days (PASS-THROUGH)
4. Obstacle/Fee Cost = flat_fees (PASS-THROUGH)
5. Profitable Subtotal = Labor + Materials
6. Complexity Adjustment = profitable_subtotal × complexity_multiplier
7. Profit = adjusted_subtotal × profit_margin
8. Pass-Through Add-Back = equipment_cost + flat_fees
9. Final Total = adjusted_subtotal + profit + pass_through_costs
```

**Pass-Through Costs**: Equipment rentals and flat fees do NOT get profit markup or complexity adjustment.

**Why This Matters**: Prevents inflating third-party costs (you don't profit from equipment rentals).

---

## SECTION 2: Service Type Categories

### Hardscaping Services

**Measurement**: Typically sqft or linear ft
**Base Productivity Range**: 20-100 sqft/day or 10-30 linear ft/day
**Common Materials**: Pavers, concrete, stone, base rock, sand, edging
**Labor Factors**: Excavation depth, tearout, cutting complexity, access

**Examples**:
- Paver Patios: 50 sqft/day, area-based materials
- Retaining Walls: 15 linear ft/day, height-based materials
- Driveways: 75 sqft/day, volume-based concrete
- Walkways: 40 sqft/day, area-based pavers

### Landscaping Services

**Measurement**: Typically sqft or per-item
**Base Productivity Range**: 100-500 sqft/day or 5-20 items/day
**Common Materials**: Mulch, soil, sod, fabric, plants, edging
**Labor Factors**: Bed preparation, planting depth, terrain

**Examples**:
- Mulch Beds: 200 sqft/day, volume-based mulch
- Sod Installation: 300 sqft/day, area-based sod
- Tree Planting: 5 trees/day, per-item materials
- Irrigation: 150 linear ft/day, linear-based pipe

### Excavation & Grading Services

**Measurement**: Typically cubic yards or sqft area
**Base Productivity Range**: 20-100 cubic yards/day or 200-500 sqft/day
**Common Materials**: Fill dirt, gravel, compaction equipment
**Labor Factors**: Soil conditions, access, depth, disposal

**Examples**:
- Grading: 300 sqft/day, volume-based dirt
- Trenching: 50 linear ft/day, depth-dependent
- Foundation Prep: 100 sqft/day, volume-based materials

### Specialty Services

**Measurement**: Often per-item or custom units
**Base Productivity Range**: Highly variable (0.5-5 items/day)
**Common Materials**: Custom per service type
**Labor Factors**: Design complexity, specialty skills required

**Examples**:
- Water Features: 1 feature/week, custom materials
- Outdoor Kitchens: 0.5 kitchens/week, many material types
- Pergolas: 1 structure/week, lumber and hardware
- Decks: 20 sqft/day, lumber and fasteners

---

## SECTION 3: Material Category Calculation Methods

Each material category in `service_material_categories` table must specify a `calculation_method`. These are the 6 standard methods:

### Method 1: AREA_COVERAGE (sqft-based)

**When to Use**: Materials that cover flat surface area (pavers, mulch, sod, fabric)

**Formula**:
```
quantity_needed = (project_area_sqft ÷ coverage_per_unit) × (1 + waste_factor)
cost = quantity_needed × price_per_unit
```

**Database Fields Required**:
- `coverage_per_unit`: sqft covered per unit (e.g., 4.5 sqft per paver unit)
- `waste_factor_percentage`: Waste % (e.g., 10% = 0.10)

**Example** (Pavers):
```
Project: 100 sqft patio
Material: Cambridge Ledgestone
  - coverage_per_unit: 4.5 sqft
  - waste_factor_percentage: 0.10 (10%)
  - price_per_unit: $8.50

Calculation:
  quantity = (100 ÷ 4.5) × 1.10 = 24.44 units
  cost = 24.44 × $8.50 = $207.78
```

### Method 2: VOLUME_COVERAGE (cubic ft/yd-based)

**When to Use**: Materials with depth component that settle/compact (base rock, concrete, fill dirt)

**Formula**:
```
volume_cubic_ft = (area_sqft × depth_inches ÷ 12)
volume_cubic_yards = volume_cubic_ft ÷ 27
quantity_with_compaction = volume_cubic_yards × (1 + compaction_factor)
cost = quantity_with_compaction × price_per_cubic_yard
```

**Database Fields Required**:
- `coverage_depth_inches`: Standard depth (e.g., 6" for base rock)
- `compaction_factor_percentage`: Settlement % (e.g., 20% = 0.20)
- `price_per_unit`: Price per cubic yard

**Example** (Base Rock):
```
Project: 100 sqft patio, 6" depth
Material: #57 Crushed Stone
  - coverage_depth_inches: 6
  - compaction_factor_percentage: 0.20 (20%)
  - price_per_unit: $45.00/cubic yard

Calculation:
  volume_cf = (100 × 6 ÷ 12) = 50 cubic ft
  volume_cy = 50 ÷ 27 = 1.85 cubic yards
  quantity = 1.85 × 1.20 = 2.22 cubic yards
  cost = 2.22 × $45.00 = $99.90
```

### Method 3: LINEAR_COVERAGE (linear ft-based)

**When to Use**: Materials used along perimeters/borders (edging, pipe, fabric rolls)

**Formula**:
```
quantity_needed = linear_feet ÷ coverage_per_unit
cost = quantity_needed × price_per_unit
```

**Database Fields Required**:
- `coverage_per_unit`: Linear ft per unit (e.g., 20 ft per edging piece)
- `length_inches`: Physical length of one unit (for display/planning)

**Example** (Landscape Edging):
```
Project: 40 linear ft perimeter
Material: Poly Edging 20ft sections
  - coverage_per_unit: 20 linear ft
  - price_per_unit: $18.00

Calculation:
  quantity = 40 ÷ 20 = 2 units
  cost = 2 × $18.00 = $36.00
```

### Method 4: PER_UNIT (count-based)

**When to Use**: Discrete items sold in packages/bags (sand bags, plants, posts)

**Formula**:
```
quantity_needed = count_required × units_per_package
cost = quantity_needed × price_per_unit
```

**Database Fields Required**:
- `units_per_package`: How many items per package (e.g., 50 lbs per bag)
- `coverage_per_unit`: Optional - if package covers specific area

**Example** (Polymeric Sand):
```
Project: 100 sqft patio (needs 2 bags per 100 sqft)
Material: Polymeric Sand 50lb bags
  - coverage_per_unit: 50 sqft per bag
  - price_per_unit: $42.00

Calculation:
  quantity = 100 ÷ 50 = 2 bags
  cost = 2 × $42.00 = $84.00
```

### Method 5: WEIGHT_BASED (lbs/tons)

**When to Use**: Materials specified by weight (stone dust, bonding agents, aggregates)

**Formula**:
```
weight_needed_lbs = area_sqft × weight_per_sqft × (1 + waste_factor)
cost = (weight_needed_lbs ÷ weight_per_unit) × price_per_unit
```

**Database Fields Required**:
- `weight_lbs`: Weight per unit (e.g., 50 lbs per bag)
- `coverage_per_unit`: sqft covered per unit weight
- `waste_factor_percentage`: Overage %

**Example** (Stone Dust):
```
Project: 100 sqft patio, 1" depth
Material: Stone Dust 50lb bags
  - weight_lbs: 50
  - coverage_per_unit: 10 sqft @ 1" depth (5 lbs/sqft)
  - waste_factor_percentage: 0.10 (10%)

Calculation:
  weight_needed = 100 × 5 × 1.10 = 550 lbs
  quantity = 550 ÷ 50 = 11 bags
  cost = 11 × $12.50 = $137.50
```

### Method 6: CUSTOM_FORMULA (JSON-defined)

**When to Use**: Complex calculations not fitting standard patterns

**Formula**: Stored in `variables_config` JSONB field as custom logic

**Database Fields Required**:
- Custom fields defined in service-specific JSONB
- Calculation logic embedded in pricing engine

**Example** (Retaining Wall - Height-Based):
```
Material: Wall Blocks
Custom logic:
  if height <= 2ft: 6 blocks/linear ft
  if height <= 3ft: 9 blocks/linear ft
  if height <= 4ft: 12 blocks/linear ft
  if height > 4ft: 15 blocks/linear ft + engineering fee

Stored in JSONB:
{
  "calculation_method": "CUSTOM_FORMULA",
  "formula": {
    "type": "height_tiered",
    "tiers": [
      { "max_height": 24, "blocks_per_lf": 6 },
      { "max_height": 36, "blocks_per_lf": 9 },
      { "max_height": 48, "blocks_per_lf": 12 },
      { "max_height": 999, "blocks_per_lf": 15, "additional_fee": 500 }
    ]
  }
}
```

---

## SECTION 4: Variable Effect Types - Complete Reference

Every variable in `variables_config` JSONB must map to ONE of these 6 effect types:

### Effect Type 1: labor_time_percentage

**Purpose**: Adds percentage-based time to base labor hours (Tier 1)

**Fields Required**:
- `value` (number): Display percentage (e.g., 20 for 20%)
- `multiplier` (number): Calculated as `1 + (value ÷ 100)` (e.g., 1.20)

**Calculation**:
```
additional_hours = base_hours × (value ÷ 100)
```

**Use Cases**:
- Site conditions: Access difficulty, terrain slope, working space
- Demolition: Tearout complexity (grass vs concrete vs asphalt)
- Team factors: Small crew inefficiency (2-person vs 3-person team)
- Excavation: Depth requirements, soil conditions

**Example Variables**:
```json
{
  "accessDifficulty": {
    "type": "select",
    "label": "Access Difficulty",
    "effectType": "labor_time_percentage",
    "calculationTier": 1,
    "options": {
      "easy": { "label": "Open Access", "value": 0, "multiplier": 1.0 },
      "moderate": { "label": "Limited Access", "value": 50, "multiplier": 1.5 },
      "difficult": { "label": "Very Restricted", "value": 100, "multiplier": 2.0 }
    }
  }
}
```

### Effect Type 2: material_cost_multiplier

**Purpose**: Multiplies material costs by percentage (Tier 2)

**Fields Required**:
- `value` (number): Display percentage (e.g., 40 for 40%)
- `multiplier` (number): Calculated as `1 + (value ÷ 100)` (e.g., 1.40)

**Calculation**:
```
adjusted_material_cost = base_material_cost × multiplier
```

**Use Cases**:
- Quality upgrades: Standard → Premium → Designer grade
- Brand premiums: Generic → Name brand materials
- Specialty finishes: Colors, textures, stamping patterns
- Style selections: Basic → Architectural designs

**Example Variables**:
```json
{
  "paverStyle": {
    "type": "select",
    "label": "Paver Style & Quality",
    "effectType": "material_cost_multiplier",
    "calculationTier": 2,
    "options": {
      "standard": { "label": "Standard Grade", "value": 0, "multiplier": 1.0 },
      "premium": { "label": "Premium Grade", "value": 40, "multiplier": 1.4 },
      "designer": { "label": "Designer Series", "value": 80, "multiplier": 1.8 }
    }
  }
}
```

### Effect Type 3: total_project_multiplier

**Purpose**: Multiplies entire subtotal by complexity factor (Tier 2, before profit)

**Fields Required**:
- `value` (number): Display percentage (e.g., 30 for 30%)
- `multiplier` (number): Calculated as `1 + (value ÷ 100)` (e.g., 1.30)

**Calculation**:
```
adjusted_total = (labor_cost + material_cost) × multiplier
profit = adjusted_total × profit_margin
final = adjusted_total + profit + pass_through_costs
```

**Use Cases**:
- Project complexity: Simple → Standard → Complex → Extreme
- Seasonal factors: Winter conditions, weather challenges
- Risk factors: Safety requirements, insurance considerations
- Timeline pressure: Rush jobs, deadline constraints

**Example Variables**:
```json
{
  "overallComplexity": {
    "type": "select",
    "label": "Overall Project Complexity",
    "effectType": "total_project_multiplier",
    "calculationTier": 2,
    "options": {
      "simple": { "label": "Simple/Straightforward", "value": 0, "multiplier": 1.0 },
      "standard": { "label": "Standard Complexity", "value": 10, "multiplier": 1.1 },
      "complex": { "label": "Complex Design", "value": 30, "multiplier": 1.3 },
      "extreme": { "label": "Highly Complex", "value": 50, "multiplier": 1.5 }
    }
  }
}
```

### Effect Type 4: cutting_complexity

**Purpose**: DUAL IMPACT - Adds fixed labor hours (Tier 1) AND material waste percentage (Tier 2)

**Fields Required**:
- `laborPercentage` (number): NOT a multiplier - fixed hours to add
- `materialWaste` (number): Waste percentage to add to materials

**Calculation**:
```
Tier 1: additional_hours = fixed_hours (from laborPercentage field name, but actually fixed value)
Tier 2: waste_cost = material_cost × (materialWaste ÷ 100)
```

**Use Cases**:
- Pattern complexity: Straight runs vs curves vs intricate designs
- Cutting requirements: Minimal → Moderate → Extensive cutting
- Waste generation: Simple cuts vs complex angles

**Example Variables**:
```json
{
  "cuttingComplexity": {
    "type": "select",
    "label": "Cutting Complexity",
    "effectType": "cutting_complexity",
    "calculationTier": "both",
    "options": {
      "minimal": {
        "label": "Minimal Cutting (Baseline)",
        "laborPercentage": 0,
        "materialWaste": 0
      },
      "moderate": {
        "label": "Moderate Cutting",
        "laborPercentage": 6,  // Adds 6 fixed hours
        "materialWaste": 15     // Adds 15% material waste
      },
      "complex": {
        "label": "Complex Cutting",
        "laborPercentage": 12,
        "materialWaste": 25
      }
    }
  }
}
```

**CRITICAL**: Despite the field name `laborPercentage`, this is actually FIXED HOURS, not a percentage. This is for backwards compatibility.

### Effect Type 5: daily_equipment_cost

**Purpose**: Dollar cost per project day for equipment rentals (Tier 2, PASS-THROUGH)

**Fields Required**:
- `value` (number): Daily rental rate in dollars

**Calculation**:
```
project_days = total_hours ÷ (team_size × 8)
equipment_cost = value × project_days
```

**Pass-Through Status**: This cost is added AFTER profit calculation with NO markup.

**Use Cases**:
- Equipment rentals: Skid steers, excavators, compactors
- Specialty tools: Laser levels, concrete saws, trenchers
- Machinery packages: Combined equipment needs

**Example Variables**:
```json
{
  "equipmentRequired": {
    "type": "select",
    "label": "Equipment Required",
    "effectType": "daily_equipment_cost",
    "calculationTier": 2,
    "options": {
      "handTools": { "label": "Hand Tools Only", "value": 0 },
      "powerTools": { "label": "Power Tools Package", "value": 75 },
      "lightMachinery": { "label": "Light Machinery", "value": 250 },
      "heavyEquipment": { "label": "Heavy Equipment", "value": 450 }
    }
  }
}
```

### Effect Type 6: flat_additional_cost

**Purpose**: One-time flat fees added to project (Tier 2, PASS-THROUGH)

**Fields Required**:
- `value` (number): Fixed dollar amount

**Calculation**:
```
total = subtotal + profit + equipment_cost + value
```

**Pass-Through Status**: This cost is added AFTER profit calculation with NO markup.

**Use Cases**:
- Disposal fees: Debris removal, dump charges
- Permits: Municipal fees, inspection costs
- Subcontractor fees: Electrical, plumbing tie-ins
- Specialty services: Survey, engineering, testing

**Example Variables**:
```json
{
  "obstacleRemoval": {
    "type": "select",
    "label": "Obstacle Removal",
    "effectType": "flat_additional_cost",
    "calculationTier": 2,
    "options": {
      "none": { "label": "No Obstacles", "value": 0 },
      "minor": { "label": "Minor Obstacles", "value": 500 },
      "major": { "label": "Major Obstacles", "value": 1200 }
    }
  }
}
```

---

## SECTION 5: Custom Service Creation Workflow

### Step 1: Define Service Identity

**Fields to Set**:
```
service_name: "Mulch Bed Installation"  (display name)
service_id: "mulch_bed_installation_sqft"  (database key - lowercase, underscores, unit suffix)
category: "landscape"  (hardscape/landscape/excavation/specialty)
```

**Service ID Requirements**:
- Must be unique within company
- Lowercase letters, numbers, underscores only
- Should end with measurement unit: `_sqft`, `_linear_ft`, `_item`, `_cubic_yd`
- Examples: `retaining_wall_linear_ft`, `tree_planting_item`, `grading_cubic_yd`

### Step 2: Set Base Settings

**Stored as columns in `service_pricing_configs` table**:

```sql
INSERT INTO service_pricing_configs (
  company_id,
  service_name,
  hourly_labor_rate,      -- $/hour per worker (e.g., 25.00)
  optimal_team_size,      -- People (e.g., 3)
  base_productivity,      -- Units per day (e.g., 50 sqft/day)
  base_material_cost,     -- $/unit baseline if not using detailed materials (e.g., 5.84)
  profit_margin,          -- Decimal (e.g., 0.20 for 20%)
  variables_config,       -- JSONB (see Step 5)
  default_variables       -- JSONB (see Step 6)
) VALUES (...);
```

**Base Productivity Units**:
- Area services: `sqft/day` or `acres/day`
- Linear services: `linear_ft/day` or `miles/day`
- Volume services: `cubic_yd/day`
- Item services: `items/day` or `units/day`

### Step 3: Define Material Categories

**Create rows in `service_material_categories` table**:

```sql
INSERT INTO service_material_categories (
  company_id,
  service_config_id,  -- References service_pricing_configs.id
  category_key,       -- Internal key (e.g., "base_rock")
  category_label,     -- Display name (e.g., "Base Rock & Gravel")
  category_description,
  calculation_method, -- One of 6 methods from Section 3
  default_depth_inches, -- For volume-based materials
  sort_order,         -- Display order
  is_required         -- Must select material from this category?
) VALUES (...);
```

**Example** (Paver Patio Service):
```
Category 1: pavers (AREA_COVERAGE, required)
Category 2: base_rock (VOLUME_COVERAGE, required, 6" default depth)
Category 3: sand (VOLUME_COVERAGE, required, 1" default depth)
Category 4: edging (LINEAR_COVERAGE, optional)
Category 5: polymeric_sand (PER_UNIT, required)
```

### Step 4: Add Materials to Categories

**Create rows in `service_materials` table for each product**:

```sql
INSERT INTO service_materials (
  company_id,
  service_config_id,
  material_name,           -- Display name (e.g., "Cambridge Ledgestone")
  material_category,       -- Matches category_key from step 3
  material_description,
  supplier_name,           -- Optional supplier reference
  unit_type,               -- "sqft", "cubic_yd", "linear_ft", "bag", "ton", etc.
  price_per_unit,          -- Cost per unit
  coverage_per_unit,       -- For AREA/LINEAR methods
  coverage_depth_inches,   -- For VOLUME methods
  waste_factor_percentage, -- Waste/overage (e.g., 0.10 = 10%)
  compaction_factor_percentage, -- Settlement for VOLUME (e.g., 0.20 = 20%)
  is_default,              -- Pre-select this material?
  is_active
) VALUES (...);
```

**Example Materials** (Paver Category):
```
Material 1:
  name: "Standard Concrete Pavers"
  category: "pavers"
  unit_type: "sqft"
  price_per_unit: 5.84
  coverage_per_unit: 1.0  (1 sqft per sqft)
  waste_factor: 0.10 (10%)

Material 2:
  name: "Cambridge Ledgestone"
  category: "pavers"
  unit_type: "unit"
  price_per_unit: 8.50
  coverage_per_unit: 4.5  (4.5 sqft per paver unit)
  waste_factor: 0.15 (15%)

Material 3:
  name: "Designer Series Pavers"
  category: "pavers"
  unit_type: "sqft"
  price_per_unit: 12.00
  coverage_per_unit: 1.0
  waste_factor: 0.20 (20% - complex patterns)
```

### Step 5: Design Variables

**Stored in `variables_config` JSONB field** (JSON structure):

```json
{
  "excavation": {
    "label": "Excavation & Site Preparation",
    "description": "Variables affecting site work",
    "tearoutComplexity": {
      "type": "select",
      "label": "Tearout Complexity",
      "effectType": "labor_time_percentage",
      "calculationTier": 1,
      "default": "grass",
      "options": {
        "grass": { "label": "Grass/Sod Only", "value": 0, "multiplier": 1.0 },
        "concrete": { "label": "Concrete Removal", "value": 20, "multiplier": 1.2 }
      }
    },
    "equipmentRequired": {
      "type": "select",
      "label": "Equipment Required",
      "effectType": "daily_equipment_cost",
      "calculationTier": 2,
      "default": "handTools",
      "options": {
        "handTools": { "label": "Hand Tools", "value": 0 },
        "lightMachinery": { "label": "Skid Steer", "value": 250 }
      }
    }
  },
  "materials": {
    "label": "Materials & Quality",
    "description": "Material selection variables",
    "paverStyle": {
      "type": "select",
      "label": "Paver Style",
      "effectType": "material_cost_multiplier",
      "calculationTier": 2,
      "default": "standard",
      "options": {
        "standard": { "label": "Standard", "value": 0, "multiplier": 1.0 },
        "premium": { "label": "Premium", "value": 40, "multiplier": 1.4 }
      }
    }
  },
  "complexity": {
    "label": "Project Complexity",
    "description": "Overall difficulty factors",
    "overallComplexity": {
      "type": "select",
      "label": "Project Complexity",
      "effectType": "total_project_multiplier",
      "calculationTier": 2,
      "default": "simple",
      "options": {
        "simple": { "label": "Simple", "value": 0, "multiplier": 1.0 },
        "complex": { "label": "Complex", "value": 30, "multiplier": 1.3 }
      }
    }
  }
}
```

**Variable Organization Best Practices**:
- Group related variables into categories
- Use descriptive labels for user clarity
- Set realistic default values
- Include descriptions to explain impact

### Step 6: Set Default Values

**Stored in `default_variables` JSONB field**:

```json
{
  "excavation": {
    "tearoutComplexity": "grass",
    "equipmentRequired": "handTools"
  },
  "materials": {
    "paverStyle": "standard"
  },
  "complexity": {
    "overallComplexity": "simple"
  }
}
```

These defaults pre-populate the Quick Calculator for faster quoting.

### Step 7: Validate Formula

**Test Calculations**:

1. **Base Case Test** (all defaults):
   - Enter minimum project size
   - Verify Tier 1 hours calculate correctly
   - Verify Tier 2 price matches expected value

2. **Variable Impact Test**:
   - Change one variable at a time
   - Confirm correct impact on hours or price
   - Check pass-through costs have no profit markup

3. **Material Cost Test**:
   - Test each material calculation method
   - Verify coverage, waste, compaction factors work
   - Confirm multi-category material totals are correct

4. **Edge Case Test**:
   - Maximum project size
   - All complexity variables at max
   - Verify no exponential pricing errors

---

## SECTION 6: Example Service Templates

### Template A: Mulch Bed Installation

**Service Profile**:
```
Type: Landscape (area-based)
Measurement: sqft
Base Productivity: 200 sqft/day
Team Size: 2 people
Labor Rate: $20/hour (lighter work)
Profit Margin: 25%
```

**Material Categories**:
1. **mulch_material** (VOLUME_COVERAGE):
   - Calculation: (sqft × 3" depth) ÷ 324 = cubic yards
   - Waste: 5%
   - Example materials: Hardwood mulch, pine bark, cedar

2. **landscape_fabric** (AREA_COVERAGE):
   - Calculation: sqft × 1.05 (5% waste)
   - Example: 3ft × 300ft rolls

3. **edging** (LINEAR_COVERAGE):
   - Calculation: Perimeter length ÷ 20ft sections
   - Example: Poly edging, metal edging, stone border

**Variables**:
```json
{
  "bedPreparation": {
    "effectType": "labor_time_percentage",
    "options": {
      "minimal": { "value": 0, "multiplier": 1.0 },
      "moderate": { "value": 30, "multiplier": 1.3 },  // Weeding, edging
      "extensive": { "value": 60, "multiplier": 1.6 }  // Full soil replacement
    }
  },
  "mulchType": {
    "effectType": "material_cost_multiplier",
    "options": {
      "standard": { "value": 0, "multiplier": 1.0 },    // Hardwood
      "premium": { "value": 25, "multiplier": 1.25 },   // Cedar
      "designer": { "value": 50, "multiplier": 1.5 }    // Colored/rubber
    }
  },
  "edgingStyle": {
    "effectType": "flat_additional_cost",
    "options": {
      "none": { "value": 0 },
      "standard": { "value": 150 },  // Poly edging
      "premium": { "value": 400 }    // Metal edging
    }
  }
}
```

**Example Quote** (150 sqft bed):
```
Tier 1:
  Base: 150 sqft ÷ 200 sqft/day = 0.75 days × 2 people × 8 hours = 12 hours
  Bed prep (moderate +30%): +3.6 hours
  Total: 15.6 hours

Tier 2:
  Labor: 15.6 hours × $20 = $312
  Mulch (3" depth): 1.39 cubic yards × $45 = $62.55
  Fabric: 158 sqft × $0.15 = $23.70
  Subtotal: $398.25
  Profit (25%): $99.56
  Edging (flat): $150
  Total: $647.81
```

### Template B: Retaining Wall (Linear Ft-Based)

**Service Profile**:
```
Type: Hardscape (linear-based)
Measurement: linear_ft
Base Productivity: 15 linear_ft/day
Team Size: 3 people
Labor Rate: $30/hour (skilled work)
Profit Margin: 30% (high complexity)
```

**Material Categories**:
1. **wall_blocks** (CUSTOM_FORMULA - height-tiered):
   - Formula: blocks_per_lf = f(wall_height)
   - 2ft wall: 6 blocks/lf
   - 3ft wall: 9 blocks/lf
   - 4ft+ wall: 12 blocks/lf + engineering

2. **base_gravel** (VOLUME_COVERAGE):
   - Depth: 6" compacted base
   - Compaction: 20%
   - Width: 12" wider than wall base

3. **drainage_aggregate** (VOLUME_COVERAGE):
   - Depth: 12" behind wall
   - Width: 12" from wall back

4. **drainage_pipe** (LINEAR_COVERAGE):
   - 4" perforated pipe behind wall
   - Every wall requires drainage

**Variables**:
```json
{
  "wallHeight": {
    "effectType": "labor_time_percentage",  // Also affects materials via CUSTOM_FORMULA
    "calculationTier": "both",
    "options": {
      "2ft": { "value": 0, "multiplier": 1.0 },
      "3ft": { "value": 40, "multiplier": 1.4 },
      "4ft": { "value": 90, "multiplier": 1.9 },
      "5ft_plus": { "value": 150, "multiplier": 2.5 }  // Requires engineering
    }
  },
  "soilConditions": {
    "effectType": "labor_time_percentage",
    "options": {
      "stable": { "value": 0, "multiplier": 1.0 },
      "moderate": { "value": 25, "multiplier": 1.25 },
      "poor": { "value": 60, "multiplier": 1.6 }  // Clay, wet soil
    }
  },
  "blockStyle": {
    "effectType": "material_cost_multiplier",
    "options": {
      "standard": { "value": 0, "multiplier": 1.0 },
      "architectural": { "value": 50, "multiplier": 1.5 },
      "natural_stone": { "value": 120, "multiplier": 2.2 }
    }
  }
}
```

**Example Quote** (30 linear ft, 3ft height):
```
Tier 1:
  Base: 30 lf ÷ 15 lf/day = 2 days × 3 people × 8 hours = 48 hours
  Height (3ft +40%): +19.2 hours
  Soil (moderate +25%): +12 hours
  Total: 79.2 hours

Tier 2:
  Labor: 79.2 hours × $30 = $2,376
  Wall blocks (9/lf): 270 blocks × $4.50 = $1,215
  Base gravel: 1.85 cy × $45 = $83.25
  Drainage aggregate: 2.22 cy × $55 = $122.10
  Drainage pipe: 30 lf × $3.50 = $105
  Subtotal: $3,901.35
  Profit (30%): $1,170.41
  Total: $5,071.76 ($169/linear ft)
```

---

## SECTION 7: AI Intelligence Integration

### How AI Should Understand Custom Services

#### 1. Service Recognition

**Database Query Flow**:
```typescript
// Load service config
const serviceConfig = await supabase
  .from('service_pricing_configs')
  .select('*')
  .eq('service_name', serviceName)
  .eq('company_id', companyId)
  .single();

// Parse measurement unit from productivity field
const productivityUnit = parseUnit(serviceConfig.base_productivity);
// Examples: "sqft/day" → "sqft", "linear_ft/day" → "linear_ft"

// Load material categories
const materialCategories = await supabase
  .from('service_material_categories')
  .select('*')
  .eq('service_config_id', serviceConfig.id)
  .order('sort_order');
```

**AI Understanding**:
- Service is area-based (sqft), linear-based (linear_ft), or item-based
- Identifies which variables affect labor (Tier 1) vs price (Tier 2)
- Knows which material categories are required vs optional

#### 2. Material Cost Explanation

**For Each Material Category**:
```typescript
const category = materialCategories.find(c => c.category_key === 'pavers');

// AI explains calculation method
switch(category.calculation_method) {
  case 'AREA_COVERAGE':
    explanation = `${category.category_label} are calculated per square foot.
                   Each unit covers ${material.coverage_per_unit} sqft.
                   We add ${material.waste_factor * 100}% for waste and cutting.`;
    break;

  case 'VOLUME_COVERAGE':
    explanation = `${category.category_label} are calculated by volume.
                   For ${project.area} sqft at ${category.default_depth_inches}" depth,
                   we need ${calculated_volume} cubic yards.
                   We add ${material.compaction_factor * 100}% for compaction.`;
    break;

  // ... other methods
}
```

**AI Material Comparison**:
```
User: "What's the difference between standard and premium pavers?"

AI: "For your 100 sqft patio:
     • Standard Pavers: $584 materials (22 units @ $8.50/unit)
     • Premium Pavers: $818 materials (22 units @ $11.90/unit)

     The premium pavers add $234 to material cost (+40%). They offer
     better durability and color consistency. Your total project would
     be $2,140 (standard) vs $2,374 (premium)."
```

#### 3. Variable Impact Communication

**Labor Variables** (Tier 1):
```
User: "What if access is difficult?"

AI: "Difficult access adds 100% to base labor time:
     • Base hours: 48 hours
     • With difficult access: +48 hours = 96 total hours

     This increases labor cost from $1,200 to $2,400 (+$1,200).
     Difficult access means tight spaces requiring wheelbarrow transport
     instead of machinery, doubling the time needed."
```

**Material Variables** (Tier 2):
```
User: "How much more for designer pavers?"

AI: "Designer pavers add 80% to material costs:
     • Standard material cost: $584
     • Designer upgrade: +$467 (80% increase)
     • New material total: $1,051

     This increases your project total from $2,140 to $2,607 (+$467).
     Designer pavers offer premium aesthetics with unique patterns and colors."
```

**Pass-Through Costs**:
```
User: "Do I need equipment rental?"

AI: "For your project, equipment options:
     • Hand Tools: $0 (included in labor rate)
     • Light Machinery (skid steer): +$625 for 2.5 project days

     IMPORTANT: Equipment rental is billed at cost with no markup.
     The $625 is the actual rental charge passed through to you.

     Light machinery would speed up excavation but adds direct rental cost.
     For 100 sqft, hand tools are usually sufficient."
```

#### 4. Conversational Pricing Flow

**Qualifying Question Sequence**:
```
AI: "I'll help you price a paver patio. Let me ask a few questions:

1. What's the approximate size?
   (User: "About 12 feet by 15 feet")

   [AI calculates: 12 × 15 = 180 sqft]

2. What's currently there - grass, concrete, or asphalt?
   (User: "It's grass right now")

   [AI selects: tearoutComplexity = "grass" (no extra time)]

3. What style of pavers are you interested in?
   • Standard grade: $5.84/sqft baseline
   • Premium grade: $8.18/sqft (+40%)
   • Designer series: $10.51/sqft (+80%)

   (User: "Let's start with standard")

   [AI selects: paverStyle = "standard"]

4. How easy is access to the backyard?
   (User: "There's a gate, but it's only 3 feet wide")

   [AI selects: accessDifficulty = "moderate" (+50% labor)]

Calculating your quote...

PROJECT SUMMARY:
- Size: 180 sqft paver patio
- Current: Grass (standard removal)
- Pavers: Standard grade
- Access: Moderate difficulty

PRICING BREAKDOWN:
Labor: 86.4 hours × $25/hr = $2,160
Materials: 180 sqft × $5.84 = $1,051
Subtotal: $3,211
Profit (20%): $642
TOTAL: $3,853 ($21.41/sqft)

Would you like to adjust any selections or get alternate quotes?"
```

#### 5. Quote Breakdown Transparency

**Detailed Explanation**:
```
AI: "Here's how we calculated your $3,853 paver patio quote:

LABOR CALCULATION:
Step 1 - Base Hours:
  180 sqft ÷ 50 sqft/day = 3.6 days
  3.6 days × 3 people × 8 hours = 86.4 hours

Step 2 - Access Adjustment:
  Moderate difficulty adds 50% to base hours
  86.4 × 0.50 = +43.2 hours
  Total labor: 86.4 + 43.2 = 129.6 hours

Step 3 - Labor Cost:
  129.6 hours × $25/hour = $3,240

MATERIAL CALCULATION:
Cambridge Ledgestone pavers:
  Coverage: 4.5 sqft per unit
  Quantity needed: 180 ÷ 4.5 = 40 units
  Waste factor: 15% (curves/cuts) = +6 units
  Total: 46 units × $8.50 = $391

Base rock (6" depth):
  Volume: 9 cubic yards
  Compaction: 20% = +1.8 cy
  Total: 10.8 cy × $45 = $486

[+ other materials...]

Total Materials: $1,051

FINAL CALCULATION:
Labor + Materials: $4,291
Profit (20%): $858
TOTAL: $5,149

This is a transparent, itemized quote showing exactly how we arrived at
the final price. Any questions about specific line items?"
```

---

## Summary: Standard Requirements Checklist

When creating a custom service, ensure ALL these requirements are met:

**✅ Service Identity**:
- [ ] Unique service_name (display)
- [ ] Unique service_id (database key with unit suffix)
- [ ] Category assigned (hardscape/landscape/excavation/specialty)

**✅ Base Settings (Database Columns)**:
- [ ] hourly_labor_rate set
- [ ] optimal_team_size set
- [ ] base_productivity set (with unit: sqft/day, linear_ft/day, etc.)
- [ ] base_material_cost set (if not using detailed materials)
- [ ] profit_margin set

**✅ Material Categories (If Using Detailed Materials)**:
- [ ] At least 1 category defined in service_material_categories
- [ ] Each category has calculation_method from standard 6 options
- [ ] Required categories marked appropriately
- [ ] At least 1 material per category in service_materials table

**✅ Variables (JSONB Structure)**:
- [ ] All variables mapped to one of 6 effect types
- [ ] Percentage-based variables have both value + multiplier fields
- [ ] Pass-through costs use daily_equipment_cost or flat_additional_cost
- [ ] Variables organized into logical categories
- [ ] Default values set for all variables

**✅ Calculation Validation**:
- [ ] Tier 1 calculation produces realistic labor hours
- [ ] Tier 2 calculation produces realistic pricing
- [ ] Pass-through costs NOT included in profit calculation
- [ ] Material costs calculate correctly per chosen methods
- [ ] Total price scales linearly (no exponential pricing)

**✅ AI Integration**:
- [ ] Service has descriptive labels and descriptions
- [ ] Variables have clear, user-friendly option names
- [ ] Material categories have explanatory descriptions
- [ ] Default values create reasonable baseline quotes

---

## SECTION 8: Custom Service Wizard - Step 7 Implementation

### Overview: Pricing Preview Final Window

**Purpose**: Provide a full-screen, interactive pricing calculator as the final validation step of the custom service wizard. This allows service creators to test their formula with real calculations before activating the service.

**UI Pattern**: Based on `QuickCalculatorTab.tsx` and `PaverPatioManager.tsx` component patterns

**Key Features**:
1. Full-screen pricing preview using Quick Calculator components
2. All variable categories expanded by default (open calculator view)
3. Real-time calculation updates as variables are edited
4. "Go back to:" navigation footer linking to Steps 1-6
5. Variable persistence across all wizard step navigation
6. Draft auto-save functionality for incomplete wizards

---

### 8.1: Component Architecture

#### Step 7 Component Structure

```typescript
/**
 * Step 7: Validate with Test Calculations
 * Final wizard step showing full pricing preview with editable variables
 */
const Step7ValidationPreview: React.FC<{
  serviceConfig: ServiceConfig;
  onNavigateToStep: (stepNumber: number) => void;
  onSaveDraft: () => void;
  onComplete: () => void;
}> = ({ serviceConfig, onNavigateToStep, onSaveDraft, onComplete }) => {

  // Initialize store with current service config
  const store = useCustomServiceStore(serviceConfig);

  // All sections expanded by default for validation
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['excavation', 'materials', 'labor', 'complexity', 'equipment', 'additional'])
  );

  // Track if user has made any test edits
  const [hasTestEdits, setHasTestEdits] = useState(false);

  // Real-time calculation on any value change
  useEffect(() => {
    store.calculate();
  }, [store.values, store.config]);

  const handleValueChange = (category: string, variable: string, value: any) => {
    store.updateValue(category, variable, value);
    setHasTestEdits(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 bg-white">
        <h2 className="text-2xl font-bold">Step 7: Validate with Test Calculations</h2>
        <p className="text-sm text-gray-600 mt-1">
          Test your custom service formula with real calculations. All variables are editable.
        </p>
      </div>

      {/* Full-screen pricing preview (scrollable) */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <PricingCalculatorPreview
          config={serviceConfig}
          store={store}
          expandedSections={expandedSections}
          onExpandedChange={setExpandedSections}
          onValueChange={handleValueChange}
          visualConfig={visualConfig}
          isTestMode={true} // Indicates this is validation, not real quote
        />
      </div>

      {/* Navigation footer */}
      <div className="border-t p-4 bg-white">
        {/* Step navigation */}
        <div className="mb-4">
          <div className="text-sm text-gray-600 mb-2">Go back to:</div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onNavigateToStep(1)}
              className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
            >
              Step 1: Identity
            </button>
            <button
              onClick={() => onNavigateToStep(2)}
              className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
            >
              Step 2: Base Settings
            </button>
            <button
              onClick={() => onNavigateToStep(3)}
              className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
            >
              Step 3: Material Categories
            </button>
            <button
              onClick={() => onNavigateToStep(4)}
              className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
            >
              Step 4: Add Materials
            </button>
            <button
              onClick={() => onNavigateToStep(5)}
              className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
            >
              Step 5: Design Variables
            </button>
            <button
              onClick={() => onNavigateToStep(6)}
              className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
            >
              Step 6: Default Values
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onSaveDraft}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Save as Draft
          </button>
          <button
            onClick={onComplete}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Complete & Activate Service
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

### 8.2: Variable Persistence System

#### Wizard Context Provider

All variable values and service configuration persist across wizard steps using React Context:

```typescript
interface WizardContextValue {
  // Service configuration state
  serviceConfig: ServiceConfig;
  updateServiceConfig: (updates: Partial<ServiceConfig>) => void;

  // Navigation state
  currentStep: number;
  navigateToStep: (step: number) => void;

  // Completion tracking
  completedSteps: Set<number>;
  markStepComplete: (step: number) => void;

  // Draft state
  isDraft: boolean;
  draftSavedAt: Date | null;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export const CustomServiceWizard: React.FC = () => {
  const [serviceConfig, setServiceConfig] = useState<ServiceConfig>(createEmptyConfig());
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isDraft, setIsDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);

  const updateServiceConfig = (updates: Partial<ServiceConfig>) => {
    setServiceConfig(prev => ({ ...prev, ...updates }));
  };

  const navigateToStep = (step: number) => {
    setCurrentStep(step);
  };

  const markStepComplete = (step: number) => {
    setCompletedSteps(prev => new Set(prev).add(step));
  };

  // Auto-save draft when user exits after Step 3+
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (currentStep >= 3 && !serviceConfig.is_active) {
        await saveDraftService(serviceConfig);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentStep, serviceConfig]);

  const contextValue: WizardContextValue = {
    serviceConfig,
    updateServiceConfig,
    currentStep,
    navigateToStep,
    completedSteps,
    markStepComplete,
    isDraft,
    draftSavedAt
  };

  return (
    <WizardContext.Provider value={contextValue}>
      <WizardModal>
        {/* Render current step component */}
        {currentStep === 1 && <Step1Identity />}
        {currentStep === 2 && <Step2BaseSettings />}
        {currentStep === 3 && <Step3MaterialCategories />}
        {currentStep === 4 && <Step4AddMaterials />}
        {currentStep === 5 && <Step5DesignVariables />}
        {currentStep === 6 && <Step6DefaultValues />}
        {currentStep === 7 && (
          <Step7ValidationPreview
            serviceConfig={serviceConfig}
            onNavigateToStep={navigateToStep}
            onSaveDraft={async () => {
              await saveDraftService(serviceConfig);
              setIsDraft(true);
              setDraftSavedAt(new Date());
            }}
            onComplete={async () => {
              await completeServiceCreation(serviceConfig);
              // Close wizard and refresh services list
            }}
          />
        )}
      </WizardModal>
    </WizardContext.Provider>
  );
};
```

#### Variable Retention Rules

1. **Values persist during step navigation**: Users can jump between Steps 1-7 without losing any entered data
2. **Changes only on explicit edit**: Variables retain values until user actively changes them
3. **Draft restoration**: If wizard is reopened for a draft service, all previous values are restored
4. **Reset only on wizard close**: Variables only clear when wizard is fully closed or service is completed

---

### 8.3: Draft Service Auto-Save

#### Trigger Conditions

Draft auto-save activates when:
- User has completed at least Step 3 (Material Categories)
- User exits the wizard (close button, browser close, navigation away)
- Service has not been marked as completed/active

#### Database Schema for Drafts

```typescript
// service_pricing_configs table
interface DraftServiceRecord {
  id: UUID;
  company_id: UUID;
  service_name: string;
  service_id: string;
  category: 'draft'; // Special category for incomplete services
  is_active: false; // Not available for use yet
  version: 'draft'; // Marks as incomplete

  // All standard service config fields
  hourly_labor_rate: number;
  optimal_team_size: number;
  base_productivity: number;
  profit_margin: number;

  // JSONB fields with partial completion
  variables_config: JSONB; // May be incomplete
  material_categories?: JSONB; // May be incomplete

  // Draft metadata
  draft_created_at: TIMESTAMPTZ;
  draft_last_modified: TIMESTAMPTZ;
  draft_completed_step: number; // Last step user reached

  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;
}
```

#### Save Draft Function

```typescript
const saveDraftService = async (serviceConfig: Partial<ServiceConfig>): Promise<void> => {
  const { data: user } = await supabase.auth.getUser();

  if (!user || !serviceConfig.service_id) {
    console.error('Cannot save draft: missing user or service_id');
    return;
  }

  const draftRecord = {
    company_id: user.user_metadata.company_id,
    service_name: serviceConfig.service_name || 'Untitled Service',
    service_id: serviceConfig.service_id,
    category: 'draft',
    is_active: false,
    version: 'draft',

    // Base settings (may be incomplete)
    hourly_labor_rate: serviceConfig.hourly_labor_rate || 0,
    optimal_team_size: serviceConfig.optimal_team_size || 1,
    base_productivity: serviceConfig.base_productivity || 0,
    profit_margin: serviceConfig.profit_margin || 0,

    // JSONB fields
    variables_config: serviceConfig.variables_config || {},
    material_categories: serviceConfig.material_categories || null,

    // Draft metadata
    draft_created_at: new Date().toISOString(),
    draft_last_modified: new Date().toISOString(),
    draft_completed_step: serviceConfig.currentStep || 3,

    updated_at: new Date().toISOString()
  };

  // Upsert: update if already exists, insert if new
  const { error } = await supabase
    .from('service_pricing_configs')
    .upsert(draftRecord, {
      onConflict: 'service_id,company_id',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('Failed to save draft service:', error);
    throw error;
  }

  console.log('✅ Draft service saved:', serviceConfig.service_name);
};
```

---

### 8.4: Draft Service UI Display

#### Services Database Tab - Draft Indicator

Draft services appear in the Services Database tab with visual distinction:

```tsx
const ServiceCard: React.FC<{
  service: ServiceConfig;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ service, onEdit, onDelete }) => {
  const isDraft = service.category === 'draft';

  return (
    <div
      className={`
        border rounded-lg p-4 hover:shadow-md transition-shadow
        ${isDraft ? 'service-card-draft' : 'bg-white'}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className={`text-lg font-semibold ${isDraft ? 'italic text-gray-600' : ''}`}>
            {service.service_name}
          </h3>
          <p className={`text-sm text-gray-500 ${isDraft ? 'italic' : ''}`}>
            ID: {service.service_id}
          </p>
        </div>

        {/* Category badge */}
        <span
          className={`
            px-2 py-1 text-xs font-medium rounded
            ${isDraft
              ? 'bg-yellow-100 text-yellow-800 italic'
              : 'bg-blue-100 text-blue-800'
            }
          `}
        >
          {isDraft ? '📝 DRAFT' : service.category}
        </span>
      </div>

      {/* Draft warning */}
      {isDraft && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm italic">
          ⚠️ This service is incomplete. Click "Edit" to continue the creation wizard.
        </div>
      )}

      {/* Service details */}
      <div className={`text-sm space-y-1 ${isDraft ? 'italic text-gray-600' : ''}`}>
        <div>Labor Rate: ${service.hourly_labor_rate}/hr</div>
        <div>Team Size: {service.optimal_team_size}</div>
        <div>Productivity: {service.base_productivity} {service.unit}/day</div>
        <div>Profit Margin: {service.profit_margin}%</div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={onEdit}
          className={`
            px-3 py-1.5 text-sm rounded border
            ${isDraft
              ? 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200'
              : 'bg-white border-gray-300 hover:bg-gray-50'
            }
          `}
        >
          {isDraft ? 'Continue Editing' : 'Edit'}
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-sm rounded border border-red-300 text-red-700 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
};
```

#### CSS Styling for Draft Services

```css
/* Draft service card styling */
.service-card-draft {
  background-color: #fffbeb; /* Yellow-50 */
  border-color: #fde68a; /* Yellow-200 */
  opacity: 0.85;
}

.service-card-draft h3,
.service-card-draft p,
.service-card-draft div {
  font-style: italic;
}

.service-card-draft:hover {
  opacity: 1;
  box-shadow: 0 4px 6px -1px rgba(251, 191, 36, 0.3); /* Yellow shadow */
}

/* Draft badge animation */
.service-card-draft .category-badge {
  animation: pulse-subtle 2s ease-in-out infinite;
}

@keyframes pulse-subtle {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}
```

---

### 8.5: Step Navigation Persistence

#### Navigation Footer Behavior

The "Go back to:" navigation footer:

1. **Appears when Step 7 is reached**: Footer only shows in Step 7, not in Steps 1-6
2. **Remains visible during step jumps**: If user navigates from Step 7 to Step 3, footer persists in Step 3
3. **Indicates current step**: Highlights the current step button
4. **Shows completion status**: Completed steps show checkmarks

```tsx
const WizardNavigationFooter: React.FC<{
  currentStep: number;
  completedSteps: Set<number>;
  onNavigateToStep: (step: number) => void;
}> = ({ currentStep, completedSteps, onNavigateToStep }) => {

  const steps = [
    { number: 1, label: 'Identity' },
    { number: 2, label: 'Base Settings' },
    { number: 3, label: 'Material Categories' },
    { number: 4, label: 'Add Materials' },
    { number: 5, label: 'Design Variables' },
    { number: 6, label: 'Default Values' },
  ];

  return (
    <div className="border-t p-4 bg-white">
      <div className="text-sm text-gray-600 mb-2">Go back to:</div>
      <div className="flex gap-2 flex-wrap">
        {steps.map((step) => (
          <button
            key={step.number}
            onClick={() => onNavigateToStep(step.number)}
            className={`
              px-3 py-1.5 text-sm border rounded transition-colors
              ${currentStep === step.number
                ? 'bg-blue-100 border-blue-400 text-blue-800 font-semibold'
                : 'bg-white border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            {completedSteps.has(step.number) && <span className="mr-1">✓</span>}
            Step {step.number}: {step.label}
          </button>
        ))}
      </div>
    </div>
  );
};
```

---

### 8.6: Completion & Activation

#### Complete Service Function

When user clicks "Complete & Activate Service", the service transitions from draft to active:

```typescript
const completeServiceCreation = async (serviceConfig: ServiceConfig): Promise<void> => {
  const { data: user } = await supabase.auth.getUser();

  if (!user) throw new Error('User not authenticated');

  // Validate all required fields
  const validation = validateServiceConfig(serviceConfig);
  if (!validation.isValid) {
    throw new Error(`Cannot complete service: ${validation.errors.join(', ')}`);
  }

  // Update service record to active
  const activeRecord = {
    ...serviceConfig,
    is_active: true,
    category: serviceConfig.actual_category, // Remove 'draft' category
    version: '1.0.0', // Initial version
    activated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),

    // Remove draft metadata
    draft_created_at: null,
    draft_last_modified: null,
    draft_completed_step: null,
  };

  const { error } = await supabase
    .from('service_pricing_configs')
    .update(activeRecord)
    .eq('service_id', serviceConfig.service_id)
    .eq('company_id', user.user_metadata.company_id);

  if (error) {
    console.error('Failed to activate service:', error);
    throw error;
  }

  // Clear pricing engine cache for this service
  await masterPricingEngine.clearServiceCache(
    serviceConfig.service_id,
    user.user_metadata.company_id
  );

  console.log('✅ Service activated:', serviceConfig.service_name);
};
```

#### Validation Checklist

Before activation, system validates:

```typescript
const validateServiceConfig = (config: ServiceConfig): ValidationResult => {
  const errors: string[] = [];

  // Required fields
  if (!config.service_name) errors.push('Service name is required');
  if (!config.service_id) errors.push('Service ID is required');
  if (!config.hourly_labor_rate || config.hourly_labor_rate <= 0) {
    errors.push('Valid labor rate is required');
  }
  if (!config.optimal_team_size || config.optimal_team_size <= 0) {
    errors.push('Team size must be at least 1');
  }
  if (!config.base_productivity || config.base_productivity <= 0) {
    errors.push('Base productivity is required');
  }

  // Variables validation
  if (!config.variables_config || Object.keys(config.variables_config).length === 0) {
    errors.push('At least one variable category is required');
  }

  // Material categories validation (if using detailed materials)
  if (config.material_categories) {
    const categories = Object.keys(config.material_categories);
    if (categories.length === 0) {
      errors.push('At least one material category is required');
    }

    // Check each category has materials
    categories.forEach((categoryKey) => {
      const materialsCount = config.materials?.[categoryKey]?.length || 0;
      if (materialsCount === 0) {
        errors.push(`Category '${categoryKey}' has no materials`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
```

---

### 8.7: Integration with Quick Calculator

Once service is activated, it immediately appears in Quick Calculator service selection:

```typescript
// QuickCalculatorTab.tsx - Service list includes custom services
const AvailableServices: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceConfig[]>([]);

  useEffect(() => {
    const loadServices = async () => {
      const { data } = await supabase
        .from('service_pricing_configs')
        .select('*')
        .eq('company_id', user.company_id)
        .eq('is_active', true) // Only load active services
        .neq('category', 'draft') // Exclude drafts
        .order('service_name');

      setServices(data || []);
    };

    loadServices();

    // Real-time subscription for service updates
    const subscription = supabase
      .channel('service_configs')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'service_pricing_configs',
        filter: `company_id=eq.${user.company_id}`
      }, (payload) => {
        loadServices(); // Reload when services change
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user.company_id]);

  return (
    <div className="grid grid-cols-2 gap-4">
      {services.map((service) => (
        <ServiceSelectionCard
          key={service.service_id}
          service={service}
          onClick={() => selectService(service.service_id)}
        />
      ))}
    </div>
  );
};
```

---

### Summary: Step 7 Implementation Checklist

**✅ Pricing Preview Window**:
- [ ] Full-screen calculator view within wizard modal
- [ ] All variable categories expanded by default
- [ ] Real-time calculation updates
- [ ] Based on QuickCalculatorTab and PaverPatioManager patterns

**✅ Navigation System**:
- [ ] "Go back to:" footer with Step 1-6 links
- [ ] Footer appears when Step 7 is reached
- [ ] Footer persists during step navigation
- [ ] Current step highlighted in navigation
- [ ] Completed steps show checkmarks

**✅ Variable Persistence**:
- [ ] Values retained across all step navigation
- [ ] Changes only on explicit user edits
- [ ] Draft restoration when reopening wizard
- [ ] React Context for state management

**✅ Draft Auto-Save**:
- [ ] Triggers when exiting after Step 3+
- [ ] Saves to `service_pricing_configs` with `category: 'draft'`
- [ ] Records last completed step
- [ ] Handles browser close and navigation away

**✅ Draft UI Display**:
- [ ] Italic text for all draft service content
- [ ] Yellow "DRAFT" category badge
- [ ] Warning banner in service card
- [ ] "Continue Editing" button opens wizard
- [ ] Visual distinction from active services

**✅ Completion & Activation**:
- [ ] Validation of all required fields
- [ ] Transition from draft to active state
- [ ] Version set to 1.0.0
- [ ] Pricing engine cache cleared
- [ ] Service appears in Quick Calculator immediately

---

**Document Version**: 1.0
**Last Updated**: 2025-01-15
**Total Lines**: 1197
**Reference Files**: `master-formula.md`, `SERVICE_VARIABLE_SYSTEM.md`, `services-database-requirements.md`
