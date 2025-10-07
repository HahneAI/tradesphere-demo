# Service Variable System Documentation

## Overview

The Service Variable System is a flexible, database-driven framework for defining custom pricing variables for field services. Each variable type has specific field requirements and calculation methods that ensure consistency between UI display and backend calculations.

## System Architecture

### Data Flow Diagram

```
UI (ServiceSpecificsModal)
    ↓ (user changes equipment cost from $250 to $500)
serviceBaseSettingsStore.updateServiceVariables()
    ↓ (updates value field: equipmentOptions.lightMachinery.value = 500)
ServiceConfigManager.saveServiceConfig()
    ↓ (saves to Supabase)
    ↓ (AUTOMATIC: clearCache(serviceId, companyId) - line 118)
Supabase (service_pricing_configs.variables_config JSONB)
    ↓ (real-time subscription detects change)
masterPricingEngine.subscribeToConfigChanges()
    ↓ (triggers callback with new config)
Quick Calculator Store (paver-patio-store)
    ↓ (setConfig() updates local state)
Master Pricing Engine Calculation
    ↓ (reads config.variables.excavation.equipmentRequired.options.lightMachinery.value)
    ↓ (calculates: equipmentCost = 500 * projectDays)
Display Layer (VariableDropdown + Pricing Breakdown)
    ↓ (shows "$500/day" and updated total)
```

### Component Responsibilities

**ServiceSpecificsModal** (`src/components/services/ServiceSpecificsModal.tsx`)
- Admin UI for editing service variables
- Loads values from database on open (with race condition protection)
- Saves changes via `updateServiceVariables()`
- Displays NumberInput components for each variable

**serviceBaseSettingsStore** (`src/stores/serviceBaseSettingsStore.ts`)
- Manages service configurations in React state
- `updateServiceVariables()` - Updates specific variable values
- Syncs `value` + `multiplier` for percentage types
- Calls ServiceConfigManager to persist changes

**ServiceConfigManager** (`src/services/ServiceConfigManager.ts`)
- **ONLY way to save service configs** (enforces cache clearing)
- `saveServiceConfig()` - Saves to Supabase + clears cache automatically
- `createService()` - Creates new service from template
- Guarantees cache consistency

**MasterPricingEngine** (`src/pricing-system/core/calculations/master-pricing-engine.ts`)
- Loads pricing config from Supabase with caching
- `clearCache()` - Removes cached config for service/company
- `subscribeToConfigChanges()` - Real-time subscription
- `calculatePricing()` - Performs actual pricing calculations

**Quick Calculator** (`src/pricing-system/interfaces/quick-calculator/QuickCalculatorTab.tsx`)
- Real-time subscription lifecycle tied to modal open/close
- Calls `store.reloadConfig()` on open
- Sets up subscription via `masterPricingEngine.subscribeToConfigChanges()`
- Unsubscribes on modal close (ironclad cleanup)

---

## Cache Clearing & Real-Time Updates

### How Cache Clearing Works

**ServiceConfigManager.saveServiceConfig()** automatically clears cache after every save:

```typescript
// Location: src/services/ServiceConfigManager.ts:118
public async saveServiceConfig(...) {
  // 1. Save to Supabase
  await supabase.from('service_pricing_configs').upsert(data);

  // 2. CRITICAL: Clear master engine cache
  masterPricingEngine.clearCache(serviceId, companyId);
  console.log('🧹 [SERVICE MANAGER] Cache cleared automatically');

  return true;
}
```

**Cache Key Format**: `${companyId}:${serviceName}`

Example: `abc123-def456:paver_patio_sqft`

### Why Cache Clearing is Critical

**Without cache clearing:**
1. User changes equipment cost from $250 to $500 ✅
2. Saves to Supabase ✅
3. Master engine still has $250 cached ❌
4. Quick Calculator shows old value ❌
5. Calculations use old value ❌

**With automatic cache clearing:**
1. User changes equipment cost from $250 to $500 ✅
2. ServiceConfigManager saves to Supabase ✅
3. ServiceConfigManager clears cache ✅
4. Real-time subscription fires with new config ✅
5. Quick Calculator receives $500 ✅
6. Calculations use $500 ✅

### Real-Time Update Timeline

**Complete flow from save to UI update:**

```
T+0ms:    User clicks Save in ServiceSpecificsModal
T+10ms:   updateServiceVariables() updates local state
T+20ms:   ServiceConfigManager.saveServiceConfig() called
T+50ms:   Supabase write completes
T+51ms:   clearCache() removes cached config
T+100ms:  Supabase real-time subscription triggers
T+110ms:  Quick Calculator callback receives new config
T+120ms:  Quick Calculator recalculates with new values
T+130ms:  UI updates automatically (no page refresh needed)
```

### Key Functions

**Subscribe to changes:**
```typescript
const unsubscribe = masterPricingEngine.subscribeToConfigChanges(
  'paver_patio_sqft',
  user.company_id,
  (newConfig) => {
    console.log('🎯 Config updated!', newConfig);
    store.setConfig(newConfig);
  }
);

// Cleanup on unmount
return () => unsubscribe();
```

**Clear cache manually (rarely needed):**
```typescript
masterPricingEngine.clearCache('paver_patio_sqft', companyId);
// Console: 🧹 [MASTER ENGINE] Cache cleared for: abc123:paver_patio_sqft
```

**Load fresh config:**
```typescript
const config = await masterPricingEngine.loadPricingConfig(
  'paver_patio_sqft',
  companyId
);
// Bypasses cache, loads directly from Supabase
```

### Console Logs to Watch For

When saving equipment costs, you should see this sequence:

