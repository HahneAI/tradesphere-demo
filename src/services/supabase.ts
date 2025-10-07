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
        persistSession: true,  // ENABLED: Required for real-time subscriptions to work
        autoRefreshToken: true,  // ENABLED: Required for real-time WebSocket authentication
        detectSessionInUrl: false,
        flowType: 'pkce'  // Use PKCE flow for better security
      },
      realtime: {
        log_level: 'debug'  // CHANGED: Maximum verbosity for real-time debugging
      }
    });

    console.log('🔧 [SUPABASE] Client initialized with real-time debug logging enabled');
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
      persistSession: true,  // ENABLED: Required for real-time subscriptions to work
      autoRefreshToken: true,  // ENABLED: Required for real-time WebSocket authentication
      detectSessionInUrl: false,
      flowType: 'pkce'  // Use PKCE flow for better security
    },
    realtime: {
      log_level: 'debug'  // CHANGED: Maximum verbosity for real-time debugging
    }
  });

  console.log('🔧 [SUPABASE] Client refreshed with real-time debug logging enabled');
  return supabase;
};