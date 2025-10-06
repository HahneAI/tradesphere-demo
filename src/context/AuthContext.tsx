import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSupabase } from '../services/supabase';

// User interface matching actual database schema
interface User {
  id: string;              // auth.uid()
  email: string;
  name?: string;           // User display name (optional until migrated)
  company_id: string;      // UUID string
  role: string;            // 'office_staff', 'field_tech', etc.
  title: string;           // 'Operations Manager', etc.
  is_head_user: boolean;   // Company owner flag
  is_admin: boolean;       // Admin privileges
  user_icon?: string;      // Lucide icon name (User, TreePine, etc.)
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateUserIcon: (iconName: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  console.log('🟢 AUTH_CONTEXT - Provider mounting (Supabase Auth)...');

  // 🚨 DEMO MODE: Hardcoded admin user for presentation
  const DEMO_MODE = true;
  const DEMO_USER: User = {
    id: 'cd7ad550-37f3-477a-975e-a34b226b7332',
    email: 'anthony@test.com',
    name: 'Anthony',
    company_id: '08f0827a-608f-485a-a19f-e0c55ecf6484',
    role: 'admin',
    title: 'Owner',
    is_head_user: true,
    is_admin: true,
    user_icon: 'User',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Always start with null user and loading=true, regardless of DEMO_MODE
  // This ensures auth flow is consistent between demo and production
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const supabase = getSupabase();

  // Initialize auth state and listen for changes
  useEffect(() => {
    console.log('🔐 AUTH_CONTEXT - Initializing Supabase Auth listener');

    // Step 1: Get initial session (runs once on mount)
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 AUTH_CONTEXT - Initial session check:', {
        hasSession: !!session,
        userId: session?.user?.id
      });

      if (session?.user) {
        // Fire-and-forget user data fetch
        fetchUserData(session.user.id);
      } else if (!DEMO_MODE) {
        // Only set loading false if NOT demo mode (demo will auto-login below)
        console.log('ℹ️ AUTH_CONTEXT - No session found, setting loading to false');
        setLoading(false);
      }
    }).catch((error) => {
      console.error('❌ AUTH_CONTEXT - Session check failed:', error);
      if (!DEMO_MODE) {
        setLoading(false);
      }
    });

