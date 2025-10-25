# Custom Service Creation Wizard - Part 3

**This document continues from [CUSTOM-SERVICE-WIZARD-PLAN-PART-2.md](CUSTOM-SERVICE-WIZARD-PLAN-PART-2.md)**

---

## Material System Integration

### Database Transaction Flow

**CRITICAL**: All 3 tables must be inserted in a single atomic transaction to maintain referential integrity.

```typescript
// Netlify Function: create-custom-service.ts
export const handler: Handler = async (event) => {
  const { company_id, service_config, material_categories, materials } = JSON.parse(event.body);

  // Start transaction
  const { data, error } = await supabase.rpc('create_custom_service_transaction', {
    p_company_id: company_id,
    p_service_config: service_config,
    p_material_categories: material_categories,
    p_materials: materials
  });

  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }

  // Clear masterPricingEngine cache
  await fetch('/.netlify/functions/clear-service-cache', {
    method: 'POST',
    body: JSON.stringify({
      service_id: data.service_id,
      company_id: company_id
    })
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      service_id: data.service_id,
      message: 'Custom service created successfully'
    })
  };
};
```

### Database Stored Procedure

```sql
-- SQL Function: create_custom_service_transaction
CREATE OR REPLACE FUNCTION create_custom_service_transaction(
  p_company_id UUID,
  p_service_config JSONB,
  p_material_categories JSONB,
  p_materials JSONB
) RETURNS JSONB AS $$
DECLARE
  v_service_id UUID;
  v_category_id UUID;
  v_category JSONB;
  v_material JSONB;
BEGIN
  -- 1. Insert into svc_pricing_configs
  INSERT INTO svc_pricing_configs (
    company_id,
    service_name,
    hourly_labor_rate,
    optimal_team_size,
    base_productivity,
    profit_margin,
    variables_config,
    default_variables,
    is_active,
    category
  ) VALUES (
    p_company_id,
    p_service_config->>'service_name',
    (p_service_config->>'hourly_labor_rate')::NUMERIC,
    (p_service_config->>'optimal_team_size')::INTEGER,
    (p_service_config->>'base_productivity')::NUMERIC,
    (p_service_config->>'profit_margin')::NUMERIC,
    p_service_config->'variables_config',
    p_service_config->'default_variables',
    (p_service_config->>'is_active')::BOOLEAN,
    p_service_config->>'category'
  )
  RETURNING id INTO v_service_id;

  -- 2. Insert material categories
  FOR v_category IN SELECT * FROM jsonb_array_elements(p_material_categories) LOOP
    INSERT INTO svc_material_categories (
      company_id,
      service_config_id,
      category_key,
      category_label,
      category_description,
      calculation_method,
      default_depth_inches,
      is_required,
      sort_order
    ) VALUES (
      p_company_id,
      v_service_id,
      v_category->>'category_key',
      v_category->>'category_label',
      v_category->>'category_description',
      v_category->>'calculation_method',
      (v_category->>'default_depth_inches')::NUMERIC,
      (v_category->>'is_required')::BOOLEAN,
      (v_category->>'sort_order')::INTEGER
    )
    RETURNING id INTO v_category_id;
  END LOOP;

  -- 3. Insert materials
  FOR v_material IN SELECT * FROM jsonb_array_elements(p_materials) LOOP
    INSERT INTO svc_materials (
      company_id,
      service_config_id,
      material_name,
      material_category,
      material_description,
      unit_type,
      price_per_unit,
      coverage_per_unit,
      coverage_depth_inches,
      waste_factor_percentage,
      compaction_factor_percentage,
      is_default,
      is_active
    ) VALUES (
      p_company_id,
      v_service_id,
      v_material->>'material_name',
      v_material->>'material_category',
      v_material->>'material_description',
      v_material->>'unit_type',
      (v_material->>'price_per_unit')::NUMERIC,
      (v_material->>'coverage_per_unit')::NUMERIC,
      (v_material->>'coverage_depth_inches')::NUMERIC,
      (v_material->>'waste_factor_percentage')::NUMERIC,
      (v_material->>'compaction_factor_percentage')::NUMERIC,
      (v_material->>'is_default')::BOOLEAN,
      (v_material->>'is_active')::BOOLEAN
    );
  END LOOP;

  -- Return success with service_id
  RETURN jsonb_build_object('service_id', v_service_id);

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Material-Category Linking

**Pattern**: Materials reference `material_category` (TEXT) which maps to `svc_material_categories.category_key`

```typescript
// When loading materials for Quick Calculator
const loadMaterialsForService = async (serviceConfigId: string, companyId: string) => {
  // 1. Load material categories
  const { data: categories } = await supabase
    .from('svc_material_categories')
    .select('*')
    .eq('service_config_id', serviceConfigId)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('sort_order');

  // 2. Load materials grouped by category
  const { data: materials } = await supabase
    .from('svc_materials')
    .select('*')
    .eq('service_config_id', serviceConfigId)
    .eq('company_id', companyId)
    .eq('is_active', true);

  // 3. Group materials by category_key
  const materialsByCategory = materials.reduce((acc, material) => {
    if (!acc[material.material_category]) {
      acc[material.material_category] = [];
    }
    acc[material.material_category].push(material);
    return acc;
  }, {} as Record<string, Material[]>);

  // 4. Attach materials to categories
  const categoriesWithMaterials = categories.map(cat => ({
    ...cat,
    materials: materialsByCategory[cat.category_key] || [],
    calculation_config: {
      method: cat.calculation_method,
      default_depth: cat.default_depth_inches
    }
  }));

  return categoriesWithMaterials;
};
```

---

## AI Chat Integration Requirements

### Self-Documenting Service Pattern

**Goal**: AI Chat must understand custom services WITHOUT code changes

**Requirements**:
1. **Descriptive Labels**: All variable labels and descriptions must be human-readable
2. **Effect Type Metadata**: AI can infer how variables affect pricing through `effectType`
3. **Default Values**: AI uses `default_variables` for typical project assumptions
4. **Material Context**: AI understands material categories and calculation methods

### AI-Interpretable JSONB Structure

```json
{
  "formulaType": "two_tier",
  "formulaDescription": "Tier 1: Calculate labor hours | Tier 2: Calculate costs with complexity and profit",

  "design": {
    "label": "Design Factors",
    "description": "Pattern complexity and cutting requirements",

    "pattern_complexity": {
      "type": "select",
      "label": "Pattern Complexity",
      "description": "How complex is the paver pattern? Complex patterns require more cutting and labor time.",
      "effectType": "cutting_complexity",
      "calculationTier": "both",
      "default": "running_bond",

      "options": {
        "running_bond": {
          "label": "Running Bond (Simple)",
          "laborPercentage": 0,
          "materialWaste": 5
        },
        "herringbone": {
          "label": "Herringbone (Moderate)",
          "laborPercentage": 15,
          "materialWaste": 12
        },
        "circular": {
          "label": "Circular/Fan (Complex)",
          "laborPercentage": 30,
          "materialWaste": 20
        }
      }
    }
  }
}
```

**AI Interpretation**:
- AI reads `"How complex is the paver pattern?"` → Asks customer about pattern choice
- AI sees `effectType: "cutting_complexity"` → Understands this affects both labor and waste
- AI reads option labels → Presents choices to customer
- AI uses `default: "running_bond"` → Assumes simple pattern if not specified

### Prompt Engineering for Custom Services

**Pattern**: System prompt dynamically includes custom service metadata

```typescript
// In GPTServiceSplitter or conversation handler
const buildSystemPrompt = (serviceConfig: ServiceConfig) => {
  const variablesContext = Object.entries(serviceConfig.variables_config)
    .filter(([key]) => !['formulaType', 'formulaDescription'].includes(key))
    .map(([categoryKey, categoryData]: [string, any]) => {
      const variables = Object.entries(categoryData)
        .filter(([k]) => !['label', 'description'].includes(k))
        .map(([varKey, varData]: [string, any]) => {
          return `- **${varData.label}**: ${varData.description} (Options: ${Object.values(varData.options).map((opt: any) => opt.label).join(', ')})`;
        }).join('\n');

      return `### ${categoryData.label}\n${categoryData.description}\n\n${variables}`;
    }).join('\n\n');

  return `
You are an AI sales assistant helping quote ${serviceConfig.service_name} projects.

## Service Overview
${serviceConfig.service_name} is calculated using a two-tier pricing formula:
- Tier 1: Labor hours based on project size and complexity
- Tier 2: Total price including materials, profit, and pass-through costs

## Qualifying Questions

To calculate an accurate quote, you need to gather:

1. **Project Size**: Total ${serviceConfig.productivity_unit.split('/')[0]} for the project
2. **Material Selections**: Customer preferences for each material category
3. **Project Variables**: Factors that affect labor time and material costs

${variablesContext}

## Material Categories

${serviceConfig.material_categories.map(cat => `
### ${cat.category_label}
${cat.category_description}
Calculation Method: ${cat.calculation_method}
${cat.is_required ? '**Required selection**' : 'Optional'}
`).join('\n')}

## Your Task

Ask the customer qualifying questions to gather all necessary information. Once you have:
- Project size
- Material selections for all required categories
- Preferences for key variables

Then calculate the quote using the gathered information.
`;
};
```

### Conversation Memory Integration

**Pattern**: Store custom service parameters in conversation memory

```typescript
// When customer answers qualifying question
const handleCustomerResponse = async (message: string, conversationId: string) => {
  // Extract variable selection from customer message
  const extracted = await extractVariableFromMessage(message, currentQuestion.variableKey);

  if (extracted) {
    // Store in conversation memory
    await supabase.from('conversation_variables').insert({
      conversation_id: conversationId,
      variable_category: currentQuestion.categoryKey,
      variable_key: currentQuestion.variableKey,
      selected_option: extracted.optionKey,
      option_label: extracted.optionLabel
    });

    // Move to next question
    const nextQuestion = getNextUnansweredQuestion(conversationId);
    return buildQuestionPrompt(nextQuestion);
  }
};
```

---

## Edge Case Handling

### 1. Multi-Tenancy Isolation

**Risk**: Cross-company data leakage

**Mitigation**:

```sql
-- RLS Policy: svc_pricing_configs
CREATE POLICY "Users can only see their company's services"
  ON svc_pricing_configs
  FOR SELECT
  USING (company_id = auth.jwt() ->> 'company_id');