```
🔧 [MODAL SAVE] Saving equipment costs: { lightMachinery: 500, ... }
🔧 [UPDATE EQUIPMENT] Starting equipment cost updates: ...
🔧 [UPDATE EQUIPMENT] lightMachinery: 250 → 500
🎯 [UPDATE VARIABLES] Attempting save: { serviceId: 'paver_patio_sqft', ... }
💾 [SERVICE MANAGER] Saving to Supabase: ...
✅ [SERVICE MANAGER] Saved to Supabase
🧹 [SERVICE MANAGER] Cache cleared automatically
🎯🎯🎯 [QUICK CALCULATOR] ========== REAL-TIME UPDATE RECEIVED ==========
🔄 [QUICK CALCULATOR] Updating store with new config from real-time subscription
💰 [MASTER ENGINE] Equipment calculation: { equipmentValue: 500, ... }
```

---

## Variable Types (`effectType`)

### 1. `labor_time_percentage`

**Purpose:** Percentage modifiers that add time to base labor hours

**Fields Required:**
- `value` (number): Display percentage (e.g., 20 for 20%)
- `multiplier` (number): Calculated multiplier (e.g., 1.2)

**Formula:**
```typescript
multiplier = 1 + (value / 100)
```

**Calculation Method:**
```typescript
// Applied as additive percentage to base hours
adjustedHours += baseHours * (value / 100)
```

**Examples:**
- `tearoutComplexity` (grass/concrete/asphalt)
  - grass: `{value: 0, multiplier: 1.0}`
  - concrete: `{value: 20, multiplier: 1.2}`
  - asphalt: `{value: 30, multiplier: 1.3}`

- `accessDifficulty` (easy/moderate/difficult)
  - easy: `{value: 0, multiplier: 1.0}`
  - moderate: `{value: 50, multiplier: 1.5}`
  - difficult: `{value: 100, multiplier: 2.0}`

- `teamSize` (twoPerson/threePlus)
  - twoPerson: `{value: 40, multiplier: 1.4}`
  - threePlus: `{value: 0, multiplier: 1.0}`

**Database Structure:**
```json
{
  "tearoutComplexity": {
    "type": "select",
    "label": "Tearout Complexity",
    "default": "grass",
    "effectType": "labor_time_percentage",
    "calculationTier": 1,
    "options": {
      "grass": {
        "label": "Grass/Sod Only",
        "value": 0,
        "multiplier": 1.0
      },
      "concrete": {
        "label": "Concrete/Pavement",
        "value": 20,
        "multiplier": 1.2
      }
    }
  }
}
```

---

### 2. `material_cost_multiplier`

**Purpose:** Percentage multipliers for material costs

**Fields Required:**
- `value` (number): Display percentage (e.g., 40 for 40%)
- `multiplier` (number): Calculated multiplier (e.g., 1.4)

**Formula:**
```typescript
multiplier = 1 + (value / 100)
```

**Calculation Method:**
```typescript
// Multiplies base material cost
materialCost = baseMaterialCost * sqft * multiplier
```

**Example:**
- `paverStyle` (standard/premium)
  - standard: `{value: 0, multiplier: 1.0}`
  - premium: `{value: 40, multiplier: 1.4}` ← 40% increase

**Database Structure:**
```json
{
  "paverStyle": {
    "type": "select",
    "label": "Paver Style & Quality",
    "default": "standard",
    "effectType": "material_cost_multiplier",
    "calculationTier": 2,
    "options": {
      "standard": {
        "label": "Standard Grade",
        "value": 0,
        "multiplier": 1.0
      },
      "premium": {
        "label": "Premium Grade",
        "value": 40,
        "multiplier": 1.4
      }
    }
  }
}
```

---

### 3. `total_project_multiplier`

**Purpose:** Complexity multiplier applied to entire project subtotal

**Fields Required:**
- `value` (number): Display percentage (e.g., 30 for 30%)
- `multiplier` (number): Calculated multiplier (e.g., 1.3)

**Formula:**
```typescript
multiplier = 1 + (value / 100)
```

**Calculation Method:**
```typescript
// Applied to subtotal BEFORE profit
adjustedTotal = subtotal * multiplier
profit = adjustedTotal * profitMargin
total = adjustedTotal + profit
```

**Example:**
- `overallComplexity` (simple/standard/complex/extreme)
  - simple: `{value: 0, multiplier: 1.0}`
  - standard: `{value: 10, multiplier: 1.1}`
  - complex: `{value: 30, multiplier: 1.3}`
  - extreme: `{value: 50, multiplier: 1.5}`

**Database Structure:**
```json
{
  "overallComplexity": {
    "type": "select",
    "label": "Overall Complexity",
    "default": "simple",
    "effectType": "total_project_multiplier",
    "calculationTier": 2,
    "options": {
      "simple": {
        "label": "Simple Project",
        "value": 0,
        "multiplier": 1.0
      },
      "complex": {
        "label": "Complex Project",
        "value": 30,
        "multiplier": 1.3
      }
    }
  }
}
```

---

### 4. `cutting_complexity`

**Purpose:** Dual percentage affecting both labor time and material waste

**Fields Required:**
- `laborPercentage` (number): Percentage added to labor hours
- `materialWaste` (number): Percentage added to material waste

**Formula:**
```typescript
// No multiplier - direct percentage values
```

**Calculation Method:**
```typescript
// Labor impact
adjustedHours += baseHours * (laborPercentage / 100)

// Material waste impact
materialWasteCost = materialCostBase * (materialWaste / 100)
totalMaterialCost = materialCostBase + materialWasteCost
```

**Example:**
- `cuttingComplexity` (minimal/moderate/complex)
  - minimal: `{laborPercentage: 0, materialWaste: 0}`
  - moderate: `{laborPercentage: 20, materialWaste: 15}`
  - complex: `{laborPercentage: 30, materialWaste: 25}`

**Database Structure:**
```json
{
  "cuttingComplexity": {
    "type": "select",
    "label": "Cutting Complexity",
    "default": "minimal",
    "effectType": "cutting_complexity",
    "calculationTier": "both",
    "options": {
      "minimal": {
        "label": "Minimal Cutting (Baseline)",
        "laborPercentage": 0,
        "materialWaste": 0
      },
      "moderate": {
        "label": "Moderate Cutting (+20% hours, +15% waste)",
        "laborPercentage": 20,
        "materialWaste": 15
      }
    }
  }
}
```