    // Step 2: Set up auth state listener (runs for lifetime of app)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 AUTH_CONTEXT - Auth state changed:', event, {
          hasSession: !!session,
          userId: session?.user?.id
        });

        // CRITICAL: Don't use await here - fire-and-forget to prevent deadlocks
        if (event === 'SIGNED_IN' && session?.user) {
          fetchUserData(session.user.id);  // Removed await
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 AUTH_CONTEXT - User signed out, clearing state');
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('✅ AUTH_CONTEXT - Token refreshed successfully');
          // Don't change loading state or fetch user data on token refresh
        } else if (event === 'INITIAL_SESSION') {
          // Already handled in getSession() above - skip to avoid double-fetch
          console.log('ℹ️ AUTH_CONTEXT - INITIAL_SESSION event (already handled by getSession)');
          if (!session) {
            setLoading(false);
          }
          return;  // Explicit return to prevent fallthrough
        } else {
          console.log('ℹ️ AUTH_CONTEXT - Unhandled auth event:', event);
        }
      }
    );

    // Step 3: Emergency timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ AUTH_CONTEXT - Timeout reached, forcing loading to false');
      setLoading(false);
    }, 5000);

    // Step 4: DEMO MODE auto-login (happens AFTER listeners are set up)
    // This ensures DEMO_MODE uses the same auth flow as production
    // CRITICAL FIX: Only auto-login if NO existing session (prevents auto-login after logout)
    if (DEMO_MODE) {
      console.log('🚨 DEMO MODE: Checking for existing session before auto-login...');
      // Use setTimeout to not block the listener setup
      setTimeout(async () => {
        try {
          // CRITICAL: Check if session already exists from previous login/logout
          const { data: { session } } = await supabase.auth.getSession();

          if (!session) {
            console.log('🚨 DEMO MODE: No session found, proceeding with auto-login...');
            const { error } = await supabase.auth.signInWithPassword({
              email: 'anthony@test.com',
              password: '99'
            });

            if (error) {
              console.error('❌ DEMO MODE: Auto-login failed:', error.message);
              // Fallback to hardcoded user if auto-login fails
              setUser(DEMO_USER);
              setIsAdmin(true);
              setLoading(false);
            } else {
              console.log('✅ DEMO MODE: Auto-login successful');
              // onAuthStateChange listener will handle the SIGNED_IN event
            }
          } else {
            console.log('✅ DEMO MODE: Existing session found, skipping auto-login');
            // Session exists - user was already logged in or refreshed while logged in
            // Fetch user data for this session
            if (session.user) {
              fetchUserData(session.user.id);
            } else {
              setLoading(false);
            }
          }
        } catch (error) {
          console.error('💥 DEMO MODE: Auto-login error:', error);
          setUser(DEMO_USER);
          setIsAdmin(true);
          setLoading(false);
        }
      }, 100);  // Small delay to ensure listeners are attached
    }

    return () => {
      console.log('🔴 AUTH_CONTEXT - Cleaning up auth listener');
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);  // Empty deps - run once on mount

  /**
   * Fetch user data from users table
   */
  const fetchUserData = async (userId: string) => {
    console.log('📥 AUTH_CONTEXT - Fetching user data for:', userId);

    try {
      // Add 3 second timeout to prevent hanging
      const fetchPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('User data fetch timeout')), 3000)
      );

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error) {
        console.error('❌ AUTH_CONTEXT - Failed to fetch user data:', error);
        throw error;
      }

      if (data) {
        console.log('✅ AUTH_CONTEXT - User data loaded:', {
          email: data.email,
          role: data.role,
          isAdmin: data.is_admin,
          companyId: data.company_id
        });

        setUser(data);
        setIsAdmin(data.is_admin);
      } else {
        console.warn('⚠️ AUTH_CONTEXT - No user data found for ID:', userId);
      }
    } catch (error) {
      console.error('💥 AUTH_CONTEXT - Error fetching user data:', error);
      // Clear any invalid session
      await supabase.auth.signOut();
    } finally {
      console.log('🏁 AUTH_CONTEXT - Setting loading to false');
      setLoading(false);
    }
  };

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    console.group('🔐 AUTH_CONTEXT - Sign In Attempt');
    console.log('📧 Email:', email);

    try {
      // Step 1: Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.error('❌ AUTH_CONTEXT - Authentication failed:', authError.message);
        console.groupEnd();
        return { success: false, error: authError.message };
      }

      console.log('✅ AUTH_CONTEXT - Authentication successful');
      console.log('🔍 Auth User ID:', authData.user?.id);

      // Step 2: Fetch user record from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError) {
        console.error('❌ AUTH_CONTEXT - Failed to fetch user record:', userError.message);
        console.groupEnd();
        setLoading(false);  // ✅ Set loading to false on error too
        return { success: false, error: 'User record not found' };
      }

      console.log('✅ AUTH_CONTEXT - User record loaded:', {
        email: userData.email,
        role: userData.role,
        title: userData.title,
        isAdmin: userData.is_admin,
        companyId: userData.company_id
      });

      // Step 3: Update context state
      setUser(userData);
      setIsAdmin(userData.is_admin);
      setLoading(false);  // ✅ CRITICAL: Set loading to false after successful login

      console.log('✅ AUTH_CONTEXT - Sign in complete');
      console.groupEnd();
      return { success: true };

    } catch (error: any) {
      console.error('💥 AUTH_CONTEXT - Sign in error:', error);
      console.groupEnd();
      setLoading(false);  // ✅ Set loading to false on error too
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  /**
   * Sign out
   */
  const signOut = async (): Promise<void> => {
    console.log('🚪 AUTH_CONTEXT - Signing out...');

    try {
      // Call Supabase sign out with 'local' scope to clear all storage
      const { error } = await supabase.auth.signOut({ scope: 'local' });

      if (error) {
        console.error('❌ AUTH_CONTEXT - Sign out error:', error);
        // Don't throw - continue with manual cleanup
      }

      // ✅ CRITICAL FIX: Explicitly clear all Supabase auth localStorage keys
      // Supabase stores session tokens that auto-restore on page load
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove: string[] = [];

        // Scan all localStorage keys for Supabase-related entries
        // Pattern: 'sb-{project-ref}-auth-token' and legacy 'supabase.auth.token'
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith('sb-') ||
            key.includes('supabase') ||
            key.includes('auth') ||
            key === 'tradesphere-auth-token' ||
            key.startsWith('paver') // Clear app-specific calculator data too
          )) {
            keysToRemove.push(key);
          }
        }

        // Remove all found keys
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
          console.log(`🧹 Removed localStorage key: ${key}`);
        });

        console.log('✅ Cleared Supabase localStorage keys:', keysToRemove);
      }

      // Clear React state
      setUser(null);
      setIsAdmin(false);
      console.log('✅ AUTH_CONTEXT - Signed out successfully');
    } catch (error) {
      console.error('💥 AUTH_CONTEXT - Sign out failed:', error);
      // Still clear state even if API call fails
      setUser(null);
      setIsAdmin(false);
    }
  };

  /**
   * Update user icon
   */
  const updateUserIcon = async (iconName: string): Promise<boolean> => {
    console.log('🎨 AUTH_CONTEXT - Updating user icon to:', iconName);

    if (!user) {
      console.error('❌ AUTH_CONTEXT - No user logged in');
      return false;
    }

    try {
      // Update users table
      const { error } = await supabase
        .from('users')
        .update({
          user_icon: iconName,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('❌ AUTH_CONTEXT - Failed to update user icon:', error);
        return false;
      }

      // Update local state
      const updatedUser = {
        ...user,
        user_icon: iconName,
        updated_at: new Date().toISOString()
      };

      setUser(updatedUser);
      console.log('✅ AUTH_CONTEXT - User icon updated successfully');
      return true;

    } catch (error) {
      console.error('💥 AUTH_CONTEXT - Update user icon error:', error);
      return false;
    }
  };

  const value = {
    user,
    loading,
    isAdmin,
    signIn,
    signOut,
    updateUserIcon
  };

  return (
    <AuthContext.Provider value={value}>
      {console.log('🎨 AUTH_CONTEXT - Providing:', { loading, hasUser: !!user, isAdmin })}
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
