/**
 * Context Menu Component
 *
 * Right-click menu for job blocks with quick actions.
 *
 * Actions:
 * - View Details: Open JobDetailModal
 * - Reschedule: Show inline date picker (placeholder)
 * - Change Crew: Show crew selector (placeholder)
 * - Mark Completed: Update job status
 * - Remove Assignment: Cancel job assignment
 * - Copy Job Number: Copy to clipboard
 *
 * @module ContextMenu
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Icons from 'lucide-react';
import { SmartVisualThemeConfig } from '../../../config/industry';
import { hapticFeedback } from '../../../utils/mobile-gestures';

export interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  jobId: string;
  jobNumber: string;
  onClose: () => void;
  onViewDetails: () => void;
  onReschedule: () => void;
  onChangeCrew: () => void;
  onMarkCompleted: () => void;
  onRemoveAssignment: () => void;
  visualConfig: SmartVisualThemeConfig;
  theme: string;
}

interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  visualConfig: SmartVisualThemeConfig;
}

/**
 * Individual menu item component
 */
const MenuItem: React.FC<MenuItemProps> = ({
  icon: Icon,
  label,
  onClick,
  destructive = false,
  visualConfig
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    hapticFeedback.impact('light');
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        height: '44px',
        padding: '0 12px',
        borderRadius: '6px',
        backgroundColor: isHovered
          ? `${visualConfig.colors.primary}1A`
          : 'transparent',
        color: destructive ? '#EF4444' : visualConfig.colors.text.primary,
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        border: 'none',
        width: '100%',
        textAlign: 'left',
        transition: 'all 100ms ease-in-out',
        transform: isHovered ? 'translateX(2px)' : 'none'
      }}
      role="menuitem"
      tabIndex={-1}
    >
      <Icon size={16} strokeWidth={2} />
      <span>{label}</span>
    </button>
  );
};

/**
 * Calculate menu position to stay within viewport
 */
const calculatePosition = (
  clickPosition: { x: number; y: number },
  menuWidth: number = 220,
  menuHeight: number = 300
): { top: number; left: number; transformOrigin: string } => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = 8;

  let top = clickPosition.y;
  let left = clickPosition.x;
  let transformOrigin = 'top left';

  // Flip horizontally if near right edge
  if (clickPosition.x + menuWidth + margin > viewportWidth) {
    left = clickPosition.x - menuWidth;
    transformOrigin = 'top right';
  }

  // Flip vertically if near bottom
  if (clickPosition.y + menuHeight + margin > viewportHeight) {
    top = clickPosition.y - menuHeight;
    transformOrigin = transformOrigin.replace('top', 'bottom');
  }

  // Ensure minimum margins
  top = Math.max(margin, Math.min(top, viewportHeight - menuHeight - margin));
  left = Math.max(margin, Math.min(left, viewportWidth - menuWidth - margin));

  return { top, left, transformOrigin };
};

/**
 * Context Menu Component
 */
export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  jobId,
  jobNumber,
  onClose,
  onViewDetails,
  onReschedule,
  onChangeCrew,
  onMarkCompleted,
  onRemoveAssignment,
  visualConfig,
  theme
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, transformOrigin: 'top left' });

  // Calculate position on open
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const calculatedPosition = calculatePosition(position, rect.width, rect.height);
      setMenuPosition(calculatedPosition);
    }
  }, [isOpen, position]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Small delay to prevent immediate close from the right-click that opened it
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

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

  // Handle copy to clipboard
  const handleCopyJobNumber = async () => {
    try {
      await navigator.clipboard.writeText(jobNumber);
      hapticFeedback.notification('success');
      onClose();
    } catch (error) {
      console.error('Failed to copy job number:', error);
      hapticFeedback.notification('error');
    }
  };

  if (!isOpen) return null;

  const menuContent = (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
        backgroundColor: visualConfig.colors.elevated,
        borderRadius: '8px',
        border: `1px solid ${visualConfig.colors.text.secondary}20`,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        padding: '8px',
        minWidth: '220px',
        zIndex: 1000,
        transformOrigin: menuPosition.transformOrigin,
        animation: 'contextMenuFadeIn 150ms ease-out'
      }}
      role="menu"
      aria-orientation="vertical"
    >
      <MenuItem
        icon={Icons.Eye}
        label="View Details"
        onClick={onViewDetails}
        visualConfig={visualConfig}
      />
      <MenuItem
        icon={Icons.Calendar}
        label="Reschedule..."
        onClick={onReschedule}
        visualConfig={visualConfig}
      />
      <MenuItem
        icon={Icons.Users}
        label="Change Crew..."
        onClick={onChangeCrew}
        visualConfig={visualConfig}
      />

      {/* Divider */}
      <div
        style={{
          height: '1px',
          backgroundColor: `${visualConfig.colors.text.secondary}20`,
          margin: '4px 0'
        }}
      />

      <MenuItem
        icon={Icons.CheckCircle}
        label="Mark Completed"
        onClick={onMarkCompleted}
        visualConfig={visualConfig}
      />
      <MenuItem
        icon={Icons.XCircle}
        label="Remove Assignment"
        onClick={onRemoveAssignment}
        destructive
        visualConfig={visualConfig}
      />

      {/* Divider */}
      <div
        style={{
          height: '1px',
          backgroundColor: `${visualConfig.colors.text.secondary}20`,
          margin: '4px 0'
        }}
      />

      <MenuItem
        icon={Icons.Copy}
        label="Copy Job Number"
        onClick={handleCopyJobNumber}
        visualConfig={visualConfig}
      />
    </div>
  );

  return createPortal(menuContent, document.body);
};
