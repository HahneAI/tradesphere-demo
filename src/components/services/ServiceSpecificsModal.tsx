import React from 'react';
import { PaverPatioSpecificsModal } from './service-modals/PaverPatioSpecificsModal';
import { ExcavationSpecificsModal } from './service-modals/ExcavationSpecificsModal';
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
 * This enables each service to have its own optimized modal while providing
 * a generic fallback for services without custom implementations.
 *
 * Routing Logic:
 * - paver_patio_sqft → PaverPatioSpecificsModal (custom, hardcoded)
 * - excavation_removal → ExcavationSpecificsModal (custom, reads calculationSettings)
 * - All other services → GenericServiceModal (uses GenericVariableRenderer)
 */
export const ServiceSpecificsModal: React.FC<ServiceSpecificsModalProps> = (props) => {
  const { serviceId } = props;

  console.log('🔀 [MODAL ROUTER] Routing to modal for service:', serviceId);

  // Route to Paver Patio modal (preserves existing functionality)
  if (serviceId === 'paver_patio_sqft') {
    console.log('✅ [MODAL ROUTER] Routing to PaverPatioSpecificsModal');
    return <PaverPatioSpecificsModal {...props} />;
  }

  // Route to Excavation modal (new calculationSettings structure)
  if (serviceId === 'excavation_removal') {
    console.log('✅ [MODAL ROUTER] Routing to ExcavationSpecificsModal');
    return <ExcavationSpecificsModal {...props} />;
  }

  // Fallback: Use generic renderer for unknown services
  console.log('✅ [MODAL ROUTER] Routing to GenericServiceModal (fallback)');
  return <GenericServiceModal {...props} />;
};
