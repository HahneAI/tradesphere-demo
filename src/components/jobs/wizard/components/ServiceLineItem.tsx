/**
 * Service Line Item Component
 *
 * Table row displaying service details with edit and delete actions.
 * Shows service name, quantity, unit price, total price, and source badge.
 *
 * @component ServiceLineItem
 */

import React from 'react';
import { ServiceLineItem as ServiceLineItemType } from '../../../../hooks/useJobCreationWizard';

interface ServiceLineItemProps {
  service: ServiceLineItemType;
  index: number;
  onRemove: (index: number) => void;
  className?: string;
}

export const ServiceLineItem: React.FC<ServiceLineItemProps> = ({
  service,
  index,
  onRemove,
  className = '',
}) => {
  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Get source badge color
  const getSourceBadge = () => {
    const badges = {
      'ai-chat': {
        label: 'AI Chat',
        className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      },
      'quick-calculator': {
        label: 'Calculator',
        className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      },
      manual: {
        label: 'Manual',
        className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
      },
      template: {
        label: 'Template',
        className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      },
    };

    const source = service.metadata?.source as keyof typeof badges || 'manual';
    return badges[source] || badges.manual;
  };

  const sourceBadge = getSourceBadge();

  return (
    <tr className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${className}`}>
      {/* Service Name & Description */}
      <td className="px-4 py-3">
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {service.service_name}
          </div>
          {service.service_description && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
              {service.service_description}
            </div>
          )}
          {/* Source Badge */}
          <div className="mt-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sourceBadge.className}`}
            >
              {sourceBadge.label}
            </span>
          </div>
        </div>
      </td>

      {/* Quantity */}
      <td className="px-4 py-3 text-center">
        <span className="text-sm text-gray-900 dark:text-gray-100">{service.quantity}</span>
      </td>

      {/* Unit Price */}
      <td className="px-4 py-3 text-right">
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {formatCurrency(service.unit_price)}
        </span>
      </td>

      {/* Total Price */}
      <td className="px-4 py-3 text-right">
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {formatCurrency(service.total_price)}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="w-8 h-8 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors inline-flex items-center justify-center"
          aria-label={`Remove ${service.service_name}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </td>
    </tr>
  );
};
