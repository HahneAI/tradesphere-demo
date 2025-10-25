import React from 'react';
import * as Icons from 'lucide-react';
import { WizardStep } from '../../../types/custom-service-wizard';

interface WizardProgressIndicatorProps {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  onStepClick: (step: WizardStep, skipValidation?: boolean) => Promise<boolean>;
  visualConfig: any;
}

const stepLabels: Record<WizardStep, string> = {
  1: 'Service Identity',
  2: 'Base Settings',
  3: 'Material Categories',
  4: 'Add Materials',
  5: 'Design Variables',
  6: 'Set Defaults',
  7: 'Validate & Create'
};

const stepIcons: Record<WizardStep, React.ComponentType<any>> = {
  1: Icons.FileText,
  2: Icons.Settings,
  3: Icons.FolderOpen,
  4: Icons.Package,
  5: Icons.Sliders,
  6: Icons.CheckSquare,
  7: Icons.Rocket
};

export const WizardProgressIndicator: React.FC<WizardProgressIndicatorProps> = ({
  currentStep,
  completedSteps,
  onStepClick,
  visualConfig
}) => {
  const steps: WizardStep[] = [1, 2, 3, 4, 5, 6, 7];

  const isStepCompleted = (step: WizardStep) => completedSteps.includes(step);
  const isStepCurrent = (step: WizardStep) => currentStep === step;
  const isStepClickable = (step: WizardStep) => step <= currentStep || isStepCompleted(step);

  const handleStepClick = async (step: WizardStep) => {
    if (isStepClickable(step) && step !== currentStep) {
      await onStepClick(step, true); // Skip validation when clicking on previous steps
    }
  };

  return (
    <>
      {/* Desktop Progress Indicator */}
      <div className="hidden md:flex items-center justify-between mb-8 px-4">
        {steps.map((step, index) => {
          const Icon = stepIcons[step];
          const isCompleted = isStepCompleted(step);
          const isCurrent = isStepCurrent(step);
          const isClickable = isStepClickable(step);

          return (
            <React.Fragment key={step}>
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => handleStepClick(step)}
                  disabled={!isClickable}
                  className={`
                    relative flex items-center justify-center w-12 h-12 rounded-full
                    transition-all duration-200
                    ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed opacity-50'}
                  `}
                  style={{
                    backgroundColor: isCompleted || isCurrent
                      ? visualConfig.colors.primary
                      : visualConfig.colors.surface,
                    border: `2px solid ${isCompleted || isCurrent
                      ? visualConfig.colors.primary
                      : visualConfig.colors.text.secondary + '40'
                    }`
                  }}
                >
                  {isCompleted ? (
                    <Icons.Check className="h-5 w-5" style={{ color: '#ffffff' }} />
                  ) : (
                    <Icon
                      className="h-5 w-5"
                      style={{
                        color: isCurrent ? '#ffffff' : visualConfig.colors.text.secondary
                      }}
                    />
                  )}

                  {/* Current Step Pulse */}
                  {isCurrent && (
                    <span
                      className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                      style={{ backgroundColor: visualConfig.colors.primary }}
                    />
                  )}
                </button>

                {/* Step Label */}
                <span
                  className="mt-2 text-xs font-medium text-center max-w-[80px]"
                  style={{
                    color: isCurrent || isCompleted
                      ? visualConfig.colors.primary
                      : visualConfig.colors.text.secondary
                  }}
                >
                  {stepLabels[step]}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-2"
                  style={{
                    backgroundColor: isCompleted
                      ? visualConfig.colors.primary
                      : visualConfig.colors.text.secondary + '40'
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile Progress Indicator */}
      <div className="md:hidden mb-6">
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-sm font-medium"
            style={{ color: visualConfig.colors.text.primary }}
          >
            Step {currentStep} of 7
          </span>
          <span
            className="text-xs"
            style={{ color: visualConfig.colors.text.secondary }}
          >
            {stepLabels[currentStep]}
          </span>
        </div>

        {/* Progress Bar */}
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: visualConfig.colors.text.secondary + '20' }}
        >
          <div
            className="h-full transition-all duration-300 ease-in-out"
            style={{
              width: `${(currentStep / 7) * 100}%`,
              backgroundColor: visualConfig.colors.primary
            }}
          />
        </div>

        {/* Step Dots */}
        <div className="flex items-center justify-center space-x-2 mt-3">
          {steps.map((step) => (
            <button
              key={step}
              onClick={() => handleStepClick(step)}
              disabled={!isStepClickable(step)}
              className={`
                w-2 h-2 rounded-full transition-all
                ${isStepClickable(step) ? 'cursor-pointer' : 'cursor-not-allowed'}
              `}
              style={{
                backgroundColor: step <= currentStep
                  ? visualConfig.colors.primary
                  : visualConfig.colors.text.secondary + '40',
                transform: step === currentStep ? 'scale(1.5)' : 'scale(1)'
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
};