---

### 5. `daily_equipment_cost`

**Purpose:** Dollar cost per project day for equipment rental

**Fields Required:**
- `value` (number): Cost per day in dollars

**Formula:**
```typescript
// Direct dollar amount - no multiplier
```

**Calculation Method:**
```typescript
projectDays = totalManHours / (optimalTeamSize * 8)
equipmentCost = value * projectDays
```

**Example:**
- `equipmentRequired` (handTools/attachments/lightMachinery/heavyMachinery)
  - handTools: `{value: 0}`
  - attachments: `{value: 125}`
  - lightMachinery: `{value: 250}`
  - heavyMachinery: `{value: 350}`

**Database Structure:**
```json
{
  "equipmentRequired": {
    "type": "select",
    "label": "Equipment Required",
    "default": "handTools",
    "effectType": "daily_equipment_cost",
    "calculationTier": 2,
    "options": {
      "handTools": {
        "label": "Hand Tools Only",
        "value": 0
      },
      "lightMachinery": {
        "label": "Light Machinery",
        "value": 250
      }
    }
  }
}
```

---

### 6. `flat_additional_cost`

**Purpose:** One-time flat cost added to project total

**Fields Required:**
- `value` (number): Fixed dollar amount

**Formula:**
```typescript
// Direct dollar amount - no multiplier
```

**Calculation Method:**
```typescript
subtotal = laborCost + materialCost + equipmentCost + value
```

**Example:**
- `obstacleRemoval` (none/minor/major)
  - none: `{value: 0}`
  - minor: `{value: 500}`
  - major: `{value: 1000}`

**Database Structure:**
```json
{
  "obstacleRemoval": {
    "type": "select",
    "label": "Obstacle Removal",
    "default": "none",
    "effectType": "flat_additional_cost",
    "calculationTier": 2,
    "options": {
      "none": {
        "label": "No Obstacles",
        "value": 0
      },
      "minor": {
        "label": "Minor Obstacles",
        "value": 500
      }
    }
  }
}
```

---

## Variable Type Comparison Table

Quick reference for all 6 effect types:

| Effect Type | Fields Required | Display Format | Calculation Method | Examples | Tier |
|-------------|----------------|----------------|-------------------|----------|------|
| **labor_time_percentage** | `value`, `multiplier` | `+20%` | `adjustedHours += baseHours * (value/100)` | tearoutComplexity, accessDifficulty, teamSize | 1 |
| **material_cost_multiplier** | `value`, `multiplier` | `+40%` | `materialCost *= multiplier` | paverStyle | 2 |
| **total_project_multiplier** | `value`, `multiplier` | `(+30%)` | `total *= multiplier` | overallComplexity | 2 |
| **cutting_complexity** | `laborPercentage`, `materialWaste` | `+20% hours, +15% waste` | `hours += hours * (labor/100)`<br>`waste += cost * (waste/100)` | cuttingComplexity | 1+2 |
| **daily_equipment_cost** | `value` only | `$250/day` | `cost = value * projectDays` | equipmentRequired | 2 |
| **flat_additional_cost** | `value` only | `$500` | `subtotal += value` | obstacleRemoval | 2 |

### Field Sync Requirements

**Types that REQUIRE value + multiplier sync:**
- `labor_time_percentage`
- `material_cost_multiplier`
- `total_project_multiplier`

**Formula:** `multiplier = 1 + (value / 100)`

**Example:**
```typescript
value: 40          // User enters 40%
multiplier: 1.4    // Auto-calculated: 1 + (40/100) = 1.4
```

**Types that use value only (NO multiplier):**
- `cutting_complexity` (uses `laborPercentage` + `materialWaste` instead)
- `daily_equipment_cost` (direct dollar amount)
- `flat_additional_cost` (direct dollar amount)

⚠️ **CRITICAL**: Never add a `multiplier` field to equipment costs or obstacle removal! These are dollar amounts, not percentages.

---

## Update Flow

### Critical Rule: Syncing `value` and `multiplier`

For all percentage-based types (`labor_time_percentage`, `material_cost_multiplier`, `total_project_multiplier`), **BOTH fields must be updated together**:

```typescript
// ✅ CORRECT
const value = 40; // User enters 40%
updatedVariables.materials.paverStyle.options.premium.value = value;
updatedVariables.materials.paverStyle.options.premium.multiplier = calculateMultiplierFromPercentage(value); // 1.4

// ❌ WRONG - Only updating value
updatedVariables.materials.paverStyle.options.premium.value = 40;
// multiplier stays at 1.2 → Calculator uses wrong value!
```

### Helper Function

```typescript
import { calculateMultiplierFromPercentage } from '../pricing-system/utils/variable-helpers';

// Usage
const percentageValue = 40;
const multiplier = calculateMultiplierFromPercentage(percentageValue); // Returns 1.4
```

---

## UI Display Guidelines

### Percentage-Based Variables

**Display Format:** Show the `value` field with `%` unit

```tsx
<NumberInput
  label="Premium Grade"
  value={materialSettings.premiumGrade}  // Shows 40
  onChange={(value) => updateMaterialSetting('premiumGrade', value)}
  unit="%"                               // Shows "%"
  min={0}
  max={100}
  step={5}
/>
```

### Dollar-Based Variables

**Display Format:** Show the `value` field with `$` prefix or `/day` suffix

```tsx
<NumberInput
  label="Light Machinery"
  value={equipmentCosts.lightMachinery}  // Shows 250
  onChange={(value) => updateEquipmentCost('lightMachinery', value)}
  unit="$/day"                           // Shows "$/day"
  min={0}
  max={1000}
  step={25}
/>
```

---

## Service Creation Template

When creating a new service, use this structure:

