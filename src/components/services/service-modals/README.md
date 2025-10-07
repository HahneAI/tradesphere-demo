# Service-Specific Modals with Plug-and-Play JSONB System

## Overview

This architecture enables **scalable service creation** where each service can have its own optimized modal component that dynamically reads and renders its `variables_config` JSONB structure from the database.

## Architecture

```
src/components/services/
├── ServiceSpecificsModal.tsx              ← Router component
├── service-modals/
│   ├── PaverPatioSpecificsModal.tsx       ← Custom modal (hardcoded tabs)
│   ├── ExcavationSpecificsModal.tsx       ← Custom modal (calculationSettings)
│   ├── GenericServiceModal.tsx            ← Fallback modal (dynamic rendering)
│   ├── ServiceModalTemplate.tsx           ← Copy-paste template for new services
│   └── shared/
│       ├── NumberInput.tsx                ← Reusable number input
│       ├── SelectInput.tsx                ← Reusable select dropdown
│       ├── SliderInput.tsx                ← Reusable slider input
│       └── GenericVariableRenderer.tsx    ← Dynamic JSONB renderer
```

## Flow Diagram

```
ServicesPage.tsx
  ↓ (clicks "Open Specifics")
ServiceSpecificsModal.tsx (Router)
  ↓ (checks serviceId)
  ├─→ PaverPatioSpecificsModal      (if serviceId === 'paver_patio_sqft')
  ├─→ ExcavationSpecificsModal      (if serviceId === 'excavation_removal')
  └─→ GenericServiceModal           (fallback for all other services)
```

## JSONB Configuration Standard

### Required Structure

```jsonb
{
  "categoryName": {
    "label": "Category Display Name",       // Required
    "description": "Category description",  // Optional

    "variableName": {
      "type": "number|select|slider",       // Required
      "label": "Display Label",             // Required
      "description": "Help text",           // Optional
      "default": value,                     // Required
      "adminEditable": true,                // Optional (defaults to true)

      // Type-specific fields...
    }
  }
}
```

### Type-Specific Fields

**Number/Slider:**
```jsonb
{
  "type": "number",
  "min": 0,          // Required
  "max": 100,        // Required
  "step": 1,         // Optional (default: 1)
  "unit": "%"        // Optional (e.g., "inches", "%", "$/day")
}
```

**Select:**
```jsonb
{
  "type": "select",
  "options": {       // Required
    "optionKey": {
      "label": "Option Label",    // Required
      "value": 0,                 // Required
      "description": "Help text"  // Optional
    }
  }
}
```

## Examples

### Excavation Service (Volume-Based)

```jsonb
{
  "calculationSettings": {
    "label": "Calculation Settings",
    "description": "Core calculation parameters for excavation",

    "defaultDepth": {
      "type": "number",
      "label": "Default Excavation Depth",
      "description": "Standard excavation depth for most jobs",
      "default": 12,
      "min": 1,
      "max": 36,
      "unit": "inches",
      "adminEditable": true
    },

    "wasteFactor": {
      "type": "number",
      "label": "Waste Factor",
      "description": "Additional material to account for settling and spillage",
      "default": 10,
      "min": 0,
      "max": 50,
      "unit": "%",
      "adminEditable": true
    },

    "roundingRule": {
      "type": "select",
      "label": "Cubic Yard Rounding",
      "description": "How to round final cubic yard calculation",
      "default": "up_whole",
      "options": {
        "up_whole": { "label": "Round up to nearest whole yard", "value": 0 },
        "up_half": { "label": "Round up to nearest 0.5 yard", "value": 0 },
        "exact": { "label": "Use exact calculation", "value": 0 }
      },
      "adminEditable": true
    }
  }
}
```

### Paver Patio Service (Area-Based with Complexity)

```jsonb
{
  "excavation": {
    "label": "Excavation & Site Prep",
    "tearoutComplexity": {
      "type": "select",
      "label": "Tearout Complexity",
      "default": "grass",
      "options": {
        "grass": { "label": "Grass (Easy)", "value": 0 },
        "concrete": { "label": "Concrete (Hard)", "value": 20 }
      }
    }
  },
  "materials": { /* ... */ },
  "complexity": { /* ... */ }
}
```

## Creating a New Service

### Option 1: Use Generic Modal (Recommended for Quick Setup)

1. **Create JSONB configuration** in database:
   ```sql
   UPDATE service_pricing_configs
   SET variables_config = '{
     "myCategory": {
       "label": "My Category",
       "myVariable": {
         "type": "number",
         "label": "My Variable",
         "default": 10,
         "min": 0,
         "max": 100
       }
     }
   }'
   WHERE service_name = 'my_new_service';
   ```

2. **Done!** The GenericServiceModal will automatically render it.

### Option 2: Create Custom Modal (For Complex UIs)

1. **Copy the template:**
   ```bash
   cp ServiceModalTemplate.tsx MyNewServiceModal.tsx
   ```

2. **Replace placeholders:**
   - `[SERVICE_NAME]` → `MyNewService`
   - `myCategoryName` → Your actual category name
   - Update interface to match your variables

