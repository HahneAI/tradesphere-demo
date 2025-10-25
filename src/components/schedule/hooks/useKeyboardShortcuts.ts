/**
 * Keyboard Shortcuts Hook
 *
 * Provides keyboard navigation and actions for the scheduling calendar.
 *
 * Shortcuts:
 * - Navigation: ← / → (prev/next week), T (today), Esc (close modals)
 * - Actions: N (new job), F (focus search), ? (show help)
 *
 * @module useKeyboardShortcuts
 */

import { useEffect } from 'react';

export interface UseKeyboardShortcutsProps {
  /** Navigate to previous week */
  onPreviousWeek: () => void;
  /** Navigate to next week */
  onNextWeek: () => void;
  /** Jump to current week */
  onToday: () => void;
  /** Close all open modals/menus */
  onCloseModals: () => void;
  /** Open new job wizard (optional) */
  onNewJob?: () => void;
  /** Focus search/filter input (optional) */
  onFocusSearch?: () => void;
  /** Show keyboard shortcuts help modal */
  onShowHelp: () => void;
  /** Whether shortcuts are enabled (only when ScheduleTab is active) */
  enabled: boolean;
}

/**
 * Custom hook for handling keyboard shortcuts in the scheduling calendar
 */
export const useKeyboardShortcuts = ({
  onPreviousWeek,
  onNextWeek,
  onToday,
  onCloseModals,
  onNewJob,
  onFocusSearch,
  onShowHelp,
  enabled
}: UseKeyboardShortcutsProps): void => {
  useEffect(() => {
    // Don't attach listeners if disabled
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Allow Escape even in input fields
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseModals();
        return;
      }

      // Ignore other shortcuts if in input field
      if (isInputField) return;

      // Ignore if modifier keys are pressed (Ctrl, Cmd, Alt)
      // This prevents conflicts with browser shortcuts
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          onPreviousWeek();
          break;

        case 'ArrowRight':
          event.preventDefault();
          onNextWeek();
          break;

        case 't':
        case 'T':
          event.preventDefault();
          onToday();
          break;

        case 'n':
        case 'N':
          if (onNewJob) {
            event.preventDefault();
            onNewJob();
          }
          break;

        case 'f':
        case 'F':
          if (onFocusSearch) {
            event.preventDefault();
            onFocusSearch();
          }
          break;

        case '?':
          event.preventDefault();
          onShowHelp();
          break;

        default:
          // No action for other keys
          break;
      }
    };

    // Attach event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enabled,
    onPreviousWeek,
    onNextWeek,
    onToday,
    onCloseModals,
    onNewJob,
    onFocusSearch,
    onShowHelp
  ]);
};
