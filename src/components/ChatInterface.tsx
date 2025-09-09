// SURGICAL ChatInterface - Preserves 100% of original + adds minimal enterprise features
// This keeps your exact working layout and only adds performance tracking in background

import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { flushSync } from 'react-dom';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
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
import { MobileHamburgerMenu } from './mobile/MobileHamburgerMenu';
import { NotesPopup } from './ui/NotesPopup';
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

// 🔄 DUAL TESTING: Performance comparison component
const PerformanceComparison = ({ makeTime, nativeTime, visualConfig }: {
  makeTime: number;
  nativeTime: number;
  visualConfig: any;
}) => {
  const speedup = makeTime && nativeTime ? (makeTime / nativeTime).toFixed(1) : null;
  
  return (
    <div className="flex items-center justify-center mt-3">
      <div 
        className="px-4 py-2 rounded-lg text-xs flex items-center gap-4"
        style={{ 
          backgroundColor: visualConfig.colors.surface,
          border: `1px solid ${visualConfig.colors.secondary}`,
          color: visualConfig.colors.text.secondary
        }}
      >
        <span className="text-green-600">🔧 Make.com: {(makeTime / 1000).toFixed(1)}s</span>
        <span className="text-yellow-600">⚡ Native: {(nativeTime / 1000).toFixed(1)}s</span>
        {speedup && <span className="text-blue-600 font-medium">📈 {speedup}x faster</span>}
      </div>
    </div>
  );
};

// 🔄 DUAL TESTING: Component for displaying dual responses side-by-side
const DualResponseDisplay = ({ makeMsg, nativeMsg, visualConfig, theme }: {
  makeMsg: Message;
  nativeMsg: Message;
  visualConfig: any;
  theme: string;
}) => {
  const makeProcessingTime = makeMsg.metadata?.processing_time || 0;
  const nativeProcessingTime = nativeMsg.metadata?.processing_time || 0;
  const speedup = makeProcessingTime > 0 && nativeProcessingTime > 0 
    ? (makeProcessingTime / nativeProcessingTime).toFixed(1)
    : 'N/A';

  return (
    <div className="space-y-3">
      {/* Dual Response Header */}
      <div className="flex items-center justify-center">
        <div 
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{ 
            backgroundColor: visualConfig.colors.primary + '20',
            color: visualConfig.colors.primary
          }}
        >
          🔄 Dual Testing Comparison
        </div>
      </div>
      
      {/* Side-by-Side Responses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Make.com Response */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: visualConfig.colors.text.secondary }}>
              🔗 Make.com Pipeline
            </span>
            <span style={{ color: visualConfig.colors.text.secondary }}>
              {makeProcessingTime > 0 ? `${(makeProcessingTime / 1000).toFixed(1)}s` : 'N/A'}
            </span>
          </div>
          <div
            className="p-4 rounded-lg border border-orange-300"
            style={{ backgroundColor: visualConfig.colors.elevated }}
          >
            <ThemeAwareMessageBubble
              message={makeMsg}
              visualConfig={visualConfig}
              theme={theme}
              compact={true}
            />
          </div>
        </div>

        {/* Native Pipeline Response */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: visualConfig.colors.text.secondary }}>
              ⚡ Native Pipeline
            </span>
            <span className="text-green-500 font-medium">
              {nativeProcessingTime > 0 ? `${(nativeProcessingTime / 1000).toFixed(1)}s` : 'N/A'}
              {speedup !== 'N/A' && ` (${speedup}x faster)`}
            </span>
          </div>
          <div
            className="p-4 rounded-lg border border-green-300"
            style={{ backgroundColor: visualConfig.colors.elevated }}
          >
            <ThemeAwareMessageBubble
              message={nativeMsg}
              visualConfig={visualConfig}
              theme={theme}
              compact={true}
            />
          </div>
        </div>
      </div>

      {/* Metrics Comparison */}
      {(makeMsg.metadata || nativeMsg.metadata) && (
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div 
            className="p-2 rounded"
            style={{ backgroundColor: visualConfig.colors.surface }}
          >
            <div style={{ color: visualConfig.colors.text.secondary }}>Make.com Metrics:</div>
            {makeMsg.metadata?.services_count && (
              <div>Services: {makeMsg.metadata.services_count}</div>
            )}
            {makeMsg.metadata?.total_cost && (
              <div>Cost: ${makeMsg.metadata.total_cost}</div>
            )}
            {makeMsg.metadata?.confidence && (
              <div>Confidence: {(makeMsg.metadata.confidence * 100).toFixed(0)}%</div>
            )}
          </div>
          <div 
            className="p-2 rounded"
            style={{ backgroundColor: visualConfig.colors.surface }}
          >
            <div style={{ color: visualConfig.colors.text.secondary }}>Native Metrics:</div>
            {nativeMsg.metadata?.services_count && (
              <div>Services: {nativeMsg.metadata.services_count}</div>
            )}
            {nativeMsg.metadata?.total_cost && (
              <div>Cost: ${nativeMsg.metadata.total_cost}</div>
            )}
            {nativeMsg.metadata?.confidence && (
              <div>Confidence: {(nativeMsg.metadata.confidence * 100).toFixed(0)}%</div>
            )}
          </div>
        </div>
      )}
      
      {/* 🔄 DUAL TESTING: Enhanced Performance Comparison */}
      {makeProcessingTime > 0 && nativeProcessingTime > 0 && (
        <PerformanceComparison 
          makeTime={makeProcessingTime}
          nativeTime={nativeProcessingTime}
          visualConfig={visualConfig}
        />
      )}
    </div>
  );
};