3. **Add routing** in [ServiceSpecificsModal.tsx](../ServiceSpecificsModal.tsx):
   ```tsx
   import { MyNewServiceModal } from './service-modals/MyNewServiceModal';

   if (serviceId === 'my_new_service') {
     return <MyNewServiceModal {...props} />;
   }
   ```

## Validation

Use the validation utility to ensure your JSONB is correct:

```typescript
import { validateVariablesConfig, formatValidationResult } from '@/utils/validateVariablesConfig';

const result = validateVariablesConfig(myConfig);
console.log(formatValidationResult(result));

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

## Templates

Pre-built templates are available in `src/utils/serviceTemplates.ts`:

- `VOLUME_BASED_TEMPLATE` - For excavation, fill, etc.
- `AREA_COMPLEXITY_TEMPLATE` - For patios, decks, etc.
- `SIMPLE_HOURLY_TEMPLATE` - For consulting, maintenance, etc.
- `LINEAR_MEASUREMENT_TEMPLATE` - For fencing, curbing, etc.

**Usage:**
```typescript
import { getTemplate } from '@/utils/serviceTemplates';

const excavationConfig = getTemplate('volume_based');
// Customize as needed, then insert into database
```

## Testing Checklist

### Paver Patio Modal
- [ ] Opens when clicking "Open Specifics" for paver patio service
- [ ] Displays all 6 tabs (equipment, cutting, labor, materials, complexity, obstacles)
- [ ] Loads values from database
- [ ] Saves changes to database
- [ ] Quick Calculator reflects changes after save

### Excavation Modal
- [ ] Opens when clicking "Open Specifics" for excavation service
- [ ] Displays "Calculation Settings" section
- [ ] Shows 4 inputs: defaultDepth, wasteFactor, compactionFactor, roundingRule
- [ ] Loads values from database
- [ ] Saves changes to database
- [ ] Quick Calculator reflects changes after save

### Generic Modal (Fallback)
- [ ] Opens for unknown services
- [ ] Dynamically renders variables from JSONB
- [ ] Handles number, select, and slider types
- [ ] Saves changes correctly
- [ ] Shows validation errors for invalid JSONB

## Shared Components

### NumberInput
```tsx
<NumberInput
  label="My Number"
  value={myValue}
  onChange={(val) => setMyValue(val)}
  unit="%"
  min={0}
  max={100}
  step={5}
  isAdmin={isAdmin}
  visualConfig={visualConfig}
  description="Optional help text"
/>
```

### SelectInput
```tsx
<SelectInput
  label="My Select"
  value={myValue}
  onChange={(val) => setMyValue(val)}
  options={{
    option1: { label: "Option 1", value: 0 },
    option2: { label: "Option 2", value: 10 }
  }}
  isAdmin={isAdmin}
  visualConfig={visualConfig}
  description="Optional help text"
/>
```

### SliderInput
```tsx
<SliderInput
  label="My Slider"
  value={myValue}
  onChange={(val) => setMyValue(val)}
  min={0}
  max={100}
  step={5}
  unit="%"
  isAdmin={isAdmin}
  visualConfig={visualConfig}
  description="Optional help text"
/>
```

## Best Practices

### JSONB Configuration
1. ✅ **Always use templates** - Don't write JSONB by hand
2. ✅ **Always validate** - Run `validateVariablesConfig()` before saving
3. ✅ **Follow naming conventions:**
   - Category keys: `camelCase` (e.g., `calculationSettings`)
   - Variable keys: `camelCase` (e.g., `defaultDepth`)
   - Option keys: `snake_case` (e.g., `up_whole`)
4. ✅ **Document your JSONB** - Add descriptions to all variables
5. ✅ **Test incrementally** - Add one variable at a time, test, repeat

### Custom Modals
1. ✅ **Use shared components** - Don't recreate NumberInput, SelectInput, etc.
2. ✅ **Preserve JSONB structure** - When saving, spread existing config and update only `default` values
3. ✅ **Add loading states** - Use `isRefreshing` to prevent race conditions
4. ✅ **Log debug info** - Use console.log with service-specific prefixes
5. ✅ **Handle admin permissions** - Respect `isAdmin` and `adminEditable` flags

## Benefits

✅ **Backwards Compatible** - Existing paver patio modal works unchanged
✅ **Scalable** - Each service gets its own optimized modal
✅ **Maintainable** - Shared components reduce duplication
✅ **Automated** - JSONB validation catches errors early
✅ **Flexible** - Mix custom modals with generic renderer
✅ **Self-Documenting** - JSONB structure defines the UI

## Troubleshooting

**Modal not rendering?**
- Check `serviceId` matches the routing condition in ServiceSpecificsModal.tsx
- Verify `variables_config` exists in database for that service

**Values not loading?**
- Check `isRefreshing` state - values load AFTER refresh completes
- Verify category name matches between JSONB and modal code

**Changes not saving?**
- Check `updateServiceVariables()` is spreading existing config
- Verify `default` field is being updated, not the entire variable config

**Validation errors?**
- Run `validateVariablesConfig()` to see specific error messages
- Check required fields: `type`, `label`, `default`
- Ensure `min` < `max` for number/slider types
