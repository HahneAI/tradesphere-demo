/**
 * ConversationContextService - AI Thread-Based Conversation Memory
 * 
 * Manages multi-turn conversations using AI provider thread management.
 * Supports both OpenAI Assistants API and Claude conversation contexts.
 * 
 * Features:
 * - AI provider thread management
 * - Session-based conversation history
 * - System prompt integration for TradeSphere
 * - Multi-turn conversation flow
 * - Automatic context retrieval and updates
 */

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ConversationContext {
  sessionId: string;
  messageHistory: ConversationMessage[];
  partialServices?: RecognizedService[];
  awaitingClarification?: string[];
  customerContext?: CustomerContext;
  threadId?: string; // OpenAI thread ID or Claude conversation ID
  aiProvider: 'openai' | 'claude';
  systemPromptApplied: boolean;
}

export interface RecognizedService {
  serviceName: string;
  quantity?: number;
  unit?: string;
  confidence: number;
  status: 'complete' | 'partial' | 'awaiting_quantity' | 'awaiting_details';
}

export interface CustomerContext {
  firstName?: string;
  jobTitle?: string;
  isReturnCustomer?: boolean;
  projectType?: string;
  urgencyLevel?: 'routine' | 'seasonal' | 'emergency';
}

interface AIResponse {
  content: string;
  requiresClarification?: boolean;
  suggestedQuestions?: string[];
}

export class ConversationContextService {
  private static readonly OPENAI_API_ENDPOINT = 'https://api.openai.com/v1';
  private static readonly CLAUDE_API_ENDPOINT = 'https://api.anthropic.com/v1';
  
  // In-memory storage for conversation contexts (could be replaced with Redis/database)
  private static contextStore: Map<string, ConversationContext> = new Map();

  /**
   * TradeSphere landscaping agent system prompt
   */
  private static readonly TRADESPHERE_SYSTEM_PROMPT = `You are TradeSphere's intelligent landscaping pricing assistant. You help customers get accurate quotes for landscaping services through natural conversation.

ABOUT TRADESPHERE:
- Professional landscaping company with 32+ services
- Services include: hardscaping (patios, walls), planting (trees, shrubs, sod), materials (mulch, topsoil), drainage, irrigation, structures
- Focus on accurate pricing with detailed quantity requirements
- Maintain professional but friendly tone

YOUR ROLE:
1. Understand customer landscaping needs through conversation
2. Ask clarifying questions to get precise measurements and specifications
3. Guide customers toward complete service requests with quantities
4. Maintain context across multiple messages in the same session
5. Be helpful and patient when customers provide partial information

CONVERSATION FLOW:
- When customers mention services without quantities: ask for measurements
- When customers provide partial info: acknowledge what you have and ask for missing details  
- When you have complete information: confirm details before processing quote
- Always maintain conversation context and refer to previous messages

MEASUREMENT GUIDANCE:
- For area services (mulch, sod, patios): need square feet or dimensions (e.g., "15x20")
- For linear services (edging, fencing): need linear feet or perimeter details
- For plants: need quantity (e.g., "5 trees", "dozen shrubs")
- For structures: need size/type specifications

TONE: Professional but conversational, helpful, patient with clarifying questions.

Remember: You're building toward a complete quote, so gather all necessary details through natural conversation.`;

  /**
   * Retrieve conversation context for a session
   */
  static async retrieveContext(sessionId: string): Promise<ConversationContext | null> {
    const existingContext = this.contextStore.get(sessionId);
    
    if (existingContext) {
      console.log(`📖 Retrieved conversation context for session ${sessionId}: ${existingContext.messageHistory.length} messages`);
      return existingContext;
    }

    console.log(`🆕 No existing context for session ${sessionId}`);
    return null;
  }

