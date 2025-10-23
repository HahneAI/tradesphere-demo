/**
 * Crew Service - Business Logic Layer
 *
 * Handles all crew-related operations including CRUD, member management,
 * availability checking, and capacity validation.
 *
 * @module CrewService
 */

import { getSupabase } from './supabase';
import {
  Crew,
  CrewWithMembers,
  CrewMember,
  CrewMemberWithUser,
  CreateCrewInput,
  UpdateCrewInput,
  AddCrewMemberInput,
  UpdateCrewMemberInput,
  CrewAvailability,
  CrewSearchFilters,
  CrewRole,
  ScheduleConflict
} from '../types/crm';
import { ServiceResponse, PaginatedResponse } from '../types/customer';

export class CrewService {
  private supabase = getSupabase();

  /**
   * Create a new crew
   */
  async createCrew(input: CreateCrewInput): Promise<ServiceResponse<Crew>> {
    try {
      if (!input.crew_name?.trim()) {
        return this.error('Crew name is required');
      }

      if (!input.company_id) {
        return this.error('Company ID is required');
      }

      if (!input.created_by_user_id) {
        return this.error('Created by user ID is required');
      }

      // Generate crew code if not provided
      const crewCode = input.crew_code || await this.generateCrewCode(input.company_id);

      const { data, error } = await this.supabase
        .from('crews')
        .insert({
          company_id: input.company_id,
          crew_name: input.crew_name.trim(),
          crew_code: crewCode,
          description: input.description?.trim() || null,
          crew_lead_user_id: input.crew_lead_user_id || null,
          specializations: input.specializations || [],
          max_capacity: input.max_capacity || 6,
          color_code: input.color_code || null,
          is_active: true,
          metadata: input.metadata || {},
          created_by_user_id: input.created_by_user_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('[CrewService] Error creating crew:', error);
        return this.error('Failed to create crew', error);
      }

      // Add crew lead as a member if specified
      if (input.crew_lead_user_id) {
        const leadResult = await this.addCrewMember({
          crew_id: data.id,
          user_id: input.crew_lead_user_id,
          role: 'lead',
          added_by_user_id: input.created_by_user_id
        });

        if (!leadResult.success) {
          console.error('[CrewService] Failed to add crew lead as member:', leadResult.error);
        }
      }

      console.log('[CrewService] Crew created successfully:', data.id);
      return this.success(data);

    } catch (error: any) {
      console.error('[CrewService] Error creating crew:', error);
      return this.error('Failed to create crew', error);
    }
  }

  /**
   * Update crew details
   */
  async updateCrew(
    crewId: string,
    companyId: string,
    updates: UpdateCrewInput
  ): Promise<ServiceResponse<Crew>> {
    try {
      // Verify crew exists and belongs to company
      const { data: existingCrew } = await this.supabase
        .from('crews')
        .select('id, company_id')
        .eq('id', crewId)
        .eq('company_id', companyId)
        .single();

      if (!existingCrew) {
        return this.error('Crew not found');
      }

      // Update crew
      const { data, error } = await this.supabase
        .from('crews')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', crewId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('[CrewService] Error updating crew:', error);
        return this.error('Failed to update crew', error);
      }

      console.log('[CrewService] Crew updated successfully:', crewId);
      return this.success(data);

    } catch (error: any) {
      console.error('[CrewService] Error updating crew:', error);
      return this.error('Failed to update crew', error);
    }
  }

  /**
   * Get crew with expanded member details
   */
  async getCrew(crewId: string, companyId: string): Promise<ServiceResponse<CrewWithMembers>> {
    try {
      const { data, error } = await this.supabase
        .from('crews')
        .select(`
          *,
          crew_lead:users!crews_crew_lead_user_id_fkey (
            id,
            full_name,
            email,
            phone
          ),
          members:crew_members (
            *,
            user:users (
              id,
              full_name,
              email,
              phone,
              role
            )
          )
        `)
        .eq('id', crewId)
        .eq('company_id', companyId)
        .single();

      if (error) {
        console.error('[CrewService] Error fetching crew:', error);
        return this.error('Crew not found', error);
      }

      // Calculate computed fields
      const activeMembers = data.members?.filter(m => m.is_active) || [];
      const crewWithMembers: CrewWithMembers = {
        ...data,
        current_member_count: activeMembers.length,
        available_capacity: data.max_capacity - activeMembers.length,
        average_skill_level: this.calculateAverageSkillLevel(activeMembers)
      };

      return this.success(crewWithMembers);

    } catch (error: any) {
      console.error('[CrewService] Error fetching crew:', error);
      return this.error('Failed to get crew', error);
    }
  }

