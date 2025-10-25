/**
 * Keyboard Shortcuts Help Modal
 *
 * Modal displaying all available keyboard shortcuts organized by category.
 * Triggered by pressing "?" key.
 *
 * @module KeyboardShortcutsHelp
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as Icons from 'lucide-react';
import { SmartVisualThemeConfig } from '../../../config/industry';

export interface KeyboardShortcut {
  category: 'Navigation' | 'Actions';
  keys: string[];
  description: string;
}

export interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  visualConfig: SmartVisualThemeConfig;
  theme: string;
}

const shortcuts: KeyboardShortcut[] = [
  // Navigation
  { category: 'Navigation', keys: ['←', '→'], description: 'Previous/Next week' },
  { category: 'Navigation', keys: ['T'], description: 'Jump to Today' },
  { category: 'Navigation', keys: ['Esc'], description: 'Close modals/menus' },

  // Actions
  { category: 'Actions', keys: ['N'], description: 'New job (coming soon)' },
  { category: 'Actions', keys: ['F'], description: 'Focus search/filter' },
  { category: 'Actions', keys: ['?'], description: 'Show keyboard shortcuts' }
];

/**
 * Keyboard Shortcuts Help Modal Component
 */
export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
  visualConfig,
  theme
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and initial focus
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '16px',
        animation: 'backdropFadeIn 200ms ease-out'
      }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
    >
      <div
        ref={modalRef}
        style={{
          backgroundColor: visualConfig.colors.surface,
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'modalSlideIn 250ms ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px',
            borderBottom: `1px solid ${visualConfig.colors.text.secondary}20`
          }}
        >
          <h2
            id="shortcuts-modal-title"
            style={{
              fontSize: '20px',
              fontWeight: '700',
              color: visualConfig.colors.text.primary,
              margin: 0
            }}
          >
            Keyboard Shortcuts
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: visualConfig.colors.text.secondary,
              cursor: 'pointer',
              transition: 'all 150ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${visualConfig.colors.text.secondary}1A`;
              e.currentTarget.style.color = visualConfig.colors.text.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = visualConfig.colors.text.secondary;
            }}
            aria-label="Close keyboard shortcuts help"
          >
            <Icons.X size={20} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px'
            }}
          >
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div
                key={category}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: visualConfig.colors.text.secondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '4px'
                  }}
                >
                  {category}
                </h3>
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '8px 0'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        minWidth: '80px'
                      }}
                    >
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          {keyIndex > 0 && (
                            <span
                              style={{
                                fontSize: '12px',
                                color: visualConfig.colors.text.secondary,
                                margin: '0 2px'
                              }}
                            >
                              /
                            </span>
                          )}
                          <kbd
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: visualConfig.colors.background,
                              border: `1px solid ${visualConfig.colors.text.secondary}20`,
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontFamily: 'monospace',
                              fontSize: '14px',
                              fontWeight: '600',
                              color: visualConfig.colors.text.primary,
                              minWidth: '32px',
                              textAlign: 'center',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                            }}
                          >
                            {key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                    <span
                      style={{
                        fontSize: '14px',
                        color: visualConfig.colors.text.secondary,
                        flex: 1
                      }}
                    >
                      {shortcut.description}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
