import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../config/industry';

/**
 * This component is responsible for applying the current theme's CSS variables to the root element.
 * It listens for theme changes and updates the CSS variables accordingly.
 */
export function ThemeApplicator() {
  const { theme } = useTheme();

  useEffect(() => {
    const visualConfig = getSmartVisualThemeConfig(theme);

    // Set root CSS variables for colors
    const root = document.documentElement;
    root.style.setProperty('--primary-color', visualConfig.colors.primary);
    root.style.setProperty('--secondary-color', visualConfig.colors.secondary);
    root.style.setProperty('--accent-color', visualConfig.colors.accent);
    root.style.setProperty('--success-color', visualConfig.colors.success);
    root.style.setProperty('--background-color', visualConfig.colors.background);
    root.style.setProperty('--surface-color', visualConfig.colors.surface);
    root.style.setProperty('--elevated-color', visualConfig.colors.elevated);
    root.style.setProperty('--text-primary-color', visualConfig.colors.text.primary);
    root.style.setProperty('--text-secondary-color', visualConfig.colors.text.secondary);
    root.style.setProperty('--text-on-primary-color', visualConfig.colors.text.onPrimary);
    root.style.setProperty('--text-on-secondary-color', visualConfig.colors.text.onSecondary);

  }, [theme]);

  return null; // This component does not render anything
}
