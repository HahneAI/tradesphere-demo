/**
 * UpdatePaymentMethodModal Component
 *
 * Modal for updating bank account via Plaid Link integration.
 * Plaid handles instant bank verification and creates a Stripe PaymentMethod.
 * No micro-deposits needed - verification is instant via Plaid + Stripe.
 *
 * Features:
 * - "Update Payment Method" button opens Plaid Link
 * - Plaid Link returns Stripe PaymentMethod ID
 * - API call updates company payment method
 * - Loading state during API call
 * - Error display if update fails
 * - Success message with auto-close
 * - Mobile-optimized with 44px touch targets
 */

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { getSupabase } from '../../services/supabase';
import { CompanyBilling } from '../../types/billing';
import { VisualThemeConfig } from '../../config/industry';

interface UpdatePaymentMethodModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Current company billing data */
  billing: CompanyBilling;
  /** Callback when payment method updated successfully */
  onSuccess: () => void;
  /** Visual theme configuration */
  visualConfig: VisualThemeConfig;
  /** Theme mode (light/dark) */
  theme: 'light' | 'dark';
}

export const UpdatePaymentMethodModal: React.FC<UpdatePaymentMethodModalProps> = ({
  isOpen,
  onClose,
  billing,
  onSuccess,
  visualConfig,
  theme
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  /**
   * Handle payment method update via Plaid Link
   *
   * TODO: Implement Plaid Link integration
   * Flow:
   * 1. Open Plaid Link modal (usePlaidLink hook)
   * 2. User selects their bank and authenticates
   * 3. Plaid Link returns public_token and account_id
   * 4. Exchange public_token for Stripe PaymentMethod via API
   * 5. Update company record with new stripe_payment_method_id
   * 6. Close modal and refresh billing data
   */
  const handleUpdatePaymentMethod = async () => {
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      // TODO: [NATIVE-APP] Netlify Functions use relative URLs
      // Current: fetch('/.netlify/functions/update-payment-method')
      // Native: fetch(`${API_BASE_URL}/update-payment-method`)
      //   where API_BASE_URL = 'https://app.tradesphere.com/.netlify/functions'
      // Options:
      //   1. Keep Netlify, use absolute URLs (recommended)
      //   2. Migrate to Supabase Edge Functions (future-proof)
      // See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-4d-1
      // MIGRATION RISK: LOW (URL change only)

      // TODO: Replace with actual Plaid Link integration
      // For now, this is a placeholder that shows the intended API structure

      // Placeholder: Simulate Plaid Link flow
      // In production, this would be:
      // const { public_token, account_id } = await openPlaidLink();

      // Call Netlify function to exchange Plaid token for Stripe PaymentMethod
      const response = await fetch('/.netlify/functions/update-payment-method', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: billing.id,
          // plaidToken: public_token, // From Plaid Link
          // accountId: account_id      // From Plaid Link
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update payment method');
      }

      // Success
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('Payment method update error:', err);
      setError(err.message || 'Failed to update payment method. Please try again.');
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
        className="rounded-lg shadow-2xl max-w-md w-full mx-4 animate-scale-in"
        style={{ backgroundColor: visualConfig.colors.surface }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex justify-between items-center p-4 md:p-6 border-b"
          style={{ borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgb(229, 231, 235)' }}
        >
          <h3 className="text-lg md:text-xl font-bold flex items-center gap-2" style={{ color: visualConfig.colors.text.primary }}>
            <Icons.Building2 className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
            Update Payment Method
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:opacity-80 transition-colors"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgb(243, 244, 246)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'transparent';
            }}
            aria-label="Close payment method update modal"
            type="button"
          >
            <Icons.X className="h-5 w-5" style={{ color: visualConfig.colors.text.secondary }} />
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
              <h4 className="text-xl font-bold mb-2" style={{ color: visualConfig.colors.text.primary }}>
                Payment Method Updated!
              </h4>
              <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                Your bank account has been verified and is ready for payments.
              </p>
            </div>
          ) : (
            // Form State
            <div className="space-y-4">
              {/* Instructions */}
              <div
                className="border-l-4 border-blue-400 p-3 md:p-4 rounded-r"
                style={{ backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.1)' : 'rgb(239, 246, 255)' }}
              >
                <div className="flex items-start gap-2">
                  <Icons.Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm" style={{ color: theme === 'dark' ? '#93c5fd' : '#1e40af' }}>
                      You'll securely connect your bank account via Plaid. Your bank credentials are never shared with us - all verification happens through your bank's secure portal.
                    </p>
                  </div>
                </div>
              </div>

              {/* Security Badge */}
              <div
                className="flex items-center justify-center gap-2 text-sm py-3 rounded-lg"
                style={{
                  backgroundColor: visualConfig.colors.elevated,
                  color: visualConfig.colors.text.secondary
                }}
              >
                <Icons.Shield className="h-5 w-5 text-green-600" />
                <span>Bank-level security with Plaid + Stripe</span>
              </div>

              {/* Current Payment Method (if exists) */}
              {billing.stripe_payment_method_id && billing.bank_account_last4 && (
                <div
                  className="border rounded-lg p-3"
                  style={{
                    backgroundColor: visualConfig.colors.elevated,
                    borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgb(229, 231, 235)'
                  }}
                >
                  <p className="text-xs mb-1" style={{ color: visualConfig.colors.text.secondary }}>
                    Current Payment Method
                  </p>
                  <div className="flex items-center gap-2">
                    <Icons.Building2 className="h-4 w-4" style={{ color: visualConfig.colors.text.secondary }} />
                    <span className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
                      •••• {billing.bank_account_last4}
                    </span>
                    {billing.bank_account_type && (
                      <span className="text-xs capitalize" style={{ color: visualConfig.colors.text.secondary }}>
                        ({billing.bank_account_type})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div
                  className="border-l-4 border-red-400 p-3 rounded-r"
                  style={{ backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgb(254, 242, 242)' }}
                >
                  <div className="flex items-start gap-2">
                    <Icons.AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm" style={{ color: theme === 'dark' ? '#fca5a5' : '#b91c1c' }}>
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleUpdatePaymentMethod}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
                  style={{ minHeight: '44px' }}
                >
                  {loading ? (
                    <>
                      <Icons.Loader className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Icons.Building2 className="h-4 w-4" />
                      Update Payment Method
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-md hover:opacity-80 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                  style={{
                    minHeight: '44px',
                    backgroundColor: visualConfig.colors.elevated,
                    color: visualConfig.colors.text.primary,
                    opacity: loading ? 0.5 : 1
                  }}
                >
                  Cancel
                </button>
              </div>

              {/* Help Text */}
              <div className="text-center pt-2">
                <p className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                  Need help? Contact support at support@tradesphere.com
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
