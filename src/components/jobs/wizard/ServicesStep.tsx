/**
 * Services Step (Step 3)
 *
 * Add and manage service line items through AI Chat, Quick Calculator, or Manual entry.
 * Displays services table with total calculation.
 */

import React, { useState } from 'react';
import { ServiceLineItem as ServiceLineItemType } from '../../../hooks/useJobCreationWizard';
import { ServiceLineItem } from './components/ServiceLineItem';
import { InlineQuickCalculator } from './components/InlineQuickCalculator';
import { FinancialAdjustments } from './components/FinancialAdjustments';
import { Adjustment, calculateAdjustedPrice } from './adjustments';

interface ServicesStepProps {
  services: ServiceLineItemType[];
  onAddService: (service: ServiceLineItemType) => void;
  onRemoveService: (index: number) => void;
  onUpdateService?: (index: number, service: ServiceLineItemType) => void;
  onOpenAIChat?: () => void;
  onOpenCalculator?: () => void;
  estimatedTotal: number;
  companyId: string;
  userId: string;
}

export const ServicesStep: React.FC<ServicesStepProps> = ({
  services,
  onAddService,
  onRemoveService,
  onUpdateService,
  onOpenAIChat,
  onOpenCalculator,
  estimatedTotal,
  companyId,
  userId,
}) => {
  const [manualService, setManualService] = useState({
    name: '',
    quantity: 1,
    unitPrice: 0,
  });

  const [selectedServiceIndex, setSelectedServiceIndex] = useState<number | null>(null);

  const handleAddManualService = () => {
    if (!manualService.name || manualService.unitPrice <= 0) return;

    const newService: ServiceLineItemType = {
      service_config_id: 'manual-' + Date.now(),
      service_name: manualService.name,
      quantity: manualService.quantity,
      unit_price: manualService.unitPrice,
      total_price: manualService.quantity * manualService.unitPrice,
      metadata: { source: 'manual' },
    };

    onAddService(newService);
    setManualService({ name: '', quantity: 1, unitPrice: 0 });
  };

  const handleApplyAdjustment = (serviceIndex: number, adjustment: Adjustment) => {
    if (!onUpdateService) return;

    const service = services[serviceIndex];
    const existingAdjustments = service.adjustments || [];
    const updatedAdjustments = [...existingAdjustments, adjustment];

    // Calculate new total price with all adjustments
    let adjustedPrice = service.unit_price * (service.quantity || 1);
    for (const adj of updatedAdjustments) {
      adjustedPrice = calculateAdjustedPrice(adjustedPrice, adj);
    }

    const updatedService: ServiceLineItemType = {
      ...service,
      adjustments: updatedAdjustments,
      total_price: adjustedPrice,
      metadata: {
        ...service.metadata,
        adjustments: updatedAdjustments,
      },
    };

    onUpdateService(serviceIndex, updatedService);
  };

  const handleRemoveAdjustment = (serviceIndex: number, adjustmentId: string) => {
    if (!onUpdateService) return;

    const service = services[serviceIndex];
    const updatedAdjustments = (service.adjustments || []).filter((adj) => adj.id !== adjustmentId);

    // Recalculate total price with remaining adjustments
    let adjustedPrice = service.unit_price * (service.quantity || 1);
    for (const adj of updatedAdjustments) {
      adjustedPrice = calculateAdjustedPrice(adjustedPrice, adj);
    }

    const updatedService: ServiceLineItemType = {
      ...service,
      adjustments: updatedAdjustments,
      total_price: adjustedPrice,
      metadata: {
        ...service.metadata,
        adjustments: updatedAdjustments,
      },
    };

    onUpdateService(serviceIndex, updatedService);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Add Services
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose how you'd like to add services to this job
        </p>
      </div>

      {/* Inline Quick Calculator Section */}
      <InlineQuickCalculator
        companyId={companyId}
        userId={userId}
        onCommitService={onAddService}
      />

      {/* Service Input Methods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* AI Chat */}
        {onOpenAIChat && (
          <button
            type="button"
            onClick={onOpenAIChat}
            className="p-6 rounded-lg border-2 border-gray-200 dark:border-gray-700
                       bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20
                       hover:border-purple-400 transition-all group"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center
                              group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">AI Chat</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Describe the project and let AI calculate pricing
                </div>
              </div>
            </div>
          </button>
        )}

        {/* Quick Calculator */}
        {onOpenCalculator && (
          <button
            type="button"
            onClick={onOpenCalculator}
            className="p-6 rounded-lg border-2 border-gray-200 dark:border-gray-700
                       bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20
                       hover:border-blue-400 transition-all group"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center
                              group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">Quick Calculator</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Use pricing formulas to calculate service costs
                </div>
              </div>
            </div>
          </button>
        )}

        {/* Financial Adjustments Section (Replaces Manual Entry) */}
        <div className="md:col-span-3">
          <FinancialAdjustments
            services={services}
            selectedServiceIndex={selectedServiceIndex}
            onSelectService={setSelectedServiceIndex}
            onApplyAdjustment={handleApplyAdjustment}
            onRemoveAdjustment={handleRemoveAdjustment}
          />
        </div>
      </div>

      {/* Services Table */}
      {services.length > 0 ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {services.map((service, index) => (
                <ServiceLineItem
                  key={service.tempId || index}
                  service={service}
                  index={index}
                  onRemove={onRemoveService}
                />
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-800 border-t-2 border-gray-300 dark:border-gray-600">
              <tr>
                <td colSpan={3} className="px-4 py-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                  Estimated Total:
                </td>
                <td className="px-4 py-4 text-right font-bold text-lg text-gray-900 dark:text-gray-100">
                  {formatCurrency(estimatedTotal)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 font-medium">No services added yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Choose an input method above to get started</p>
        </div>
      )}
    </div>
  );
};
