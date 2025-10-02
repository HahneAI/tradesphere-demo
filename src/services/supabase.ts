import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Get environment variables - works in both browser (Vite) and Node.js (Netlify Functions)
const supabaseUrl = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_SUPABASE_URL
  : process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

const supabaseAnonKey = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Initialize the Supabase client
let supabase: SupabaseClient<Database> | null = null;

export const getSupabase = (): SupabaseClient<Database> => {
  if (!supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL and Anon Key must be defined');
    }

    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,  // DISABLED: No session persistence - fixes stuck loading screen
        autoRefreshToken: false,  // DISABLED: No auto refresh needed without persistence
        detectSessionInUrl: false,
        flowType: 'pkce'  // Use PKCE flow for better security
      }
    });
  }

  return supabase;
};

// Utility function to handle Supabase errors
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  return {
    error: {
      message: error?.message || 'An unexpected error occurred',
      status: error?.status || 500
    }
  };
};

// Create a fresh client (used when auth state changes)
export const refreshSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key must be defined');
  }

  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,  // DISABLED: No session persistence - fixes stuck loading screen
      autoRefreshToken: false,  // DISABLED: No auto refresh needed without persistence
      detectSessionInUrl: false,
      flowType: 'pkce'  // Use PKCE flow for better security
    }
  });
  return supabase;
};