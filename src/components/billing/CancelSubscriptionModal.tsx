/**
 * CancelSubscriptionModal Component
 *
 * Confirmation dialog for subscription cancellation with:
 * - Warning about access retention until billing period end
 * - Optional cancellation reason dropdown
 * - Double confirmation to prevent accidental cancellations
 * - Loading state during API call
 * - Success/error feedback
 *
 * Mobile-optimized with 44px touch targets and responsive layout.
 */

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { getSupabase } from '../../services/supabase';
import {
  CancellationReason,
  CompanyBilling,
  CancelSubscriptionRequest
} from '../../types/billing';

interface CancelSubscriptionModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Current company billing data */
  billing: CompanyBilling;
  /** Callback when subscription canceled successfully */
  onSuccess: () => void;
}

export const CancelSubscriptionModal: React.FC<CancelSubscriptionModalProps> = ({
  isOpen,
  onClose,
  billing,
  onSuccess
}) => {
  const [reason, setReason] = useState<CancellationReason | ''>('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setFeedback('');
      setError(null);
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate end date (next billing date or trial end date)
  const endDate = billing.next_billing_date || billing.trial_end_date;

  const handleCancel = async () => {
    // TODO: [NATIVE-APP] window.confirm() is web-only browser API
    // Current: window.confirm() returns boolean synchronously
    // Native React Native: Use Alert.alert() with callback buttons
    //   Alert.alert('Cancel Subscription', message, [
    //     { text: 'Keep Subscription', style: 'cancel' },
    //     { text: 'Cancel Subscription', style: 'destructive', onPress: handleCancel }
    //   ])
    // Native iOS: UIAlertController with destructive action style
    // Native Android: AlertDialog with positive/negative buttons
    // See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-4d-2
    // MIGRATION RISK: LOW (simple API replacement)

    // Double confirmation
    const confirmed = window.confirm(
      `Are you sure you want to cancel your subscription?\n\n` +
      `Your access will continue until ${endDate ? new Date(endDate).toLocaleDateString() : 'the end of your billing period'}.`
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call Netlify function
      const response = await fetch('/.netlify/functions/cancel-subscription', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company_id: billing.id,
          reason: reason || CancellationReason.OTHER,
          feedback: feedback || undefined,
          immediate: false // Cancel at period end
        } as CancelSubscriptionRequest)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Cancellation failed');
      }

      // Success
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2500);

    } catch (err: any) {
      console.error('Subscription cancellation error:', err);
      setError(err.message || 'Cancellation failed. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-200">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
            <Icons.AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-red-600" />
            Cancel Subscription
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
            style={{ minHeight: '44px', minWidth: '44px' }}
            aria-label="Close subscription cancellation modal"
            type="button"
          >
            <Icons.X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 md:p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {success ? (
            // Success State
            <div className="text-center py-8" role="status" aria-live="polite">
              <div className="relative inline-block mb-4">
                <Icons.CheckCircle className="h-16 w-16 text-green-600 animate-bounce" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">Subscription Canceled</h4>
              <p className="text-sm text-gray-600">
                Your subscription has been canceled. You'll continue to have access until {endDate ? new Date(endDate).toLocaleDateString() : 'the end of your billing period'}.
              </p>
            </div>
          ) : (
            // Form State
            <div className="space-y-4">
              {/* Warning Message */}
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 md:p-4 rounded-r">
                <div className="flex items-start gap-2">
                  <Icons.AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-yellow-700 font-medium mb-1">
                      Your subscription will remain active until {endDate ? new Date(endDate).toLocaleDateString() : 'the end of your billing period'}
                    </p>
                    <p className="text-xs text-yellow-600">
                      You will not be charged after this date. You can reactivate your subscription anytime.
                    </p>
                  </div>
                </div>
              </div>

              {/* Reason Dropdown */}
              <div>
                <label htmlFor="cancellation-reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Why are you canceling? <span className="text-gray-500">(Optional)</span>
                </label>
                <select
                  id="cancellation-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value as CancellationReason)}
                  className="w-full border border-gray-300 rounded-md py-2.5 px-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ minHeight: '44px', fontSize: '16px' }}
                  disabled={loading}
                  aria-label="Select cancellation reason"
                >
                  <option value="">Select a reason</option>
                  <option value={CancellationReason.TOO_EXPENSIVE}>Too expensive</option>
                  <option value={CancellationReason.MISSING_FEATURES}>Missing features I need</option>
                  <option value={CancellationReason.POOR_PERFORMANCE}>Performance issues</option>
                  <option value={CancellationReason.SWITCHING_COMPETITOR}>Switching to competitor</option>
                  <option value={CancellationReason.BUSINESS_CLOSED}>Business closed</option>
                  <option value={CancellationReason.SEASONAL}>Seasonal business pause</option>
                  <option value={CancellationReason.OTHER}>Other</option>
                </select>
              </div>

              {/* Optional Feedback */}
              <div>
                <label htmlFor="cancellation-feedback" className="block text-sm font-medium text-gray-700 mb-2">
                  Additional feedback <span className="text-gray-500">(Optional)</span>
                </label>
                <textarea
                  id="cancellation-feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full border border-gray-300 rounded-md py-2.5 px-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  style={{ fontSize: '16px' }}
                  rows={3}
                  placeholder="Tell us more about your decision..."
                  disabled={loading}
                  aria-label="Additional cancellation feedback"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-r">
                  <div className="flex items-start gap-2">
                    <Icons.XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
                  style={{ minHeight: '44px' }}
                >
                  {loading ? (
                    <>
                      <Icons.Loader className="h-4 w-4 animate-spin" />
                      Canceling...
                    </>
                  ) : (
                    <>
                      <Icons.XCircle className="h-4 w-4" />
                      Confirm Cancellation
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                  style={{ minHeight: '44px' }}
                >
                  Keep Subscription
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
