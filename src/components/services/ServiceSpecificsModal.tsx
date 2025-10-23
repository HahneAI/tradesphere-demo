import React from 'react';
import { DynamicServiceModal } from './service-modals/DynamicServiceModal';
import { GenericServiceModal } from './service-modals/GenericServiceModal';

interface ServiceSpecificsModalProps {
  isOpen: boolean;
  serviceId: string;
  serviceName: string;
  onClose: () => void;
  visualConfig: any;
  theme: string;
}

/**
 * ServiceSpecificsModal - Router Component
 *
 * Routes to the appropriate service-specific modal based on serviceId.
 * Uses DynamicServiceModal for standardized JSONB services, with GenericServiceModal
 * as fallback for unknown services.
 *
 * Routing Logic:
 * - paver_patio_sqft → DynamicServiceModal (reads standardized JSONB, multi-category tabs)
 * - excavation_removal → DynamicServiceModal (reads standardized JSONB, single category)
 * - All other services → GenericServiceModal (fallback renderer)
 */
export const ServiceSpecificsModal: React.FC<ServiceSpecificsModalProps> = (props) => {
  const { serviceId } = props;

  // Route standardized services to DynamicServiceModal
  if (serviceId === 'paver_patio_sqft' || serviceId === 'excavation_removal') {
    return <DynamicServiceModal {...props} />;
  }

  // Fallback: Use generic renderer for unknown services
  return <GenericServiceModal {...props} />;
};
