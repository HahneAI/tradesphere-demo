import React from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../config/industry';

interface ServicesTabProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServicesTab: React.FC<ServicesTabProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);

  if (!isOpen) return null;

  return (
    <>
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-overlay-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-4xl h-[80vh] bg-white rounded-lg shadow-xl animate-scale-in flex flex-col"
          style={{ backgroundColor: visualConfig.colors.surface }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b flex-shrink-0"
               style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}>
            <h2 className="text-xl font-semibold" style={{ color: visualConfig.colors.text.primary }}>
              Services Management
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-opacity-20 transition-colors"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              <Icons.X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Welcome Section */}
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 mb-4 rounded-full flex items-center justify-center"
                     style={{ backgroundColor: visualConfig.colors.primary + '20' }}>
                  <Icons.Settings className="h-8 w-8" style={{ color: visualConfig.colors.primary }} />
                </div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: visualConfig.colors.text.primary }}>
                  Service Configuration
                </h3>
                <p className="text-lg" style={{ color: visualConfig.colors.text.secondary }}>
                  Manage your company's services and pricing variables
                </p>
              </div>

              {/* Coming Soon Notice */}
              <div className="max-w-2xl mx-auto">
                <div className="rounded-lg border-2 border-dashed p-8 text-center"
                     style={{ 
                       borderColor: visualConfig.colors.primary + '40',
                       backgroundColor: visualConfig.colors.primary + '05'
                     }}>
                  <Icons.Wrench className="mx-auto h-12 w-12 mb-4" 
                                style={{ color: visualConfig.colors.primary }} />
                  <h4 className="text-xl font-semibold mb-2" 
                      style={{ color: visualConfig.colors.text.primary }}>
                    Services Management Coming Soon
                  </h4>
                  <p className="text-base mb-4" style={{ color: visualConfig.colors.text.secondary }}>
                    This section will allow you to configure custom services with dynamic pricing variables, 
                    giving you complete control over your service offerings.
                  </p>
                  
                  {/* Feature List */}
                  <div className="grid md:grid-cols-2 gap-4 mt-6 text-left">
                    <div className="flex items-center gap-3">
                      <Icons.CheckCircle className="h-5 w-5 flex-shrink-0" 
                                      style={{ color: visualConfig.colors.primary }} />
                      <span style={{ color: visualConfig.colors.text.secondary }}>
                        Create custom services
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Icons.CheckCircle className="h-5 w-5 flex-shrink-0" 
                                      style={{ color: visualConfig.colors.primary }} />
                      <span style={{ color: visualConfig.colors.text.secondary }}>
                        Dynamic pricing variables
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Icons.CheckCircle className="h-5 w-5 flex-shrink-0" 
                                      style={{ color: visualConfig.colors.primary }} />
                      <span style={{ color: visualConfig.colors.text.secondary }}>
                        Drag & drop organization
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Icons.CheckCircle className="h-5 w-5 flex-shrink-0" 
                                      style={{ color: visualConfig.colors.primary }} />
                      <span style={{ color: visualConfig.colors.text.secondary }}>
                        Real-time quote integration
                      </span>
                    </div>
                  </div>
                </div>

                {/* Current User Info */}
                <div className="mt-6 p-4 rounded-lg" 
                     style={{ backgroundColor: visualConfig.colors.background }}>
                  <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                    Services will be configured for: <span className="font-medium" 
                    style={{ color: visualConfig.colors.text.primary }}>
                      {user?.first_name}'s Company
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};