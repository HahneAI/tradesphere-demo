/**
 * Jobs Tab Component
 *
 * Full-screen jobs management interface with 3 view patterns
 * Delegates to JobsPage component for full implementation
 *
 * @module JobsTab
 */

import React from 'react';
import { JobsPage } from './JobsPage';

interface JobsTabProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Jobs Tab - Wrapper Component
 * Routes to full JobsPage implementation
 */
export const JobsTab: React.FC<JobsTabProps> = ({ isOpen, onClose }) => {
  return <JobsPage isOpen={isOpen} onClose={onClose} />;
};

export default JobsTab;