  /**
   * Get all crews with filters
   */
  async getCrews(
    companyId: string,
    filters: CrewSearchFilters = {}
  ): Promise<PaginatedResponse<Crew>> {
    try {
      let query = this.supabase
        .from('crews')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId);

      // Apply filters
      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters.searchQuery?.trim()) {
        const search = filters.searchQuery.trim().toLowerCase();
        query = query.or(
          `crew_name.ilike.%${search}%,crew_code.ilike.%${search}%,description.ilike.%${search}%`
        );
      }

      if (filters.specializations?.length) {
        query = query.contains('specializations', filters.specializations);
      }

      if (filters.min_capacity !== undefined) {
        query = query.gte('max_capacity', filters.min_capacity);
      }
      if (filters.max_capacity !== undefined) {
        query = query.lte('max_capacity', filters.max_capacity);
      }

      // Get count
      const { count, error: countError } = await query.select('*', { count: 'exact', head: true });
      if (countError) {
        throw countError;
      }

      // Apply sorting
      const sortBy = filters.sort_by || 'created_at';
      const sortOrder = filters.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return {
        items: data || [],
        total: count || 0,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        hasMore: offset + limit < (count || 0)
      };

    } catch (error: any) {
      console.error('[CrewService] Error fetching crews:', error);
      throw error;
    }
  }

  /**
   * Add a member to a crew
   */
  async addCrewMember(
    input: AddCrewMemberInput
  ): Promise<ServiceResponse<CrewMember>> {
    try {
      if (!input.crew_id) {
        return this.error('Crew ID is required');
      }

      if (!input.user_id) {
        return this.error('User ID is required');
      }

      if (!input.added_by_user_id) {
        return this.error('Added by user ID is required');
      }

      // Check if user is already in crew
      const { data: existing } = await this.supabase
        .from('crew_members')
        .select('id')
        .eq('crew_id', input.crew_id)
        .eq('user_id', input.user_id)
        .eq('is_active', true)
        .maybeSingle();

      if (existing) {
        return this.error('User is already a member of this crew');
      }

      // Check crew capacity
      const { data: crew } = await this.supabase
        .from('crews')
        .select('max_capacity')
        .eq('id', input.crew_id)
        .single();

      if (!crew) {
        return this.error('Crew not found');
      }

      const { count } = await this.supabase
        .from('crew_members')
        .select('*', { count: 'exact', head: true })
        .eq('crew_id', input.crew_id)
        .eq('is_active', true);

      if (count !== null && count >= crew.max_capacity) {
        return this.error('Crew is at maximum capacity');
      }

      // Add member
      const { data, error } = await this.supabase
        .from('crew_members')
        .insert({
          crew_id: input.crew_id,
          user_id: input.user_id,
          role: input.role || 'member',
          joined_at: new Date().toISOString(),
          is_active: true,
          certifications: input.certifications || [],
          skill_level: input.skill_level || 3,
          availability_notes: input.availability_notes || null,
          added_by_user_id: input.added_by_user_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('[CrewService] Error adding crew member:', error);
        return this.error('Failed to add crew member', error);
      }

      console.log('[CrewService] Crew member added successfully:', data.id);
      return this.success(data);

    } catch (error: any) {
      console.error('[CrewService] Error adding crew member:', error);
      return this.error('Failed to add crew member', error);
    }
  }

  /**
   * Update a crew member
   */
  async updateCrewMember(
    memberId: string,
    companyId: string,
    updates: UpdateCrewMemberInput
  ): Promise<ServiceResponse<CrewMember>> {
    try {
      // Verify member belongs to company
      const { data: member } = await this.supabase
        .from('crew_members')
        .select(`
          id,
          crew_id,
          crews!inner (company_id)
        `)
        .eq('id', memberId)
        .single();

      if (!member || member.crews?.company_id !== companyId) {
        return this.error('Crew member not found');
      }

      // Update member
      const { data, error } = await this.supabase
        .from('crew_members')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId)
        .select()
        .single();

      if (error) {
        console.error('[CrewService] Error updating crew member:', error);
        return this.error('Failed to update crew member', error);
      }

      return this.success(data);

    } catch (error: any) {
      console.error('[CrewService] Error updating crew member:', error);
      return this.error('Failed to update crew member', error);
    }
  }

  /**
   * Remove a member from a crew (soft delete)
   */
  async removeCrewMember(
    memberId: string,
    companyId: string
  ): Promise<ServiceResponse<void>> {
    try {
      // Verify member belongs to company
      const { data: member } = await this.supabase
        .from('crew_members')
        .select(`
          id,
          crew_id,
          crews!inner (company_id)
        `)
        .eq('id', memberId)
        .single();

      if (!member || member.crews?.company_id !== companyId) {
        return this.error('Crew member not found');
      }

      // Soft delete by setting is_active to false
      const { error } = await this.supabase
        .from('crew_members')
        .update({
          is_active: false,
          left_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId);

      if (error) {
        console.error('[CrewService] Error removing crew member:', error);
        return this.error('Failed to remove crew member', error);
      }

      return this.success(undefined);

    } catch (error: any) {
      console.error('[CrewService] Error removing crew member:', error);
      return this.error('Failed to remove crew member', error);
    }
  }

  /**
   * Check crew availability for a date range
   */
  async getCrewAvailability(
    crewId: string,
    startDate: string,
    endDate: string
  ): Promise<ServiceResponse<CrewAvailability>> {
    try {
      // Get crew details
      const { data: crew } = await this.supabase
        .from('crews')
        .select('id, crew_name')
        .eq('id', crewId)
        .single();

      if (!crew) {
        return this.error('Crew not found');
      }

      // Check for conflicts
      const { data: assignments } = await this.supabase
        .from('job_assignments')
        .select(`
          id,
          job_id,
          scheduled_start,
          scheduled_end,
          estimated_hours,
          jobs!inner (job_number, title)
        `)
        .eq('crew_id', crewId)
        .in('status', ['scheduled', 'in_progress'])
        .or(
          `and(scheduled_start.lte.${endDate},scheduled_end.gte.${startDate})`
        );

      const hasConflicts = assignments && assignments.length > 0;
      const totalHours = assignments?.reduce(
        (sum, a) => sum + (a.estimated_hours || 0),
        0
      ) || 0;

      const availability: CrewAvailability = {
        crew_id: crewId,
        crew_name: crew.crew_name,
        is_available: !hasConflicts,
        requested_start: startDate,
        requested_end: endDate,
        total_scheduled_hours: totalHours
      };

      if (hasConflicts) {
        const conflict: ScheduleConflict = {
          crew_id: crewId,
          crew_name: crew.crew_name,
          requested_start: startDate,
          requested_end: endDate,
          conflicting_assignments: assignments.map(a => ({
            assignment_id: a.id,
            job_id: a.job_id,
            job_number: a.jobs?.job_number || '',
            job_title: a.jobs?.title || '',
            scheduled_start: a.scheduled_start,
            scheduled_end: a.scheduled_end
          }))
        };
        availability.conflicts = conflict;
      }

      return this.success(availability);

    } catch (error: any) {
      console.error('[CrewService] Error checking crew availability:', error);
      return this.error('Failed to check crew availability', error);
    }
  }

  /**
   * Get crews by specialization
   */
  async getCrewsBySpecialization(
    companyId: string,
    specialization: string
  ): Promise<ServiceResponse<Crew[]>> {
    try {
      const { data, error } = await this.supabase
        .from('crews')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .contains('specializations', [specialization]);

      if (error) {
        console.error('[CrewService] Error fetching crews by specialization:', error);
        return this.error('Failed to fetch crews', error);
      }

      return this.success(data || []);

    } catch (error: any) {
      console.error('[CrewService] Error fetching crews by specialization:', error);
      return this.error('Failed to fetch crews by specialization', error);
    }
  }

  /**
   * Get available crews for a date range
   */
  async getAvailableCrews(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<ServiceResponse<Crew[]>> {
    try {
      // Get all active crews
      const { data: crews } = await this.supabase
        .from('crews')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (!crews) {
        return this.success([]);
      }

      // Check availability for each crew
      const availableCrews: Crew[] = [];
      for (const crew of crews) {
        const availabilityResult = await this.getCrewAvailability(
          crew.id,
          startDate,
          endDate
        );

        if (availabilityResult.success && availabilityResult.data?.is_available) {
          availableCrews.push(crew);
        }
      }

      return this.success(availableCrews);

    } catch (error: any) {
      console.error('[CrewService] Error fetching available crews:', error);
      return this.error('Failed to fetch available crews', error);
    }
  }

  // HELPER METHODS

  /**
   * Generate unique crew code
   */
  private async generateCrewCode(companyId: string): Promise<string> {
    const { count } = await this.supabase
      .from('crews')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const nextNumber = (count || 0) + 1;
    return `CREW-${String(nextNumber).padStart(2, '0')}`;
  }

  /**
   * Calculate average skill level of crew members
   */
  private calculateAverageSkillLevel(members: any[]): number {
    if (!members.length) return 0;
    const total = members.reduce((sum, m) => sum + (m.skill_level || 0), 0);
    return Math.round((total / members.length) * 10) / 10;
  }

  /**
   * Success response helper
   */
  private success<T>(data: T): ServiceResponse<T> {
    return { success: true, data };
  }

  /**
   * Error response helper
   */
  private error(message: string, error?: any): ServiceResponse<never> {
    console.error(`[CrewService] ${message}`, error);
    return {
      success: false,
      error: message,
      details: error?.message || error
    };
  }
}

// Export singleton instance
export const crewService = new CrewService();
