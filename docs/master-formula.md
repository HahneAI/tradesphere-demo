# Expert Two-Tier Paver Patio Calculation System

**File: `docs/expert-calculation-reference.md`**  
**Purpose: Reference guide for Claude Code when updating paver patio calculations**  
**Status: Industry-validated by expert Tom**

---

## System Overview

The paver patio pricing system uses a **two-tier calculation approach** that separates TIME calculation from PRICE calculation. This mirrors real-world construction estimating where you first determine how long a job takes, then calculate costs based on that time plus materials and other factors.

### Why Two Tiers?

**Traditional Problem**: Most pricing systems multiply everything together, creating unrealistic exponential price increases.

**Expert Solution**: Separate labor time calculation from cost calculation to maintain realistic, linear pricing that reflects actual construction practices.

---

## Tier 1: Labor Hours Calculation (TIME)

**Purpose**: Determine how many man-hours the project requires  
**Input**: Square footage + labor time factors  
**Output**: Total man-hours needed

### Base Calculation Formula
```
Base Man-Hours = (sqft ÷ daily_productivity) × team_size × 8_hours_per_day

Example: 100 sqft ÷ 100 sqft/day × 3 people × 8 hours = 24 base hours
```

### Tier 1 Variables (Affect Labor Time Only)

| Variable | Type | Effect | Example |
|----------|------|---------|---------|
| **Tearout Complexity** | Percentage | +0% to +30% labor time | Concrete: +20% more time |
| **Access Difficulty** | Percentage | +0% to +100% labor time | Tight spaces: +50% more time |
| **Team Size** | Percentage | +0% to +40% labor time | 2-person team: +40% more time |
| **Cutting Complexity** | Fixed Hours | +0 to +12 hours | Moderate cutting: +6 fixed hours |

### Critical Rules for Tier 1

1. **Base-Independent Variables**: Each percentage applies to the original base hours
   - Wrong: `24 × 1.2 × 1.5 × 1.4 = 60.48 hours` (multiplicative/exponential)
   - Right: `24 + (24 × 0.2) + (24 × 0.5) + (24 × 0.4) + 6 = 56.4 hours` (base-independent)

2. **Independent Variable Effects**: Each variable's impact is predictable and separate
   - Base: 24 hours
   - +20% tearout = 24 × 0.2 = +4.8 hours (always the same regardless of other variables)
   - +50% access = 24 × 0.5 = +12.0 hours (independent of tearout complexity)
   - +40% team = 24 × 0.4 = +9.6 hours (independent of other factors)
   - Total: 24 + 4.8 + 12.0 + 9.6 + 6 = 56.4 hours

3. **Fixed Hours**: Some variables add fixed hours, not percentages
   - Cutting complexity adds 0, 6, or 12 fixed hours regardless of project size

---

## Tier 2: Cost Calculation (PRICE)

**Purpose**: Convert labor hours to total project cost  
**Input**: Man-hours from Tier 1 + cost factors  
**Output**: Final project price

### Cost Components (In Order)

1. **Labor Cost** = `total_hours × hourly_rate`
2. **Material Cost** = `sqft × base_material_cost × style_multiplier + waste`
3. **Equipment Cost** = `daily_rate × project_days`
4. **Obstacle Cost** = `flat_fees` (not percentages)
5. **Subtotal** = Sum of all above
6. **Profit Margin** = `subtotal × profit_percentage`
7. **Final Total** = `(subtotal + profit) × complexity_multiplier`

### Tier 2 Variables (Affect Price Only)

| Variable | Type | Effect | Example |
|----------|------|---------|---------|
| **Paver Style** | Percentage | Material cost multiplier | Premium: +30% material cost |
| **Pattern Complexity** | Percentage | Material waste factor | Complex: +25% waste |
| **Equipment Required** | Daily Rate | Cost per project day | Light machinery: $250/day |
| **Obstacle Removal** | Flat Fee | One-time cost | Minor obstacles: $500 flat |
| **Profit Margin** | Percentage | Applied to subtotal | Standard: 15% |
| **Project Complexity** | Multiplier | Final adjustment | Complex: ×1.3 |

---

## Baseline Example (100 sqft, All Defaults)

### Tier 1 Calculation:
```
Base: 100 sqft ÷ 100 sqft/day = 1 day
Hours: 1 day × 3 people × 8 hours = 24 hours
No additional factors (all defaults)
Result: 24.0 total man-hours
```

