// === Enums ===

export type ColumnType = 'backlog' | 'todo' | 'active' | 'done';
export type NodeStatus = 'locked' | 'unlocked' | 'in_progress' | 'done';
export type Assignee = 'ozan' | 'claude';

// === Database Models ===

export interface Board {
  id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  board_id: string;
  title: string;
  description: string;
  column: ColumnType;
  position: number;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface CardWithProgress extends Card {
  totalNodes: number;
  doneNodes: number;
}

export interface TreeNode {
  id: string;
  card_id: string;
  title: string;
  description: string;
  notes: string;
  deadline: string | null;
  status: NodeStatus;
  assignee: Assignee | null;
  assignee_session_id: string | null;
  assignee_cwd: string | null;
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
}

export interface NodeDependency {
  id: string;
  node_id: string;
  depends_on_id: string;
}

// === API Payloads ===

export interface CreateBoardPayload {
  id: string;
  name: string;
}

export interface UpdateBoardPayload {
  name?: string;
  position?: number;
}

export interface CreateCardPayload {
  id: string;
  title: string;
  description?: string;
  column?: ColumnType;
}

export interface UpdateCardPayload {
  title?: string;
  description?: string;
  column?: ColumnType;
  position?: number;
  priority?: number;
}

export interface CreateNodePayload {
  id: string;
  title: string;
}

export interface UpdateNodePayload {
  title?: string;
  description?: string;
  notes?: string;
  deadline?: string | null;
  status?: NodeStatus;
  assignee?: Assignee | null;
  assignee_session_id?: string | null;
  assignee_cwd?: string | null;
}

export interface AddDependencyPayload {
  id: string;
  dependsOnId: string;
}

export interface CardNodesResponse {
  nodes: TreeNode[];
  dependencies: NodeDependency[];
}
