/**
 * serviceTemplates - Pre-built variables_config JSONB Templates
 *
 * These templates provide standardized starting points for creating new services.
 * Each template follows the validated JSONB structure and can be customized.
 *
 * Usage:
 * 1. Select a template that matches your service type
 * 2. Customize variable names, labels, and default values
 * 3. Validate using validateVariablesConfig()
 * 4. Insert into service_pricing_configs table
 */

/**
 * VOLUME_BASED Template
 *
 * For services that calculate based on cubic volume (excavation, fill, etc.)
 * Includes: depth settings, waste/compaction factors, rounding rules
 */
export const VOLUME_BASED_TEMPLATE = {
  calculationSettings: {
    label: 'Calculation Settings',
    description: 'Core calculation parameters for volume-based services',

    defaultDepth: {
      type: 'number',
      label: 'Default Depth',
      description: 'Standard depth for most jobs',
      default: 12,
      min: 1,
      max: 36,
      unit: 'inches',
      adminEditable: true,
    },

    wasteFactor: {
      type: 'number',
      label: 'Waste Factor',
      description: 'Additional material to account for settling and spillage',
      default: 10,
      min: 0,
      max: 50,
      unit: '%',
      adminEditable: true,
    },

    compactionFactor: {
      type: 'number',
      label: 'Compaction Factor',
      description: 'Soil compaction percentage for volume calculations',
      default: 0,
      min: 0,
      max: 50,
      unit: '%',
      adminEditable: true,
    },

    roundingRule: {
      type: 'select',
      label: 'Volume Rounding',
      description: 'How to round final volume calculation',
      default: 'up_whole',
      options: {
        up_whole: { label: 'Round up to nearest whole unit', value: 0 },
        up_half: { label: 'Round up to nearest 0.5 unit', value: 0 },
        exact: { label: 'Use exact calculation', value: 0 },
      },
      adminEditable: true,
    },
  },
};

/**
 * AREA_COMPLEXITY Template
 *
 * For services with area-based pricing and complexity factors (paver patios, decks, etc.)
 * Includes: materials, labor, excavation, site access, complexity
 */
export const AREA_COMPLEXITY_TEMPLATE = {
  excavation: {
    label: 'Excavation & Site Prep',
    description: 'Tearout and equipment variables',

    tearoutComplexity: {
      type: 'select',
      label: 'Tearout Complexity',
      description: 'Difficulty of removing existing surface',
      default: 'grass',
      options: {
        grass: { label: 'Grass (Easy)', value: 0 },
        concrete: { label: 'Concrete (Hard)', value: 20 },
        asphalt: { label: 'Asphalt (Hard)', value: 30 },
      },
      adminEditable: true,
    },

    equipmentRequired: {
      type: 'select',
      label: 'Equipment Required',
      description: 'Equipment needed for the job',
      default: 'handTools',
      options: {
        handTools: { label: 'Hand Tools Only', value: 0 },
        lightMachinery: { label: 'Light Machinery', value: 250 },
        heavyMachinery: { label: 'Heavy Machinery', value: 500 },
      },
      adminEditable: true,
    },
  },

  materials: {
    label: 'Material Settings',
    description: 'Material quality and complexity factors',

    materialGrade: {
      type: 'select',
      label: 'Material Grade',
      description: 'Quality level of materials',
      default: 'standard',
      options: {
        standard: { label: 'Standard Grade', value: 0 },
        premium: { label: 'Premium Grade', value: 20 },
      },
      adminEditable: true,
    },

    cuttingComplexity: {
      type: 'select',
      label: 'Cutting Complexity',
      description: 'Amount of cutting and fitting required',
      default: 'minimal',
      options: {
        minimal: { label: 'Minimal Cutting', value: 0 },
        moderate: { label: 'Moderate Cutting', value: 15 },
        complex: { label: 'Complex Cutting', value: 30 },
      },
      adminEditable: true,
    },
  },

  labor: {
    label: 'Labor Settings',
    description: 'Team size and labor factors',

    teamSize: {
      type: 'select',
      label: 'Team Size',
      description: 'Number of workers on the job',
      default: 'threePlus',
      options: {
        twoPerson: { label: 'Two Person Team', value: 40 },
        threePlus: { label: 'Three+ Person Team', value: 0 },
      },
      adminEditable: true,
    },
  },

  siteAccess: {
    label: 'Site Access',
    description: 'Site accessibility and obstacles',

    accessDifficulty: {
      type: 'select',
      label: 'Access Difficulty',
      description: 'Difficulty of accessing the work area',
      default: 'easy',
      options: {
        easy: { label: 'Easy Access', value: 0 },
        moderate: { label: 'Moderate Access', value: 50 },
        difficult: { label: 'Difficult Access', value: 100 },
      },
      adminEditable: true,
    },

    obstacleRemoval: {
      type: 'select',
      label: 'Obstacle Removal',
      description: 'Cost of removing obstacles from site',
      default: 'none',
      options: {
        none: { label: 'No Obstacles', value: 0 },
        minor: { label: 'Minor Obstacles', value: 500 },
        major: { label: 'Major Obstacles', value: 1000 },
      },
      adminEditable: true,
    },
  },

  complexity: {
    label: 'Project Complexity',
    description: 'Overall project complexity multiplier',

    overallComplexity: {
      type: 'select',
      label: 'Overall Complexity',
      description: 'Final complexity multiplier applied to total cost',
      default: 'standard',
      options: {
        simple: { label: 'Simple Project', value: 0 },
        standard: { label: 'Standard Project', value: 10 },
        complex: { label: 'Complex Project', value: 30 },
        extreme: { label: 'Extreme Complexity', value: 50 },
      },
      adminEditable: true,
    },
  },
};

