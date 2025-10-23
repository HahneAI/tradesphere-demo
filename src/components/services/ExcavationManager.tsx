import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { useExcavationStore } from '../../pricing-system/core/stores/excavation-store';

interface ExcavationManagerProps {
  visualConfig: any;
  theme: 'light' | 'dark';
  store: ReturnType<typeof useExcavationStore>;
}

export const ExcavationManager: React.FC<ExcavationManagerProps> = ({
  visualConfig,
  theme,
  store
}) => {
  const [areaInput, setAreaInput] = useState(store.values.area_sqft.toString());
  const [depthInput, setDepthInput] = useState(store.values.depth_inches.toString());

  const handleAreaChange = (value: string) => {
    setAreaInput(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      store.updateArea(numValue);
    }
  };

  const handleDepthChange = (value: string) => {
    setDepthInput(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      store.updateDepth(numValue);
    }
  };

  if (store.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2"
             style={{ borderColor: visualConfig.colors.primary }}></div>
        <span className="ml-3" style={{ color: visualConfig.colors.text.primary }}>
          Loading excavation configuration...
        </span>
      </div>
    );
  }

  if (store.error) {
    return (
      <div
        className="p-4 rounded-lg border-l-4"
        style={{
          backgroundColor: '#fee2e2',
          borderLeftColor: '#dc2626'
        }}
      >
        <div className="flex items-center">
          <Icons.AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800 font-medium">Error loading configuration</span>
        </div>
        <p className="text-red-700 text-sm mt-1">{store.error}</p>
      </div>
    );
  }

  const calc = store.lastCalculation;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold" style={{ color: visualConfig.colors.text.primary }}>
          Excavation & Debris Removal Calculator
        </h2>
        <p className="text-sm mt-1" style={{ color: visualConfig.colors.text.secondary }}>
          Calculate excavation costs based on area and depth
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Area Input */}
          <div
            className="p-6 rounded-lg border"
            style={{
              backgroundColor: visualConfig.colors.surface,
              borderColor: visualConfig.colors.text.secondary + '20'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium" style={{ color: visualConfig.colors.text.primary }}>
                  Project Dimensions
                </h3>
                <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                  Enter the area to be excavated
                </p>
              </div>
              <Icons.Ruler className="h-6 w-6" style={{ color: visualConfig.colors.primary }} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Area Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
                  Area to Excavate
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={areaInput}
                    onChange={(e) => handleAreaChange(e.target.value)}
                    min="1"
                    step="1"
                    className="flex-1 p-3 border rounded-lg text-lg"
                    style={{
                      backgroundColor: visualConfig.colors.surface,
                      borderColor: visualConfig.colors.text.secondary + '40',
                      color: visualConfig.colors.text.primary
                    }}
                    placeholder="1000"
                  />
                  <span className="text-sm font-medium" style={{ color: visualConfig.colors.text.secondary }}>
                    sq ft
                  </span>
                </div>
              </div>

              {/* Depth Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
                  Excavation Depth
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={depthInput}
                    onChange={(e) => handleDepthChange(e.target.value)}
                    min="1"
                    max="36"
                    step="1"
                    className="flex-1 p-3 border rounded-lg text-lg"
                    style={{
                      backgroundColor: visualConfig.colors.surface,
                      borderColor: visualConfig.colors.text.secondary + '40',
                      color: visualConfig.colors.text.primary
                    }}
                    placeholder="12"
                  />
                  <span className="text-sm font-medium" style={{ color: visualConfig.colors.text.secondary }}>
                    inches
                  </span>
                </div>
                <p className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                  Default depth can be changed in Service Specifics
                </p>
              </div>
            </div>
          </div>

          {/* Volume Calculation Breakdown */}
          {calc && (
            <div
              className="p-6 rounded-lg border"
              style={{
                backgroundColor: visualConfig.colors.surface,
                borderColor: visualConfig.colors.text.secondary + '20'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium" style={{ color: visualConfig.colors.text.primary }}>
                    Volume Calculation
                  </h3>
                  <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                    Cubic yards breakdown
                  </p>
                </div>
                <Icons.Package className="h-6 w-6" style={{ color: visualConfig.colors.primary }} />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b"
                     style={{ borderColor: visualConfig.colors.text.secondary + '20' }}>
                  <span style={{ color: visualConfig.colors.text.secondary }}>Raw Volume</span>
                  <span className="font-medium" style={{ color: visualConfig.colors.text.primary }}>
                    {calc.cubic_yards_raw.toFixed(2)} yd³
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b"
                     style={{ borderColor: visualConfig.colors.text.secondary + '20' }}>
                  <span style={{ color: visualConfig.colors.text.secondary }}>With Waste & Compaction</span>
                  <span className="font-medium" style={{ color: visualConfig.colors.text.primary }}>
                    {calc.cubic_yards_adjusted.toFixed(2)} yd³
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 px-3 rounded"
                     style={{ backgroundColor: visualConfig.colors.primary + '20' }}>
                  <span className="font-medium" style={{ color: visualConfig.colors.text.primary }}>
                    Final Volume (Rounded)
                  </span>
                  <span className="text-xl font-bold" style={{ color: visualConfig.colors.primary }}>
                    {calc.cubic_yards_final.toFixed(2)} yd³
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pricing Preview Panel */}
        <div className="lg:col-span-1">
          <div
            className="sticky top-4 p-6 rounded-lg border"
            style={{
              backgroundColor: visualConfig.colors.surface,
              borderColor: visualConfig.colors.text.secondary + '20'
            }}
          >
            <h3 className="text-lg font-medium mb-4" style={{ color: visualConfig.colors.text.primary }}>
              Pricing Summary
            </h3>

            {calc ? (
              <div className="space-y-4">
                {/* Cost Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: visualConfig.colors.text.secondary }}>Base Cost</span>
                    <span style={{ color: visualConfig.colors.text.primary }}>
                      ${calc.base_cost.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: visualConfig.colors.text.secondary }}>
                      Profit ({((store.config?.profit_margin ?? 0.05) * 100).toFixed(0)}%)
                    </span>
                    <span style={{ color: visualConfig.colors.text.primary }}>
                      ${calc.profit.toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-2 border-t" style={{ borderColor: visualConfig.colors.text.secondary + '20' }}>
                    <div className="flex justify-between">
                      <span className="font-medium" style={{ color: visualConfig.colors.text.primary }}>
                        Total Cost
                      </span>
                      <span className="text-2xl font-bold" style={{ color: visualConfig.colors.primary }}>
                        ${calc.total_cost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Per Unit Cost */}
                <div
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: visualConfig.colors.primary + '10' }}
                >
                  <div className="text-center">
                    <p className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                      Cost per Cubic Yard
                    </p>
                    <p className="text-xl font-bold" style={{ color: visualConfig.colors.primary }}>
                      ${calc.cost_per_cubic_yard.toFixed(2)}/yd³
                    </p>
                  </div>
                </div>

                {/* Time Estimate */}
                <div className="pt-4 border-t" style={{ borderColor: visualConfig.colors.text.secondary + '20' }}>
                  <h4 className="text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
                    Time Estimate
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span style={{ color: visualConfig.colors.text.secondary }}>Total Hours</span>
                      <span style={{ color: visualConfig.colors.text.primary }}>
                        {calc.base_hours.toFixed(1)} hrs
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: visualConfig.colors.text.secondary }}>Project Days</span>
                      <span style={{ color: visualConfig.colors.text.primary }}>
                        {calc.project_days} days
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: visualConfig.colors.text.secondary }}>Hours per Cubic Yard</span>
                      <span style={{ color: visualConfig.colors.text.primary }}>
                        {calc.hours_per_cubic_yard.toFixed(1)} hrs/yd³
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info Note */}
                <div
                  className="p-3 rounded text-xs"
                  style={{
                    backgroundColor: visualConfig.colors.text.secondary + '10',
                    color: visualConfig.colors.text.secondary
                  }}
                >
                  <Icons.Info className="h-4 w-4 inline mr-1" />
                  Adjust waste factor, compaction, and rounding in Service Specifics
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                Enter dimensions to calculate pricing
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
