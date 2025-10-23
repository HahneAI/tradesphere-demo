import {
  adjustColorForDarkMode,
  getContrastText,
  adjustBrightness,
} from '../utils/colors';
import { EnvironmentManager } from './defaults';

// SECTION 1: TYPE DEFINITIONS
interface ThemeColorPair {
  light: string;
  dark: string;
}

interface ContrastSet {
  onPrimary: string;
  onSecondary: string;
}

export interface SmartColorSystem {
  primary: ThemeColorPair;
  secondary: ThemeColorPair;
  accent: ThemeColorPair;
  success: ThemeColorPair;
  text: {
    light: {
      primary: string;
      secondary: string;
    };
    dark: {
      primary: string;
      secondary: string;
    };
  };
  surfaces: {
    light: {
      background: string;
      surface: string;
      elevated: string;
    };
    dark: {
      background: string;
      surface: string;
      elevated: string;
    };
  };
  contrast: {
    light: ContrastSet;
    dark: ContrastSet;
  };
}

// SECTION 2: SMART COLOR SYSTEM CREATION

export const createSmartColorSystem = (
  brandPrimary: string,
  brandSecondary?: string,
  brandAccent?: string
): SmartColorSystem => {
  // Define base colors, using brand colors if provided, otherwise use defaults.
  const primaryLight = brandPrimary;
  const secondaryLight = brandSecondary || adjustBrightness(primaryLight, -15);
  const accentLight = brandAccent || adjustBrightness(primaryLight, 15);

  // Generate dark mode variants.
  const primaryDark = adjustColorForDarkMode(primaryLight);
  const secondaryDark = adjustColorForDarkMode(secondaryLight);
  const accentDark = adjustColorForDarkMode(accentLight);

  // 🎯 USING CENTRALIZED DEFAULTS: Safe fallback to TradeSphere tech defaults
  const successLight = EnvironmentManager.getSuccessColor();

  return {
    primary: {
      light: primaryLight,
      dark: primaryDark,
    },
    secondary: {
      light: secondaryLight,
      dark: secondaryDark,
    },
    accent: {
      light: accentLight,
      dark: accentDark,
    },
    success: {
      light: successLight,
      dark: adjustColorForDarkMode(successLight),
    },
    text: {
      light: {
        primary: '#1f2937',   // Very dark gray for high contrast on light backgrounds
        secondary: '#6b7280', // Medium gray for less emphasis
      },
      dark: {
        primary: '#f9fafb',   // Very light gray for high contrast on dark backgrounds
        secondary: '#d1d5db', // Lighter gray for less emphasis
      },
    },
    surfaces: {
      light: {
        background: '#f8fafc', // Very light gray (almost white)
        surface: '#ffffff',    // Pure white for cards, headers
        elevated: '#ffffff',   // Pure white for modals, pop-ups
      },
      dark: {
        background: '#0f172a', // Very dark blue-gray
        surface: '#1e293b',    // Dark blue-gray for cards, headers
        elevated: '#334155',   // Slightly lighter for modals, pop-ups
      },
    },
    contrast: {
      light: {
        onPrimary: getContrastText(primaryLight),
        onSecondary: getContrastText(secondaryLight),
      },
      dark: {
        onPrimary: getContrastText(primaryDark),
        onSecondary: getContrastText(secondaryDark),
      },
    },
  };
};