-- RLS Policy: svc_material_categories
CREATE POLICY "Users can only see their company's material categories"
  ON svc_material_categories
  FOR SELECT
  USING (company_id = auth.jwt() ->> 'company_id');

-- RLS Policy: svc_materials
CREATE POLICY "Users can only see their company's materials"
  ON svc_materials
  FOR SELECT
  USING (company_id = auth.jwt() ->> 'company_id');
```

**Validation** (Application-Level):

```typescript
// ALWAYS filter by company_id in queries
const loadService = async (serviceId: string, userId: string) => {
  const user = await getUserCompany(userId);

  const { data, error } = await supabase
    .from('svc_pricing_configs')
    .select('*')
    .eq('id', serviceId)
    .eq('company_id', user.company_id)  // ← CRITICAL
    .single();

  if (error || !data) {
    throw new Error('Service not found or unauthorized');
  }

  return data;
};
```

---

### 2. Cache Invalidation

**Risk**: Stale pricing when service config updated

**Mitigation**:

```typescript
// ServiceConfigManager.saveServiceConfig()
export const saveServiceConfig = async (config: ServiceConfig, companyId: string) => {
  // 1. Save to database
  const { error } = await supabase
    .from('svc_pricing_configs')
    .upsert({
      ...config,
      company_id: companyId,
      updated_at: new Date().toISOString()
    });

  if (error) throw error;

  // 2. IMMEDIATELY clear cache
  await masterPricingEngine.clearServiceCache(config.service_id, companyId);

  // 3. Broadcast real-time update to connected clients
  await supabase
    .from('svc_pricing_configs')
    .select('*')
    .eq('id', config.id)
    .single(); // Triggers Realtime subscription

  return { success: true };
};
```

**Real-time Subscription Pattern**:

```typescript
// In Quick Calculator component
useEffect(() => {
  const subscription = supabase
    .channel(`service_config:${serviceId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'svc_pricing_configs',
      filter: `id=eq.${serviceId}`
    }, (payload) => {
      // Reload service config when updated
      loadServiceConfig(serviceId);
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [serviceId]);
```

---

### 3. Material Depth Consistency

**Risk**: Materials in same category with different depths causing incorrect volume calculations

**Mitigation**:

```typescript
// Validation in Step 4 (Add Materials)
const validateMaterialDepthConsistency = (materials: Material[], category: MaterialCategory) => {
  if (category.calculation_method !== 'VOLUME_COVERAGE') {
    return { isValid: true, errors: [] };
  }

  const errors: string[] = [];
  const depths = materials
    .map(m => m.coverage_depth_inches || category.default_depth_inches)
    .filter((depth, index, self) => self.indexOf(depth) === index);

  if (depths.length > 1) {
    errors.push(
      `Materials in ${category.category_label} have inconsistent depths: ${depths.join(', ')} inches. ` +
      `This may cause incorrect volume calculations. Consider using the category default depth for all materials.`
    );
  }

  return { isValid: errors.length === 0, errors };
};
```

---

### 4. Division by Zero Prevention

**Risk**: `base_productivity = 0` causes `NaN` in labor hour calculation

**Mitigation**:

```sql
-- Database constraint
ALTER TABLE svc_pricing_configs
  ADD CONSTRAINT positive_productivity CHECK (base_productivity > 0);
```

```typescript
// UI validation (Step 2)
const validateBaseSettings = (settings: Step2Data) => {
  const errors: string[] = [];

  if (settings.base_productivity <= 0) {
    errors.push('Base productivity must be greater than 0 to prevent division errors');
  }

  if (settings.hourly_labor_rate <= 0) {
    errors.push('Hourly labor rate must be greater than 0');
  }

  if (settings.optimal_team_size <= 0) {
    errors.push('Team size must be at least 1');
  }

  return { isValid: errors.length === 0, errors };
};
```

---

### 5. Orphaned Materials After Category Deletion

**Risk**: Deleting a material category leaves orphaned materials in `svc_materials`

**Mitigation**:

```sql
-- Database CASCADE constraint
ALTER TABLE svc_material_categories
  ADD CONSTRAINT fk_service_config
  FOREIGN KEY (service_config_id)
  REFERENCES svc_pricing_configs(id)
  ON DELETE CASCADE;

ALTER TABLE svc_materials
  ADD CONSTRAINT fk_service_config
  FOREIGN KEY (service_config_id)
  REFERENCES svc_pricing_configs(id)
  ON DELETE CASCADE;
```

**Application-Level Warning**:

```tsx
const handleDeleteCategory = (categoryKey: string) => {
  const materialsInCategory = state.materials_by_category[categoryKey] || [];

  if (materialsInCategory.length > 0) {
    if (!confirm(
      `This category has ${materialsInCategory.length} materials. ` +
      `Deleting it will remove all associated materials. Continue?`
    )) {
      return;
    }
  }

  // Proceed with deletion
  setState(prev => ({
    ...prev,
    material_categories: prev.material_categories.filter(cat => cat.category_key !== categoryKey),
    materials_by_category: {
      ...prev.materials_by_category,
      [categoryKey]: []
    }
  }));
};
```

---

### 6. Pass-Through Cost Profit Exclusion

**Risk**: Accidentally including equipment/disposal fees in profit calculation

**Mitigation**:

```typescript
// In masterPricingEngine calculation
const calculateTier2 = (tier1Result: Tier1Result, variables: VariableValues, config: ServiceConfig) => {
  const laborCost = tier1Result.total_labor_hours * config.hourly_labor_rate;
  const materialsSubtotal = calculateMaterialsCost(variables.selected_materials);

  // Separate pass-through costs (NOT included in profit base)
  const passThroughCosts = calculatePassThroughCosts(variables);

  // Profit applies ONLY to labor + materials
  const profitableSubtotal = laborCost + materialsSubtotal;
  const profitAmount = profitableSubtotal * config.profit_margin;

  // Total = (Labor + Materials + Profit) + Pass-Through
  const totalPrice = profitableSubtotal + profitAmount + passThroughCosts;

  return {
    labor_cost: laborCost,
    materials_subtotal: materialsSubtotal,
    profit_amount: profitAmount,
    pass_through_costs: passThroughCosts,
    total_price: totalPrice
  };
};

const calculatePassThroughCosts = (variables: VariableValues) => {
  let total = 0;

  // Sum all 'daily_equipment_cost' and 'flat_additional_cost' effects
  Object.entries(variables).forEach(([varKey, optionKey]) => {
    const varDef = findVariableDefinition(varKey);

    if (varDef.effectType === 'daily_equipment_cost') {
      const option = varDef.options[optionKey];
      const days = calculateProjectDays();
      total += option.dollarAmount * days;
    }

    if (varDef.effectType === 'flat_additional_cost') {
      const option = varDef.options[optionKey];
      total += option.dollarAmount;
    }
  });

  return total;
};
```

---

## Testing & Validation Strategy

### Unit Tests

**File**: `src/services/__tests__/CustomServiceCalculation.test.ts`

```typescript
import { calculateCustomServicePrice } from '../masterPricingEngine';

describe('Custom Service Pricing Calculations', () => {

  const testServiceConfig = {
    service_id: 'test_mulch_bed_sqft',
    service_name: 'Test Mulch Bed Installation',
    hourly_labor_rate: 25,
    optimal_team_size: 2,
    base_productivity: 100, // 100 sqft/day
    profit_margin: 0.20,
    variables_config: {
      formulaType: 'two_tier',
      site: {
        label: 'Site Conditions',
        access_difficulty: {
          type: 'select',
          label: 'Access Difficulty',
          description: 'How easy is site access?',
          effectType: 'labor_time_percentage',
          calculationTier: 1,
          default: 'standard',
          options: {
            easy: { label: 'Easy', value: -10, multiplier: 0.90 },
            standard: { label: 'Standard', value: 0, multiplier: 1.0 },
            difficult: { label: 'Difficult', value: 25, multiplier: 1.25 }
          }
        }
      }
    },
    default_variables: {
      site: { access_difficulty: 'standard' }
    },
    material_categories: [
      {
        category_key: 'mulch',
        category_label: 'Mulch',
        calculation_method: 'VOLUME_COVERAGE',
        default_depth_inches: 3
      }
    ],
    materials: [
      {
        id: 'mulch_1',
        material_name: 'Hardwood Mulch',
        material_category: 'mulch',
        unit_type: 'cubic_yard',
        price_per_unit: 35,
        coverage_depth_inches: 3,
        compaction_factor_percentage: 0,
        waste_factor_percentage: 10
      }
    ]
  };

  test('calculates correct labor hours for 100 sqft project', () => {
    const result = calculateCustomServicePrice(
      testServiceConfig,
      100, // project_size
      { mulch: 'mulch_1' }, // selected_materials
      { site: { access_difficulty: 'standard' } } // selected_variables
    );

    // 100 sqft / 100 sqft/day = 1 day
    // 1 day * 2 workers * 8 hrs = 16 hours
    expect(result.tier1.total_labor_hours).toBe(16);
  });

  test('applies labor time percentage adjustment correctly', () => {
    const result = calculateCustomServicePrice(
      testServiceConfig,
      100,
      { mulch: 'mulch_1' },
      { site: { access_difficulty: 'difficult' } } // +25% labor
    );

    // Base: 16 hours
    // +25%: 16 * 1.25 = 20 hours
    expect(result.tier1.total_labor_hours).toBe(20);
  });

  test('calculates material quantity with waste factor', () => {
    const result = calculateCustomServicePrice(
      testServiceConfig,
      100,
      { mulch: 'mulch_1' },
      { site: { access_difficulty: 'standard' } }
    );

    // 100 sqft * (3/12) ft depth = 25 cubic ft = 0.926 cubic yd
    // +10% waste: 0.926 * 1.10 = 1.019 cubic yd
    expect(result.materials_breakdown.mulch.quantity_needed).toBeCloseTo(1.019, 2);
    expect(result.materials_breakdown.mulch.subtotal).toBeCloseTo(35.67, 2); // 1.019 * $35
  });

  test('excludes pass-through costs from profit calculation', () => {
    const configWithEquipment = {
      ...testServiceConfig,
      variables_config: {
        ...testServiceConfig.variables_config,
        equipment: {
          label: 'Equipment',
          skid_steer: {
            type: 'select',
            label: 'Skid Steer',
            effectType: 'daily_equipment_cost',
            calculationTier: 2,
            default: 'none',
            options: {
              none: { label: 'None', dollarAmount: 0 },
              rental: { label: 'Rent Skid Steer', dollarAmount: 275 }
            }
          }
        }
      }
    };

    const result = calculateCustomServicePrice(
      configWithEquipment,
      100,
      { mulch: 'mulch_1' },
      {
        site: { access_difficulty: 'standard' },
        equipment: { skid_steer: 'rental' }
      }
    );

    // Labor: 16 hrs * $25 = $400
    // Materials: ~$35.67
    // Profit base: $400 + $35.67 = $435.67
    // Profit (20%): $435.67 * 0.20 = $87.13
    // Pass-through: $275 (1 day rental)
    // Total: $435.67 + $87.13 + $275 = $797.80

    expect(result.tier2.pass_through_costs).toBe(275);
    expect(result.tier2.profit_amount).toBeCloseTo(87.13, 2);
    expect(result.tier2.total_price).toBeCloseTo(797.80, 2);
  });

  test('prevents division by zero', () => {
    const invalidConfig = {
      ...testServiceConfig,
      base_productivity: 0
    };

    expect(() => {
      calculateCustomServicePrice(invalidConfig, 100, { mulch: 'mulch_1' }, {});
    }).toThrow('Base productivity cannot be 0');
  });

  test('rejects negative project size', () => {
    expect(() => {
      calculateCustomServicePrice(testServiceConfig, -50, { mulch: 'mulch_1' }, {});
    }).toThrow('Project size must be greater than 0');
  });
});
```

---

## Deployment Checklist

### Pre-Deployment SQL MCP Queries

**Run these queries before implementing to understand current state**:

```typescript
// Query 1: Check svc_pricing_configs structure
const configStructure = await supabase.rpc('query', {
  sql: `
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'svc_pricing_configs'
    ORDER BY ordinal_position;
  `
});

// Query 2: Check svc_material_categories structure
const categoriesStructure = await supabase.rpc('query', {
  sql: `
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'svc_material_categories'
    ORDER BY ordinal_position;
  `
});

// Query 3: Check svc_materials structure
const materialsStructure = await supabase.rpc('query', {
  sql: `
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'svc_materials'
    ORDER BY ordinal_position;
  `
});

// Query 4: Verify existing custom services
const existingServices = await supabase.rpc('query', {
  sql: `
    SELECT 
      spc.service_name,
      spc.category,
      spc.is_active,
      COUNT(DISTINCT smc.id) as category_count,
      COUNT(sm.id) as material_count
    FROM svc_pricing_configs spc
    LEFT JOIN svc_material_categories smc ON spc.id = smc.service_config_id
    LEFT JOIN svc_materials sm ON spc.id = sm.service_config_id
    WHERE spc.company_id = $1
    GROUP BY spc.id, spc.service_name, spc.category, spc.is_active;
  `,
  params: [user.company_id]
});
```

### 1. Database Migration Steps

```bash
# Step 1: Backup production database
# (Run via Supabase dashboard or CLI)

# Step 2: Run migration SQL
# File: migrations/add_custom_service_wizard.sql
```

```sql
-- Ensure tables exist with correct schema
-- (See Database Architecture Foundation section for full CREATE TABLE statements)

-- Add stored procedure
-- (See Material System Integration section for create_custom_service_transaction function)

-- Enable RLS policies
ALTER TABLE svc_pricing_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE svc_material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE svc_materials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- (See Edge Case Handling section for policy statements)
```

### 2. Deploy React Components

**Files**:
- `src/components/CustomServiceWizard/CustomServiceWizard.tsx`
- `src/components/CustomServiceWizard/Step1Identity.tsx`
- `src/components/CustomServiceWizard/Step2BaseSettings.tsx`
- `src/components/CustomServiceWizard/Step3MaterialCategories.tsx`
- `src/components/CustomServiceWizard/Step4AddMaterials.tsx`
- `src/components/CustomServiceWizard/Step5DesignVariables.tsx`
- `src/components/CustomServiceWizard/Step6SetDefaults.tsx`
- `src/components/CustomServiceWizard/Step7ValidateCalculations.tsx`
- `src/components/CustomServiceWizard/WizardContext.tsx`
- `src/components/CustomServiceWizard/WizardNavigation.tsx`

### 3. Update Quick Calculator Integration

```typescript
// src/components/QuickCalculator.tsx
const [availableServices, setAvailableServices] = useState([]);

useEffect(() => {
  const loadServices = async () => {
    // Load custom services
    const { data: customServices } = await supabase
      .from('svc_pricing_configs')
      .select('*')
      .eq('company_id', user.company_id)
      .eq('is_active', true);

    setAvailableServices([
      ...DEFAULT_SERVICES,
      ...customServices
    ]);
  };

  loadServices();
}, [user.company_id]);
```

### 4. AI Chat System Prompt Update

```typescript
// src/services/ai-engine/buildSystemPrompt.ts
export const buildSystemPrompt = async (companyId: string) => {
  const { data: customServices } = await supabase
    .from('svc_pricing_configs')
    .select(`
      *,
      svc_material_categories(*),
      svc_materials(*)
    `)
    .eq('company_id', companyId)
    .eq('is_active', true);

  const customServiceContext = customServices
    .map(svc => buildServiceContext(svc))
    .join('\n\n');

  return `${BASE_PROMPT}\n\n## Custom Services\n\n${customServiceContext}`;
};
```

### 5. Testing Verification

```bash
# Run unit tests
npm run test:custom-services

# Run integration tests
npm run test:wizard:integration

# Manual E2E test checklist:
# □ Create custom service through wizard
# □ Verify appears in Quick Calculator dropdown
# □ Run quote in Quick Calculator
# □ Verify AI Chat can quote custom service
# □ Test cache invalidation on config update
# □ Verify multi-tenancy isolation
```

---

## Success Metrics

### Post-Deployment KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Wizard Completion Rate** | >75% | % of wizards started that reach Step 7 |
| **Custom Service Adoption** | >40% | % of companies creating ≥1 custom service within 30 days |
| **Average Services per Company** | 3-5 | Mean custom services per active company |
| **Quote Generation** | >50% | % of quotes using custom services |
| **Calculation Accuracy** | 100% | Zero NaN/Infinity errors in production |
| **Cache Hit Rate** | >90% | % of pricing calculations served from cache |
| **Wizard Completion Time** | <15 min | Median time from Step 1 → Step 7 |

---

**END OF CUSTOM SERVICE WIZARD MASTER IMPLEMENTATION PLAN**
