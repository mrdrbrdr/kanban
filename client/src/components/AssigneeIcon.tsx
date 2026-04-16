import type { Assignee } from '@kanban/shared';

interface Props {
  assignee: Assignee;
  className?: string;
}

export function AssigneeIcon({ assignee, className = 'w-3.5 h-3.5' }: Props) {
  if (assignee === 'claude') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-label="Claude">
        <rect x="4" y="7" width="16" height="13" rx="2" />
        <path d="M12 3v4" />
        <path d="M9 12v1M15 12v1" />
        <path d="M10 17h4" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-label="Ozan">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  );
}
