/**
 * Invoice Options Modal
 *
 * Presents invoice generation and delivery options:
 * - Download PDF only
 * - Download & text to customer
 * - Download & email to customer
 *
 * NOTE: This is a placeholder component. Full implementation requires:
 * - PDF invoice template design
 * - SMS integration (Twilio)
 * - Email integration (SendGrid/Resend)
 * - Customer communication preferences system
 *
 * @module InvoiceOptionsModal
 */

import React from 'react';
import * as Icons from 'lucide-react';
import { CustomerProfile } from '../../../types/customer';

interface JobData {
  customer: CustomerProfile | null;
  jobDetails: {
    title: string;
    description?: string;
    service_address?: string;
    service_city?: string;
    service_state?: string;
    service_zip?: string;
  };
  services: Array<{
    service_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  total: number;
}

interface InvoiceOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobData: JobData;
  onDownload: () => void;
  onDownloadAndText: () => void;
  onDownloadAndEmail: () => void;
}

/**
 * Invoice Options Modal Component
 * Allows user to choose how to generate and deliver invoice
 */
export const InvoiceOptionsModal: React.FC<InvoiceOptionsModalProps> = ({
  isOpen,
  onClose,
  jobData,
  onDownload,
  onDownloadAndText,
  onDownloadAndEmail
}) => {
  if (!isOpen) return null;

  const handleDownload = () => {
    console.log('[InvoiceOptionsModal] Download invoice requested');
    console.log('Job data:', jobData);
    onDownload();
    // TODO: Generate PDF invoice and trigger download
  };

  const handleDownloadAndText = () => {
    console.log('[InvoiceOptionsModal] Download & text requested');
    console.log('Customer phone:', jobData.customer?.customer_phone);
    onDownloadAndText();
    // TODO: Generate PDF, upload to storage, send SMS link to customer
  };

  const handleDownloadAndEmail = () => {
    console.log('[InvoiceOptionsModal] Download & email requested');
    console.log('Customer email:', jobData.customer?.customer_email);
    onDownloadAndEmail();
    // TODO: Generate PDF, upload to storage, send email with attachment to customer
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-[450px] max-w-[95vw] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Invoice Options
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <Icons.X size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Job Summary */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-sm space-y-1">
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {jobData.customer?.customer_name || 'Unknown Customer'}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                {jobData.jobDetails.title || 'Untitled Job'}
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-2">
                Total: ${jobData.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {jobData.services.length} {jobData.services.length === 1 ? 'service' : 'services'} included
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {/* Option 1: Download Only */}
            <button
              onClick={handleDownload}
              className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg
                         hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600
                         transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30
                                flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icons.Download size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    Download Invoice
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Save PDF to your device
                  </div>
                </div>
                <Icons.ChevronRight size={20} className="text-gray-400 dark:text-gray-600" />
              </div>
            </button>

            {/* Option 2: Download + Text */}
            <button
              onClick={handleDownloadAndText}
              className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg
                         hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600
                         transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30
                                flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icons.MessageSquare size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    Download & Text to Customer
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {jobData.customer?.customer_phone
                      ? `Send SMS to ${jobData.customer.customer_phone}`
                      : 'No phone number on file'
                    }
                  </div>
                </div>
                <Icons.ChevronRight size={20} className="text-gray-400 dark:text-gray-600" />
              </div>
            </button>

            {/* Option 3: Download + Email */}
            <button
              onClick={handleDownloadAndEmail}
              className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg
                         hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600
                         transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30
                                flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icons.Mail size={24} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    Download & Email to Customer
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {jobData.customer?.customer_email
                      ? `Send to ${jobData.customer.customer_email}`
                      : 'No email address on file'
                    }
                  </div>
                </div>
                <Icons.ChevronRight size={20} className="text-gray-400 dark:text-gray-600" />
              </div>
            </button>
          </div>

          {/* Placeholder Notice */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Icons.AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  Feature Under Development
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                  Invoice generation is not yet implemented. This requires:
                </p>
                <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
                  <li>PDF invoice template design</li>
                  <li>SMS integration (Twilio)</li>
                  <li>Email integration (SendGrid/Resend)</li>
                  <li>Customer contact preferences</li>
                  <li>Invoice storage system</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                         text-gray-700 dark:text-gray-300 font-medium
                         hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceOptionsModal;
