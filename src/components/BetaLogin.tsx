import React, { useState } from 'react';
import { Lock, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';

interface BetaLoginProps {
  onValidCode: (code: string, codeId: number) => void;
  onExistingUser: (firstName: string, betaCodeId: string) => Promise<void>;  // <-- Make async
}

const BetaLogin: React.FC<BetaLoginProps> = ({ onValidCode, onExistingUser }) => {
  const [mode, setMode] = useState<'beta_code' | 'existing_user'>('beta_code');
  const [betaCode, setBetaCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [betaCodeId, setBetaCodeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Format beta code input (auto-add dashes)
  const handleBetaCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Auto-format: BETA-XXXX-XXXX
    if (value.length > 4 && !value.includes('-')) {
      value = 'BETA-' + value.slice(4);
    }
    if (value.length > 9 && value.split('-').length === 2) {
      const parts = value.split('-');
      value = parts[0] + '-' + parts[1].slice(0, 4) + '-' + parts[1].slice(4);
    }
    
    setBetaCode(value);
    setError('');
  };

  const validateBetaCode = async () => {
    if (!betaCode || betaCode.length < 14) {
      setError('Please enter a valid beta code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Log environment variables to verify they're being picked up correctly
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      console.log('🔍 BETA_LOGIN - Environment check:', {
        supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING',
        supabaseKey: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'MISSING',
        betaCode: betaCode
      });
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('❌ BETA_LOGIN - Missing environment variables');
        setError('Application configuration error. Please contact support.');
        return;
      }

      // Check if beta code exists and is unused
      const fetchUrl = `${supabaseUrl}/rest/v1/beta_codes?code=eq.${betaCode}`;
      console.log('🌐 BETA_LOGIN - Making request to:', fetchUrl);
      
      const response = await fetch(fetchUrl, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 BETA_LOGIN - Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ BETA_LOGIN - Response not OK:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        throw new Error('Failed to validate beta code');
      }

      const codes = await response.json();
      console.log('✅ BETA_LOGIN - Received codes:', codes.length);
      
      if (codes.length === 0) {
        setError('Invalid beta code. Please check your code and try again.');
        return;
      }

      const code = codes[0];
      
      if (code.used) {
        setError('This beta code has already been used.');
        return;
      }

      if (new Date(code.expires_at) < new Date()) {
        setError('This beta code has expired.');
        return;
      }

      // Code is valid!
      console.log('🎉 BETA_LOGIN - Beta code validated successfully');
      setSuccess('Valid beta code! Proceeding to registration...');
      setTimeout(() => {
        onValidCode(betaCode, code.id);
      }, 1000);

    } catch (error) {
      console.error('❌ BETA_LOGIN - Validation error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause
      });
      setError('Failed to validate beta code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExistingUserLogin = async () => {
  if (!firstName || !betaCodeId) {
    setError('Please enter both first name and key number');
    return;
  }

  setLoading(true);
  setError('');

  try {
    // Log environment variables to verify they're being picked up correctly
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('🔍 BETA_LOGIN - Login environment check:', {
      supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING',
      supabaseKey: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'MISSING',
      firstName: firstName,
      betaCodeId: betaCodeId
    });
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ BETA_LOGIN - Missing environment variables for login');
      setError('Application configuration error. Please contact support.');
      return;
    }

    await onExistingUser(firstName, betaCodeId);  // <-- Add await here!
  } catch (error) {
    console.error('❌ BETA_LOGIN - Login error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    setError('login failed... did you get your beta code?');  // <-- Your custom message
  } finally {
    setLoading(false);
  }
};

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'beta_code') {
      validateBetaCode();
    } else {
      handleExistingUserLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">TradeSphere Beta</h1>
          <p className="text-gray-600 mt-2">Welcome to the private beta</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => {setMode('beta_code'); setError(''); setSuccess('');}}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'beta_code'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserPlus className="w-4 h-4 inline mr-2" />
            New User
          </button>
          <button
            type="button"
            onClick={() => {setMode('existing_user'); setError(''); setSuccess('');}}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'existing_user'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Lock className="w-4 h-4 inline mr-2" />
            Existing User
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {mode === 'beta_code' ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="betaCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Beta Access Code
                </label>
                <input
                  id="betaCode"
                  type="text"
                  value={betaCode}
                  onChange={handleBetaCodeChange}
                  placeholder="BETA-XXXX-XXXX"
                  maxLength={14}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center font-mono text-lg text-gray-900 placeholder-gray-500"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Enter your beta invitation code
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => {setFirstName(e.target.value); setError('');}}
                  placeholder="John"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="betaCodeId" className="block text-sm font-medium text-gray-700 mb-2">
                  Key Number
                </label>
                <input
                  id="betaCodeId"
                  type="text"
                  value={betaCodeId}
                  onChange={(e) => {setBetaCodeId(e.target.value); setError('');}}
                  placeholder="7"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  The number from your beta code registration
                </p>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
              <span className="text-green-700 text-sm">{success}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className={`w-full mt-6 py-3 px-4 rounded-md font-medium transition-colors ${
              loading || success
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {mode === 'beta_code' ? 'Validating Code...' : 'Signing In...'}
              </div>
            ) : (
              mode === 'beta_code' ? 'Validate Beta Code' : 'Sign In'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            TradeSphere Private Beta • Limited Access
          </p>
        </div>
      </div>
    </div>
  );
};

export default BetaLogin;