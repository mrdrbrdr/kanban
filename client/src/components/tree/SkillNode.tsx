import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeStatus, TreeNode } from '@kanban/shared';
import { useShiftHoverPopup } from '../../hooks/useShiftHoverPopup';
import { NodePopup } from '../NodePopup';
import { AssigneeIcon } from '../AssigneeIcon';

interface StatusStyle {
  border: string;
  bg: string;
  text: string;
  icon: string;
  label: string;
  opacity: string;
  shadow: string;
}

const statusConfig: Record<NodeStatus, StatusStyle> = {
  locked: {
    border: 'border-gray-300 dark:border-nord-border',
    bg: 'bg-gray-50 dark:bg-nord-surface',
    text: 'text-gray-400 dark:text-nord-muted',
    icon: '🔒',
    label: 'locked',
    opacity: 'opacity-50 dark:opacity-100',
    shadow: 'shadow-sm dark:shadow-[0_2px_15px_rgba(0,0,0,0.4)]',
  },
  unlocked: {
    border: 'border-blue-400 dark:border-nord-accent',
    bg: 'bg-white dark:bg-nord-surface',
    text: 'text-blue-600 dark:text-nord-accent',
    icon: '○',
    label: 'ready',
    opacity: '',
    shadow: 'shadow-sm dark:shadow-[0_2px_15px_rgba(129,161,193,0.2)]',
  },
  in_progress: {
    border: 'border-amber-400 dark:border-nord-yellow',
    bg: 'bg-amber-50 dark:bg-nord-yellow-tint',
    text: 'text-amber-600 dark:text-nord-yellow',
    icon: '◐',
    label: 'in progress',
    opacity: '',
    shadow: 'shadow-sm dark:shadow-[0_2px_15px_rgba(235,203,139,0.2)]',
  },
  done: {
    border: 'border-green-400 dark:border-nord-green',
    bg: 'bg-green-50 dark:bg-nord-green-tint',
    text: 'text-green-600 dark:text-nord-green',
    icon: '✓',
    label: 'done',
    opacity: '',
    shadow: 'shadow-sm dark:shadow-[0_2px_15px_rgba(163,190,140,0.2)]',
  },
};

export function SkillNode({ data }: NodeProps) {
  const node = data as unknown as TreeNode & { onAddChild?: (parentId: string) => void; isSelected?: boolean };
  const config = statusConfig[node.status];
  const { popupRect, handlers: popupHandlers } = useShiftHoverPopup();

  return (
    <div
      className={`w-[200px] rounded-lg border-2 ${config.border} ${config.bg} ${config.opacity} ${config.shadow} px-3 py-2 relative group transition-all duration-300 ease-out ${
        node.isSelected ? '[box-shadow:0_8px_40px_rgba(0,0,0,0.75)] -translate-y-1 scale-105' : ''
      }`}
      {...popupHandlers}
    >
      <span className={`absolute -top-4 left-2 text-sm font-mono text-gray-500 dark:text-nord-muted ${config.bg} border-2 ${config.border} px-1.5 py-0 rounded-t select-all leading-relaxed border-b-0`}>{node.id}</span>
      {node.assignee && (
        <span
          className={`absolute -top-4 right-2 flex items-center ${config.bg} ${config.border} border-2 px-1.5 py-0.5 rounded-t border-b-0 text-gray-500 dark:text-nord-muted`}
        >
          <AssigneeIcon assignee={node.assignee} />
        </span>
      )}
      <Handle type="target" position={Position.Top} className="!bg-gray-400 dark:!bg-nord-muted !w-2 !h-2" />

      <span className="text-sm font-medium text-gray-800 dark:text-nord-text break-words">
        {node.title}
      </span>

      {node.deadline && (
        <div className="text-xs text-gray-400 dark:text-nord-muted mt-0.5">
          Due: {new Date(node.deadline).toLocaleDateString()}
        </div>
      )}

      {node.onAddChild && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            node.onAddChild!(node.id);
          }}
          className="absolute bottom-1 right-1 w-5 h-5 rounded flex items-center justify-center text-gray-300 dark:text-nord-border hover:text-blue-500 dark:hover:text-nord-accent hover:bg-blue-50 dark:hover:bg-nord-accent/10 opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none"
          title="Add child node"
        >
          +
        </button>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 dark:!bg-nord-muted !w-2 !h-2" />

      {popupRect && <NodePopup node={node} anchorRect={popupRect} />}
    </div>
  );
}
