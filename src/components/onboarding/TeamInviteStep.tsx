/**
 * PHASE 4C: TEAM INVITE STEP
 *
 * Optional team member invitation step.
 *
 * Features:
 * - Add team members by email and role
 * - List of pending invitations (can remove before submit)
 * - Role selection dropdown
 * - Skip button for optional step
 * - Complete onboarding and send invitations
 * - Redirect to dashboard on completion
 *
 * Roles: Manager, Analyst, Sales, Field Tech
 */

import React, { useState } from 'react';
import { Users, Mail, UserPlus, X, Loader, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../../stores/onboardingStore';

export const TeamInviteStep: React.FC = () => {
  const navigate = useNavigate();

  const teamInvites = useOnboardingStore(state => state.teamInvites);
  const addTeamInvite = useOnboardingStore(state => state.addTeamInvite);
  const removeTeamInvite = useOnboardingStore(state => state.removeTeamInvite);
  const completeOnboarding = useOnboardingStore(state => state.completeOnboarding);
  const loading = useOnboardingStore(state => state.loading);
  const error = useOnboardingStore(state => state.error);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('sales');
  const [formError, setFormError] = useState<string | null>(null);

  const roleOptions = [
    { value: 'manager', label: 'Manager', description: 'Full access to all features' },
    { value: 'analyst', label: 'Analyst', description: 'View and analyze pricing data' },
    { value: 'sales', label: 'Sales', description: 'Create quotes and manage customers' },
    { value: 'field_tech', label: 'Field Technician', description: 'View job details and updates' }
  ];

  const handleAddInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError('Please enter a valid email address');
      return;
    }

    // Add to store
    addTeamInvite(email.trim().toLowerCase(), role);

    // Reset form on success (check if no error was set by store)
    setTimeout(() => {
      const currentError = useOnboardingStore.getState().error;
      if (!currentError) {
        setEmail('');
        setRole('sales');
      } else {
        setFormError(currentError);
      }
    }, 100);
  };

  const handleComplete = async () => {
    const success = await completeOnboarding();

    if (success) {
      // Redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    }
  };

  const handleSkip = async () => {
    // Complete onboarding without invites
    const success = await completeOnboarding();

    if (success) {
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-6 border-b border-gray-200">
        <div className="flex justify-center mb-4">
          <div className="bg-green-100 p-3 rounded-full">
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          Invite Your Team
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Add team members now or skip and invite them later from settings.
          Invited members will receive an email to join your workspace.
        </p>
      </div>

      {/* Error Messages */}
      {(error || formError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error || formError}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-blue-700 font-medium">Completing onboarding...</p>
          <p className="text-sm text-blue-600 mt-1">
            {teamInvites.length > 0
              ? `Sending ${teamInvites.length} invitation${teamInvites.length > 1 ? 's' : ''}...`
              : 'Setting up your workspace...'}
          </p>
        </div>
      )}

      {!loading && (
        <>
          {/* Add Team Member Form */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add Team Member
            </h3>

            <form onSubmit={handleAddInvite} className="space-y-4">
              {/* Email Input */}
              <div>
                <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="team@example.com"
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    style={{ minHeight: '48px' }}
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  id="invite-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ minHeight: '48px' }}
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add Button */}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                style={{ minHeight: '48px' }}
              >
                <UserPlus className="w-5 h-5" />
                Add Team Member
              </button>
            </form>
          </div>

          {/* Invitations List */}
          {teamInvites.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Pending Invitations ({teamInvites.length})
              </h3>
              <div className="space-y-2">
                {teamInvites.map((invite, index) => {
                  const roleOption = roleOptions.find(r => r.value === invite.role);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
                          <Mail className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {invite.email}
                          </p>
                          <p className="text-sm text-gray-600">
                            {roleOption?.label}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeTeamInvite(invite.email)}
                        className="ml-3 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                        style={{ minWidth: '40px', minHeight: '40px' }}
                        title="Remove invitation"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-6 border-t border-gray-200">
            {teamInvites.length > 0 ? (
              <>
                <button
                  onClick={handleComplete}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
                  style={{ minHeight: '56px' }}
                >
                  <CheckCircle className="w-6 h-6" />
                  Send {teamInvites.length} Invitation{teamInvites.length > 1 ? 's' : ''} & Complete
                </button>
                <button
                  onClick={handleSkip}
                  className="w-full bg-white text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 border border-gray-300 transition-colors"
                  style={{ minHeight: '48px' }}
                >
                  Skip Invitations for Now
                </button>
              </>
            ) : (
              <button
                onClick={handleSkip}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                style={{ minHeight: '56px' }}
              >
                <CheckCircle className="w-6 h-6" />
                Complete Setup & Go to Dashboard
              </button>
            )}
          </div>

          {/* Optional Note */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>Note:</strong> You can invite team members anytime from your dashboard
              settings. Invitations will be sent via email with a secure setup link.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
