// src/components/ui/AvatarSelectionPopup.tsx
import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../../config/industry';
import { useAuth } from '../../context/AuthContext';

interface AvatarSelectionPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_ICONS = [
  { name: 'User', label: 'Person', description: 'Default profile' },
  { name: 'TreePine', label: 'Pine Tree', description: 'Evergreen & conifers' },
  { name: 'TreeDeciduous', label: 'Oak Tree', description: 'Shade & ornamental trees' },
  { name: 'Flower', label: 'Flower', description: 'Gardens & blooms' },
  { name: 'Leaf', label: 'Leaf', label: 'Foliage & plants' },
  { name: 'Shovel', label: 'Shovel', description: 'Tools & installation' },
  { name: 'Sun', label: 'Sun', description: 'Outdoor & seasonal work' },
  { name: 'Sprout', label: 'Sprout', description: 'New plantings & growth' },
  { name: 'Droplets', label: 'Water', description: 'Irrigation & maintenance' }
] as const;

type IconName = typeof AVAILABLE_ICONS[number]['name'];

const DynamicIcon = ({ name, ...props }: { name: IconName } & any) => {
  const IconComponent = Icons[name] || Icons.User;
  return <IconComponent {...props} />;
};

export const AvatarSelectionPopup: React.FC<AvatarSelectionPopupProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);
  const { user, updateUserIcon } = useAuth();
  const [selectedIcon, setSelectedIcon] = useState<IconName>(user?.user_icon as IconName || 'User');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleIconSelect = async (iconName: IconName) => {
    setSelectedIcon(iconName);
    setIsUpdating(true);

    try {
      const success = await updateUserIcon(iconName);
      if (success) {
        setTimeout(() => {
          onClose();
        }, 500); // Brief delay to show selection before closing
      }
    } catch (error) {
      console.error('Failed to update user icon:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div
        className="p-8 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 animate-scale-in max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: visualConfig.colors.surface,
          color: visualConfig.colors.text.primary,
          borderRadius: visualConfig.patterns.componentShape === 'organic' ? '1.5rem' : '1rem'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold flex items-center gap-3">
            <DynamicIcon name={selectedIcon} className="h-7 w-7" style={{ color: visualConfig.colors.primary }} />
            Choose Your Profile Icon
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-500/20 transition-colors">
            <Icons.X className="h-6 w-6" />
          </button>
        </div>

        <p className="text-sm mb-8" style={{ color: visualConfig.colors.text.secondary }}>
          Select an icon that represents your landscaping specialty or personal preference.
        </p>

        {/* Icon Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {AVAILABLE_ICONS.map((icon) => (
            <button
              key={icon.name}
              onClick={() => handleIconSelect(icon.name)}
              disabled={isUpdating}
              className="p-4 rounded-xl text-center transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
              style={{
                backgroundColor: selectedIcon === icon.name ? visualConfig.colors.primary : visualConfig.colors.background,
                color: selectedIcon === icon.name ? visualConfig.colors.text.onPrimary : visualConfig.colors.text.primary,
                '--tw-ring-color': visualConfig.colors.primary,
                borderRadius: visualConfig.patterns.componentShape === 'organic' ? '1rem' : '0.75rem'
              }}
            >
              <div className="flex flex-col items-center space-y-2">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: selectedIcon === icon.name ? 'rgba(255,255,255,0.2)' : visualConfig.colors.elevated
                  }}
                >
                  <DynamicIcon 
                    name={icon.name} 
                    className="h-6 w-6"
                    style={{ 
                      color: selectedIcon === icon.name ? visualConfig.colors.text.onPrimary : visualConfig.colors.primary 
                    }}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">{icon.label}</p>
                  <p className="text-xs opacity-75">{icon.description}</p>
                </div>
                {selectedIcon === icon.name && (
                  <Icons.CheckCircle className="h-4 w-4 text-green-400" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Status Display */}
        {isUpdating && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <Icons.Loader className="h-5 w-5 animate-spin" style={{ color: visualConfig.colors.primary }} />
            <span className="text-sm">Updating your profile...</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="px-6 py-3 rounded-xl transition-colors disabled:opacity-50 font-medium"
            style={{
              backgroundColor: theme === 'light' ? '#e5e7eb' : '#374151',
              color: visualConfig.colors.text.primary
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};