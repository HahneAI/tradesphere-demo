/**
 * PHASE 4C: ONBOARDING WIZARD
 *
 * Main container component for 4-step onboarding flow.
 *
 * Features:
 * - Progress bar with step indicators
 * - Step navigation (Next/Back buttons)
 * - Responsive mobile-first layout
 * - Auto-save form data to store
 * - Handles wizard completion and redirect
 *
 * Steps:
 * 0. Welcome - Introduction and overview
 * 1. AI Personality - Configure pricing assistant
 * 2. Branding - Company logo and colors
 * 3. Team Invites - Optional team member invitations
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useOnboardingStore, STEP_NAMES } from '../../stores/onboardingStore';
import { WelcomeStep } from './WelcomeStep';
import { AIPersonalityStep } from './AIPersonalityStep';
import { BrandingStep } from './BrandingStep';
import { TeamInviteStep } from './TeamInviteStep';

export const OnboardingWizard: React.FC = () => {
  const navigate = useNavigate();

  const currentStep = useOnboardingStore(state => state.currentStep);
  const nextStep = useOnboardingStore(state => state.nextStep);
  const prevStep = useOnboardingStore(state => state.prevStep);
  const companyName = useOnboardingStore(state => state.companyName);

  // Redirect if no company info (should come from OnboardingLanding)
  React.useEffect(() => {
    if (!companyName) {
      console.warn('[OnboardingWizard] No company info found, redirecting to login');
      navigate('/');
    }
  }, [companyName, navigate]);

  // Calculate progress percentage
  const progressPercent = ((currentStep + 1) / 4) * 100;

  // Render current step component
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep />;
      case 1:
        return <AIPersonalityStep />;
      case 2:
        return <BrandingStep />;
      case 3:
        return <TeamInviteStep />;
      default:
        return <WelcomeStep />;
    }
  };

  const canGoBack = currentStep > 0;
  const canGoNext = currentStep < 3;

  // TODO: [NATIVE-APP] CSS gradient background
  // Current: Tailwind bg-gradient-to-br from-blue-50 to-indigo-100
  // Native React Native: Use expo-linear-gradient
  //   - <LinearGradient colors={['#EFF6FF', '#E0E7FF']} />
  //   - Wrap in SafeAreaView for iPhone notch support
  // See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-4c-5
  // MIGRATION RISK: LOW (simple component replacement)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="text-center mb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Welcome to TradeSphere
          </h1>
          {companyName && (
            <p className="text-lg text-gray-600">{companyName}</p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of 4
            </span>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(progressPercent)}% Complete
            </span>
          </div>

          {/* Progress bar track */}
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Step indicators */}
          <div className="flex justify-between items-center">
            {[0, 1, 2, 3].map((step) => (
              <div
                key={step}
                className="flex flex-col items-center flex-1"
              >
                <div
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                    step < currentStep
                      ? 'bg-green-500 text-white'
                      : step === currentStep
                      ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {step < currentStep ? '✓' : step + 1}
                </div>
                <span
                  className={`text-xs mt-2 text-center hidden md:block ${
                    step === currentStep
                      ? 'text-gray-800 font-semibold'
                      : 'text-gray-600'
                  }`}
                >
                  {STEP_NAMES[step as 0 | 1 | 2 | 3]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 min-h-[500px]">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-6 gap-4">
          <button
            onClick={prevStep}
            disabled={!canGoBack}
            className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-lg font-medium transition-all ${
              canGoBack
                ? 'bg-white text-gray-700 hover:bg-gray-50 shadow-md hover:shadow-lg'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            style={{ minWidth: '120px', minHeight: '44px' }}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <button
            onClick={nextStep}
            disabled={!canGoNext}
            className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-lg font-medium transition-all ${
              canGoNext
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            style={{ minWidth: '120px', minHeight: '44px' }}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto mt-8 text-center">
        <p className="text-sm text-gray-600">
          Need help? Contact support@tradesphere.com
        </p>
      </div>
    </div>
  );
};
