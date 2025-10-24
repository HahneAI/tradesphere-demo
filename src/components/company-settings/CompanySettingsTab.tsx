/**
 * Company Settings Tab Component
 *
 * Owner-only page for managing company-wide settings and billing
 * Replaces the old Billing Tab with expanded settings functionality
 *
 * Features:
 * - Timezone configuration
 * - Future: Default units, currency, user management
 * - Complete billing information (from old BillingTab)
 *
 * @module CompanySettingsTab
 */

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../../config/industry';
import { getSupabase } from '../../services/supabase';
import { TimezoneSelector } from './TimezoneSelector';
import {
  CompanyBilling,
  Payment,
  PaymentMethodInfo,
  createCompanyId
} from '../../types/billing';
import { SubscriptionStatusCard } from '../billing/SubscriptionStatusCard';
import { PaymentMethodCard } from '../billing/PaymentMethodCard';
import { PaymentHistoryTable } from '../billing/PaymentHistoryTable';
import { UpdatePaymentMethodModal } from '../billing/UpdatePaymentMethodModal';
import { CancelSubscriptionModal } from '../billing/CancelSubscriptionModal';
import { hapticFeedback } from '../../utils/mobile-gestures';

interface CompanySettingsTabProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Company Settings Tab
 * Full-screen page for owner settings
 */