/**
 * SIMPLE_HOURLY Template
 *
 * For basic hourly services with minimal variables (consulting, maintenance, etc.)
 * Includes: labor settings only
 */
export const SIMPLE_HOURLY_TEMPLATE = {
  labor: {
    label: 'Labor Settings',
    description: 'Basic labor configuration',

    teamSize: {
      type: 'number',
      label: 'Team Size',
      description: 'Number of workers on the job',
      default: 1,
      min: 1,
      max: 10,
      unit: 'people',
      adminEditable: true,
    },

    skillLevel: {
      type: 'select',
      label: 'Skill Level Required',
      description: 'Experience level needed for this service',
      default: 'standard',
      options: {
        entry: { label: 'Entry Level', value: 0 },
        standard: { label: 'Standard Experience', value: 0 },
        expert: { label: 'Expert/Specialist', value: 25 },
      },
      adminEditable: true,
    },
  },

  scheduling: {
    label: 'Scheduling',
    description: 'Scheduling and timing factors',

    urgency: {
      type: 'select',
      label: 'Urgency Multiplier',
      description: 'Additional charge for expedited service',
      default: 'standard',
      options: {
        standard: { label: 'Standard Scheduling', value: 0 },
        priority: { label: 'Priority (Next Day)', value: 15 },
        emergency: { label: 'Emergency (Same Day)', value: 50 },
      },
      adminEditable: true,
    },
  },
};

/**
 * LINEAR_MEASUREMENT Template
 *
 * For services priced by linear feet (fencing, curbing, edging, etc.)
 * Includes: height/depth settings, material grades, installation complexity
 */
export const LINEAR_MEASUREMENT_TEMPLATE = {
  dimensions: {
    label: 'Dimension Settings',
    description: 'Height and depth configuration',

    defaultHeight: {
      type: 'number',
      label: 'Default Height',
      description: 'Standard height for most installations',
      default: 6,
      min: 1,
      max: 12,
      unit: 'feet',
      adminEditable: true,
    },

    postSpacing: {
      type: 'number',
      label: 'Post Spacing',
      description: 'Distance between posts',
      default: 8,
      min: 4,
      max: 12,
      unit: 'feet',
      adminEditable: true,
    },
  },

  materials: {
    label: 'Material Settings',
    description: 'Material type and quality',

    materialType: {
      type: 'select',
      label: 'Material Type',
      description: 'Type of material used',
      default: 'standard',
      options: {
        economy: { label: 'Economy Grade', value: -10 },
        standard: { label: 'Standard Grade', value: 0 },
        premium: { label: 'Premium Grade', value: 25 },
      },
      adminEditable: true,
    },
  },

  installation: {
    label: 'Installation Complexity',
    description: 'Installation difficulty factors',

    terrainDifficulty: {
      type: 'select',
      label: 'Terrain Difficulty',
      description: 'Difficulty of terrain for installation',
      default: 'flat',
      options: {
        flat: { label: 'Flat/Easy Terrain', value: 0 },
        sloped: { label: 'Sloped Terrain', value: 20 },
        rocky: { label: 'Rocky/Difficult Terrain', value: 40 },
      },
      adminEditable: true,
    },
  },
};

/**
 * Template Library
 */
export const SERVICE_TEMPLATES = {
  volume_based: VOLUME_BASED_TEMPLATE,
  area_complexity: AREA_COMPLEXITY_TEMPLATE,
  simple_hourly: SIMPLE_HOURLY_TEMPLATE,
  linear_measurement: LINEAR_MEASUREMENT_TEMPLATE,
};

/**
 * Get template by key
 */
export function getTemplate(templateKey: keyof typeof SERVICE_TEMPLATES) {
  return SERVICE_TEMPLATES[templateKey];
}

/**
 * Get all template keys with descriptions
 */
export function getTemplateOptions() {
  return [
    {
      key: 'volume_based',
      label: 'Volume-Based (Excavation, Fill, etc.)',
      description: 'For services calculating cubic volume with depth, waste, and compaction factors',
    },
    {
      key: 'area_complexity',
      label: 'Area-Based with Complexity (Patios, Decks, etc.)',
      description: 'For area-based services with materials, labor, and complexity variables',
    },
    {
      key: 'simple_hourly',
      label: 'Simple Hourly Service',
      description: 'For basic hourly services with minimal configuration',
    },
    {
      key: 'linear_measurement',
      label: 'Linear Measurement (Fencing, Curbing, etc.)',
      description: 'For services priced by linear feet with height/material variables',
    },
  ];
}
