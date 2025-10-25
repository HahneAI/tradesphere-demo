import * as Icons from 'lucide-react';
import { SmartVisualThemeConfig } from '../../config/industry';
import { ThemeAwareAvatar } from './ThemeAwareAvatar';
import { Message } from '../../types/message';

const formatRelativeTime = (date: Date) => {
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);

  if (seconds < 5) return "just now";
  if (minutes < 1) return `${seconds} seconds ago`;
  if (minutes < 60) return `${minutes} minutes ago`;

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// 🔄 DUAL TESTING: Get message source styling for visual differentiation
const getMessageSourceStyle = (message: Message) => {
  const source = message.metadata?.source || message.source;

  if (source === 'native_pricing_agent') {
    return {
      border: '2px solid #FCD34D', // Yellow outline for native
      boxShadow: '0 0 8px rgba(252, 211, 77, 0.3)'
    };
  } else if (source === 'make_com' || (!source && message.sender === 'ai')) {
    return {
      border: '2px solid #10B981', // Green outline for Make.com
      boxShadow: '0 0 8px rgba(16, 185, 129, 0.3)'
    };
  }

  return {}; // Default styling for user messages
};

// 📋 CUSTOMER CONTEXT: Get system message styling for context recaps
const getSystemMessageStyle = (message: Message, visualConfig: SmartVisualThemeConfig) => {
  if (!message.isSystemMessage) return {};

  // Create a subtle, distinct style for context recap messages
  return {
    backgroundColor: `${visualConfig.colors.surface}CC`, // Semi-transparent surface
    border: `1px solid ${visualConfig.colors.border || '#E5E7EB'}`,
    opacity: 0.9,
    borderRadius: '0.75rem',
    backdropFilter: 'blur(2px)'
  };
};

// Source badge removed - native-only pricing (no dual testing)

const formatMessageText = (text: string) => {
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');

  const lines = html.split('\n');
  let inList = false;
  html = lines.map(line => {
    if (line.startsWith('- ')) {
      const listItem = `<li>${line.substring(2)}</li>`;
      if (!inList) {
        inList = true;
        return `<ul>${listItem}`;
      }
      return listItem;
    } else {
      if (inList) {
        inList = false;
        return `</ul>${line}`;
      }
      return line;
    }
  }).join('<br />');

  if (inList) {
    html += '</ul>';
  }

  return html.replace(/<br \/>/g, '\n').replace(/\n/g, '<br />');
};

const StatusIcon = ({ status }: { status: Message['status'] }) => {
    switch (status) {
        case 'sending': return <Icons.Clock className="h-3 w-3 opacity-60" />;
        case 'sent': return <Icons.Check className="h-3 w-3 opacity-60" />;
        case 'delivered': return <Icons.CheckCheck className="h-3 w-3 opacity-60" />;
        case 'error': return <Icons.AlertCircle className="h-3 w-3 text-red-400" />;
        default: return null;
    }
};

export const ThemeAwareMessageBubble = ({ message, visualConfig, theme, compact = false, removeSourceStyling = false }: { 
  message: Message, 
  visualConfig: SmartVisualThemeConfig,
  theme?: string,
  compact?: boolean,
  removeSourceStyling?: boolean
}) => {
  const animationClass = visualConfig.animations.messageEntry === 'grow' ? 'landscaping-grow' : 'tech-slide';

  // ✅ LOGICAL STYLING: Apply source styling only for AI responses in dual testing
  const sourceStyle = (!removeSourceStyling && message.sender === 'ai') ? getMessageSourceStyle(message) : {};

  // 📋 CUSTOMER CONTEXT: Apply system message styling for context recaps
  const systemMessageStyle = getSystemMessageStyle(message, visualConfig);

  const bubbleStyles = {
    backgroundColor: message.sender === 'user'
      ? visualConfig.colors.primary
      : (message.isSystemMessage ? 'transparent' : visualConfig.colors.elevated),
    color: message.sender === 'user'
      ? visualConfig.colors.text.onPrimary
      : (message.isSystemMessage ? visualConfig.colors.text.secondary : visualConfig.colors.text.primary),
    borderRadius: visualConfig.patterns.componentShape === 'organic' ? '1.5rem' : '0.75rem',
    ...sourceStyle,
    ...systemMessageStyle
  };

  return (
    <div className={`flex items-start ${compact ? 'gap-2' : 'gap-3'} ${message.sender === 'user' ? 'justify-end' : 'justify-start'} ${message.isSystemMessage ? 'opacity-90' : ''}`}>
      {message.sender === 'ai' && !compact && !message.isSystemMessage && <ThemeAwareAvatar sender="ai" visualConfig={visualConfig} />}
      {message.isSystemMessage && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center">
          <Icons.Info className="h-4 w-4 text-blue-600" />
        </div>
      )}
      <div
        className={`${compact ? 'max-w-full px-3 py-2' : 'max-w-md lg:max-w-2xl px-5 py-3'} ${message.isSystemMessage ? 'shadow-sm' : 'shadow-md'} message-bubble-animate ${animationClass} transition-all duration-300`}
        style={bubbleStyles}
      >
        {/* Source badges removed - native-only pricing */}

        <div
          className={`${compact ? 'text-sm' : 'text-base'} whitespace-pre-wrap`}
          dangerouslySetInnerHTML={{ __html: formatMessageText(message.text) }}
        />
        {!compact && (
          <div className="flex items-center justify-end mt-2">
            <p className="text-xs opacity-60">
              {formatRelativeTime(message.timestamp)}
            </p>
            {message.sender === 'user' && message.status && (
              <div className="ml-2">
                <StatusIcon status={message.status} />
              </div>
            )}
          </div>
        )}
      </div>
      {message.sender === 'user' && !compact && <ThemeAwareAvatar sender="user" visualConfig={visualConfig} />}
    </div>
  );
};