export const CompanySettingsTab: React.FC<CompanySettingsTabProps> = ({ isOpen, onClose }) => {
  const { user, isOwner } = useAuth();
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);

  // Company settings state
  const [companyTimezone, setCompanyTimezone] = useState<string>('America/Chicago');

  // Billing data state (from old BillingTab)
  const [billing, setBilling] = useState<CompanyBilling | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodInfo | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  /**
   * Load company data on mount
   */
  useEffect(() => {
    if (!isOpen || !user?.company_id || !isOwner) {
      setLoading(false);
      return;
    }

    loadCompanyData();
  }, [isOpen, user, isOwner]);

  // Don't render if not open
  if (!isOpen) return null;

  /**
   * Load all company data (settings + billing)
   */
  const loadCompanyData = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();

      // Load company info (including timezone)
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('timezone')
        .eq('id', user!.company_id)
        .single();

      if (companyError) throw companyError;

      if (companyData?.timezone) {
        setCompanyTimezone(companyData.timezone);
      }

      // Load billing data
      const companyIdStr = createCompanyId(user!.company_id);

      const [billingResult, paymentsResult] = await Promise.all([
        supabase
          .from('company_billing')
          .select('*')
          .eq('company_id', companyIdStr)
          .single(),
        supabase
          .from('payments')
          .select('*')
          .eq('company_id', companyIdStr)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      if (billingResult.data) {
        setBilling(billingResult.data);

        // Load payment method if exists
        if (billingResult.data.stripe_payment_method_id) {
          setPaymentMethod({
            id: billingResult.data.stripe_payment_method_id,
            type: 'card',
            last4: billingResult.data.payment_method_last4 || '****',
            brand: billingResult.data.payment_method_brand || 'unknown',
            exp_month: 12,
            exp_year: 2025,
            status: billingResult.data.payment_method_status as any || 'pending'
          });
        }
      }

      if (paymentsResult.data) {
        setPayments(paymentsResult.data);
      }

    } catch (err: any) {
      console.error('[CompanySettingsTab] Error loading data:', err);
      setError(err.message || 'Failed to load company settings');
      hapticFeedback.notification('error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle timezone change
   */
  const handleTimezoneChange = (newTimezone: string) => {
    setCompanyTimezone(newTimezone);
    // LiveClock and other components will automatically update
  };

  /**
   * Handle close
   */
  const handleClose = () => {
    hapticFeedback.impact('light');
    onClose();
  };

  // Non-owner access denied
  if (!isOwner) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: visualConfig.colors.background }}
      >
        <div className="max-w-md w-full text-center">
          <Icons.Lock className="h-16 w-16 mx-auto mb-4" style={{ color: visualConfig.colors.text.secondary }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: visualConfig.colors.text.primary }}>
            Owner Access Required
          </h2>
          <p style={{ color: visualConfig.colors.text.secondary }}>
            Only company owners can access company settings.
          </p>
          <button
            onClick={handleClose}
            className="mt-6 px-6 py-3 rounded-lg font-medium"
            style={{
              backgroundColor: visualConfig.colors.primary,
              color: visualConfig.colors.text.onPrimary
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: visualConfig.colors.background }}
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4 mx-auto"
            style={{ borderColor: visualConfig.colors.primary }}
          />
          <p className="font-medium" style={{ color: visualConfig.colors.text.secondary }}>
            Loading settings...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !billing) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: visualConfig.colors.background }}
      >
        <div className="max-w-md w-full text-center">
          <Icons.AlertCircle className="h-16 w-16 mx-auto mb-4" style={{ color: '#EF4444' }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: visualConfig.colors.text.primary }}>
            Error Loading Settings
          </h2>
          <p className="mb-6" style={{ color: visualConfig.colors.text.secondary }}>
            {error}
          </p>
          <button
            onClick={loadCompanyData}
            className="px-6 py-3 rounded-lg font-medium"
            style={{
              backgroundColor: visualConfig.colors.primary,
              color: visualConfig.colors.text.onPrimary
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: visualConfig.colors.background }}
    >
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
          {/* Header with Back Button */}
          <div className="mb-8">
            <button
              onClick={handleClose}
              className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
              style={{
                color: visualConfig.colors.primary,
                backgroundColor: visualConfig.colors.surface,
              }}
            >
              <Icons.ArrowLeft className="h-5 w-5" />
              <span>Back to Home</span>
            </button>

            <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: visualConfig.colors.text.primary }}>
              Company Settings
            </h1>
            <p style={{ color: visualConfig.colors.text.secondary }}>
              Manage your company settings, preferences, and billing information
            </p>
          </div>

          {/* ========================================
              SETTINGS SECTION
          ======================================== */}
          <div
            className="rounded-xl p-6 mb-8"
            style={{
              backgroundColor: visualConfig.colors.surface,
              border: `1px solid ${visualConfig.colors.text.secondary}20`
            }}
          >
            <h2 className="text-xl font-semibold mb-6" style={{ color: visualConfig.colors.text.primary }}>
              General Settings
            </h2>

            <div className="space-y-8">
              {/* Timezone Selector */}
              <TimezoneSelector
                currentTimezone={companyTimezone}
                companyId={user!.company_id}
                visualConfig={visualConfig}
                onTimezoneChange={handleTimezoneChange}
              />

              {/* Default Units - TODO */}
              <div className="space-y-3">
                <label className="block text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
                  Default Units
                </label>
                <div
                  className="px-4 py-3 rounded-lg border"
                  style={{
                    backgroundColor: visualConfig.colors.background,
                    borderColor: visualConfig.colors.text.secondary + '20',
                  }}
                >
                  <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                    🚧 Coming soon: Configure default measurement units (imperial/metric)
                  </p>
                </div>
              </div>

              {/* Currency - TODO */}
              <div className="space-y-3">
                <label className="block text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
                  Currency
                </label>
                <div
                  className="px-4 py-3 rounded-lg border"
                  style={{
                    backgroundColor: visualConfig.colors.background,
                    borderColor: visualConfig.colors.text.secondary + '20',
                  }}
                >
                  <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                    🚧 Coming soon: Select default currency (USD, EUR, etc.)
                  </p>
                </div>
              </div>

              {/* User Management - TODO */}
              <div className="space-y-3">
                <label className="block text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
                  User Management
                </label>
                <div
                  className="px-4 py-3 rounded-lg border"
                  style={{
                    backgroundColor: visualConfig.colors.background,
                    borderColor: visualConfig.colors.text.secondary + '20',
                  }}
                >
                  <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                    🚧 Coming soon: Manage user roles and permissions for your team
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================
              BILLING SECTION (from old BillingTab)
          ======================================== */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: visualConfig.colors.surface,
              border: `1px solid ${visualConfig.colors.text.secondary}20`
            }}
          >
            <h2 className="text-xl font-semibold mb-6" style={{ color: visualConfig.colors.text.primary }}>
              Billing & Subscription
            </h2>

            {billing && (
              <div className="space-y-6">
                {/* Subscription Status */}
                <SubscriptionStatusCard
                  billing={billing}
                  onCancelClick={() => setShowCancelModal(true)}
                />

                {/* Payment Method */}
                <PaymentMethodCard
                  paymentMethod={paymentMethod}
                  paymentMethodStatus={billing.payment_method_status}
                  onVerifyClick={() => setShowVerifyModal(true)}
                />

                {/* Payment History */}
                <PaymentHistoryTable payments={payments} />
              </div>
            )}

            {!billing && (
              <div className="text-center py-8">
                <Icons.CreditCard className="h-12 w-12 mx-auto mb-4" style={{ color: visualConfig.colors.text.secondary }} />
                <p style={{ color: visualConfig.colors.text.secondary }}>
                  No billing information available
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <UpdatePaymentMethodModal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        onSuccess={() => {
          setShowVerifyModal(false);
          loadCompanyData();
        }}
      />

      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={async (reason) => {
          // TODO: Handle cancellation
          console.log('Cancellation reason:', reason);
          setShowCancelModal(false);
        }}
      />
    </div>
  );
};

export default CompanySettingsTab;
