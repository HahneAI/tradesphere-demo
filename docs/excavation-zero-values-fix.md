# Excavation Service Zero Values Display Fix

## Problem

The Services Database view was showing `0 people`, `0 cubic yards/day`, and `0 $/sqft` for the excavation_removal service instead of displaying "—" (em dash) to indicate these values are not used in calculations.

## Root Cause

**Two-part issue:**

### Part 1: Code Bug (FIXED ✅)
The `serviceBaseSettingsStore.ts` file was using the `||` (OR) operator when saving values to the database:

```typescript
// BEFORE (INCORRECT):
hourly_labor_rate: updatedService.baseSettings?.laborSettings?.hourlyLaborRate?.value || 25,

// AFTER (CORRECT):
hourly_labor_rate: updatedService.baseSettings?.laborSettings?.hourlyLaborRate?.value ?? 25,
```

**Problem**: The `||` operator treats `0` as a falsy value, so when an admin tried to save `0`, it would be replaced with the default value `25`.

**Solution**: Changed to `??` (nullish coalescing) operator which only uses the default when the value is `null` or `undefined`, but preserves `0`.

**Status**: ✅ Fixed in commit (lines 127-131 of serviceBaseSettingsStore.ts)

### Part 2: Database State (NEEDS FIX ⚠️)
Even though the code is fixed, the database still contains the old incorrect values (25, 3, 50, etc.) from before the fix was applied.

**Why this happened**: Previous attempts to save `0` values were blocked by the buggy code, so the database never actually received the zero values.

## Solution

### Step 1: Code Fix (Already Complete ✅)
- [x] Updated `serviceBaseSettingsStore.ts` to use `??` instead of `||`
- [x] Added debug logging to `AdminEditableField.tsx` to track zero value handling

### Step 2: Database Fix (Needs to be run ⚠️)

Run the SQL script to update the database:

```bash
# Option A: Run the SQL script directly in Supabase SQL Editor
# Copy and paste: scripts/fix-excavation-zero-values.sql

# Option B: Run via psql (if you have direct access)
psql YOUR_DATABASE_CONNECTION_STRING < scripts/fix-excavation-zero-values.sql
```

The script will:
1. Show current values (before update)
2. Set these fields to `0` for excavation_removal:
   - `hourly_labor_rate` → 0
   - `optimal_team_size` → 0
   - `base_productivity` → 0
   - `base_material_cost` → 0
3. Leave `profit_margin` as-is (this IS used)
4. Show verification of the update

### Step 3: Verification

After running the SQL script:

1. **Open the Services Database view** in the application
2. **Find the excavation_removal service card**
3. **Verify the display** shows:
   - Base Rate: **—** (em dash)
   - Optimal Team Size: **—**
   - Base Productivity: **—**
   - Base Material Cost: **—**
   - Profit Margin Target: **[actual percentage]**

## Why Excavation Uses Zero Values

The excavation_removal service is **fundamentally different** from other services:

| Service Type | Uses Base Settings | Uses variables_config |
|-------------|-------------------|----------------------|
| **paver_patio_sqft** | ✅ Yes | ✅ Yes |
| **excavation_removal** | ❌ No | ✅ Yes (calculationSettings) |

### Excavation Calculation Approach

Instead of using `hourly_labor_rate`, `optimal_team_size`, etc., excavation uses:

```
variables_config.calculationSettings {
  baseRatePerCubicYard: { default: 3.50 }  ← Actual rate used
  defaultDepth: { default: 12 }             ← inches
  wasteFactor: { default: 10 }              ← percentage
  compactionFactor: { default: 0 }          ← percentage
}
```

**Formula**: `(area × depth / 27) × (1 + wasteFactor/100) × baseRatePerCubicYard`

### Why Show "—" Instead of "0"?

The em dash "—" is a UX pattern that means:
- ✅ "This field exists but is not applicable to this service"
- ❌ NOT "This value is zero"
- ❌ NOT "This field is missing data"

This helps administrators understand the service structure without confusion.

## Files Changed

### Code Fixes (Already Committed)
1. **src/stores/serviceBaseSettingsStore.ts** (lines 127-131)
   - Changed `||` to `??` for all base setting saves

2. **src/components/services/AdminEditableField.tsx** (lines 78-94)
   - Already had correct zero display logic
   - Added debug logging to verify behavior

### New Files Created
1. **scripts/fix-excavation-zero-values.sql**
   - SQL script to update database values

2. **scripts/check-excavation-zero-values.ts**
   - TypeScript verification script (requires env vars)

3. **docs/excavation-zero-values-fix.md**
   - This documentation file

## Testing Checklist

After running the database fix:

- [ ] Open Services Database view
- [ ] Locate excavation_removal service card
- [ ] Verify "—" displays for: Base Rate, Team Size, Base Productivity, Material Cost
- [ ] Verify profit margin shows actual percentage
- [ ] Test admin edit: Try to change a zero value to a non-zero number
- [ ] Test admin edit: Try to change a non-zero value back to zero
- [ ] Verify changes save correctly without reverting to defaults
- [ ] Check browser console for debug logs showing correct zero handling

## Future Prevention

✅ **Code is now protected**: The `??` operator ensures any future zero value saves will work correctly.

✅ **Pattern established**: This same approach can be used for other services that don't use all base settings.

## Related Work

This fix is part of the larger excavation service integration project:
- See: `docs/excavation-service-integration.md` (if exists)
- Related commits:
  - feat: integrate excavation as bundled service for paver patio
  - test: add excavation integration test suite
  - fix: use nullish coalescing for zero value handling
