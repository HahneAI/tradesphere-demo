# TradeSphere Pricing System - Complete Technical Architecture

**Last Updated**: October 25, 2025
**Version**: 2.0 (Materials Database System)

---

## 🎯 Simple Overview (Non-Technical)

Think of it like ordering at a restaurant:
- **Service Stores** = The waiter (takes your order, remembers what you want)
- **Service Managers** = The menu (shows you options, buttons to click)
- **Master Pricing Engine** = The kitchen (does the actual cooking/calculating)
- **Database** = The recipe book (has all the prices and formulas)

### The Big Picture

**Stores = memory**, **Managers = UI**, **Engine = calculator**, **Database = price list**. Everything talks to everything else through simple function calls.

---

## 📋 Table of Contents

1. [Service Stores vs Service Managers](#1-service-stores-vs-service-managers)
2. [Quick Calculator Integration](#2-quick-calculator-integration)
3. [Formula Storage and Execution](#3-formula-storage-and-execution)
4. [Data Flow - Complete Journey](#4-data-flow---complete-journey)
5. [Key Interfaces & Types](#5-key-interfaces--types)
6. [Cache & Real-Time Sync](#6-cache--real-time-sync)
7. [ASCII Architecture Diagram](#7-ascii-architecture-diagram)
8. [Critical Files Reference](#8-critical-files-reference)

---

## 1. Service Stores vs Service Managers

### Service Stores (State Management Layer)

**Location**: `src/pricing-system/core/stores/`

**Purpose**: React hooks that manage state, configuration loading, and calculation orchestration

**Key Files**:
- `paver-patio-store.ts` - Paver patio pricing state
- `excavation-store.ts` - Excavation service state

**Responsibilities**:
1. **Configuration Management**
   - Load pricing config from Master Pricing Engine
   - Subscribe to real-time Supabase updates
   - Cache config in React state
   - Force reload when needed

2. **State Management**
   - Track user input values (sqft, depth, material selections)
   - Store last calculation result
   - Handle loading/error states
   - Persist values to localStorage (user preferences)

3. **Calculation Orchestration**
   - Call Master Pricing Engine with current values
   - Update state with calculation results
   - Trigger recalculations on value changes

4. **Reactive Updates**
   - Listen for config changes (via Supabase subscriptions)
   - Automatically recalculate when config updates
   - Provide reset/default functions

**Example Store Architecture** (`paver-patio-store.ts`):
```typescript
export const usePaverPatioStore = (companyId?: string): PaverPatioStore => {
  const [config, setConfig] = useState<PaverPatioConfig | null>(null);
  const [values, setValues] = useState<PaverPatioValues>({...});
  const [sqft, setSqft] = useState<number>(100);
  const [lastCalculation, setLastCalculation] = useState<...>(null);

  // Load config from Master Pricing Engine
  const loadConfig = async () => {
    const configData = await masterPricingEngine.loadPricingConfig(
      'paver_patio_sqft',
      companyId
    );
    setConfig(configData);
  };

  // Calculate pricing
  const calculatePrice = async (sqft: number) => {
    const result = await masterPricingEngine.calculatePricing(
      values, sqft, 'paver_patio_sqft', companyId
    );
    setLastCalculation(result);
  };

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = masterPricingEngine.subscribeToConfigChanges(
      'paver_patio_sqft', companyId, (newConfig) => {
        setConfig(newConfig);
        // Auto-recalculate with new config
      }
    );
    return unsubscribe;
  }, [companyId]);

  return { config, values, sqft, lastCalculation, calculatePrice, ... };
};
```

---

### Service Managers (UI Presentation Layer)

**Location**: `src/components/services/`

**Purpose**: React components that render UI and connect to stores

**Key Files**:
- `PaverPatioManager.tsx` - Paver patio UI controls
- `ExcavationManager.tsx` - Excavation UI controls

**Responsibilities**:
1. **UI Rendering**
   - Render input controls (sliders, dropdowns, text fields)
   - Display calculation results
   - Show pricing breakdown
   - Apply theme styling

2. **User Interaction**
   - Handle form input changes
   - Trigger calculations via store methods
   - Validate user input
   - Provide immediate feedback

3. **Store Integration**
   - Receive store instance as prop
   - Call store methods (updateValue, calculatePrice)
   - Display store state (config, values, lastCalculation)

4. **Visual Configuration**
   - Accept visualConfig and theme props
   - Apply company branding
   - Responsive mobile layouts

**Example Manager Architecture** (`PaverPatioManager.tsx`):
```typescript
interface PaverPatioManagerProps {
  store: PaverPatioStore;  // Store passed as prop
  visualConfig: VisualThemeConfig;
  theme: string;
}

export const PaverPatioManager: React.FC<PaverPatioManagerProps> = ({
  store,
  visualConfig,
  theme
}) => {
  const { config, values, sqft, lastCalculation, updateValue, calculatePrice } = store;

  return (
    <div>
      {/* Input Controls */}
      <input
        value={sqft}
        onChange={(e) => store.setSqft(Number(e.target.value))}
      />

      {/* Variable Controls */}
      <select
        value={values.materials.paverStyle}
        onChange={(e) => updateValue('materials', 'paverStyle', e.target.value)}
      >
        {/* Options from config */}
      </select>

      {/* Calculate Button */}
      <button onClick={() => calculatePrice(sqft)}>
        Calculate
      </button>

      {/* Results Display */}
      {lastCalculation && (
        <div>Total: ${lastCalculation.tier2Results.total}</div>
      )}
    </div>
  );
};
```

---

### Key Difference Summary

| Aspect | Service Store | Service Manager |
|--------|---------------|-----------------|
| **Layer** | State Management | UI Presentation |
| **Type** | React Hook | React Component |
| **Returns** | State object with methods | JSX/UI elements |
| **Data Flow** | Loads from DB → Stores state → Calls engine | Receives store → Renders UI → Calls store methods |
| **Business Logic** | ✅ Yes (orchestration) | ❌ No (only display) |
| **Calculation** | ✅ Calls Master Engine | ❌ Only triggers via store |
| **Config Loading** | ✅ Yes | ❌ No |
| **Real-time Sync** | ✅ Supabase subscriptions | ❌ No |

---

## 2. Quick Calculator Integration

### Component Hierarchy

```
InlineQuickCalculator (Job Wizard)
├── usePaverPatioStore(companyId)      [Store Hook]
├── useExcavationStore(companyId)      [Store Hook]
│
└── Renders UI:
    ├── Service Type Dropdown
    ├── PaverPatioManager (if paver selected)
    │   └── Uses store.values, store.calculatePrice()
    └── ExcavationManager (if excavation selected)
        └── Uses store.values, store.calculate()
```

### Data Flow: User Input → Calculation → Result

**File**: `src/components/jobs/wizard/components/InlineQuickCalculator.tsx`

```typescript
// Step 1: Initialize stores for available services
const paverPatioStore = usePaverPatioStore(companyId);
const excavationStore = useExcavationStore(companyId);

// Step 2: User selects service type
const [selectedService, setSelectedService] = useState<'paver_patio_sqft' | 'excavation_removal'>();

// Step 3: Get current store based on selection
const currentStore = selectedService === 'paver_patio_sqft'
  ? paverPatioStore
  : excavationStore;

// Step 4: Render service-specific UI manager
{selectedService === 'paver_patio_sqft' && (
  <PaverPatioManager store={paverPatioStore} theme={theme} />
)}

// Step 5: User commits calculation to job
const handleCommitToJob = () => {
  const serviceItem = transformPaverPatioToService(
    paverPatioStore.lastCalculation,  // Calculation result
    paverPatioStore.config,            // Service config
    paverPatioStore.sqft,              // User inputs
    paverPatioStore.values             // Variable selections
  );

  onCommitService(serviceItem);  // Add to job services list
};
```

### Connection Flow Diagram

```
UI Component (InlineQuickCalculator)
    ↓
    │ Initializes Store Hooks
    ↓
Service Store (usePaverPatioStore)
    ↓
    │ Loads config from Master Engine
    │ Subscribes to real-time updates
    ↓
Master Pricing Engine
    ↓
    │ loadPricingConfig(serviceName, companyId)
    ↓
Supabase (svc_pricing_configs table)
    ↓
    │ Returns config row
    ↓
Master Pricing Engine
    ↓
    │ Converts to PaverPatioConfig
    │ Caches result
    ↓
Service Store
    ↓
    │ setConfig(config)
    │ setValues(defaultValues)
    ↓
UI Component
    ↓
    │ Renders PaverPatioManager
    ↓
User Interaction
    ↓
    │ Changes sqft or variables
    ↓
Service Manager
    ↓
    │ Calls store.updateValue() or store.calculatePrice()
    ↓
Service Store
    ↓
    │ Calls masterPricingEngine.calculatePricing()
    ↓
Master Pricing Engine
    ↓
    │ calculateTier1() → labor hours
    │ calculateTier2() → costs + materials
    ↓
Material Calculations (if materials database enabled)
    ↓
    │ calculateAllMaterialCosts()
    │ Fetches materials from Supabase
    │ Calculates volume/area/linear quantities
    ↓
Calculation Result
    ↓
    │ Returns { tier1Results, tier2Results, total }
    ↓
Service Store
    ↓
    │ setLastCalculation(result)
    ↓
Service Manager
    ↓
    │ Displays result in UI
    ↓
User Commits
    ↓
    │ Transform calculation → ServiceLineItem
    ↓
Job Wizard
    ↓
    │ Adds to services[] array
```

---

## 3. Formula Storage and Execution

### Two-Tier Formula System

TradeSphere uses a **two-tier calculation system** where formulas are **partially stored in database** and **partially implemented in code**.

#### Tier 1: Labor Hours Calculation (Code-Based)

**Location**: `master-pricing-engine.ts` → `calculateTier1()`

**Formula** (Hardcoded Logic):
```typescript
baseHours = (sqft / baseProductivity) * optimalTeamSize * 8;

// Apply variable percentages (each independent of others)
accessHours = baseHours * (accessPercentage / 100);
teamHours = baseHours * (teamSizePercentage / 100);
cuttingHours = baseHours * (cuttingLaborPercentage / 100);

totalHours = baseHours + accessHours + teamHours + cuttingHours + excavationHours;
```

**Parameters** (Database-Stored):
- `baseProductivity` - sqft/day (stored in `base_productivity` column)
- `optimalTeamSize` - people (stored in `optimal_team_size` column)
- Variable percentages - stored in `variables_config` JSONB column

**Why Code-Based**:
- Complex logic with conditional branching
- Requires calculation breakdown for UI display
- Base-independent percentage system needs custom implementation

---

#### Tier 2: Cost Calculation (Code + Database Hybrid)

**Location**: `master-pricing-engine.ts` → `calculateTier2()`

**Formula** (Hardcoded Logic):
```typescript
laborCost = totalManHours * hourlyLaborRate;

// NEW SYSTEM: Material costs from database
if (useMaterialsDatabase) {
  materialBreakdown = await calculateAllMaterialCosts(sqft, selectedMaterials, companyId);
  totalMaterialCost = materialBreakdown.totalMaterialCost;
} else {
  // OLD SYSTEM: Simple multiplier
  materialCost = baseMaterialCost * sqft * styleMultiplier;
}

// Excavation (bundled service)
if (includeExcavation) {
  excavationCost = await calculateExcavationCost(sqft, companyId);
}

// Apply complexity multiplier
adjustedCosts = (laborCost + materialCost + excavationCost) * complexityMultiplier;

// Calculate profit
profit = adjustedCosts * profitMargin;

total = adjustedCosts + profit + obstacleCost;
```

**Parameters** (Database-Stored):
- `hourlyLaborRate` - $/hr (stored in `hourly_labor_rate` column)
- `baseMaterialCost` - $/sqft (stored in `base_material_cost` column)
- `profitMargin` - decimal (stored in `profit_margin` column)
- Material selections - fetched from `svc_materials` table
- Variable values - stored in `variables_config` JSONB column

---

### Service Configuration Storage

**Database Table**: `svc_pricing_configs`

```sql
CREATE TABLE svc_pricing_configs (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  service_name TEXT NOT NULL,

  -- Base Settings (Tier 1 & 2 parameters)
  hourly_labor_rate NUMERIC NOT NULL,
  optimal_team_size NUMERIC NOT NULL,
  base_productivity NUMERIC NOT NULL,
  base_material_cost NUMERIC NOT NULL,
  profit_margin NUMERIC NOT NULL,

  -- Variables Configuration (JSONB)
  variables_config JSONB NOT NULL,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  version TEXT DEFAULT '2.0.0',
  updated_at TIMESTAMPTZ,
  updated_by UUID,

  UNIQUE(company_id, service_name)
);
```

**Example `variables_config` JSONB**:
```json
{
  "siteAccess": {
    "accessDifficulty": {
      "label": "Access Difficulty",
      "type": "select",
      "default": "easy",
      "options": {
        "easy": { "label": "Easy Access", "value": 0 },
        "moderate": { "label": "Moderate", "value": 15 },
        "difficult": { "label": "Difficult", "value": 30 }
      }
    }
  },
  "materials": {
    "paverStyle": {
      "label": "Paver Style",
      "type": "select",
      "default": "standard",
      "options": {
        "standard": { "label": "Standard", "multiplier": 1.0 },
        "premium": { "label": "Premium", "multiplier": 1.5 }
      }
    }
  }
}
```

---

### Material Storage (New System)

**Database Tables**:

**1. Material Categories** (`svc_material_categories`)
```sql
CREATE TABLE svc_material_categories (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  service_config_id UUID REFERENCES svc_pricing_configs(id),
  category_key TEXT NOT NULL,
  category_label TEXT NOT NULL,
  calculation_method TEXT NOT NULL,  -- 'volume_depth', 'area_coverage', 'linear_perimeter'
  default_depth_inches NUMERIC,
  sort_order INTEGER
);
```

**2. Materials** (`svc_materials`)
```sql
CREATE TABLE svc_materials (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  service_config_id UUID NOT NULL,
  material_name TEXT NOT NULL,
  price_per_unit NUMERIC NOT NULL,
  unit_type TEXT NOT NULL,  -- 'cubic_yard', 'square_foot', 'linear_foot', etc.
  coverage_per_unit NUMERIC,
  waste_factor_percentage NUMERIC DEFAULT 10,
  compaction_factor_percentage NUMERIC DEFAULT 0,
  is_default BOOLEAN DEFAULT false
);
```

**Example Materials**:
```json
// Base Rock (Volume-Based)
{
  "material_name": "3/4\" Base Rock",
  "price_per_unit": 36.75,
  "unit_type": "cubic_yard",
  "coverage_depth_inches": 6.0,
  "waste_factor_percentage": 10,
  "compaction_factor_percentage": 20
}

// Pavers (Area-Based)
{
  "material_name": "Belgard Cambridge Cobble",
  "price_per_unit": 5.17,
  "unit_type": "square_foot",
  "coverage_per_unit": 1.0,
  "waste_factor_percentage": 10
}
```

---

### Formula Execution Flow

**Step 1: Load Configuration**
```typescript
// Master Pricing Engine
const config = await this.loadPricingConfig('paver_patio_sqft', companyId);

// Supabase Query
SELECT * FROM svc_pricing_configs
WHERE company_id = $1 AND service_name = $2 AND is_active = true;

// Converts row to PaverPatioConfig interface
return this.convertRowToConfig(row);
```

**Step 2: Execute Tier 1 (Labor Hours)**
```typescript
// Extract base settings from config
const hourlyRate = config.baseSettings.laborSettings.hourlyLaborRate.value;
const optimalTeamSize = config.baseSettings.laborSettings.optimalTeamSize.value;
const baseProductivity = config.baseSettings.laborSettings.baseProductivity.value;

// Calculate base hours
const baseHours = (sqft / baseProductivity) * optimalTeamSize * 8;

// Apply variables from config
const accessPercentage = config.variables.siteAccess.accessDifficulty.options[selectedOption].value;
const accessHours = baseHours * (accessPercentage / 100);
```

**Step 3: Execute Tier 2 (Costs)**
```typescript
const laborCost = tier1Results.totalManHours * hourlyRate;

// NEW: Material calculations from database
if (values.materials.useMaterialsDatabase) {
  const materialResult = await calculateAllMaterialCosts(
    { squareFootage: sqft, selectedMaterials: values.selectedMaterials },
    companyId,
    config.id
  );
  totalMaterialCost = materialResult.totalMaterialCost;
}

// Apply complexity
const complexityMultiplier = getComplexityMultiplier(values.complexity.overallComplexity);
const adjustedCosts = (laborCost + totalMaterialCost) * complexityMultiplier;

// Calculate profit
const profit = adjustedCosts * profitMargin;
const total = adjustedCosts + profit;
```

**Step 4: Material Calculations** (if database enabled)
```typescript
// Fetch categories for service
const categories = await fetchMaterialCategories(companyId, serviceConfigId);

for (const category of categories) {
  // Get selected or default material
  const material = await fetchMaterialById(selectedMaterialId) ||
                   await getDefaultMaterial(companyId, serviceConfigId, category.category_key);

  // Calculate based on method
  switch (category.calculation_method) {
    case 'volume_depth':
      // Formula: (sqft × depth / 12) / 27 × (1 + waste%) × (1 + compaction%)
      cubicYards = (sqft * depth_inches / 12) / 27;
      withCompaction = cubicYards * (1 + compaction% / 100);
      withWaste = withCompaction * (1 + waste% / 100);
      totalCost = withWaste * price_per_unit;
      break;

    case 'area_coverage':
      // Formula: sqft × (1 + waste%) / coverage_per_unit
      withWaste = sqft * (1 + waste% / 100);
      unitsNeeded = withWaste / coverage_per_unit;
      totalCost = unitsNeeded * price_per_unit;
      break;

    case 'linear_perimeter':
      // Formula: (√sqft × 4.15) × (1 + waste%) / coverage_per_unit
      perimeter = Math.sqrt(sqft) * 4.15;
      withWaste = perimeter * (1 + waste% / 100);
      unitsNeeded = withWaste / coverage_per_unit;
      totalCost = unitsNeeded * price_per_unit;
      break;
  }
}
```

---

## 4. Data Flow - Complete Journey

### Input Structure

**User Input Data**:
```typescript
{
  sqft: 600,
  values: {
    siteAccess: {
      accessDifficulty: 'moderate',
      obstacleRemoval: 'none'
    },
    materials: {
      paverStyle: 'premium',
      cuttingComplexity: 'moderate',
      useMaterialsDatabase: true,
      selectedMaterials: {
        base_rock: 'uuid-123',
        pavers: 'uuid-456'
      }
    },
    labor: { teamSize: 'threePlus' },
    complexity: { overallComplexity: 'standard' },
    serviceIntegrations: { includeExcavation: true }
  }
}
```

### Processing Steps

**Step 1: State Management (Service Store)**
- Load configuration from database
- Subscribe to real-time updates
- Store user input values

**Step 2: Tier 1 Calculation (Labor Hours)**
```
baseHours = (600 / 50) * 3 * 8 = 288 hours
+ Access difficulty (moderate, +10%): +28.8 hours
+ Team size (3+): +0 hours
+ Cutting complexity (moderate): +32 hours
+ Excavation (included): +12 hours
= Total: 328.8 hours (13.7 days)
```

**Step 3: Tier 2 Calculation (Costs)**
```
Labor: 328.8 hours × $25/hr = $8,220

Materials (from database):
  Base Rock: 14.7 cy × $36.75 = $540.23
  Clean Rock: 7.4 cy × $24.95 = $184.63
  Pavers: 660 sqft × $5.17 = $3,412.20
  Edging: 14 sections × $1.24 = $17.36
  Total Materials: $4,154.42

Excavation: $450.00

Subtotal: $12,824.42
Profit (20%): $2,564.88
Total: $15,389.30
Price per sqft: $25.65
```

### Output Structure

**Calculation Result**:
```typescript
{
  tier1Results: {
    baseHours: 288.0,
    adjustedHours: 316.8,
    excavationHours: 12.0,
    totalManHours: 328.8,
    totalDays: 13.7,
    breakdown: [
      'Base: 600 sqft ÷ 50 sqft/day × 3 people × 8 hours = 288.0 hours',
      '+Access difficulty (+10%): +28.8 hours',
      '+Excavation: +12.0 hours',
      'Total: 328.8 hours'
    ]
  },
  tier2Results: {
    laborCost: 8220.00,
    totalMaterialCost: 4154.42,
    excavationCost: 450.00,
    subtotal: 12824.42,
    profit: 2564.88,
    total: 15389.30,
    pricePerSqft: 25.65,
    materialBreakdown: {
      categories: [...],
      totalMaterialCost: 4154.42,
      costPerSquareFoot: 6.92
    }
  }
}
```

---

## 5. Key Interfaces & Types

### Input Types

```typescript
interface PaverPatioValues {
  siteAccess: {
    accessDifficulty: 'easy' | 'moderate' | 'difficult';
    obstacleRemoval: 'none' | 'minor' | 'major';
  };
  materials: {
    paverStyle: string;
    cuttingComplexity: 'minimal' | 'moderate' | 'complex';
    useMaterialsDatabase: boolean;
  };
  labor: {
    teamSize: 'onePerson' | 'twoPerson' | 'threePlus';
  };
  complexity: {
    overallComplexity: 'simple' | 'standard' | 'complex' | 'extreme';
  };
  serviceIntegrations?: {
    includeExcavation: boolean;
  };
  selectedMaterials?: Record<string, string>; // categoryKey → materialId
}
```

### Output Types

```typescript
interface Tier1Results {
  baseHours: number;
  adjustedHours: number;
  excavationHours?: number;
  totalManHours: number;
  totalDays: number;
  breakdown: string[];
}

interface Tier2Results {
  laborCost: number;
  totalMaterialCost: number;
  excavationCost?: number;
  subtotal: number;
  profit: number;
  total: number;
  pricePerSqft: number;
  materialBreakdown?: MaterialCalculationResult;
}

interface CalculationResult {
  tier1Results: Tier1Results;
  tier2Results: Tier2Results;
  sqft: number;
  inputValues: PaverPatioValues;
  confidence: number;
  calculationDate: string;
}
```

---

## 6. Cache & Real-Time Sync

### ServiceConfigManager (Save Coordination)

**File**: `src/services/ServiceConfigManager.ts`

**Purpose**: Single point of entry for saving configs - guarantees cache clearing

```typescript
// ✅ CORRECT: Always use ServiceConfigManager
await serviceConfigManager.saveServiceConfig(
  'paver_patio_sqft',
  updatedConfig,
  companyId,
  userId
);
// Automatically calls: masterPricingEngine.clearCache(serviceId, companyId)

// ❌ WRONG: Never bypass by calling Supabase directly
await supabase.from('svc_pricing_configs').upsert(...); // Cache won't clear!
```

### Real-Time Synchronization

```typescript
// Quick Calculator subscribes to config changes
masterPricingEngine.subscribeToConfigChanges(
  'paver_patio_sqft',
  companyId,
  (newConfig) => {
    setConfig(newConfig);
    // Automatically recalculates with new config
  }
);

// When admin saves in Services tab:
// 1. ServiceConfigManager.saveServiceConfig() → Supabase
// 2. Supabase triggers real-time event
// 3. All subscribers receive newConfig
// 4. Quick Calculator auto-recalculates
// 5. User sees updated pricing instantly
```

---

## 7. ASCII Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TRADERSPHERE PRICING SYSTEM                        │
└─────────────────────────────────────────────────────────────────────────────┘

                                 USER INTERFACE
┌─────────────────────────────────────────────────────────────────────────────┐
│  InlineQuickCalculator.tsx  │  PaverPatioManager.tsx  │  ExcavationManager │
│         (Container)          │    (UI Component)       │   (UI Component)   │
└──────────────┬───────────────┴──────────────┬──────────┴────────────────────┘
               │                               │
               └──────────────┬────────────────┘
                              │
                              │ Uses Store Hook
                              ↓
                    ┌──────────────────────┐
                    │   SERVICE STORES     │
                    │  (State Management)  │
                    ├──────────────────────┤
                    │ paver-patio-store.ts │
                    │ excavation-store.ts  │
                    └──────────┬───────────┘
                               │
                               │ Calls Calculation Methods
                               ↓
                    ┌──────────────────────────┐
                    │  MASTER PRICING ENGINE   │
                    │   (Calculation Logic)    │
                    ├──────────────────────────┤
                    │ master-pricing-engine.ts │
                    │                          │
                    │ ├─ loadPricingConfig()   │────┐
                    │ ├─ calculatePricing()    │    │
                    │ │   ├─ calculateTier1()  │    │
                    │ │   └─ calculateTier2()  │    │
                    │ └─ subscribeToChanges()  │←───┼─────┐
                    └────────┬─────────────────┘    │     │
                             │                      │     │
                ┌────────────┴──────────┐           │     │
                │                       │           │     │
                ↓                       ↓           │     │
    ┌──────────────────┐    ┌────────────────────┐ │     │
    │ MATERIAL CALCS   │    │   EXCAVATION       │ │     │
    │  (New System)    │    │   INTEGRATION      │ │     │
    ├──────────────────┤    ├────────────────────┤ │     │
    │ materialCalc.ts  │    │ excavation-        │ │     │
    │                  │    │ integration.ts     │ │     │
    │ ├─ volume_depth  │    │                    │ │     │
    │ ├─ area_coverage │    │ ├─ calculateExcav- │ │     │
    │ └─ linear_       │    │ │   ationHours()   │ │     │
    │    perimeter     │    │ └─ calculateExcav- │ │     │
    │                  │    │    ationCost()     │ │     │
    └────────┬─────────┘    └──────────┬─────────┘ │     │
             │                         │           │     │
             └────────────┬────────────┘           │     │
                          │                        │     │
                          │ Query Database         │     │
                          ↓                        │     │
                ┌─────────────────────────────────┐│     │
                │         SUPABASE                ││     │
                ├─────────────────────────────────┤│     │
                │  svc_pricing_configs            ││←────┘
                │  ├─ hourly_labor_rate           ││  Read Config
                │  ├─ profit_margin               ││
                │  ├─ variables_config (JSONB)    ││
                │  └─ ...                         ││
                │                                 ││
                │  svc_material_categories        ││
                │  ├─ category_key                ││
                │  ├─ calculation_method          ││
                │  └─ default_depth_inches        ││
                │                                 ││
                │  svc_materials                  ││
                │  ├─ material_name               ││
                │  ├─ price_per_unit              ││
                │  ├─ coverage_per_unit           ││
                │  ├─ waste_factor_percentage     ││
                │  └─ ...                         ││
                └─────────────────────────────────┘│
                          ↑                        │
                          │                        │
                          │ Save + Clear Cache     │
                          │                        │
                ┌─────────┴─────────────────────┐  │
                │  SERVICE CONFIG MANAGER       │  │
                │  (Save Coordination)          │  │
                ├───────────────────────────────┤  │
                │  ServiceConfigManager.ts      │  │
                │                               │  │
                │  saveServiceConfig()          │──┘
                │  ├─ Upsert to Supabase        │
                │  └─ Clear Master Engine Cache │
                └───────────────────────────────┘

                         REAL-TIME SYNC
┌─────────────────────────────────────────────────────────────────────────────┐
│  Admin Changes Config in Services Tab                                       │
│  ↓                                                                          │
│  ServiceConfigManager.saveServiceConfig()                                   │
│  ↓                                                                          │
│  Supabase Update + Real-Time Event                                          │
│  ↓                                                                          │
│  Master Pricing Engine Real-Time Subscription Fires                         │
│  ↓                                                                          │
│  Store.setConfig(newConfig) + Auto-Recalculate                              │
│  ↓                                                                          │
│  Quick Calculator Shows Updated Pricing Instantly                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Critical Files Reference

### Core Calculation Engine
- `src/pricing-system/core/calculations/master-pricing-engine.ts` - Two-tier pricing engine
- `src/pricing-system/core/calculations/excavation-integration.ts` - Bundled excavation service

### State Management (Stores)
- `src/pricing-system/core/stores/paver-patio-store.ts` - Paver patio state hook
- `src/pricing-system/core/stores/excavation-store.ts` - Excavation state hook

### UI Components (Managers)
- `src/components/services/PaverPatioManager.tsx` - Paver patio UI
- `src/components/services/ExcavationManager.tsx` - Excavation UI
- `src/components/jobs/wizard/components/InlineQuickCalculator.tsx` - Job wizard integration

### Material System
- `src/services/materialCalculations.ts` - Volume/area/linear calculation methods
- `src/services/materialsService.ts` - Material database queries

### Save Coordination
- `src/services/ServiceConfigManager.ts` - Config save + cache invalidation
- `src/pricing-system/core/services-database/service-database.ts` - Service definitions

### Type Definitions
- `src/pricing-system/core/master-formula/formula-types.ts` - All interfaces
- `src/types/materials.ts` - Material system types

---

## Summary: Where Business Logic Lives vs Where Data Lives

| Component | Location | Responsibility |
|-----------|----------|----------------|
| **Formulas (Logic)** | `master-pricing-engine.ts` | Two-tier calculation algorithms |
| **Parameters (Data)** | Supabase `svc_pricing_configs` table | Hourly rates, team sizes, profit margins, variables |
| **Material Specs (Data)** | Supabase `svc_materials` table | Prices, coverage rates, waste factors |
| **Material Logic** | `materialCalculations.ts` | Volume/area/linear calculation methods |
| **State Management** | `paver-patio-store.ts` (hooks) | Config loading, calculation orchestration, real-time sync |
| **UI Rendering** | `PaverPatioManager.tsx` (components) | Input controls, result display, theming |
| **Save Coordination** | `ServiceConfigManager.ts` | Supabase upserts + cache invalidation |
| **Service Integration** | `excavation-integration.ts` | Bundled service calculations (excavation hours/costs) |

---

## What Makes It Smart

1. **Real-time Updates**: Admin changes prices in Services tab → Quick Calculator automatically gets new prices without refresh
2. **Database-Driven**: All pricing variables stored in database, not hardcoded
3. **Material Intelligence**: Calculates exact cubic yards of base rock, accounts for waste (10%), accounts for compaction (20%)
4. **Service Bundling**: Excavation automatically included if checked, adds hours AND costs
5. **Cache Performance**: Loads pricing rules once, reuses them for all calculations until admin updates
6. **Type Safety**: Full TypeScript interfaces throughout the system
7. **Separation of Concerns**: Stores manage state, Managers render UI, Engine calculates, Database persists

---

**Last Updated**: October 25, 2025
**Maintained By**: TradeSphere Development Team
