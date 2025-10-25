# Custom Service Creation Wizard - Part 2

**This document continues from [CUSTOM-SERVICE-WIZARD-PLAN.md](CUSTOM-SERVICE-WIZARD-PLAN.md)**

---

## Step 5: Design Variables (Tier 1 & 2 Adjustments) - CONTINUED

### Variable Option Builder

```tsx
const VariableOptionBuilder: React.FC<{
  effectType: EffectType;
  options: Record<string, VariableOption>;
  onChange: (options: Record<string, VariableOption>) => void;
}> = ({ effectType, options, onChange }) => {

  const [optionsList, setOptionsList] = useState(Object.entries(options));

  const addOption = () => {
    const newKey = `option_${Object.keys(options).length + 1}`;
    const newOption: VariableOption = {
      label: '',
      value: 0
    };

    // Add conditional fields based on effect type
    if (effectType === 'cutting_complexity') {
      newOption.laborPercentage = 0;
      newOption.materialWaste = 0;
    } else if (effectType === 'daily_equipment_cost' || effectType === 'flat_additional_cost') {
      newOption.dollarAmount = 0;
    } else {
      newOption.multiplier = 1.0;
    }

    onChange({ ...options, [newKey]: newOption });
  };

  const updateOption = (key: string, field: string, value: any) => {
    const updated = { ...options };
    updated[key] = { ...updated[key], [field]: value };

    // Auto-calculate multiplier for percentage-based effects
    if (field === 'value' && !['cutting_complexity', 'daily_equipment_cost', 'flat_additional_cost'].includes(effectType)) {
      updated[key].multiplier = 1 + (parseFloat(value) / 100);
    }

    onChange(updated);
  };

  const removeOption = (key: string) => {
    const updated = { ...options };
    delete updated[key];
    onChange(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium">Variable Options</label>
        <button onClick={addOption} className="text-sm text-blue-600 hover:text-blue-800">
          + Add Option
        </button>
      </div>

      <div className="space-y-3">
        {Object.entries(options).map(([key, option]) => (
          <div key={key} className="border rounded p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <input
                type="text"
                placeholder="Option label (e.g., 'Standard Access')"
                value={option.label}
                onChange={(e) => updateOption(key, 'label', e.target.value)}
                className="flex-1 mr-2"
              />
              <button
                onClick={() => removeOption(key)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Remove
              </button>
            </div>

            {/* Conditional fields based on effect type */}
            {effectType === 'cutting_complexity' ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-600">Labor Time %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={option.laborPercentage || 0}
                    onChange={(e) => updateOption(key, 'laborPercentage', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Material Waste %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={option.materialWaste || 0}
                    onChange={(e) => updateOption(key, 'materialWaste', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            ) : effectType === 'daily_equipment_cost' || effectType === 'flat_additional_cost' ? (
              <div>
                <label className="text-xs text-gray-600">
                  {effectType === 'daily_equipment_cost' ? 'Cost per Day ($)' : 'One-Time Cost ($)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={option.dollarAmount || 0}
                  onChange={(e) => updateOption(key, 'dollarAmount', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-600">Percentage Value</label>
                  <input
                    type="number"
                    step="0.1"
                    value={option.value}
                    onChange={(e) => updateOption(key, 'value', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Multiplier (Auto)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={option.multiplier || 1.0}
                    readOnly
                    className="w-full bg-gray-100"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Step 5 Main Component

```tsx
const Step5DesignVariables: React.FC = () => {
  const { state, setState } = useWizardContext();
  const [categories, setCategories] = useState<VariableCategory[]>([
    { categoryKey: 'design', label: 'Design Factors', description: '', variables: [] },
    { categoryKey: 'site', label: 'Site Conditions', description: '', variables: [] },
    { categoryKey: 'project', label: 'Project Complexity', description: '', variables: [] }
  ]);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [editingVariable, setEditingVariable] = useState<VariableDefinition | null>(null);

  const currentCategory = categories[selectedCategoryIndex];

  const addVariable = () => {
    setEditingVariable({
      variableKey: '',
      type: 'select',
      label: '',
      description: '',
      effectType: 'labor_time_percentage',
      calculationTier: 1,
      default: '',
      options: {}
    });
  };

  const saveVariable = () => {
    if (!editingVariable) return;

    const updatedCategories = [...categories];
    updatedCategories[selectedCategoryIndex].variables.push(editingVariable);
    setCategories(updatedCategories);
    setEditingVariable(null);
  };

  const removeVariable = (variableKey: string) => {
    const updatedCategories = [...categories];
    updatedCategories[selectedCategoryIndex].variables = updatedCategories[selectedCategoryIndex].variables.filter(
      v => v.variableKey !== variableKey
    );
    setCategories(updatedCategories);
  };

  // Convert categories to variables_config JSONB format
  const generateVariablesConfig = () => {
    const config: any = {
      formulaType: 'two_tier',
      formulaDescription: 'Tier 1: Calculate labor hours | Tier 2: Calculate costs with complexity and profit'
    };

    categories.forEach(category => {
      config[category.categoryKey] = {
        label: category.label,
        description: category.description
      };

      category.variables.forEach(variable => {
        config[category.categoryKey][variable.variableKey] = {
          type: variable.type,
          label: variable.label,
          description: variable.description,
          effectType: variable.effectType,
          calculationTier: variable.calculationTier,
          default: variable.default,
          options: variable.options
        };
      });
    });

    return config;
  };

  const handleNext = () => {
    const variablesConfig = generateVariablesConfig();
    setState(prev => ({
      ...prev,
      variables_config: variablesConfig,
      current_step: 6
    }));
  };

  return (
    <div className="wizard-step">
      <h2>Step 5: Design Variables</h2>
      <p className="text-sm text-gray-600 mb-4">
        Create qualifying questions that adjust labor time (Tier 1) and material/project costs (Tier 2).
      </p>

      {/* Category Tabs */}
      <div className="tabs mb-6">
        {categories.map((cat, index) => (
          <button
            key={cat.categoryKey}
            onClick={() => setSelectedCategoryIndex(index)}
            className={selectedCategoryIndex === index ? 'active' : ''}
          >
            {cat.label}
            {cat.variables.length > 0 && (
              <span className="badge">{cat.variables.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Variable List */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{currentCategory.label}</h3>
          <button onClick={addVariable} className="btn-primary">
            + Add Variable
          </button>
        </div>

        <div className="space-y-3">
          {currentCategory.variables.map(variable => (
            <div key={variable.variableKey} className="border rounded p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold">{variable.label}</div>
                  <div className="text-sm text-gray-600">{variable.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${variable.calculationTier === 1 ? 'bg-blue-100' : variable.calculationTier === 2 ? 'bg-green-100' : 'bg-purple-100'}`}>
                    Tier {variable.calculationTier}
                  </span>
                  <button
                    onClick={() => removeVariable(variable.variableKey)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Effect Type: {variable.effectType} | Options: {Object.keys(variable.options).length}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Variable Editor Modal */}
      {editingVariable && (
        <Modal onClose={() => setEditingVariable(null)}>
          <h3 className="text-lg font-semibold mb-4">Create Variable</h3>

          <div className="space-y-4">
            <FormField label="Variable Key" required>
              <input
                type="text"
                value={editingVariable.variableKey}
                onChange={(e) => setEditingVariable(prev => ({ ...prev!, variableKey: e.target.value }))}
                placeholder="e.g., access_difficulty"
              />
              <HelpText>Internal identifier (lowercase, underscores)</HelpText>
            </FormField>

            <FormField label="Variable Label" required>
              <input
                type="text"
                value={editingVariable.label}
                onChange={(e) => setEditingVariable(prev => ({ ...prev!, label: e.target.value }))}
                placeholder="e.g., Access Difficulty"
              />
              <HelpText>Display name for users</HelpText>
            </FormField>

            <FormField label="Description" required>
              <textarea
                value={editingVariable.description}
                onChange={(e) => setEditingVariable(prev => ({ ...prev!, description: e.target.value }))}
                placeholder="Explain how this affects the project..."
                rows={2}
              />
            </FormField>

            <EffectTypeSelector
              value={editingVariable.effectType}
              onChange={(type) => {
                // Auto-set tier based on effect type
                let tier: 1 | 2 | 'both' = 1;
                if (['material_cost_multiplier', 'total_project_multiplier', 'daily_equipment_cost', 'flat_additional_cost'].includes(type)) {
                  tier = 2;
                } else if (type === 'cutting_complexity') {
                  tier = 'both';
                }

                setEditingVariable(prev => ({
                  ...prev!,
                  effectType: type,
                  calculationTier: tier
                }));
              }}
            />

            <VariableOptionBuilder
              effectType={editingVariable.effectType}
              options={editingVariable.options}
              onChange={(options) => setEditingVariable(prev => ({ ...prev!, options }))}
            />

            <FormField label="Default Selection" required>
              <select
                value={editingVariable.default}
                onChange={(e) => setEditingVariable(prev => ({ ...prev!, default: e.target.value }))}
              >
                <option value="">Select default option...</option>
                {Object.entries(editingVariable.options).map(([key, option]) => (
                  <option key={key} value={key}>{option.label}</option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button onClick={() => setEditingVariable(null)} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={saveVariable}
              className="btn-primary"
              disabled={!editingVariable.variableKey || !editingVariable.label || Object.keys(editingVariable.options).length === 0}
            >
              Save Variable
            </button>
          </div>
        </Modal>
      )}

      <WizardNavigation
        onBack={() => setState(prev => ({ ...prev, current_step: 4 }))}
        onNext={handleNext}
        canProceed={categories.some(cat => cat.variables.length > 0)}
      />
    </div>
  );
};
```

---

## Step 6: Set Default Values

**Purpose**: Pre-populate Quick Calculator fields with recommended starting values

**UI Pattern**: Display all variables with default selection highlighted

```tsx
const Step6SetDefaults: React.FC = () => {
  const { state, setState } = useWizardContext();
  const [defaultVariables, setDefaultVariables] = useState<Record<string, Record<string, string>>>({});

  // Parse variables_config to extract categories and variables
  const variablesConfig = state.variables_config;
  const categories = Object.entries(variablesConfig).filter(([key]) =>
    !['formulaType', 'formulaDescription'].includes(key)
  );

  useEffect(() => {
    // Initialize defaults from variables_config
    const initialDefaults: Record<string, Record<string, string>> = {};

    categories.forEach(([categoryKey, categoryData]: [string, any]) => {
      initialDefaults[categoryKey] = {};

      Object.entries(categoryData).forEach(([varKey, varData]: [string, any]) => {
        if (varData.type === 'select' && varData.default) {
          initialDefaults[categoryKey][varKey] = varData.default;
        }
      });
    });

    setDefaultVariables(initialDefaults);
  }, []);

  const updateDefault = (categoryKey: string, variableKey: string, value: string) => {
    setDefaultVariables(prev => ({
      ...prev,
      [categoryKey]: {
        ...(prev[categoryKey] || {}),
        [variableKey]: value
      }
    }));
  };

  const handleNext = () => {
    setState(prev => ({
      ...prev,
      default_variables: defaultVariables,
      current_step: 7
    }));
  };

  return (
    <div className="wizard-step">
      <h2>Step 6: Set Default Values</h2>
      <p className="text-sm text-gray-600 mb-4">
        Choose the default option for each variable. These will pre-populate the Quick Calculator
        for faster quoting on typical projects.
      </p>

      <div className="space-y-6">
        {categories.map(([categoryKey, categoryData]: [string, any]) => (
          <div key={categoryKey} className="border rounded-lg p-4 bg-white">
            <h3 className="font-semibold mb-4">{categoryData.label}</h3>

            <div className="space-y-4">
              {Object.entries(categoryData).filter(([key]) => !['label', 'description'].includes(key)).map(([varKey, varData]: [string, any]) => (
                <div key={varKey}>
                  <label className="block text-sm font-medium mb-2">
                    {varData.label}
                    <span className={`ml-2 text-xs ${varData.calculationTier === 1 ? 'text-blue-600' : varData.calculationTier === 2 ? 'text-green-600' : 'text-purple-600'}`}>
                      (Tier {varData.calculationTier})
                    </span>
                  </label>
                  <p className="text-xs text-gray-600 mb-2">{varData.description}</p>

                  <select
                    value={defaultVariables[categoryKey]?.[varKey] || ''}
                    onChange={(e) => updateDefault(categoryKey, varKey, e.target.value)}
                    className="w-full"
                  >
                    {Object.entries(varData.options).map(([optKey, optData]: [string, any]) => (
                      <option key={optKey} value={optKey}>
                        {optData.label}
                        {varData.effectType === 'cutting_complexity' && ` (${optData.laborPercentage}% labor, ${optData.materialWaste}% waste)`}
                        {['labor_time_percentage', 'material_cost_multiplier', 'total_project_multiplier'].includes(varData.effectType) && ` (${optData.value > 0 ? '+' : ''}${optData.value}%)`}
                        {['daily_equipment_cost', 'flat_additional_cost'].includes(varData.effectType) && ` ($${optData.dollarAmount})`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <div className="font-semibold text-sm text-yellow-800">Tip: Choose Realistic Defaults</div>
            <div className="text-sm text-yellow-700">
              Select the most common scenario for your typical projects. Users can always change these
              during quoting, but good defaults speed up the process.
            </div>
          </div>
        </div>
      </div>

      <WizardNavigation
        onBack={() => setState(prev => ({ ...prev, current_step: 5 }))}
        onNext={handleNext}
        canProceed={true}
      />
    </div>
  );
};
```

---

## Step 7: Validate with Test Calculations

**Purpose**: Run full pricing preview with sample inputs to verify formula correctness

**Validation Checks**:
1. **No Division by Zero**: Ensure all denominators are non-zero
2. **Tier Separation**: Verify Tier 1 variables don't affect Tier 2 and vice versa
3. **Material Coverage**: Confirm materials calculate realistic quantities
4. **Profit Inclusion**: Verify pass-through costs excluded from profit calculation
5. **Total Price Sanity**: Check final price is reasonable for test project size

```tsx
const Step7ValidateCalculations: React.FC = () => {
  const { state, setState } = useWizardContext();
  const [testInputs, setTestInputs] = useState({
    project_size: 100,
    selected_materials: {} as Record<string, string>,  // category_key -> material_id
    selected_variables: state.default_variables
  });
  const [calculationResult, setCalculationResult] = useState<PricingResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Run test calculation
  const runTestCalculation = async () => {
    setIsCalculating(true);
    setValidationErrors([]);

    try {
      // 1. Validate inputs
      const errors: string[] = [];

      if (testInputs.project_size <= 0) {
        errors.push('Project size must be greater than 0');
      }

      if (state.base_productivity <= 0) {
        errors.push('Base productivity cannot be 0 (division by zero risk)');
      }

      // Check all required material categories have selections
      const requiredCategories = state.material_categories.filter(cat => cat.is_required);
      requiredCategories.forEach(cat => {
        if (!testInputs.selected_materials[cat.category_key]) {
          errors.push(`Missing required material selection for: ${cat.category_label}`);
        }
      });

      if (errors.length > 0) {
        setValidationErrors(errors);
        setIsCalculating(false);
        return;
      }

      // 2. Build service config object
      const testServiceConfig = {
        service_id: state.service_id,
        service_name: state.service_name,
        hourly_labor_rate: state.hourly_labor_rate,
        optimal_team_size: state.optimal_team_size,
        base_productivity: state.base_productivity,
        profit_margin: state.profit_margin,
        variables_config: state.variables_config,
        material_categories: state.material_categories,
        materials: Object.values(state.materials_by_category).flat()
      };

      // 3. Call pricing calculation (using masterPricingEngine pattern)
      const result = await calculateCustomServicePrice(
        testServiceConfig,
        testInputs.project_size,
        testInputs.selected_materials,
        testInputs.selected_variables
      );

      setCalculationResult(result);

      // 4. Validate result integrity
      validateCalculationResult(result, errors);

      if (errors.length > 0) {
        setValidationErrors(errors);
      }

    } catch (error) {
      setValidationErrors([`Calculation error: ${error.message}`]);
    } finally {
      setIsCalculating(false);
    }
  };

  const validateCalculationResult = (result: PricingResult, errors: string[]) => {
    // Check for NaN or Infinity
    if (!isFinite(result.tier1.total_labor_hours)) {
      errors.push('Tier 1 calculation produced invalid labor hours (NaN or Infinity)');
    }

    if (!isFinite(result.tier2.total_price)) {
      errors.push('Tier 2 calculation produced invalid total price (NaN or Infinity)');
    }

    // Sanity check: total price should be > 0
    if (result.tier2.total_price <= 0) {
      errors.push('Total price is $0 or negative - check formula configuration');
    }

    // Sanity check: profit should only apply to labor + materials, NOT pass-through costs
    const profitableSubtotal = result.tier2.labor_cost + result.tier2.materials_subtotal;
    const expectedProfit = profitableSubtotal * state.profit_margin;
    const actualProfit = result.tier2.profit_amount;

    if (Math.abs(expectedProfit - actualProfit) > 0.01) {
      errors.push(`Profit calculation error: Expected $${expectedProfit.toFixed(2)}, got $${actualProfit.toFixed(2)}`);
    }

    // Check material quantities are reasonable
    Object.entries(result.materials_breakdown).forEach(([category, breakdown]: [string, any]) => {
      if (breakdown.quantity_needed < 0) {
        errors.push(`Negative material quantity for ${category}`);
      }

      if (breakdown.quantity_needed > testInputs.project_size * 100) {
        errors.push(`Unrealistic material quantity for ${category} (${breakdown.quantity_needed} units for ${testInputs.project_size} project size)`);
      }
    });
  };

  const handleFinalize = async () => {
    if (validationErrors.length > 0) {
      alert('Please fix validation errors before finalizing');
      return;
    }

    // Save service to database
    setState(prev => ({ ...prev, is_saving: true }));

    try {
      const { data, error } = await supabase.rpc('create_custom_service', {
        p_company_id: user.company_id,
        p_service_config: {
          service_name: state.service_name,
          hourly_labor_rate: state.hourly_labor_rate,
          optimal_team_size: state.optimal_team_size,
          base_productivity: state.base_productivity,
          profit_margin: state.profit_margin,
          variables_config: state.variables_config,
          default_variables: state.default_variables,
          is_active: true,
          category: state.category
        },
        p_material_categories: state.material_categories,
        p_materials: Object.values(state.materials_by_category).flat()
      });

      if (error) throw error;

      // Clear cache
      await masterPricingEngine.clearServiceCache(data.service_id, user.company_id);

      // Close wizard
      onWizardComplete(data.service_id);

    } catch (error) {
      alert(`Failed to save service: ${error.message}`);
    } finally {
      setState(prev => ({ ...prev, is_saving: false }));
    }
  };

  return (
    <div className="wizard-step">
      <h2>Step 7: Validate with Test Calculation</h2>
      <p className="text-sm text-gray-600 mb-4">
        Run a sample calculation to verify your service formula works correctly.
      </p>

      {/* Test Inputs */}
      <div className="border rounded-lg p-4 bg-white mb-6">
        <h3 className="font-semibold mb-4">Test Project Inputs</h3>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Project Size" required>
            <div className="input-group">
              <input
                type="number"
                value={testInputs.project_size}
                onChange={(e) => setTestInputs(prev => ({ ...prev, project_size: parseFloat(e.target.value) }))}
              />
              <span className="suffix">{state.productivity_unit.split('/')[0]}</span>
            </div>
          </FormField>
        </div>

        {/* Material Selections */}
        <div className="mt-4">
          <h4 className="font-semibold text-sm mb-2">Material Selections</h4>
          {state.material_categories.map(category => (
            <FormField key={category.id} label={category.category_label}>
              <select
                value={testInputs.selected_materials[category.category_key] || ''}
                onChange={(e) => setTestInputs(prev => ({
                  ...prev,
                  selected_materials: {
                    ...prev.selected_materials,
                    [category.category_key]: e.target.value
                  }
                }))}
              >
                <option value="">Select {category.category_label}...</option>
                {state.materials_by_category[category.category_key]?.map(material => (
                  <option key={material.id} value={material.id}>
                    {material.material_name} (${material.price_per_unit}/{material.unit_type})
                  </option>
                ))}
              </select>
            </FormField>
          ))}
        </div>

        <button
          onClick={runTestCalculation}
          disabled={isCalculating}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isCalculating ? 'Calculating...' : 'Run Test Calculation'}
        </button>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
          <div className="font-semibold text-red-800 mb-2">Validation Errors:</div>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Calculation Result */}
      {calculationResult && (
        <div className="border rounded-lg p-4 bg-green-50 mb-6">
          <h3 className="font-semibold mb-4 text-green-800">Test Calculation Result ✓</h3>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white p-3 rounded">
              <div className="text-xs text-gray-600">Project Size</div>
              <div className="text-lg font-bold">{testInputs.project_size} {state.productivity_unit.split('/')[0]}</div>
            </div>
            <div className="bg-white p-3 rounded">
              <div className="text-xs text-gray-600">Labor Hours</div>
              <div className="text-lg font-bold">{calculationResult.tier1.total_labor_hours.toFixed(1)} hrs</div>
            </div>
            <div className="bg-white p-3 rounded">
              <div className="text-xs text-gray-600">Total Price</div>
              <div className="text-lg font-bold text-green-600">${calculationResult.tier2.total_price.toFixed(2)}</div>
            </div>
          </div>

          {/* Tier 1 Breakdown */}
          <div className="bg-white p-4 rounded mb-3">
            <h4 className="font-semibold text-sm mb-2 text-blue-600">Tier 1: Labor Calculation</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Base Days:</span>
                <span>{(testInputs.project_size / state.base_productivity).toFixed(2)} days</span>
              </div>
              <div className="flex justify-between">
                <span>Base Hours:</span>
                <span>{calculationResult.tier1.base_labor_hours.toFixed(1)} hrs</span>
              </div>
              {calculationResult.tier1.adjustments.map((adj: any, i: number) => (
                <div key={i} className="flex justify-between text-gray-600">
                  <span>{adj.label}:</span>
                  <span>{adj.adjustment > 0 ? '+' : ''}{adj.adjustment.toFixed(1)} hrs</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                <span>Total Labor Hours:</span>
                <span>{calculationResult.tier1.total_labor_hours.toFixed(1)} hrs</span>
              </div>
            </div>
          </div>

          {/* Tier 2 Breakdown */}
          <div className="bg-white p-4 rounded">
            <h4 className="font-semibold text-sm mb-2 text-green-600">Tier 2: Cost Calculation</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Labor Cost:</span>
                <span>${calculationResult.tier2.labor_cost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Materials Subtotal:</span>
                <span>${calculationResult.tier2.materials_subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-blue-600">
                <span>Profit ({(state.profit_margin * 100).toFixed(0)}%):</span>
                <span>+${calculationResult.tier2.profit_amount.toFixed(2)}</span>
              </div>
              {calculationResult.tier2.pass_through_costs > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Pass-Through Costs:</span>
                  <span>+${calculationResult.tier2.pass_through_costs.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-1 mt-1 text-green-600">
                <span>Total Price:</span>
                <span>${calculationResult.tier2.total_price.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <WizardNavigation
        onBack={() => setState(prev => ({ ...prev, current_step: 6 }))}
        onFinalize={handleFinalize}
        canProceed={calculationResult !== null && validationErrors.length === 0}
        finalizeLabel="Create Service"
      />
    </div>
  );
};
```

---

**[Document continues in next section with Material System Integration, AI Chat Integration, Edge Cases, Testing, and Deployment...]**