```json
{
  "service_name": "custom_service_name",
  "company_id": "<uuid>",
  "hourly_labor_rate": 25.00,
  "optimal_team_size": 3,
  "base_productivity": 50.00,
  "base_material_cost": 5.84,
  "profit_margin": 0.20,
  "variables_config": {
    "excavation": {
      "label": "Excavation & Site Preparation",
      "description": "Variables affecting excavation and site preparation",
      "tearoutComplexity": {
        "label": "Tearout Complexity",
        "type": "select",
        "default": "grass",
        "calculationTier": 1,
        "effectType": "labor_time_percentage",
        "options": {
          "grass": { "label": "Grass/Sod Only", "value": 0, "multiplier": 1.0 },
          "concrete": { "label": "Concrete/Pavement", "value": 20, "multiplier": 1.2 }
        }
      },
      "equipmentRequired": {
        "label": "Equipment Required",
        "type": "select",
        "default": "handTools",
        "calculationTier": 2,
        "effectType": "daily_equipment_cost",
        "options": {
          "handTools": { "label": "Hand Tools Only", "value": 0 },
          "attachments": { "label": "Attachments/Jackhammers", "value": 125 }
        }
      }
    },
    "materials": {
      "label": "Materials & Complexity",
      "description": "Material quality and cutting requirements",
      "paverStyle": {
        "label": "Material Quality",
        "type": "select",
        "default": "standard",
        "calculationTier": 2,
        "effectType": "material_cost_multiplier",
        "options": {
          "standard": { "label": "Standard Grade", "value": 0, "multiplier": 1.0 },
          "premium": { "label": "Premium Grade", "value": 20, "multiplier": 1.2 }
        }
      }
    },
    "complexity": {
      "label": "Project Complexity",
      "description": "Overall project difficulty",
      "overallComplexity": {
        "label": "Overall Complexity",
        "type": "select",
        "default": "simple",
        "calculationTier": 2,
        "effectType": "total_project_multiplier",
        "options": {
          "simple": { "label": "Simple Project", "value": 0, "multiplier": 1.0 },
          "standard": { "label": "Standard Project", "value": 10, "multiplier": 1.1 }
        }
      }
    }
  },
  "default_variables": {},
  "is_active": true,
  "version": "2.0.0"
}
```

---

## Custom Service Creation Guide

### Overview

The **INSERT** button in the Services Database page allows admins to create completely custom services with any combination of variables. This section provides comprehensive guidance for building new services from scratch.

### Step-by-Step Process

#### Step 1: Define Service Identity

Start with basic service information:

```typescript
{
  "service": "Deck Installation",           // Display name
  "serviceId": "deck_installation_sqft",    // Unique identifier (lowercase, underscores)
  "category": "outdoor_hardscape"           // Category for organization
}
```

**Service ID Requirements:**
- Must be unique across company
- Use lowercase letters, numbers, and underscores only
- Should end with unit of measurement (\_sqft, \_linear_ft, \_item, etc.)
- Example: `deck_installation_sqft`, `fence_repair_linear_ft`, `drainage_system_item`

#### Step 2: Set Base Settings

Define the foundational pricing parameters:

```typescript
{
  "baseSettings": {
    "laborSettings": {
      "hourlyLaborRate": {
        "value": 30,
        "unit": "$/hr",
        "label": "Hourly Labor Rate",
        "description": "Base labor rate per hour for this service",
        "adminEditable": true,
        "validation": { "min": 10, "max": 200, "step": 1 }
      },
      "optimalTeamSize": {
        "value": 2,
        "unit": "people",
        "label": "Optimal Team Size",
        "description": "Standard crew size for this service",
        "adminEditable": true,
        "validation": { "min": 1, "max": 10, "step": 1 }
      },
      "baseProductivity": {
        "value": 40,
        "unit": "sqft/hr",
        "label": "Base Productivity",
        "description": "Square feet completed per hour per team",
        "adminEditable": true,
        "validation": { "min": 10, "max": 500, "step": 5 }
      }
    },
    "materialSettings": {
      "baseMaterialCost": {
        "value": 12.50,
        "unit": "$/sqft",
        "label": "Base Material Cost",
        "description": "Standard material cost per square foot",
        "adminEditable": true,
        "validation": { "min": 0, "max": 50, "step": 0.10 }
      }
    },
    "businessSettings": {
      "profitMarginTarget": {
        "value": 0.25,
        "unit": "%",
        "label": "Profit Margin Target",
        "description": "Desired profit margin (25% = 0.25)",
        "adminEditable": true,
        "validation": { "min": 0.05, "max": 0.50, "step": 0.01 }
      }
    }
  }
}
```

#### Step 3: Choose Variable Categories

Organize variables into logical groups. Common categories:

- **excavation** - Site prep, tearout, digging, equipment
- **materials** - Material quality, style, grade
- **labor** - Team size, skill level, specialty work
- **siteAccess** - Access difficulty, obstacles
- **complexity** - Overall project difficulty

Example structure:

```json
{
  "variables": {
    "excavation": {
      "label": "Excavation & Site Preparation",
      "description": "Variables affecting site preparation and excavation work"
    },
    "materials": {
      "label": "Materials & Quality",
      "description": "Material selection and quality options"
    },
    "complexity": {
      "label": "Project Complexity",
      "description": "Overall difficulty and complexity factors"
    }
  }
}
```

#### Step 4: Add Variables by Effect Type

For each variable, choose the appropriate `effectType` and define options:

**Example 1: Equipment Costs** (`daily_equipment_cost`)

