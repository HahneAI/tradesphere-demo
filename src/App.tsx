import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import BetaLogin from './components/BetaLogin';
import OnboardingForm from './components/OnboardingForm';
import ChatInterface from './components/ChatInterface';
import LoadingScreen from './components/ui/LoadingScreen';
import { ThemeProvider } from './context/ThemeContext';
import { ThemeApplicator } from './components/ThemeApplicator';
import { useAppLoading } from './utils/loading-manager';

console.log('ENV TEST:', import.meta.env.VITE_TEST_VAR);
console.log('Company Name:', import.meta.env.VITE_COMPANY_NAME);
console.log('Success Color:', import.meta.env.VITE_SUCCESS_COLOR);
console.log('ALL ENV:', import.meta.env);
console.log('🟢 APP.TSX - Component mounting...');

type AppState = 'loading' | 'login' | 'onboarding' | 'confirmation' | 'authenticated';
type AnimationState = 'in' | 'out';

function App() {
  const { user, loading: authLoading, registerBetaUser, signInBetaUser, completeRegistration } = useAuth();

  const [appState, setAppState] = useState<AppState>('loading');
  const [animationState, setAnimationState] = useState<AnimationState>('in');
  const [currentAppState, setCurrentAppState] = useState<AppState>(appState);

  const [isExitingLoading, setIsExitingLoading] = useState(false);
  const [validBetaCode, setValidBetaCode] = useState<string>('');
  const [betaCodeId, setBetaCodeId] = useState<number>(0);
  const [registrationError, setRegistrationError] = useState('');
  const [newUserData, setNewUserData] = useState<any>(null);

  const isMinDurationPassed = useAppLoading();
  const isLoading = authLoading || isMinDurationPassed;

  const setAppStateWithAnimation = (newStage: AppState) => {
    setAnimationState('out');
    setTimeout(() => {
      setAppState(newStage);
      setCurrentAppState(newStage);
      setAnimationState('in');
    }, 400); // Corresponds to the fade-out animation duration
  };

  useEffect(() => {
    document.title = 'TradeSphere - AI Pricing Assistant';

    if (!isLoading) {
      setIsExitingLoading(true);
      const timer = setTimeout(() => {
        if (user) {
          setAppStateWithAnimation('authenticated');
        } else {
          setAppStateWithAnimation('login');
        }
      }, 500); // Corresponds to the fade-out animation duration

      return () => clearTimeout(timer);
    }
  }, [isLoading, user]);

  const handleValidBetaCode = (code: string, codeId: number) => {
    setValidBetaCode(code);
    setBetaCodeId(codeId);
    setAppStateWithAnimation('onboarding');
  };

  const handleExistingUserLogin = async (firstName: string, betaCodeId: string) => {
    const result = await signInBetaUser(firstName, betaCodeId);
    if (result.success) {
      setAppStateWithAnimation('authenticated');
    } else {
      console.error('Login failed:', result.error);
      throw new Error('login failed... did you get your beta code?');
    }
  };

  const handleOnboardingComplete = async (userData: {
    firstName: string;
    jobTitle: string;
    email: string;
  }) => {
    setRegistrationError('');
    
    const result = await registerBetaUser(userData, validBetaCode, betaCodeId);
    
    if (result.success && result.userData) {
      setNewUserData({
        firstName: userData.firstName,
        betaCodeId: betaCodeId,
        jobTitle: userData.jobTitle,
        fullUserData: result.userData
      });
      setAppStateWithAnimation('confirmation');
    } else {
      setRegistrationError(result.error || 'Registration failed');
      console.error('Registration failed:', result.error);
    }
  };

  const handleConfirmationComplete = () => {
    if (newUserData && newUserData.fullUserData) {
      completeRegistration(newUserData.fullUserData);
      setAppStateWithAnimation('authenticated');
    }
  };

  const animatedRender = (Component: React.ReactNode) => {
    const animationClass = animationState === 'in' ? 'animate-screen-in' : 'animate-screen-out';
    return (
      <div key={currentAppState} className={animationClass}>
        {Component}
      </div>
    );
  };

  // Render loading screen until ready and not exiting
  if (appState === 'loading') {
    return <LoadingScreen isExiting={isExitingLoading} />;
  }

  const renderContent = () => {
    switch (appState) {
      case 'login':
        return animatedRender(<BetaLogin onValidCode={handleValidBetaCode} onExistingUser={handleExistingUserLogin} />);

      case 'onboarding':
        return animatedRender(
          <div>
            <OnboardingForm betaCode={validBetaCode} betaCodeId={betaCodeId} onComplete={handleOnboardingComplete} />
            {registrationError && (
              <div className="fixed bottom-4 right-4 p-4 bg-red-50 border border-red-200 rounded-lg shadow-lg max-w-sm">
                <p className="text-red-700 text-sm">{registrationError}</p>
                <button onClick={() => setRegistrationError('')} className="text-red-500 hover:text-red-700 text-xs underline mt-1">
                  Dismiss
                </button>
              </div>
            )}
          </div>
        );

      case 'confirmation':
        if (newUserData) {
          return animatedRender(
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
              <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Account Created Successfully!</h1>
                <p className="text-gray-600 mb-6">Welcome to TradeSphere, {newUserData.firstName}!</p>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                  <h2 className="text-sm font-medium text-blue-800 mb-3">Your Login Credentials:</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Username:</span>
                      <span className="font-mono text-blue-900 font-semibold">{newUserData.firstName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Password:</span>
                      <span className="font-mono text-blue-900 font-semibold">{newUserData.betaCodeId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Role:</span>
                      <span className="text-blue-900">{newUserData.jobTitle}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-6">
                  Save these credentials - you'll need them to log back in later.
                </p>
                <button
                  onClick={handleConfirmationComplete}
                  className="w-full py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  "Yes, I wrote my number down"
                </button>
              </div>
            </div>
          );
        }
        return null;

      case 'authenticated':
        if (user) {
          return animatedRender(
            <div>
              <div className="hidden">
                <p>Logged in as: {user.full_name} ({user.job_title})</p>
                <p>First Name: {user.first_name}</p>
                <p>Tech UUID: {user.tech_uuid}</p>
                <p>Beta Code: {user.beta_code_used} (ID: {user.beta_code_id})</p>
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

  return (
    <ThemeProvider>
      <ThemeApplicator />
      <div className="min-h-screen transition-colors duration-500 bg-background text-text-primary">
        {renderContent()}
      </div>
    </ThemeProvider>
  );
}

export default App;