### Tier 2 Calculation:
```
Labor: 24 hours × $25/hour = $600.00
Materials: 100 sqft × $5.84/sqft = $584.00  
Equipment: $0 (hand tools)
Obstacles: $0 (none)
Subtotal: $1,184.00
Profit (15%): +$177.60
Final Total: $1,361.60
Price per sqft: $13.62
```

---

## Configuration Structure

### Base Settings (Admin Editable)
```javascript
{
  "laborSettings": {
    "hourlyLaborRate": { "value": 25, "unit": "$/hour/person" },
    "optimalTeamSize": { "value": 3, "unit": "people" },
    "baseProductivity": { "value": 100, "unit": "sqft/day" }
  },
  "materialSettings": {
    "baseMaterialCost": { "value": 5.84, "unit": "$/sqft" }
  },
  "businessSettings": {
    "profitMarginTarget": { "value": 0.15, "unit": "percentage" }
  }
}
```

### Variable Types
```javascript
{
  "tearoutComplexity": {
    "type": "select",
    "tier": 1,
    "effect": "labor_time_percentage",
    "options": {
      "grass": { "value": 0 },      // Baseline
      "concrete": { "value": 20 },  // +20% labor time
      "asphalt": { "value": 30 }    // +30% labor time
    }
  }
}
```

---

## Implementation Guidelines

### For Calculation Functions:
1. Always separate Tier 1 and Tier 2 calculations
2. Apply Tier 1 variables as additive percentages
3. Pass total hours to Tier 2, never recalculate
4. Apply material and equipment costs independently
5. Profit margin applies to subtotal only
6. Complexity multiplier is final adjustment

### For Display Components:
1. Show percentages as "+20%" not "×1.2" 
2. Show fixed costs as "$250/day" not percentages
3. Equipment and obstacles are dollar amounts
4. Labor time factors show hour increases
5. Material factors show cost increases

### For Variable Configuration:
1. Tier 1 variables use percentage values (0-100)
2. Tier 2 equipment uses daily dollar amounts
3. Tier 2 obstacles use flat dollar amounts
4. Material waste uses percentage values
5. Profit margin uses decimal values (0.15 = 15%)

---

## Testing Validation

### Simple Test Case:
- 100 sqft, all defaults → 24 hours, $13.62/sqft

### Complex Test Case:
- 100 sqft, concrete tearout (+20%), moderate access (+50%), 2-person team (+40%), moderate cutting (+6 fixed hours), light equipment ($250/day), minor obstacles ($500)
- Expected: 56.4 hours (24 + 4.8 + 12.0 + 9.6 + 6), ~$45/sqft

### Critical Checkpoints:
1. ✅ Baseline case shows exactly 24 hours
2. ✅ Variables show as percentages (+20%) not multipliers (×1.2)
3. ✅ Equipment shows daily rates ($250/day)
4. ✅ Final calculations match expert validation ranges
5. ✅ Tier 1 and Tier 2 are clearly separated in code

---

## Expert Notes

**Tom's Key Insights:**
- "Variables don't multiply together - they add percentage increases individually"
- "Labor time factors are separate from cost factors" 
- "25% material waste factor is industry standard for complex pattern work"
- "Equipment costs are daily rentals with company-customizable rates"
- "Conservative multipliers produce realistic quotes (max 130% vs original 400%)"

**Industry Standards:**
- 100 sqft/day baseline for 3-person optimal team
- $25/hour per person is Missouri market baseline
- 15% profit margin is conservative but realistic
- Material waste: 0% minimal, 15% moderate, 25% complex patterns

---

## Implementation Update Notes

**Date**: September 24, 2025
**Change**: Modified from "running total" to "base-independent" variable system
**Reason**: Each variable should have predictable, independent effects on pricing

### What Changed:
- **Old System**: Each percentage applied to the previously adjusted total (compounding effect)
  - Example: 24h → 28.8h (+20%) → 43.2h (+50%) → 60.5h (+40%) = 66.5h total
- **New System**: Each percentage applies to the original base hours (independent effects)
  - Example: 24h + (24×0.2) + (24×0.5) + (24×0.4) + 6h = 56.4h total

### Business Benefits:
1. **Predictable Variables**: A +20% tearout always adds exactly 4.8 hours to any 100 sqft job
2. **Independent Adjustments**: Changes to one variable don't affect others
3. **Easier Training**: Each variable's impact is consistent regardless of other selections
4. **Better Pricing Control**: Variables can be adjusted independently without unexpected interactions

**For Tom's Review**: This change maintains the two-tier system while making each variable's business impact more predictable and independent. Ready for validation in second meeting.