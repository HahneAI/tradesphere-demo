// SURGICAL ChatInterface - Preserves 100% of original + adds minimal enterprise features
// This keeps your exact working layout and only adds performance tracking in background

import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { flushSync } from 'react-dom';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { getDeviceInfo, getVoiceConfig, getVoiceGuidance, needsIOSFallback, getVoiceErrorMessage } from '../utils/mobile-detection';
import { AvatarSelectionPopup } from './ui/AvatarSelectionPopup';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
    getCoreConfig,
    getTerminologyConfig,
    getSmartVisualThemeConfig,
    getSendEffectConfig,
} from '../config/industry';
import { EnvironmentManager } from '../config/defaults';
import { triggerSendEffect } from './ui/IndustryEffects';
import TypingIndicator from './ui/TypingIndicator';
import { ThemeAwareMessageBubble } from './ui/ThemeAwareMessageBubble';
import { ThemeAwareAvatar } from './ui/ThemeAwareAvatar';
import { FeedbackPopup } from './ui/FeedbackPopup';
import { sendFeedback } from '../utils/feedback-webhook';
import { Message } from '../types/message';
import { HeaderMenu } from './dashboard/HeaderMenu';
import { NotesPopup } from './ui/NotesPopup';
import { CustomersTab } from './CustomersTab';
import { customerContextService } from '../services/customerContext';
import { runBackendDiagnostics, logDiagnosticResults, DiagnosticResults } from '../utils/backend-diagnostics';

const coreConfig = getCoreConfig();
const terminologyConfig = getTerminologyConfig();

const DynamicIcon = ({ name, ...props }: { name: keyof typeof Icons } & Icons.LucideProps) => {
  const IconComponent = Icons[name];
  if (!IconComponent) {
    return <Icons.MessageCircle {...props} />;
  }
  return <IconComponent {...props} />;
};

// ✅ TIMING FIX: Waiting placeholder component for empty panels
const WaitingPlaceholder = ({ system, visualConfig }: {
  system: string;
  visualConfig: any;
}) => (
  <div 
    className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed"
    style={{ 
      backgroundColor: visualConfig.colors.surface,
      borderColor: visualConfig.colors.text.secondary + '40'
    }}
  >
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 mb-3" 
         style={{ borderColor: visualConfig.colors.primary }}></div>
    <span 
      className="text-sm font-medium"
      style={{ color: visualConfig.colors.text.secondary }}
    >
      Waiting for {system} response...
    </span>
  </div>
);

