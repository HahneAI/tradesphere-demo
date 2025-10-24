/**
 * Customer Card Component
 *
 * Displays customer information in a selectable card format.
 * Shows name, contact info, address, and job history.
 * Supports selected state highlighting and hover effects.
 *
 * @component CustomerCard
 */

import React from 'react';
import { CustomerProfile } from '../../../../types/customer';

interface CustomerCardProps {
  customer: CustomerProfile;
  isSelected: boolean;
  onSelect: (customer: CustomerProfile) => void;
  jobCount?: number;
  lastJobDate?: string;
  className?: string;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({
  customer,
  isSelected,
  onSelect,
  jobCount = 0,
  lastJobDate,
  className = '',
}) => {
  // Generate initials from customer name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format date for display
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(customer)}
      className={`
        w-full p-4 rounded-lg border-2 transition-all text-left group
        hover:shadow-md hover:scale-[1.01]
        ${
          isSelected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
        }
        ${className}
      `}
      aria-pressed={isSelected}
      aria-label={`Select ${customer.customer_name}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {/* Avatar */}
          <div
            className={`
              w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
              ${
                isSelected
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
              }
            `}
          >
            <span className="text-sm font-semibold">
              {getInitials(customer.customer_name)}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            {/* Name */}
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 truncate">
              {customer.customer_name}
            </h3>

            {/* Address */}
            {customer.customer_address && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">
                {customer.customer_address}
              </p>
            )}

            {/* Contact Info */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-500">
              {customer.customer_email && (
                <span className="flex items-center gap-1 truncate">
                  <svg
                    className="w-3.5 h-3.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="truncate">{customer.customer_email}</span>
                </span>
              )}
              {customer.customer_phone && (
                <span className="flex items-center gap-1">
                  <svg
                    className="w-3.5 h-3.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  {customer.customer_phone}
                </span>
              )}
            </div>

            {/* Job Stats */}
            {jobCount > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <span>
                  {jobCount} {jobCount === 1 ? 'job' : 'jobs'}
                </span>
                {lastJobDate && (
                  <>
                    <span>•</span>
                    <span>Last: {formatDate(lastJobDate)}</span>
                  </>
                )}
              </div>
            )}

            {/* Lifecycle Stage Badge */}
            {customer.lifecycle_stage && (
              <div className="mt-2">
                <span
                  className={`
                    inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                    ${
                      customer.lifecycle_stage === 'active'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : customer.lifecycle_stage === 'lead'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  {customer.lifecycle_stage}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Selection Indicator */}
        <div
          className={`
            w-6 h-6 rounded-full flex items-center justify-center transition-colors flex-shrink-0
            ${
              isSelected
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
            }
          `}
          aria-hidden="true"
        >
          {isSelected ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
};
