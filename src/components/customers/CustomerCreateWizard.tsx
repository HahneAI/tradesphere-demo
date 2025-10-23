/**
 * CustomerCreateWizard Component
 *
 * Multi-step customer creation wizard with duplicate detection.
 * Steps: Basic Info → Address → Additional Info → Review & Create
 */

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../../config/industry';
import { CustomerProfile, CreateCustomerInput, DuplicateError } from '../../types/customer';
import { hapticFeedback, getTouchTargetSize, isMobileDevice } from '../../utils/mobile-gestures';
import { customerRepository } from '../../services/CustomerRepository';
import LifecycleBadge, { LifecycleStage } from './LifecycleBadge';
import TagChip from './TagChip';

export interface CustomerCreateWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate?: (customer: CustomerProfile) => void;
  companyId: string;
  userId: string;
  userName?: string;
}

type Step = 1 | 2 | 3 | 4;

export const CustomerCreateWizard: React.FC<CustomerCreateWizardProps> = ({
  isOpen,
  onClose,
  onCreate,
  companyId,
  userId,
  userName
}) => {
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);
  const touchTargetSize = getTouchTargetSize();
  const isMobile = isMobileDevice();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isCreating, setIsCreating] = useState(false);
  const [isDuplicateChecking, setIsDuplicateChecking] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [lifecycleStage, setLifecycleStage] = useState<LifecycleStage>('prospect');
  const [tags, setTags] = useState<string[]>([]);
  const [source, setSource] = useState<'manual' | 'import'>('manual');

  // Validation and duplicate detection
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<CustomerProfile[]>([]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setCurrentStep(1);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerNotes('');
    setLifecycleStage('prospect');
    setTags([]);
    setSource('manual');
    setErrors({});
    setDuplicates([]);
  };

  // Duplicate detection
  useEffect(() => {
    if (currentStep === 1 && (customerEmail || customerPhone)) {
      checkForDuplicates();
    }
  }, [customerEmail, customerPhone, currentStep]);

  const checkForDuplicates = async () => {
    if (!customerEmail && !customerPhone) return;

    setIsDuplicateChecking(true);
    const foundDuplicates: CustomerProfile[] = [];

    try {
      if (customerEmail) {
        const existing = await customerRepository.findByEmail(companyId, customerEmail);
        if (existing) foundDuplicates.push(existing);
      }

      if (customerPhone) {
        const existing = await customerRepository.findByPhone(companyId, customerPhone);
        if (existing && !foundDuplicates.find(d => d.id === existing.id)) {
          foundDuplicates.push(existing);
        }
      }

      setDuplicates(foundDuplicates);
    } catch (error) {
      console.error('Error checking for duplicates:', error);
    } finally {
      setIsDuplicateChecking(false);
    }
  };

  // Validation
  const validateStep = (step: Step): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!customerName.trim()) {
        newErrors.customerName = 'Customer name is required';
      }
      if (customerEmail && !isValidEmail(customerEmail)) {
        newErrors.customerEmail = 'Invalid email format';
      }
      if (customerPhone && !isValidPhone(customerPhone)) {
        newErrors.customerPhone = 'Invalid phone format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPhone = (phone: string): boolean => {
    return /^[\d\s\-\(\)\+]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
  };

  // Step navigation
  const handleNext = () => {
    if (!validateStep(currentStep)) {
      hapticFeedback.notification('error');
      return;
    }

    // TODO: [NATIVE-APP] Using window.confirm() for duplicate warning
    // Current: Browser confirm() dialog (blocking, synchronous)
    // Native React Native: Use Alert.alert() with Continue/Cancel buttons
    // Native iOS: UIAlertController with default and cancel actions
    // Native Android: AlertDialog with positive/negative buttons
    // See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-3h-10
    // MIGRATION RISK: LOW (1 hour - consistent with other confirm() replacements)
    if (duplicates.length > 0 && currentStep === 1) {
      const confirmed = confirm(
        `Found ${duplicates.length} similar customer(s). Continue creating new customer?`
      );
      if (!confirmed) return;
    }

    hapticFeedback.selection();
    setCurrentStep(Math.min(4, currentStep + 1) as Step);
  };

  const handleBack = () => {
    hapticFeedback.selection();
    setCurrentStep(Math.max(1, currentStep - 1) as Step);
  };

  // Create customer
  const handleCreate = async () => {
    setIsCreating(true);
    hapticFeedback.impact('medium');

    try {
      const input: CreateCustomerInput = {
        company_id: companyId,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || null,
        customer_phone: customerPhone.trim() || null,
        customer_address: customerAddress.trim() || null,
        customer_notes: customerNotes.trim() || null,
        lifecycle_stage: lifecycleStage,
        tags: tags,
        source: source,
        created_by_user_id: userId,
        created_by_user_name: userName || null
      };

      const customer = await customerRepository.createCustomer(input);

      hapticFeedback.notification('success');
      onCreate?.(customer);
      onClose();
    } catch (error) {
      console.error('Failed to create customer:', error);
      hapticFeedback.notification('error');

      if (error instanceof DuplicateError) {
        alert(`Customer already exists: ${error.message}`);
        setCurrentStep(1);
        setDuplicates(error.duplicates || []);
      } else {
        alert('Failed to create customer. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Tag management
  // TODO: [NATIVE-APP] Using window.prompt() for tag input
  // Current: Browser prompt() dialog (blocking, modal)
  // Native React Native: Use custom TextInput modal or bottom sheet with validation
  // Native iOS: UIAlertController with textField style
  // Native Android: AlertDialog with EditText
  // See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-3h-10
  // MIGRATION RISK: LOW (reuse TextInputModal from CustomerDetailModal)
  const handleAddTag = () => {
    const newTag = prompt('Enter tag name:');
    if (newTag?.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-overlay-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className={`w-full ${
            isMobile ? 'h-full' : 'max-w-2xl max-h-[90vh]'
          } bg-white rounded-lg shadow-xl animate-scale-in flex flex-col`}
          style={{ backgroundColor: visualConfig.colors.surface }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            className="flex items-center justify-between p-6 border-b flex-shrink-0"
            style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}
          >
            <div>
              <h2 className="text-xl font-semibold" style={{ color: visualConfig.colors.text.primary }}>
                Create New Customer
              </h2>
              <p className="text-sm mt-1" style={{ color: visualConfig.colors.text.secondary }}>
                Step {currentStep} of 4
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-opacity-20 transition-colors"
              style={{ color: visualConfig.colors.text.secondary }}
              aria-label="Close wizard"
            >
              <Icons.X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress Bar */}
          {/* TODO: [NATIVE-APP] Progress indicator with role="progressbar", aria-valuenow
              Current: Visual progress bar with CSS transitions (no ARIA for screen readers)
              Native React Native: Use ProgressBarAndroid / ProgressViewIOS or custom View
                - Track progress state (currentStep / totalSteps)
                - Announce progress changes with AccessibilityInfo
              Native iOS: UIProgressView with progress property (0.0 to 1.0)
              Native Android: ProgressBar (horizontal style) with progress attribute
              See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-3h-10
              MIGRATION RISK: LOW (2 hours - add progress component + accessibility)
          */}
          <div className="px-6 pt-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((step) => (
                <React.Fragment key={step}>
                  <div
                    className="flex-1 h-2 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: step <= currentStep
                        ? visualConfig.colors.primary
                        : theme === 'light' ? '#e5e7eb' : '#374151'
                    }}
                  />
                  {step < 4 && (
                    <Icons.ChevronRight
                      className="h-4 w-4 flex-shrink-0"
                      style={{ color: visualConfig.colors.text.secondary }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {currentStep === 1 && (
              <Step1BasicInfo
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerEmail={customerEmail}
                setCustomerEmail={setCustomerEmail}
                customerPhone={customerPhone}
                setCustomerPhone={setCustomerPhone}
                errors={errors}
                duplicates={duplicates}
                isDuplicateChecking={isDuplicateChecking}
                visualConfig={visualConfig}
                theme={theme}
                touchTargetSize={touchTargetSize}
              />
            )}

            {currentStep === 2 && (
              <Step2Address
                customerAddress={customerAddress}
                setCustomerAddress={setCustomerAddress}
                visualConfig={visualConfig}
                theme={theme}
              />
            )}

            {currentStep === 3 && (
              <Step3AdditionalInfo
                customerNotes={customerNotes}
                setCustomerNotes={setCustomerNotes}
                tags={tags}
                handleAddTag={handleAddTag}
                handleRemoveTag={handleRemoveTag}
                lifecycleStage={lifecycleStage}
                setLifecycleStage={setLifecycleStage}
                source={source}
                setSource={setSource}
                visualConfig={visualConfig}
                theme={theme}
                touchTargetSize={touchTargetSize}
              />
            )}

            {currentStep === 4 && (
              <Step4Review
                customerName={customerName}
                customerEmail={customerEmail}
                customerPhone={customerPhone}
                customerAddress={customerAddress}
                customerNotes={customerNotes}
                lifecycleStage={lifecycleStage}
                tags={tags}
                source={source}
                visualConfig={visualConfig}
                theme={theme}
              />
            )}
          </div>

          {/* Footer Actions */}
          <div
            className="flex items-center justify-between gap-3 p-6 border-t flex-shrink-0"
            style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}
          >
            <button
              onClick={currentStep === 1 ? onClose : handleBack}
              disabled={isCreating}
              className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              style={{
                backgroundColor: 'transparent',
                color: visualConfig.colors.text.secondary,
                border: `1px solid ${theme === 'light' ? '#d1d5db' : '#4b5563'}`,
                minHeight: `${touchTargetSize.recommendedSize}px`
              }}
            >
              <Icons.ArrowLeft className="h-4 w-4" />
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </button>

            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                style={{
                  backgroundColor: visualConfig.colors.primary,
                  color: visualConfig.colors.text.onPrimary,
                  minHeight: `${touchTargetSize.recommendedSize}px`
                }}
              >
                Next
                <Icons.ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                style={{
                  backgroundColor: visualConfig.colors.primary,
                  color: visualConfig.colors.text.onPrimary,
                  opacity: isCreating ? 0.5 : 1,
                  minHeight: `${touchTargetSize.recommendedSize}px`
                }}
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Icons.Check className="h-4 w-4" />
                    Create Customer
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Step 1: Basic Info
const Step1BasicInfo: React.FC<any> = ({
  customerName,
  setCustomerName,
  customerEmail,
  setCustomerEmail,
  customerPhone,
  setCustomerPhone,
  errors,
  duplicates,
  isDuplicateChecking,
  visualConfig,
  theme,
  touchTargetSize
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: visualConfig.colors.text.primary }}>
        Basic Information
      </h3>
      <p className="text-sm mb-6" style={{ color: visualConfig.colors.text.secondary }}>
        Enter the customer's basic contact information. Email and phone are optional but recommended.
      </p>
    </div>

    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
        Customer Name <span style={{ color: '#ef4444' }}>*</span>
      </label>
      <input
        type="text"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        placeholder="John Doe"
        className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all ${
          errors.customerName ? 'border-red-500' : ''
        }`}
        style={{
          backgroundColor: visualConfig.colors.background,
          borderColor: errors.customerName ? '#ef4444' : (theme === 'light' ? '#d1d5db' : '#4b5563'),
          color: visualConfig.colors.text.primary,
          minHeight: `${touchTargetSize.recommendedSize}px`
        }}
      />
      {/* TODO: [NATIVE-APP] Form validation error announcements
          Current: Visual error text only (no screen reader announcement)
          Native React Native: Use AccessibilityInfo.announceForAccessibility()
            - Announce errors immediately when validation fails
            - Set accessibilityLiveRegion="polite" on error Text
          Native iOS: Post .announcement notification to UIAccessibility
          Native Android: Use announceForAccessibility on error view
          See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-3h-10
          MIGRATION RISK: LOW (1 hour - add accessibility announcements)
      */}
      {errors.customerName && (
        <p className="text-sm mt-1" style={{ color: '#ef4444' }}>{errors.customerName}</p>
      )}
    </div>

    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
        Email (optional)
      </label>
      <input
        type="email"
        value={customerEmail}
        onChange={(e) => setCustomerEmail(e.target.value)}
        placeholder="john@example.com"
        className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all ${
          errors.customerEmail ? 'border-red-500' : ''
        }`}
        style={{
          backgroundColor: visualConfig.colors.background,
          borderColor: errors.customerEmail ? '#ef4444' : (theme === 'light' ? '#d1d5db' : '#4b5563'),
          color: visualConfig.colors.text.primary,
          minHeight: `${touchTargetSize.recommendedSize}px`
        }}
      />
      {errors.customerEmail && (
        <p className="text-sm mt-1" style={{ color: '#ef4444' }}>{errors.customerEmail}</p>
      )}
    </div>

    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
        Phone (optional)
      </label>
      <input
        type="tel"
        value={customerPhone}
        onChange={(e) => setCustomerPhone(e.target.value)}
        placeholder="(555) 123-4567"
        className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all ${
          errors.customerPhone ? 'border-red-500' : ''
        }`}
        style={{
          backgroundColor: visualConfig.colors.background,
          borderColor: errors.customerPhone ? '#ef4444' : (theme === 'light' ? '#d1d5db' : '#4b5563'),
          color: visualConfig.colors.text.primary,
          minHeight: `${touchTargetSize.recommendedSize}px`
        }}
      />
      {errors.customerPhone && (
        <p className="text-sm mt-1" style={{ color: '#ef4444' }}>{errors.customerPhone}</p>
      )}
    </div>

    {/* Duplicate Detection Alert */}
    {isDuplicateChecking && (
      <div className="p-4 rounded-lg border flex items-center gap-3"
           style={{
             backgroundColor: visualConfig.colors.background,
             borderColor: theme === 'light' ? '#d1d5db' : '#4b5563'
           }}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: visualConfig.colors.primary }} />
        <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
          Checking for duplicates...
        </span>
      </div>
    )}

    {/* TODO: [NATIVE-APP] Duplicate detection alert UI
        Current: Static alert box with inline duplicate list
        Native React Native: Consider actionable UI patterns:
          - Bottom sheet showing duplicate list with "View" and "Create Anyway" buttons
          - Alert.alert() with "View Duplicates" button opening modal
          - Inline cards with touchable actions to view each duplicate
        Native iOS: Consider UIAlertController with custom view or action sheet
        Native Android: Consider bottom sheet or full-screen dialog for better UX
        See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-3h-10
        MIGRATION RISK: MEDIUM (3 hours - redesign for mobile interaction patterns)
    */}
    {duplicates.length > 0 && !isDuplicateChecking && (
      <div className="p-4 rounded-lg border-2"
           style={{
             backgroundColor: '#fef3c7',
             borderColor: '#f59e0b'
           }}>
        <div className="flex items-start gap-3">
          <Icons.AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: '#f59e0b' }} />
          <div>
            <p className="font-medium mb-2" style={{ color: '#92400e' }}>
              Similar customer(s) found
            </p>
            <div className="space-y-2">
              {duplicates.map(dup => (
                <div key={dup.id} className="text-sm" style={{ color: '#92400e' }}>
                  {dup.customer_name} {dup.customer_email && `(${dup.customer_email})`}
                </div>
              ))}
            </div>
            <p className="text-sm mt-2" style={{ color: '#92400e' }}>
              You can still create a new customer, but consider if this is a duplicate.
            </p>
          </div>
        </div>
      </div>
    )}
  </div>
);

// Step 2: Address
const Step2Address: React.FC<any> = ({
  customerAddress,
  setCustomerAddress,
  visualConfig,
  theme
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: visualConfig.colors.text.primary }}>
        Address Information
      </h3>
      <p className="text-sm mb-6" style={{ color: visualConfig.colors.text.secondary }}>
        Enter the customer's address (optional).
      </p>
    </div>

    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
        Address (optional)
      </label>
      <textarea
        value={customerAddress}
        onChange={(e) => setCustomerAddress(e.target.value)}
        placeholder="123 Main St, City, State 12345"
        rows={4}
        className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all resize-none"
        style={{
          backgroundColor: visualConfig.colors.background,
          borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
          color: visualConfig.colors.text.primary
        }}
      />
    </div>
  </div>
);

// Step 3: Additional Info
const Step3AdditionalInfo: React.FC<any> = ({
  customerNotes,
  setCustomerNotes,
  tags,
  handleAddTag,
  handleRemoveTag,
  lifecycleStage,
  setLifecycleStage,
  source,
  setSource,
  visualConfig,
  theme,
  touchTargetSize
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: visualConfig.colors.text.primary }}>
        Additional Information
      </h3>
      <p className="text-sm mb-6" style={{ color: visualConfig.colors.text.secondary }}>
        Add notes, tags, and set the customer's lifecycle stage.
      </p>
    </div>

    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
        Notes (optional)
      </label>
      <textarea
        value={customerNotes}
        onChange={(e) => setCustomerNotes(e.target.value)}
        placeholder="Any additional notes about this customer..."
        rows={4}
        className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all resize-none"
        style={{
          backgroundColor: visualConfig.colors.background,
          borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
          color: visualConfig.colors.text.primary
        }}
      />
    </div>

    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
          Tags (optional)
        </label>
        <button
          onClick={handleAddTag}
          className="text-sm font-medium flex items-center gap-1"
          style={{ color: visualConfig.colors.primary }}
        >
          <Icons.Plus className="h-3 w-3" />
          Add Tag
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.length > 0 ? (
          tags.map(tag => (
            <TagChip
              key={tag}
              label={tag}
              removable={true}
              onRemove={() => handleRemoveTag(tag)}
            />
          ))
        ) : (
          <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
            No tags added yet
          </span>
        )}
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
        Lifecycle Stage
      </label>
      <select
        value={lifecycleStage}
        onChange={(e) => setLifecycleStage(e.target.value as LifecycleStage)}
        className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
        style={{
          backgroundColor: visualConfig.colors.background,
          borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
          color: visualConfig.colors.text.primary,
          minHeight: `${touchTargetSize.recommendedSize}px`
        }}
      >
        <option value="prospect">Prospect</option>
        <option value="lead">Lead</option>
        <option value="customer">Customer</option>
      </select>
    </div>

    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: visualConfig.colors.text.primary }}>
        Source
      </label>
      <select
        value={source}
        onChange={(e) => setSource(e.target.value as 'manual' | 'import')}
        className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
        style={{
          backgroundColor: visualConfig.colors.background,
          borderColor: theme === 'light' ? '#d1d5db' : '#4b5563',
          color: visualConfig.colors.text.primary,
          minHeight: `${touchTargetSize.recommendedSize}px`
        }}
      >
        <option value="manual">Manual</option>
        <option value="import">Import</option>
      </select>
    </div>
  </div>
);

// Step 4: Review
const Step4Review: React.FC<any> = ({
  customerName,
  customerEmail,
  customerPhone,
  customerAddress,
  customerNotes,
  lifecycleStage,
  tags,
  source,
  visualConfig,
  theme
}) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: visualConfig.colors.text.primary }}>
        Review & Create
      </h3>
      <p className="text-sm mb-6" style={{ color: visualConfig.colors.text.secondary }}>
        Review the information and create the customer.
      </p>
    </div>

    <div className="p-4 rounded-lg border space-y-4"
         style={{
           backgroundColor: visualConfig.colors.background,
           borderColor: theme === 'light' ? '#e5e7eb' : '#374151'
         }}>
      <div>
        <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>Name</span>
        <p className="font-medium" style={{ color: visualConfig.colors.text.primary }}>{customerName}</p>
      </div>

      {customerEmail && (
        <div>
          <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>Email</span>
          <p className="font-medium" style={{ color: visualConfig.colors.text.primary }}>{customerEmail}</p>
        </div>
      )}

      {customerPhone && (
        <div>
          <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>Phone</span>
          <p className="font-medium" style={{ color: visualConfig.colors.text.primary }}>{customerPhone}</p>
        </div>
      )}

      {customerAddress && (
        <div>
          <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>Address</span>
          <p className="font-medium" style={{ color: visualConfig.colors.text.primary }}>{customerAddress}</p>
        </div>
      )}

      {customerNotes && (
        <div>
          <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>Notes</span>
          <p className="font-medium" style={{ color: visualConfig.colors.text.primary }}>{customerNotes}</p>
        </div>
      )}

      <div>
        <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>Lifecycle Stage</span>
        <div className="mt-1">
          <LifecycleBadge stage={lifecycleStage} />
        </div>
      </div>

      {tags.length > 0 && (
        <div>
          <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>Tags</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {tags.map(tag => (
              <TagChip key={tag} label={tag} />
            ))}
          </div>
        </div>
      )}

      <div>
        <span className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>Source</span>
        <p className="font-medium capitalize" style={{ color: visualConfig.colors.text.primary }}>{source}</p>
      </div>
    </div>
  </div>
);

export default CustomerCreateWizard;
