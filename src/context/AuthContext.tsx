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
  console.log('🟢 AUTH_CONTEXT - Provider mounting');

  // 🚨 DEMO MODE: Configurable via localStorage for easy toggle
  // Check localStorage first to allow runtime configuration
  const DEMO_MODE = (() => {
    if (typeof window === 'undefined') return false;

    const stored = localStorage.getItem('DEMO_MODE');
    if (stored !== null) {
      return stored === 'true';
    }

    // Default to false (disabled) - use manual login
    return false;
  })();

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

  // Add helper functions to window for easy console access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).enableDemoMode = () => {
        localStorage.setItem('DEMO_MODE', 'true');
        console.log('✅ Demo mode ENABLED - refresh page');
      };

      (window as any).disableDemoMode = () => {
        localStorage.setItem('DEMO_MODE', 'false');
        console.log('✅ Demo mode DISABLED - refresh page');
      };

      (window as any).checkDemoMode = () => {
        const enabled = localStorage.getItem('DEMO_MODE') === 'true';
        console.log(`Demo mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
        return enabled;
      };
    }
  }, []);

  // Initialize auth state and listen for changes
  useEffect(() => {
    // Step 1: Get initial session (runs once on mount)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserData(session.user.id);
      } else if (!DEMO_MODE) {
        setLoading(false);
      }
    }).catch((error) => {
      console.error('❌ Session check failed:', error);
      if (!DEMO_MODE) {
        setLoading(false);
      }
    });

    // Step 2: Set up auth state listener (runs for lifetime of app)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          fetchUserData(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
        } else if (event === 'INITIAL_SESSION') {
          if (!session) {
            setLoading(false);
          }
          return;
        }
      }
    );

    // Step 3: Emergency timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Step 4: DEMO MODE auto-login (happens AFTER listeners are set up)
    if (DEMO_MODE) {
      setTimeout(async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (!session) {
            const { error } = await supabase.auth.signInWithPassword({
              email: 'anthony@test.com',
              password: '99'
            });

            if (error) {
              setUser(DEMO_USER);
              setIsAdmin(true);
              setLoading(false);
            }
          } else {
            if (session.user) {
              fetchUserData(session.user.id);
            } else {
              setLoading(false);
            }
          }
        } catch (error) {
          setUser(DEMO_USER);
          setIsAdmin(true);
          setLoading(false);
        }
      }, 100);
    }

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Fetch user data from users table
   */
  const fetchUserData = async (userId: string) => {
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
        console.error('❌ Failed to fetch user data:', error);
        throw error;
      }

      if (data) {
        // Log state change to authenticated with role
        console.log(`✅ Authenticated as ${data.role.toUpperCase()}`);

        // Log user payload
        console.log('👤 User payload:', {
          email: data.email,
          name: data.name,
          role: data.role,
          title: data.title,
          company_id: data.company_id,
          is_admin: data.is_admin
        });

        setUser(data);
        setIsAdmin(data.is_admin);
      }
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Step 1: Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.error('❌ Authentication failed:', authError.message);
        return { success: false, error: authError.message };
      }

      // Step 2: Fetch user record from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError) {
        console.error('❌ Failed to fetch user record:', userError.message);
        setLoading(false);
        return { success: false, error: 'User record not found' };
      }

      // Log state change to authenticated with role
      console.log(`✅ Authenticated as ${userData.role.toUpperCase()}`);

      // Log user payload
      console.log('👤 User payload:', {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        title: userData.title,
        company_id: userData.company_id,
        is_admin: userData.is_admin
      });

      // Step 3: Update context state
      setUser(userData);
      setIsAdmin(userData.is_admin);
      setLoading(false);

      return { success: true };

    } catch (error: any) {
      console.error('❌ Sign in error:', error);
      setLoading(false);
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  /**
   * Sign out
   */
  const signOut = async (): Promise<void> => {
    try {
      // Call Supabase sign out with 'local' scope to clear all storage
      const { error } = await supabase.auth.signOut({ scope: 'local' });

      if (error) {
        console.error('❌ Sign out error:', error);
      }

      // Clear all Supabase auth localStorage keys
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith('sb-') ||
            key.includes('supabase') ||
            key.includes('auth') ||
            key === 'tradesphere-auth-token' ||
            key.startsWith('paver')
          )) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));
      }

      // Clear React state
      setUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      setUser(null);
      setIsAdmin(false);
    }
  };

  /**
   * Update user icon
   */
  const updateUserIcon = async (iconName: string): Promise<boolean> => {
    if (!user) {
      console.error('❌ No user logged in');
      return false;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          user_icon: iconName,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('❌ Failed to update user icon:', error);
        return false;
      }

      const updatedUser = {
        ...user,
        user_icon: iconName,
        updated_at: new Date().toISOString()
      };

      setUser(updatedUser);
      return true;

    } catch (error) {
      console.error('❌ Update user icon error:', error);
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
