import { createPortal } from 'react-dom';
import type { NodeStatus } from '@kanban/shared';

interface NodePopupData {
  title: string;
  status: NodeStatus;
  description?: string;
  notes?: string;
  deadline?: string | null;
}

const STATUS_STYLE: Record<NodeStatus, { text: string; icon: string; label: string }> = {
  locked:      { text: 'text-gray-400 dark:text-nord-muted',   icon: '🔒', label: 'locked' },
  unlocked:    { text: 'text-blue-600 dark:text-nord-accent',  icon: '○',  label: 'ready' },
  in_progress: { text: 'text-amber-600 dark:text-nord-yellow', icon: '◐',  label: 'in progress' },
  done:        { text: 'text-green-600 dark:text-nord-green',  icon: '✓',  label: 'done' },
};

interface NodePopupProps {
  node: NodePopupData;
  anchorRect: DOMRect;
}

export function NodePopup({ node, anchorRect }: NodePopupProps) {
  const { text, icon, label } = STATUS_STYLE[node.status];
  const hasDetails = node.description || node.notes || node.deadline;

  const popupWidth = 288; // w-72
  const fitsRight = anchorRect.right + 12 + popupWidth < window.innerWidth;
  const fitsLeft = anchorRect.left - popupWidth - 12 > 0;

  let left: number;
  let top: number;
  if (fitsRight) {
    left = anchorRect.right + 12;
    top = anchorRect.top;
  } else if (fitsLeft) {
    left = anchorRect.left - popupWidth - 12;
    top = anchorRect.top;
  } else {
    left = Math.max(8, anchorRect.left);
    top = anchorRect.bottom + 8;
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 99999,
      }}
      className="w-72 bg-white dark:bg-nord-surface rounded-lg border border-gray-200 dark:border-nord-border shadow-lg p-3 pointer-events-none"
    >
      <div className="text-sm font-medium text-gray-800 dark:text-nord-text mb-1">{node.title}</div>
      <div className={`text-xs mb-2 ${text}`}>
        {icon} {label}
      </div>
      {node.description && (
        <div className="text-xs text-gray-600 dark:text-nord-text mb-1.5 whitespace-pre-wrap">
          {node.description}
        </div>
      )}
      {node.notes && (
        <div className="text-xs text-gray-600 dark:text-nord-text mb-1.5 whitespace-pre-wrap">
          {node.notes}
        </div>
      )}
      {node.deadline && (
        <div className="text-xs text-gray-400 dark:text-nord-muted">
          Due: {new Date(node.deadline).toLocaleDateString()}
        </div>
      )}
      {!hasDetails && (
        <div className="text-xs text-gray-400 dark:text-nord-muted italic">No details yet</div>
      )}
    </div>,
    document.body
  );
}
