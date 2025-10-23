/**
 * PHASE 4C: ONBOARDING LANDING PAGE
 *
 * Entry point when owner clicks email link with token parameter.
 *
 * Flow:
 * 1. Extract token from URL query params
 * 2. Call validation API endpoint
 * 3. On success: Set company info in store, auto-authenticate, redirect to wizard
 * 4. On error: Display error message with option to request new link
 *
 * URL: /onboarding?token=SESSION_TOKEN
 */

import React, { useEffect, useState } from 'react';
import { Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { useOnboardingStore } from '../stores/onboardingStore';
import { getSupabase } from '../services/supabase';

export const OnboardingLanding: React.FC = () => {
  const setCompanyInfo = useOnboardingStore(state => state.setCompanyInfo);

  const [status, setStatus] = useState<'validating' | 'success' | 'error'>('validating');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateToken = async () => {
      try {
        // Extract token from URL
        // TODO: [NATIVE-APP] URL query params using window.location
        // Current: new URLSearchParams(window.location.search).get('token')
        // Native React Native: Use deep linking with react-navigation
        //   - Configure linking prop in NavigationContainer
        //   - Define route: 'onboarding/:token'
        //   - Access via useRoute().params.token
        //   - Setup universal links (iOS) and app links (Android)
        // See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-4c-3
        // MIGRATION RISK: MEDIUM (deep linking config required)
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (!token) {
          setError('No onboarding token provided. Please use the link from your email.');
          setStatus('error');
          return;
        }

        console.log('[OnboardingLanding] Validating token...');

        // Call validation API
        const response = await fetch('/.netlify/functions/validate-onboarding-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('[OnboardingLanding] Validation failed:', data);
          setError(data.error || 'Invalid or expired token. Please request a new onboarding link.');
          setStatus('error');
          return;
        }

        console.log('[OnboardingLanding] Token validated successfully');

        // Extract session and company data
        const { session, company } = data;

        // Create Supabase session using the magic link
        const supabase = getSupabase();

        // TODO: [NATIVE-APP] Magic link URL parsing with window.location
        // Current: new URL(session.access_token) + searchParams for token extraction
        // Native React Native: Use expo-linking + Supabase auth callbacks
        //   - Setup deep link listener for auth/confirm path
        //   - Handle token_hash from email magic link
        //   - Configure Supabase redirect URLs for mobile app scheme
        // See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-4c-4
        // MIGRATION RISK: MEDIUM (auth flow changes required)

        // The action_link contains a complete magic link URL, extract the token
        const magicLinkUrl = new URL(session.access_token);
        const authToken = magicLinkUrl.searchParams.get('token');

        if (authToken) {
          const { error: authError } = await supabase.auth.verifyOtp({
            token_hash: authToken,
            type: 'magiclink'
          });

          if (authError) {
            console.error('[OnboardingLanding] Auth error:', authError);
            setError('Failed to authenticate. Please try again.');
            setStatus('error');
            return;
          }
        }

        // Store company info in onboarding store
        setCompanyInfo(company.id, company.name);

        setStatus('success');

        // Redirect to wizard after brief success message
        // App.tsx will detect authenticated user and check onboarding_completed status
        setTimeout(() => {
          window.location.reload();
        }, 1000);

      } catch (err: any) {
        console.error('[OnboardingLanding] Unexpected error:', err);
        setError(err.message || 'An unexpected error occurred. Please try again.');
        setStatus('error');
      }
    };

    validateToken();
  }, [navigate, setCompanyInfo]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">TradeSphere</h1>
          <p className="text-gray-600">AI-Powered Pricing Assistant</p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          {status === 'validating' && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-blue-100 p-4 rounded-full">
                  <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                Validating Your Session
              </h2>
              <p className="text-gray-600">
                Please wait while we verify your onboarding link...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-green-100 p-4 rounded-full">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                Verification Successful
              </h2>
              <p className="text-gray-600">
                Redirecting to onboarding wizard...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 p-4 rounded-full">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Verification Failed
              </h2>
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <div className="space-y-3">
                <p className="text-gray-600 text-sm">
                  Common issues:
                </p>
                <ul className="text-left text-sm text-gray-600 space-y-1 pl-4">
                  <li>• Token has already been used</li>
                  <li>• Link has expired (valid for 24 hours)</li>
                  <li>• Invalid or malformed token</li>
                </ul>
                <p className="text-gray-600 text-sm mt-4">
                  Please contact your account administrator to request a new onboarding link.
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          Secure onboarding powered by TradeSphere
        </p>
      </div>
    </div>
  );
};
