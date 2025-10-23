/**
 * validateVariablesConfig - JSONB Validation Utility
 *
 * Validates that a variables_config JSONB structure follows the required format
 * for service-specific modals to render correctly.
 *
 * Required Structure:
 * {
 *   "categoryName": {
 *     "label": "Category Display Name",      // Required
 *     "description": "Category desc",         // Optional
 *     "variableName": {
 *       "type": "number|select|slider",       // Required
 *       "label": "Display Label",             // Required
 *       "description": "Help text",           // Optional
 *       "default": value,                     // Required
 *       "adminEditable": true|false,          // Optional (defaults to true)
 *       // Type-specific fields...
 *     }
 *   }
 * }
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateVariablesConfig(config: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check: Must be an object
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    errors.push('variables_config must be a valid object');
    return { valid: false, errors, warnings };
  }

  // Check: Must have at least one category
  const categories = Object.keys(config);
  if (categories.length === 0) {
    errors.push('variables_config must have at least one category');
    return { valid: false, errors, warnings };
  }

  // Validate each category
  for (const [categoryKey, categoryConfig] of Object.entries(config)) {
    if (!categoryConfig || typeof categoryConfig !== 'object') {
      errors.push(`Category '${categoryKey}' must be a valid object`);
      continue;
    }

    const category = categoryConfig as any;

    // Check: Category must have label
    if (!category.label || typeof category.label !== 'string') {
      errors.push(`Category '${categoryKey}' missing required 'label' field`);
    }

    // Warning: Category should have description
    if (!category.description) {
      warnings.push(`Category '${categoryKey}' missing optional 'description' field`);
    }

    // Validate each variable in category
    const variables = Object.entries(category).filter(
      ([key]) => !['label', 'description'].includes(key)
    );

    if (variables.length === 0) {
      warnings.push(`Category '${categoryKey}' has no variables defined`);
    }

    for (const [varKey, varConfig] of variables) {
      if (!varConfig || typeof varConfig !== 'object') {
        errors.push(`Variable '${categoryKey}.${varKey}' must be a valid object`);
        continue;
      }

      const variable = varConfig as any;
      const varPath = `${categoryKey}.${varKey}`;

      // Check: Must have type
      if (!variable.type) {
        errors.push(`Variable '${varPath}' missing required 'type' field`);
      } else if (!['number', 'select', 'slider'].includes(variable.type)) {
        errors.push(`Variable '${varPath}' has invalid type '${variable.type}'. Must be 'number', 'select', or 'slider'`);
      }

      // Check: Must have label
      if (!variable.label || typeof variable.label !== 'string') {
        errors.push(`Variable '${varPath}' missing required 'label' field`);
      }

      // Check: Must have default value
      if (variable.default === undefined) {
        errors.push(`Variable '${varPath}' missing required 'default' field`);
      }

      // Warning: Should have description
      if (!variable.description) {
        warnings.push(`Variable '${varPath}' missing optional 'description' field (recommended for user clarity)`);
      }

      // Type-specific validation
      if (variable.type === 'number' || variable.type === 'slider') {
        // Check: Must have min
        if (variable.min === undefined) {
          errors.push(`Variable '${varPath}' of type '${variable.type}' missing required 'min' field`);
        }

        // Check: Must have max
        if (variable.max === undefined) {
          errors.push(`Variable '${varPath}' of type '${variable.type}' missing required 'max' field`);
        }

        // Validate: min < max
        if (variable.min !== undefined && variable.max !== undefined && variable.min >= variable.max) {
          errors.push(`Variable '${varPath}' has min (${variable.min}) >= max (${variable.max})`);
        }

        // Validate: default is within range
        if (
          variable.default !== undefined &&
          variable.min !== undefined &&
          variable.max !== undefined
        ) {
          if (variable.default < variable.min || variable.default > variable.max) {
            errors.push(
              `Variable '${varPath}' default value (${variable.default}) is outside range [${variable.min}, ${variable.max}]`
            );
          }
        }

        // Warning: Recommend unit for clarity
        if (!variable.unit) {
          warnings.push(`Variable '${varPath}' missing optional 'unit' field (recommended for user clarity)`);
        }
      }

      if (variable.type === 'select') {
        // Check: Must have options
        if (!variable.options || typeof variable.options !== 'object') {
          errors.push(`Variable '${varPath}' of type 'select' missing required 'options' field`);
        } else {
          const optionKeys = Object.keys(variable.options);

          // Check: Options must not be empty
          if (optionKeys.length === 0) {
            errors.push(`Variable '${varPath}' has empty 'options' object`);
          }

          // Validate each option
          for (const [optionKey, optionConfig] of Object.entries(variable.options)) {
            if (!optionConfig || typeof optionConfig !== 'object') {
              errors.push(`Option '${varPath}.options.${optionKey}' must be a valid object`);
              continue;
            }

            const option = optionConfig as any;

            // Check: Option must have label
            if (!option.label || typeof option.label !== 'string') {
              errors.push(`Option '${varPath}.options.${optionKey}' missing required 'label' field`);
            }

            // Check: Option must have value
            if (option.value === undefined) {
              errors.push(`Option '${varPath}.options.${optionKey}' missing required 'value' field`);
            }
          }

          // Validate: default is a valid option key
          if (variable.default !== undefined && !optionKeys.includes(variable.default)) {
            errors.push(
              `Variable '${varPath}' default value '${variable.default}' is not a valid option key. Valid options: [${optionKeys.join(', ')}]`
            );
          }
        }
      }

      // Check adminEditable is boolean if present
      if (variable.adminEditable !== undefined && typeof variable.adminEditable !== 'boolean') {
        errors.push(`Variable '${varPath}' has invalid 'adminEditable' value. Must be boolean.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * formatValidationResult - Pretty print validation results
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push('✅ Validation passed!');
  } else {
    lines.push('❌ Validation failed!');
  }

  if (result.errors.length > 0) {
    lines.push('\nErrors:');
    result.errors.forEach(error => lines.push(`  • ${error}`));
  }

  if (result.warnings.length > 0) {
    lines.push('\nWarnings:');
    result.warnings.forEach(warning => lines.push(`  ⚠ ${warning}`));
  }

  return lines.join('\n');
}
