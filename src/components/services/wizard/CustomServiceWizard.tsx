import React, { useRef, useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import { useCustomServiceWizard } from '../../../hooks/useCustomServiceWizard';
import { WizardProgressIndicator } from './WizardProgressIndicator';
import { Step1Identity } from './Step1Identity';

interface CustomServiceWizardProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  visualConfig: any;
}

export const CustomServiceWizard: React.FC<CustomServiceWizardProps> = ({
  isOpen,
  onClose,
  companyId,
  visualConfig
}) => {
  const wizard = useCustomServiceWizard(companyId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Scroll to top when step changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [wizard.state.currentStep]);

  if (!isOpen) return null;

  const handleClose = () => {
    // Check if there's any data that would be lost
    const hasData =
      wizard.state.currentStep > 1 ||
      wizard.state.service_name.length > 0 ||
      wizard.state.material_categories.length > 0;

    if (hasData) {
      setShowCloseConfirm(true);
    } else {
      wizard.reset();
      onClose();
    }
  };

  const confirmClose = () => {
    wizard.reset();
    setShowCloseConfirm(false);
    onClose();
  };

  const cancelClose = () => {
    setShowCloseConfirm(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-5xl max-h-[90vh] rounded-lg shadow-2xl overflow-hidden flex flex-col"
          style={{ backgroundColor: visualConfig.colors.surface }}
        >
          {/* Header */}
          <div
            className="px-6 py-4 border-b flex items-center justify-between"
            style={{ borderColor: visualConfig.colors.text.secondary + '20' }}
          >
            <div>
              <h2
                className="text-2xl font-bold"
                style={{ color: visualConfig.colors.text.primary }}
              >
                Create Custom Service
              </h2>
              <p
                className="text-sm mt-1"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                Define a new custom service with materials, pricing, and variables
              </p>
            </div>

            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-opacity-10 transition-colors"
              style={{ backgroundColor: visualConfig.colors.text.secondary + '10' }}
            >
              <Icons.X
                className="h-5 w-5"
                style={{ color: visualConfig.colors.text.secondary }}
              />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="px-6 pt-6">
            <WizardProgressIndicator
              currentStep={wizard.state.currentStep}
              completedSteps={wizard.completedSteps}
              onStepClick={wizard.goToStep}
              visualConfig={visualConfig}
            />
          </div>

          {/* Content Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
            {wizard.state.currentStep === 1 && (
              <Step1Identity wizard={wizard} visualConfig={visualConfig} companyId={companyId} />
            )}
            {wizard.state.currentStep === 2 && (
              <div
                className="text-center py-12"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                Step 2: Base Settings (Coming Soon)
              </div>
            )}
            {wizard.state.currentStep === 3 && (
              <div
                className="text-center py-12"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                Step 3: Material Categories (Coming Soon)
              </div>
            )}
            {wizard.state.currentStep === 4 && (
              <div
                className="text-center py-12"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                Step 4: Add Materials (Coming Soon)
              </div>
            )}
            {wizard.state.currentStep === 5 && (
              <div
                className="text-center py-12"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                Step 5: Design Variables (Coming Soon)
              </div>
            )}
            {wizard.state.currentStep === 6 && (
              <div
                className="text-center py-12"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                Step 6: Set Defaults (Coming Soon)
              </div>
            )}
            {wizard.state.currentStep === 7 && (
              <div
                className="text-center py-12"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                Step 7: Validate & Create (Coming Soon)
              </div>
            )}
          </div>

          {/* Footer - Navigation Buttons */}
          <div
            className="px-6 py-4 border-t flex items-center justify-between"
            style={{ borderColor: visualConfig.colors.text.secondary + '20' }}
          >
            <button
              onClick={() => wizard.goToPrevious()}
              disabled={wizard.state.currentStep === 1}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: visualConfig.colors.text.secondary + '10',
                color: visualConfig.colors.text.primary
              }}
            >
              <Icons.ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
                style={{
                  backgroundColor: visualConfig.colors.text.secondary + '10',
                  color: visualConfig.colors.text.primary
                }}
              >
                Cancel
              </button>

              <button
                onClick={() => wizard.goToNext()}
                disabled={wizard.state.currentStep === 7}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: visualConfig.colors.primary,
                  color: '#ffffff'
                }}
              >
                <span>{wizard.state.currentStep === 7 ? 'Create Service' : 'Next'}</span>
                <Icons.ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Close Confirmation Modal */}
      {showCloseConfirm && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4"
            style={{ backgroundColor: visualConfig.colors.surface }}
          >
            <div className="flex items-start space-x-3">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#FEF2F2' }}
              >
                <Icons.AlertTriangle className="h-5 w-5 text-red-600" />
              </div>

              <div className="flex-1">
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: visualConfig.colors.text.primary }}
                >
                  Discard Changes?
                </h3>
                <p
                  className="text-sm mb-4"
                  style={{ color: visualConfig.colors.text.secondary }}
                >
                  You have unsaved changes. Are you sure you want to close the wizard? All progress will be lost.
                </p>

                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={cancelClose}
                    className="px-4 py-2 rounded-lg font-medium transition-all"
                    style={{
                      backgroundColor: visualConfig.colors.text.secondary + '10',
                      color: visualConfig.colors.text.primary
                    }}
                  >
                    Keep Editing
                  </button>
                  <button
                    onClick={confirmClose}
                    className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
                    style={{
                      backgroundColor: '#DC2626',
                      color: '#ffffff'
                    }}
                  >
                    Discard Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
