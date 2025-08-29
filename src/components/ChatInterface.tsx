// SURGICAL ChatInterface - Preserves 100% of original + adds minimal enterprise features
// This keeps your exact working layout and only adds performance tracking in background

import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { flushSync } from 'react-dom';
import { AvatarSelectionPopup } from './ui/AvatarSelectionPopup';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
    getCoreConfig,
    getTerminologyConfig,
    getSmartVisualThemeConfig,
} from '../config/industry';
import { triggerSendEffect } from './ui/IndustryEffects';
import TypingIndicator from './ui/TypingIndicator';
import { ThemeAwareMessageBubble } from './ui/ThemeAwareMessageBubble';
import { ThemeAwareAvatar } from './ui/ThemeAwareAvatar';
import { FeedbackPopup } from './ui/FeedbackPopup';
import { sendFeedback } from '../utils/feedback-webhook';
import { Message } from '../types/job';
import { MobileHamburgerMenu } from './mobile/MobileHamburgerMenu';
import { NotesPopup } from './ui/NotesPopup';

const coreConfig = getCoreConfig();
const terminologyConfig = getTerminologyConfig();

const DynamicIcon = ({ name, ...props }: { name: keyof typeof Icons } & Icons.LucideProps) => {
  const IconComponent = Icons[name];
  if (!IconComponent) {
    return <Icons.MessageCircle {...props} />;
  }
  return <IconComponent {...props} />;
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
    totalResponseTime: null
  });
  const [processingStartTime, setProcessingStartTime] = useState(null);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);

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

  const welcomeMessage = import.meta.env.VITE_WELCOME_MESSAGE || `Welcome to ${coreConfig.companyName}! How can I help you today?`;

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

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    signOut();
  }

  // 🏢 ENTERPRISE: Enhanced sendUserMessageToMake with performance tracking
  const sendUserMessageToMake = async (userMessageText: string) => {
    if (!MAKE_WEBHOOK_URL) {
      console.warn("Make.com webhook URL is not configured. Skipping message sending.");
      return;
    }

    if (!user) {
      console.error("No user data available for Make.com webhook");
      throw new Error("User not authenticated");
    }

    // 🏢 ENTERPRISE: Start performance tracking
    const startTime = performance.now();
    setProcessingStartTime(Date.now());

    try {
      const response = await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessageText,
          timestamp: new Date().toISOString(),
          sessionId: sessionIdRef.current,
          source: 'TradeSphere',
          techId: user.tech_uuid,
          firstName: user.first_name,
          jobTitle: user.job_title,
          betaCodeId: user.beta_code_id
        })
      });

      // 🏢 ENTERPRISE: Track webhook performance
      const webhookLatency = performance.now() - startTime;
      setPerformanceMetrics(prev => ({
        ...prev,
        webhookLatency: webhookLatency.toFixed(2)
      }));

      if (!response.ok) {
        throw new Error('Failed to send message to Make.com');
      }
      
      console.log('✅ User message sent to Make.com successfully with user data:', {
        techId: user.tech_uuid,
        firstName: user.first_name,
        sessionId: sessionIdRef.current,
        webhookLatency: `${webhookLatency.toFixed(2)}ms` // 🏢 ENTERPRISE: Log performance
      });

    } catch (error) {
      console.error('❌ Error sending user message to Make.com:', error);
      throw error;
    }
  };

  // 🏢 ENTERPRISE: Enhanced polling with better performance
  const pollForAiMessages = async () => {
    if (!NETLIFY_API_URL) return;
    
    try {
      const currentApiUrl = `/.netlify/functions/chat-messages/${sessionIdRef.current}`;
      const response = await fetch(`${currentApiUrl}?since=${lastPollTimeRef.current.toISOString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch AI messages');
      }

      const newAiMessages = await response.json();
      
      if (newAiMessages.length > 0) {
        // 🏢 ENTERPRISE: Calculate total response time
        if (processingStartTime) {
          const totalTime = Date.now() - processingStartTime;
          setPerformanceMetrics(prev => ({
            ...prev,
            totalResponseTime: (totalTime / 1000).toFixed(1)
          }));
          
          console.log(`🏢 ENTERPRISE: Complete response in ${(totalTime / 1000).toFixed(1)}s`);
        }

        const processedMessages = newAiMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));

        setMessages(prev => {
          const existingIds = new Set(prev.map(msg => msg.id));
          const uniqueNewMessages = processedMessages.filter((msg: Message) => !existingIds.has(msg.id));
          
          if (uniqueNewMessages.length > 0) {
            setIsLoading(false);
            lastPollTimeRef.current = new Date();
            return [...prev, ...uniqueNewMessages];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Error polling for AI messages:', error);
    }
  };

  // 🏢 ENTERPRISE: Smart polling - faster initial, then regular
  useEffect(() => {
    // Start with faster polling, then regular
    const initialFastPolling = setInterval(pollForAiMessages, 1500); // 1.5s for first few polls
    
    setTimeout(() => {
      clearInterval(initialFastPolling);
      const regularPolling = setInterval(pollForAiMessages, 3000); // Then 3s regular
      
      return () => clearInterval(regularPolling);
    }, 10000); // Fast polling for first 10 seconds
    
    return () => clearInterval(initialFastPolling);
  }, []);

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
      await sendUserMessageToMake(userMessageText);
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

  const handleFeedbackSubmit = async (feedbackText: string) => {
    try {
      await sendFeedback(user?.first_name || 'Anonymous', feedbackText);
      setShowFeedbackPopup(false);
    } catch (error) {
      console.error("Failed to send feedback from chat interface", error);
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
          {/* ORIGINAL: Messages Area - exact same structure */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`
                  ${isRefreshing ? 'animate-fade-up-out' : ''}
                  ${!isRefreshing && index === messages.length - 1 && message.sender === 'user' ? 'animate-fade-up-in-delay-user' : ''}
                  ${!isRefreshing && index === messages.length - 1 && message.sender === 'ai' ? 'animate-fade-up-in-delay' : ''}
                `}
              >
                <ThemeAwareMessageBubble
                  message={message}
                  visualConfig={visualConfig}
                  theme={theme}
                />
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
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={terminologyConfig.placeholderExamples}
                  className="flex-1 px-3 py-2 resize-none transition-all duration-300 focus:ring-2 focus:ring-opacity-50"
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
        <div className="fixed bottom-20 right-4 bg-black bg-opacity-80 text-white text-xs p-2 rounded max-w-xs">
          <div>🏢 PERFORMANCE</div>
          <div>Webhook: {performanceMetrics.webhookLatency}ms</div>
          {performanceMetrics.totalResponseTime && <div>Total: {performanceMetrics.totalResponseTime}s</div>}
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