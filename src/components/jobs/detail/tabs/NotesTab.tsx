/**
 * Job Notes Tab
 *
 * Timeline of notes and communications related to the job
 * Supports adding new notes, filtering by type, and viewing history
 *
 * @module NotesTab
 */

import React, { useState, useEffect, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { jobNotesService } from '../../../../services/JobNotesService';
import { formatDate } from '../../../../types/jobs-views';
import { hapticFeedback } from '../../../../utils/mobile-gestures';

interface NotesTabProps {
  jobId: string;
  companyId: string;
  userId: string;
  onUpdate: () => void;
  visualConfig: any;
  theme: any;
}

interface JobNote {
  id: string;
  subject: string;
  content: string;
  note_type: string;
  is_ai_generated: boolean;
  is_internal: boolean;
  created_at: string;
  created_by?: {
    name: string;
    user_icon?: string;
  };
}

/**
 * Notes Tab Component
 * Displays timeline of notes with ability to add new ones
 */
export const NotesTab: React.FC<NotesTabProps> = ({
  jobId,
  companyId,
  userId,
  onUpdate,
  visualConfig,
  theme
}) => {
  const [notes, setNotes] = useState<JobNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newNoteSubject, setNewNoteSubject] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  /**
   * Fetch notes
   */
  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await jobNotesService.getJobNotes(jobId);
      setNotes(data);
    } catch (err) {
      console.error('[NotesTab] Error fetching notes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  /**
   * Load notes on mount
   */
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  /**
   * Handle add note
   */
  const handleAddNote = useCallback(async () => {
    if (!newNoteSubject.trim() || !newNoteContent.trim()) {
      hapticFeedback.notification('warning');
      return;
    }

    setIsAdding(true);
    try {
      await jobNotesService.addJobNote(jobId, {
        subject: newNoteSubject.trim(),
        content: newNoteContent.trim(),
        note_type: 'general',
        is_internal: true,
        created_by_user_id: userId
      });

      // Clear form
      setNewNoteSubject('');
      setNewNoteContent('');
      hapticFeedback.notification('success');

      // Refresh notes
      await fetchNotes();
      onUpdate();
    } catch (err) {
      console.error('[NotesTab] Error adding note:', err);
      hapticFeedback.notification('error');
    } finally {
      setIsAdding(false);
    }
  }, [jobId, userId, newNoteSubject, newNoteContent, fetchNotes, onUpdate]);

  /**
   * Filter notes
   */
  const filteredNotes = notes.filter(note => {
    if (filterType === 'all') return true;
    if (filterType === 'manual') return !note.is_ai_generated;
    if (filterType === 'ai') return note.is_ai_generated;
    if (filterType === 'internal') return note.is_internal;
    if (filterType === 'customer') return !note.is_internal;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Add Note Section */}
      <div
        className="p-4 rounded-lg"
        style={{ backgroundColor: visualConfig.colors.surface }}
      >
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: visualConfig.colors.text.primary }}
        >
          Add Note
        </h3>

        <div className="space-y-3">
          {/* Subject */}
          <div>
            <label
              className="text-sm font-medium block mb-1"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              Subject
            </label>
            <input
              type="text"
              value={newNoteSubject}
              onChange={(e) => setNewNoteSubject(e.target.value)}
              placeholder="Brief summary..."
              className="w-full px-3 py-2 rounded-lg border outline-none"
              style={{
                backgroundColor: visualConfig.colors.background,
                borderColor: visualConfig.colors.text.secondary + '30',
                color: visualConfig.colors.text.primary
              }}
            />
          </div>

          {/* Content */}
          <div>
            <label
              className="text-sm font-medium block mb-1"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              Note Content
            </label>
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Add details..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg border outline-none resize-none"
              style={{
                backgroundColor: visualConfig.colors.background,
                borderColor: visualConfig.colors.text.secondary + '30',
                color: visualConfig.colors.text.primary
              }}
            />
          </div>

          {/* Add Button */}
          <button
            onClick={handleAddNote}
            disabled={isAdding || !newNoteSubject.trim() || !newNoteContent.trim()}
            className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
            style={{
              backgroundColor: visualConfig.colors.primary,
              color: visualConfig.colors.text.onPrimary,
              opacity: (isAdding || !newNoteSubject.trim() || !newNoteContent.trim()) ? 0.5 : 1
            }}
          >
            {isAdding ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2" />
                <span>Adding...</span>
              </>
            ) : (
              <>
                <Icons.Plus size={18} />
                <span>Add Note</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: 'all', label: 'All Notes' },
          { id: 'manual', label: 'Manual' },
          { id: 'ai', label: 'AI Generated' },
          { id: 'internal', label: 'Internal' },
          { id: 'customer', label: 'Customer Facing' }
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setFilterType(filter.id)}
            className="px-3 py-1.5 text-sm font-medium rounded-lg transition-all"
            style={{
              backgroundColor: filterType === filter.id
                ? visualConfig.colors.primary
                : visualConfig.colors.surface,
              color: filterType === filter.id
                ? visualConfig.colors.text.onPrimary
                : visualConfig.colors.text.secondary
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Notes Timeline */}
      <div>
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: visualConfig.colors.text.primary }}
        >
          Notes Timeline
        </h3>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2"
              style={{ borderColor: visualConfig.colors.primary }}
            />
            <p style={{ color: visualConfig.colors.text.secondary }}>
              Loading notes...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredNotes.length === 0 && (
          <div
            className="text-center py-12 rounded-lg"
            style={{ backgroundColor: visualConfig.colors.surface }}
          >
            <Icons.MessageSquare
              className="h-12 w-12 mx-auto mb-4"
              style={{ color: visualConfig.colors.text.secondary }}
            />
            <p
              className="text-lg font-medium mb-2"
              style={{ color: visualConfig.colors.text.primary }}
            >
              No Notes Yet
            </p>
            <p
              className="text-sm"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              {filterType !== 'all'
                ? 'No notes match the selected filter'
                : 'Add your first note above'}
            </p>
          </div>
        )}

        {/* Notes List */}
        {!isLoading && filteredNotes.length > 0 && (
          <div className="space-y-4">
            {filteredNotes.map((note, index) => (
              <div
                key={note.id}
                className="p-4 rounded-lg"
                style={{ backgroundColor: visualConfig.colors.surface }}
              >
                {/* Note Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {note.is_ai_generated ? (
                      <Icons.Bot size={18} style={{ color: visualConfig.colors.primary }} />
                    ) : (
                      <Icons.User size={18} style={{ color: visualConfig.colors.text.secondary }} />
                    )}
                    <h4
                      className="font-medium"
                      style={{ color: visualConfig.colors.text.primary }}
                    >
                      {note.subject}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {note.is_internal && (
                      <span
                        className="px-2 py-0.5 text-xs font-semibold rounded"
                        style={{
                          backgroundColor: visualConfig.colors.text.secondary + '20',
                          color: visualConfig.colors.text.secondary
                        }}
                      >
                        Internal
                      </span>
                    )}
                  </div>
                </div>

                {/* Note Content */}
                <p
                  className="text-sm mb-3 whitespace-pre-wrap"
                  style={{ color: visualConfig.colors.text.primary }}
                >
                  {note.content}
                </p>

                {/* Note Footer */}
                <div className="flex items-center gap-2 text-xs" style={{ color: visualConfig.colors.text.secondary }}>
                  <span>{note.created_by?.name || 'Unknown'}</span>
                  <span>•</span>
                  <span>{formatDate(note.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesTab;
