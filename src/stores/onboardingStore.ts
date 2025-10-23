/**
 * PHASE 4C: ONBOARDING STATE MANAGEMENT
 *
 * Zustand store for managing onboarding wizard state.
 *
 * Features:
 * - Track current wizard step (0-3)
 * - Store form data for each step
 * - Auto-save progress to database
 * - Handle browser refresh gracefully
 * - Type-safe state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSupabase } from '../services/supabase';

// ==============================================================================
// TYPES
// ==============================================================================

export type OnboardingStep = 0 | 1 | 2 | 3;  // Welcome | AI | Branding | Team

export interface AIPersonalityConfig {
  tone: 'professional' | 'friendly' | 'casual';
  formality: 'formal' | 'balanced' | 'informal';
  industry_language: 'standard' | 'technical' | 'simplified';
  sales_approach: 'consultative' | 'direct' | 'educational';
}

export interface BrandingConfig {
  logo_url: string | null;
  primary_color: string;
  business_address: string | null;
  business_phone: string | null;
}

interface OnboardingState {
  // Current step in wizard
  currentStep: OnboardingStep;

  // Company ID and name (loaded from session token)
  companyId: string | null;
  companyName: string | null;

  // Form data for each step
  aiPersonality: AIPersonalityConfig;
  branding: BrandingConfig;

  // Team invitations (emails to send)
  teamInvites: Array<{ email: string; role: string }>;

  // Loading and error states
  loading: boolean;
  saving: boolean;
  error: string | null;

  // Actions
  setCompanyInfo: (companyId: string, companyName: string) => void;
  setCurrentStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateAIPersonality: (config: Partial<AIPersonalityConfig>) => Promise<void>;
  updateBranding: (config: Partial<BrandingConfig>) => Promise<void>;
  addTeamInvite: (email: string, role: string) => void;
  removeTeamInvite: (email: string) => void;
  completeOnboarding: () => Promise<boolean>;
  reset: () => void;
}

// ==============================================================================
// DEFAULT VALUES
// ==============================================================================

const DEFAULT_AI_PERSONALITY: AIPersonalityConfig = {
  tone: 'professional',
  formality: 'balanced',
  industry_language: 'standard',
  sales_approach: 'consultative'
};

const DEFAULT_BRANDING: BrandingConfig = {
  logo_url: null,
  primary_color: '#3B82F6',  // Blue
  business_address: null,
  business_phone: null
};

// ==============================================================================
// ZUSTAND STORE
// ==============================================================================

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentStep: 0,
      companyId: null,
      companyName: null,
      aiPersonality: DEFAULT_AI_PERSONALITY,
      branding: DEFAULT_BRANDING,
      teamInvites: [],
      loading: false,
      saving: false,
      error: null,

      // Set company info from token validation
      setCompanyInfo: (companyId: string, companyName: string) => {
        set({ companyId, companyName });
      },

      // Navigate to specific step
      setCurrentStep: (step: OnboardingStep) => {
        set({ currentStep: step });
      },

      // Navigate to next step
      nextStep: () => {
        const { currentStep } = get();
        if (currentStep < 3) {
          set({ currentStep: (currentStep + 1) as OnboardingStep });
        }
      },

      // Navigate to previous step
      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 0) {
          set({ currentStep: (currentStep - 1) as OnboardingStep });
        }
      },

      // Update AI personality configuration with auto-save
      updateAIPersonality: async (config: Partial<AIPersonalityConfig>) => {
        const { companyId, aiPersonality } = get();

        if (!companyId) {
          set({ error: 'Company ID not set' });
          return;
        }

        // Optimistic update
        const newConfig = { ...aiPersonality, ...config };
        set({ aiPersonality: newConfig, saving: true, error: null });

        try {
          const supabase = getSupabase();

          // Save to database
          const { error } = await supabase
            .from('companies')
            .update({
              ai_personality_config: newConfig,
              updated_at: new Date().toISOString()
            })
            .eq('id', companyId);

          if (error) throw error;

          set({ saving: false });
        } catch (err: any) {
          console.error('[OnboardingStore] Failed to save AI personality:', err);
          set({ error: err.message, saving: false });
        }
      },

      // Update branding configuration with auto-save
      updateBranding: async (config: Partial<BrandingConfig>) => {
        const { companyId, branding } = get();

        if (!companyId) {
          set({ error: 'Company ID not set' });
          return;
        }

        // Optimistic update
        const newConfig = { ...branding, ...config };
        set({ branding: newConfig, saving: true, error: null });

        try {
          const supabase = getSupabase();

          // Save to database
          const { error } = await supabase
            .from('companies')
            .update({
              branding_config: newConfig,
              updated_at: new Date().toISOString()
            })
            .eq('id', companyId);

          if (error) throw error;

          set({ saving: false });
        } catch (err: any) {
          console.error('[OnboardingStore] Failed to save branding:', err);
          set({ error: err.message, saving: false });
        }
      },

      // Add team member invitation (stored locally until completion)
      addTeamInvite: (email: string, role: string) => {
        const { teamInvites } = get();

        // Check for duplicates
        if (teamInvites.some(inv => inv.email === email)) {
          set({ error: 'This email has already been invited' });
          return;
        }

        set({
          teamInvites: [...teamInvites, { email, role }],
          error: null
        });
      },

      // Remove team member invitation
      removeTeamInvite: (email: string) => {
        const { teamInvites } = get();
        set({
          teamInvites: teamInvites.filter(inv => inv.email !== email)
        });
      },

      // Complete onboarding and send team invitations
      completeOnboarding: async (): Promise<boolean> => {
        const { companyId, aiPersonality, branding, teamInvites } = get();

        if (!companyId) {
          set({ error: 'Company ID not set' });
          return false;
        }

        set({ loading: true, error: null });

        try {
          const supabase = getSupabase();

          // Step 1: Mark onboarding as completed via helper function
          const { data, error: completeError } = await supabase.rpc(
            'complete_company_onboarding',
            {
              company_id_input: companyId,
              ai_config_input: aiPersonality,
              branding_config_input: branding
            }
          );

          if (completeError) throw completeError;

          // Step 2: Send team invitations (if any)
          if (teamInvites.length > 0) {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
              throw new Error('No active session');
            }

            // Call invite API for each team member
            for (const invite of teamInvites) {
              try {
                const response = await fetch('/.netlify/functions/invite-team-member', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    email: invite.email,
                    roleType: invite.role
                  })
                });

                if (!response.ok) {
                  console.error(`Failed to send invitation to ${invite.email}`);
                }
              } catch (err) {
                console.error(`Error sending invitation to ${invite.email}:`, err);
              }
            }
          }

          set({ loading: false });
          return true;

        } catch (err: any) {
          console.error('[OnboardingStore] Failed to complete onboarding:', err);
          set({ error: err.message, loading: false });
          return false;
        }
      },

      // Reset store to initial state
      reset: () => {
        set({
          currentStep: 0,
          companyId: null,
          companyName: null,
          aiPersonality: DEFAULT_AI_PERSONALITY,
          branding: DEFAULT_BRANDING,
          teamInvites: [],
          loading: false,
          saving: false,
          error: null
        });
      }
    }),
    {
      name: 'tradesphere-onboarding',  // localStorage key
      partialize: (state) => ({
        // Only persist step and form data, not loading/error states
        currentStep: state.currentStep,
        companyId: state.companyId,
        companyName: state.companyName,
        aiPersonality: state.aiPersonality,
        branding: state.branding,
        teamInvites: state.teamInvites
      })
    }
  )
);

// ==============================================================================
// HELPER HOOKS
// ==============================================================================

/**
 * Get step progress percentage
 */
export const useOnboardingProgress = (): number => {
  const currentStep = useOnboardingStore(state => state.currentStep);
  return ((currentStep + 1) / 4) * 100;  // 4 total steps (0-3)
};

/**
 * Check if user can proceed to next step
 */
export const useCanProceed = (): boolean => {
  const currentStep = useOnboardingStore(state => state.currentStep);
  const aiPersonality = useOnboardingStore(state => state.aiPersonality);
  const branding = useOnboardingStore(state => state.branding);

  switch (currentStep) {
    case 0:  // Welcome step - always can proceed
      return true;

    case 1:  // AI personality - require at least tone selection
      return aiPersonality.tone !== '';

    case 2:  // Branding - optional (can proceed even without logo/address)
      return true;

    case 3:  // Team invites - optional (can skip)
      return true;

    default:
      return false;
  }
};

/**
 * Get step names for display
 */
export const STEP_NAMES: Record<OnboardingStep, string> = {
  0: 'Welcome',
  1: 'AI Assistant',
  2: 'Branding',
  3: 'Team Setup'
};
