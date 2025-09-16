import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

interface BetaUser {
  id: string;
  email?: string;
  first_name: string;
  full_name?: string;
  job_title: string;
  tech_uuid: string;
  beta_code_used: string;
  beta_code_id: number;
  user_icon: string;
  is_active: boolean;
  is_admin: boolean; // 🎯 NEW: Admin field
  created_at: string;
}

interface AuthContextType {
  user: BetaUser | null;
  loading: boolean;
  isAdmin: boolean; // 🎯 NEW: Admin status
  validateBetaCode: (code: string) => Promise<{ valid: boolean; error?: string }>;
  registerBetaUser: (userData: {
    firstName: string;
    jobTitle: string;
    email: string;
  }, betaCode: string, betaCodeId: number) => Promise<{ success: boolean; error?: string; userData?: any }>;
  signInBetaUser: (firstName: string, betaCodeId: string) => Promise<{ success: boolean; error?: string }>;
  completeRegistration: (userData: any) => void;
  updateUserIcon: (iconName: string) => Promise<boolean>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  console.log('🟢 AUTH_CONTEXT - Provider mounting...');
  const [user, setUser] = useState<BetaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); // 🎯 NEW: Admin state
  const initialized = useRef(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Initialize auth state
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initAuth = () => {
      // Check for existing session in localStorage
      const storedUser = localStorage.getItem('tradesphere_beta_user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAdmin(userData.is_admin || false); // 🎯 NEW: Set admin status
        } catch (error) {
          console.error('Failed to parse stored user data:', error);
          localStorage.removeItem('tradesphere_beta_user');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const validateBetaCode = async (code: string): Promise<{ valid: boolean; error?: string }> => {
    const debugPrefix = `🔑 VALIDATE_CODE [${code.slice(-4)}]`;
    console.group(`${debugPrefix} Starting beta code validation`);
    
    try {
      // STEP 1: Input validation
      if (!code || code.length < 4) {
        console.error('❌ STEP 1 FAILED: Invalid code format');
        console.groupEnd();
        return { valid: false, error: 'Code must be at least 4 characters' };
      }
      console.log('✅ STEP 1: Code format valid -', `${code.length} characters`);

      // STEP 2: Environment validation
      if (!supabaseUrl || !supabaseKey) {
        console.error('❌ STEP 2 FAILED: Missing Supabase credentials');
        console.log('🔍 URL present:', !!supabaseUrl);
        console.log('🔍 Key present:', !!supabaseKey);
        console.groupEnd();
        return { valid: false, error: 'Database connection not configured' };
      }
      console.log('✅ STEP 2: Supabase credentials validated');

      // STEP 3: Initialize Supabase client for beta code validation
      console.log('🌐 STEP 3: Using Supabase client for beta_codes query');

      // STEP 4: Send request using Supabase client (prevents 406 errors)
      console.log('📡 STEP 4: Sending validation request via Supabase client...');
      const startTime = performance.now();

      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: codes, error } = await supabase
        .from('beta_codes')
        .select('*')
        .eq('code', code);

      const requestTime = performance.now() - startTime;

      // STEP 5: Response validation
      console.log('📡 STEP 5: Response received -', {
        success: !error,
        codesFound: codes?.length || 0,
        latency: `${requestTime.toFixed(2)}ms`,
        error: error?.message || null
      });

      if (error) {
        console.error('❌ STEP 5 FAILED: Supabase client error');
        console.error('📄 Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        console.groupEnd();
        return { valid: false, error: 'Failed to validate code - database error' };
      }

      // STEP 6: Parse and validate response data
      console.log('✅ STEP 6: Response parsed -', `${codes.length} codes found`);

      if (!Array.isArray(codes)) {
        console.error('❌ STEP 6 FAILED: Invalid response format');
        console.groupEnd();
        return { valid: false, error: 'Invalid server response' };
      }

      // STEP 7: Code validation logic
      const betaCode = codes.find((c: any) => c.code === code && c.is_active);
      const isValid = !!betaCode;
      
      console.log('🔍 STEP 7: Code validation result -', {
        found: codes.length > 0,
        active: betaCode?.is_active || false,
        used: betaCode?.used || false,
        valid: isValid
      });

      if (isValid) {
        console.log('✅ SUCCESS: Beta code validated successfully');
        console.log('📊 Code details:', {
          id: betaCode.id,
          description: betaCode.description?.substring(0, 30) || 'N/A',
          created: betaCode.created_at?.split('T')[0] || 'N/A'
        });
      } else {
        console.log('❌ FAILED: Beta code validation failed');
        if (codes.length === 0) {
          console.log('🔍 Reason: Code not found in database');
        } else if (!codes[0]?.is_active) {
          console.log('🔍 Reason: Code exists but is inactive');
        } else if (codes[0]?.used) {
          console.log('🔍 Reason: Code has already been used');
        }
      }
      
      console.groupEnd();
      return { 
        valid: isValid, 
        error: isValid ? undefined : 'Invalid or inactive beta code' 
      };

    } catch (error) {
      console.error('❌ EXCEPTION: Beta code validation failed');
      
      if (error.name === 'AbortError') {
        console.error('⏰ Error type: Request timeout (10s exceeded)');
      } else {
        console.error('🔥 Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n')[0]
        });
      }
      
      console.groupEnd();
      return { valid: false, error: 'Validation request failed' };
    }
  };

  const registerBetaUser = async (
    userData: { firstName: string; jobTitle: string; email: string }, 
    betaCode: string, 
    betaCodeId: number
  ): Promise<{ success: boolean; error?: string; userData?: any }> => {
    console.log('Starting registration for:', userData.firstName);

    try {
      // Generate proper tech UUID
      const generateTechUUID = () => {
        const hex = () => Math.floor(Math.random() * 16).toString(16).toUpperCase();
        const segment = (length) => Array.from({length}, hex).join('');
        return `TECH-${segment(8)}-${segment(4)}-${segment(4)}`;
      };

      // Prepare registration data
      const registrationData = {
        first_name: userData.firstName,
        job_title: userData.jobTitle,
        email: userData.email && userData.email.trim() ? userData.email.trim() : null,
        tech_uuid: generateTechUUID(),
        beta_code_used: betaCode,
        beta_code_id: betaCodeId,
        is_active: true,
        is_admin: false
     };

      console.log('Sending registration data:', registrationData);

      // Step 1: Create user using Supabase client (prevents 406 errors)
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: newUser, error } = await supabase
        .from('beta_users')
        .insert(registrationData)
        .select();

      if (error) {
        console.error('User creation failed:', error);
        return { success: false, error: 'Registration failed: ' + error.message };
      }

      // Handle successful response
      console.log('User created successfully:', newUser?.[0] || newUser);

      // Step 2: Mark beta code as used using Supabase client (don't let this failure block success)
      try {
        console.log('Marking beta code as used:', betaCodeId);

        const { error: updateError } = await supabase
          .from('beta_codes')
          .update({
            used: true,
            used_by_user_id: userData.firstName,
            used_at: new Date().toISOString()
          })
          .eq('id', betaCodeId);

        if (!updateError) {
          console.log('Beta code marked as used successfully');
        } else {
          console.log('Beta code update failed but continuing:', updateError.message);
        }
      } catch (codeError) {
        console.log('Beta code update error but continuing:', codeError);
      }

      // Return success regardless of beta code update
      return { 
        success: true, 
        userData: Array.isArray(newUser) ? newUser[0] : newUser 
      };

    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  };

  const signInBetaUser = async (firstName: string, betaCodeId: string): Promise<{ success: boolean; error?: string }> => {
    const debugPrefix = `👤 SIGNIN [${firstName}:${betaCodeId}]`;
    console.group(`${debugPrefix} Starting user authentication`);
    
    try {
      // STEP 1: Input validation
      if (!firstName || firstName.trim().length < 2) {
        console.error('❌ STEP 1 FAILED: Invalid firstName');
        console.log('🔍 firstName:', firstName || 'undefined');
        console.groupEnd();
        return { success: false, error: 'Name must be at least 2 characters' };
      }
      
      if (!betaCodeId || isNaN(parseInt(betaCodeId))) {
        console.error('❌ STEP 1 FAILED: Invalid betaCodeId');
        console.log('🔍 betaCodeId:', betaCodeId || 'undefined');
        console.groupEnd();
        return { success: false, error: 'Invalid beta code ID format' };
      }
      
      console.log('✅ STEP 1: Input validation passed -', {
        firstName: firstName.trim(),
        betaCodeId: betaCodeId,
        nameLength: firstName.trim().length
      });

      // STEP 2: Environment validation
      if (!supabaseUrl || !supabaseKey) {
        console.error('❌ STEP 2 FAILED: Missing Supabase credentials');
        console.log('🔍 URL present:', !!supabaseUrl);
        console.log('🔍 Key present:', !!supabaseKey);
        console.log('🔍 URL value:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'undefined');
        console.groupEnd();
        return { success: false, error: 'Database connection not configured' };
      }
      console.log('✅ STEP 2: Supabase credentials validated');

      // STEP 3: Construct query URL with proper encoding
      const encodedName = encodeURIComponent(firstName.trim());
      const requestUrl = `${supabaseUrl}/rest/v1/beta_users?first_name=ilike.${encodedName}&beta_code_id=eq.${betaCodeId}`;
      console.log('🌐 STEP 3: Query URL constructed');
      console.log('🔍 Query:', `first_name=ilike.${encodedName}&beta_code_id=eq.${betaCodeId}`);

      // STEP 4: Database query with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      console.log('📡 STEP 4: Querying database...');
      const startTime = performance.now();

      const response = await fetch(requestUrl, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const queryTime = performance.now() - startTime;

      // STEP 5: Response validation
      console.log('📡 STEP 5: Database response received -', {
        status: response.status,
        statusText: response.statusText,
        latency: `${queryTime.toFixed(2)}ms`
      });

      if (!response.ok) {
        console.error('❌ STEP 5 FAILED: Database query error');
        console.error('📄 Error details:', {
          status: response.status,
          statusText: response.statusText
        });
        
        let userFriendlyError = 'Login failed - server error';
        if (response.status === 401) {
          userFriendlyError = 'Database authentication failed';
        } else if (response.status === 404) {
          userFriendlyError = 'Database table not found';
        }
        
        console.groupEnd();
        return { success: false, error: userFriendlyError };
      }

      // STEP 6: Parse user data
      const users = await response.json();
      console.log('✅ STEP 6: Response parsed -', `${users.length} users found`);
      
      if (!Array.isArray(users)) {
        console.error('❌ STEP 6 FAILED: Invalid response format');
        console.groupEnd();
        return { success: false, error: 'Invalid server response' };
      }

      // STEP 7: User existence check
      if (users.length === 0) {
        console.log('❌ STEP 7 FAILED: No matching users found');
        console.log('🔍 Search criteria:', {
          firstName: firstName.trim(),
          betaCodeId: betaCodeId,
          caseSensitive: false
        });
        console.groupEnd();
        return { success: false, error: 'Invalid username or password' };
      }

      if (users.length > 1) {
        console.warn('⚠️ STEP 7: Multiple users found - using first match');
        console.log('🔍 Multiple users:', users.map(u => ({ 
          name: u.first_name, 
          id: u.id,
          betaCode: u.beta_code_id 
        })));
      }

      const userAccount = users[0];
      console.log('✅ STEP 7: User account located');

      // STEP 8: Account status validation
      if (!userAccount.is_active) {
        console.error('❌ STEP 8 FAILED: Account is deactivated');
        console.log('🔍 Account details:', {
          id: userAccount.id,
          name: userAccount.first_name,
          active: userAccount.is_active,
          created: userAccount.created_at?.split('T')[0]
        });
        console.groupEnd();
        return { success: false, error: 'Account is deactivated' };
      }
      console.log('✅ STEP 8: Account status validated - active');

      // STEP 9: Prepare user object
      const betaUser = userAccount as BetaUser;
      
      console.log('✅ STEP 9: User object prepared -', {
        id: betaUser.id,
        name: betaUser.first_name,
        jobTitle: betaUser.job_title,
        techId: betaUser.tech_uuid?.slice(-8) || 'N/A',
        isAdmin: betaUser.is_admin || false,
        betaCodeId: betaUser.beta_code_id
      });

      // STEP 10: Update application state
      setUser(betaUser);
      setIsAdmin(betaUser.is_admin || false);
      localStorage.setItem('tradesphere_beta_user', JSON.stringify(betaUser));
      
      console.log('✅ STEP 10: Application state updated');
      console.log('💾 Local storage: User data saved');
      
      // Special admin login logging
      if (betaUser.is_admin) {
        console.log('👑 ADMIN LOGIN DETECTED:', betaUser.first_name);
        console.log('🛠️ Admin features will be available');
      }

      console.log('🎉 SUCCESS: User authentication completed');
      console.log('📊 Final login metrics:', {
        firstName: betaUser.first_name,
        techId: betaUser.tech_uuid.slice(-8),
        queryTime: `${queryTime.toFixed(2)}ms`,
        isAdmin: betaUser.is_admin || false,
        timestamp: new Date().toISOString().slice(11, 23)
      });
      
      console.groupEnd();
      return { success: true };

    } catch (error) {
      console.error('❌ EXCEPTION: Authentication failed');
      
      if (error.name === 'AbortError') {
        console.error('⏰ Error type: Database query timeout (10s exceeded)');
      } else {
        console.error('🔥 Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n')[0]
        });
      }
      
      console.groupEnd();
      return { success: false, error: 'Login request failed' };
    }
  };

    const updateUserIcon = async (iconName: string): Promise<boolean> => {
    if (!user) return false;
  
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/beta_users?id=eq.${user.id}`, {
       method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
       body: JSON.stringify({
          user_icon: iconName,
          updated_at: new Date().toISOString()
        })
      });

      if (response.ok) {
        // Update local user state
        const updatedUser = { ...user, user_icon: iconName };
        setUser(updatedUser);
        localStorage.setItem('tradesphere_beta_user', JSON.stringify(updatedUser));
      
        console.log(`✅ User icon updated to: ${iconName}`);
        return true;
      } else {
        console.error('Failed to update user icon:', response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Error updating user icon:', error);
      return false;
    }
  };

  const signOut = () => {
    setUser(null);
    setIsAdmin(false); // 🎯 NEW: Reset admin status
    localStorage.removeItem('tradesphere_beta_user');
  };

  const completeRegistration = (userData: BetaUser) => {
    setUser(userData);
    setIsAdmin(userData.is_admin || false); // 🎯 NEW: Set admin status
    localStorage.setItem('tradesphere_beta_user', JSON.stringify(userData));
  };

  const value = {
    user,
    loading,
    isAdmin, // 🎯 NEW: Expose admin status
    validateBetaCode,
    registerBetaUser,
    signInBetaUser,
    completeRegistration,
    updateUserIcon,
    signOut
  };

  return <AuthContext.Provider value={value}>
    {console.log('🎨 AUTH_CONTEXT - Providing:', { loading, user: !!user, isAdmin })}
    {children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};