/**
 * Job Overview Tab
 *
 * Displays comprehensive job information including:
 * - Job details (title, description, priority, dates)
 * - Customer information
 * - Service address
 * - Financial summary
 * - Key metrics
 *
 * @module OverviewTab
 */

import React from 'react';
import * as Icons from 'lucide-react';
import { JobWithDetails } from '../../../../types/crm';
import { formatCurrency, formatDate } from '../../../../utils/formatting';

interface OverviewTabProps {
  job: JobWithDetails;
  onUpdate: () => void;
  visualConfig: any;
  theme: any;
}

/**
 * Overview Tab Component
 * Shows job details in a readable format
 */
export const OverviewTab: React.FC<OverviewTabProps> = ({
  job,
  onUpdate,
  visualConfig,
  theme
}) => {
  return (
    <div className="space-y-6">
      {/* Job Information Section */}
      <div>
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: visualConfig.colors.text.primary }}
        >
          Job Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Job Title */}
          <div>
            <label
              className="text-sm font-medium block mb-1"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              Job Title
            </label>
            <p
              className="text-base"
              style={{ color: visualConfig.colors.text.primary }}
            >
              {job.title || 'No title'}
            </p>
          </div>

          {/* Job Number */}
          <div>
            <label
              className="text-sm font-medium block mb-1"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              Job Number
            </label>
            <p
              className="text-base font-mono"
              style={{ color: visualConfig.colors.text.primary }}
            >
              {job.job_number}
            </p>
          </div>

          {/* Priority */}
          <div>
            <label
              className="text-sm font-medium block mb-1"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              Priority
            </label>
            <div className="flex items-center gap-2">
              {job.priority >= 8 && (
                <Icons.AlertCircle size={16} className="text-red-500" />
              )}
              <span
                className="px-2 py-1 text-sm font-semibold rounded"
                style={{
                  backgroundColor: getPriorityColor(job.priority) + '20',
                  color: getPriorityColor(job.priority)
                }}
              >
                {getPriorityLabel(job.priority)}
              </span>
            </div>
          </div>

          {/* Status */}
          <div>
            <label
              className="text-sm font-medium block mb-1"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              Status
            </label>
            <span
              className="px-2 py-1 text-sm font-semibold rounded"
              style={{
                backgroundColor: getStatusColor(job.status) + '20',
                color: getStatusColor(job.status)
              }}
            >
              {job.status}
            </span>
          </div>
        </div>

        {/* Description */}
        {job.description && (
          <div className="mt-4">
            <label
              className="text-sm font-medium block mb-1"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              Description
            </label>
            <p
              className="text-base whitespace-pre-wrap"
              style={{ color: visualConfig.colors.text.primary }}
            >
              {job.description}
            </p>
          </div>
        )}
      </div>

      {/* Customer Information Section */}
      <div>
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: visualConfig.colors.text.primary }}
        >
          Customer Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Name */}
          <div>
            <label
              className="text-sm font-medium block mb-1"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              Customer Name
            </label>
            <p
              className="text-base"
              style={{ color: visualConfig.colors.text.primary }}
            >
              {job.customer?.customer_name || 'Unknown'}
            </p>
          </div>

          {/* Customer Email */}
          {job.customer?.customer_email && (
            <div>
              <label
                className="text-sm font-medium block mb-1"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                Email
              </label>
              <a
                href={`mailto:${job.customer.customer_email}`}
                className="text-base underline"
                style={{ color: visualConfig.colors.primary }}
              >
                {job.customer.customer_email}
              </a>
            </div>
          )}

          {/* Customer Phone */}
          {job.customer?.customer_phone && (
            <div>
              <label
                className="text-sm font-medium block mb-1"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                Phone
              </label>
              <a
                href={`tel:${job.customer.customer_phone}`}
                className="text-base underline"
                style={{ color: visualConfig.colors.primary }}
              >
                {job.customer.customer_phone}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Service Address Section */}
      <div>
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: visualConfig.colors.text.primary }}
        >
          Service Address
        </h3>
        <div className="flex items-start gap-2">
          <Icons.MapPin size={20} style={{ color: visualConfig.colors.text.secondary }} className="mt-1" />
          <div>
            <p
              className="text-base"
              style={{ color: visualConfig.colors.text.primary }}
            >
              {job.service_address || 'No address provided'}
            </p>
            {(job.service_city || job.service_state || job.service_zip) && (
              <p
                className="text-sm"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                {[job.service_city, job.service_state, job.service_zip].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Dates Section */}
      <div>
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: visualConfig.colors.text.primary }}
        >
          Important Dates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Created Date */}
          <div>
            <label
              className="text-sm font-medium block mb-1"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              Created
            </label>
            <p
              className="text-base"
              style={{ color: visualConfig.colors.text.primary }}
            >
              {formatDate(job.created_at)}
            </p>
          </div>

          {/* Requested Start Date */}
          {job.requested_start_date && (
            <div>
              <label
                className="text-sm font-medium block mb-1"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                Requested Start
              </label>
              <p
                className="text-base"
                style={{ color: visualConfig.colors.text.primary }}
              >
                {formatDate(job.requested_start_date)}
              </p>
            </div>
          )}

          {/* Scheduled Start Date */}
          {job.scheduled_start_date && (
            <div>
              <label
                className="text-sm font-medium block mb-1"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                Scheduled Start
              </label>
              <p
                className="text-base"
                style={{ color: visualConfig.colors.text.primary }}
              >
                {formatDate(job.scheduled_start_date)}
              </p>
            </div>
          )}

          {/* Scheduled End Date */}
          {job.scheduled_end_date && (
            <div>
              <label
                className="text-sm font-medium block mb-1"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                Scheduled End
              </label>
              <p
                className="text-base"
                style={{ color: visualConfig.colors.text.primary }}
              >
                {formatDate(job.scheduled_end_date)}
              </p>
            </div>
          )}

          {/* Quote Valid Until */}
          {job.quote_valid_until && job.status === 'quote' && (
            <div>
              <label
                className="text-sm font-medium block mb-1"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                Quote Valid Until
              </label>
              <p
                className="text-base"
                style={{ color: visualConfig.colors.text.primary }}
              >
                {formatDate(job.quote_valid_until)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Financial Summary */}
      <div>
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: visualConfig.colors.text.primary }}
        >
          Financial Summary
        </h3>
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: visualConfig.colors.surface }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-sm font-medium"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              Estimated Total
            </span>
            <span
              className="text-2xl font-bold"
              style={{ color: visualConfig.colors.text.primary }}
            >
              {formatCurrency(job.estimated_total || 0)}
            </span>
          </div>

          {job.services && job.services.length > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: visualConfig.colors.text.secondary + '20' }}>
              <span
                className="text-sm"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                {job.services.length} {job.services.length === 1 ? 'service' : 'services'} included
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Helper: Get priority color
 */
function getPriorityColor(priority: number): string {
  if (priority >= 10) return '#EF4444'; // Urgent - red
  if (priority >= 8) return '#F59E0B'; // High - orange
  if (priority >= 5) return '#3B82F6'; // Normal - blue
  return '#64748B'; // Low - gray
}

/**
 * Helper: Get priority label
 */
function getPriorityLabel(priority: number): string {
  if (priority >= 10) return 'Urgent';
  if (priority >= 8) return 'High';
  if (priority >= 5) return 'Normal';
  return 'Low';
}

/**
 * Helper: Get status color
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    quote: '#64748B',
    approved: '#3B82F6',
    scheduled: '#8B5CF6',
    in_progress: '#F59E0B',
    completed: '#10B981',
    invoiced: '#059669',
    cancelled: '#EF4444'
  };
  return colors[status] || '#64748B';
}

export default OverviewTab;
