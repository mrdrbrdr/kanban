import type { MouseEvent } from 'react';
import type { NodeStatus } from '@kanban/shared';
import { useShiftHoverPopup } from '../../hooks/useShiftHoverPopup';
import { STATUS_ICON } from '../../lib/statusIcons';
import { NodePopup } from '../NodePopup';

export interface DepInfo {
  nodeId: string;
  title: string;
  status: NodeStatus;
}

const NEXT_STATUS: Partial<Record<NodeStatus, NodeStatus>> = {
  unlocked: 'in_progress',
  in_progress: 'done',
  done: 'unlocked',
};

const DEP_STYLE: Record<NodeStatus, { text: string; icon: string }> = {
  done:        { text: 'text-green-600 dark:text-nord-green',   icon: '✓' },
  in_progress: { text: 'text-amber-600 dark:text-nord-yellow',  icon: '◐' },
  unlocked:    { text: 'text-gray-400 dark:text-nord-muted',    icon: '🔒' },
  locked:      { text: 'text-gray-400 dark:text-nord-muted',    icon: '🔒' },
};

const DEP_SORT_ORDER: Record<NodeStatus, number> = {
  done: 0, in_progress: 1, unlocked: 2, locked: 3,
};

interface NodeRowProps {
  id: string;
  title: string;
  status: NodeStatus;
  description?: string;
  notes?: string;
  deadline: string | null;
  isSelected: boolean;
  onSelect: () => void;
  onStatusChange?: (status: NodeStatus) => void;
  deps: DepInfo[];
  onDepClick: (nodeId: string) => void;
}

export function NodeRow({ id, title, status, description, notes, deadline, isSelected, onSelect, onStatusChange, deps, onDepClick }: NodeRowProps) {
  const canCycle = status !== 'locked' && onStatusChange;
  const { popupRect, handlers: popupHandlers } = useShiftHoverPopup();

  const sortedDeps = [...deps].sort((a, b) => DEP_SORT_ORDER[a.status] - DEP_SORT_ORDER[b.status]);

  function handleStatusClick(e: MouseEvent) {
    e.stopPropagation();
    if (canCycle) onStatusChange(NEXT_STATUS[status]!);
  }

  return (
    <div
      id={`node-row-${id}`}
      onClick={onSelect}
      {...popupHandlers}
      className={`flex items-start gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
        isSelected
          ? 'bg-blue-50 dark:bg-nord-accent/10 ring-1 ring-blue-300 dark:ring-nord-accent/40'
          : 'hover:bg-gray-50 dark:hover:bg-nord-hover'
      }`}
    >
      <span
        onClick={handleStatusClick}
        className={`text-sm mt-0.5 shrink-0 ${canCycle ? 'cursor-pointer hover:scale-125 transition-transform' : ''}`}
        title={canCycle ? `Click to mark ${NEXT_STATUS[status]}` : status}
      >
        {STATUS_ICON[status]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-mono text-gray-400 dark:text-nord-muted/70 border border-gray-300 dark:border-nord-border px-1 py-0.5 rounded shrink-0 leading-none select-all">{id}</span>
            <span className={`text-sm truncate ${status === 'done' ? 'line-through text-gray-400 dark:text-nord-muted' : 'text-gray-800 dark:text-nord-text'}`}>
              {title}
            </span>
          </div>
          {deadline && (
            <span className="text-[11px] text-gray-400 dark:text-nord-muted whitespace-nowrap shrink-0">
              {deadline}
            </span>
          )}
        </div>
        {sortedDeps.length > 0 && (
          <div className="mt-1.5 ml-1 pl-3 flex flex-col gap-1 border-l-2 border-gray-200 dark:border-nord-border">
            {sortedDeps.map((dep) => {
              const style = DEP_STYLE[dep.status];
              return (
                <button
                  key={dep.nodeId}
                  onClick={(e) => { e.stopPropagation(); onDepClick(dep.nodeId); }}
                  className={`text-left text-xs hover:underline flex items-center gap-1.5 ${style.text}`}
                >
                  <span className="shrink-0 text-[11px]">{style.icon}</span>
                  <span>{dep.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {popupRect && <NodePopup node={{ title, status, description, notes, deadline }} anchorRect={popupRect} />}
    </div>
  );
}
