/**
 * Wizard Navigation Component
 *
 * Provides navigation controls for the wizard with context-aware button labels.
 * Handles loading states, validation, and step-specific actions.
 *
 * @component WizardNavigation
 */

import React from 'react';
import { WizardStep } from '../../../hooks/useJobCreationWizard';

interface WizardNavigationProps {
  currentStep: WizardStep;
  canGoBack: boolean;
  canGoNext: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  isLoading?: boolean;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
  // Special handlers for Step 4 (Review)
  onSaveAsQuote?: () => void;
  onScheduleJob?: () => void;
  // Special handler for Step 5 (Schedule)
  onCreateJob?: () => void;
  className?: string;
}

export const WizardNavigation: React.FC<WizardNavigationProps> = ({
  currentStep,
  canGoBack,
  canGoNext,
  isFirstStep,
  isLastStep,
  isLoading = false,
  onBack,
  onNext,
  onCancel,
  onSaveAsQuote,
  onScheduleJob,
  onCreateJob,
  className = '',
}) => {
  // Determine button labels based on current step
  const getNextButtonLabel = (): string => {
    if (isLoading) return 'Processing...';

    switch (currentStep) {
      case 4: // Review step
        return 'Continue';
      case 5: // Schedule step
        return 'Create Job';
      default:
        return 'Next';
    }
  };

  const getBackButtonLabel = (): string => {
    return 'Back';
  };

  // Show special buttons on Step 4 (Review)
  const showReviewButtons = currentStep === 4;

  // Show Create Job button on Step 5 (Schedule)
  const showCreateJobButton = currentStep === 5;

  return (
    <div
      className={`sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t
                  border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center
                  justify-between gap-4 ${className}`}
      role="navigation"
      aria-label="Wizard navigation controls"
    >
      {/* Left Side: Back Button */}
      <div className="flex items-center gap-3">
        {!isFirstStep && (
          <button
            type="button"
            onClick={onBack}
            disabled={!canGoBack || isLoading}
            className={`
              h-10 px-4 md:px-6 rounded-lg font-medium text-sm transition-all
              flex items-center gap-2
              ${
                !canGoBack || isLoading
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
            aria-label={getBackButtonLabel()}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="hidden sm:inline">{getBackButtonLabel()}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className={`
            h-10 px-4 md:px-6 rounded-lg font-medium text-sm transition-colors
            text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100
            hover:bg-gray-100 dark:hover:bg-gray-800
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-label="Cancel wizard"
        >
          Cancel
        </button>
      </div>

      {/* Right Side: Action Buttons */}
      <div className="flex items-center gap-3">
        {showReviewButtons && (
          <>
            {/* Save as Quote Button */}
            <button
              type="button"
              onClick={onSaveAsQuote}
              disabled={isLoading}
              className={`
                h-10 px-4 md:px-6 rounded-lg font-medium text-sm transition-all
                flex items-center gap-2
                ${
                  isLoading
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
              aria-label="Save as quote without scheduling"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="hidden sm:inline">Save as Quote</span>
            </button>

            {/* Schedule Job Button */}
            <button
              type="button"
              onClick={onScheduleJob}
              disabled={!canGoNext || isLoading}
              className={`
                h-10 px-4 md:px-6 rounded-lg font-medium text-sm transition-all
                flex items-center gap-2
                ${
                  !canGoNext || isLoading
                    ? 'bg-blue-300 dark:bg-blue-900 text-white cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
                }
              `}
              aria-label="Continue to schedule crew assignment"
            >
              <span>Schedule Job</span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}

        {showCreateJobButton && (
          <button
            type="button"
            onClick={onCreateJob}
            disabled={!canGoNext || isLoading}
            className={`
              h-10 px-4 md:px-6 rounded-lg font-medium text-sm transition-all
              flex items-center gap-2
              ${
                !canGoNext || isLoading
                  ? 'bg-blue-300 dark:bg-blue-900 text-white cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
              }
            `}
            aria-label="Create job with schedule"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Create Job</span>
              </>
            )}
          </button>
        )}

        {/* Regular Next Button (Steps 1-3) */}
        {!showReviewButtons && !showCreateJobButton && (
          <button
            type="button"
            onClick={onNext}
            disabled={!canGoNext || isLoading}
            className={`
              h-10 px-4 md:px-6 rounded-lg font-medium text-sm transition-all
              flex items-center gap-2
              ${
                !canGoNext || isLoading
                  ? 'bg-blue-300 dark:bg-blue-900 text-white cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
              }
            `}
            aria-label={getNextButtonLabel()}
          >
            <span>{getNextButtonLabel()}</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
