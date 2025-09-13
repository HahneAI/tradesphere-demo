export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          settings: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: string
          company_id: string | null
          phone: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: string
          company_id?: string | null
          phone?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: string
          company_id?: string | null
          phone?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      jobs: {
        Row: {
          id: string
          title: string
          description: string | null
          status: string
          priority: string | null
          location: string | null
          estimated_hours: number | null
          actual_hours: number | null
          estimated_cost: number | null
          actual_cost: number | null
          company_id: string | null
          assigned_to: string | null
          created_by: string | null
          scheduled_start: string | null
          scheduled_end: string | null
          actual_start: string | null
          actual_end: string | null
          client_name: string | null
          client_phone: string | null
          client_email: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: string
          priority?: string | null
          location?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          estimated_cost?: number | null
          actual_cost?: number | null
          company_id?: string | null
          assigned_to?: string | null
          created_by?: string | null
          scheduled_start?: string | null
          scheduled_end?: string | null
          actual_start?: string | null
          actual_end?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_email?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: string
          priority?: string | null
          location?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          estimated_cost?: number | null
          actual_cost?: number | null
          company_id?: string | null
          assigned_to?: string | null
          created_by?: string | null
          scheduled_start?: string | null
          scheduled_end?: string | null
          actual_start?: string | null
          actual_end?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_email?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_assigned_to_fkey"
            columns: ["assigned_to"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      labor_entries: {
        Row: {
          id: string
          user_id: string | null
          job_id: string | null
          start_time: string
          end_time: string | null
          hours: number | null
          hourly_rate: number | null
          total_cost: number | null
          break_duration: number | null
          notes: string | null
          is_approved: boolean | null
          approved_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          job_id?: string | null
          start_time: string
          end_time?: string | null
          hours?: number | null
          hourly_rate?: number | null
          total_cost?: number | null
          break_duration?: number | null
          notes?: string | null
          is_approved?: boolean | null
          approved_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          job_id?: string | null
          start_time?: string
          end_time?: string | null
          hours?: number | null
          hourly_rate?: number | null
          total_cost?: number | null
          break_duration?: number | null
          notes?: string | null
          is_approved?: boolean | null
          approved_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_entries_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_entries_job_id_fkey"
            columns: ["job_id"]
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_entries_approved_by_fkey"
            columns: ["approved_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      materials_used: {
        Row: {
          id: string
          job_id: string | null
          material_name: string
          category: string | null
          quantity: number
          unit: string | null
          unit_cost: number | null
          total_cost: number | null
          supplier: string | null
          notes: string | null
          added_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          job_id?: string | null
          material_name: string
          category?: string | null
          quantity: number
          unit?: string | null
          unit_cost?: number | null
          total_cost?: number | null
          supplier?: string | null
          notes?: string | null
          added_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          job_id?: string | null
          material_name?: string
          category?: string | null
          quantity?: number
          unit?: string | null
          unit_cost?: number | null
          total_cost?: number | null
          supplier?: string | null
          notes?: string | null
          added_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_used_job_id_fkey"
            columns: ["job_id"]
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_used_added_by_fkey"
            columns: ["added_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      job_photos: {
        Row: {
          id: string
          job_id: string | null
          photo_url: string
          caption: string | null
          taken_by: string | null
          taken_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          job_id?: string | null
          photo_url: string
          caption?: string | null
          taken_by?: string | null
          taken_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          job_id?: string | null
          photo_url?: string
          caption?: string | null
          taken_by?: string | null
          taken_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_photos_taken_by_fkey"
            columns: ["taken_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      "VC Usage": {
        Row: {
          id: string
          session_id: string
          user_tech_id: string
          customer_name: string | null
          customer_address: string | null
          customer_email: string | null
          customer_phone: string | null
          user_input: string | null
          ai_response: string | null
          interaction_number: number
          interaction_summary: string | null
          created_at: string
          updated_at: string | null
          last_viewed_at: string | null
          view_count: number | null
        }
        Insert: {
          id?: string
          session_id: string
          user_tech_id: string
          customer_name?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          user_input?: string | null
          ai_response?: string | null
          interaction_number: number
          interaction_summary?: string | null
          created_at?: string
          updated_at?: string | null
          last_viewed_at?: string | null
          view_count?: number | null
        }
        Update: {
          id?: string
          session_id?: string
          user_tech_id?: string
          customer_name?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          user_input?: string | null
          ai_response?: string | null
          interaction_number?: number
          interaction_summary?: string | null
          created_at?: string
          updated_at?: string | null
          last_viewed_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      customer_interactions: {
        Row: {
          id: string
          user_tech_id: string
          customer_name: string
          session_id: string | null
          interaction_type: string
          viewed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_tech_id: string
          customer_name: string
          session_id?: string | null
          interaction_type: string
          viewed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_tech_id?: string
          customer_name?: string
          session_id?: string | null
          interaction_type?: string
          viewed_at?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      customer_list_view: {
        Row: {
          customer_name: string
          user_tech_id: string
          latest_session_id: string
          customer_address: string | null
          customer_email: string | null
          customer_phone: string | null
          customer_number: string | null
          interaction_summary: string | null
          last_interaction_at: string
          last_viewed_at: string | null
          interaction_count: number
          view_count: number
          sort_priority: number
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}