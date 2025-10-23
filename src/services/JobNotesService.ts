/**
 * Job Notes Service - Business Logic Layer
 *
 * Handles job notes and updates, including AI-generated insights,
 * note pinning, and chronological tracking.
 *
 * @module JobNotesService
 */

import { getSupabase } from './supabase';
import {
  JobNote,
  CreateJobNoteInput,
  UpdateJobNoteInput,
  NoteCategory,
  AIInsightData
} from '../types/crm';
import { ServiceResponse } from '../types/customer';

export class JobNotesService {
  private supabase = getSupabase();

  /**
   * Create a new job note
   */
  async createNote(
    input: CreateJobNoteInput
  ): Promise<ServiceResponse<JobNote>> {
    try {
      if (!input.job_id) {
        return this.error('Job ID is required');
      }

      if (!input.content?.trim()) {
        return this.error('Note content is required');
      }

      if (!input.created_by_user_id) {
        return this.error('Created by user ID is required');
      }

      // Verify job exists (optional: add company check)
      const { data: job } = await this.supabase
        .from('jobs')
        .select('id, company_id')
        .eq('id', input.job_id)
        .single();

      if (!job) {
        return this.error('Job not found');
      }

      const { data, error } = await this.supabase
        .from('job_notes')
        .insert({
          job_id: input.job_id,
          note_type: input.note_type || 'general',
          subject: input.subject?.trim() || null,
          content: input.content.trim(),
          is_ai_generated: input.is_ai_generated || false,
          ai_confidence_score: input.ai_confidence_score || null,
          ai_model_version: input.ai_model_version || null,
          ai_metadata: input.ai_metadata || {},
          is_internal: input.is_internal ?? true,
          is_pinned: input.is_pinned || false,
          attachments: input.attachments || [],
          related_service_ids: input.related_service_ids || [],
          metadata: input.metadata || {},
          created_by_user_id: input.created_by_user_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('[JobNotesService] Error creating note:', error);
        return this.error('Failed to create note', error);
      }

      console.log('[JobNotesService] Note created successfully:', data.id);
      return this.success(data);

    } catch (error: any) {
      console.error('[JobNotesService] Error creating note:', error);
      return this.error('Failed to create note', error);
    }
  }

  /**
   * Update a job note
   */
  async updateNote(
    noteId: string,
    companyId: string,
    updates: UpdateJobNoteInput
  ): Promise<ServiceResponse<JobNote>> {
    try {
      // Verify note belongs to company
      const { data: note } = await this.supabase
        .from('job_notes')
        .select(`
          id,
          job_id,
          jobs!inner (company_id)
        `)
        .eq('id', noteId)
        .single();

      if (!note || note.jobs?.company_id !== companyId) {
        return this.error('Note not found');
      }

      // Update note
      const { data, error } = await this.supabase
        .from('job_notes')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId)
        .select()
        .single();

      if (error) {
        console.error('[JobNotesService] Error updating note:', error);
        return this.error('Failed to update note', error);
      }

      return this.success(data);

    } catch (error: any) {
      console.error('[JobNotesService] Error updating note:', error);
      return this.error('Failed to update note', error);
    }
  }

  /**
   * Delete a job note
   */
  async deleteNote(
    noteId: string,
    companyId: string
  ): Promise<ServiceResponse<void>> {
    try {
      // Verify note belongs to company
      const { data: note } = await this.supabase
        .from('job_notes')
        .select(`
          id,
          job_id,
          jobs!inner (company_id)
        `)
        .eq('id', noteId)
        .single();

      if (!note || note.jobs?.company_id !== companyId) {
        return this.error('Note not found');
      }

      // Delete note
      const { error } = await this.supabase
        .from('job_notes')
        .delete()
        .eq('id', noteId);

      if (error) {
        console.error('[JobNotesService] Error deleting note:', error);
        return this.error('Failed to delete note', error);
      }

      return this.success(undefined);

    } catch (error: any) {
      console.error('[JobNotesService] Error deleting note:', error);
      return this.error('Failed to delete note', error);
    }
  }

