-- Initialize paver_patio_sqft configuration for demo company
-- This creates the initial service pricing config that will be edited via Services Database UI

-- Demo company ID from DEMO_USER in AuthContext
-- Company: 08f0827a-608f-485a-a19f-e0c55ecf6484
-- User: cd7ad550-37f3-477a-975e-a34b226b7332

INSERT INTO public.service_pricing_configs (
  company_id,
  service_name,
  hourly_labor_rate,
  optimal_team_size,
  base_productivity,
  base_material_cost,
  profit_margin,
  variables_config,
  default_variables,
  is_active,
  version,
  updated_by
) VALUES (
  '08f0827a-608f-485a-a19f-e0c55ecf6484',
  'paver_patio_sqft',
  25.00,  -- Hourly labor rate ($/hour/person)
  3,      -- Optimal team size (people)
  50.00,  -- Base productivity (sqft/day)
  5.84,   -- Base material cost ($/sqft) - from Quiet Village SiteOne pricing
  0.20,   -- Profit margin (20%)
  '{
    "labor": {
      "label": "Labor & Team",
      "description": "Team size affects productivity and labor time",
      "teamSize": {
        "type": "select",
        "label": "Team Size",
        "description": "Number of workers on the project",
        "tier": 1,
        "effect": "labor_time_percentage",
        "options": {
          "threePlus": {
            "label": "3+ Person Team (Optimal)",
            "value": 0
          },
          "twoPerson": {
            "label": "2 Person Team",
            "value": 40
          }
        }
      }
    },
    "materials": {
      "label": "Materials & Complexity",
      "description": "Paver styles and cutting complexity",
      "paverStyle": {
        "type": "select",
        "label": "Paver Style",
        "description": "Material quality and style",
        "tier": 2,
        "effect": "material_cost_multiplier",
        "options": {
          "standard": {
            "label": "Standard Pavers",
            "value": 1.0
          },
          "premium": {
            "label": "Premium Pavers",
            "value": 1.2
          }
        }
      },
      "cuttingComplexity": {
        "type": "select",
        "label": "Cutting Complexity",
        "description": "Affects both labor time (Tier 1) and material waste (Tier 2)",
        "tier": "dual",
        "options": {
          "minimal": {
            "label": "Minimal Cutting (Baseline)",
            "laborPercentage": 0,
            "materialWaste": 0
          },
          "moderate": {
            "label": "Moderate Cutting (+20% hours, +15% waste)",
            "laborPercentage": 20,
            "materialWaste": 15
          },
          "complex": {
            "label": "Complex Cutting (+30% hours, +25% waste)",
            "laborPercentage": 30,
            "materialWaste": 25
          }
        }
      }
    },
    "excavation": {
      "label": "Excavation & Equipment",
      "description": "Tearout complexity and equipment requirements",
      "tearoutComplexity": {
        "type": "select",
        "label": "Tearout Complexity",
        "description": "What needs to be removed",
        "tier": 1,
        "effect": "labor_time_percentage",
        "options": {
          "grass": {
            "label": "Grass/Sod (Baseline)",
            "value": 0
          },
          "concrete": {
            "label": "Concrete Removal",
            "value": 20
          },
          "asphalt": {
            "label": "Asphalt Removal",
            "value": 30
          }
        }
      },
      "equipmentRequired": {
        "type": "select",
        "label": "Equipment Required",
        "description": "Daily equipment rental costs",
        "tier": 2,
        "effect": "daily_cost",
        "options": {
          "handTools": {
            "label": "Hand Tools Only (Baseline)",
            "value": 0
          },
          "attachments": {
            "label": "Small Attachments",
            "value": 100
          },
          "lightMachinery": {
            "label": "Light Machinery",
            "value": 250
          },
          "heavyMachinery": {
            "label": "Heavy Machinery",
            "value": 500
          }
        }
      }
    },
    "siteAccess": {
      "label": "Site Access & Obstacles",
      "description": "Access difficulty and obstacle removal",
      "accessDifficulty": {
        "type": "select",
        "label": "Access Difficulty",
        "description": "How difficult is site access",
        "tier": 1,
        "effect": "labor_time_percentage",
        "options": {
          "easy": {
            "label": "Easy Access (Baseline)",
            "value": 0
          },
          "moderate": {
            "label": "Moderate Access",
            "value": 25
          },
          "difficult": {
            "label": "Difficult/Tight Access",
            "value": 50
          }
        }
      },
      "obstacleRemoval": {
        "type": "select",
        "label": "Obstacle Removal",
        "description": "Flat fee for removing obstacles",
        "tier": 2,
        "effect": "flat_cost",
        "options": {
          "none": {
            "label": "No Obstacles (Baseline)",
            "value": 0
          },
          "minor": {
            "label": "Minor Obstacles",
            "value": 500
          },
          "major": {
            "label": "Major Obstacles",
            "value": 1500
          }
        }
      }
    },
    "complexity": {
      "label": "Overall Complexity",
      "description": "Overall project complexity multiplier applied to subtotal",
      "overallComplexity": {
        "type": "select",
        "label": "Overall Project Complexity",
        "description": "Applied to subtotal before profit (Tier 2)",
        "tier": 2,
        "effect": "subtotal_multiplier",
        "options": {
          "simple": {
            "label": "Simple Project",
            "value": 1.0
          },
          "standard": {
            "label": "Standard Project",
            "value": 1.15
          },
          "complex": {
            "label": "Complex Project",
            "value": 1.3
          }
        }
      }
    }
  }'::jsonb,
  '{
    "teamSize": "threePlus",
    "paverStyle": "standard",
    "cuttingComplexity": "minimal",
    "tearoutComplexity": "grass",
    "equipmentRequired": "handTools",
    "accessDifficulty": "easy",
    "obstacleRemoval": "none",
    "overallComplexity": "simple"
  }'::jsonb,
  true,
  '2.0.0',
  'cd7ad550-37f3-477a-975e-a34b226b7332'
)
ON CONFLICT (company_id, service_name) DO UPDATE SET
  hourly_labor_rate = EXCLUDED.hourly_labor_rate,
  optimal_team_size = EXCLUDED.optimal_team_size,
  base_productivity = EXCLUDED.base_productivity,
  base_material_cost = EXCLUDED.base_material_cost,
  profit_margin = EXCLUDED.profit_margin,
  variables_config = EXCLUDED.variables_config,
  default_variables = EXCLUDED.default_variables,
  is_active = EXCLUDED.is_active,
  version = EXCLUDED.version,
  updated_at = NOW(),
  updated_by = EXCLUDED.updated_by;
