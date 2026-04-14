import type { ReactNode } from 'react';

interface StatusGroupProps {
  label: string;
  icon: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function StatusGroup({ label, icon, count, collapsed, onToggle, children }: StatusGroupProps) {
  if (count === 0) return null;

  return (
    <div className="mb-3">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left py-1.5 px-2 text-sm font-semibold text-gray-600 dark:text-nord-muted hover:bg-gray-50 dark:hover:bg-nord-hover rounded transition-colors"
      >
        <span className="text-[10px] w-3 text-center">{collapsed ? '\u25B8' : '\u25BE'}</span>
        <span>{icon}</span>
        <span>{label}</span>
        <span className="text-gray-400 dark:text-nord-muted font-normal">({count})</span>
      </button>
      {!collapsed && (
        <div className="mt-0.5 ml-7 pl-3 border-l border-gray-200 dark:border-nord-border space-y-px">
          {children}
        </div>
      )}
    </div>
  );
}
