/**
 * Wizard Progress Indicator Component
 *
 * Displays horizontal stepper for desktop/tablet and compact progress bar for mobile.
 * Shows completion status with visual states: completed (green checkmark), current (blue), future (gray).
 * Supports navigation to previously completed steps.
 *
 * @component WizardProgressIndicator
 */

import React from 'react';
import { WizardStep } from '../../../hooks/useJobCreationWizard';

interface StepConfig {
  id: WizardStep;
  label: string;
  description: string;
}

interface WizardProgressIndicatorProps {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  onStepClick: (step: WizardStep) => void;
  className?: string;
}

const STEPS: StepConfig[] = [
  { id: 1, label: 'Customer', description: 'Select or create customer' },
  { id: 2, label: 'Details', description: 'Enter job details and location' },
  { id: 3, label: 'Services', description: 'Add and configure services' },
  { id: 4, label: 'Review', description: 'Review and confirm' },
  { id: 5, label: 'Schedule', description: 'Schedule crews (optional)' },
];

export const WizardProgressIndicator: React.FC<WizardProgressIndicatorProps> = ({
  currentStep,
  completedSteps,
  onStepClick,
  className = '',
}) => {
  const isStepCompleted = (step: WizardStep): boolean => {
    return completedSteps.includes(step);
  };

  const isStepCurrent = (step: WizardStep): boolean => {
    return currentStep === step;
  };

  const isStepClickable = (step: WizardStep): boolean => {
    // Can navigate to any completed step OR any previous step
    return isStepCompleted(step) || step < currentStep;
  };

  const getStepStatus = (step: WizardStep): 'completed' | 'current' | 'future' => {
    if (isStepCompleted(step)) return 'completed';
    if (isStepCurrent(step)) return 'current';
    return 'future';
  };

  const progressPercentage = ((currentStep) / STEPS.length) * 100;

  return (
    <>
      {/* Desktop/Tablet: Horizontal Stepper */}
      <div
        className={`hidden md:block w-full px-8 py-6 bg-gray-50 dark:bg-gray-800/50 border-b
                    border-gray-200 dark:border-gray-700 ${className}`}
        role="navigation"
        aria-label="Progress through job creation steps"
      >
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {STEPS.map((step, index) => {
            const status = getStepStatus(step.id);
            const isClickable = isStepClickable(step.id);
            const isLast = index === STEPS.length - 1;

            return (
              <React.Fragment key={step.id}>
                {/* Step Circle and Label */}
                <button
                  onClick={() => isClickable && onStepClick(step.id)}
                  disabled={!isClickable}
                  className={`relative flex flex-col items-center group
                              ${isClickable ? 'cursor-pointer hover:scale-105 transition-transform' : 'cursor-default'}`}
                  aria-label={`${step.label}: ${step.description}`}
                  aria-current={isStepCurrent(step.id) ? 'step' : undefined}
                >
                  {/* Circle */}
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      font-semibold text-sm transition-all duration-300
                      ${
                        status === 'completed'
                          ? 'bg-green-500 text-white shadow-md'
                          : status === 'current'
                          ? 'bg-blue-500 text-white ring-4 ring-blue-500/20 shadow-md'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                      }
                    `}
                    role="img"
                    aria-label={
                      status === 'completed'
                        ? 'Completed'
                        : status === 'current'
                        ? 'Current step'
                        : 'Future step'
                    }
                  >
                    {status === 'completed' ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`
                      mt-2 text-xs font-medium whitespace-nowrap
                      ${
                        isStepCurrent(step.id)
                          ? 'text-blue-600 dark:text-blue-400 font-semibold'
                          : 'text-gray-600 dark:text-gray-400'
                      }
                    `}
                  >
                    {step.label}
                  </span>

                  {/* Tooltip on hover (desktop only) */}
                  {isClickable && (
                    <div
                      className="absolute top-full mt-2 px-2 py-1 bg-gray-900 text-white text-xs
                                 rounded opacity-0 group-hover:opacity-100 transition-opacity
                                 pointer-events-none whitespace-nowrap z-10"
                      role="tooltip"
                    >
                      Click to return to {step.label}
                    </div>
                  )}
                </button>

                {/* Connecting Line */}
                {!isLast && (
                  <div className="flex-1 h-0.5 mx-2 relative" aria-hidden="true">
                    {/* Background line */}
                    <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700" />
                    {/* Progress line */}
                    <div
                      className={`
                        absolute inset-0 transition-all duration-500
                        ${step.id < currentStep ? 'bg-green-500 w-full' : 'bg-transparent w-0'}
                      `}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Mobile: Compact Progress Bar */}
      <div
        className={`md:hidden sticky top-0 z-10 bg-white dark:bg-gray-900
                    border-b border-gray-200 dark:border-gray-700 px-4 py-3 ${className}`}
        role="navigation"
        aria-label="Progress through job creation steps"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].label}
          </span>
        </div>

        {/* Progress Bar */}
        <div
          className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-label={`Step ${currentStep} of ${STEPS.length}`}
        >
          <div
            className="h-full bg-blue-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Step Description */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {STEPS[currentStep - 1].description}
        </p>
      </div>
    </>
  );
};
