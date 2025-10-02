/**
 * PaverPatioContextService - Conversation State Management
 *
 * Manages session-based conversation state for paver patio variable confirmation.
 * Handles context preservation, validation, and cleanup for multi-turn conversations.
 *
 * Features:
 * - Session-based state persistence with localStorage
 * - 1-hour TTL for automatic cleanup
 * - Variable confirmation tracking
 * - Conversation phase management
 * - Validation logic for completeness
 * - Context restoration for interrupted conversations
 */

import type { VariableConfirmationState } from './PaverPatioIntelligenceService';

export interface PaverPatioSession {
  sessionId: string;
  state: VariableConfirmationState;
  timestamp: number;
  lastActivity: number;
  userMessage: string;
  questionHistory: QuestionRecord[];
}

export interface QuestionRecord {
  variable: string;
  question: string;
  userResponse: string;
  extractedValue: any;
  timestamp: number;
}

export interface ValidationResult {
  isComplete: boolean;
  hasMinimumVariables: boolean;
  missingCritical: string[];
  confidence: number;
  readyForCalculation: boolean;
}

export class PaverPatioContextService {
  private static readonly STORAGE_KEY = 'paver_patio_context_';
  private static readonly TTL_HOURS = 1; // 1 hour session timeout
  private static readonly MIN_VARIABLES_FOR_CALCULATION = 4;

  // Critical variables that must be confirmed for any calculation
  private static readonly CRITICAL_VARIABLES = [
    'squareFootage',
    'tearoutComplexity',
    'accessDifficulty'
  ];

  // High-impact variables that improve accuracy significantly
  private static readonly HIGH_IMPACT_VARIABLES = [
    'teamSize',
    'cuttingComplexity',
    'equipmentRequired'
  ];

  /**
   * Save confirmation state for session with automatic cleanup
   */
  static saveConfirmationState(sessionId: string, state: VariableConfirmationState, userMessage?: string): void {
    try {
      const session: PaverPatioSession = {
        sessionId,
        state,
        timestamp: Date.now(),
        lastActivity: Date.now(),
        userMessage: userMessage || '',
        questionHistory: this.loadQuestionHistory(sessionId)
      };

      localStorage.setItem(
        this.STORAGE_KEY + sessionId,
        JSON.stringify(session)
      );

      console.log('💾 CONTEXT SAVED:', {
        sessionId,
        phase: state.conversationPhase,
        pendingVariables: state.pendingVariables.length,
        questionCount: state.questionCount
      });

      // Clean up old sessions
      this.cleanupExpiredSessions();

    } catch (error) {
      console.error('❌ FAILED TO SAVE CONTEXT:', error);
    }
  }

