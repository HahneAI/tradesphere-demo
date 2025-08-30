// src/components/ui/FeedbackPopup.tsx
import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../../config/industry';

interface FeedbackPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedbackText: string) => Promise<void>;
  userName: string;
}

export const FeedbackPopup: React.FC<FeedbackPopupProps> = ({ isOpen, onClose, onSubmit, userName }) => {
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset state when the popup is opened
      setIsSubmitted(false);
      setFeedbackText('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!feedbackText.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(feedbackText);
      setIsSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 2000); // Close popup after 2 seconds
    } catch (error) {
      console.error("Failed to submit feedback", error);
      // Optionally, show an error message to the user
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div
        className="p-6 rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-scale-in"
        style={{
          backgroundColor: visualConfig.colors.surface,
          color: visualConfig.colors.text.primary,
          borderRadius: visualConfig.patterns.componentShape === 'organic' ? '1.5rem' : '1rem'
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        {isSubmitted ? (
          <div className="text-center py-8">
            <Icons.CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: visualConfig.colors.success }} />
            <h3 className="text-2xl font-bold mb-2">Thank You!</h3>
            <p style={{ color: visualConfig.colors.text.secondary }}>
              Your feedback has been submitted successfully.
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Icons.MessageSquareQuote className="h-6 w-6" style={{ color: visualConfig.colors.primary }} />
                Submit Feedback
              </h3>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-500/20 transition-colors">
                <Icons.X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: visualConfig.colors.text.secondary }}>
              We'd love to hear your thoughts! Found a bug or have a suggestion? Let us know.
            </p>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={`Hi ${userName}, what's on your mind?`}
              className="w-full px-3 py-2 rounded-lg resize-none transition-all duration-200 focus:ring-2"
              style={{
                backgroundColor: visualConfig.colors.background,
                color: visualConfig.colors.text.primary,
                borderColor: visualConfig.colors.secondary,
                '--tw-ring-color': visualConfig.colors.primary,
                borderRadius: visualConfig.patterns.componentShape === 'organic' ? '1rem' : '0.5rem'
              }}
              rows={5}
              disabled={isSubmitting}
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: theme === 'light' ? '#e5e7eb' : '#374151',
                  color: visualConfig.colors.text.primary
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!feedbackText.trim() || isSubmitting}
                className="px-4 py-2 rounded-lg text-white disabled:opacity-50 flex items-center gap-2"
                style={{
                  backgroundColor: visualConfig.colors.success, // Changed from .primary
                  color: visualConfig.colors.text.onPrimary
                }}
              >
                {isSubmitting ? <Icons.Loader className="h-5 w-5 animate-spin" /> : <Icons.Send className="h-5 w-5" />}
                {isSubmitting ? 'Sending...' : 'Send Feedback'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
