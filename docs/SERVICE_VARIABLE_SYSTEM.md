# Service Variable System Documentation

## Overview

The Service Variable System is a flexible, database-driven framework for defining custom pricing variables for field services. Each variable type has specific field requirements and calculation methods that ensure consistency between UI display and backend calculations.

## Architecture

```
UI (ServiceSpecificsModal)
    ↓ (updates)
serviceBaseSettingsStore.updateServiceVariables()
    ↓ (syncs value + multiplier)
ServiceConfigManager.saveServiceConfig()
    ↓ (saves to database + clears cache)
Supabase (service_pricing_configs.variables_config JSONB)
    ↓ (real-time subscription triggers)
Master Pricing Engine
    ↓ (reads from config.variables)
Quick Calculator / AI Pricing
```

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

## Troubleshooting

### Variables not updating in Quick Calculator

1. Check that both `value` AND `multiplier` were saved (for percentage types)
2. Verify cache was cleared after save (check console for "🧹 Cache cleared")
3. Confirm real-time subscription is active (check console for "📡 Subscription status")
4. Hard refresh browser (Ctrl+Shift+R)

### Build Errors

1. Ensure `calculateMultiplierFromPercentage` is imported where needed
2. Check TypeScript interface matches database structure
3. Verify all required fields are present in variable options

### Incorrect Calculations

1. Verify `effectType` matches intended calculation method
2. Check that master pricing engine reads correct field (`value` vs `multiplier`)
3. Confirm formula in engine matches documentation

---

*Last Updated: 2025-10-07*
*Version: 1.0.0*
