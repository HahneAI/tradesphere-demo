import React from 'react';
import * as Icons from 'lucide-react';
import { getLoadingConfig, getCoreConfig } from '../../config/industry';

interface LoadingScreenProps {
  isExiting: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isExiting }) => {
  const config = getLoadingConfig();
  const coreConfig = getCoreConfig();

  const containerClasses = `
    fixed inset-0 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center z-50
    transition-opacity duration-500
    ${isExiting ? 'opacity-0' : 'opacity-100'}
  `;

  // 🎯 ALWAYS use animated industry icons - IGNORE logos completely
  const getIndustryIconAndAnimation = () => {
    const industryType = import.meta.env.VITE_INDUSTRY_TYPE;
    const loadingAnimation = import.meta.env.VITE_LOADING_ANIMATION;
    
    // Priority: Explicit loading animation setting
    if (loadingAnimation === 'growth') {
      return { icon: Icons.TreePine, animation: 'animate-grow' };
    }
    if (loadingAnimation === 'building') {
      return { icon: Icons.Wrench, animation: 'animate-build' };
    }
    if (loadingAnimation === 'gears') {
      return { icon: Icons.Cog, animation: 'animate-build' };
    }
    if (loadingAnimation === 'dots') {
      return { icon: Icons.MoreHorizontal, animation: 'animate-pulse-gentle' };
    }
    
    // Fallback: Industry-specific defaults
    if (industryType === 'landscaping') {
      return { icon: Icons.TreePine, animation: 'animate-grow' };
    }
    if (industryType === 'hvac') {
      return { icon: Icons.Wrench, animation: 'animate-build' };
    }
    
    // Default: Tech theme
    return { icon: Icons.MessageCircle, animation: 'animate-pulse-gentle' };
  };

  const { icon: IconComponent, animation: animationClass } = getIndustryIconAndAnimation();

  return (
    <div className={containerClasses}>
      <div className={`flex flex-col items-center gap-4 transition-transform duration-500 transform ${isExiting ? 'scale-95' : 'scale-100'}`}>
        <div className="relative">
          <div
            className="w-24 h-24 text-white rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden animate-loading-entry"
            style={{ backgroundColor: config.colors.primary }}
          >
            {/* 🎯 ALWAYS SHOW ANIMATED INDUSTRY ICON - Logo reserved for header only */}
            <IconComponent size={48} className={animationClass} />
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