```json
{
  "excavation": {
    "equipmentRequired": {
      "label": "Equipment Required",
      "type": "select",
      "default": "handTools",
      "calculationTier": 2,
      "effectType": "daily_equipment_cost",
      "description": "Equipment rental costs calculated per project day",
      "options": {
        "handTools": {
          "label": "Hand Tools Only",
          "value": 0,
          "description": "Basic hand tools included in labor rate"
        },
        "powerTools": {
          "label": "Power Tools Package",
          "value": 75,
          "description": "Saws, drills, pneumatic nailers ($75/day)"
        },
        "lightMachinery": {
          "label": "Light Machinery",
          "value": 200,
          "description": "Skid steer, compactor, small excavator ($200/day)"
        },
        "heavyEquipment": {
          "label": "Heavy Equipment",
          "value": 400,
          "description": "Large excavator, dump truck ($400/day)"
        }
      }
    }
  }
}
```

**Example 2: Material Quality** (`material_cost_multiplier`)

```json
{
  "materials": {
    "woodQuality": {
      "label": "Wood Quality",
      "type": "select",
      "default": "pressuretreated",
      "calculationTier": 2,
      "effectType": "material_cost_multiplier",
      "description": "Material quality affects total material cost",
      "options": {
        "pressuretreated": {
          "label": "Pressure Treated",
          "value": 0,
          "multiplier": 1.0,
          "description": "Standard pressure-treated lumber (baseline)"
        },
        "cedar": {
          "label": "Cedar",
          "value": 40,
          "multiplier": 1.4,
          "description": "Natural cedar - 40% premium over standard"
        },
        "composite": {
          "label": "Composite Decking",
          "value": 80,
          "multiplier": 1.8,
          "description": "Low-maintenance composite - 80% premium"
        },
        "hardwood": {
          "label": "Exotic Hardwood",
          "value": 150,
          "multiplier": 2.5,
          "description": "Ipe, Tigerwood - 150% premium"
        }
      }
    }
  }
}
```

**Example 3: Site Preparation** (`labor_time_percentage`)

```json
{
  "excavation": {
    "sitePrep": {
      "label": "Site Preparation Level",
      "type": "select",
      "default": "minimal",
      "calculationTier": 1,
      "effectType": "labor_time_percentage",
      "description": "Site prep work affects labor hours",
      "options": {
        "minimal": {
          "label": "Minimal Prep",
          "value": 0,
          "multiplier": 1.0,
          "description": "Site already clear and level"
        },
        "moderate": {
          "label": "Moderate Prep",
          "value": 25,
          "multiplier": 1.25,
          "description": "Some clearing and leveling needed (+25% hours)"
        },
        "extensive": {
          "label": "Extensive Prep",
          "value": 50,
          "multiplier": 1.5,
          "description": "Major site work required (+50% hours)"
        },
        "complete": {
          "label": "Complete Site Development",
          "value": 100,
          "multiplier": 2.0,
          "description": "Full site clearing and grading (+100% hours)"
        }
      }
    }
  }
}
```

**Example 4: Project Complexity** (`total_project_multiplier`)

```json
{
  "complexity": {
    "overallComplexity": {
      "label": "Overall Project Complexity",
      "type": "select",
      "default": "standard",
      "calculationTier": 2,
      "effectType": "total_project_multiplier",
      "description": "Overall difficulty multiplier applied to project total",
      "options": {
        "simple": {
          "label": "Simple/Straightforward",
          "value": 0,
          "multiplier": 1.0,
          "description": "Standard rectangular deck, simple design"
        },
        "standard": {
          "label": "Standard Complexity",
          "value": 15,
          "multiplier": 1.15,
          "description": "Some angles or features (+15%)"
        },
        "complex": {
          "label": "Complex Design",
          "value": 35,
          "multiplier": 1.35,
          "description": "Multiple levels, curves, custom features (+35%)"
        },
        "extreme": {
          "label": "Extreme Complexity",
          "value": 60,
          "multiplier": 1.6,
          "description": "Highly complex custom design (+60%)"
        }
      }
    }
  }
}
```

#### Step 5: Set Default Variables

Define which option is selected by default in Quick Calculator:

```json
{
  "default_variables": {
    "excavation": {
      "equipmentRequired": "powerTools",
      "sitePrep": "minimal"
    },
    "materials": {
      "woodQuality": "pressuretreated"
    },
    "complexity": {
      "overallComplexity": "standard"
    }
  }
}
```

#### Step 6: Validate Structure

Before saving, validate using helper utilities:

```typescript
import { validateVariableStructure, EFFECT_TYPE_DEFINITIONS } from '../pricing-system/utils/variable-helpers';

// Validate each option in a variable
const woodOptions = service.variables.materials.woodQuality.options;

Object.entries(woodOptions).forEach(([key, option]) => {
  const isValid = validateVariableStructure('material_cost_multiplier', option);

  if (!isValid) {
    console.error(`Invalid option '${key}':`, option);
    // Will log specific issue:
    // - Missing required field
    // - Multiplier out of sync with value
    // - Invalid data type
  }
});

// Check effect type definition
const effectDef = EFFECT_TYPE_DEFINITIONS['daily_equipment_cost'];
console.log('Required fields:', effectDef.fields);
// ['value']
console.log('Needs multiplier:', effectDef.requiresMultiplier);
// false
```

#### Step 7: Save Using ServiceConfigManager

**IMPORTANT**: Always use ServiceConfigManager, never save directly to Supabase!

```typescript
import { serviceConfigManager } from '../services/ServiceConfigManager';
import { useAuth } from '../context/AuthContext';

const { user } = useAuth();

const newService: ServiceConfig = {
  service: "Deck Installation",
  serviceId: "deck_installation_sqft",
  category: "outdoor_hardscape",
  baseSettings: { /* from Step 2 */ },
  variables: { /* from Steps 3-4 */ },
  lastModified: new Date().toISOString().split('T')[0]
};

try {
  await serviceConfigManager.saveServiceConfig(
    newService.serviceId,
    newService,
    user.company_id,
    user.id
  );

  console.log('✅ Service created successfully!');
  // ServiceConfigManager automatically:
  // - Saves to Supabase
  // - Clears cache
  // - Triggers real-time subscriptions

} catch (error) {
  console.error('❌ Failed to create service:', error);
  alert('Failed to save service configuration');
}
```

