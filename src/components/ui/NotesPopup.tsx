import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../../config/industry';

interface NotesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  userName: string;
  notesText: string;
  onNotesUpdate: (newText: string) => void;
}

export const NotesPopup: React.FC<NotesPopupProps> = ({ 
  isOpen, 
  onClose, 
  isAdmin, 
  userName, 
  notesText, 
  onNotesUpdate 
}) => {
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);
  const [localNotesText, setLocalNotesText] = useState(notesText);
  const [hasChanges, setHasChanges] = useState(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalNotesText(e.target.value);
    setHasChanges(true);
  };

  const handleSave = () => {
    onNotesUpdate(localNotesText);
    setHasChanges(false);
  };

  const handleClose = () => {
    if (hasChanges && isAdmin) {
      onNotesUpdate(localNotesText); // Auto-save on close
    }
    onClose();
  };

  // Reset local state when popup opens
  React.useEffect(() => {
    if (isOpen) {
      setLocalNotesText(notesText);
      setHasChanges(false);
    }
  }, [isOpen, notesText]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in" onClick={handleClose}>
      <div
        className="p-6 rounded-2xl shadow-2xl max-w-lg w-full mx-4 animate-scale-in max-h-[80vh] overflow-y-auto"
        style={{
          backgroundColor: visualConfig.colors.surface,
          color: visualConfig.colors.text.primary,
          borderRadius: visualConfig.patterns.componentShape === 'organic' ? '1.5rem' : '1rem'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Icons.StickyNote className="h-6 w-6" style={{ color: visualConfig.colors.primary }} />
            Your Notes from Us
            {isAdmin && <span className="text-sm font-normal px-2 py-1 rounded-full bg-yellow-500 text-black">ADMIN</span>}
          </h3>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-500/20 transition-colors">
            <Icons.X className="h-5 w-5" />
          </button>
        </div>

        {isAdmin ? (
          <>
            <p className="text-sm mb-4" style={{ color: visualConfig.colors.text.secondary }}>
              Edit the notes that all users will see. Changes save when you close.
            </p>
            <textarea
              value={localNotesText}
              onChange={handleTextChange}
              placeholder="Enter important notes for all users here..."
              className="w-full px-3 py-2 rounded-lg resize-none transition-all duration-200 focus:ring-2 min-h-[200px]"
              style={{
                backgroundColor: visualConfig.colors.background,
                color: visualConfig.colors.text.primary,
                borderColor: visualConfig.colors.secondary,
                '--tw-ring-color': visualConfig.colors.primary,
                borderRadius: visualConfig.patterns.componentShape === 'organic' ? '1rem' : '0.5rem'
              }}
            />
            <div className="flex justify-between items-center mt-4">
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <span className="text-sm text-orange-500">Unsaved changes</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: theme === 'light' ? '#e5e7eb' : '#374151',
                    color: visualConfig.colors.text.primary
                  }}
                >
                  Close & Save
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="px-4 py-2 rounded-lg text-white disabled:opacity-50 flex items-center gap-2"
                  style={{
                    backgroundColor: visualConfig.colors.primary,
                    color: visualConfig.colors.text.onPrimary
                  }}
                >
                  <Icons.Save className="h-4 w-4" />
                  Save Now
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm mb-4" style={{ color: visualConfig.colors.text.secondary }}>
              Important information and updates from your team.
            </p>
            <div
              className="p-4 rounded-lg min-h-[200px] whitespace-pre-wrap"
              style={{
                backgroundColor: visualConfig.colors.background,
                color: visualConfig.colors.text.primary,
                borderRadius: visualConfig.patterns.componentShape === 'organic' ? '1rem' : '0.5rem'
              }}
            >
              {notesText || 'No notes available at this time.'}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: visualConfig.colors.primary,
                  color: visualConfig.colors.text.onPrimary
                }}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};