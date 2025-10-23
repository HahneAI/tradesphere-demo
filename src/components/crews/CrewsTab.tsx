/**
 * Crews Tab Component - SKELETON IMPLEMENTATION
 *
 * TODO: Full implementation needed with:
 * - Crew creation and management wizard
 * - Crew member roster with role assignments
 * - Skill level tracking and certifications
 * - Crew availability calendar
 * - Performance metrics and analytics
 * - Assignment history and workload tracking
 * - Crew specialization management
 * - Equipment and vehicle assignments
 * - Cost tracking per crew
 * - Crew communication tools
 * - Mobile app integration for crew leads
 * - Time tracking and attendance
 * - Training and certification management
 * - Crew comparison and optimization tools
 *
 * @module CrewsTab
 */

import React from 'react';
import * as Icons from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../../config/industry';
import { hapticFeedback } from '../../utils/mobile-gestures';

interface CrewsTabProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Crews Tab - Skeleton Component
 * Full implementation planned for Phase 2
 */
export const CrewsTab: React.FC<CrewsTabProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);

  if (!isOpen) return null;

  const handleClose = () => {
    hapticFeedback.impact('light');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: visualConfig.colors.surface }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: visualConfig.colors.text.secondary + '20' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#F59E0B' + '20' }}
            >
              <Icons.Users
                className="h-6 w-6"
                style={{ color: '#F59E0B' }}
              />
            </div>
            <div>
              <h2
                className="text-2xl font-bold"
                style={{ color: visualConfig.colors.text.primary }}
              >
                Crew Management
              </h2>
              <p
                className="text-sm"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                Manage crews, members, and performance tracking
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg transition-colors hover:bg-opacity-10"
            style={{
              color: visualConfig.colors.text.secondary,
              backgroundColor: visualConfig.colors.text.secondary + '10'
            }}
          >
            <Icons.X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 88px)' }}>
          <div className="text-center max-w-2xl mx-auto">
            {/* Icon */}
            <div
              className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#F59E0B' + '10' }}
            >
              <Icons.Users
                className="h-12 w-12"
                style={{ color: '#F59E0B' }}
              />
            </div>

            {/* Title */}
            <h3
              className="text-3xl font-bold mb-4"
              style={{ color: visualConfig.colors.text.primary }}
            >
              Crew Management - Coming Soon
            </h3>

            {/* Description */}
            <p
              className="text-lg mb-8"
              style={{ color: visualConfig.colors.text.secondary }}
            >
              Comprehensive crew management tools are being developed to help you
              organize teams, track performance, and optimize workforce utilization.
            </p>

            {/* Feature List */}
            <div
              className="text-left p-6 rounded-xl mb-8"
              style={{ backgroundColor: visualConfig.colors.background }}
            >
              <h4
                className="font-semibold text-lg mb-4"
                style={{ color: visualConfig.colors.text.primary }}
              >
                Planned Features:
              </h4>
              <ul className="space-y-3">
                {[
                  'Crew creation wizard with team profiles',
                  'Member roster with role and skill tracking',
                  'Certification and training management',
                  'Crew availability and vacation calendars',
                  'Performance metrics and analytics dashboard',
                  'Assignment history and workload balancing',
                  'Specialization and service capability mapping',
                  'Equipment and vehicle assignment tracking',
                  'Labor cost analysis per crew',
                  'Built-in communication and messaging',
                  'Mobile app for crew leads and members',
                  'Time tracking and digital timesheets',
                  'Training module tracking and reminders',
                  'Crew comparison and optimization insights'
                ].map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3"
                    style={{ color: visualConfig.colors.text.secondary }}
                  >
                    <Icons.Check
                      className="h-5 w-5 flex-shrink-0 mt-0.5"
                      style={{ color: '#F59E0B' }}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div
              className="p-6 rounded-xl"
              style={{
                backgroundColor: '#F59E0B' + '10',
                border: '1px solid #F59E0B40'
              }}
            >
              <p
                className="text-sm mb-3"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                Implementation Status
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: '30%',
                    backgroundColor: '#F59E0B'
                  }}
                />
              </div>
              <p
                className="text-xs"
                style={{ color: visualConfig.colors.text.secondary }}
              >
                Database structure complete • Service layer in development
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrewsTab;
