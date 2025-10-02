import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useServiceBaseSettings } from '../../stores/serviceBaseSettingsStore';
import { ServiceRecordCard } from './ServiceRecordCard';

interface ServicesDatabaseViewProps {
  visualConfig: any;
  theme: 'light' | 'dark';
  isAdmin: boolean;
  userName?: string;
}

export const ServicesDatabaseView: React.FC<ServicesDatabaseViewProps> = ({
  visualConfig,
  theme,
  isAdmin,
  userName = 'User'
}) => {
  const { user } = useAuth();
  const { services, isLoading, error, updateBaseSetting } = useServiceBaseSettings(user?.company_id);
  const [searchTerm, setSearchTerm] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" 
             style={{ borderColor: visualConfig.colors.primary }}></div>
        <span className="ml-3" style={{ color: visualConfig.colors.text.primary }}>
          Loading services database...
        </span>
      </div>
    );
  }

  if (error) {
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
          <span className="text-red-800 font-medium">Error loading services database</span>
        </div>
        <p className="text-red-700 text-sm mt-1">{error}</p>
      </div>
    );
  }

  const filteredServices = services.filter(service =>
    service.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: visualConfig.colors.text.primary }}>
            Services Database
          </h2>
          <p className="text-sm mt-1" style={{ color: visualConfig.colors.text.secondary }}>
            {isAdmin 
              ? 'Manage base pricing settings that affect all calculations'
              : 'View current service configurations and base pricing settings'
            }
          </p>
        </div>
        
        {isAdmin && (
          <div 
            className="flex items-center space-x-2 px-3 py-2 rounded-lg"
            style={{ 
              backgroundColor: visualConfig.colors.primary + '10',
              border: `1px solid ${visualConfig.colors.primary}40`
            }}
          >
            <Icons.Shield className="h-4 w-4" style={{ color: visualConfig.colors.primary }} />
            <span className="text-sm font-medium" style={{ color: visualConfig.colors.primary }}>
              Administrator Access
            </span>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div 
        className="p-4 rounded-lg border-l-4"
        style={{ 
          backgroundColor: visualConfig.colors.primary + '08',
          borderLeftColor: visualConfig.colors.primary,
        }}
      >
        <div className="flex items-start">
          <Icons.Info className="h-5 w-5 mr-3 mt-0.5" style={{ color: visualConfig.colors.primary }} />
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: visualConfig.colors.text.primary }}>
              {isAdmin ? 'Base Settings Management' : 'Service Database View'}
            </p>
            <p className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
              {isAdmin 
                ? 'Changes to base settings will immediately affect the Quick Calculator and pricing calculations. These are foundational values that multipliers are applied to.'
                : `You're viewing the current service configurations as ${userName}. Contact an administrator to request changes to base settings.`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      {services.length > 1 && (
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Icons.Search 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" 
                style={{ color: visualConfig.colors.text.secondary }} 
              />
              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                style={{
                  backgroundColor: visualConfig.colors.surface,
                  borderColor: visualConfig.colors.text.secondary + '40',
                  color: visualConfig.colors.text.primary,
                }}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm" style={{ color: visualConfig.colors.text.secondary }}>
            <span>{filteredServices.length} of {services.length} services</span>
          </div>
        </div>
      )}

      {/* Services Grid */}
      <div className="grid gap-6">
        {filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <Icons.FileX className="mx-auto h-12 w-12 mb-4" style={{ color: visualConfig.colors.text.secondary }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
              No services found
            </h3>
            <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
              {searchTerm ? 'Try adjusting your search terms.' : 'No services are currently configured.'}
            </p>
          </div>
        ) : (
          filteredServices.map((service) => (
            <ServiceRecordCard
              key={service.serviceId}
              service={service}
              isAdmin={isAdmin}
              onUpdateSetting={updateBaseSetting}
              visualConfig={visualConfig}
            />
          ))
        )}
      </div>

      {/* Footer Info */}
      {isAdmin && (
        <div 
          className="mt-8 p-4 rounded-lg"
          style={{ backgroundColor: visualConfig.colors.background }}
        >
          <h4 className="text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
            How Base Settings Affect Calculations:
          </h4>
          <div className="grid md:grid-cols-2 gap-3 text-xs" style={{ color: visualConfig.colors.text.secondary }}>
            <div>
              <strong>Base Labor Rate:</strong> Foundation hours per square foot before complexity multipliers
            </div>
            <div>
              <strong>Base Material Cost:</strong> Foundation cost per square foot before quality multipliers
            </div>
            <div>
              <strong>Service Charge:</strong> Fixed fee added to all projects regardless of size
            </div>
            <div>
              <strong>Profit Margin:</strong> Target profit percentage applied to labor and material costs
            </div>
          </div>
        </div>
      )}
    </div>
  );
};