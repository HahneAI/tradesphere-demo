/**
 * Job Creation Wizard - Usage Example
 *
 * This file demonstrates how to integrate the JobCreationWizard
 * into your JobsPage or any other component.
 *
 * @example Integration Example
 */

import React, { useState } from 'react';
import { JobCreationWizard } from './JobCreationWizard';

// Example: Integrating into JobsPage
export const JobsPageExample: React.FC = () => {
  const [showWizard, setShowWizard] = useState(false);

  // Get these from your auth context/session
  const companyId = 'your-company-id';
  const userId = 'your-user-id';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Jobs
        </h1>

        {/* Create Job Button */}
        <button
          type="button"
          onClick={() => setShowWizard(true)}
          className="h-10 px-6 bg-blue-500 hover:bg-blue-600 text-white rounded-lg
                     font-medium transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Job
        </button>
      </div>

      {/* Your existing jobs list/table goes here */}
      <div>
        {/* Jobs content */}
      </div>

      {/* Job Creation Wizard */}
      <JobCreationWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        companyId={companyId}
        userId={userId}
      />
    </div>
  );
};

// Example: Opening wizard with pre-selected customer
export const JobsPageWithPreselectedCustomer: React.FC = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [initialCustomerId, setInitialCustomerId] = useState<string | undefined>();

  const companyId = 'your-company-id';
  const userId = 'your-user-id';

  // Handler to open wizard from customer profile
  const handleCreateJobForCustomer = (customerId: string) => {
    setInitialCustomerId(customerId);
    setShowWizard(true);
  };

  return (
    <div className="p-6">
      {/* Example customer list */}
      <div className="space-y-2">
        <div className="p-4 border rounded-lg">
          <h3>John Smith</h3>
          <button
            onClick={() => handleCreateJobForCustomer('customer-123')}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Create Job for Customer
          </button>
        </div>
      </div>

      {/* Wizard with pre-selected customer */}
      <JobCreationWizard
        isOpen={showWizard}
        onClose={() => {
          setShowWizard(false);
          setInitialCustomerId(undefined);
        }}
        companyId={companyId}
        userId={userId}
        initialCustomerId={initialCustomerId}
      />
    </div>
  );
};

// Example: Quick action from dashboard
export const DashboardQuickAction: React.FC = () => {
  const [showWizard, setShowWizard] = useState(false);

  const companyId = 'your-company-id';
  const userId = 'your-user-id';

  return (
    <>
      {/* Quick Action Card */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Quick Actions
        </h3>
        <div className="space-y-2">
          <button
            onClick={() => setShowWizard(true)}
            className="w-full p-3 text-left rounded-lg border-2 border-dashed border-gray-300
                       dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50
                       dark:hover:bg-blue-900/10 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Create New Job
              </span>
            </div>
          </button>
        </div>
      </div>

      <JobCreationWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        companyId={companyId}
        userId={userId}
      />
    </>
  );
};

/**
 * Integration Notes:
 *
 * 1. **State Management:**
 *    - The wizard uses useJobCreationWizard hook internally
 *    - All state is managed within the wizard
 *    - LocalStorage persistence enabled by default
 *
 * 2. **Props Required:**
 *    - isOpen: boolean (control visibility)
 *    - onClose: () => void (called when wizard closes)
 *    - companyId: string (from auth context)
 *    - userId: string (from auth context)
 *    - initialCustomerId?: string (optional pre-selection)
 *
 * 3. **Customization:**
 *    - Modify visualConfig in individual components
 *    - Extend step components with additional fields
 *    - Add custom validation rules in useJobCreationWizard
 *
 * 4. **Service Integration:**
 *    - Uses JobServiceExtensions.createJobFromWizard()
 *    - Integrates with CustomerManagementService
 *    - Optional ChatInterface integration (Step 3)
 *    - Optional MasterPricingEngine integration (Step 3)
 *
 * 5. **Error Handling:**
 *    - All errors displayed inline
 *    - Validation prevents invalid submissions
 *    - Network errors show retry options
 *
 * 6. **Accessibility:**
 *    - WCAG 2.1 AA compliant
 *    - Keyboard navigation (Tab, Enter, Escape)
 *    - Screen reader announcements
 *    - Focus management
 *
 * 7. **Mobile Support:**
 *    - Responsive design (desktop/tablet/mobile)
 *    - Touch-friendly controls
 *    - Swipe gestures (optional)
 *
 * 8. **Success Handling:**
 *    - onClose() called after successful creation
 *    - Optional: Navigate to job detail page
 *    - Optional: Refresh jobs list
 */