  /**
   * Initialize new conversation context
   */
  static async initializeContext(
    sessionId: string, 
    customerContext: CustomerContext = {}
  ): Promise<ConversationContext> {
    
    const aiProvider = this.determineAIProvider();
    console.log(`🚀 Initializing new conversation context for session ${sessionId} using ${aiProvider}`);

    let threadId: string | undefined;
    
    if (aiProvider === 'openai') {
      threadId = await this.createOpenAIThread();
    }

    const context: ConversationContext = {
      sessionId,
      messageHistory: [{
        role: 'system',
        content: this.TRADESPHERE_SYSTEM_PROMPT,
        timestamp: new Date()
      }],
      customerContext,
      aiProvider,
      threadId,
      systemPromptApplied: true,
      partialServices: [],
      awaitingClarification: []
    };

    this.contextStore.set(sessionId, context);
    
    console.log(`✅ Context initialized for session ${sessionId} with ${aiProvider} provider`);
    return context;
  }

  /**
   * Process user message with conversation context
   */
  static async processMessageWithContext(
    sessionId: string,
    userMessage: string,
    customerContext: CustomerContext = {}
  ): Promise<AIResponse> {
    
    let context = await this.retrieveContext(sessionId);
    
    if (!context) {
      context = await this.initializeContext(sessionId, customerContext);
    }

    // Add user message to history
    context.messageHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    console.log(`💬 Processing message for session ${sessionId}: "${userMessage}"`);

    let aiResponse: AIResponse;

    try {
      if (context.aiProvider === 'openai') {
        aiResponse = await this.processWithOpenAI(context, userMessage);
      } else {
        aiResponse = await this.processWithClaude(context, userMessage);
      }

      // Add AI response to history
      context.messageHistory.push({
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date()
      });

      // Update context in store
      this.contextStore.set(sessionId, context);

      console.log(`✅ AI response generated for session ${sessionId}`);
      return aiResponse;

    } catch (error) {
      console.error(`❌ Error processing message for session ${sessionId}:`, error);
      
      // Fallback response
      const fallbackResponse: AIResponse = {
        content: "I'm having trouble processing your request right now. Could you please try again or rephrase your question?",
        requiresClarification: false
      };

      context.messageHistory.push({
        role: 'assistant',
        content: fallbackResponse.content,
        timestamp: new Date()
      });

      this.contextStore.set(sessionId, context);
      return fallbackResponse;
    }
  }

  /**
   * Update conversation context after processing
   */
  static async updateContext(
    sessionId: string, 
    userMessage: string, 
    aiResponse: string,
    partialServices?: RecognizedService[]
  ): Promise<void> {
    
    const context = this.contextStore.get(sessionId);
    
    if (context) {
      // Update partial services if provided
      if (partialServices) {
        context.partialServices = partialServices;
      }

      console.log(`📝 Updated context for session ${sessionId}`);
    }
  }

  /**
   * Determine which AI provider to use based on configuration
   */
  private static determineAIProvider(): 'openai' | 'claude' {
    const aiKey = process.env.VITE_AI_API_KEY || 
                  (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_AI_API_KEY : undefined);
    
    if (!aiKey) {
      console.warn('⚠️ No VITE_AI_API_KEY configured, defaulting to OpenAI');
      return 'openai';
    }

    // Detect provider based on key format
    if (aiKey.startsWith('sk-ant-')) {
      return 'claude';
    } else if (aiKey.startsWith('sk-')) {
      return 'openai';
    } else {
      console.warn('⚠️ Unknown AI API key format, defaulting to OpenAI');
      return 'openai';
    }
  }

  /**
   * Create OpenAI thread for conversation
   */
  private static async createOpenAIThread(): Promise<string | undefined> {
    const apiKey = process.env.VITE_AI_API_KEY || 
                   (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_AI_API_KEY : undefined);
    
    if (!apiKey || !apiKey.startsWith('sk-')) {
      console.warn('⚠️ No valid OpenAI API key for thread creation');
      return undefined;
    }

    try {
      const response = await fetch(`${this.OPENAI_API_ENDPOINT}/threads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`OpenAI thread creation failed: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Created OpenAI thread: ${data.id}`);
      return data.id;

    } catch (error) {
      console.error('❌ Failed to create OpenAI thread:', error);
      return undefined;
    }
  }

  /**
   * Process message using OpenAI (with or without Assistants API)
   */
  private static async processWithOpenAI(
    context: ConversationContext, 
    userMessage: string
  ): Promise<AIResponse> {
    
    const apiKey = process.env.VITE_AI_API_KEY || 
                   (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_AI_API_KEY : undefined);
    
    if (!apiKey) {
      throw new Error('No OpenAI API key configured');
    }

    // Use Assistants API if thread is available, otherwise use Chat Completions
    if (context.threadId) {
      return this.processWithOpenAIAssistants(context, userMessage, apiKey);
    } else {
      return this.processWithOpenAIChat(context, userMessage, apiKey);
    }
  }

  /**
   * Process with OpenAI Assistants API (thread-based)
   */
  private static async processWithOpenAIAssistants(
    context: ConversationContext,
    userMessage: string,
    apiKey: string
  ): Promise<AIResponse> {
    
    try {
      // Add message to thread
      await fetch(`${this.OPENAI_API_ENDPOINT}/threads/${context.threadId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          role: 'user',
          content: userMessage
        })
      });

