/**
 * Job Services Tab
 *
 * Displays service line items with pricing breakdown
 * Shows quantity, unit price, and total for each service
 * Includes subtotal and grand total
 *
 * @module ServicesTab
 */

import React from 'react';
import * as Icons from 'lucide-react';
import { JobWithDetails } from '../../../../types/crm';
import { formatCurrency } from '../../../../utils/formatting';

interface ServicesTabProps {
  job: JobWithDetails;
  onUpdate: () => void;
  visualConfig: any;
  theme: any;
}

/**
 * Services Tab Component
 * Displays service line items and pricing
 */
export const ServicesTab: React.FC<ServicesTabProps> = ({
  job,
  onUpdate,
  visualConfig,
  theme
}) => {
  const services = job.services || [];
  const hasServices = services.length > 0;

  // Calculate totals
  const subtotal = services.reduce((sum, svc) => sum + (svc.total_price || 0), 0);
  const tax = 0; // TODO: Calculate tax if applicable
  const grandTotal = subtotal + tax;

  return (
    <div className="space-y-6">
      {/* Services Header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-lg font-semibold"
          style={{ color: visualConfig.colors.text.primary }}
        >
          Service Line Items
        </h3>
        {hasServices && (
          <span
            className="text-sm"
            style={{ color: visualConfig.colors.text.secondary }}
          >
            {services.length} {services.length === 1 ? 'service' : 'services'}
          </span>
        )}
      </div>

      {/* Empty State */}
      {!hasServices && (
        <div
          className="text-center py-12 rounded-lg"
          style={{ backgroundColor: visualConfig.colors.surface }}
        >
          <Icons.Package
            className="h-12 w-12 mx-auto mb-4"
            style={{ color: visualConfig.colors.text.secondary }}
          />
          <p
            className="text-lg font-medium mb-2"
            style={{ color: visualConfig.colors.text.primary }}
          >
            No Services Added
          </p>
          <p
            className="text-sm"
            style={{ color: visualConfig.colors.text.secondary }}
          >
            This job doesn't have any services yet
          </p>
        </div>
      )}

      {/* Services Table */}
      {hasServices && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr
                className="border-b"
                style={{ borderColor: visualConfig.colors.text.secondary + '20' }}
              >
                <th
                  className="text-left py-3 px-2 text-sm font-semibold"
                  style={{ color: visualConfig.colors.text.secondary }}
                >
                  Service
                </th>
                <th
                  className="text-right py-3 px-2 text-sm font-semibold"
                  style={{ color: visualConfig.colors.text.secondary }}
                >
                  Quantity
                </th>
                <th
                  className="text-right py-3 px-2 text-sm font-semibold"
                  style={{ color: visualConfig.colors.text.secondary }}
                >
                  Unit Price
                </th>
                <th
                  className="text-right py-3 px-2 text-sm font-semibold"
                  style={{ color: visualConfig.colors.text.secondary }}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {services.map((service, index) => (
                <tr
                  key={service.id || index}
                  className="border-b"
                  style={{ borderColor: visualConfig.colors.text.secondary + '10' }}
                >
                  {/* Service Name & Description */}
                  <td className="py-4 px-2">
                    <div>
                      <p
                        className="font-medium"
                        style={{ color: visualConfig.colors.text.primary }}
                      >
                        {service.service_name}
                      </p>
                      {service.service_description && (
                        <p
                          className="text-sm mt-1"
                          style={{ color: visualConfig.colors.text.secondary }}
                        >
                          {service.service_description}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Quantity */}
                  <td
                    className="py-4 px-2 text-right"
                    style={{ color: visualConfig.colors.text.primary }}
                  >
                    {service.quantity?.toLocaleString() || 0}
                  </td>

                  {/* Unit Price */}
                  <td
                    className="py-4 px-2 text-right"
                    style={{ color: visualConfig.colors.text.primary }}
                  >
                    {formatCurrency(service.unit_price || 0)}
                  </td>

                  {/* Total */}
                  <td
                    className="py-4 px-2 text-right font-semibold"
                    style={{ color: visualConfig.colors.text.primary }}
                  >
                    {formatCurrency(service.total_price || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals Section */}
      {hasServices && (
        <div className="space-y-3">
          <div
            className="h-px"
            style={{ backgroundColor: visualConfig.colors.text.secondary + '20' }}
          />

          {/* Subtotal */}
          <div className="flex items-center justify-between py-2">
            <span
              className="text-base font-medium"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              Subtotal
            </span>
            <span
              className="text-lg font-semibold"
              style={{ color: visualConfig.colors.text.primary }}
            >
              {formatCurrency(subtotal)}
            </span>
          </div>

          {/* Tax (if applicable) */}
          {tax > 0 && (
            <div className="flex items-center justify-between py-2">
              <span
                className="text-base font-medium"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                Tax
              </span>
              <span
                className="text-lg font-semibold"
                style={{ color: visualConfig.colors.text.primary }}
              >
                {formatCurrency(tax)}
              </span>
            </div>
          )}

          {/* Grand Total */}
          <div
            className="h-px"
            style={{ backgroundColor: visualConfig.colors.text.secondary + '20' }}
          />
          <div
            className="flex items-center justify-between p-4 rounded-lg"
            style={{ backgroundColor: visualConfig.colors.surface }}
          >
            <span
              className="text-lg font-semibold"
              style={{ color: visualConfig.colors.text.primary }}
            >
              Total
            </span>
            <span
              className="text-2xl font-bold"
              style={{ color: visualConfig.colors.primary }}
            >
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>
      )}

      {/* Service Details Section */}
      {hasServices && (
        <div className="space-y-4">
          <h4
            className="text-md font-semibold"
            style={{ color: visualConfig.colors.text.primary }}
          >
            Service Details
          </h4>

          {services.map((service, index) => (
            service.calculation_data && (
              <div
                key={service.id || index}
                className="p-4 rounded-lg"
                style={{ backgroundColor: visualConfig.colors.surface }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h5
                    className="font-medium"
                    style={{ color: visualConfig.colors.text.primary }}
                  >
                    {service.service_name}
                  </h5>
                  <Icons.ChevronDown
                    size={20}
                    style={{ color: visualConfig.colors.text.secondary }}
                  />
                </div>
                {service.pricing_variables && (
                  <div className="mt-3 space-y-1">
                    <p
                      className="text-sm font-medium"
                      style={{ color: visualConfig.colors.text.secondary }}
                    >
                      Variables:
                    </p>
                    <pre
                      className="text-xs p-2 rounded"
                      style={{
                        backgroundColor: visualConfig.colors.background,
                        color: visualConfig.colors.text.primary
                      }}
                    >
                      {JSON.stringify(service.pricing_variables, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default ServicesTab;
