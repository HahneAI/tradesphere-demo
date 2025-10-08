import { useEffect, useState, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import AuthForm from './components/AuthForm';
import ChatInterface from './components/ChatInterface';
import LoadingScreen from './components/ui/LoadingScreen';
import { ThemeProvider } from './context/ThemeContext';
import { ThemeApplicator } from './components/ThemeApplicator';
import { useAppLoading } from './utils/loading-manager';
import { EnvironmentManager } from './config/defaults';
import { masterPricingEngine } from './pricing-system/core/calculations/master-pricing-engine';
import { useServiceBaseSettings } from './stores/serviceBaseSettingsStore';

// 🎯 DEBUG: Using centralized environment manager for debug logging
console.log('ENV TEST:', import.meta.env.VITE_TEST_VAR);
console.log('Company Name:', EnvironmentManager.getCompanyName());
console.log('Success Color:', EnvironmentManager.getSuccessColor());
console.log('ALL ENV:', import.meta.env);
console.log('🟢 APP.TSX - Component mounting (Supabase Auth)...');

type AppState = 'loading' | 'login' | 'authenticated';
type AnimationState = 'in' | 'out';

function App() {
  const { user, loading: authLoading } = useAuth();

  const [appState, setAppState] = useState<AppState>('loading');
  const [animationState, setAnimationState] = useState<AnimationState>('in');
  const [currentAppState, setCurrentAppState] = useState<AppState>(appState);
  const [isExitingLoading, setIsExitingLoading] = useState(false);

  // CRITICAL: Preload ALL service configurations on authentication
  // This ensures default values (like excavation depth) are available BEFORE components mount
  const { services, isLoading: servicesLoading, refreshServices } = useServiceBaseSettings(user?.company_id, user?.id);

  const isMinDurationPassed = useAppLoading();
  // Simple loading check - wait for BOTH auth and minimum duration
  const isLoading = authLoading || !isMinDurationPassed;

  const setAppStateWithAnimation = (newStage: AppState) => {
    setAnimationState('out');
    setTimeout(() => {
      setAppState(newStage);
      setCurrentAppState(newStage);
      setAnimationState('in');
    }, 400);
  };

  // Effect 1: Handle ONLY initial load transition
  useEffect(() => {
    document.title = 'TradeSphere - AI Pricing Assistant';

    if (!authLoading && isMinDurationPassed && appState === 'loading') {
      console.log('📍 Initial load complete');

      // CRITICAL: Clear all pricing caches on app startup to ensure fresh data
      console.log('🧹 [APP.TSX] Clearing all pricing caches on startup...');
      masterPricingEngine.clearAllCaches();

      // Note: localStorage is NOT cleared here - let stores manage their own persistence
      // - Sqft values persist across sessions (user convenience)
      // - Stores force fresh DB config loads when they mount
      // - This gives users persistent inputs while ensuring fresh defaults

      setIsExitingLoading(true);

      const timer = setTimeout(() => {
        const nextState = user ? 'authenticated' : 'login';
        console.log(`🔄 Transitioning to ${nextState} state`);
        setAppStateWithAnimation(nextState);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [authLoading, isMinDurationPassed, appState, user]);

  // Effect 3: Preload service configurations when user authenticates
  useEffect(() => {
    if (user?.company_id && appState === 'authenticated') {
      console.log('🔄 [APP.TSX] User authenticated - preloading all service configurations...');
      console.log('📊 [APP.TSX] Services loaded:', {
        count: services.length,
        serviceIds: services.map(s => s.serviceId),
        hasExcavation: services.some(s => s.serviceId === 'excavation_removal'),
        excavationDefaults: services.find(s => s.serviceId === 'excavation_removal')?.variables_config?.calculationSettings
      });
    }
  }, [user, appState, services]);

  // Effect 2: Handle ONLY auth changes AFTER initial load
  useEffect(() => {
    if (appState === 'loading') return;

    if (user && appState !== 'authenticated') {
      console.log('🔄 User logged in, transitioning to authenticated state');
      setAppStateWithAnimation('authenticated');
    } else if (!user && appState === 'authenticated') {
      console.log('🔄 User logged out, transitioning to login state');
      setAppStateWithAnimation('login');
    }
  }, [user, appState]);

  const animatedRender = (Component: React.ReactNode) => {
    const animationClass = animationState === 'in' ? 'animate-screen-in' : 'animate-screen-out';
    return (
      <div key={currentAppState} className={animationClass}>
        {Component}
      </div>
    );
  };

  // Render loading screen until ready
  if (appState === 'loading') {
    return <LoadingScreen isExiting={isExitingLoading} />;
  }

  const renderContent = () => {
    switch (appState) {
      case 'login':
        return animatedRender(<AuthForm />);

      case 'authenticated':
        if (user) {
          return animatedRender(
            <div>
              <div className="hidden">
                <p>Logged in as: {user.email} ({user.title})</p>
                <p>Role: {user.role}</p>
                <p>Admin: {user.is_admin ? 'Yes' : 'No'}</p>
                <p>Company ID: {user.company_id}</p>
              </div>
              <ChatInterface />
            </div>
          );
        }
        return null;

      default:
        return null;
    }
  };

  // Get background pattern class based on industry
  const getBackgroundPatternClass = () => {
    // 🎯 USING CENTRALIZED DEFAULTS: Safe fallback to TradeSphere tech defaults
    const industryType = import.meta.env.VITE_INDUSTRY_TYPE;
    const backgroundPattern = EnvironmentManager.getBackgroundPattern();

    // Check explicit background pattern setting first
    if (backgroundPattern === 'subtle_organic') return 'background-organic';
    if (backgroundPattern === 'technical_grid') return 'background-tech';
    if (backgroundPattern === 'blueprint') return 'background-tech';
    if (backgroundPattern === 'none') return '';

    // Fall back to industry defaults
    if (industryType === 'landscaping') return 'background-organic';
    if (industryType === 'hvac') return 'background-tech';

    // Default for TradeSphere
    return 'background-tech';
  };

  return (
    <ThemeProvider>
      <ThemeApplicator />
      <div className={`min-h-screen transition-colors duration-500 bg-background text-text-primary ${getBackgroundPatternClass()}`}>
        {renderContent()}
      </div>
    </ThemeProvider>
  );
}

export default App;
