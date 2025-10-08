import React from 'react';
import * as Icons from 'lucide-react';
import { SERVICE_REGISTRY, ServiceId } from '../../config/service-registry';
import { cleanServiceDisplayName } from '../../utils/service-name-formatter';

interface ServiceSelectionScreenProps {
  onSelectService: (serviceId: ServiceId) => void;
  visualConfig: any;
  theme: 'light' | 'dark';
}

export const ServiceSelectionScreen: React.FC<ServiceSelectionScreenProps> = ({
  onSelectService,
  visualConfig,
  theme
}) => {
  // Get icon component from Lucide by name
  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Icons.Calculator;
    return IconComponent;
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2" style={{ color: visualConfig.colors.text.primary }}>
          Quick Calculator
        </h2>
        <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
          Select a service to begin pricing
        </p>
      </div>

      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
        {Object.entries(SERVICE_REGISTRY).map(([serviceId, service]) => {
          const IconComponent = getIconComponent(service.icon);
          const displayName = cleanServiceDisplayName(service.displayName, serviceId);

          return (
            <button
              key={serviceId}
              onClick={() => onSelectService(serviceId as ServiceId)}
              className="group relative p-6 rounded-lg border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-left"
              style={{
                backgroundColor: visualConfig.colors.surface,
                borderColor: theme === 'light' ? '#e5e7eb' : '#374151',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              {/* Icon */}
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4 transition-colors"
                style={{
                  backgroundColor: visualConfig.colors.primary + '15',
                }}
              >
                <IconComponent
                  className="h-6 w-6"
                  style={{ color: visualConfig.colors.primary }}
                />
              </div>

              {/* Service Name */}
              <h3
                className="text-xl font-semibold mb-2"
                style={{ color: visualConfig.colors.text.primary }}
              >
                {displayName}
              </h3>

              {/* Description */}
              <p
                className="text-sm leading-relaxed"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                {service.description}
              </p>

              {/* Unit Badge */}
              <div className="mt-4 flex items-center gap-2">
                <div
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: visualConfig.colors.primary + '10',
                    color: visualConfig.colors.primary
                  }}
                >
                  <Icons.Ruler className="h-3 w-3" />
                  {service.unit}
                </div>
                <div
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: theme === 'light' ? '#f3f4f6' : '#374151',
                    color: visualConfig.colors.text.secondary
                  }}
                >
                  {service.category}
                </div>
              </div>

              {/* Hover Arrow */}
              <div
                className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: visualConfig.colors.primary }}
              >
                <Icons.ArrowRight className="h-5 w-5" />
              </div>

              {/* Hover Effect Overlay */}
              <div
                className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, ${visualConfig.colors.primary}08 0%, transparent 100%)`
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Empty State (if no services) */}
      {Object.keys(SERVICE_REGISTRY).length === 0 && (
        <div className="text-center py-12">
          <Icons.Inbox className="h-16 w-16 mx-auto mb-4" style={{ color: visualConfig.colors.text.secondary }} />
          <p className="text-lg font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
            No Services Available
          </p>
          <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
            Contact your administrator to add pricing services
          </p>
        </div>
      )}
    </div>
  );
};