      // Create and run assistant (simplified version - would need assistant ID in production)
      const runResponse = await fetch(`${this.OPENAI_API_ENDPOINT}/threads/${context.threadId}/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          instructions: this.TRADESPHERE_SYSTEM_PROMPT
        })
      });

      // Note: In production, you'd poll for completion and retrieve the response
      // For now, fall back to chat completions
      return this.processWithOpenAIChat(context, userMessage, apiKey);

    } catch (error) {
      console.warn('⚠️ OpenAI Assistants API failed, falling back to chat completions:', error);
      return this.processWithOpenAIChat(context, userMessage, apiKey);
    }
  }

  /**
   * Process with OpenAI Chat Completions API
   */
  private static async processWithOpenAIChat(
    context: ConversationContext,
    userMessage: string,
    apiKey: string
  ): Promise<AIResponse> {
    
    const messages = context.messageHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    const response = await fetch(`${this.OPENAI_API_ENDPOINT}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

    return {
      content,
      requiresClarification: this.detectClarificationNeeds(content),
      suggestedQuestions: this.extractSuggestedQuestions(content)
    };
  }

  /**
   * Process message using Claude
   */
  private static async processWithClaude(
    context: ConversationContext, 
    userMessage: string
  ): Promise<AIResponse> {
    
    const apiKey = process.env.VITE_AI_API_KEY || 
                   (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_AI_API_KEY : undefined);
    
    if (!apiKey) {
      throw new Error('No Claude API key configured');
    }

    const messages = context.messageHistory
      .filter(msg => msg.role !== 'system') // Claude handles system prompt separately
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    const response = await fetch(`${this.CLAUDE_API_ENDPOINT}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 500,
        system: this.TRADESPHERE_SYSTEM_PROMPT,
        messages: messages
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text || 'I apologize, but I could not generate a response.';

    return {
      content,
      requiresClarification: this.detectClarificationNeeds(content),
      suggestedQuestions: this.extractSuggestedQuestions(content)
    };
  }

  /**
   * Detect if AI response requires clarification
   */
  private static detectClarificationNeeds(content: string): boolean {
    const clarificationKeywords = [
      'how many', 'what size', 'which type', 'need to know',
      'could you specify', 'more details', 'clarification'
    ];
    
    return clarificationKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
  }

  /**
   * Extract suggested questions from AI response
   */
  private static extractSuggestedQuestions(content: string): string[] {
    const questions: string[] = [];
    const questionRegex = /([A-Z][^.!?]*\?)/g;
    let match;
    
    while ((match = questionRegex.exec(content)) !== null) {
      questions.push(match[1].trim());
    }
    
    return questions.slice(0, 3); // Return up to 3 questions
  }

  /**
   * Clear conversation context (for testing or session reset)
   */
  static clearContext(sessionId: string): void {
    this.contextStore.delete(sessionId);
    console.log(`🗑️ Cleared context for session ${sessionId}`);
  }

  /**
   * Get conversation summary for debugging
   */
  static getContextSummary(sessionId: string): string | null {
    const context = this.contextStore.get(sessionId);
    
    if (!context) {
      return null;
    }

    return `Session ${sessionId}: ${context.messageHistory.length} messages, ${context.aiProvider} provider, ${context.partialServices?.length || 0} partial services`;
  }
}