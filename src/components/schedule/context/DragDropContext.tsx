import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { CalendarJobBlock } from '../../../types/jobs-views';

/**
 * Drag-and-drop context for scheduling calendar
 * Manages drag state and provides handlers for job assignment
 */

interface DragDropContextValue {
  // Drag state
  draggedJob: CalendarJobBlock | null;
  isDragging: boolean;
  sourceCrewId: string | null;

  // Drop target highlighting
  dropTarget: { crewId: string; date: Date } | null;
  setDropTarget: (target: { crewId: string; date: Date } | null) => void;

  // Drag handlers
  startDrag: (job: CalendarJobBlock, sourceCrewId: string | null) => void;
  endDrag: () => void;

  // Drop handler (provided by parent)
  onDrop: (jobId: string, crewId: string, dropDate: Date) => Promise<void>;
}

const DragDropContext = createContext<DragDropContextValue | undefined>(undefined);

interface DragDropProviderProps {
  children: ReactNode;
  onDrop: (jobId: string, crewId: string, dropDate: Date) => Promise<void>;
}

export const DragDropProvider: React.FC<DragDropProviderProps> = ({ children, onDrop }) => {
  const [draggedJob, setDraggedJob] = useState<CalendarJobBlock | null>(null);
  const [sourceCrewId, setSourceCrewId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ crewId: string; date: Date } | null>(null);

  const startDrag = useCallback((job: CalendarJobBlock, sourceCrewId: string | null) => {
    setDraggedJob(job);
    setSourceCrewId(sourceCrewId);
  }, []);

  const endDrag = useCallback(() => {
    setDraggedJob(null);
    setSourceCrewId(null);
    setDropTarget(null);
  }, []);

  const value: DragDropContextValue = {
    draggedJob,
    isDragging: draggedJob !== null,
    sourceCrewId,
    dropTarget,
    setDropTarget,
    startDrag,
    endDrag,
    onDrop,
  };

  return (
    <DragDropContext.Provider value={value}>
      {children}
    </DragDropContext.Provider>
  );
};

export const useDragDrop = (): DragDropContextValue => {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider');
  }
  return context;
};
