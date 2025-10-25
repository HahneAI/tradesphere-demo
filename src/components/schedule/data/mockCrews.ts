/**
 * Mock Crew Data
 *
 * Temporary mock data for development and testing
 * Will be replaced with real database queries when crews are created
 *
 * @module schedule/data/mockCrews
 */

import { Crew } from '../../../types/crm';

/**
 * Mock crews for calendar development
 * These match the ops_crews table structure
 */
export const MOCK_CREWS: Crew[] = [
  {
    id: 'crew-alpha-mock',
    company_id: '', // Will be set at runtime
    crew_name: 'Alpha Crew',
    crew_code: 'ALPHA',
    description: 'Hardscape and patio specialists',
    is_active: true,
    specializations: ['hardscape', 'patio', 'walkway'],
    max_capacity: 4,
    color_code: '#3B82F6', // Blue
    lead_contact_name: null,
    lead_contact_phone: null,
    lead_contact_email: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'crew-bravo-mock',
    company_id: '', // Will be set at runtime
    crew_name: 'Bravo Crew',
    crew_code: 'BRAVO',
    description: 'Driveway and commercial projects',
    is_active: true,
    specializations: ['driveway', 'commercial', 'parking'],
    max_capacity: 3,
    color_code: '#10B981', // Green
    lead_contact_name: null,
    lead_contact_phone: null,
    lead_contact_email: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'crew-charlie-mock',
    company_id: '', // Will be set at runtime
    crew_name: 'Charlie Crew',
    crew_code: 'CHARLIE',
    description: 'Large-scale commercial installations',
    is_active: true,
    specializations: ['commercial', 'large-projects', 'high-traffic'],
    max_capacity: 5,
    color_code: '#F59E0B', // Orange
    lead_contact_name: null,
    lead_contact_phone: null,
    lead_contact_email: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

/**
 * Get mock crews with company ID set
 */
export function getMockCrews(companyId: string): Crew[] {
  return MOCK_CREWS.map(crew => ({
    ...crew,
    company_id: companyId
  }));
}

/**
 * Get crew by ID (mock or real)
 */
export function getCrewById(crewId: string, companyId: string): Crew | null {
  const crews = getMockCrews(companyId);
  return crews.find(c => c.id === crewId) || null;
}

/**
 * Check if crew ID is a mock crew
 */
export function isMockCrew(crewId: string): boolean {
  return crewId.endsWith('-mock');
}

/**
 * Default crew color for unassigned jobs
 */
export const DEFAULT_CREW_COLOR = '#94A3B8'; // Gray
