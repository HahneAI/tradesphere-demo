import * as Icons from 'lucide-react';
import { SmartVisualThemeConfig } from '../../config/industry';
import { useAuth } from '../../context/AuthContext';

const DynamicIcon = ({ name, ...props }: { name: string } & any) => {
  const IconComponent = Icons[name as keyof typeof Icons] || Icons.User;
  return <IconComponent {...props} />;
};

export const ThemeAwareAvatar = ({ sender, visualConfig }: { sender: 'user' | 'ai', visualConfig: SmartVisualThemeConfig }) => {
  const { user } = useAuth();
  
  const baseClasses = "w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center shadow-md transition-all duration-300";
  const style = {
    backgroundColor: sender === 'ai' ? visualConfig.colors.secondary : visualConfig.colors.primary,
    color: sender === 'ai' ? visualConfig.colors.text.onSecondary : visualConfig.colors.text.onPrimary,
  };

  // Use user's selected icon for user messages, Bot icon for AI
  const iconName = sender === 'ai' ? 'Bot' : (user?.user_icon || 'User');

  return (
    <div className={baseClasses} style={style}>
      <DynamicIcon name={iconName} className="w-6 h-6" />
    </div>
  );
};