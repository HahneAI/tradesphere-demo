import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSupabase } from '../services/supabase';

// User interface matching actual database schema
interface User {
  id: string;              // auth.uid()
  email: string;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const supabase = getSupabase();

  // Initialize auth state and listen for changes
  useEffect(() => {
    console.log('🔐 AUTH_CONTEXT - Initializing Supabase Auth listener');

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 AUTH_CONTEXT - Initial session check:', {
        hasSession: !!session,
        userId: session?.user?.id
      });

      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 AUTH_CONTEXT - Auth state changed:', event, {
          hasSession: !!session,
          userId: session?.user?.id
        });

        if (event === 'SIGNED_IN' && session?.user) {
          await fetchUserData(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('✅ AUTH_CONTEXT - Token refreshed successfully');
        }
      }
    );

    return () => {
      console.log('🔴 AUTH_CONTEXT - Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Fetch user data from users table
   */
  const fetchUserData = async (userId: string) => {
    console.log('📥 AUTH_CONTEXT - Fetching user data for:', userId);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

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
      }
    } catch (error) {
      console.error('💥 AUTH_CONTEXT - Error fetching user data:', error);
    } finally {
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

      console.log('✅ AUTH_CONTEXT - Sign in complete');
      console.groupEnd();
      return { success: true };

    } catch (error: any) {
      console.error('💥 AUTH_CONTEXT - Sign in error:', error);
      console.groupEnd();
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  /**
   * Sign out
   */
  const signOut = async (): Promise<void> => {
    console.log('🚪 AUTH_CONTEXT - Signing out...');

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ AUTH_CONTEXT - Sign out error:', error);
        throw error;
      }

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