interface ChatInterfaceProps {
  onBackToDashboard?: () => void;
  onNavigate?: (tab: 'jobs' | 'schedule' | 'crews' | 'customers' | 'billing') => void;
  onServicesClick?: () => void;
  onMaterialsClick?: () => void;
  onQuickCalculatorClick?: () => void;
  onCompanySettingsClick?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onBackToDashboard,
  onNavigate,
  onServicesClick,
  onMaterialsClick,
  onQuickCalculatorClick,
  onCompanySettingsClick
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut, isAdmin } = useAuth();
  const visualConfig = getSmartVisualThemeConfig(theme);
  
  const [showAvatarPopup, setShowAvatarPopup] = useState(false);
  const [showNotesPopup, setShowNotesPopup] = useState(false);

  // 🏢 ENTERPRISE: Minimal performance tracking (background + admin only)
  const [performanceMetrics, setPerformanceMetrics] = useState({
    webhookLatency: null,
    totalResponseTime: null,
    nativeLatency: null,
    makeLatency: null
  });
  const [processingStartTime, setProcessingStartTime] = useState(null);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  
  // 🔧 ADMIN DIAGNOSTICS: Backend connectivity testing
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResults | null>(null);
  const [showDiagnosticPanel, setShowDiagnosticPanel] = useState(false);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  // 🎤 VOICE INPUT: Speech recognition state
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();
  
  // Mobile-aware voice input state
  const deviceInfo = getDeviceInfo();
  const voiceConfig = getVoiceConfig(deviceInfo);
  const voiceGuidance = getVoiceGuidance(deviceInfo);
  
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [micPermissionState, setMicPermissionState] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [voiceTimeout, setVoiceTimeout] = useState<NodeJS.Timeout | null>(null);
  const [pauseTimeout, setPauseTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showIOSGuidance, setShowIOSGuidance] = useState(false);

  const generateSessionId = () => {
    if (!user) {
      console.warn("No user context for session generation, using basic session ID");
      return `quote_session_${Date.now()}`;
    }

    const userPrefix = (user.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
    const userId = user.id.substring(0, 8);
    const timestamp = Date.now();

    return `quote_session_${userPrefix}_${userId}_${timestamp}`;
  };
  
  const sessionIdRef = useRef<string>(generateSessionId());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastPollTimeRef = useRef<Date>(new Date());
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const refreshButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const savedScrollPosition = useRef<number>(0);

  // 🎯 USING CENTRALIZED DEFAULTS: Safe fallback to TradeSphere tech defaults
  const welcomeMessage = EnvironmentManager.getWelcomeMessage();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: welcomeMessage,
      sender: 'ai',
      timestamp: new Date(),
      sessionId: sessionIdRef.current
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showCustomersPopup, setShowCustomersPopup] = useState(false);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
  const [loadingCustomerName, setLoadingCustomerName] = useState<string | null>(null);
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 🏢 PHASE 3: Customer Details State
  const [customerDetails, setCustomerDetails] = useState<{
    name: string;
    address: string;
    email: string;
    phone: string;
  } | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [recentCustomerSessions, setRecentCustomerSessions] = useState<any[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [previousCustomerName, setPreviousCustomerName] = useState<string | null>(null);
  const [currentCustomer, setCurrentCustomer] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<{
    sessionId: string;
    customerName: string | null;
    customerContext: {
      address: string;
      email: string;
      phone: string;
    } | null;
  }>({
    sessionId: sessionIdRef.current,
    customerName: null,
    customerContext: null
  });

  // 🔄 PHASE 2D: Conversation preloading states
  const [isPreloadingContext, setIsPreloadingContext] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [preloadMessage, setPreloadMessage] = useState('');

  const NETLIFY_API_URL = `/.netlify/functions/chat-messages/${sessionIdRef.current}`;
  const NATIVE_PRICING_AGENT_URL = '/.netlify/functions/pricing-agent';
  const CUSTOMER_DETAILS_ENABLED = import.meta.env.VITE_ENABLE_CUSTOMER_DETAILS === 'true';

  // 🔄 AUTH TIMING FIX: Load customers when auth becomes available and dropdown is open
  useEffect(() => {
    if (showCustomerDropdown && user?.id && recentCustomerSessions.length === 0 && !isLoadingCustomers) {
      loadRecentCustomers();
    }
  }, [showCustomerDropdown, user?.id]);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    signOut();
  }

  // 🔧 ENHANCED: Robust webhook handler with validation, timeout, and debug logging
  // 🚀 Native pricing agent endpoint
  const sendUserMessageToNative = async (userMessageText: string) => {
    const debugPrefix = `🔗 NATIVE [${sessionIdRef.current.slice(-8)}]`;
    
    console.group(`${debugPrefix} Starting native pipeline request`);
    console.log('📤 Message:', userMessageText.substring(0, 100) + (userMessageText.length > 100 ? '...' : ''));
    
    // 🏢 PHASE 4: Log customer context when present
    if (customerDetails) {
      // Customer context available for processing
    }
    
    // Validate user authentication
    if (!user) {
      console.error('❌ No user data available for native pipeline');
      console.groupEnd();
      throw new Error("User not authenticated");
    }

    const payload = {
      message: userMessageText,
      timestamp: new Date().toISOString(),
      sessionId: sessionIdRef.current,
      source: 'TradeSphere_Native',
      userId: user.id,
      userName: user.name,
      userTitle: user.title,
      companyId: user.company_id, // 🎯 NEW: Company context for RLS
      // 🏢 PHASE 4: Include customer details when available
      customerName: customerDetails?.name || null,
      customerAddress: customerDetails?.address || null,
      customerEmail: customerDetails?.email || null,
      customerPhone: customerDetails?.phone || null
    };

    const startTime = performance.now();
    
    try {
      
      const response = await fetch(NATIVE_PRICING_AGENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const nativeLatency = performance.now() - startTime;
      
      setPerformanceMetrics(prev => ({
        ...prev,
        nativeLatency: nativeLatency.toFixed(2)
      }));

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error('❌ Native pipeline failed:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText.substring(0, 500)
        });
        throw new Error(`Native pipeline failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Native pipeline success:', {
        processingTime: `${result.processingTime}ms`,
        stage: result.stage,
        servicesFound: result.debug?.servicesFound || 0
      });
      
      console.groupEnd();
      return result;

    } catch (error) {
      console.error('❌ Native pipeline error:', error.message);
      console.groupEnd();
      throw error;
    }
  };

  // 🔧 SIMPLIFIED: Fixed polling with proper URL construction
  const pollForAiMessages = async () => {
    // Quick validation before polling
    if (!sessionIdRef.current) {
      return;
    }
    
    const pollStart = performance.now();
    const currentApiUrl = `/.netlify/functions/chat-messages/${encodeURIComponent(sessionIdRef.current)}`;
    const sinceParam = encodeURIComponent(lastPollTimeRef.current.toISOString());
    
    // Only log detailed info if admin or if there's been a recent user message
    const shouldDetailLog = isAdmin || (Date.now() - (processingStartTime || 0)) < 30000;
    
    if (shouldDetailLog) {
      // Starting poll request
    }
    
    try {
      const response = await fetch(`${currentApiUrl}?since=${sinceParam}`);
      const pollLatency = performance.now() - pollStart;
      
      if (!response.ok) {
        // HTTP error occurred
        
        // Don't spam errors for common issues
        if (response.status !== 404 && response.status !== 429) {
          throw new Error(`Poll failed: ${response.status} ${response.statusText}`);
        }
        return;
      }

      const newAiMessages = await response.json();
      
      if (shouldDetailLog) {
        // Response received
      }
      
      if (newAiMessages.length > 0) {
        // New messages received
        
        // 🏢 ENTERPRISE: Calculate total response time
        if (processingStartTime) {
          const totalTime = Date.now() - processingStartTime;
          setPerformanceMetrics(prev => ({
            ...prev,
            totalResponseTime: (totalTime / 1000).toFixed(1)
          }));
          
          console.log(`⏱️ PERFORMANCE: Complete AI response in ${(totalTime / 1000).toFixed(1)}s`);
          setProcessingStartTime(null); // Reset after completion
        }

        // Validate and process messages
        const processedMessages = newAiMessages
          .filter((msg: any) => msg && msg.text && msg.sender) // Basic validation
          .map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp || new Date())
          }));

        if (processedMessages.length !== newAiMessages.length) {
          // Some messages were filtered out
        }

        setMessages(prev => {
          const existingIds = new Set(prev.map(msg => msg.id));
          const uniqueNewMessages = processedMessages.filter((msg: Message) => !existingIds.has(msg.id));
          
          if (uniqueNewMessages.length > 0) {
            setIsLoading(false);
            lastPollTimeRef.current = new Date();
            
            // Added new messages to chat
            
            // 🔄 DUAL TESTING: Check completion based on mode
            if (uniqueNewMessages.some(msg => msg.sender === 'ai')) {
              const allMessages = [...prev, ...uniqueNewMessages];
              const recentAIMessages = allMessages.filter(msg => 
                msg.sender === 'ai' && 
                Math.abs(new Date(msg.timestamp).getTime() - Date.now()) < 60000 // Last minute
              );
              
              if (DUAL_TESTING_ENABLED) {
                // Dual mode: Wait for both responses
                const hasMakeResponse = recentAIMessages.some(msg => 
                  !msg.metadata?.source || msg.metadata?.source === 'make_com' || msg.source === 'make_com'
                );
                const hasNativeResponse = recentAIMessages.some(msg => 
                  msg.metadata?.source === 'native_pricing_agent' || msg.source === 'native_pricing_agent'
                );
                
                if (hasMakeResponse && hasNativeResponse) {
                  setIsLoading(false);
                }
              } else {
                // Single mode: Return to idle after ANY AI response
                if (recentAIMessages.length > 0) {
                  setIsLoading(false);
                }
              }
            }
            
            return [...prev, ...uniqueNewMessages];
          } else {
            // No new unique messages
            return prev;
          }
        });
      } else {
        // Only log no messages if we're in detailed logging mode
        if (shouldDetailLog && pollLatency > 100) {
          // No new messages found
        }
      }
      
    } catch (error) {
      const pollLatency = performance.now() - pollStart;
      
      // Enhanced error logging
      console.error('❌ Polling failed:', error.message);
      
      // Network connectivity check for admins
      if (isAdmin && error.message?.includes('fetch')) {
        console.error('🌐 ADMIN DEBUG: Network connectivity issue detected');
        console.error('🔍 Check: Internet connection, Netlify functions, CORS settings');
      }
    }
  };

  // 🔍 DEBUG: Simple polling rollback to isolate 400 error
  useEffect(() => {
    const polling = setInterval(() => {
      pollForAiMessages();
    }, 2000);

    return () => {
      clearInterval(polling);
    };
  }, []); // Simplified dependency array

  // IMPROVED: Smart auto-scroll functionality
  useEffect(() => {
    // Only auto-scroll if user is near the bottom or if it's a new message (not loading history)
    if (messagesContainerRef.current && messagesEndRef.current) {
      const container = messagesContainerRef.current;
      const scrollPosition = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      // Check if user is near the bottom (within 100px)
      const isNearBottom = scrollPosition + clientHeight >= scrollHeight - 100;

      // Check if this is likely loading previous messages (user scrolled up significantly)
      const isLoadingHistory = savedScrollPosition.current > 0 && scrollPosition < savedScrollPosition.current;

      // Only auto-scroll if user is near bottom and not loading history
      if (isNearBottom && !isLoadingHistory) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }

      // Reset saved scroll position after use
      if (savedScrollPosition.current > 0) {
        savedScrollPosition.current = 0;
      }
    }
  }, [messages]);

  // ORIGINAL: User context initialization
  useEffect(() => {
    if (user && user.name && !sessionIdRef.current.includes(user.name.toLowerCase())) {
      handleRefreshChat();
    }
  }, [user]);

  // ORIGINAL: Personalized welcome message
  useEffect(() => {
    if (user && user.name && messages.length === 1 && !messages[0].text.includes(user.name)) {
      const capitalizedName = user.name.charAt(0).toUpperCase() + user.name.slice(1).toLowerCase();
      setMessages([{
        id: '1',
        text: `Hey ${capitalizedName}, what's the customer scoop?`,
        sender: 'ai',
        timestamp: new Date(),
        sessionId: sessionIdRef.current
      }]);
    }
  }, [user]);

  // 🔄 DUAL TESTING: Group messages for dual display
  const groupMessagesForDualDisplay = (messages: Message[]) => {
    if (!DUAL_TESTING_ENABLED) return messages.map(msg => ({ type: 'shared', message: msg }));

    const grouped: Array<{ 
      type: 'shared' | 'dual' | 'single';
      message?: Message;
      dual?: { make: Message | null; native: Message | null; waitingFor?: 'make' | 'native' | null };
    }> = [];
    const processed = new Set<string>();

    // ✅ SLOT FILLING FIX: Function to fill existing waiting slots
    const findAndFillExistingSlot = (newMessage: Message) => {
      const isNative = newMessage.metadata?.source === 'native_pricing_agent' || newMessage.source === 'native_pricing_agent';
      const isMake = newMessage.metadata?.source === 'make_com' || newMessage.source === 'make_com' || (!isNative && !newMessage.source);
      
      // Look for existing dual panel with empty slot for this source
      for (let i = grouped.length - 1; i >= 0; i--) {
        const group = grouped[i];
        if (group.type === 'dual' && group.dual) {
          if (isMake && !group.dual.make && group.dual.waitingFor === 'make') {
            group.dual.make = newMessage;
            group.dual.waitingFor = null; // Both slots now filled
            return true; // Successfully filled existing slot
          }
          if (isNative && !group.dual.native && group.dual.waitingFor === 'native') {
            group.dual.native = newMessage;
            group.dual.waitingFor = null; // Both slots now filled
            return true; // Successfully filled existing slot
          }
        }
      }
      return false; // No existing slot found
    };

    messages.forEach((msg, index) => {
      if (processed.has(msg.id)) return;

      // ✅ LOGICAL GROUPING: Shared messages (welcome + user inputs)
      if (msg.sender === 'user' || (msg.sender === 'ai' && index === 0 && msg.text.includes('what\'s the customer scoop'))) {
        grouped.push({ type: 'shared', message: msg });
        processed.add(msg.id);
      } else if (msg.sender === 'ai') {
        if (DUAL_TESTING_ENABLED) {
          // ✅ SLOT FILLING FIX: Try to fill existing waiting slot first
          if (findAndFillExistingSlot(msg)) {
            processed.add(msg.id);
            return; // Skip creating new dual panel
          }
          // ✅ DUAL COMPARISON: AI responses - always create dual slots when dual testing enabled
          const isNative = msg.metadata?.source === 'native_pricing_agent' || msg.source === 'native_pricing_agent';
          const isMake = msg.metadata?.source === 'make_com' || msg.source === 'make_com' || (!isNative && !msg.source);
          
          const correspondingMsg = messages.find(otherMsg => 
            otherMsg.id !== msg.id &&
            otherMsg.sender === 'ai' &&
            Math.abs(new Date(otherMsg.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 60000 && // Within 1 minute
            otherMsg.sessionId === msg.sessionId &&
            !processed.has(otherMsg.id) &&
            ((isNative && (otherMsg.metadata?.source === 'make_com' || (!otherMsg.metadata?.source && !otherMsg.source))) ||
             (isMake && (otherMsg.metadata?.source === 'native_pricing_agent' || otherMsg.source === 'native_pricing_agent')))
          );

          if (correspondingMsg) {
            // ✅ DUAL DISPLAY: Both responses available
            const makeMsg = isMake ? msg : correspondingMsg;
            const nativeMsg = isNative ? msg : correspondingMsg;
            
            grouped.push({
              type: 'dual',
              dual: { 
                make: makeMsg, 
                native: nativeMsg,
                waitingFor: null // Both responses available
              }
            });
            
            processed.add(msg.id);
            processed.add(correspondingMsg.id);
          } else {
            // ✅ TIMING FIX: Always create dual slot, fill as responses arrive
            grouped.push({
              type: 'dual',
              dual: { 
                make: isMake ? msg : null, 
                native: isNative ? msg : null,
                waitingFor: isMake ? 'native' : 'make'
              }
            });
            
            processed.add(msg.id);
          }
        } else {
          // When dual testing is disabled, show AI responses as normal shared messages
          grouped.push({
            type: 'shared',
            message: msg
          });
          processed.add(msg.id);
        }
      }
    });

    return grouped;
  };

  const handleRefreshChat = () => {
    if (!user) {
      console.error("Cannot refresh chat - no user logged in");
      return;
    }

    sessionIdRef.current = generateSessionId();
    const personalizedWelcome = user.name
      ? `Hey ${user.name.charAt(0).toUpperCase() + user.name.slice(1).toLowerCase()}, what's the customer scoop?`
      : welcomeMessage;

    setMessages([{
      id: '1',
      text: personalizedWelcome,
      sender: 'ai',
      timestamp: new Date(),
      sessionId: sessionIdRef.current
    }]);

    setIsLoading(false);
    setInputText('');
    lastPollTimeRef.current = new Date();

  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // ADD THESE DEBUG LOGS:
    // 🎯 DEBUG: Using centralized environment manager for debug logging
    console.log('Industry Type:', import.meta.env.VITE_INDUSTRY_TYPE);
    console.log('Send Effect:', EnvironmentManager.getSendEffect());
  
    const config = getSendEffectConfig();
    console.log('Final Effect:', config.effect);

    const userMessageText = inputText;
    const userMessage: Message = {
      id: uuidv4(),
      text: userMessageText,
      sender: 'user',
      timestamp: new Date(),
      sessionId: sessionIdRef.current
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // ORIGINAL: Trigger send effect
    if (sendButtonRef.current) {
      triggerSendEffect(sendButtonRef.current);
    }

    try {
      // Send to native pricing agent
      await sendUserMessageToNative(userMessageText);
    } catch (error) {
      const errorMessage: Message = {
        id: uuidv4(),
        text: "Sorry, there was an error sending your message. Please try again.",
        sender: 'ai',
        timestamp: new Date(),
        sessionId: sessionIdRef.current
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 🎤 VOICE INPUT: Check microphone permissions on mount
  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        if ('permissions' in navigator) {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setMicPermissionState(permission.state as 'granted' | 'denied');
          
          permission.addEventListener('change', () => {
            setMicPermissionState(permission.state as 'granted' | 'denied');
          });
        }
      } catch (error) {
        console.warn('Could not check microphone permission:', error);
      }
    };
    
    checkMicrophonePermission();
  }, []);

  // 🎤 VOICE INPUT: Cleanup voice timeouts on unmount
  useEffect(() => {
    return () => {
      if (voiceTimeout) {
        clearTimeout(voiceTimeout);
      }
      if (pauseTimeout) {
        clearTimeout(pauseTimeout);
      }
    };
  }, [voiceTimeout, pauseTimeout]);

  // 🎤 VOICE INPUT: Safe cleanup effect using listening state
  useEffect(() => {
    // Clean up voice state when speech recognition stops listening
    if (!listening && isRecording) {
      setIsRecording(false);
      setVoiceError(null);
      
      if (voiceTimeout) {
        clearTimeout(voiceTimeout);
        setVoiceTimeout(null);
      }
      if (pauseTimeout) {
        clearTimeout(pauseTimeout);
        setPauseTimeout(null);
      }
    }
  }, [listening, isRecording, voiceTimeout, pauseTimeout]);

  // 🎤 VOICE INPUT: Smart text appending with transcript
  const [voiceStartText, setVoiceStartText] = useState('');

  // Helper function for smart text appending
  const appendTranscript = (newText: string) => {
    const current = voiceStartText.trim();
    const newTextTrimmed = newText.trim();
    
    if (!newTextTrimmed) return voiceStartText;
    
    if (current && newTextTrimmed) {
      // Smart punctuation handling
      const separator = current.endsWith('.') || current.endsWith('!') || current.endsWith('?') 
        ? ' ' 
        : '. ';
      setInputText(current + separator + newTextTrimmed);
    } else if (current) {
      setInputText(current + ' ' + newTextTrimmed);
    } else {
      setInputText(newTextTrimmed);
    }
  };

  useEffect(() => {
    if (transcript && isRecording) {
      // During recording, append transcript to the text that was there when recording started
      const current = voiceStartText.trim();
      const newTextTrimmed = transcript.trim();
      
      if (current && newTextTrimmed) {
        const separator = current.endsWith('.') || current.endsWith('!') || current.endsWith('?') 
          ? ' ' 
          : '. ';
        setInputText(current + separator + newTextTrimmed);
      } else if (current) {
        setInputText(current + ' ' + newTextTrimmed);
      } else {
        setInputText(newTextTrimmed);
      }
      
      // Reset pause detection when new speech is detected
      if (pauseTimeout) {
        clearTimeout(pauseTimeout);
        
        // Restart pause detection
        const pauseTimer = setTimeout(() => {
          try {
            SpeechRecognition.stopListening();
          } catch (error) {
            console.warn('🎤 Error stopping speech recognition in transcript pause detection:', error);
          }
          setIsRecording(false);
          setVoiceTimeout(null);
          setPauseTimeout(null);
        }, voiceConfig.pauseDetection);
        
        setPauseTimeout(pauseTimer);
      }
    }
  }, [transcript, isRecording, voiceStartText, pauseTimeout, voiceConfig.pauseDetection]);

  // 🎤 VOICE INPUT: Handle voice recording toggle (Mobile-optimized)
  const handleVoiceToggle = async () => {
    setVoiceError(null);
    
    // iOS fallback - show keyboard dictation guidance
    if (needsIOSFallback(deviceInfo)) {
      setShowIOSGuidance(true);
      // Focus input field for keyboard dictation
      if (inputRef.current) {
        inputRef.current.focus();
      }
      return;
    }
    
    if (!browserSupportsSpeechRecognition) {
      const errorMsg = getVoiceErrorMessage('Browser not supported', deviceInfo);
      setVoiceError(errorMsg);
      return;
    }
    
    if (isRecording) {
      // Stop recording and clear all timeouts
      if (voiceTimeout) {
        clearTimeout(voiceTimeout);
        setVoiceTimeout(null);
      }
      if (pauseTimeout) {
        clearTimeout(pauseTimeout);
        setPauseTimeout(null);
      }
      
      try {
        SpeechRecognition.stopListening();
      } catch (error) {
        console.warn('🎤 Error stopping speech recognition:', error);
      }
      setIsRecording(false);
      
      
      // If we have transcript text, let user edit it
      if (transcript.trim()) {
      }
    } else {
      // Start recording with enhanced pause detection
      try {
        // Store current text for appending later
        setVoiceStartText(inputText);
        resetTranscript();
        setIsRecording(true);
        
        // Use mobile-aware configuration
        try {
          await SpeechRecognition.startListening({ 
            continuous: voiceConfig.continuous,
            language: voiceConfig.language,
            interimResults: voiceConfig.interimResults,
            maxAlternatives: voiceConfig.maxAlternatives
          });
        } catch (startError) {
          console.error('🎤 Error starting speech recognition:', startError);
          throw startError;
        }
        
        // Set up fallback timeout (30 seconds)
        const fallbackTimeout = setTimeout(() => {
          try {
            SpeechRecognition.stopListening();
          } catch (error) {
            console.warn('🎤 Error stopping speech recognition in timeout:', error);
          }
          setIsRecording(false);
          setVoiceTimeout(null);
          setPauseTimeout(null);
        }, voiceConfig.timeout);
        
        setVoiceTimeout(fallbackTimeout);
        
        // Set up pause detection timeout (8 seconds of silence)
        const startPauseDetection = () => {
          if (pauseTimeout) {
            clearTimeout(pauseTimeout);
          }
          
          const pauseTimer = setTimeout(() => {
              try {
              SpeechRecognition.stopListening();
            } catch (error) {
              console.warn('🎤 Error stopping speech recognition in pause detection:', error);
            }
            setIsRecording(false);
            setVoiceTimeout(null);
            setPauseTimeout(null);
          }, voiceConfig.pauseDetection);
          
          setPauseTimeout(pauseTimer);
        };
        
        // Start initial pause detection
        startPauseDetection();
        
        setMicPermissionState('granted');
        console.log('🎤 Voice recording started', {
          device: deviceInfo.isMobile ? 'mobile' : 'desktop',
          continuous: voiceConfig.continuous,
          timeout: voiceConfig.timeout
        });
        
      } catch (error) {
        console.error('Failed to start voice recognition:', error);
        const errorMsg = getVoiceErrorMessage(error.message, deviceInfo);
        setVoiceError(errorMsg);
        setIsRecording(false);
        setMicPermissionState('denied');
        
        // Clear timeout if it was set
        if (voiceTimeout) {
          clearTimeout(voiceTimeout);
          setVoiceTimeout(null);
        }
      }
    }
  };

  // 🎤 VOICE INPUT: Get microphone button icon and style based on state (Mobile-aware)
  const getMicrophoneButtonConfig = () => {
    // Base transition classes for smooth state changes
    const baseTransition = 'mic-button-transition transition-all duration-300 ease-in-out';
    
    // iOS fallback - show keyboard icon instead
    if (needsIOSFallback(deviceInfo)) {
      return {
        icon: voiceGuidance.icon,
        className: `${baseTransition} text-blue-500 hover:text-blue-700`,
        title: voiceGuidance.message
      };
    }
    
    if (!browserSupportsSpeechRecognition) {
      return {
        icon: 'MicOff',
        className: `${baseTransition} opacity-50 cursor-not-allowed`,
        title: getVoiceErrorMessage('Not supported', deviceInfo)
      };
    }
    
    if (voiceError) {
      return {
        icon: 'MicOff',
        className: `${baseTransition} text-red-500 hover:text-red-600`,
        title: voiceError
      };
    }
    
    if (isRecording) {
      const timeoutText = deviceInfo.isMobile ? ` (auto-stop in ${Math.round(voiceConfig.timeout / 1000)}s)` : '';
      return {
        icon: 'MicIcon',
        className: `${baseTransition} text-red-500 animate-pulse hover:text-red-600 transform scale-110`,
        title: `${voiceGuidance.buttonText.replace('Start', 'Stop')}${timeoutText}`
      };
    }
    
    if (micPermissionState === 'denied') {
      return {
        icon: 'MicOff',
        className: `${baseTransition} text-orange-500 hover:text-orange-600`,
        title: 'Microphone permission denied. Please enable in browser settings.'
      };
    }
    
    return {
      icon: 'MicIcon',
      className: `${baseTransition} text-gray-500 hover:text-blue-500 hover:scale-105`,
      title: voiceGuidance.message
    };
  };

  const handleFeedbackSubmit = async (feedbackText: string) => {
    try {
      await sendFeedback(user?.name || 'Anonymous', feedbackText);
      setShowFeedbackPopup(false);
    } catch (error) {
      console.error("Failed to send feedback from chat interface", error);
    }
  };

  // Handle customer loading from CustomersTab
  const handleLoadCustomer = async (customer: any, historicalMessages: Message[]) => {
    if (!user?.id || !customer.customer_name) {
      console.error('Cannot load customer: missing user id or customer name');
      return;
    }

    setIsLoadingCustomer(true);
    setLoadingCustomerName(customer.customer_name);

    try {
      // Load customer context using the service
      const response = await customerContextService.loadCustomerContext(
        customer.customer_name,
        user.id,
        customer.session_id
      );

      if (response.success) {
        // Clear existing messages and add customer context
        const customerInfoId = uuidv4();
        const historySummaryId = uuidv4();
        
        const contextMessages = customerContextService.prepareMessagesForChat(
          response.customerDetails,
          response.conversationHistory,
          customerInfoId,
          historySummaryId
        );

        // Detect customer switching and reset chat for existing customer loads
        const isCustomerSwitch = previousCustomerName && previousCustomerName !== customer.customer_name;
        const isNewCustomerLoad = !previousCustomerName;

        if (isCustomerSwitch || isNewCustomerLoad) {
          setMessages([]); // Reset chat first
        }

        // Update previous customer tracking
        setPreviousCustomerName(customer.customer_name);

        // Then load customer context and history
        setMessages(contextMessages);
        
        // Update session data
        if (response.customerDetails) {
          setCurrentCustomer(response.customerDetails.name);
          setSessionData(prev => ({
            ...prev,
            sessionId: customer.session_id || uuidv4(),
            customerName: response.customerDetails.name,
            customerContext: {
              address: response.customerDetails.address,
              email: response.customerDetails.email,
              phone: response.customerDetails.phone,
            }
          }));

          // Update customer details for header display
          setCustomerDetails({
            name: response.customerDetails.name,
            address: response.customerDetails.address || '',
            email: response.customerDetails.email || '',
            phone: response.customerDetails.phone || ''
          });

          // Close customer dropdown and form
          setShowCustomerDropdown(false);
          setShowCustomerForm(false);
        }

      } else {
        console.error('Failed to load customer context:', response.error);
        // Could show error message to user here
      }

    } catch (error) {
      console.error('Error loading customer context:', error);
      // Could show error message to user here
    } finally {
      setIsLoadingCustomer(false);
      setLoadingCustomerName(null);
    }
  };

  // 🏢 PHASE 5: Load recent customer sessions using existing infrastructure
  const loadRecentCustomers = async () => {
    // Enhanced authentication and state guards
    if (!user?.id || isLoadingCustomers) {
      return;
    }

    setIsLoadingCustomers(true);

    try {
      // Use existing chat-messages endpoint with customer lookup flag
      const response = await fetch(
        `/.netlify/functions/chat-messages?recent_customers=true&user_id=${user.id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Cache-Control': 'no-cache',
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Customer lookup failed: ${response.status}`);
      }
      
      const customers = await response.json();
      
      setRecentCustomerSessions(customers);
      
    } catch (error) {
      console.error('❌ Failed to load recent customers:', error);
      setRecentCustomerSessions([]);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  // 🏢 PHASE 5: Handle customer selection from recent customers
  const handleCustomerSelect = async (customer: any) => {
    
    setCustomerDetails({
      name: customer.customerName || '',
      address: customer.customerAddress || '',
      email: customer.customerEmail || '',
      phone: customer.customerPhone || ''
    });
    
    setShowCustomerForm(false); // Hide form when selecting existing customer
    setShowCustomerDropdown(false);
    
    // 🔄 PHASE 2D: Load conversation context with preloading animation
    if (customer.sessionId) {
      await preloadCustomerContext(customer.customerName, customer.sessionId);
    }
  };

  // 🔄 PHASE 2D: Preload customer conversation context with smooth UX
  const preloadCustomerContext = async (customerName: string, sessionId?: string) => {
    if (!user?.id) return;

    try {
      setIsPreloadingContext(true);
      setPreloadProgress(0);
      setPreloadMessage('Remembering previous conversation...');

      // Simulate smooth progress for better UX
      const progressInterval = setInterval(() => {
        setPreloadProgress(prev => {
          if (prev < 80) return prev + 5;
          return prev;
        });
      }, 50);


      // Build query URL
      const queryParams = new URLSearchParams({
        user_id: user.id
      });
      if (sessionId) {
        queryParams.set('session_id', sessionId);
      }

      const response = await fetch(
        `/.netlify/functions/customer-context/${encodeURIComponent(customerName)}?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );

      clearInterval(progressInterval);
      setPreloadProgress(90);
      setPreloadMessage('Loading conversation history...');

      if (!response.ok) {
        throw new Error(`Context preload failed: ${response.status}`);
      }

      const contextData = await response.json();
      console.log('🔄 Context data loaded:', {
        recordsFound: contextData.contextMetadata?.recordsFound,
        customerName: contextData.customerName
      });

      setPreloadProgress(100);
      setPreloadMessage('Ready to continue conversation');

      // Populate conversation history with error boundaries
      if (contextData.conversationHistory && Array.isArray(contextData.conversationHistory) && contextData.conversationHistory.length > 0) {
        // Add previous messages to current chat (with visual indicators)
        const previousMessages = contextData.conversationHistory
          .filter((msg: any) => msg && typeof msg === 'object') // Filter out null/invalid messages
          .map((msg: any) => ({
            id: msg.id || `preload_${Date.now()}_${Math.random()}`,
            text: msg.text || '',
            sender: msg.sender || 'user',
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
            sessionId: msg.sessionId || sessionId,
            isPreviousSession: true,
            interactionNumber: msg.interactionNumber || 0
          }));

        // Save current scroll position before adding messages
        if (messagesContainerRef.current) {
          savedScrollPosition.current = messagesContainerRef.current.scrollTop;
        }

        setMessages((prev) => [
          ...previousMessages,
          ...prev.filter(m => !m.isPreviousSession) // Keep current session messages
        ]);

        // Restore scroll position after a brief delay to allow DOM updates
        setTimeout(() => {
          if (messagesContainerRef.current && savedScrollPosition.current > 0) {
            messagesContainerRef.current.scrollTop = savedScrollPosition.current;
          }
        }, 100);

      }

      // Update customer details if available
      if (contextData.customerDetails) {
        setCustomerDetails({
          name: contextData.customerDetails.name || '',
          address: contextData.customerDetails.address || '',
          email: contextData.customerDetails.email || '',
          phone: contextData.customerDetails.phone || ''
        });
      }

      // Smooth completion
      setTimeout(() => {
        setIsPreloadingContext(false);
        setPreloadProgress(0);
        setPreloadMessage('');
      }, 500);

    } catch (error) {
      clearInterval(progressInterval);
      console.error('❌ Failed to preload customer context:', error);
      setPreloadMessage('Failed to load conversation history');
      
      setTimeout(() => {
        setIsPreloadingContext(false);
        setPreloadProgress(0);
        setPreloadMessage('');
      }, 2000);
    }
  };

  // 📊 PHASE 2A: Save customer details and update session records
  const saveCustomerDetails = async () => {
    if (!customerDetails?.name) {
      console.warn('⚠️ Cannot save customer without name');
      return;
    }

    try {
      
      // Update all VC Usage records for this session
      const response = await fetch('/.netlify/functions/customer-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          userId: user.id,
          customerName: customerDetails.name,
          customerAddress: customerDetails.address,
          customerEmail: customerDetails.email,
          customerPhone: customerDetails.phone
        })
      });

      if (!response.ok) {
        throw new Error(`Customer update failed: ${response.status}`);
      }

      const result = await response.json();
      
      setShowCustomerDropdown(false);
      
    } catch (error) {
      console.error('❌ Failed to save customer details:', error);
      // Don't throw - allow UI to close, but log the error
    }
  };

  // 🔧 ADMIN DIAGNOSTICS: Run comprehensive backend tests
  const runSystemDiagnostics = async () => {
    if (!isAdmin) return;
    
    setIsRunningDiagnostics(true);
    console.group('🔬 ADMIN DIAGNOSTICS: Starting system health check');
    
    try {
      const results = await runBackendDiagnostics();
      setDiagnosticResults(results);
      logDiagnosticResults(results);
      
      console.groupEnd();
    } catch (error) {
      console.error('❌ DIAGNOSTICS FAILED:', error);
      console.groupEnd();
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  // ORIGINAL: Exact same return structure - preserving 100% of working layout
  return (
    <div className="h-screen flex flex-col overflow-hidden transition-colors duration-500" style={{ backgroundColor: visualConfig.colors.background }}>
      <HeaderMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onNavigate={(tab) => {
          if (onNavigate) onNavigate(tab);
          setIsMenuOpen(false);
        }}
        onChatClick={onBackToDashboard || (() => {})}
        onCompanySettingsClick={() => {
          if (onCompanySettingsClick) onCompanySettingsClick();
          setIsMenuOpen(false);
        }}
        onServicesClick={() => {
          if (onServicesClick) onServicesClick();
          setIsMenuOpen(false);
        }}
        onMaterialsClick={() => {
          if (onMaterialsClick) onMaterialsClick();
          setIsMenuOpen(false);
        }}
        onQuickCalculatorClick={() => {
          if (onQuickCalculatorClick) onQuickCalculatorClick();
          setIsMenuOpen(false);
        }}
        onAvatarClick={() => setShowAvatarPopup(true)}
        onNotesClick={() => setShowNotesPopup(true)}
        onFeedbackClick={() => setShowFeedbackPopup(true)}
        onSignOut={handleLogout}
        visualConfig={visualConfig}
        theme={theme}
        user={user}
      />
      {/* Main header */}
      <header className="flex-shrink-0 border-b transition-colors duration-300" style={{ borderBottomColor: theme === 'light' ? '#e5e7eb' : '#374151', backgroundColor: visualConfig.colors.surface, paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between w-full">
            {/* Left side: Hamburger, Logo */}
            <div className="flex items-center space-x-3 flex-1">
              <button
                onClick={() => setIsMenuOpen(true)}
                className="h-12 w-12 flex items-center justify-center rounded-md transition-colors active:scale-95"
                style={{ color: visualConfig.colors.text.secondary }}
                aria-label="Open menu"
              >
                <Icons.Menu className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {coreConfig.logoUrl ? (
                    <img src={coreConfig.logoUrl} alt={`${coreConfig.companyName} Logo`} className='h-9 w-auto' />
                  ) : (
                    <DynamicIcon
                      name={coreConfig.headerIcon}
                      className="h-8 w-8"
                      style={{ color: visualConfig.colors.text.onPrimary }}
                    />
                  )}
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold" style={{ color: visualConfig.colors.text.primary }}>
                    {coreConfig.companyName}
                  </h1>
                </div>
              </div>

              {/* Back to Dashboard button - only show when callback provided */}
              {onBackToDashboard && (
                <button
                  onClick={onBackToDashboard}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: visualConfig.colors.surface,
                    color: visualConfig.colors.primary,
                    border: `1px solid ${visualConfig.colors.primary}30`
                  }}
                  aria-label="Back to Dashboard"
                >
                  <Icons.LayoutDashboard className="h-4 w-4" />
                  <span className="hidden md:inline text-sm font-medium">Back to Dashboard</span>
                </button>
              )}
            </div>

            {/* 🏢 PHASE 3: Center - Customer Details Button */}
            {CUSTOMER_DETAILS_ENABLED && (
              <div className="flex-1 flex justify-center relative">
                <button
                  onClick={() => {
                    const newState = !showCustomerDropdown;
                    setShowCustomerDropdown(newState);
                    // 🏢 PHASE 5: Load recent customers when dropdown opens (with auth timing protection)
                    if (newState && recentCustomerSessions.length === 0 && user?.id) {
                      loadRecentCustomers();
                    }
                  }}
                  className="flex items-center gap-2 px-4 h-12 min-h-[48px] rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.97]"
                  style={{
                    backgroundColor: customerDetails ? visualConfig.colors.secondary : visualConfig.colors.surface,
                    color: customerDetails ? visualConfig.colors.text.onPrimary : visualConfig.colors.text.primary,
                    border: `1px solid ${visualConfig.colors.secondary}`,
                    '--tw-ring-color': visualConfig.colors.secondary,
                  }}
                  title={customerDetails ? `Customer: ${customerDetails.name}` : "Add Customer Details"}
                >
                  <DynamicIcon name="User" className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm font-medium">
                    {customerDetails ? `Customer: ${customerDetails.name}` : "Add Customer Details"}
                  </span>
                  
                  {/* Quick Clear Customer Button - Only show when customer selected */}
                  {customerDetails && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent dropdown from opening
                        setCustomerDetails(null);
                        setShowCustomerForm(false);
                        setCurrentCustomer(null);
                        setSessionData(prev => ({
                          ...prev,
                          customerName: null,
                          customerContext: null
                        }));
                        setPreviousCustomerName(null); // Clear tracking
                        handleRefreshChat(); // Reset chat when ejecting customer
                      }}
                      className="ml-2 p-1 rounded-full transition-colors hover:bg-red-100"
                      style={{ color: '#EF4444' }}
                      title="Clear customer"
                    >
                      <DynamicIcon name="X" className="h-3 w-3" />
                    </button>
                  )}
                  
                  <DynamicIcon 
                    name={showCustomerDropdown ? "ChevronUp" : "ChevronDown"} 
                    className="h-4 w-4" 
                  />
                </button>

                {/* Customer Dropdown */}
                {showCustomerDropdown && (
                  <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 z-50">
                    <div 
                      className="w-96 rounded-lg shadow-xl border"
                      style={{ 
                        backgroundColor: visualConfig.colors.surface,
                        borderColor: visualConfig.colors.secondary
                      }}
                    >
                      {/* Top Action Section */}
                      <div className="p-4 border-b" style={{ borderColor: visualConfig.colors.secondary }}>
                        {!customerDetails ? (
                          // Show "Add New Customer" when no customer selected
                          <button
                            onClick={() => {
                              setShowCustomerForm(true);
                              setCustomerDetails({ name: '', address: '', email: '', phone: '' });
                            }}
                            className="w-full p-3 rounded-lg border-2 border-dashed transition-colors hover:bg-opacity-50"
                            style={{ 
                              borderColor: visualConfig.colors.primary,
                              backgroundColor: 'transparent',
                              color: visualConfig.colors.text.primary
                            }}
                          >
                            <div className="flex items-center justify-center space-x-2">
                              <DynamicIcon name="Plus" className="h-5 w-5" style={{ color: visualConfig.colors.primary }} />
                              <span className="font-medium">Add New Customer</span>
                            </div>
                          </button>
                        ) : (
                          // Show both "Clear Customer" and "Edit Current Customer" when customer loaded
                          <div className="space-y-3">
                            {/* Clear Customer & Start Fresh */}
                            <button
                              onClick={() => {
                                // Clear customer and start completely fresh
                                setCustomerDetails(null);
                                setShowCustomerForm(false);
                                setShowCustomerDropdown(false);
                                setCurrentCustomer(null);
                                setSessionData(prev => ({
                                  ...prev,
                                  customerName: null,
                                  customerContext: null
                                }));
                                setPreviousCustomerName(null); // Clear tracking
                                // Also refresh the chat to start completely fresh
                                handleRefreshChat();
                              }}
                              className="w-full p-3 rounded-lg border-2 border-dashed transition-colors hover:bg-opacity-10"
                              style={{ 
                                borderColor: '#EF4444',
                                backgroundColor: 'transparent',
                                color: '#EF4444'
                              }}
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <DynamicIcon name="UserX" className="h-5 w-5" />
                                <span className="font-medium">Clear Customer & Start Fresh</span>
                              </div>
                            </button>

                            {/* Edit Current Customer */}
                            <button
                              onClick={() => {
                                setShowCustomerForm(!showCustomerForm);
                              }}
                              className="w-full p-3 rounded-lg border transition-colors hover:shadow-sm"
                              style={{ 
                                borderColor: visualConfig.colors.secondary,
                                backgroundColor: visualConfig.colors.elevated,
                                color: visualConfig.colors.text.primary
                              }}
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <DynamicIcon name="Edit" className="h-5 w-5" style={{ color: visualConfig.colors.primary }} />
                                <span className="font-medium">Edit Current Customer: {customerDetails.name}</span>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Section Separator & Recent Customers */}
                      {recentCustomerSessions.length > 0 && (
                        <>
                          <div className="px-4 py-2" style={{ backgroundColor: visualConfig.colors.background }}>
                            <div className="h-px" style={{ backgroundColor: visualConfig.colors.secondary }}></div>
                          </div>
                          
                          <div className="p-4 border-b" style={{ borderColor: visualConfig.colors.secondary }}>
                            <h4 className="text-sm font-semibold mb-3 flex items-center space-x-2" style={{ color: visualConfig.colors.text.primary }}>
                              <DynamicIcon name="Clock" className="h-4 w-4" />
                              <span>Recent Customers</span>
                            </h4>
                            <div className="space-y-2">
                              {recentCustomerSessions.slice(0, 2).map((customer, index) => (
                                <button
                                  key={customer.id || index}
                                  onClick={() => handleCustomerSelect(customer)}
                                  className="w-full text-left p-3 rounded-lg border hover:shadow-sm transition-all duration-200"
                                  style={{ 
                                    backgroundColor: visualConfig.colors.elevated,
                                    borderColor: visualConfig.colors.secondary
                                  }}
                                >
                                  <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
                                      {customer.customerName}
                                    </div>
                                    {customer.customerEmail && (
                                      <div className="text-xs mt-1 flex items-center space-x-1" style={{ color: visualConfig.colors.text.secondary }}>
                                        <DynamicIcon name="Mail" className="h-3 w-3" />
                                        <span>{customer.customerEmail}</span>
                                      </div>
                                    )}
                                    {customer.summary && (
                                      <div className="text-xs mt-1" style={{ color: visualConfig.colors.text.secondary }}>
                                        {customer.summary.substring(0, 60)}...
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                                    {new Date(customer.lastInteraction).toLocaleDateString()}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                        </>
                      )}

                      {/* Loading State */}
                      {isLoadingCustomers && (
                        <div className="p-4 border-b" style={{ borderColor: visualConfig.colors.secondary }}>
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2" 
                                 style={{ borderColor: visualConfig.colors.primary }}></div>
                            <span className="ml-2 text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                              Loading recent customers...
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Customer Form - Only show when form is active */}
                      {showCustomerForm && (
                        <div className="p-4">
                        <h3 className="text-lg font-semibold mb-4" style={{ color: visualConfig.colors.text.primary }}>
                          {recentCustomerSessions.length > 0 ? 'New Customer Details' : 'Customer Details'}
                        </h3>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: visualConfig.colors.text.secondary }}>
                              Name *
                            </label>
                            <input
                              type="text"
                              value={customerDetails?.name || ''}
                              onChange={(e) => setCustomerDetails(prev => ({ ...prev, name: e.target.value, address: prev?.address || '', email: prev?.email || '', phone: prev?.phone || '' }))}
                              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-opacity-50"
                              style={{
                                backgroundColor: visualConfig.colors.background,
                                borderColor: visualConfig.colors.secondary,
                                color: visualConfig.colors.text.primary,
                                '--tw-ring-color': visualConfig.colors.primary
                              }}
                              placeholder="Customer name"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: visualConfig.colors.text.secondary }}>
                              Address
                            </label>
                            <input
                              type="text"
                              value={customerDetails?.address || ''}
                              onChange={(e) => setCustomerDetails(prev => ({ ...prev, address: e.target.value, name: prev?.name || '', email: prev?.email || '', phone: prev?.phone || '' }))}
                              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-opacity-50"
                              style={{
                                backgroundColor: visualConfig.colors.background,
                                borderColor: visualConfig.colors.secondary,
                                color: visualConfig.colors.text.primary,
                                '--tw-ring-color': visualConfig.colors.primary
                              }}
                              placeholder="Customer address"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: visualConfig.colors.text.secondary }}>
                              Email
                            </label>
                            <input
                              type="email"
                              value={customerDetails?.email || ''}
                              onChange={(e) => setCustomerDetails(prev => ({ ...prev, email: e.target.value, name: prev?.name || '', address: prev?.address || '', phone: prev?.phone || '' }))}
                              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-opacity-50"
                              style={{
                                backgroundColor: visualConfig.colors.background,
                                borderColor: visualConfig.colors.secondary,
                                color: visualConfig.colors.text.primary,
                                '--tw-ring-color': visualConfig.colors.primary
                              }}
                              placeholder="customer@email.com"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: visualConfig.colors.text.secondary }}>
                              Phone
                            </label>
                            <input
                              type="tel"
                              value={customerDetails?.phone || ''}
                              onChange={(e) => setCustomerDetails(prev => ({ ...prev, phone: e.target.value, name: prev?.name || '', address: prev?.address || '', email: prev?.email || '' }))}
                              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-opacity-50"
                              style={{
                                backgroundColor: visualConfig.colors.background,
                                borderColor: visualConfig.colors.secondary,
                                color: visualConfig.colors.text.primary,
                                '--tw-ring-color': visualConfig.colors.primary
                              }}
                              placeholder="(555) 123-4567"
                            />
                          </div>
                        </div>
                        
                        <div className="flex space-x-3 mt-4">
                          <button
                            onClick={() => {
                              setShowCustomerForm(false);
                              setShowCustomerDropdown(false);
                            }}
                            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
                            style={{
                              borderColor: visualConfig.colors.secondary,
                              color: visualConfig.colors.text.secondary,
                              backgroundColor: 'transparent'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveCustomerDetails}
                            disabled={!customerDetails?.name}
                            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors text-white disabled:opacity-50"
                            style={{ backgroundColor: visualConfig.colors.primary }}
                          >
                            Save Customer
                          </button>
                        </div>
                      </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Right side: Controls */}
            <div className="flex items-center space-x-2 flex-1 justify-end">
              {/* User info in header - Desktop only */}
              <div className="hidden md:flex items-center space-x-3 mr-4 px-3 py-2 rounded-lg" style={{ backgroundColor: visualConfig.colors.surface }}>
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-full"
                  style={{
                    backgroundColor: visualConfig.colors.primary,
                    color: visualConfig.colors.text.onPrimary,
                  }}
                >
                  <DynamicIcon name={user?.user_icon || 'User'} className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: visualConfig.colors.text.primary }}>
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                    {user?.title || 'Technician'}
                  </p>
                </div>
              </div>

              <button
                ref={refreshButtonRef}
                onClick={handleRefreshChat}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  backgroundColor: visualConfig.colors.primary,
                  color: visualConfig.colors.text.onPrimary,
                  '--tw-ring-color': visualConfig.colors.primary,
                }}
                title={customerDetails ? `New chat with ${customerDetails.name}` : "Start a new chat session"}
              >
                <DynamicIcon name="RotateCcw" className="h-4 w-4" />
                <span className="hidden sm:inline text-sm font-medium">
                  {customerDetails ? "New Chat" : "New Chat"}
                </span>
                {customerDetails && (
                  <span className="hidden lg:inline text-xs opacity-75 ml-1">
                    (Keep Customer)
                  </span>
                )}
              </button>

              {isAdmin && (
                <button
                  onClick={() => setShowPerformancePanel(!showPerformancePanel)}
                  className="p-2 rounded-lg transition-all duration-200 hover:shadow-sm"
                  style={{
                    backgroundColor: showPerformancePanel ? visualConfig.colors.primary : 'transparent',
                    color: showPerformancePanel ? visualConfig.colors.text.onPrimary : visualConfig.colors.text.secondary
                  }}
                  aria-label="Toggle performance panel"
                  title="Toggle performance monitoring"
                >
                  <Icons.Activity className="h-5 w-5" />
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => setShowDiagnosticPanel(!showDiagnosticPanel)}
                  className="p-2 rounded-lg transition-all duration-200 hover:shadow-sm"
                  style={{
                    backgroundColor: showDiagnosticPanel ? visualConfig.colors.primary : 'transparent',
                    color: showDiagnosticPanel ? visualConfig.colors.text.onPrimary : visualConfig.colors.text.secondary
                  }}
                  aria-label="Toggle diagnostic panel"
                  title="System diagnostics and backend health"
                >
                  <Icons.Stethoscope className="h-5 w-5" />
                </button>
              )}

              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg transition-all duration-200 hover:shadow-sm"
                style={{ color: visualConfig.colors.text.secondary }}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Icons.Sun className="h-5 w-5" /> : <Icons.Moon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col overflow-hidden p-4">
        <div
          className="flex-1 rounded-2xl shadow-lg flex flex-col overflow-hidden min-h-0 transition-all duration-300"
          style={{
            backgroundColor: visualConfig.colors.surface,
            borderRadius: visualConfig.patterns.componentShape === 'organic' ? '1.5rem' : '0.75rem'
          }}
        >
          {/* 🔄 DUAL TESTING: Enhanced Messages Area with dual response support */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 relative">
            {/* Customer Loading Screen - Fixed positioning to not block scroll */}
            {isLoadingCustomer && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
                <div className="bg-white p-4 rounded-lg shadow-xl flex items-center space-x-3 pointer-events-auto"
                     style={{ backgroundColor: visualConfig.colors.surface }}>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2"
                       style={{ borderColor: visualConfig.colors.primary }}></div>
                  <div className="text-sm font-medium" style={{ color: visualConfig.colors.text.primary }}>
                    {loadingCustomerName ? `Loading ${loadingCustomerName}...` : 'Loading Customer...'}
                  </div>
                </div>
              </div>
            )}

            {groupMessagesForDualDisplay(messages).map((messageGroup, index) => (
              <div
                key={
                  messageGroup.message?.id || 
                  `dual-${messageGroup.dual?.make?.id || 'waiting'}-${messageGroup.dual?.native?.id || 'waiting'}` ||
                  `group-${index}`
                }
                className={`
                  ${isRefreshing ? 'animate-fade-up-out' : ''}
                  ${!isRefreshing && index === messages.length - 1 ? 'animate-fade-up-in-delay' : ''}
                `}
              >
                {/* ✅ SHARED MESSAGES: Welcome + User inputs (no source styling) */}
                {messageGroup.type === 'shared' && messageGroup.message ? (
                  <ThemeAwareMessageBubble
                    message={messageGroup.message}
                    visualConfig={visualConfig}
                    theme={theme}
                    removeSourceStyling={true}
                  />
                ) : messageGroup.type === 'dual' && messageGroup.dual && DUAL_TESTING_ENABLED ? (
                  /* ✅ DUAL COMPARISON: Side-by-side AI responses with performance metrics */
                  <DualResponseDisplay
                    makeMsg={messageGroup.dual.make}
                    nativeMsg={messageGroup.dual.native}
                    waitingFor={messageGroup.dual.waitingFor}
                    visualConfig={visualConfig}
                    theme={theme}
                  />
                ) : messageGroup.type === 'single' && messageGroup.message && DUAL_TESTING_ENABLED ? (
                  /* ✅ ORPHANED RESPONSE: Single AI response with context (only in dual testing mode) */
                  <div className="space-y-2">
                    <div className="flex justify-center">
                      <div 
                        className="text-xs px-3 py-1 rounded-full"
                        style={{
                          backgroundColor: visualConfig.colors.primary + '20',
                          color: visualConfig.colors.primary
                        }}
                      >
                        {messageGroup.message.source === 'native_pricing_agent' 
                          ? '⚡ Native Only - Make.com Unavailable' 
                          : '🔗 Make.com Only - Native Unavailable'}
                      </div>
                    </div>
                    
                    <ThemeAwareMessageBubble
                      message={messageGroup.message}
                      visualConfig={visualConfig}
                      theme={theme}
                    />
                  </div>
                ) : null}
              </div>
            ))}

            {/* ORIGINAL: Typing Indicator - same structure */}
            {isLoading && (
              <div className="flex items-start gap-3 justify-start animate-loading-entry">
                <ThemeAwareAvatar sender="ai" visualConfig={visualConfig} />
                <div
                  className="px-5 py-3 rounded-2xl shadow-md flex items-center gap-3 transition-colors duration-300"
                  style={{ backgroundColor: visualConfig.colors.elevated }}
                >
                  <TypingIndicator theme={theme} />
                  <p
                    className="text-sm"
                    style={{ color: visualConfig.colors.text.secondary }}
                  >
                    {terminologyConfig.statusMessages.thinking}
                  </p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area with Notes Button */}
          <div
            className="border-t transition-colors duration-300 relative"
            style={{
              backgroundColor: visualConfig.colors.surface,
              borderTopColor: theme === 'light' ? '#e5e7eb' : '#374151'
            }}
          >
            <div className="p-3">
              <div className="flex items-center space-x-4 max-w-4xl mx-auto">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={terminologyConfig.placeholderExamples}
                    className="w-full px-3 py-2 pr-12 min-h-[48px] resize-none transition-all duration-300 focus:ring-2 focus:ring-opacity-50"
                    style={{
                      backgroundColor: visualConfig.colors.background,
                      color: visualConfig.colors.text.primary,
                      borderColor: visualConfig.colors.secondary,
                      '--tw-ring-color': visualConfig.colors.primary,
                      borderRadius: visualConfig.patterns.componentShape === 'organic' ? '1.25rem' : '0.75rem'
                    }}
                    rows={1}
                    disabled={isLoading}
                  />
                  
                  {/* 🎤 VOICE INPUT: Microphone button - TEMPORARILY HIDDEN */}
                  {false && (
                    <button
                      onClick={handleVoiceToggle}
                      disabled={isLoading || !browserSupportsSpeechRecognition}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-all duration-200 ${getMicrophoneButtonConfig().className} ${isRecording ? 'animate-recording-glow' : ''}`}
                      title={getMicrophoneButtonConfig().title}
                      aria-label={isRecording ? 'Stop voice recording' : 'Start voice recording'}
                    >
                      <DynamicIcon 
                        name={getMicrophoneButtonConfig().icon as keyof typeof Icons} 
                        className={`h-4 w-4 ${isRecording ? 'animate-voice-pulse' : ''}`}
                      />
                    </button>
                  )}
                  
                  {/* 🎤 VOICE INPUT: Recording indicator - TEMPORARILY HIDDEN */}
                  {false && isRecording && (
                    <div className="absolute -top-8 right-0 flex items-center space-x-2 px-2 py-1 bg-red-500 text-white text-xs rounded-md animate-fade-in">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span>Recording...</span>
                    </div>
                  )}
                  
                  {/* 🎤 VOICE INPUT: Error message - TEMPORARILY HIDDEN */}
                  {false && voiceError && (
                    <div className="absolute -top-8 right-0 px-2 py-1 bg-red-500 text-white text-xs rounded-md max-w-xs">
                      {voiceError}
                    </div>
                  )}
                </div>
                <button
                  ref={sendButtonRef}
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputText.trim()}
                  className="px-5 h-12 min-h-[48px] text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg active:scale-[0.97]"
                  style={{
                   backgroundColor: visualConfig.colors.primary,
                    color: visualConfig.colors.text.onPrimary,
                    borderRadius: visualConfig.patterns.componentShape === 'organic' ? '1.25rem' : '0.75rem'
                  }}
                >
                  <DynamicIcon name="Send" className="h-5 w-5" />
                  <span className="hidden sm:inline font-semibold">
                    {terminologyConfig.buttonTexts.send}
                  </span>
                </button>
              </div>
            </div>
  
            {/* Notes Button - Desktop only (hidden on mobile) */}
            <div className="absolute bottom-3 left-3 hidden md:block">
              <button
                onClick={() => setShowNotesPopup(true)}
                  className="flex items-center gap-2 px-3 h-12 min-h-[48px] transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95"
                  style={{
                  backgroundColor: visualConfig.colors.secondary,
                  color: visualConfig.colors.text.onPrimary,
                    '--tw-ring-color': visualConfig.colors.secondary,
                  borderRadius: visualConfig.patterns.componentShape === 'organic' ? '1rem' : '0.5rem'
                  }}
                title="View notes from our team"
              >
                <DynamicIcon name="StickyNote" className="h-4 w-4" />
              <span className="hidden lg:inline text-sm font-medium">Notes</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Popups and Modals */}
      <NotesPopup
        isOpen={showNotesPopup}
        onClose={() => setShowNotesPopup(false)}
        isAdmin={isAdmin}
        userName={user?.name || 'Anonymous'}
      />

      {/* Feedback Button - Desktop only */}
      <div className="hidden">
        <button
          onClick={() => setShowFeedbackPopup(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{
            backgroundColor: visualConfig.colors.primary,
            color: visualConfig.colors.text.onPrimary,
            '--tw-ring-color': visualConfig.colors.primary,
          }}
          title="Send feedback"
        >
          <DynamicIcon name="MessageSquareQuote" className="h-5 w-5" />
          <span className="font-medium">Send Feedback</span>
        </button>
      </div>

      {/* Logout Button - Desktop only */}
      <div className="hidden">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{
            backgroundColor: '#ef4444',
            color: '#ffffff',
            '--tw-ring-color': '#ef4444',
          }}
          title="Logout"
        >
          <DynamicIcon name="LogOut" className="h-5 w-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>

      {/* Feedback Popup */}
      <FeedbackPopup
        isOpen={showFeedbackPopup}
        onClose={() => setShowFeedbackPopup(false)}
        onSubmit={handleFeedbackSubmit}
        userName={user?.name || 'Anonymous'}
      />

      {/* iOS Voice Guidance Modal - TEMPORARILY HIDDEN */}
      {false && showIOSGuidance && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in">
          <div
            className="rounded-xl p-6 max-w-sm mx-4 shadow-2xl animate-scale-in"
            style={{ backgroundColor: visualConfig.colors.surface }}
          >
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4"
                   style={{ backgroundColor: visualConfig.colors.primary + '20' }}>
                <DynamicIcon 
                  name={voiceGuidance.icon as keyof typeof Icons}
                  className="h-6 w-6"
                  style={{ color: visualConfig.colors.primary }}
                />
              </div>
              
              <h3 className="text-lg font-medium mb-2" 
                  style={{ color: visualConfig.colors.text.primary }}>
                {voiceGuidance.title}
              </h3>
              
              <p className="text-sm mb-6"
                 style={{ color: visualConfig.colors.text.secondary }}>
                {voiceGuidance.message}
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowIOSGuidance(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
                  style={{
                    borderColor: visualConfig.colors.secondary,
                    color: visualConfig.colors.text.secondary,
                    backgroundColor: 'transparent'
                  }}
                >
                  Got it
                </button>
                <button
                  onClick={() => {
                    setShowIOSGuidance(false);
                    if (inputRef.current) {
                      inputRef.current.focus();
                    }
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors text-white"
                  style={{ backgroundColor: visualConfig.colors.primary }}
                >
                  {voiceGuidance.buttonText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in">
          <div
            className="rounded-xl p-6 max-w-sm mx-4 shadow-2xl animate-scale-in"
            style={{ backgroundColor: visualConfig.colors.surface }}
          >
            <div className="text-center">
              <Icons.AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2" style={{ color: visualConfig.colors.text.primary }}>
                Confirm Logout
              </h3>
              <p className="mb-6" style={{ color: visualConfig.colors.text.secondary }}>
                Are you sure you want to logout?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-2 px-4 rounded-lg transition-colors"
                  style={{
                    backgroundColor: theme === 'light' ? '#e5e7eb' : '#374151',
                    color: visualConfig.colors.text.primary
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🏢 ENTERPRISE: Performance metrics (dev only, non-intrusive) */}
      {isAdmin && showPerformancePanel && (
        <div className="fixed bottom-20 right-4 bg-black bg-opacity-80 text-white text-xs p-3 rounded max-w-xs">
          <div className="font-semibold mb-2">🏢 PERFORMANCE</div>
          {DUAL_TESTING_ENABLED ? (
            <>
              <div className="text-blue-300">🔄 DUAL TESTING MODE</div>
              {performanceMetrics.makeLatency && (
                <div>Make.com: {performanceMetrics.makeLatency}ms</div>
              )}
              {performanceMetrics.nativeLatency && (
                <div className="text-green-300">Native: {performanceMetrics.nativeLatency}ms</div>
              )}
              {performanceMetrics.makeLatency && performanceMetrics.nativeLatency && (
                <div className="text-yellow-300 border-t border-gray-600 pt-1 mt-1">
                  Speedup: {((parseFloat(performanceMetrics.makeLatency) / parseFloat(performanceMetrics.nativeLatency)) || 1).toFixed(1)}x
                </div>
              )}
            </>
          ) : (
            <div>Webhook: {performanceMetrics.webhookLatency}ms</div>
          )}
          {performanceMetrics.totalResponseTime && <div>Total: {performanceMetrics.totalResponseTime}s</div>}
        </div>
      )}

      {/* 🔧 ADMIN DIAGNOSTICS: Backend health panel */}
      {isAdmin && showDiagnosticPanel && (
        <div className="fixed top-20 right-4 bg-black bg-opacity-90 text-white text-xs p-4 rounded-lg shadow-2xl max-w-md z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">🔬 SYSTEM DIAGNOSTICS</h3>
            <button 
              onClick={() => setShowDiagnosticPanel(false)}
              className="text-gray-400 hover:text-white"
            >
              <Icons.X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-2 mb-3">
            <button
              onClick={runSystemDiagnostics}
              disabled={isRunningDiagnostics}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm font-medium transition-colors"
            >
              {isRunningDiagnostics ? (
                <>
                  <Icons.Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Icons.Play className="h-4 w-4 inline mr-2" />
                  Run Backend Tests
                </>
              )}
            </button>
          </div>

          {diagnosticResults && (
            <div className="space-y-2 text-xs">
              <div className="border-t border-gray-600 pt-2">
                <div className="font-semibold mb-1">🌐 Environment Variables</div>
                <div className="text-green-400">✅ Present: {diagnosticResults.environment.present.length}</div>
                {diagnosticResults.environment.missing.length > 0 && (
                  <div className="text-red-400">❌ Missing: {diagnosticResults.environment.missing.length}</div>
                )}
              </div>
              
              <div className="border-t border-gray-600 pt-2">
                <div className="font-semibold mb-1">🗄️ Supabase Database</div>
                <div className={diagnosticResults.supabase.accessible ? 'text-green-400' : 'text-red-400'}>
                  {diagnosticResults.supabase.accessible ? '✅ Connected' : '❌ Failed'}
                </div>
                {diagnosticResults.supabase.error && (
                  <div className="text-yellow-400 text-xs">⚠️ {diagnosticResults.supabase.error}</div>
                )}
              </div>

              <div className="border-t border-gray-600 pt-2">
                <div className="font-semibold mb-1">🔗 Make.com Webhook</div>
                <div className={diagnosticResults.makeWebhook.accessible ? 'text-green-400' : 'text-red-400'}>
                  {diagnosticResults.makeWebhook.accessible ? '✅ Accessible' : '❌ Failed'}
                </div>
                {diagnosticResults.makeWebhook.error && (
                  <div className="text-yellow-400 text-xs">⚠️ {diagnosticResults.makeWebhook.error}</div>
                )}
              </div>

              <div className="border-t border-gray-600 pt-2">
                <div className="font-semibold mb-1">⚡ Netlify Functions</div>
                <div className={diagnosticResults.netlifyFunctions.accessible ? 'text-green-400' : 'text-red-400'}>
                  {diagnosticResults.netlifyFunctions.accessible ? '✅ Working' : '❌ Failed'}
                </div>
                {diagnosticResults.netlifyFunctions.error && (
                  <div className="text-yellow-400 text-xs">⚠️ {diagnosticResults.netlifyFunctions.error}</div>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-gray-600 pt-2 mt-3 text-xs text-gray-400">
            💡 Check browser console for detailed logs
          </div>
        </div>
      )}
      {/* Avatar Selection Popup */}
      <AvatarSelectionPopup
        isOpen={showAvatarPopup}
        onClose={() => setShowAvatarPopup(false)}
      />

      {/* 🔄 PHASE 2D: Conversation Preloading Overlay */}
      {isPreloadingContext && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Dimmed background */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          ></div>
          
          {/* Loading content */}
          <div 
            className="relative bg-white rounded-lg shadow-xl p-8 max-w-md mx-4"
            style={{ 
              backgroundColor: visualConfig.colors.surface,
              color: visualConfig.colors.text.primary 
            }}
          >
            <div className="text-center">
              {/* Main message */}
              <h3 className="text-lg font-semibold mb-4" style={{ color: visualConfig.colors.text.primary }}>
                {preloadMessage}
              </h3>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4" style={{ backgroundColor: visualConfig.colors.background }}>
                <div 
                  className="h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ 
                    width: `${preloadProgress}%`,
                    backgroundColor: visualConfig.colors.primary 
                  }}
                ></div>
              </div>
              
              {/* Progress percentage */}
              <p className="text-sm" style={{ color: visualConfig.colors.text.secondary }}>
                {preloadProgress}% complete
              </p>
              
              {/* Animated icon */}
              <div className="mt-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" 
                     style={{ borderColor: visualConfig.colors.primary }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;