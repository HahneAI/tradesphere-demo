/**
 * Job Creation Wizard - Main Container
 *
 * 5-step guided workflow for creating jobs with customer selection,
 * job details, service configuration, review, and optional scheduling.
 *
 * Integrates with useJobCreationWizard hook for state management and
 * JobServiceExtensions for atomic job creation.
 */

import React, { useState, useEffect } from 'react';
import { useJobCreationWizard, WizardStep } from '../../hooks/useJobCreationWizard';
import { jobServiceWizardExtensions } from '../../services/JobServiceExtensions';
import { WizardProgressIndicator } from './wizard/WizardProgressIndicator';
import { WizardNavigation } from './wizard/WizardNavigation';
import { CustomerSelectionStep } from './wizard/CustomerSelectionStep';
import { JobDetailsStep } from './wizard/JobDetailsStep';
import { ServicesStep } from './wizard/ServicesStep';
import { ReviewStep } from './wizard/ReviewStep';
import { ScheduleStep } from './wizard/ScheduleStep';
import { InvoiceOptionsModal } from './wizard/InvoiceOptionsModal';

interface JobCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  userId: string;
  initialCustomerId?: string;
}

export const JobCreationWizard: React.FC<JobCreationWizardProps> = ({
  isOpen,
  onClose,
  companyId,
  userId,
  initialCustomerId,
}) => {
  const wizard = useJobCreationWizard({
    companyId,
    userId,
    enableLocalStorage: true,
    validateOnStepChange: true,
    requireScheduling: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  // Track completed steps for progress indicator
  const [completedSteps, setCompletedSteps] = useState<WizardStep[]>([]);

  // Update completed steps when moving forward
  useEffect(() => {
    if (wizard.currentStep > 1 && !completedSteps.includes((wizard.currentStep - 1) as WizardStep)) {
      setCompletedSteps((prev) => [...prev, (wizard.currentStep - 1) as WizardStep]);
    }
  }, [wizard.currentStep]);

  // Handle wizard close with confirmation if data exists
  const handleClose = () => {
    if (wizard.customer || wizard.services.length > 0) {
      setShowCloseConfirm(true);
    } else {
      wizard.reset();
      setCompletedSteps([]);
      onClose();
    }
  };

  const confirmClose = () => {
    wizard.reset();
    setCompletedSteps([]);
    setShowCloseConfirm(false);
    onClose();
  };

  // Handle final job creation
  const handleCreateJob = async () => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      if (!wizard.customer) {
        throw new Error('Customer is required');
      }

      // Build wizard input
      const wizardInput = {
        company_id: companyId,
        customer_id: wizard.customer.id,
        title: wizard.jobDetails.title,
        description: wizard.jobDetails.description,
        service_address: wizard.jobDetails.service_address,
        service_city: wizard.jobDetails.service_city,
        service_state: wizard.jobDetails.service_state,
        service_zip: wizard.jobDetails.service_zip,
        priority: wizard.jobDetails.priority,
        requested_start_date: wizard.jobDetails.requested_start_date,
        tags: wizard.jobDetails.tags || [],
        status: wizard.saveAsQuote ? 'quote' : (wizard.schedule ? 'scheduled' : 'approved'),
        services: wizard.services.map((svc) => ({
          service_config_id: svc.service_config_id || 'manual',
          service_name: svc.service_name,
          service_description: svc.service_description,
          quantity: svc.quantity,
          unit_price: svc.unit_price,
          total_price: svc.total_price,
          calculation_data: svc.calculation_data || {},
          pricing_variables: svc.pricing_variables || {},
          notes: svc.notes,
          metadata: svc.metadata || {},
          added_by_user_id: userId,
        })),
        assignment: wizard.schedule
          ? {
              crew_id: wizard.schedule.crew_id,
              scheduled_start: wizard.schedule.scheduled_start,
              scheduled_end: wizard.schedule.scheduled_end,
              estimated_hours: wizard.schedule.estimated_hours,
              assignment_notes: wizard.schedule.assignment_notes,
              work_description: wizard.schedule.work_description,
              assigned_by_user_id: userId,
            }
          : undefined,
        created_by_user_id: userId,
      };

      // Call service to create job
      const result = await jobServiceWizardExtensions.createJobFromWizard(wizardInput);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create job');
      }

      // Mark wizard as completed
      wizard.markCompleted(result.data.job.id);

      // Show success message
      alert(`Job created successfully! Job #${result.data.job.job_number}`);

      // Reset wizard state for next use
      wizard.reset();
      setCompletedSteps([]);

      // Close wizard and redirect
      onClose();

      // Optional: Navigate to job detail page
      // window.location.href = `/jobs/${result.data.job.id}`;
    } catch (error: any) {
      console.error('Job creation error:', error);
      setSubmitError(error.message || 'Failed to create job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle save as quote (skip scheduling)
  const handleSaveAsQuote = async () => {
    wizard.setSaveAsQuote(true);
    await handleCreateJob();
  };

  // Handle schedule job (go to step 5)
  const handleScheduleJob = () => {
    wizard.setSaveAsQuote(false);
    wizard.nextStep();
  };

  // Handle generate invoice
  const handleGenerateInvoice = () => {
    console.log('[JobCreationWizard] Generate invoice clicked');
    setShowInvoiceModal(true);
  };

  // Auto-create job as quote when reaching Step 4 (Review)
  useEffect(() => {
    const autoCreateQuote = async () => {
      // Only auto-create if:
      // 1. We're on step 4 (Review)
      // 2. We have a customer
      // 3. We have services
      // 4. We haven't already created a job
      if (
        wizard.currentStep === 4 &&
        wizard.customer &&
        wizard.services.length > 0 &&
        !createdJobId
      ) {
        console.log('[JobCreationWizard] Auto-creating quote on Step 4 reach');

        try {
          const result = await jobServiceWizardExtensions.createJobFromWizard({
            company_id: companyId,
            customer_id: wizard.customer.id,
            title: wizard.jobDetails.title,
            description: wizard.jobDetails.description,
            service_address: wizard.jobDetails.service_address,
            service_city: wizard.jobDetails.service_city,
            service_state: wizard.jobDetails.service_state,
            service_zip: wizard.jobDetails.service_zip,
            priority: wizard.jobDetails.priority,
            requested_start_date: wizard.jobDetails.requested_start_date,
            status: 'quote',
            services: wizard.services,
            created_by_user_id: userId,
          });

          if (result.success && result.data) {
            console.log('[JobCreationWizard] Quote auto-created:', result.data.job.job_number);
            setCreatedJobId(result.data.job.id);
          }
        } catch (error) {
          console.error('[JobCreationWizard] Failed to auto-create quote:', error);
          // Don't block user - they can still manually save
        }
      }
    };

    autoCreateQuote();
  }, [wizard.currentStep, wizard.customer, wizard.services, createdJobId, companyId, userId]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      >
        {/* Modal - 30% larger with responsive breakpoints */}
        <div
          className="relative w-full
                     max-w-[1200px] xl:max-w-[1200px] lg:max-w-[1100px] md:max-w-[95vw] sm:w-full
                     h-[95vh] sm:h-full max-h-none
                     bg-white dark:bg-gray-900
                     rounded-xl sm:rounded-none shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800
                       hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center
                       justify-center group"
            aria-label="Close wizard"
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Progress Indicator */}
          <WizardProgressIndicator
            currentStep={wizard.currentStep}
            completedSteps={completedSteps}
            onStepClick={wizard.goToStep}
          />

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto">
            {wizard.currentStep === 1 && (
              <CustomerSelectionStep
                companyId={companyId}
                userId={userId}
                selectedCustomer={wizard.customer}
                onCustomerSelect={(customer) => {
                  wizard.setCustomer(customer);
                  wizard.nextStep();
                }}
              />
            )}

            {wizard.currentStep === 2 && (
              <JobDetailsStep
                jobDetails={wizard.jobDetails}
                onUpdate={wizard.updateJobDetails}
                errors={wizard.errors}
              />
            )}

            {wizard.currentStep === 3 && (
              <ServicesStep
                services={wizard.services}
                onAddService={wizard.addService}
                onRemoveService={wizard.removeService}
                estimatedTotal={wizard.estimatedTotal}
                companyId={companyId}
                userId={userId}
              />
            )}

            {wizard.currentStep === 4 && (
              <ReviewStep
                customer={wizard.customer}
                jobDetails={wizard.jobDetails}
                services={wizard.services}
                estimatedTotal={wizard.estimatedTotal}
                onEditStep={wizard.goToStep}
              />
            )}

            {wizard.currentStep === 5 && (
              <ScheduleStep
                companyId={companyId}
                schedule={wizard.schedule}
                onUpdate={wizard.setSchedule}
              />
            )}
          </div>

          {/* Error Display */}
          {submitError && (
            <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">{submitError}</p>
            </div>
          )}

          {/* Navigation */}
          <WizardNavigation
            currentStep={wizard.currentStep}
            canGoBack={wizard.canGoBack}
            canGoNext={wizard.canGoNext}
            isFirstStep={wizard.isFirstStep}
            isLastStep={wizard.isLastStep}
            isLoading={isSubmitting}
            onBack={wizard.prevStep}
            onNext={wizard.nextStep}
            onCancel={handleClose}
            onSaveAsQuote={handleSaveAsQuote}
            onGenerateInvoice={handleGenerateInvoice}
            onScheduleJob={handleScheduleJob}
            onCreateJob={handleCreateJob}
          />
        </div>
      </div>

      {/* Invoice Options Modal */}
      <InvoiceOptionsModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        jobData={{
          customer: wizard.customer,
          jobDetails: wizard.jobDetails,
          services: wizard.services,
          total: wizard.estimatedTotal
        }}
        onDownload={() => {
          console.log('[JobCreationWizard] Download invoice');
          setShowInvoiceModal(false);
        }}
        onDownloadAndText={() => {
          console.log('[JobCreationWizard] Download & text invoice');
          setShowInvoiceModal(false);
        }}
        onDownloadAndEmail={() => {
          console.log('[JobCreationWizard] Download & email invoice');
          setShowInvoiceModal(false);
        }}
      />

      {/* Close Confirmation Dialog */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Discard Changes?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Your progress will be lost. Are you sure you want to close the wizard?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCloseConfirm(false)}
                className="h-10 px-4 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClose}
                className="h-10 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white"
              >
                Discard & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
