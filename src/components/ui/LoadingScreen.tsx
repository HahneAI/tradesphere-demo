import React from 'react';
import * as Icons from 'lucide-react';
import { getLoadingConfig, getCoreConfig } from '../../config/industry';

interface LoadingScreenProps {
  isExiting: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isExiting }) => {
  const config = getLoadingConfig();
  const coreConfig = getCoreConfig();
  const IconComponent = Icons[config.icon] || Icons.MessageCircle;

  const containerClasses = `
    fixed inset-0 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center z-50
    transition-opacity duration-500
    ${isExiting ? 'opacity-0' : 'opacity-100'}
  `;

  // Get industry-specific animation class
  const getAnimationClass = () => {
    switch (config.type) {
      case 'growth':
        return 'animate-grow'; // Tree/plant growth animation
      case 'building':
        return 'animate-build'; // Construction/building animation
      case 'flow':
        return 'animate-pulse-gentle'; // Smooth flow animation
      case 'spark':
        return 'animate-pulse-gentle'; // Electric/spark animation
      default:
        return 'animate-pulse-gentle'; // Generic fallback
    }
  };

  return (
    <div className={containerClasses}>
      <div className={`flex flex-col items-center gap-4 transition-transform duration-500 transform ${isExiting ? 'scale-95' : 'scale-100'}`}>
        <div className="relative">
          <div
            className="w-24 h-24 text-white rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden animate-loading-entry"
            style={{ backgroundColor: config.colors.primary }}
          >
            {coreConfig.logoUrl && coreConfig.logoUrl !== '/assets/branding/default-logo.svg' ? (
              <img src={coreConfig.logoUrl} alt={`${coreConfig.companyName} Logo`} className="w-16 h-16 object-contain" />
            ) : (
              <IconComponent size={48} className={getAnimationClass()} />
            )}
          </div>
          <div
            className="absolute inset-0 rounded-2xl animate-ping opacity-20 -z-10"
            style={{ backgroundColor: config.colors.accent }}
          ></div>
        </div>

        <h1
          className="text-4xl font-display font-bold mt-6 animate-fade-in"
          style={{ color: config.colors.primary }}
        >
          {coreConfig.companyName}
        </h1>

        <p className="text-gray-600 dark:text-gray-400 animate-fade-in-delay">
          {config.message}
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