  /**
   * Load confirmation state for session with validation
   */
  static loadConfirmationState(sessionId: string): VariableConfirmationState | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY + sessionId);
      if (!stored) {
        console.log('📂 NO CONTEXT FOUND for session:', sessionId);
        return null;
      }

      const session: PaverPatioSession = JSON.parse(stored);

      // Check if session is expired
      const now = Date.now();
      const ageHours = (now - session.timestamp) / (1000 * 60 * 60);

      if (ageHours > this.TTL_HOURS) {
        console.log('⏰ SESSION EXPIRED:', { sessionId, ageHours: ageHours.toFixed(2) });
        this.clearConfirmationState(sessionId);
        return null;
      }

      // Update last activity
      session.lastActivity = now;
      localStorage.setItem(this.STORAGE_KEY + sessionId, JSON.stringify(session));

      console.log('📂 CONTEXT LOADED:', {
        sessionId,
        phase: session.state.conversationPhase,
        ageMinutes: ((now - session.timestamp) / (1000 * 60)).toFixed(1),
        pendingVariables: session.state.pendingVariables.length
      });

      return session.state;

    } catch (error) {
      console.error('❌ FAILED TO LOAD CONTEXT:', error);
      return null;
    }
  }

  /**
   * Record question and response for conversation history
   */
  static recordQuestionResponse(
    sessionId: string,
    variable: string,
    question: string,
    userResponse: string,
    extractedValue: any
  ): void {
    try {
      const history = this.loadQuestionHistory(sessionId);

      const record: QuestionRecord = {
        variable,
        question,
        userResponse,
        extractedValue,
        timestamp: Date.now()
      };

      history.push(record);

      // Keep only last 10 questions to prevent storage bloat
      if (history.length > 10) {
        history.splice(0, history.length - 10);
      }

      localStorage.setItem(
        this.STORAGE_KEY + sessionId + '_history',
        JSON.stringify(history)
      );

      console.log('📝 QUESTION RECORDED:', {
        sessionId,
        variable,
        extractedValue,
        historyLength: history.length
      });

    } catch (error) {
      console.error('❌ FAILED TO RECORD QUESTION:', error);
    }
  }

  /**
   * Load question history for session
   */
  static loadQuestionHistory(sessionId: string): QuestionRecord[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY + sessionId + '_history');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ FAILED TO LOAD QUESTION HISTORY:', error);
      return [];
    }
  }

  /**
   * Clear confirmation state and history
   */
  static clearConfirmationState(sessionId: string): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY + sessionId);
      localStorage.removeItem(this.STORAGE_KEY + sessionId + '_history');

      console.log('🗑️ CONTEXT CLEARED for session:', sessionId);
    } catch (error) {
      console.error('❌ FAILED TO CLEAR CONTEXT:', error);
    }
  }

  /**
   * Validate that confirmed variables are sufficient for calculation
   */
  static validateCompleteness(state: VariableConfirmationState): ValidationResult {
    const confirmed = state.confirmedVariables;
    const confirmedCount = this.countConfirmedVariables(confirmed, state.detectedSquareFootage);

    // Check for critical variables
    const missingCritical: string[] = [];

    // Square footage check
    if (!state.detectedSquareFootage && !this.getNestedValue(confirmed, 'squareFootage')) {
      missingCritical.push('squareFootage');
    }

    // Check other critical variables
    for (const variable of this.CRITICAL_VARIABLES) {
      if (variable === 'squareFootage') continue; // Already checked

      if (!this.getNestedValue(confirmed, variable)) {
        missingCritical.push(variable);
      }
    }

    const hasMinimumVariables = confirmedCount >= this.MIN_VARIABLES_FOR_CALCULATION;
    const hasCriticalVariables = missingCritical.length === 0;
    const isComplete = hasMinimumVariables && hasCriticalVariables;

    // Calculate confidence based on confirmed variables
    const totalPossibleVariables = 10; // Total high-impact variables
    const confidence = Math.min(0.95, confirmedCount / totalPossibleVariables);

    const result: ValidationResult = {
      isComplete,
      hasMinimumVariables,
      missingCritical,
      confidence,
      readyForCalculation: isComplete && confidence >= 0.4
    };

    console.log('✅ VALIDATION RESULT:', {
      confirmedCount,
      missingCritical: missingCritical.length,
      confidence: (confidence * 100).toFixed(1) + '%',
      readyForCalculation: result.readyForCalculation
    });

    return result;
  }

  /**
   * Get summary of confirmed variables for user feedback
   */
  static getConfirmationSummary(state: VariableConfirmationState): string {
    const confirmed = state.confirmedVariables;
    const summary: string[] = [];

    // Square footage
    const sqft = state.detectedSquareFootage || this.getNestedValue(confirmed, 'squareFootage');
    if (sqft) {
      summary.push(`📏 Size: ${sqft} square feet`);
    }

    // Tearout
    const tearout = this.getNestedValue(confirmed, 'excavation.tearoutComplexity');
    if (tearout) {
      const tearoutLabel = tearout === 'grass' ? 'grass/sod removal' :
                          tearout === 'concrete' ? 'concrete removal' :
                          tearout === 'asphalt' ? 'asphalt removal' : tearout;
      summary.push(`🔨 Removal: ${tearoutLabel}`);
    }

    // Access
    const access = this.getNestedValue(confirmed, 'siteAccess.accessDifficulty');
    if (access) {
      summary.push(`🚛 Access: ${access}`);
    }

    // Team size
    const teamSize = this.getNestedValue(confirmed, 'labor.teamSize');
    if (teamSize) {
      const teamLabel = teamSize === 'twoPerson' ? '2-person crew' : '3+ person crew';
      summary.push(`👥 Crew: ${teamLabel}`);
    }

    // Equipment
    const equipment = this.getNestedValue(confirmed, 'excavation.equipmentRequired');
    if (equipment) {
      const equipmentLabel = equipment === 'handTools' ? 'hand tools' :
                           equipment === 'attachments' ? 'demo equipment' :
                           equipment === 'lightMachinery' ? 'light machinery' :
                           equipment === 'heavyMachinery' ? 'heavy equipment' : equipment;
      summary.push(`⚙️ Equipment: ${equipmentLabel}`);
    }

    // Cutting complexity
    const cutting = this.getNestedValue(confirmed, 'materials.cuttingComplexity');
    if (cutting) {
      summary.push(`✂️ Cutting: ${cutting} complexity`);
    }

    // Paver style
    const style = this.getNestedValue(confirmed, 'materials.paverStyle');
    if (style) {
      summary.push(`🧱 Pavers: ${style} grade`);
    }

    return summary.length > 0
      ? `Here's what we've confirmed:\n${summary.join('\n')}`
      : 'No variables confirmed yet.';
  }

  /**
   * Count confirmed variables including detected square footage
   */
  private static countConfirmedVariables(variables: any, detectedSquareFootage?: number): number {
    let count = 0;

    // Count detected square footage
    if (detectedSquareFootage) {
      count++;
    }

    // Count nested confirmed variables
    function countNested(obj: any) {
      for (const key in obj) {
        if (obj[key] !== null && obj[key] !== undefined) {
          if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            countNested(obj[key]);
          } else {
            count++;
          }
        }
      }
    }

    countNested(variables);
    return count;
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    if (!obj) return null;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (!current || current[key] === undefined || current[key] === null) {
        return null;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Clean up expired sessions from localStorage
   */
  private static cleanupExpiredSessions(): void {
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];

      // Check all localStorage keys for expired sessions
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_KEY)) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');

            if (data.timestamp) {
              const ageHours = (now - data.timestamp) / (1000 * 60 * 60);

              if (ageHours > this.TTL_HOURS) {
                keysToRemove.push(key);
              }
            }
          } catch (e) {
            // Invalid data - mark for removal
            keysToRemove.push(key);
          }
        }
      }

      // Remove expired sessions
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      if (keysToRemove.length > 0) {
        console.log('🧹 CLEANED UP:', keysToRemove.length, 'expired sessions');
      }

    } catch (error) {
      console.error('❌ CLEANUP FAILED:', error);
    }
  }

  /**
   * Get all active sessions (for debugging)
   */
  static getActiveSessions(): string[] {
    const sessions: string[] = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_KEY) && !key.includes('_history')) {
          const sessionId = key.replace(this.STORAGE_KEY, '');
          sessions.push(sessionId);
        }
      }
    } catch (error) {
      console.error('❌ FAILED TO GET ACTIVE SESSIONS:', error);
    }

    return sessions;
  }

  /**
   * Get session statistics for monitoring
   */
  static getSessionStats(sessionId: string): any {
    try {
      const session = this.loadConfirmationState(sessionId);
      if (!session) return null;

      const history = this.loadQuestionHistory(sessionId);
      const validation = this.validateCompleteness(session);

      return {
        sessionId,
        phase: session.conversationPhase,
        questionsAsked: session.questionCount,
        variablesConfirmed: this.countConfirmedVariables(session.confirmedVariables, session.detectedSquareFootage),
        pendingVariables: session.pendingVariables.length,
        confidence: validation.confidence,
        readyForCalculation: validation.readyForCalculation,
        historyLength: history.length
      };
    } catch (error) {
      console.error('❌ FAILED TO GET SESSION STATS:', error);
      return null;
    }
  }
}