  /**
   * Get all notes for a job
   */
  async getNotes(
    jobId: string,
    companyId: string,
    filters?: {
      note_type?: NoteCategory;
      is_pinned?: boolean;
      is_ai_generated?: boolean;
      is_internal?: boolean;
    }
  ): Promise<ServiceResponse<JobNote[]>> {
    try {
      // Verify job belongs to company
      const { data: job } = await this.supabase
        .from('jobs')
        .select('id, company_id')
        .eq('id', jobId)
        .eq('company_id', companyId)
        .single();

      if (!job) {
        return this.error('Job not found');
      }

      // Build query
      let query = this.supabase
        .from('job_notes')
        .select('*')
        .eq('job_id', jobId);

      // Apply filters
      if (filters?.note_type) {
        query = query.eq('note_type', filters.note_type);
      }
      if (filters?.is_pinned !== undefined) {
        query = query.eq('is_pinned', filters.is_pinned);
      }
      if (filters?.is_ai_generated !== undefined) {
        query = query.eq('is_ai_generated', filters.is_ai_generated);
      }
      if (filters?.is_internal !== undefined) {
        query = query.eq('is_internal', filters.is_internal);
      }

      // Order: pinned first, then by creation date descending
      query = query
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('[JobNotesService] Error fetching notes:', error);
        return this.error('Failed to fetch notes', error);
      }

      return this.success(data || []);

    } catch (error: any) {
      console.error('[JobNotesService] Error fetching notes:', error);
      return this.error('Failed to fetch notes', error);
    }
  }

  /**
   * Get a single note by ID
   */
  async getNote(
    noteId: string,
    companyId: string
  ): Promise<ServiceResponse<JobNote>> {
    try {
      const { data, error } = await this.supabase
        .from('job_notes')
        .select(`
          *,
          jobs!inner (company_id)
        `)
        .eq('id', noteId)
        .eq('jobs.company_id', companyId)
        .single();

      if (error || !data) {
        console.error('[JobNotesService] Error fetching note:', error);
        return this.error('Note not found', error);
      }

      return this.success(data);

    } catch (error: any) {
      console.error('[JobNotesService] Error fetching note:', error);
      return this.error('Failed to fetch note', error);
    }
  }

  /**
   * Pin or unpin a note
   */
  async pinNote(
    noteId: string,
    companyId: string,
    isPinned: boolean
  ): Promise<ServiceResponse<JobNote>> {
    try {
      return this.updateNote(noteId, companyId, { is_pinned: isPinned });
    } catch (error: any) {
      console.error('[JobNotesService] Error pinning note:', error);
      return this.error('Failed to pin note', error);
    }
  }

  /**
   * Get pinned notes for a job
   */
  async getPinnedNotes(
    jobId: string,
    companyId: string
  ): Promise<ServiceResponse<JobNote[]>> {
    try {
      return this.getNotes(jobId, companyId, { is_pinned: true });
    } catch (error: any) {
      console.error('[JobNotesService] Error fetching pinned notes:', error);
      return this.error('Failed to fetch pinned notes', error);
    }
  }

  /**
   * Get AI-generated insights for a job
   */
  async getAIInsights(
    jobId: string,
    companyId: string
  ): Promise<ServiceResponse<JobNote[]>> {
    try {
      return this.getNotes(jobId, companyId, {
        note_type: 'ai_insight',
        is_ai_generated: true
      });
    } catch (error: any) {
      console.error('[JobNotesService] Error fetching AI insights:', error);
      return this.error('Failed to fetch AI insights', error);
    }
  }

  /**
   * AI ENGINE PLACEHOLDER
   * Create an AI-generated insight note
   */
  async createAIInsight(
    jobId: string,
    companyId: string,
    insight: {
      content: string;
      insight_type: 'recommendation' | 'warning' | 'optimization' | 'prediction';
      confidence: number;
      recommendations?: string[];
      data_sources?: string[];
    }
  ): Promise<ServiceResponse<JobNote>> {
    try {
      // TODO: Integrate with AI engine
      // This is a placeholder implementation
      //
      // INTEGRATION STEPS:
      // 1. Call AI engine to analyze job data
      // 2. AI analyzes:
      //    - Job complexity and scope
      //    - Historical similar jobs
      //    - Resource allocation
      //    - Potential risks and bottlenecks
      //    - Optimization opportunities
      // 3. Returns structured insights with confidence scores
      //
      // Example AI engine call:
      // const aiResult = await aiEngine.analyzeJob({
      //   jobId,
      //   analysisType: insight.insight_type,
      //   context: {
      //     jobData: jobDetails,
      //     historicalData: similarJobs,
      //     resourceData: availableCrews
      //   }
      // });

      const aiMetadata: AIInsightData = {
        model: 'gpt-4', // TODO: Get from AI engine
        version: '1.0.0',
        confidence: insight.confidence,
        insight_type: insight.insight_type,
        recommendations: insight.recommendations,
        data_sources: insight.data_sources,
        analyzed_at: new Date().toISOString(),
        analysis_duration_ms: 0 // TODO: Track actual duration
      };

      const noteInput: CreateJobNoteInput = {
        job_id: jobId,
        note_type: 'ai_insight',
        subject: `AI ${insight.insight_type}: Job Analysis`,
        content: insight.content,
        is_ai_generated: true,
        ai_confidence_score: insight.confidence,
        ai_model_version: '1.0.0',
        ai_metadata: aiMetadata,
        is_internal: false,
        is_pinned: insight.confidence > 0.8, // Pin high-confidence insights
        created_by_user_id: 'system' // TODO: Use AI service user ID
      };

      return this.createNote(noteInput);

    } catch (error: any) {
      console.error('[JobNotesService] Error creating AI insight:', error);
      return this.error('Failed to create AI insight', error);
    }
  }

  /**
   * Create a status change note
   */
  async createStatusChangeNote(
    jobId: string,
    oldStatus: string,
    newStatus: string,
    userId: string,
    additionalNotes?: string
  ): Promise<ServiceResponse<JobNote>> {
    try {
      const content = additionalNotes
        ? `Status changed from ${oldStatus} to ${newStatus}. ${additionalNotes}`
        : `Status changed from ${oldStatus} to ${newStatus}`;

      const noteInput: CreateJobNoteInput = {
        job_id: jobId,
        note_type: 'status_change',
        subject: 'Job Status Updated',
        content,
        is_internal: true,
        created_by_user_id: userId
      };

      return this.createNote(noteInput);

    } catch (error: any) {
      console.error('[JobNotesService] Error creating status change note:', error);
      return this.error('Failed to create status change note', error);
    }
  }

  /**
   * Search notes by content
   */
  async searchNotes(
    jobId: string,
    companyId: string,
    searchQuery: string
  ): Promise<ServiceResponse<JobNote[]>> {
    try {
      // Verify job belongs to company
      const { data: job } = await this.supabase
        .from('jobs')
        .select('id, company_id')
        .eq('id', jobId)
        .eq('company_id', companyId)
        .single();

      if (!job) {
        return this.error('Job not found');
      }

      const search = searchQuery.trim().toLowerCase();

      const { data, error } = await this.supabase
        .from('job_notes')
        .select('*')
        .eq('job_id', jobId)
        .or(`content.ilike.%${search}%,subject.ilike.%${search}%`)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[JobNotesService] Error searching notes:', error);
        return this.error('Failed to search notes', error);
      }

      return this.success(data || []);

    } catch (error: any) {
      console.error('[JobNotesService] Error searching notes:', error);
      return this.error('Failed to search notes', error);
    }
  }

  /**
   * Get notes by category
   */
  async getNotesByCategory(
    jobId: string,
    companyId: string,
    category: NoteCategory
  ): Promise<ServiceResponse<JobNote[]>> {
    try {
      return this.getNotes(jobId, companyId, { note_type: category });
    } catch (error: any) {
      console.error('[JobNotesService] Error fetching notes by category:', error);
      return this.error('Failed to fetch notes by category', error);
    }
  }

  /**
   * Get note count for a job
   */
  async getNoteCount(
    jobId: string,
    companyId: string,
    filters?: {
      note_type?: NoteCategory;
      is_ai_generated?: boolean;
    }
  ): Promise<ServiceResponse<number>> {
    try {
      // Verify job belongs to company
      const { data: job } = await this.supabase
        .from('jobs')
        .select('id, company_id')
        .eq('id', jobId)
        .eq('company_id', companyId)
        .single();

      if (!job) {
        return this.error('Job not found');
      }

      let query = this.supabase
        .from('job_notes')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', jobId);

      if (filters?.note_type) {
        query = query.eq('note_type', filters.note_type);
      }
      if (filters?.is_ai_generated !== undefined) {
        query = query.eq('is_ai_generated', filters.is_ai_generated);
      }

      const { count, error } = await query;

      if (error) {
        console.error('[JobNotesService] Error counting notes:', error);
        return this.error('Failed to count notes', error);
      }

      return this.success(count || 0);

    } catch (error: any) {
      console.error('[JobNotesService] Error counting notes:', error);
      return this.error('Failed to count notes', error);
    }
  }

  // HELPER METHODS

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
    console.error(`[JobNotesService] ${message}`, error);
    return {
      success: false,
      error: message,
      details: error?.message || error
    };
  }
}

// Export singleton instance
export const jobNotesService = new JobNotesService();
