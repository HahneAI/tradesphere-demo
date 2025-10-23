/**
 * Service Registry - Central metadata for all pricing services
 *
 * This registry provides:
 * - Service identification and routing
 * - AI keyword matching for chat system
 * - UI display configuration
 * - Config file paths
 *
 * To add a new service:
 * 1. Create the service formula JSON file
 * 2. Add entry to this registry
 * 3. System automatically picks it up (no other changes needed)
 */

export interface ServiceRegistryEntry {
  configPath: string;
  category: string;
  displayName: string;
  icon: string;  // Lucide icon name
  aiKeywords: string[];  // Keywords for AI detection
  description: string;
  unit: string;  // Primary unit (sqft, cubic yards, linear feet, etc)
}

export const SERVICE_REGISTRY = {
  paver_patio_sqft: {
    configPath: './paver-patio-formula.json',
    category: 'Hardscaping',
    displayName: 'Paver Patio (SQFT)',
    icon: 'Blocks',
    aiKeywords: ['patio', 'pavers', 'stone patio', 'brick patio', 'flagstone patio', 'hardscape', 'outdoor living', 'backyard patio', 'bluestone', 'travertine', 'paver'],
    description: 'Professional paver patio installation pricing with material and labor calculations',
    unit: 'sqft'
  },
  excavation_removal: {
    configPath: './excavation-removal-formula.json',
    category: 'Excavation',
    displayName: 'Excavation & Debris Removal',
    icon: 'Construction',
    aiKeywords: ['excavation', 'excavate', 'removal', 'debris', 'dig', 'digging', 'haul', 'hauling', 'topsoil', 'grading', 'trenching', 'fill dirt', 'dump', 'earth moving'],
    description: 'Excavation and debris removal pricing with equipment and disposal costs',
    unit: 'cubic yards'
  }
} as const;

export type ServiceId = keyof typeof SERVICE_REGISTRY;

/**
 * Get all registered service IDs
 */
export function getAllServiceIds(): ServiceId[] {
  return Object.keys(SERVICE_REGISTRY) as ServiceId[];
}

/**
 * Get service metadata by ID
 */
export function getServiceInfo(serviceId: ServiceId): ServiceRegistryEntry {
  return SERVICE_REGISTRY[serviceId];
}

/**
 * Get all services in a specific category
 */
export function getServicesByCategory(category: string): ServiceId[] {
  return getAllServiceIds().filter(
    id => SERVICE_REGISTRY[id].category === category
  );
}

/**
 * Validate if a service ID exists
 */
export function isValidServiceId(serviceId: string): serviceId is ServiceId {
  return serviceId in SERVICE_REGISTRY;
}