#### Step 8: Test in Quick Calculator

After creating the service:

1. **Open Quick Calculator**
2. **Select new service** from service dropdown
3. **Verify all variables appear** with correct labels
4. **Change each variable** and verify display format
5. **Check pricing breakdown** shows correct calculations
6. **Test edge cases**:
   - Minimum values
   - Maximum values
   - Different variable combinations
7. **Verify real-time sync**: Open Services Database modal, change a value, verify Quick Calculator updates

### Common Patterns & Templates

**Landscaping Service Template:**
```json
{
  "variables": {
    "siteWork": {
      "grading": "labor_time_percentage",
      "equipment": "daily_equipment_cost",
      "disposal": "flat_additional_cost"
    },
    "materials": {
      "soilQuality": "material_cost_multiplier",
      "plantSelection": "material_cost_multiplier"
    },
    "complexity": {
      "terrainDifficulty": "labor_time_percentage",
      "overallComplexity": "total_project_multiplier"
    }
  }
}
```

**Concrete Service Template:**
```json
{
  "variables": {
    "preparation": {
      "excavation": "labor_time_percentage",
      "baseWork": "labor_time_percentage",
      "equipment": "daily_equipment_cost"
    },
    "concrete": {
      "concreteGrade": "material_cost_multiplier",
      "finishStyle": "labor_time_percentage",
      "colorStamping": "flat_additional_cost"
    },
    "siteConditions": {
      "access": "labor_time_percentage",
      "weather": "total_project_multiplier"
    }
  }
}
```

### Best Practices

1. **Use descriptive labels**: "Light Machinery ($200/day)" better than "Option 2"
2. **Include descriptions**: Help users understand what each option means
3. **Set realistic ranges**: Don't allow 0-1000% if practical range is 0-50%
4. **Group logically**: Related variables in same category
5. **Test thoroughly**: Verify calculations with known scenarios
6. **Document custom logic**: If using unique calculation methods, document them
7. **Version control**: Include version number in service config
8. **Backup before changes**: Export existing config before major modifications

---

## Testing Checklist

When adding or modifying service variables:

- [ ] UI displays correct value format (% or $)
- [ ] `value` field saves correctly to database
- [ ] `multiplier` field syncs automatically (for percentage types)
- [ ] Master pricing engine reads updated values
- [ ] Quick Calculator reflects changes immediately after save
- [ ] Real-time subscription triggers on update
- [ ] Cache clears automatically after save
- [ ] Build completes without TypeScript errors
- [ ] Variable validation passes (if implemented)

---

## Future Enhancements

### Service Insert Modal

A dedicated modal for creating custom services with:

1. **Base Settings Form**
   - Labor rate, team size, productivity, material cost, profit margin

2. **Variable Category Builder**
   - Add/remove variable categories (excavation, materials, complexity, etc.)
   - Define variables within each category

3. **Variable Type Selector**
   - Choose `effectType` from dropdown
   - Auto-generate required fields based on type
   - Real-time preview of calculation impact

4. **Template Library**
   - Pre-built templates for common service types
   - Clone existing services and modify

5. **Validation**
   - Ensure all required fields present
   - Validate multiplier calculations
   - Check for unique service IDs

---

## Reference Files

- **Helper Functions:** `src/pricing-system/utils/variable-helpers.ts`
- **Update Logic:** `src/stores/serviceBaseSettingsStore.ts` (updateServiceVariables)
- **UI Component:** `src/components/services/ServiceSpecificsModal.tsx`
- **Master Engine:** `src/pricing-system/core/calculations/master-pricing-engine.ts`
- **Service Manager:** `src/services/ServiceConfigManager.ts`
- **Database Schema:** `src/database/schema-reference.sql` (service_pricing_configs table)

---

## API Reference

### ServiceConfigManager

#### `saveServiceConfig(serviceId, configData, companyId, userId?)`

Saves service configuration to Supabase and **automatically clears cache**.

**Parameters:**
- `serviceId` (string): Unique service identifier (e.g., 'paver_patio_sqft')
- `configData` (ServiceConfig): Complete service configuration object
- `companyId` (string): Company identifier for multi-tenancy
- `userId` (string, optional): User ID for audit trail

**Returns:** `Promise<boolean>` - true if save successful

**Side Effects:**
- Saves to `service_pricing_configs` table in Supabase
- Calls `masterPricingEngine.clearCache(serviceId, companyId)` automatically
- Triggers real-time subscriptions for all connected clients

**Example:**
```typescript
await serviceConfigManager.saveServiceConfig(
  'paver_patio_sqft',
  updatedConfig,
  user.company_id,
  user.id
);
```

**Location:** `src/services/ServiceConfigManager.ts`

---

#### `createService(serviceId, serviceName, category, companyId, userId?, template?)`

Creates a new service from template or default settings.

**Parameters:**
- `serviceId` (string): Unique identifier
- `serviceName` (string): Display name
- `category` (string): Service category
- `companyId` (string): Company identifier
- `userId` (string, optional): Creator user ID
- `template` (ServiceConfig, optional): Template to clone from

**Returns:** `Promise<boolean>`

**Example:**
```typescript
await serviceConfigManager.createService(
  'deck_installation_sqft',
  'Deck Installation',
  'outdoor_hardscape',
  user.company_id,
  user.id
);
```

---

### MasterPricingEngine

#### `clearCache(serviceName, companyId)`

Clears cached configuration for specific service/company.

**Parameters:**
- `serviceName` (string): Service to clear
- `companyId` (string): Company identifier

**Cache Key Format:** `${companyId}:${serviceName}`

**Example:**
```typescript
masterPricingEngine.clearCache('paver_patio_sqft', companyId);
// Console: 🧹 [MASTER ENGINE] Cache cleared for: abc123:paver_patio_sqft
```

**Location:** `src/pricing-system/core/calculations/master-pricing-engine.ts:370`

---

