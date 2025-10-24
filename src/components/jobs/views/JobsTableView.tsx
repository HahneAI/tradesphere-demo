/**
 * Jobs Table View
 *
 * Data-dense sortable table with filtering and pagination
 * - Sortable columns
 * - Multi-select for bulk operations
 * - Inline actions dropdown
 * - Pagination controls
 *
 * @module JobsTableView
 */

import React, { useState, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { JobListItem } from '../../../types/crm';
import { StatusBadge } from '../shared/StatusBadge';
import { PriorityIndicator } from '../shared/PriorityIndicator';
import { formatCurrency, formatDate } from '../../../types/jobs-views';
import { hapticFeedback } from '../../../utils/mobile-gestures';

interface JobsTableViewProps {
  jobs: JobListItem[];
  onRefresh: () => void;
  visualConfig: any;
  theme: 'light' | 'dark';
}

type SortColumn = 'job_number' | 'customer_name' | 'title' | 'status' | 'priority' | 'estimated_total' | 'scheduled_start_date' | 'created_at';
type SortDirection = 'asc' | 'desc';

/**
 * Table View Component
 * Sortable, paginated list of jobs
 */
export const JobsTableView: React.FC<JobsTableViewProps> = ({
  jobs,
  onRefresh,
  visualConfig,
  theme
}) => {
  // Sort state
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);

  // Selection state
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  /**
   * Handle sort column change
   */
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    hapticFeedback.selection();
  };

  /**
   * Sort jobs
   */
  const sortedJobs = useMemo(() => {
    const sorted = [...jobs].sort((a, b) => {
      let aVal: any = a[sortColumn];
      let bVal: any = b[sortColumn];

      // Handle null values
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Handle different data types
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return sorted;
  }, [jobs, sortColumn, sortDirection]);

  /**
   * Paginate jobs
   */
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedJobs.slice(startIndex, endIndex);
  }, [sortedJobs, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedJobs.length / pageSize);

  /**
   * Handle row selection
   */
  const handleSelectRow = (jobId: string) => {
    setSelectedJobIds(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
    hapticFeedback.selection();
  };

  /**
   * Handle select all
   */
  const handleSelectAll = () => {
    if (selectedJobIds.size === paginatedJobs.length) {
      setSelectedJobIds(new Set());
    } else {
      setSelectedJobIds(new Set(paginatedJobs.map(j => j.id)));
    }
    hapticFeedback.selection();
  };

  /**
   * Handle row click
   */
  const handleRowClick = (jobId: string) => {
    hapticFeedback.selection();
    console.log('[Table] Row clicked:', jobId);
    // TODO: Open job detail modal
  };

  /**
   * Handle action click
   */
  const handleActionClick = (action: string, jobId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    hapticFeedback.selection();
    console.log('[Table] Action clicked:', action, jobId);
    // TODO: Implement actions (edit, duplicate, delete)
  };

  /**
   * Render sortable column header
   */
  const renderColumnHeader = (column: SortColumn, label: string, align: 'left' | 'center' | 'right' = 'left') => {
    const isSorted = sortColumn === column;

    return (
      <th
        onClick={() => handleSort(column)}
        className={`px-4 py-3 cursor-pointer hover:bg-opacity-50 transition-colors select-none ${
          align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
        }`}
        style={{
          backgroundColor: isSorted ? visualConfig.colors.primary + '10' : 'transparent',
          color: visualConfig.colors.text.secondary
        }}
      >
        <div className={`flex items-center gap-2 ${
          align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''
        }`}>
          <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
          {isSorted && (
            sortDirection === 'asc' ? (
              <Icons.ChevronUp size={14} />
            ) : (
              <Icons.ChevronDown size={14} />
            )
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Bulk actions bar (when items selected) */}
      {selectedJobIds.size > 0 && (
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{
            backgroundColor: visualConfig.colors.primary + '10',
            borderColor: visualConfig.colors.primary + '30'
          }}
        >
          <span
            className="font-medium"
            style={{ color: visualConfig.colors.primary }}
          >
            {selectedJobIds.size} job{selectedJobIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => console.log('[Table] Bulk action: Change status')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: visualConfig.colors.surface,
                color: visualConfig.colors.text.primary
              }}
            >
              Change Status
            </button>
            <button
              onClick={() => console.log('[Table] Bulk action: Assign crew')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: visualConfig.colors.surface,
                color: visualConfig.colors.text.primary
              }}
            >
              Assign Crew
            </button>
            <button
              onClick={() => setSelectedJobIds(new Set())}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                color: visualConfig.colors.text.secondary
              }}
            >
              <Icons.X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead
            className="sticky top-0 z-10 border-b"
            style={{
              backgroundColor: visualConfig.colors.surface,
              borderColor: visualConfig.colors.text.secondary + '30'
            }}
          >
            <tr>
              {/* Checkbox column */}
              <th className="px-4 py-3 w-12">
                <input
                  type="checkbox"
                  checked={selectedJobIds.size === paginatedJobs.length && paginatedJobs.length > 0}
                  onChange={handleSelectAll}
                  className="cursor-pointer"
                  style={{ accentColor: visualConfig.colors.primary }}
                />
              </th>

              {/* Sortable columns */}
              {renderColumnHeader('job_number', 'Job #')}
              {renderColumnHeader('customer_name', 'Customer')}
              {renderColumnHeader('title', 'Title')}
              {renderColumnHeader('status', 'Status')}
              {renderColumnHeader('priority', 'Priority', 'center')}
              {renderColumnHeader('estimated_total', 'Value', 'right')}
              {renderColumnHeader('scheduled_start_date', 'Start Date')}
              {renderColumnHeader('created_at', 'Created')}

              {/* Actions column */}
              <th className="px-4 py-3 w-20 text-center">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: visualConfig.colors.text.secondary }}>
                  Actions
                </span>
              </th>
            </tr>
          </thead>

          <tbody>
            {paginatedJobs.map(job => (
              <tr
                key={job.id}
                onClick={() => handleRowClick(job.id)}
                className="border-b cursor-pointer hover:bg-opacity-50 transition-colors"
                style={{
                  borderColor: visualConfig.colors.text.secondary + '10'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = visualConfig.colors.text.secondary + '05';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {/* Checkbox */}
                <td
                  className="px-4 py-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedJobIds.has(job.id)}
                    onChange={() => handleSelectRow(job.id)}
                    className="cursor-pointer"
                    style={{ accentColor: visualConfig.colors.primary }}
                  />
                </td>

                {/* Job number */}
                <td className="px-4 py-3">
                  <span
                    className="font-mono font-semibold text-sm"
                    style={{ color: visualConfig.colors.primary }}
                  >
                    {job.job_number}
                  </span>
                </td>

                {/* Customer name */}
                <td className="px-4 py-3">
                  <div>
                    <p
                      className="font-medium text-sm"
                      style={{ color: visualConfig.colors.text.primary }}
                    >
                      {job.customer_name}
                    </p>
                    {job.service_address && (
                      <p
                        className="text-xs mt-0.5 truncate max-w-xs"
                        style={{ color: visualConfig.colors.text.secondary }}
                      >
                        {job.service_address}
                      </p>
                    )}
                  </div>
                </td>

                {/* Title */}
                <td className="px-4 py-3">
                  <p
                    className="text-sm line-clamp-2 max-w-md"
                    style={{ color: visualConfig.colors.text.primary }}
                  >
                    {job.title}
                  </p>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <StatusBadge status={job.status} size="sm" />
                </td>

                {/* Priority */}
                <td className="px-4 py-3 text-center">
                  <PriorityIndicator
                    priority={job.priority}
                    variant="dot"
                    size="md"
                  />
                </td>

                {/* Estimated total */}
                <td className="px-4 py-3 text-right">
                  <span
                    className="font-semibold text-sm"
                    style={{ color: visualConfig.colors.text.primary }}
                  >
                    {formatCurrency(job.estimated_total)}
                  </span>
                </td>

                {/* Scheduled start */}
                <td className="px-4 py-3">
                  <span
                    className="text-sm"
                    style={{ color: visualConfig.colors.text.secondary }}
                  >
                    {formatDate(job.scheduled_start_date)}
                  </span>
                </td>

                {/* Created date */}
                <td className="px-4 py-3">
                  <span
                    className="text-sm"
                    style={{ color: visualConfig.colors.text.secondary }}
                  >
                    {formatDate(job.created_at)}
                  </span>
                </td>

                {/* Actions */}
                <td
                  className="px-4 py-3 text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="p-1.5 rounded-lg hover:bg-opacity-50 transition-colors"
                    style={{ color: visualConfig.colors.text.secondary }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Show actions dropdown
                      console.log('[Table] Actions menu:', job.id);
                    }}
                  >
                    <Icons.MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        className="px-4 py-3 border-t flex items-center justify-between"
        style={{
          backgroundColor: visualConfig.colors.surface,
          borderColor: visualConfig.colors.text.secondary + '20'
        }}
      >
        {/* Page info */}
        <div
          className="text-sm"
          style={{ color: visualConfig.colors.text.secondary }}
        >
          Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, sortedJobs.length)} of {sortedJobs.length} jobs
        </div>

        {/* Page controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              color: visualConfig.colors.text.secondary
            }}
          >
            <Icons.ChevronsLeft size={18} />
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              color: visualConfig.colors.text.secondary
            }}
          >
            <Icons.ChevronLeft size={18} />
          </button>

          <span
            className="text-sm font-medium px-3"
            style={{ color: visualConfig.colors.text.primary }}
          >
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              color: visualConfig.colors.text.secondary
            }}
          >
            <Icons.ChevronRight size={18} />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              color: visualConfig.colors.text.secondary
            }}
          >
            <Icons.ChevronsRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobsTableView;
