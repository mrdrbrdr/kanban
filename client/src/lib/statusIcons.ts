import type { NodeStatus } from '@kanban/shared';

export const STATUS_ICON: Record<NodeStatus, string> = {
  locked: '\uD83D\uDD12',
  unlocked: '\u25CB',
  in_progress: '\u25D0',
  done: '\u2713',
};