#### `subscribeToConfigChanges(serviceName, companyId, callback)`

Sets up real-time subscription for service configuration changes.

**Parameters:**
- `serviceName` (string): Service to watch
- `companyId` (string): Company identifier
- `callback` (function): Called when config changes with new config object

**Returns:** Unsubscribe function

**Example:**
```typescript
const unsubscribe = masterPricingEngine.subscribeToConfigChanges(
  'paver_patio_sqft',
  user.company_id,
  (newConfig) => {
    console.log('🎯 Config updated!', newConfig);
    store.setConfig(newConfig);
  }
);

// Cleanup on component unmount
useEffect(() => {
  return () => unsubscribe();
}, []);
```

---

#### `loadPricingConfig(serviceName, companyId)`

Loads pricing configuration from Supabase (uses cache if available).

**Parameters:**
- `serviceName` (string): Service to load
- `companyId` (string): Company identifier

**Returns:** `Promise<PaverPatioConfig>`

**Caching Behavior:**
- First call: Loads from Supabase, caches result
- Subsequent calls: Returns cached config
- After `clearCache()`: Next call reloads from Supabase

**Example:**
```typescript
const config = await masterPricingEngine.loadPricingConfig(
  'paver_patio_sqft',
  user.company_id
);
```

---

### Variable Helpers

#### `calculateMultiplierFromPercentage(percentage)`

Converts percentage value to multiplier for calculations.

**Formula:** `multiplier = 1 + (percentage / 100)`

**Parameters:**
- `percentage` (number): Percentage value (e.g., 20 for 20%)

**Returns:** `number` - Multiplier value

**Examples:**
```typescript
calculateMultiplierFromPercentage(0)    // → 1.0 (baseline)
calculateMultiplierFromPercentage(20)   // → 1.2 (20% increase)
calculateMultiplierFromPercentage(40)   // → 1.4 (40% increase)
calculateMultiplierFromPercentage(100)  // → 2.0 (double)
```

**Location:** `src/pricing-system/utils/variable-helpers.ts:23`

---

#### `calculatePercentageFromMultiplier(multiplier)`

Converts multiplier back to percentage (inverse operation).

**Formula:** `percentage = (multiplier - 1) * 100`

**Parameters:**
- `multiplier` (number): Multiplier value (e.g., 1.2)

**Returns:** `number` - Percentage value

**Examples:**
```typescript
calculatePercentageFromMultiplier(1.0)  // → 0
calculatePercentageFromMultiplier(1.2)  // → 20
calculatePercentageFromMultiplier(1.4)  // → 40
calculatePercentageFromMultiplier(2.0)  // → 100
```

---

#### `validateVariableStructure(effectType, option)`

Validates that a variable option has all required fields for its effect type.

**Parameters:**
- `effectType` (string): One of the 6 effect types
- `option` (object): Variable option object to validate

**Returns:** `boolean` - true if valid, false otherwise

**Validation Rules:**
- Checks all required fields exist for effect type
- For percentage types, verifies multiplier synced with value (within 0.001 tolerance)
- Logs warnings to console for validation failures

**Example:**
```typescript
// Valid option
const option = { label: "Premium", value: 40, multiplier: 1.4 };
const isValid = validateVariableStructure('material_cost_multiplier', option);
// → true

// Invalid option (multiplier out of sync)
const badOption = { label: "Premium", value: 40, multiplier: 1.3 };
const isValid = validateVariableStructure('material_cost_multiplier', badOption);
// → false
// Console: "Multiplier out of sync: value=40, multiplier=1.3, expected=1.4"

// Invalid option (missing field)
const incompleteOption = { label: "Equipment", value: 250, multiplier: 1.0 };
const isValid = validateVariableStructure('daily_equipment_cost', incompleteOption);
// → false
// Console: "daily_equipment_cost should not have multiplier field"
```

**Location:** `src/pricing-system/utils/variable-helpers.ts:105`

---

#### `syncMultiplierWithValue(option, percentageValue)`

Updates both value and multiplier fields together (for percentage-based types).

**Parameters:**
- `option` (object): Variable option object
- `percentageValue` (number): New percentage value

**Returns:** Updated option object with synced fields

**Example:**
```typescript
const option = { label: "Premium", value: 20, multiplier: 1.2 };
const updated = syncMultiplierWithValue(option, 50);
// → { label: "Premium", value: 50, multiplier: 1.5 }
```

---

#### `EFFECT_TYPE_DEFINITIONS`

Constant object defining all 6 effect types and their requirements.

**Structure:**
```typescript
{
  effectTypeName: {
    fields: string[],              // Required field names
    requiresMultiplier: boolean,   // Whether multiplier must sync with value
    description: string,           // Human-readable description
    examples: string[]             // Example variable names
  }
}
```

**Example Usage:**
```typescript
import { EFFECT_TYPE_DEFINITIONS } from '../pricing-system/utils/variable-helpers';

const def = EFFECT_TYPE_DEFINITIONS['daily_equipment_cost'];
console.log('Required fields:', def.fields);           // ['value']
console.log('Needs multiplier:', def.requiresMultiplier);  // false
console.log('Description:', def.description);           // "Dollar cost per project day"
console.log('Examples:', def.examples);                 // ['equipmentRequired']
```

---

## Troubleshooting

### Equipment Costs Not Updating

**Symptoms:**
- Change equipment cost from $250 to $500 in Services Database modal ✓
- Save completes successfully ✓
- Dropdown shows "$500/day" ✓
- **Calculations still use $250** ✗
- **Modal reopens showing $250** ✗

**Debugging Steps:**

#### Step 1: Check if Value Saved to Supabase

Query the database directly:
```sql
SELECT
  service_name,
  variables_config->'excavation'->'equipmentRequired'->'options'->'lightMachinery'->>'value' as light_machinery_cost
FROM service_pricing_configs
WHERE company_id = '<your_company_id>'
  AND service_name = 'paver_patio_sqft';
```