const ChatInterface = () => {
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
  
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [micPermissionState, setMicPermissionState] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  const generateSessionId = () => {
    if (!user) {
      console.warn("No user context for session generation, using basic session ID");
      return `quote_session_${Date.now()}`;
    }
    
    const userPrefix = user.first_name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const betaId = user.beta_code_id;
    const timestamp = Date.now();
    
    return `quote_session_${userPrefix}_${betaId}_${timestamp}`;
  };
  
  const sessionIdRef = useRef<string>(generateSessionId());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastPollTimeRef = useRef<Date>(new Date());
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const refreshButtonRef = useRef<HTMLButtonElement>(null);

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
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const MAKE_WEBHOOK_URL = coreConfig.makeWebhookUrl;
  const NETLIFY_API_URL = `/.netlify/functions/chat-messages/${sessionIdRef.current}`;
  const NATIVE_PRICING_AGENT_URL = '/.netlify/functions/pricing-agent';
  const DUAL_TESTING_ENABLED = import.meta.env.VITE_ENABLE_DUAL_TESTING === 'true';

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    signOut();
  }

  // 🔧 ENHANCED: Robust webhook handler with validation, timeout, and debug logging
  const sendUserMessageToMake = async (userMessageText: string) => {
    const debugPrefix = `🔗 WEBHOOK [${sessionIdRef.current.slice(-8)}]`;
    
    console.group(`${debugPrefix} Starting message transmission`);
    console.log('📤 Message:', userMessageText.substring(0, 100) + (userMessageText.length > 100 ? '...' : ''));
    
    // STEP 1: Validate webhook URL configuration
    if (!MAKE_WEBHOOK_URL || MAKE_WEBHOOK_URL === 'YOUR_MAKE_WEBHOOK_URL') {
      console.error('❌ STEP 1 FAILED: Make.com webhook URL not configured');
      console.log('🔍 Current value:', MAKE_WEBHOOK_URL || 'undefined');
      console.groupEnd();
      throw new Error("Webhook URL not configured - check environment variables");
    }
    console.log('✅ STEP 1: Webhook URL validated');

    // STEP 2: Validate URL format
    try {
      const webhookUrl = new URL(MAKE_WEBHOOK_URL);
      if (!webhookUrl.hostname.includes('make.com')) {
        console.warn('⚠️ STEP 2: Webhook URL does not appear to be a Make.com URL');
      }
      console.log('✅ STEP 2: URL format valid -', webhookUrl.hostname);
    } catch (urlError) {
      console.error('❌ STEP 2 FAILED: Invalid webhook URL format');
      console.groupEnd();
      throw new Error("Invalid webhook URL format");
    }

    // STEP 3: Validate user authentication
    if (!user) {
      console.error('❌ STEP 3 FAILED: No user data available');
      console.groupEnd();
      throw new Error("User not authenticated");
    }
    console.log('✅ STEP 3: User authenticated -', {
      name: user.first_name,
      techId: user.tech_uuid.slice(-8),
      betaId: user.beta_code_id
    });

    // STEP 4: Prepare payload with validation
    const payload = {
      message: userMessageText,
      timestamp: new Date().toISOString(),
      sessionId: sessionIdRef.current,
      source: 'TradeSphere',
      techId: user.tech_uuid,
      firstName: user.first_name,
      jobTitle: user.job_title,
      betaCodeId: user.beta_code_id
    };
    
    // 🔧 CRITICAL: Validate ALL user context fields are present
    const requiredFields = ['message', 'timestamp', 'sessionId', 'source', 'techId', 'firstName', 'jobTitle', 'betaCodeId'];
    const missingFields = requiredFields.filter(field => !payload[field] || payload[field] === '');
    
    if (missingFields.length > 0) {
      console.error('❌ STEP 4 FAILED: Missing required payload fields -', missingFields);
      console.error('🔍 User object inspection:', {
        userExists: !!user,
        techId: user?.tech_uuid || 'MISSING',
        firstName: user?.first_name || 'MISSING',
        jobTitle: user?.job_title || 'MISSING', 
        betaCodeId: user?.beta_code_id || 'MISSING'
      });
      console.groupEnd();
      throw new Error(`Missing user context fields: ${missingFields.join(', ')}`);
    }

    // Validate payload size (Make.com has limits)
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > 10000) { // 10KB limit as safety measure
      console.warn('⚠️ STEP 4: Large payload detected -', payloadSize, 'bytes');
    }
    
    // ✅ ENHANCED: Log complete payload structure for debugging
    console.log('✅ STEP 4: Complete payload prepared -', {
      size: `${payloadSize} bytes`,
      fieldCount: Object.keys(payload).length,
      fields: Object.keys(payload),
      userContext: {
        techId: payload.techId?.slice(-8) || 'N/A',
        firstName: payload.firstName,
        jobTitle: payload.jobTitle,
        betaCodeId: payload.betaCodeId
      },
      messagePreview: payload.message.substring(0, 50) + (payload.message.length > 50 ? '...' : '')
    });

    // STEP 5: Performance tracking setup
    const startTime = performance.now();
    setProcessingStartTime(Date.now());
    console.log('⏱️ STEP 5: Performance tracking started');

    // STEP 6: Create abort controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('⏰ TIMEOUT: Webhook request exceeded 15 seconds');
      controller.abort();
    }, 15000); // 15 second timeout

    try {
      console.log('🚀 STEP 7: Sending webhook request...');
      
      // 🔧 CRITICAL: Verify JSON serialization before transmission
      let payloadJson;
      try {
        payloadJson = JSON.stringify(payload);
        const parsedBack = JSON.parse(payloadJson);
        
        // Verify all fields survived serialization
        const serializedFields = Object.keys(parsedBack);
        const originalFields = Object.keys(payload);
        
        if (serializedFields.length !== originalFields.length) {
          throw new Error(`Field count mismatch: ${originalFields.length} → ${serializedFields.length}`);
        }
        
        console.log('✅ STEP 7.1: JSON serialization verified -', {
          originalFields: originalFields.length,
          serializedFields: serializedFields.length,
          jsonSize: `${payloadJson.length} characters`
        });
        
      } catch (jsonError) {
        console.error('❌ STEP 7.1 FAILED: JSON serialization error');
        console.error('🔍 Payload object:', payload);
        console.error('🔥 JSON error:', jsonError.message);
        console.groupEnd();
        throw new Error(`Payload serialization failed: ${jsonError.message}`);
      }

      const response = await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payloadJson, // Use pre-verified JSON string
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      // STEP 8: Response validation with detailed logging
      const webhookLatency = performance.now() - startTime;
      console.log('📡 STEP 8: Response received -', {
        status: response.status,
        statusText: response.statusText,
        latency: `${webhookLatency.toFixed(2)}ms`
      });

      // Track performance metrics
      setPerformanceMetrics(prev => ({
        ...prev,
        webhookLatency: webhookLatency.toFixed(2),
        makeLatency: webhookLatency.toFixed(2)
      }));

      // Handle different response scenarios
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error('❌ STEP 8 FAILED: Webhook returned error');
        console.error('📄 Error details:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText.substring(0, 500)
        });
        
        // Provide specific error messages based on status
        let userFriendlyError = 'Failed to send message to AI service';
        if (response.status === 404) {
          userFriendlyError = 'Webhook URL not found - check configuration';
        } else if (response.status === 401 || response.status === 403) {
          userFriendlyError = 'Webhook authentication failed';
        } else if (response.status >= 500) {
          userFriendlyError = 'AI service temporarily unavailable';
        }
        
        console.groupEnd();
        throw new Error(userFriendlyError);
      }
      
      // STEP 9: Success logging with comprehensive details
      console.log('✅ STEP 9: Webhook transmission successful');
      console.log('📊 Final metrics:', {
        techId: user.tech_uuid.slice(-8),
        firstName: user.first_name,
        sessionId: sessionIdRef.current.slice(-12),
        webhookLatency: `${webhookLatency.toFixed(2)}ms`,
        payloadSize: `${payloadSize} bytes`,
        timestamp: new Date().toISOString().slice(11, 23) // Just time portion
      });
      
      // 🔧 CRITICAL: Log final payload confirmation for Make.com debugging
      console.log('📤 PAYLOAD SENT TO MAKE.COM:', {
        message: 'Payload verification - all 8 fields included',
        actualFieldsSent: Object.keys(payload),
        expectedFields: ['message', 'timestamp', 'sessionId', 'source', 'techId', 'firstName', 'jobTitle', 'betaCodeId'],
        userContextIncluded: {
          techId: !!payload.techId,
          firstName: !!payload.firstName,
          jobTitle: !!payload.jobTitle, 
          betaCodeId: !!payload.betaCodeId
        },
        payloadJsonLength: payloadJson.length
      });
      
      console.groupEnd();

    } catch (error) {
      clearTimeout(timeoutId);
      
      // STEP 10: Comprehensive error handling
      console.error('❌ STEP 10: Webhook transmission failed');
      
      if (error.name === 'AbortError') {
        console.error('⏰ Error type: Request timeout (15s exceeded)');
        console.groupEnd();
        throw new Error("Request timed out - AI service may be slow");
      } else if (error.message?.includes('fetch')) {
        console.error('🌐 Error type: Network connectivity issue');
        console.groupEnd();
        throw new Error("Network error - check internet connection");
      } else {
        console.error('🔥 Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n')[0] // Just first line of stack
        });
        console.groupEnd();
        throw error;
      }
    }
  };

  // 🚀 DUAL TESTING: Send message to native pricing agent endpoint
  const sendUserMessageToNative = async (userMessageText: string) => {
    const debugPrefix = `🔗 NATIVE [${sessionIdRef.current.slice(-8)}]`;
    
    console.group(`${debugPrefix} Starting native pipeline request`);
    console.log('📤 Message:', userMessageText.substring(0, 100) + (userMessageText.length > 100 ? '...' : ''));
    
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
      techId: user.tech_uuid,
      firstName: user.first_name,
      jobTitle: user.job_title,
      betaCodeId: user.beta_code_id
    };

    const startTime = performance.now();
    
    try {
      console.log('🚀 Sending to native pricing agent...');
      
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

  // 🔧 ENHANCED: Polling with comprehensive debug logging and error handling
  const pollForAiMessages = async () => {
    const debugPrefix = `📡 POLL [${sessionIdRef.current.slice(-8)}]`;
    
    // Quick validation before polling
    if (!NETLIFY_API_URL) {
      console.warn(`${debugPrefix} Skipped - No Netlify API URL configured`);
      return;
    }
    
    const pollStart = performance.now();
    const currentApiUrl = `/.netlify/functions/chat-messages/${sessionIdRef.current}`;
    const sinceParam = lastPollTimeRef.current.toISOString();
    
    // Only log detailed info if admin or if there's been a recent user message
    const shouldDetailLog = isAdmin || (Date.now() - (processingStartTime || 0)) < 30000;
    
    if (shouldDetailLog) {
      console.log(`${debugPrefix} Starting poll`, {
        since: sinceParam.slice(11, 23), // Just time portion
        url: currentApiUrl.slice(-20), // Just end of URL
      });
    }
    
    try {
      const response = await fetch(`${currentApiUrl}?since=${sinceParam}`);
      const pollLatency = performance.now() - pollStart;
      
      if (!response.ok) {
        console.error(`${debugPrefix} HTTP Error -`, {
          status: response.status,
          statusText: response.statusText,
          latency: `${pollLatency.toFixed(2)}ms`
        });
        
        // Don't spam errors for common issues
        if (response.status !== 404 && response.status !== 429) {
          throw new Error(`Poll failed: ${response.status} ${response.statusText}`);
        }
        return;
      }

      const newAiMessages = await response.json();
      
      if (shouldDetailLog) {
        console.log(`${debugPrefix} Response -`, {
          messages: newAiMessages.length,
          latency: `${pollLatency.toFixed(2)}ms`,
          status: response.status
        });
      }
      
      if (newAiMessages.length > 0) {
        console.log(`🎉 ${debugPrefix} New messages received -`, newAiMessages.length);
        
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
          console.warn(`${debugPrefix} Filtered out ${newAiMessages.length - processedMessages.length} invalid messages`);
        }

        setMessages(prev => {
          const existingIds = new Set(prev.map(msg => msg.id));
          const uniqueNewMessages = processedMessages.filter((msg: Message) => !existingIds.has(msg.id));
          
          if (uniqueNewMessages.length > 0) {
            setIsLoading(false);
            lastPollTimeRef.current = new Date();
            
            console.log(`✅ ${debugPrefix} Added ${uniqueNewMessages.length} new messages to chat`);
            
            // 🔄 DUAL TESTING: Check if both responses received
            if (DUAL_TESTING_ENABLED && uniqueNewMessages.some(msg => msg.sender === 'ai')) {
              const allMessages = [...prev, ...uniqueNewMessages];
              const recentAIMessages = allMessages.filter(msg => 
                msg.sender === 'ai' && 
                Math.abs(new Date(msg.timestamp).getTime() - Date.now()) < 60000 // Last minute
              );
              
              const hasMakeResponse = recentAIMessages.some(msg => 
                !msg.metadata?.source || msg.metadata?.source === 'make_com' || msg.source === 'make_com'
              );
              const hasNativeResponse = recentAIMessages.some(msg => 
                msg.metadata?.source === 'native_pricing_agent' || msg.source === 'native_pricing_agent'
              );
              
              if (hasMakeResponse && hasNativeResponse) {
                console.log('🎯 DUAL TESTING: Both responses received - returning to idle polling');
                setIsLoading(false); // This will trigger slower polling
              }
            }
            
            return [...prev, ...uniqueNewMessages];
          } else {
            console.log(`🔄 ${debugPrefix} No new unique messages (${processedMessages.length} already exist)`);
            return prev;
          }
        });
      } else {
        // Only log no messages if we're in detailed logging mode
        if (shouldDetailLog && pollLatency > 100) {
          console.log(`${debugPrefix} No new messages (${pollLatency.toFixed(2)}ms)`);
        }
      }
      
    } catch (error) {
      const pollLatency = performance.now() - pollStart;
      
      // Enhanced error logging
      console.error(`❌ ${debugPrefix} Polling failed -`, {
        error: error.message,
        latency: `${pollLatency.toFixed(2)}ms`,
        timestamp: new Date().toISOString().slice(11, 23)
      });
      
      // Network connectivity check for admins
      if (isAdmin && error.message?.includes('fetch')) {
        console.error('🌐 ADMIN DEBUG: Network connectivity issue detected');
        console.error('🔍 Check: Internet connection, Netlify functions, CORS settings');
      }
    }
  };

  // 🔄 DUAL TESTING: Enhanced smart polling with dynamic intervals
  useEffect(() => {
    const getDynamicInterval = () => {
      // If dual testing is enabled and we're waiting for responses
      if (DUAL_TESTING_ENABLED && isLoading) {
        return 500; // Super aggressive when waiting for dual responses
      }
      
      // If recently sent message (last 30 seconds)
      if (processingStartTime && (Date.now() - processingStartTime) < 30000) {
        return 1000; // Fast polling for recent activity
      }
      
      // Normal idle polling
      return 3000;
    };

    let pollingInterval: NodeJS.Timeout;
    
    const startDynamicPolling = () => {
      const interval = getDynamicInterval();
      console.log(`🔄 POLLING: Setting interval to ${interval}ms (dual:${DUAL_TESTING_ENABLED}, loading:${isLoading})`);
      
      pollingInterval = setInterval(() => {
        pollForAiMessages();
        
        // Re-evaluate interval after each poll
        clearInterval(pollingInterval);
        startDynamicPolling();
      }, interval);
    };

    startDynamicPolling();
    
    return () => clearInterval(pollingInterval);
  }, [DUAL_TESTING_ENABLED, isLoading, processingStartTime]);

  // ORIGINAL: Auto-scroll functionality
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ORIGINAL: User context initialization
  useEffect(() => {
    if (user && !sessionIdRef.current.includes(user.first_name.toLowerCase())) {
      handleRefreshChat();
    }
  }, [user]);

  // ORIGINAL: Personalized welcome message
  useEffect(() => {
    if (user && messages.length === 1 && !messages[0].text.includes(user.first_name)) {
      setMessages([{
        id: '1',
        text: `Hey ${user.first_name.charAt(0).toUpperCase() + user.first_name.slice(1).toLowerCase()}, what's the customer scoop?`,
        sender: 'ai',
        timestamp: new Date(),
        sessionId: sessionIdRef.current
      }]);
      console.log('✅ Personalized initial welcome for:', user.first_name);
    }
  }, [user]);

  // 🔄 DUAL TESTING: Group messages for dual display
  const groupMessagesForDualDisplay = (messages: Message[]) => {
    if (!DUAL_TESTING_ENABLED) return messages.map(msg => ({ single: msg }));

    const grouped: Array<{ single?: Message; dual?: { make: Message; native: Message } }> = [];
    const processed = new Set<string>();

    messages.forEach((msg) => {
      if (processed.has(msg.id)) return;

      if (msg.sender === 'user') {
        grouped.push({ single: msg });
        processed.add(msg.id);
      } else if (msg.sender === 'ai') {
        // Look for corresponding response from other source
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
          // We have a dual response
          const makeMsg = isMake ? msg : correspondingMsg;
          const nativeMsg = isNative ? msg : correspondingMsg;
          
          grouped.push({
            dual: { make: makeMsg, native: nativeMsg }
          });
          
          processed.add(msg.id);
          processed.add(correspondingMsg.id);
        } else {
          // Single response
          grouped.push({ single: msg });
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
    const personalizedWelcome = user.first_name 
      ? `Hey ${user.first_name.charAt(0).toUpperCase() + user.first_name.slice(1).toLowerCase()}, what's the customer scoop?`
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

    console.log('🔄 Chat refreshed with new user session:', sessionIdRef.current);
    console.log('👤 User context:', { 
      name: user.first_name, 
      betaId: user.beta_code_id,
      techId: user.tech_uuid 
    });
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
      if (DUAL_TESTING_ENABLED) {
        console.log('🔄 DUAL TESTING: Sending to both Make.com and Native Pipeline');
        
        // Send to both endpoints simultaneously
        const promises = [
          sendUserMessageToMake(userMessageText).catch(error => ({ error, source: 'make' })),
          sendUserMessageToNative(userMessageText).catch(error => ({ error, source: 'native' }))
        ];
        
        const results = await Promise.allSettled(promises);
        
        // Log results for both
        results.forEach((result, index) => {
          const source = index === 0 ? 'Make.com' : 'Native';
          if (result.status === 'fulfilled') {
            if (result.value?.error) {
              console.warn(`⚠️ ${source} failed:`, result.value.error.message);
            } else {
              console.log(`✅ ${source} succeeded`);
            }
          } else {
            console.error(`❌ ${source} rejected:`, result.reason);
          }
        });
        
        // If both failed, show error message
        const bothFailed = results.every(result => 
          result.status === 'rejected' || 
          (result.status === 'fulfilled' && result.value?.error)
        );
        
        if (bothFailed) {
          throw new Error('Both Make.com and Native pipeline failed');
        }
        
      } else {
        // Original single webhook behavior
        await sendUserMessageToMake(userMessageText);
      }
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

  // 🎤 VOICE INPUT: Update input text with transcript
  useEffect(() => {
    if (transcript && isRecording) {
      setInputText(transcript);
    }
  }, [transcript, isRecording]);

  // 🎤 VOICE INPUT: Handle voice recording toggle
  const handleVoiceToggle = async () => {
    setVoiceError(null);
    
    if (!browserSupportsSpeechRecognition) {
      setVoiceError('Your browser does not support speech recognition. Please use Chrome, Edge, or Safari.');
      return;
    }
    
    if (isRecording) {
      // Stop recording
      SpeechRecognition.stopListening();
      setIsRecording(false);
      
      // If we have transcript text and user wants to send it
      if (transcript.trim()) {
        // Let user edit the transcript if needed, don't auto-send
        console.log('🎤 Voice recording stopped. Transcript available for editing.');
      }
    } else {
      // Start recording
      try {
        resetTranscript();
        setIsRecording(true);
        
        await SpeechRecognition.startListening({ 
          continuous: true, 
          language: 'en-US',
          interimResults: true
        });
        
        setMicPermissionState('granted');
        console.log('🎤 Voice recording started');
      } catch (error) {
        console.error('Failed to start voice recognition:', error);
        setVoiceError('Failed to access microphone. Please check your browser permissions.');
        setIsRecording(false);
        setMicPermissionState('denied');
      }
    }
  };

  // 🎤 VOICE INPUT: Get microphone button icon and style based on state
  const getMicrophoneButtonConfig = () => {
    if (!browserSupportsSpeechRecognition) {
      return {
        icon: 'MicOff',
        className: 'opacity-50 cursor-not-allowed',
        title: 'Voice input not supported in this browser'
      };
    }
    
    if (voiceError) {
      return {
        icon: 'MicOff',
        className: 'text-red-500',
        title: voiceError
      };
    }
    
    if (isRecording) {
      return {
        icon: 'MicIcon',
        className: 'text-red-500 animate-pulse',
        title: 'Click to stop recording'
      };
    }
    
    if (micPermissionState === 'denied') {
      return {
        icon: 'MicOff',
        className: 'text-orange-500',
        title: 'Microphone permission denied. Please enable in browser settings.'
      };
    }
    
    return {
      icon: 'MicIcon',
      className: 'text-gray-500 hover:text-blue-500 transition-colors',
      title: 'Click to start voice input'
    };
  };

  const handleFeedbackSubmit = async (feedbackText: string) => {
    try {
      await sendFeedback(user?.first_name || 'Anonymous', feedbackText);
      setShowFeedbackPopup(false);
    } catch (error) {
      console.error("Failed to send feedback from chat interface", error);
    }
  };

  // 🔧 ADMIN DIAGNOSTICS: Run comprehensive backend tests
  const runSystemDiagnostics = async () => {
    if (!isAdmin) return;
    
    setIsRunningDiagnostics(true);
    console.group('🔬 ADMIN DIAGNOSTICS: Starting system health check');
    console.log('👤 Initiated by:', user?.first_name);
    console.log('⏰ Started at:', new Date().toISOString());
    
    try {
      const results = await runBackendDiagnostics();
      setDiagnosticResults(results);
      logDiagnosticResults(results);
      
      console.log('✅ DIAGNOSTICS COMPLETE: Results saved to state');
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
      <MobileHamburgerMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onLogoutClick={handleLogout}
        onFeedbackClick={() => setShowFeedbackPopup(true)}
        onNotesClick={() => setShowNotesPopup(true)}
        onAvatarClick={() => setShowAvatarPopup(true)}
        visualConfig={visualConfig}
        theme={theme}
        user={user}
      />
      <header className="flex-shrink-0 border-b transition-colors duration-300" style={{ borderBottomColor: theme === 'light' ? '#e5e7eb' : '#374151', backgroundColor: visualConfig.colors.surface }}>
        <div className="px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left side: Hamburger, Logo */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsMenuOpen(true)}
                className="p-2 rounded-md transition-colors"
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
            </div>

            {/* Right side: Controls */}
            <div className="flex items-center space-x-2">
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
                    {user?.first_name || 'User'}
                  </p>
                  <p className="text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                    {user?.job_title || 'Technician'}
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
                title="Start a new chat session"
              >
                <DynamicIcon name="RotateCcw" className="h-4 w-4" />
                <span className="hidden sm:inline text-sm font-medium">New Chat</span>
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

      {/* ORIGINAL: Main Chat Area - exact same structure */}
      <main className="flex-1 flex flex-col overflow-hidden p-4">
        <div
          className="flex-1 rounded-2xl shadow-lg flex flex-col overflow-hidden min-h-0 transition-all duration-300"
          style={{
            backgroundColor: visualConfig.colors.surface,
            borderRadius: visualConfig.patterns.componentShape === 'organic' ? '1.5rem' : '0.75rem'
          }}
        >
          {/* 🔄 DUAL TESTING: Enhanced Messages Area with dual response support */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {groupMessagesForDualDisplay(messages).map((messageGroup, index) => (
              <div
                key={messageGroup.single?.id || `dual-${messageGroup.dual?.make.id}-${messageGroup.dual?.native.id}`}
                className={`
                  ${isRefreshing ? 'animate-fade-up-out' : ''}
                  ${!isRefreshing && index === messages.length - 1 ? 'animate-fade-up-in-delay' : ''}
                `}
              >
                {messageGroup.single ? (
                  <ThemeAwareMessageBubble
                    message={messageGroup.single}
                    visualConfig={visualConfig}
                    theme={theme}
                  />
                ) : messageGroup.dual ? (
                  <DualResponseDisplay
                    makeMsg={messageGroup.dual.make}
                    nativeMsg={messageGroup.dual.native}
                    visualConfig={visualConfig}
                    theme={theme}
                  />
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
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={terminologyConfig.placeholderExamples}
                    className="w-full px-3 py-2 pr-12 resize-none transition-all duration-300 focus:ring-2 focus:ring-opacity-50"
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
                  
                  {/* 🎤 VOICE INPUT: Microphone button inside input field */}
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
                  
                  {/* 🎤 VOICE INPUT: Recording indicator */}
                  {isRecording && (
                    <div className="absolute -top-8 right-0 flex items-center space-x-2 px-2 py-1 bg-red-500 text-white text-xs rounded-md animate-fade-in">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span>Recording...</span>
                    </div>
                  )}
                  
                  {/* 🎤 VOICE INPUT: Error message */}
                  {voiceError && (
                    <div className="absolute -top-8 right-0 px-2 py-1 bg-red-500 text-white text-xs rounded-md max-w-xs">
                      {voiceError}
                    </div>
                  )}
                </div>
                <button
                  ref={sendButtonRef}
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputText.trim()}
                  className="px-5 py-3 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg"
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
                  className="flex items-center gap-2 px-3 py-2 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2"
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
      {/* ADD NOTESPOPUP HERE */}
      <NotesPopup
        isOpen={showNotesPopup}
        onClose={() => setShowNotesPopup(false)}
        isAdmin={isAdmin}
        userName={user?.first_name || 'Anonymous'}
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
        userName={user?.first_name || 'Anonymous'}
      />

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
    </div>
  );
};

export default ChatInterface;