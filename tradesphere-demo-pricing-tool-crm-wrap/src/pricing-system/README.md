# TradeSphere Pricing System

Complete AI-powered pricing calculation system for outdoor landscaping services.

## 🏗️ Architecture Overview

The pricing system is organized into logical modules that handle the complete flow from customer input to final pricing:

```
src/pricing-system/
├── core/                          # Core business logic
│   ├── master-formula/            # Pricing calculation engine
│   ├── services-database/         # Service configurations & defaults
│   └── stores/                    # React state management
│
├── ai-engine/                     # AI processing pipeline
│   ├── parameter-collection/      # Extract variables from user input
│   ├── text-processing/           # Natural language parsing
│   └── pricing-calculation/       # Server-side pricing logic
│
├── interfaces/                    # User interfaces
│   ├── quick-calculator/          # Direct input interface
│   └── ai-chat/                   # Conversational interface
│
├── config/                        # Configuration files
├── utils/                         # Shared utilities
│   ├── calculations/              # Mathematical utilities
│   ├── validation/                # Input validation
│   └── helpers/                   # General utilities
│
└── index.ts                       # Main export module
```

## 🎯 Core Components

### Master Formula Engine (`core/master-formula/`)
- **formula-types.ts**: TypeScript interfaces for all pricing data structures
- **calculation-engine.ts**: Core pricing calculation logic
- **paver-patio-formula.ts**: Specialized paver patio calculations

### Services Database (`core/services-database/`)
- **service-database.ts**: Single source of truth for service configurations
- **baseline-values.ts**: Default variable values (admin configurable)
- **service-types.ts**: Service data structure definitions

### AI Processing Pipeline (`ai-engine/`)
1. **Text Processing**: Parses natural language input
2. **Parameter Collection**: Extracts pricing variables
3. **Pricing Calculation**: Applies master formula with Services database defaults

## 🔄 Data Flow

```
User Input → AI Processing → Parameter Collection → Services Database Defaults → Master Formula → Pricing Result
```

### Quick Calculator Flow
```
Manual Input → React Store → Services Database Baseline → Master Formula → $2,716.80
```

### AI Chat Flow
```
"360 sqft paver patio" → Text Processing → Variable Extraction → Services Database Fallback → Master Formula → $2,716.80
```

## 🛠️ Key Features

### Single Source of Truth
- **Services Database**: All baseline values centralized
- **Admin Configurable**: Business owners can adjust defaults
- **Consistency Guaranteed**: Both interfaces use identical calculations

### AI Intelligence
- **Natural Language**: Conversational pricing requests
- **Smart Extraction**: Automatically detects project details
- **Fallback Logic**: Services database when extraction incomplete

### Master Formula
- **Tier 1**: Labor time calculations (excavation, installation, cleanup)
- **Tier 2**: Cost calculations (materials, labor costs, markup)
- **Expert Variables**: 15+ factors (complexity, access, team size, etc.)

## 📋 Usage Examples

### Import Core Components
```typescript
import { 
  usePaverPatioStore, 
  ParameterCollectorService, 
  PricingCalculatorService,
  getPaverPatioServiceDefaults 
} from './pricing-system';
```

### Use Quick Calculator
```typescript
const store = usePaverPatioStore();
store.resetToDefaults100(); // Uses Services database defaults
// Result: 360 sqft → $2,716.80
```

### Process AI Chat Request
```typescript
const result = await ParameterCollectorService.collectParametersWithSplitServices(
  "I need a 360 sqft paver patio",
  splitResult
);
// Automatically applies Services database defaults
// Result: Ready for pricing calculation
```

## 🔧 Configuration

### Services Database Defaults
```typescript
// Located in: core/services-database/service-database.ts
defaultVariables: {
  excavation: { tearoutComplexity: 'grass', equipmentRequired: 'handTools' },
  siteAccess: { accessDifficulty: 'easy', obstacleRemoval: 'none' },
  materials: { paverStyle: 'economy', cuttingComplexity: 'minimal' },
  labor: { teamSize: 'threePlus' },
  complexity: { overallComplexity: 1.0 }
}
```

### Master Formula Configuration
```json
// Located in: config/paver-patio-formula.json
{
  "variables": {
    "excavation": { "tearoutComplexity": { "default": "grass" } },
    "labor": { "teamSize": { "default": "threePlus" } }
  }
}
```

## 🎯 Business Value

1. **Accuracy**: Master formula based on real-world labor data
2. **Consistency**: Eliminates discrepancies between interfaces
3. **Scalability**: Easy expansion to new services and markets
4. **Control**: Admin-configurable business rules and defaults
5. **Intelligence**: AI-powered natural language processing

## 🧪 Testing

The pricing system ensures 360 sqft paver patio consistently produces **$2,716.80** across:
- Quick Calculator (manual input)
- AI Chat (natural language)
- Server-side calculations (Netlify functions)

This consistency is achieved through the Services database integration that provides identical baseline values to all calculation paths.