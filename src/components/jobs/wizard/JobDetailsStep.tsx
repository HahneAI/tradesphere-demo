/**
 * Job Details Step (Step 2)
 *
 * Collects job information: title, location, priority, requested dates.
 * Auto-populates address from customer, validates required fields.
 */

import React from 'react';
import { JobDetailsData } from '../../../hooks/useJobCreationWizard';
import { PrioritySelector } from './components/PrioritySelector';

interface JobDetailsStepProps {
  jobDetails: JobDetailsData;
  onUpdate: (updates: Partial<JobDetailsData>) => void;
  errors?: Record<string, string>;
}

export const JobDetailsStep: React.FC<JobDetailsStepProps> = ({
  jobDetails,
  onUpdate,
  errors = {},
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Job Information
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Enter details about the work to be performed
        </p>
      </div>

      {/* Job Title */}
      <div className="space-y-2">
        <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Job Title <span className="text-red-500">*</span>
        </label>
        <input
          id="jobTitle"
          type="text"
          value={jobDetails.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="e.g., Backyard Paver Patio"
          className={`w-full h-12 px-4 text-sm border rounded-lg transition-all
                      bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                      placeholder-gray-400 focus:ring-2 focus:ring-blue-500
                      ${errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
          required
        />
        {errors.title && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.title}</p>
        )}
      </div>

      {/* Service Address */}
      <div className="space-y-2">
        <label htmlFor="serviceAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Service Address <span className="text-red-500">*</span>
        </label>
        <input
          id="serviceAddress"
          type="text"
          value={jobDetails.service_address || ''}
          onChange={(e) => onUpdate({ service_address: e.target.value })}
          placeholder="123 Main Street"
          className={`w-full h-12 px-4 text-sm border rounded-lg transition-all
                      bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                      placeholder-gray-400 focus:ring-2 focus:ring-blue-500
                      ${errors.service_address ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
          required
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Pre-filled from customer. Edit if work location is different.
        </p>
        {errors.service_address && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.service_address}</p>
        )}
      </div>

      {/* City, State, ZIP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            City
          </label>
          <input
            id="city"
            type="text"
            value={jobDetails.service_city || ''}
            onChange={(e) => onUpdate({ service_city: e.target.value })}
            placeholder="Springfield"
            className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            State
          </label>
          <input
            id="state"
            type="text"
            value={jobDetails.service_state || ''}
            onChange={(e) => onUpdate({ service_state: e.target.value })}
            placeholder="IL"
            maxLength={2}
            className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="zip" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            ZIP Code
          </label>
          <input
            id="zip"
            type="text"
            value={jobDetails.service_zip || ''}
            onChange={(e) => onUpdate({ service_zip: e.target.value })}
            placeholder="62701"
            maxLength={10}
            className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
        </label>
        <textarea
          id="description"
          value={jobDetails.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Provide any additional details about the work..."
          rows={4}
          maxLength={500}
          className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     placeholder-gray-400 focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {(jobDetails.description || '').length} / 500 characters
        </p>
      </div>

      {/* Priority Selector */}
      <PrioritySelector
        value={jobDetails.priority}
        onChange={(value) => onUpdate({ priority: value })}
      />

      {/* Requested Start Date */}
      <div className="space-y-2">
        <label htmlFor="requestedDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Requested Start Date
        </label>
        <input
          id="requestedDate"
          type="date"
          value={jobDetails.requested_start_date || ''}
          onChange={(e) => onUpdate({ requested_start_date: e.target.value })}
          className="w-full h-12 px-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};
