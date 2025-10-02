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

Example: 100 sqft ÷ 50 sqft/day × 3 people × 8 hours = 48 base hours
```

### Tier 1 Variables (Affect Labor Time Only)

| Variable | Type | Effect | Example |
|----------|------|---------|---------|
| **Tearout Complexity** | Percentage | +0% to +30% labor time | Concrete: +20% more time |
| **Access Difficulty** | Percentage | +0% to +100% labor time | Tight spaces: +50% more time |
| **Team Size** | Percentage | +0% to +40% labor time | 2-person team: +40% more time |
| **Cutting Complexity** | Fixed Hours | +0 to +12 hours | Moderate cutting: +6 fixed hours |

### Critical Rules for Tier 1

1. **Calculate Base Hours First**: Always determine base man-hours before applying any variables
   - Formula: `(sqft ÷ daily_productivity) × team_size × 8_hours_per_day`
   - Example: `(100 ÷ 50) × 3 × 8 = 48 base hours`

2. **Apply Each Percentage to Base Hours**: All variable percentages apply to the BASE hours independently, not cascading
   - Wrong (cascading): `48 × 1.2 × 1.5 = 86.4 hours` (exponential)
   - Right (parallel): `48 + (48 × 0.2) + (48 × 0.5) = 48 + 9.6 + 24 = 81.6 hours`
   
3. **Sum All Additional Hours**: Calculate each variable's additional hours, then add them all together
   - Step 1: Calculate base = 48 hours
   - Step 2: Tearout +20% of base = +9.6 hours
   - Step 3: Access +50% of base = +24 hours
   - Step 4: Total = 48 + 9.6 + 24 = 81.6 hours

4. **Fixed Hours Add Last**: Some variables add fixed hours, not percentages
   - Cutting complexity adds 0, 6, or 12 fixed hours regardless of project size
   - These are added after all percentage-based calculations

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
6. **Complexity Adjustment** = `subtotal × complexity_multiplier`
7. **Profit Margin** = `adjusted_total × profit_percentage`
8. **Final Total** = `adjusted_total + profit`

### Tier 2 Variables (Affect Price Only)

| Variable | Type | Effect | Example |
|----------|------|---------|---------|
| **Paver Style** | Percentage | Material cost multiplier | Premium: +30% material cost |
| **Pattern Complexity** | Percentage | Material waste factor | Complex: +25% waste |
| **Equipment Required** | Daily Rate | Cost per project day | Light machinery: $250/day |
| **Obstacle Removal** | Flat Fee | One-time cost | Minor obstacles: $500 flat |
| **Project Complexity** | Multiplier | Applied to subtotal | Complex: ×1.3 |
| **Profit Margin** | Percentage | Final adjustment to total | Standard: 20% |

---

## Material Cost Base Pricing (CRITICAL)

### What's Included in the $5.84/sqft Baseline

The **$5.84 per square foot** baseline material cost is specifically calculated from **Quiet Village's SiteOne pricing** and includes:

✅ **Base paver patio block** (standard pavers)  
✅ **Base rock types at proper depths** (gravel/aggregate base)  
✅ **Fabric at 1:1 square foot ratio** (landscape fabric)

### What's NOT Included

❌ **Liners** - Not factored into baseline  
❌ **Sand** - Not factored into baseline

### Why This Matters

This baseline represents the most common paver patio installation using industry-standard materials at regional supplier pricing. The $5.84/sqft gives contractors a realistic starting point that reflects actual material costs they'll encounter when purchasing from SiteOne through Quiet Village.

**Admin Note**: This baseline is configurable and should be updated when supplier pricing changes or when using different material sources.

---

## Baseline Example (100 sqft, All Defaults)

### Tier 1 Calculation:
```
Base: 100 sqft ÷ 50 sqft/day = 2 days
Hours: 2 days × 3 people × 8 hours = 48 hours
No additional factors (all defaults)
Result: 48.0 total man-hours
```

### Tier 2 Calculation:
```
Labor: 48 hours × $25/hour = $1,200.00
Materials: 100 sqft × $5.84/sqft = $584.00  
Equipment: $0 (hand tools)
Obstacles: $0 (none)
Subtotal: $1,784.00
Complexity (1.0×): $1,784.00
Profit (20%): +$356.80
Final Total: $2,140.80
Price per sqft: $21.41
```

---

## Configuration Structure

### Base Settings Overview

These are the fundamental values that drive all calculations in the pricing tool. These settings are **admin-editable**, meaning authorized users can update them in the admin panel to reflect current market conditions, company policies, or regional variations.

**Labor Settings** control how quickly work gets done and what it costs:
- **Hourly Labor Rate**: What you pay per worker per hour ($25/hour is Missouri baseline)
- **Optimal Team Size**: How many workers make the most efficient crew (3 people is industry standard)
- **Base Productivity**: How much area one optimal team completes per day (50 sqft/day is realistic)

**Material Settings** control material costs:
- **Base Material Cost**: Cost per square foot for standard materials ($5.84/sqft from Quiet Village's SiteOne pricing)

**Business Settings** control profit and overhead:
- **Profit Margin Target**: Percentage added to final price for profit (20% is conservative but realistic)

### Base Settings (Admin Editable) - Technical Structure
```javascript
{
  "laborSettings": {
    "hourlyLaborRate": { "value": 25, "unit": "$/hour/person" },
    "optimalTeamSize": { "value": 3, "unit": "people" },
    "baseProductivity": { "value": 50, "unit": "sqft/day" }
  },
  "materialSettings": {
    "baseMaterialCost": { "value": 5.84, "unit": "$/sqft" }
  },
  "businessSettings": {
    "profitMarginTarget": { "value": 0.20, "unit": "percentage" }
  }
}
```

---

### Variable Configuration Overview

Variables are the project-specific factors that customers select when getting a quote. Each variable is **admin-editable** and can be customized with different options and values.

**How Variables Work:**
- Each variable has a **type** (select dropdown, slider, etc.)
- Each variable belongs to **Tier 1** (affects labor time) or **Tier 2** (affects costs)
- Each variable has an **effect** that determines how it changes the calculation
- Options within each variable have **values** that represent the adjustment amount

**Example: Tearout Complexity**
- This is a dropdown menu customers see when getting a quote
- It asks "What are we removing?" (grass, concrete, asphalt, etc.)
- It belongs to Tier 1, so it only affects labor time, not direct costs
- Each option adds a percentage of additional labor time to the base hours

### Variable Types (Admin Editable) - Technical Structure
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
2. Apply Tier 1 variables as additive percentages TO BASE HOURS
3. Pass total hours to Tier 2, never recalculate
4. Apply material and equipment costs independently
5. Complexity multiplier applies to subtotal before profit
6. Profit margin is the final adjustment

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
5. Profit margin uses decimal values (0.20 = 20%)

---

## Testing Validation

### Simple Test Case:
- 100 sqft, all defaults → 48 hours, $21.41/sqft

### Complex Test Case:  
- 100 sqft, concrete tearout (+20%), moderate access (+50%), 2-person team (+40%), moderate cutting (+6 fixed hours), light equipment ($250/day), minor obstacles ($500)
- Expected: ~132 hours, ~$58/sqft

### Critical Checkpoints:
1. ✅ Baseline case shows exactly 48 hours
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
- 50 sqft/day baseline for 3-person optimal team
- $25/hour per person is Missouri market baseline  
- 20% profit margin is conservative but realistic
- Material waste: 0% minimal, 15% moderate, 25% complex patterns