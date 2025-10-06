/**
 * Service Router - AI-powered service detection and routing
 *
 * Maps detected categories and text content to specific service IDs
 * Used by AI chat system to route pricing requests to correct service
 */

import { SERVICE_REGISTRY, ServiceId } from '../../config/service-registry';

/**
 * Map category name to service ID
 * Used after GPTServiceSplitter detects a category
 */
export function mapCategoryToService(category: string): ServiceId {
  const categoryMap: Record<string, ServiceId> = {
    'hardscaping': 'paver_patio_sqft',
    'excavation': 'excavation_removal',
    // Add more categories as services are added
  };

  const normalized = category.toLowerCase().trim();
  return categoryMap[normalized] || 'paver_patio_sqft'; // Default to paver patio
}

/**
 * Detect service from text using AI keyword matching
 * Scans text for service-specific keywords
 */
export function detectServiceFromText(text: string): ServiceId {
  const lowerText = text.toLowerCase();

  // Score each service based on keyword matches
  const scores: Record<string, number> = {};

  for (const [serviceId, info] of Object.entries(SERVICE_REGISTRY)) {
    let score = 0;
    for (const keyword of info.aiKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    scores[serviceId] = score;
  }

  // Find service with highest score
  let maxScore = 0;
  let bestService: ServiceId = 'paver_patio_sqft'; // default

  for (const [serviceId, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestService = serviceId as ServiceId;
    }
  }

  console.log('🔍 [SERVICE ROUTER] Keyword detection:', {
    text: text.substring(0, 100),
    scores,
    selected: bestService,
    confidence: maxScore > 0 ? 'high' : 'low'
  });

  return bestService;
}

/**
 * Detect multiple services from text
 * Useful when user mentions multiple service types in one request
 */
export function detectMultipleServices(text: string): ServiceId[] {
  const lowerText = text.toLowerCase();
  const detectedServices = new Set<ServiceId>();

  for (const [serviceId, info] of Object.entries(SERVICE_REGISTRY)) {
    for (const keyword of info.aiKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        detectedServices.add(serviceId as ServiceId);
        break; // Found match for this service, move to next
      }
    }
  }

  // If no services detected, default to paver patio
  if (detectedServices.size === 0) {
    detectedServices.add('paver_patio_sqft');
  }

  console.log('🔍 [SERVICE ROUTER] Multi-service detection:', {
    text: text.substring(0, 100),
    detected: Array.from(detectedServices),
    count: detectedServices.size
  });

  return Array.from(detectedServices);
}

/**
 * Get service display name for logging
 */
export function getServiceDisplayName(serviceId: ServiceId): string {
  return SERVICE_REGISTRY[serviceId]?.displayName || serviceId;
}

/**
 * Validate if detected service is appropriate for the request
 * Can add business logic here (e.g., certain services only available in certain regions)
 */
export function isServiceAvailable(serviceId: ServiceId, _context?: any): boolean {
  // For now, all services are always available
  // Can add logic like:
  // - Check if service is enabled for this company
  // - Check regional availability
  // - Check subscription tier
  return true;
}
