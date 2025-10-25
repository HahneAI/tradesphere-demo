/**
 * Review Step (Step 4)
 *
 * Final review of all job data before creation.
 * Shows customer, job details, and services summaries with edit actions.
 */

import React from 'react';
import { CustomerProfile } from '../../../types/customer';
import { JobDetailsData, ServiceLineItem } from '../../../hooks/useJobCreationWizard';

interface ReviewStepProps {
  customer: CustomerProfile | null;
  jobDetails: JobDetailsData;
  services: ServiceLineItem[];
  estimatedTotal: number;
  onEditStep: (step: number) => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  customer,
  jobDetails,
  services,
  estimatedTotal,
  onEditStep,
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getPriorityLabel = (priority: number): { label: string; color: string } => {
    if (priority <= 2) return { label: 'Low', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' };
    if (priority <= 5) return { label: 'Normal', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
    if (priority <= 8) return { label: 'High', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' };
    return { label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
  };

  const priority = getPriorityLabel(jobDetails.priority);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Review & Confirm
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Review all details before creating the job
        </p>
      </div>

      {/* Customer Section */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Customer</h3>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(1)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Edit
          </button>
        </div>
        <div className="p-4 space-y-2">
          <div className="font-medium text-gray-900 dark:text-gray-100">{customer?.customer_name}</div>
          {customer?.customer_email && (
            <div className="text-sm text-gray-600 dark:text-gray-400">{customer.customer_email}</div>
          )}
          {customer?.customer_phone && (
            <div className="text-sm text-gray-600 dark:text-gray-400">{customer.customer_phone}</div>
          )}
        </div>
      </div>

      {/* Job Details Section */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Job Details</h3>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(2)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Edit
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Title</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{jobDetails.title}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Address</div>
            <div className="text-sm text-gray-900 dark:text-gray-100">
              {jobDetails.service_address}
              {(jobDetails.service_city || jobDetails.service_state || jobDetails.service_zip) && (
                <span>, {jobDetails.service_city}, {jobDetails.service_state} {jobDetails.service_zip}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Priority</div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priority.color}`}>
                {priority.label}
              </span>
            </div>
            {jobDetails.requested_start_date && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Requested Start</div>
                <div className="text-sm text-gray-900 dark:text-gray-100">
                  {new Date(jobDetails.requested_start_date).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Services ({services.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(3)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Edit
          </button>
        </div>
        <div className="p-4 space-y-2">
          {services.map((service, index) => (
            <div key={index} className="flex items-start justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{service.service_name}</div>
                {service.service_description && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{service.service_description}</div>
                )}
              </div>
              <div className="text-right ml-4">
                <div className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(service.total_price)}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Qty: {service.quantity}</div>
              </div>
            </div>
          ))}
          <div className="pt-3 border-t-2 border-gray-300 dark:border-gray-600 flex items-center justify-between">
            <span className="font-semibold text-gray-900 dark:text-gray-100">Estimated Total</span>
            <span className="font-bold text-xl text-gray-900 dark:text-gray-100">{formatCurrency(estimatedTotal)}</span>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              Choose how to proceed
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Save as Quote to create without scheduling, or Schedule Job to assign crews in the next step.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
