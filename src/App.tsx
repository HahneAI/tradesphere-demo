import { useEffect, useState, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import AuthForm from './components/AuthForm';
import ChatInterface from './components/ChatInterface';
import LoadingScreen from './components/ui/LoadingScreen';
import { ThemeProvider } from './context/ThemeContext';
import { ThemeApplicator } from './components/ThemeApplicator';
import { useAppLoading } from './utils/loading-manager';
import { EnvironmentManager } from './config/defaults';

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

  // Single effect for ALL state transitions
  useEffect(() => {
    document.title = 'TradeSphere - AI Pricing Assistant';

    console.log('🔍 [APP] useEffect triggered:', {
      isLoading,
      authLoading,
      isMinDurationPassed,
      appState,
      hasUser: !!user,
      userEmail: user?.email
    });

    // Handle initial load complete
    if (!isLoading && appState === 'loading') {
      console.log('📍 Initial load complete, transitioning from loading screen');
      setIsExitingLoading(true);

      const timer = setTimeout(() => {
        if (user) {
          console.log('✅ User session found, going to authenticated state');
          setAppStateWithAnimation('authenticated');
        } else {
          console.log('🔐 No user session, going to login state');
          setAppStateWithAnimation('login');
        }
      }, 500);

      return () => clearTimeout(timer);
    }

    // Handle auth changes AFTER initial load
    if (!isLoading && appState !== 'loading') {
      console.log('🔍 [APP] Checking post-load auth state:', { user: !!user, appState });
      if (user && appState !== 'authenticated') {
        console.log('🔄 User logged in, transitioning to authenticated state');
        setAppStateWithAnimation('authenticated');
      } else if (!user && appState === 'authenticated') {
        console.log('🔄 User logged out, transitioning to login state');
        setAppStateWithAnimation('login');
      }
    }
  }, [isLoading, user, appState, authLoading, isMinDurationPassed]);

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
