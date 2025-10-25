/**
 * ConflictBadge Component
 *
 * Visual indicator for scheduling conflicts on job blocks
 * Shows conflict severity (error/warning) and count
 *
 * @module ConflictBadge
 */

import React from 'react';
import * as Icons from 'lucide-react';
import { ConflictSeverity } from '../../../utils/conflictDetection';

export interface ConflictBadgeProps {
  severity: ConflictSeverity;
  conflictCount: number;
  onClick?: (e: React.MouseEvent) => void;
  visualConfig: any;
}

/**
 * Badge component showing conflict status on job blocks
 * Displays icon and count with severity-based styling
 */
export const ConflictBadge: React.FC<ConflictBadgeProps> = ({
  severity,
  conflictCount,
  onClick,
  visualConfig
}) => {
  const isError = severity === 'error';
  const bgColor = isError ? '#EF4444' : '#F59E0B'; // Red for errors, amber for warnings
  const icon = isError ? Icons.AlertCircle : Icons.AlertTriangle;
  const IconComponent = icon;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="conflict-badge"
      style={{
        position: 'absolute',
        top: '4px',
        right: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: '12px',
        backgroundColor: bgColor,
        color: '#FFFFFF',
        fontSize: '11px',
        fontWeight: 600,
        cursor: onClick ? 'pointer' : 'default',
        zIndex: 10,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        animation: isError ? 'conflictPulse 2s ease-in-out infinite' : 'none'
      }}
      title={`${conflictCount} conflict${conflictCount > 1 ? 's' : ''} detected`}
    >
      <IconComponent size={12} />
      <span>{conflictCount}</span>
    </div>
  );
};

export default ConflictBadge;