**Expected:** `"500"` (as string)
**If different:** Save didn't reach database - check network tab for errors

#### Step 2: Check if Cache Was Cleared

Look for console log:
```
🧹 [SERVICE MANAGER] Cache cleared automatically
```

**If missing:** ServiceConfigManager.saveServiceConfig() didn't run properly
**If present:** Cache cleared successfully, problem is elsewhere

#### Step 3: Check if Modal Reloads Fresh Data

When reopening Services Database modal, look for console logs:
```
🔄 [SPECIFICS MODAL] Modal opened, refreshing services from Supabase
✅ [SPECIFICS MODAL] Refresh complete, will load values now
📝 [SPECIFICS MODAL] Loading fresh service variables
🔧 [MODAL LOAD] Loading equipment costs from database: { lightMachinery: 500, ... }
```

**Check the `lightMachineryValue`** in the log - should be 500
**If 250:** `isRefreshing` race condition - modal loading values before refresh completes

#### Step 4: Check if Quick Calculator Receives Update

Look for real-time subscription log:
```
🎯🎯🎯 [QUICK CALCULATOR] ========== REAL-TIME UPDATE RECEIVED ==========
🔄 [QUICK CALCULATOR] Updating store with new config from real-time subscription
```

**If missing:** Real-time subscription not working - check Supabase connection
**If present:** Subscription working correctly

#### Step 5: Check if Master Engine Uses New Value

Add debug or look for equipment calculation log:
```
💰 [MASTER ENGINE] Equipment calculation: {
  selectedEquipment: 'lightMachinery',
  equipmentValue: 500,
  projectDays: 2.5,
  calculation: '500 * 2.50'
}
💰 [MASTER ENGINE] Equipment cost result: 1250
```

**If `equipmentValue` is 250:** Config not updated in master engine - cache issue
**If `equipmentValue` is 500:** Calculation correct, check if UI displays it

**Common Mistakes:**

❌ **WRONG:** Adding multiplier field to equipment costs
```json
{
  "lightMachinery": {
    "label": "Light Machinery",
    "value": 250,
    "multiplier": 250  // ❌ DON'T DO THIS - equipment costs don't use multipliers!
  }
}
```

✅ **CORRECT:** Value field only
```json
{
  "lightMachinery": {
    "label": "Light Machinery",
    "value": 250  // ✅ Correct - direct dollar amount
  }
}
```

**Why No Multiplier?**
- Equipment costs are **per-day dollar amounts**, not percentages
- Calculation: `equipmentCost = value * projectDays`
- Example: $250/day × 2.5 days = $625 total
- Adding a multiplier would incorrectly double-count the cost

**Fix for Out-of-Sync Values:**

If modal shows old value but database has new value:

1. **Check `isRefreshing` state** in ServiceSpecificsModal (line 80)
2. **Verify equipment loading** happens AFTER refresh completes (line 156-179)
3. **Ensure `service` variable** uses `useMemo` for reactivity (line 144)
4. **Check `useEffect` dependencies** include `isRefreshing` (line 243)

---

### Variables Not Updating in Quick Calculator

1. **Check value + multiplier sync** (for percentage types)
   - Open browser DevTools → Application → IndexedDB (if using) or check Supabase directly
   - Verify both `value` and `multiplier` fields updated

2. **Verify cache cleared**
   - Look for: `🧹 [SERVICE MANAGER] Cache cleared automatically`
   - If missing, ServiceConfigManager wasn't used

3. **Confirm real-time subscription active**
   - Look for: `📡 [QUICK CALCULATOR] Creating real-time subscription...`
   - Then: `✅ [QUICK CALCULATOR] Subscription created successfully`

4. **Hard refresh browser**
   - Windows/Linux: Ctrl+Shift+R
   - Mac: Cmd+Shift+R

---

### Build Errors

1. **Missing import error**
   ```typescript
   import { calculateMultiplierFromPercentage } from '../pricing-system/utils/variable-helpers';
   ```

2. **TypeScript interface mismatch**
   - Ensure ServiceConfig interface includes all fields
   - Check variables_config matches expected JSONB structure

3. **Missing required fields**
   - Use `validateVariableStructure()` before saving
   - Check effect type definition for required fields

---

### Incorrect Calculations

1. **Wrong effectType**
   - Verify effectType matches intended behavior
   - Review Variable Type Comparison Table

2. **Master engine reading wrong field**
   - Percentage types: Should read `multiplier` field
   - Dollar types: Should read `value` field only
   - Check master-pricing-engine.ts for field access

3. **Formula mismatch**
   - Compare calculation in master-pricing-engine.ts with documentation
   - Verify tier 1 vs tier 2 calculations

---

### Real-Time Updates Not Working

1. **Subscription not created**
   ```typescript
   // Check Quick Calculator useEffect (line 38-70)
   useEffect(() => {
     if (!isOpen || !user?.company_id) return;

     const unsubscribe = masterPricingEngine.subscribeToConfigChanges(...);
     return () => unsubscribe();
   }, [isOpen, user?.company_id]);
   ```

2. **Subscription not cleaned up**
   - Ensure `return () => unsubscribe()` in useEffect
   - Check for multiple subscriptions (memory leak)

3. **Supabase real-time disabled**
   - Verify Supabase project has real-time enabled
   - Check browser console for WebSocket errors

---

*Last Updated: 2025-10-07*
*Version: 2.0.0 - Comprehensive Edition*

---

## Document Summary

This documentation now includes:
- ✅ Enhanced system architecture with component responsibilities
- ✅ Cache clearing & real-time update flow with timeline
- ✅ Variable type comparison table for quick reference
- ✅ Complete custom service creation guide (8 steps)
- ✅ Comprehensive API reference for all key functions
- ✅ Equipment costs troubleshooting with 5-step debugging
- ✅ Real-world examples and service templates
- ✅ Best practices and common patterns

**Ready for:** Custom service creation via INSERT button implementation
