// src/components/ui/NotesPopup.tsx - Database Version
import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../../config/industry';

interface NotesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  userName: string;
}

export const NotesPopup: React.FC<NotesPopupProps> = ({ 
  isOpen, 
  onClose, 
  isAdmin, 
  userName
}) => {
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);
  const [notesText, setNotesText] = useState('');
  const [localNotesText, setLocalNotesText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Determine environment and record ID
  const getEnvironmentId = () => {
    const hostname = window.location.hostname;
    const isVersionControl = hostname.includes('version-control') || hostname.includes('dev') || hostname.includes('staging');
    return isVersionControl ? 2 : 1; // ID 2 for version-control, ID 1 for production
  };
  
  const environmentId = getEnvironmentId();
  const environmentName = environmentId === 2 ? 'Version Control' : 'Production';

  // Load notes from database when popup opens
  useEffect(() => {
    if (isOpen) {
      loadNotesFromDatabase();
    }
  }, [isOpen]);

  // Reset local state when popup opens to ensure fresh data
  useEffect(() => {
    if (isOpen) {
      setHasChanges(false);
      setSaveStatus('idle');
    }
  }, [isOpen]);

  const loadNotesFromDatabase = async () => {
    setIsLoading(true);
    console.log(`🔄 Loading notes from database for ${environmentName} (ID: ${environmentId}) - ${isAdmin ? 'Admin' : 'User'}: ${userName}`);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/company_notes?id=eq.${environmentId}`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const notes = data.length > 0 ? data[0].notes_content || '' : '';
        const lastUpdatedBy = data.length > 0 ? data[0].updated_by : 'System';
        
        console.log(`✅ ${environmentName} notes loaded successfully. Last updated by: ${lastUpdatedBy}`);
        
        setNotesText(notes);
        setLocalNotesText(notes);
        setHasChanges(false);
        setSaveStatus('idle');
      } else {
        console.error('Failed to load notes:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNotesToDatabase = async () => {
    if (!isAdmin) return;
    
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      // First try to update existing record
      let response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/company_notes?id=eq.${environmentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          notes_content: localNotesText,
          updated_by: userName,
          updated_at: new Date().toISOString()
        })
      });

      // If no record exists, create one
      if (!response.ok && response.status === 404) {
        response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/company_notes`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            id: environmentId,
            notes_content: localNotesText,
            updated_by: userName,
            updated_at: new Date().toISOString()
          })
        });
      }

      if (response.ok) {
        setNotesText(localNotesText);
        setHasChanges(false);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
        console.log(`✅ Admin "${userName}" saved ${environmentName} notes to database (ID: ${environmentId})`);
      } else {
        console.error('Failed to save notes:', response.statusText);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalNotesText(e.target.value);
    setHasChanges(true);
    setSaveStatus('idle');
  };

  const handleSave = () => {
    saveNotesToDatabase();
  };

  const handleClose = () => {
    if (hasChanges && isAdmin) {
      saveNotesToDatabase();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in" onClick={handleClose}>
      <div
        className="p-8 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 animate-scale-in max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: visualConfig.colors.surface,
          color: visualConfig.colors.text.primary,
          borderRadius: visualConfig.patterns.componentShape === 'organic' ? '1.5rem' : '1rem'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold flex items-center gap-3">
            <Icons.StickyNote className="h-7 w-7" style={{ color: visualConfig.colors.primary }} />
            Your Notes from Us
            {isAdmin && <span className="text-sm font-normal px-3 py-1 rounded-full bg-yellow-500 text-black">ADMIN</span>}
          </h3>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button 
                onClick={loadNotesFromDatabase}
                disabled={isLoading}
                className="p-2 rounded-full hover:bg-gray-500/20 transition-colors"
                title="Refresh notes from database"
              >
                <Icons.RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-500/20 transition-colors">
              <Icons.X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Icons.Loader className="h-8 w-8 animate-spin mr-3" style={{ color: visualConfig.colors.primary }} />
            <span className="text-lg">Loading notes...</span>
          </div>
        ) : (
          <>
            {isAdmin ? (
              <>
                <p className="text-sm mb-6" style={{ color: visualConfig.colors.text.secondary }}>
                  Edit the notes that all users will see across the entire app. Changes are saved to the database.
                  <br />
                  <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs font-medium" 
                        style={{ 
                          backgroundColor: environmentId === 2 ? '#fbbf24' : '#10b981',
                          color: '#000'
                        }}>
                    📝 {environmentName} Environment
                  </span>
                </p>
                <textarea
                  value={localNotesText}
                  onChange={handleTextChange}
                  placeholder="Enter important notes for all users here..."
                  className="w-full px-4 py-3 rounded-xl resize-none transition-all duration-200 focus:ring-2 min-h-[300px]"
                  style={{
                    backgroundColor: visualConfig.colors.background,
                    color: visualConfig.colors.text.primary,
                    borderColor: visualConfig.colors.secondary,
                    '--tw-ring-color': visualConfig.colors.primary,
                    borderRadius: visualConfig.patterns.componentShape === 'organic' ? '1rem' : '0.5rem'
                  }}
                  disabled={isSaving}
                />
                <div className="flex justify-between items-center mt-6">
                  <div className="flex items-center gap-3">
                    {saveStatus === 'saved' && (
                      <div className="flex items-center gap-2 text-green-600">
                        <Icons.CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Saved to database!</span>
                      </div>
                    )}
                    {saveStatus === 'saving' && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Icons.Loader className="h-5 w-5 animate-spin" />
                        <span className="text-sm font-medium">Saving...</span>
                      </div>
                    )}
                    {saveStatus === 'error' && (
                      <div className="flex items-center gap-2 text-red-600">
                        <Icons.AlertCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Save failed</span>
                      </div>
                    )}
                    {hasChanges && saveStatus === 'idle' && (
                      <span className="text-sm text-orange-500 font-medium">Unsaved changes</span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      disabled={isSaving}
                      className="px-6 py-3 rounded-xl transition-colors disabled:opacity-50 font-medium"
                      style={{
                        backgroundColor: theme === 'light' ? '#e5e7eb' : '#374151',
                        color: visualConfig.colors.text.primary
                      }}
                    >
                      Close
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!hasChanges || isSaving}
                      className="px-6 py-3 rounded-xl text-white disabled:opacity-50 flex items-center gap-2 font-medium"
                      style={{
                        backgroundColor: visualConfig.colors.primary,
                        color: visualConfig.colors.text.onPrimary
                      }}
                    >
                      {isSaving ? (
                        <>
                          <Icons.Loader className="h-5 w-5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Icons.Save className="h-5 w-5" />
                          Save to Database
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm mb-6" style={{ color: visualConfig.colors.text.secondary }}>
                  Important information and updates from our team.
                </p>
                <div
                  className="p-6 rounded-xl min-h-[300px] whitespace-pre-wrap leading-relaxed"
                  style={{
                    backgroundColor: visualConfig.colors.background,
                    color: visualConfig.colors.text.primary,
                    borderRadius: visualConfig.patterns.componentShape === 'organic' ? '1rem' : '0.5rem'
                  }}
                >
                  {notesText || 'No notes available at this time.'}
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleClose}
                    className="px-6 py-3 rounded-xl transition-colors font-medium"
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
          </>
        )}
      </div>
    </div>
  );
};