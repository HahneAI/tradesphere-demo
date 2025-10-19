/**
 * UpdatePaymentMethodModal Component
 *
 * Modal for verifying micro-deposits sent to customer's bank account.
 * Dwolla sends two small deposits (typically $0.01 - $0.10 each) that
 * customers must verify to complete bank account verification.
 *
 * Features:
 * - Two number inputs for deposit amounts (with $ prefix)
 * - Form validation (required, 2 decimal places, $0.01 - $0.10 range)
 * - Loading state during API call
 * - Error display if verification fails
 * - Success message with auto-close
 * - Mobile-optimized with 44px touch targets
 */

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { getSupabase } from '../../services/supabase';
import { CompanyBilling, VerifyMicroDepositsRequest } from '../../types/billing';

interface UpdatePaymentMethodModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Current company billing data */
  billing: CompanyBilling;
  /** Callback when verification successful */
  onSuccess: () => void;
}

export const UpdatePaymentMethodModal: React.FC<UpdatePaymentMethodModalProps> = ({
  isOpen,
  onClose,
  billing,
  onSuccess
}) => {
  const [amount1, setAmount1] = useState('');
  const [amount2, setAmount2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount1('');
      setAmount2('');
      setError(null);
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerify = async () => {
    // Validation
    if (!amount1 || !amount2) {
      setError('Please enter both deposit amounts');
      return;
    }

    const amt1 = parseFloat(amount1);
    const amt2 = parseFloat(amount2);

    if (isNaN(amt1) || isNaN(amt2)) {
      setError('Please enter valid amounts');
      return;
    }

    if (amt1 < 0.01 || amt1 > 0.10 || amt2 < 0.01 || amt2 > 0.10) {
      setError('Amounts must be between $0.01 and $0.10');
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

      // TODO: [NATIVE-APP] Netlify Functions use relative URLs
      // Current: fetch('/.netlify/functions/verify-microdeposits')
      // Native: fetch(`${API_BASE_URL}/verify-microdeposits`)
      //   where API_BASE_URL = 'https://app.tradesphere.com/.netlify/functions'
      // Options:
      //   1. Keep Netlify, use absolute URLs (recommended)
      //   2. Migrate to Supabase Edge Functions (future-proof)
      // See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-4d-1
      // MIGRATION RISK: LOW (URL change only)

      // Call Netlify function
      const response = await fetch('/.netlify/functions/verify-microdeposits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company_id: billing.id,
          funding_source_id: billing.dwolla_funding_source_id,
          amount1: Math.round(amt1 * 100), // Convert to cents
          amount2: Math.round(amt2 * 100)
        } as VerifyMicroDepositsRequest)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Verification failed');
      }

      // Success
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('Micro-deposit verification error:', err);
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // TODO: [NATIVE-APP] Modal backdrop dismissal uses web MouseEvent
  // Current: e.target === e.currentTarget pattern for backdrop click detection
  // Native React Native: Use Modal component with TouchableWithoutFeedback
  //   <Modal visible={isOpen} transparent animationType="fade">
  //     <TouchableWithoutFeedback onPress={onClose}>
  //       <BlurView intensity={80} style={styles.backdrop}>
  //         <Pressable onPress={(e) => e.stopPropagation()}>
  //           {/* Modal content */}
  //         </Pressable>
  //       </BlurView>
  //     </TouchableWithoutFeedback>
  //   </Modal>
  // Native iOS: .sheet() with automatic backdrop dismissal
  // Native Android: Dialog(onDismissRequest = { onClose() })
  // See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-4d-5
  // MIGRATION RISK: LOW (React Native Modal handles natively)
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
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
            <Icons.Building2 className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
            Verify Bank Account
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            style={{ minHeight: '44px', minWidth: '44px' }}
            aria-label="Close bank account verification modal"
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
              <h4 className="text-xl font-bold text-gray-900 mb-2">Verification Successful!</h4>
              <p className="text-sm text-gray-600">
                Your bank account has been verified and is ready for payments.
              </p>
            </div>
          ) : (
            // Form State
            <div className="space-y-4">
              {/* Instructions */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 md:p-4 rounded-r">
                <div className="flex items-start gap-2">
                  <Icons.Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-blue-700">
                      Check your bank statement for two small deposits from Dwolla. Enter the exact amounts below to verify your account.
                    </p>
                  </div>
                </div>
              </div>

              {/* TODO: [NATIVE-APP] Number input with decimal precision
                  Current: HTML5 <input type="number" step="0.01"> with browser validation
                  Native React Native: Use TextInput with keyboardType="decimal-pad"
                  - Implement custom formatCurrencyInput() helper to:
                    1. Remove non-numeric characters except decimal
                    2. Limit to one decimal point
                    3. Limit to 2 decimal places
                  - Replace <span> prefix with positioned Text component
                  - Validate on submit: parseFloat() + range check (0.01-0.10)
                  Reusable CurrencyInput component recommended for consistency
                  See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-4d-6
                  MIGRATION RISK: MEDIUM (custom decimal formatting required) */}
              {/* Amount Input 1 */}
              <div>
                <label htmlFor="deposit-amount-1" className="block text-sm font-medium text-gray-700 mb-1">
                  First Deposit Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500 pointer-events-none">$</span>
                  <input
                    id="deposit-amount-1"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="0.10"
                    value={amount1}
                    onChange={(e) => setAmount1(e.target.value)}
                    className="pl-7 w-full border border-gray-300 rounded-md py-2.5 px-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    style={{ minHeight: '44px', fontSize: '16px' }}
                    placeholder="0.05"
                    disabled={loading}
                    required
                    aria-label="First micro-deposit amount in dollars"
                    aria-required="true"
                  />
                </div>
              </div>

              {/* Amount Input 2 */}
              <div>
                <label htmlFor="deposit-amount-2" className="block text-sm font-medium text-gray-700 mb-1">
                  Second Deposit Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500 pointer-events-none">$</span>
                  <input
                    id="deposit-amount-2"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="0.10"
                    value={amount2}
                    onChange={(e) => setAmount2(e.target.value)}
                    className="pl-7 w-full border border-gray-300 rounded-md py-2.5 px-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    style={{ minHeight: '44px', fontSize: '16px' }}
                    placeholder="0.12"
                    disabled={loading}
                    required
                    aria-label="Second micro-deposit amount in dollars"
                    aria-required="true"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-r">
                  <div className="flex items-start gap-2">
                    <Icons.AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleVerify}
                  disabled={loading || !amount1 || !amount2}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
                  style={{ minHeight: '44px' }}
                >
                  {loading ? (
                    <>
                      <Icons.Loader className="h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Icons.CheckCircle className="h-4 w-4" />
                      Verify Amounts
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                  style={{ minHeight: '44px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
