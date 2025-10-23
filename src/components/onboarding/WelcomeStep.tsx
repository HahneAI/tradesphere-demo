/**
 * PHASE 4C: WELCOME STEP
 *
 * First step of onboarding wizard.
 *
 * Content:
 * - Personalized welcome message with company name
 * - Overview of what to expect in onboarding
 * - Benefits and timeline (3 minutes to complete)
 * - Call-to-action to begin setup
 *
 * No form fields - informational only.
 */

import React from 'react';
import { Sparkles, Palette, Users, CheckCircle } from 'lucide-react';
import { useOnboardingStore } from '../../stores/onboardingStore';

export const WelcomeStep: React.FC = () => {
  const companyName = useOnboardingStore(state => state.companyName);
  const nextStep = useOnboardingStore(state => state.nextStep);

  const benefits = [
    {
      icon: Sparkles,
      title: 'AI-Powered Pricing',
      description: 'Configure your AI assistant to match your sales style and industry expertise'
    },
    {
      icon: Palette,
      title: 'Custom Branding',
      description: 'Add your logo and brand colors to create a professional experience'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Invite your team members and manage roles for seamless workflow'
    }
  ];

  const steps = [
    'Configure your AI pricing assistant personality',
    'Customize your company branding',
    'Invite team members (optional)',
    'Start creating quotes and managing customers'
  ];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="text-center pb-6 border-b border-gray-200">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
          Welcome to TradeSphere, {companyName}!
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Let's get your pricing assistant set up. This should take about 3 minutes.
        </p>
      </div>

      {/* What to Expect */}
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          What to Expect
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100"
              >
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">
                  {benefit.title}
                </h4>
                <p className="text-sm text-gray-600">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Setup Steps */}
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          Your Setup Journey
        </h3>
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <p className="text-gray-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits Callout */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-green-900 mb-2">
              You're in control
            </h4>
            <p className="text-sm text-green-800">
              You can customize all these settings later from your dashboard.
              This onboarding is just to get you started quickly.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="pt-4">
        <button
          onClick={nextStep}
          className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
          style={{ minHeight: '56px' }}
        >
          Let's Get Started
        </button>
      </div>

      {/* Footer Note */}
      <p className="text-center text-sm text-gray-500 pt-2">
        All settings can be changed later from your account settings
      </p>
    </div>
  );
};
