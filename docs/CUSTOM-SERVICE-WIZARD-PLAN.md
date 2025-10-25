# Custom Service Creation Wizard - Master Implementation Plan

**Purpose**: Comprehensive design document for building the Custom Service Creation Wizard
**Adherence**: Strictly follows CUSTOM-SERVICE-FORMULA-STANDARD.md and database schema
**Target**: Production-ready wizard for unlimited custom service creation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Database Architecture Foundation](#database-architecture-foundation)
3. [7-Step Wizard Flow](#7-step-wizard-flow)
4. [Step-by-Step Implementation Guide](#step-by-step-implementation-guide)
5. [Material System Integration](#material-system-integration)
6. [AI Chat Integration Requirements](#ai-chat-integration-requirements)
7. [Edge Case Handling](#edge-case-handling)
8. [Testing & Validation Strategy](#testing--validation-strategy)
9. [Deployment Checklist](#deployment-checklist)

---

## Executive Summary

### The Vision

Enable contractors to create unlimited custom services through a guided 7-step wizard that:
- **Adheres strictly** to the two-tier pricing formula standard
- **Auto-integrates** with Quick Calculator, AI Chat, and Services Database
- **Self-documents** for AI understanding without code changes
- **Validates** in real-time to prevent pricing errors
- **Saves drafts** automatically for complex service creation

### Critical Success Criteria

✅ **Database-First Design**: All service logic stored in `svc_pricing_configs` JSONB fields
✅ **Zero Code Changes**: New services work immediately without deploying new manager files
✅ **AI-Interpretable**: Services self-document through descriptive labels and structured metadata
✅ **Formula Adherence**: Enforces two-tier separation to prevent exponential pricing
✅ **Multi-Tenant Safe**: Company isolation through RLS policies and validation

### Architecture Overview

```
Custom Service Wizard (React UI)
    ↓
7-Step Data Collection
    ↓
Database Transaction (3 tables)
├── svc_pricing_configs (parent)
├── svc_material_categories (children)
└── svc_materials (grandchildren)
    ↓
Master Pricing Engine Cache Clear
    ↓
Immediate Availability
├── Quick Calculator Tab
├── AI Chat System
└── Services Database Tab
```

---

## Database Architecture Foundation

### Table Relationships

```sql
-- Parent: Service Configuration
CREATE TABLE svc_pricing_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  service_name VARCHAR NOT NULL,

  -- Base Settings (Tier 1 Foundation)
  hourly_labor_rate NUMERIC NOT NULL DEFAULT 25.00,
  optimal_team_size INTEGER NOT NULL DEFAULT 3,
  base_productivity NUMERIC NOT NULL DEFAULT 50.00,  -- Units/day (sqft, linear_ft, etc.)

  -- Tier 2 Settings
  base_material_cost NUMERIC NOT NULL DEFAULT 5.84,
  profit_margin NUMERIC NOT NULL DEFAULT 0.20,

  -- Formula Definition (JSONB)
  variables_config JSONB NOT NULL DEFAULT '{...}',
  default_variables JSONB NOT NULL DEFAULT '{...}',

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  version VARCHAR DEFAULT '2.0.0',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,

  CONSTRAINT unique_service_per_company UNIQUE(company_id, service_name),
  CONSTRAINT positive_labor_rate CHECK (hourly_labor_rate > 0),
  CONSTRAINT positive_productivity CHECK (base_productivity > 0),
  CONSTRAINT valid_profit_margin CHECK (profit_margin >= 0 AND profit_margin <= 1.0)
);

-- Children: Material Category Definitions
CREATE TABLE svc_material_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  service_config_id UUID NOT NULL REFERENCES svc_pricing_configs(id) ON DELETE CASCADE,

  category_key TEXT NOT NULL,           -- Internal key (e.g., "base_rock")
  category_label TEXT NOT NULL,         -- Display name (e.g., "Base Rock & Gravel")
  category_description TEXT,

  -- Calculation Configuration
  calculation_method TEXT NOT NULL,     -- One of 6 standard methods
  default_depth_inches NUMERIC,         -- For VOLUME_COVERAGE materials

  -- UI Configuration
  sort_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_calculation_method CHECK (
    calculation_method IN (
      'AREA_COVERAGE',
      'VOLUME_COVERAGE',
      'LINEAR_COVERAGE',
      'PER_UNIT',
      'WEIGHT_BASED',
      'CUSTOM_FORMULA'
    )
  ),
  CONSTRAINT unique_category_key UNIQUE(service_config_id, category_key)
);

-- Grandchildren: Individual Materials
CREATE TABLE svc_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  service_config_id UUID NOT NULL REFERENCES svc_pricing_configs(id) ON DELETE CASCADE,

  material_name TEXT NOT NULL,
  material_category TEXT NOT NULL,      -- References svc_material_categories.category_key
  material_description TEXT,
  supplier_name TEXT,

  -- Media
  image_url TEXT,
  image_thumbnail_url TEXT,

  -- Pricing
  unit_type TEXT NOT NULL,              -- "sqft", "cubic_yard", "linear_ft", "bag", "ton", etc.
  price_per_unit NUMERIC NOT NULL,

  -- Coverage Calculations
  units_per_package NUMERIC,            -- For PER_UNIT method
  coverage_per_unit NUMERIC,            -- sqft per unit (AREA_COVERAGE, LINEAR_COVERAGE)
  coverage_depth_inches NUMERIC,        -- Overrides category default (VOLUME_COVERAGE)

  -- Physical Dimensions
  length_inches NUMERIC,
  width_inches NUMERIC,
  thickness_inches NUMERIC,
  weight_lbs NUMERIC,

  -- Waste & Compaction
  waste_factor_percentage NUMERIC DEFAULT 10.00,
  compaction_factor_percentage NUMERIC DEFAULT 0.00,

  -- Material Properties
  material_grade TEXT,
  color TEXT,
  finish TEXT,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,

  CONSTRAINT positive_price CHECK (price_per_unit > 0),
  CONSTRAINT positive_coverage CHECK (coverage_per_unit IS NULL OR coverage_per_unit > 0),
  CONSTRAINT valid_waste_factor CHECK (waste_factor_percentage >= 0),
  CONSTRAINT valid_compaction CHECK (compaction_factor_percentage >= 0)
);

-- Indexes for Performance
CREATE INDEX idx_svc_pricing_configs_company ON svc_pricing_configs(company_id, is_active);
CREATE INDEX idx_svc_material_categories_service ON svc_material_categories(service_config_id, is_active);
CREATE INDEX idx_svc_materials_service ON svc_materials(service_config_id, material_category, is_active);
```

### JSONB Structure Requirements

#### variables_config Structure

**Canonical Format** (from CUSTOM-SERVICE-FORMULA-STANDARD.md):

```json
{
  "formulaType": "two_tier",
  "formulaDescription": "Tier 1: Calculate labor hours | Tier 2: Calculate costs with complexity and profit",

  "categoryName": {
    "label": "Category Display Name",
    "description": "What this category controls",

    "variableName": {
      "type": "select",
      "label": "Variable Display Label",
      "description": "How this affects the project",
      "effectType": "labor_time_percentage | material_cost_multiplier | total_project_multiplier | cutting_complexity | daily_equipment_cost | flat_additional_cost",
      "calculationTier": 1 | 2 | "both",
      "default": "defaultOptionKey",

      "options": {
        "optionKey": {
          "label": "Option Display Name",
          "value": 0-100,          // Percentage value
          "multiplier": 1.0-2.5    // Calculated as 1 + (value/100)
        }
      }
    }
  }
}
```

#### Effect Type to Calculation Mapping

| Effect Type | Tier | Fields Required | Example Use Case |
|-------------|------|----------------|------------------|
| **labor_time_percentage** | 1 | value, multiplier | Access difficulty, tearout complexity |
| **material_cost_multiplier** | 2 | value, multiplier | Premium material upgrades, brand selection |
| **total_project_multiplier** | 2 | value, multiplier | Overall project complexity, seasonal factors |
| **cutting_complexity** | Both | laborPercentage, materialWaste | Pattern complexity, cutting requirements |
| **daily_equipment_cost** | 2 | value (dollars) | Equipment rentals (pass-through) |
| **flat_additional_cost** | 2 | value (dollars) | Permits, disposal fees (pass-through) |

#### default_variables Structure

```json
{
  "categoryName": {
    "variableName": "defaultOptionKey"
  }
}
```

**Purpose**: Pre-populate Quick Calculator inputs for faster quoting

---

## 7-Step Wizard Flow

### Overview

```
Step 1: Service Identity
  ↓
Step 2: Base Settings (Tier 1 Foundation)
  ↓
Step 3: Material Categories
  ↓
Step 4: Add Materials to Categories
  ↓
Step 5: Design Variables (Tier 1 & 2 Adjustments)
  ↓
Step 6: Set Default Values
  ↓
Step 7: Validate with Test Calculations
  ↓
Database Transaction → Activation
```

### State Management Pattern

```typescript
// Wizard Context Provider
interface WizardState {
  // Step 1
  service_name: string;
  service_id: string;
  category: 'hardscape' | 'landscape' | 'excavation' | 'specialty' | 'draft';

  // Step 2
  hourly_labor_rate: number;
  optimal_team_size: number;
  base_productivity: number;
  productivity_unit: string;  // "sqft/day", "linear_ft/day", "cubic_yd/day"
  profit_margin: number;

  // Step 3
  material_categories: MaterialCategory[];

  // Step 4
  materials_by_category: Record<string, Material[]>;

  // Step 5
  variables_config: JSONB;

  // Step 6
  default_variables: JSONB;

  // Meta
  current_step: number;
  completed_steps: Set<number>;
  is_draft: boolean;
  draft_saved_at: Date | null;
}

// Persistence Pattern
const WizardContext = createContext<WizardContextValue>(null);

export const CustomServiceWizard: React.FC = () => {
  const [state, setState] = useState<WizardState>(createEmptyState());

  // Auto-save draft when exiting after Step 3+
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (state.current_step >= 3 && !state.is_draft) {
        await saveDraftService(state);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.current_step, state]);

  return (
    <WizardContext.Provider value={{ state, setState }}>
      <WizardModal>
        {renderStepComponent(state.current_step)}
      </WizardModal>
    </WizardContext.Provider>
  );
};
```

---

## Step-by-Step Implementation Guide

### Step 1: Service Identity

**Purpose**: Define unique service identifier and categorization

**UI Fields**:
1. Service Name (display name)
2. Service ID (database key)
3. Category (hardscape/landscape/excavation/specialty)

**Validation Rules**:

```typescript
const validateStep1 = async (data: Step1Data, companyId: string): Promise<ValidationResult> => {
  const errors: string[] = [];

  // 1. Service name required
  if (!data.service_name || data.service_name.trim().length === 0) {
    errors.push('Service name is required');
  }

  // 2. Service name length
  if (data.service_name.length > 100) {
    errors.push('Service name must be 100 characters or less');
  }

  // 3. Service ID format validation
  const serviceIdRegex = /^[a-z0-9_]+_(sqft|linear_ft|cubic_yd|item)$/;
  if (!serviceIdRegex.test(data.service_id)) {
    errors.push('Service ID must be lowercase, underscores only, and end with unit suffix (_sqft, _linear_ft, _cubic_yd, _item)');
  }

  // 4. Uniqueness check (database query)
  const { data: existing } = await supabase
    .from('svc_pricing_configs')
    .select('id')
    .eq('company_id', companyId)
    .eq('service_name', data.service_name)
    .maybeSingle();

  if (existing) {
    errors.push('A service with this name already exists for your company');
  }

  // 5. Category validation
  const validCategories = ['hardscape', 'landscape', 'excavation', 'specialty'];
  if (!validCategories.includes(data.category)) {
    errors.push('Invalid service category');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
```

**UI Component**:

```tsx
const Step1Identity: React.FC = () => {
  const { state, setState } = useWizardContext();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleServiceNameChange = (name: string) => {
    // Auto-generate service ID from name
    const autoId = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');

    setState(prev => ({
      ...prev,
      service_name: name,
      service_id: autoId  // User can override
    }));
  };

  const handleServiceIdBlur = async () => {
    // Validate uniqueness on blur
    const validation = await validateStep1(state, user.company_id);
    setValidationErrors(validation.errors);
  };

  return (
    <div className="wizard-step">
      <h2>Step 1: Service Identity</h2>

      <FormField label="Service Name" required>
        <input
          type="text"
          value={state.service_name}
          onChange={(e) => handleServiceNameChange(e.target.value)}
          placeholder="e.g., Mulch Bed Installation"
        />
        <HelpText>The display name shown to users</HelpText>
      </FormField>

      <FormField label="Service ID" required>
        <input
          type="text"
          value={state.service_id}
          onChange={(e) => setState(prev => ({ ...prev, service_id: e.target.value }))}
          onBlur={handleServiceIdBlur}
          placeholder="e.g., mulch_bed_installation_sqft"
        />
        <HelpText>
          Database key. Must be lowercase, underscores only, and end with unit:
          _sqft, _linear_ft, _cubic_yd, or _item
        </HelpText>
      </FormField>

      <FormField label="Category" required>
        <select
          value={state.category}
          onChange={(e) => setState(prev => ({ ...prev, category: e.target.value }))}
        >
          <option value="hardscape">Hardscaping (pavers, walls, concrete)</option>
          <option value="landscape">Landscaping (mulch, sod, plants)</option>
          <option value="excavation">Excavation & Grading</option>
          <option value="specialty">Specialty Services (water features, decks)</option>
        </select>
      </FormField>

      {validationErrors.length > 0 && (
        <ErrorBox errors={validationErrors} />
      )}

      <WizardNavigation
        onNext={() => setState(prev => ({ ...prev, current_step: 2 }))}
        canProceed={validationErrors.length === 0 && state.service_name && state.service_id}
      />
    </div>
  );
};
```

---

### Step 2: Base Settings (Tier 1 Foundation)

**Purpose**: Define labor cost structure and productivity baseline

**UI Fields**:
1. Hourly Labor Rate ($/hour per worker)
2. Optimal Team Size (number of people)
3. Base Productivity (units/day)
4. Productivity Unit (sqft/day, linear_ft/day, etc.)
5. Profit Margin (decimal percentage)

**Tier 1 Formula Preview**:

```typescript
// Live calculation preview
const calculatePreview = (settings: Step2Data, testSize: number = 100) => {
  const baseDays = testSize / settings.base_productivity;
  const baseHours = baseDays * settings.optimal_team_size * 8;

  return {
    test_size: testSize,
    days_required: baseDays.toFixed(1),
    labor_hours: baseHours.toFixed(1),
    labor_cost: (baseHours * settings.hourly_labor_rate).toFixed(2)
  };
};
```

**UI Component**:

```tsx
const Step2BaseSettings: React.FC = () => {
  const { state, setState } = useWizardContext();
  const [preview, setPreview] = useState(null);

  // Update preview on any field change
  useEffect(() => {
    if (state.base_productivity && state.hourly_labor_rate && state.optimal_team_size) {
      setPreview(calculatePreview(state, 100));
    }
  }, [state.base_productivity, state.hourly_labor_rate, state.optimal_team_size]);

  return (
    <div className="wizard-step">
      <h2>Step 2: Base Settings</h2>
      <p className="text-sm text-gray-600">
        These settings define your Tier 1 labor hour calculation
      </p>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Hourly Labor Rate" required>
          <div className="input-group">
            <span className="prefix">$</span>
            <input
              type="number"
              step="0.01"
              value={state.hourly_labor_rate}
              onChange={(e) => setState(prev => ({
                ...prev,
                hourly_labor_rate: parseFloat(e.target.value)
              }))}
            />
            <span className="suffix">/ hour</span>
          </div>
          <HelpText>Cost per worker per hour</HelpText>
        </FormField>

        <FormField label="Optimal Team Size" required>
          <input
            type="number"
            min="1"
            max="10"
            value={state.optimal_team_size}
            onChange={(e) => setState(prev => ({
              ...prev,
              optimal_team_size: parseInt(e.target.value)
            }))}
          />
          <HelpText>Number of people on crew</HelpText>
        </FormField>

        <FormField label="Base Productivity" required>
          <input
            type="number"
            step="0.01"
            value={state.base_productivity}
            onChange={(e) => setState(prev => ({
              ...prev,
              base_productivity: parseFloat(e.target.value)
            }))}
          />
          <HelpText>Units completed per day</HelpText>
        </FormField>

        <FormField label="Productivity Unit" required>
          <select
            value={state.productivity_unit}
            onChange={(e) => setState(prev => ({
              ...prev,
              productivity_unit: e.target.value
            }))}
          >
            <option value="sqft/day">Square Feet per Day</option>
            <option value="linear_ft/day">Linear Feet per Day</option>
            <option value="cubic_yd/day">Cubic Yards per Day</option>
            <option value="item/day">Items per Day</option>
          </select>
        </FormField>

        <FormField label="Profit Margin" required>
          <div className="input-group">
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={state.profit_margin}
              onChange={(e) => setState(prev => ({
                ...prev,
                profit_margin: parseFloat(e.target.value)
              }))}
            />
            <span className="suffix">%</span>
          </div>
          <HelpText>Applied to labor + materials (0.20 = 20%)</HelpText>
        </FormField>
      </div>

      {/* Live Preview */}
      {preview && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-6">
          <h3 className="font-semibold mb-2">Tier 1 Preview (100 {state.productivity_unit.split('/')[0]} project):</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Days Required</div>
              <div className="text-lg font-bold">{preview.days_required}</div>
            </div>
            <div>
              <div className="text-gray-600">Labor Hours</div>
              <div className="text-lg font-bold">{preview.labor_hours}</div>
            </div>
            <div>
              <div className="text-gray-600">Labor Cost</div>
              <div className="text-lg font-bold">${preview.labor_cost}</div>
            </div>
          </div>
        </div>
      )}

      <WizardNavigation
        onBack={() => setState(prev => ({ ...prev, current_step: 1 }))}
        onNext={() => setState(prev => ({ ...prev, current_step: 3 }))}
        canProceed={state.hourly_labor_rate > 0 && state.base_productivity > 0}
      />
    </div>
  );
};
```

---

### Step 3: Material Categories

**Purpose**: Define material groupings and their calculation methods

**UI Fields** (per category):
1. Category Key (internal identifier)
2. Category Label (display name)
3. Category Description
4. Calculation Method (dropdown of 6 methods)
5. Default Depth (for VOLUME_COVERAGE only)
6. Is Required (boolean)
7. Sort Order (integer)

**Calculation Method Selector**:

```tsx
const CalculationMethodSelector: React.FC<{
  value: string;
  onChange: (method: string) => void;
  onShowFields: (fields: string[]) => void;
}> = ({ value, onChange, onShowFields }) => {

  const methods = [
    {
      value: 'AREA_COVERAGE',
      label: 'Area Coverage (sqft-based)',
      description: 'Materials that cover flat surface area (pavers, mulch, sod, fabric)',
      requiredFields: ['coverage_per_unit', 'waste_factor_percentage'],
      example: 'Pavers: 4.5 sqft per unit, 15% waste'
    },
    {
      value: 'VOLUME_COVERAGE',
      label: 'Volume Coverage (cubic ft/yd-based)',
      description: 'Materials with depth that settle/compact (base rock, concrete, fill dirt)',
      requiredFields: ['coverage_depth_inches', 'compaction_factor_percentage', 'waste_factor_percentage'],
      example: 'Base rock: 6" depth, 20% compaction, 10% waste'
    },
    {
      value: 'LINEAR_COVERAGE',
      label: 'Linear Coverage (linear ft-based)',
      description: 'Materials used along perimeters (edging, pipe, fabric rolls)',
      requiredFields: ['coverage_per_unit', 'length_inches'],
      example: 'Edging: 20 linear ft per section'
    },
    {
      value: 'PER_UNIT',
      label: 'Per Unit (count-based)',
      description: 'Discrete packages sold by count (sand bags, plants, posts)',
      requiredFields: ['units_per_package', 'coverage_per_unit'],
      example: 'Polymeric sand: 50 sqft per bag'
    },
    {
      value: 'WEIGHT_BASED',
      label: 'Weight-Based (lbs/tons)',
      description: 'Materials specified by weight (stone dust, bonding agents)',
      requiredFields: ['weight_lbs', 'coverage_per_unit', 'waste_factor_percentage'],
      example: 'Stone dust: 50 lbs per bag, 10 sqft coverage'
    },
    {
      value: 'CUSTOM_FORMULA',
      label: 'Custom Formula (JSON-defined)',
      description: 'Complex calculations not fitting standard patterns',
      requiredFields: ['custom_formula_json'],
      example: 'Retaining wall: Height-tiered block calculation'
    }
  ];

  const selectedMethod = methods.find(m => m.value === value);

  return (
    <div>
      <select
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          const method = methods.find(m => m.value === e.target.value);
          onShowFields(method?.requiredFields || []);
        }}
        className="w-full"
      >
        <option value="">Select calculation method...</option>
        {methods.map(method => (
          <option key={method.value} value={method.value}>
            {method.label}
          </option>
        ))}
      </select>

      {selectedMethod && (
        <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
          <div className="font-semibold mb-1">{selectedMethod.description}</div>
          <div className="text-gray-600">Example: {selectedMethod.example}</div>
          <div className="mt-2 text-xs text-blue-600">
            Required material fields: {selectedMethod.requiredFields.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
};
```

**UI Component**:

```tsx
const Step3MaterialCategories: React.FC = () => {
  const { state, setState } = useWizardContext();
  const [categories, setCategories] = useState<MaterialCategory[]>([]);

  const addCategory = () => {
    setCategories(prev => [...prev, {
      id: crypto.randomUUID(),
      category_key: '',
      category_label: '',
      category_description: '',
      calculation_method: '',
      default_depth_inches: null,
      is_required: true,
      sort_order: prev.length,
      is_active: true
    }]);
  };

  const updateCategory = (id: string, field: string, value: any) => {
    setCategories(prev => prev.map(cat =>
      cat.id === id ? { ...cat, [field]: value } : cat
    ));
  };

  const removeCategory = (id: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== id));
  };

  // Save to wizard state when continuing
  const handleNext = () => {
    setState(prev => ({
      ...prev,
      material_categories: categories,
      current_step: 4
    }));
  };

  return (
    <div className="wizard-step">
      <h2>Step 3: Material Categories</h2>
      <p className="text-sm text-gray-600 mb-4">
        Define groups of materials that will be calculated differently.
        Each category will have its own calculation method.
      </p>

      <div className="space-y-6">
        {categories.map((category, index) => (
          <div key={category.id} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Category {index + 1}</h3>
              <button
                onClick={() => removeCategory(category.id)}
                className="text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Category Key" required>
                <input
                  type="text"
                  value={category.category_key}
                  onChange={(e) => updateCategory(category.id, 'category_key', e.target.value)}
                  placeholder="e.g., base_rock"
                />
                <HelpText>Internal identifier (lowercase, underscores)</HelpText>
              </FormField>

              <FormField label="Category Label" required>
                <input
                  type="text"
                  value={category.category_label}
                  onChange={(e) => updateCategory(category.id, 'category_label', e.target.value)}
                  placeholder="e.g., Base Rock & Gravel"
                />
                <HelpText>Display name for users</HelpText>
              </FormField>

              <div className="col-span-2">
                <FormField label="Description">
                  <textarea
                    value={category.category_description}
                    onChange={(e) => updateCategory(category.id, 'category_description', e.target.value)}
                    placeholder="Explain what this material category is for..."
                    rows={2}
                  />
                </FormField>
              </div>

              <div className="col-span-2">
                <FormField label="Calculation Method" required>
                  <CalculationMethodSelector
                    value={category.calculation_method}
                    onChange={(method) => updateCategory(category.id, 'calculation_method', method)}
                    onShowFields={(fields) => {
                      // Show conditional fields based on method
                    }}
                  />
                </FormField>
              </div>

              {category.calculation_method === 'VOLUME_COVERAGE' && (
                <FormField label="Default Depth (inches)" required>
                  <input
                    type="number"
                    step="0.5"
                    value={category.default_depth_inches || ''}
                    onChange={(e) => updateCategory(category.id, 'default_depth_inches', parseFloat(e.target.value))}
                    placeholder="e.g., 6"
                  />
                  <HelpText>Standard depth for volume-based materials</HelpText>
                </FormField>
              )}

              <FormField label="Required?">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={category.is_required}
                    onChange={(e) => updateCategory(category.id, 'is_required', e.target.checked)}
                  />
                  <span className="ml-2">Must select a material from this category</span>
                </label>
              </FormField>

              <FormField label="Sort Order">
                <input
                  type="number"
                  value={category.sort_order}
                  onChange={(e) => updateCategory(category.id, 'sort_order', parseInt(e.target.value))}
                />
                <HelpText>Display order (0 = first)</HelpText>
              </FormField>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addCategory}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        + Add Material Category
      </button>

      <WizardNavigation
        onBack={() => setState(prev => ({ ...prev, current_step: 2 }))}
        onNext={handleNext}
        canProceed={categories.length > 0 && categories.every(c =>
          c.category_key && c.category_label && c.calculation_method
        )}
      />
    </div>
  );
};
```

---

### Step 4: Add Materials to Categories

**Purpose**: Populate each category with specific product options

**UI Pattern**: Category tabs with material list management

**Material Fields** (conditional based on category calculation_method):

**Base Fields (all materials)**:
- material_name
- material_description
- unit_type
- price_per_unit
- supplier_name (optional)
- is_default

**AREA_COVERAGE Fields**:
- coverage_per_unit (sqft per unit)
- waste_factor_percentage

**VOLUME_COVERAGE Fields**:
- coverage_depth_inches (overrides category default)
- compaction_factor_percentage
- waste_factor_percentage

**LINEAR_COVERAGE Fields**:
- coverage_per_unit (linear ft per unit)
- length_inches

**PER_UNIT Fields**:
- units_per_package
- coverage_per_unit (optional)

**WEIGHT_BASED Fields**:
- weight_lbs
- coverage_per_unit
- waste_factor_percentage

**UI Component** (abbreviated):

```tsx
const Step4AddMaterials: React.FC = () => {
  const { state, setState } = useWizardContext();
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [materialsByCategory, setMaterialsByCategory] = useState<Record<string, Material[]>>({});

  const currentCategory = state.material_categories[selectedCategoryIndex];
  const currentMaterials = materialsByCategory[currentCategory?.category_key] || [];

  const addMaterial = () => {
    const newMaterial: Material = {
      id: crypto.randomUUID(),
      material_name: '',
      material_category: currentCategory.category_key,
      unit_type: '',
      price_per_unit: 0,
      // Conditional fields based on calculation_method
      ...getDefaultFieldsForMethod(currentCategory.calculation_method)
    };

    setMaterialsByCategory(prev => ({
      ...prev,
      [currentCategory.category_key]: [...(prev[currentCategory.category_key] || []), newMaterial]
    }));
  };

  return (
    <div className="wizard-step">
      <h2>Step 4: Add Materials</h2>

      {/* Category Tabs */}
      <div className="tabs">
        {state.material_categories.map((cat, index) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoryIndex(index)}
            className={selectedCategoryIndex === index ? 'active' : ''}
          >
            {cat.category_label}
            {materialsByCategory[cat.category_key]?.length > 0 && (
              <span className="badge">{materialsByCategory[cat.category_key].length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Material List for Selected Category */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">{currentCategory?.category_label}</h3>
            <p className="text-sm text-gray-600">
              Calculation Method: {currentCategory?.calculation_method}
            </p>
          </div>
          <button onClick={addMaterial} className="btn-primary">
            + Add Material
          </button>
        </div>

        {currentMaterials.map(material => (
          <MaterialEditor
            key={material.id}
            material={material}
            calculationMethod={currentCategory.calculation_method}
            onUpdate={(field, value) => updateMaterial(material.id, field, value)}
            onRemove={() => removeMaterial(material.id)}
          />
        ))}
      </div>

      <WizardNavigation
        onBack={() => setState(prev => ({ ...prev, current_step: 3 }))}
        onNext={() => {
          setState(prev => ({
            ...prev,
            materials_by_category: materialsByCategory,
            current_step: 5
          }));
        }}
        canProceed={state.material_categories.every(cat =>
          materialsByCategory[cat.category_key]?.length > 0
        )}
      />
    </div>
  );
};
```

---

## Document Navigation

**This document is split into 3 parts due to comprehensive coverage:**

- **[Part 1 (This Document)](CUSTOM-SERVICE-WIZARD-PLAN.md)**: Executive Summary, Database Architecture, Steps 1-4
- **[Part 2](CUSTOM-SERVICE-WIZARD-PLAN-PART-2.md)**: Steps 5-7 (Design Variables, Set Defaults, Validate Calculations)
- **[Part 3](CUSTOM-SERVICE-WIZARD-PLAN-PART-3.md)**: Material System Integration, AI Chat Integration, Edge Cases, Testing, Deployment

---

## Implementation Readiness

### Quick Reference

**Before Starting Implementation**:
1. ✅ Read all 3 parts of this plan
2. ✅ Use SQL MCP to query current database schema (see Part 3, Deployment Checklist)
3. ✅ Review [CUSTOM-SERVICE-FORMULA-STANDARD.md](CUSTOM-SERVICE-FORMULA-STANDARD.md)
4. ✅ Familiarize with `ServiceConfigManager.ts` patterns

**Implementation Order**:
1. Database migration (stored procedure + RLS policies)
2. React wizard components (Steps 1-7)
3. Quick Calculator integration
4. AI Chat system prompt updates
5. Testing & validation
6. Staged rollout (beta → limited → general)

**Critical Files to Reference**:
- `src/services/ServiceConfigManager.ts` - Cache invalidation pattern
- `src/stores/serviceBaseSettingsStore.ts` - Real-time subscription pattern
- `src/services/ai-engine/GPTServiceSplitter.ts` - AI prompt engineering
- `src/database/schema-reference.sql` - Database schema

---

**CONTINUE TO [PART 2](CUSTOM-SERVICE-WIZARD-PLAN-PART-2.md) →**
