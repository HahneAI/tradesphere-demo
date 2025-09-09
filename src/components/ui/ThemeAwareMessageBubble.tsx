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

// 🔄 DUAL TESTING: Get source badge for message identification
const getSourceBadge = (message: Message) => {
  const source = message.metadata?.source || message.source;
  
  if (source === 'native_pricing_agent') {
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full font-medium">
        ⚡ Native
      </span>
    );
  } else if (source === 'make_com' || (!source && message.sender === 'ai')) {
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium">
        🔧 Make.com
      </span>
    );
  }
  
  return null;
};

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
  const bubbleStyles = {
    backgroundColor: message.sender === 'user'
      ? visualConfig.colors.primary
      : visualConfig.colors.elevated,
    color: message.sender === 'user'
      ? visualConfig.colors.text.onPrimary
      : visualConfig.colors.text.primary,
    borderRadius: visualConfig.patterns.componentShape === 'organic' ? '1.5rem' : '0.75rem',
    ...sourceStyle
  };

  return (
    <div className={`flex items-start ${compact ? 'gap-2' : 'gap-3'} ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      {message.sender === 'ai' && !compact && <ThemeAwareAvatar sender="ai" visualConfig={visualConfig} />}
      <div
        className={`${compact ? 'max-w-full px-3 py-2' : 'max-w-md lg:max-w-2xl px-5 py-3'} shadow-md message-bubble-animate ${animationClass} transition-all duration-300`}
        style={bubbleStyles}
      >
        {/* ✅ LOGICAL BADGES: Show source badge only for AI responses in dual testing */}
        {message.sender === 'ai' && !removeSourceStyling && getSourceBadge(message) && (
          <div className="mb-2">
            {getSourceBadge(message)}
          </div>
        )}
        
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
