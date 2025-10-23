import { useState, useEffect } from 'react';

const LOADING_DURATION = 2500; // 2.5s to showcase dramatic industry animations

interface LoadingConfig {
  duration?: number;
  animation?: 'fade' | 'slide' | 'custom';
  customComponent?: React.ComponentType;
}

/**
 * Custom hook to manage the initial application loading state.
 * It enforces a minimum loading duration to prevent jarring flashes.
 * @param {LoadingConfig} config - Configuration for the loading behavior.
 * @returns {boolean} - Returns true if the app is currently in the initial loading state.
 */
export const useAppLoading = (config: LoadingConfig = {}): boolean => {
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    // Add safety check for bolt.new environment
    if (typeof window !== 'undefined' && window.setTimeout) {
      const timer = window.setTimeout(() => {
        setIsAppLoading(false);
      }, config.duration || LOADING_DURATION);

      return () => {
        if (window.clearTimeout) {
          window.clearTimeout(timer);
        }
      };
    } else {
      // Fallback for environments without proper timer support
      setIsAppLoading(false);
    }
  }, [config.duration]);

  return isAppLoading;
};