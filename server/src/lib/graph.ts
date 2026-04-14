import db from '../db.js';

interface NodeRow {
  id: string;
  status: string;
}

interface DepRow {
  node_id: string;
  depends_on_id: string;
}

export function wouldCreateCycle(nodeId: string, dependsOnId: string, cardId: string): boolean {
  const deps = db.prepare(
    `SELECT nd.node_id, nd.depends_on_id
     FROM node_dependencies nd
     JOIN nodes n ON n.id = nd.node_id
     WHERE n.card_id = ?`
  ).all(cardId) as DepRow[];

  // Build adjacency: dependsOn -> [nodes that depend on it]
  const adj = new Map<string, string[]>();
  for (const d of deps) {
    if (!adj.has(d.depends_on_id)) adj.set(d.depends_on_id, []);
    adj.get(d.depends_on_id)!.push(d.node_id);
  }

  // Add the proposed edge
  if (!adj.has(dependsOnId)) adj.set(dependsOnId, []);
  adj.get(dependsOnId)!.push(nodeId);

  // DFS from nodeId: if we can reach dependsOnId, there's a cycle
  const visited = new Set<string>();
  const stack = [nodeId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === dependsOnId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const neighbors = adj.get(current) || [];
    for (const n of neighbors) {
      stack.push(n);
    }
  }

  return false;
}

export function recomputeStatuses(cardId: string): void {
  const nodes = db.prepare('SELECT id, status FROM nodes WHERE card_id = ?').all(cardId) as NodeRow[];
  const deps = db.prepare(
    `SELECT nd.node_id, nd.depends_on_id
     FROM node_dependencies nd
     JOIN nodes n ON n.id = nd.node_id
     WHERE n.card_id = ?`
  ).all(cardId) as DepRow[];

  // Build dependency map: nodeId -> [dependsOnIds]
  const depsOf = new Map<string, string[]>();
  for (const d of deps) {
    if (!depsOf.has(d.node_id)) depsOf.set(d.node_id, []);
    depsOf.get(d.node_id)!.push(d.depends_on_id);
  }

  const statusMap = new Map(nodes.map((n) => [n.id, n.status]));
  const updates: { id: string; status: string }[] = [];

  for (const node of nodes) {
    // Don't auto-change nodes that are in_progress or done (user-controlled)
    if (node.status === 'in_progress' || node.status === 'done') continue;

    const nodeDeps = depsOf.get(node.id) || [];
    if (nodeDeps.length === 0) {
      // No dependencies = unlocked
      if (node.status !== 'unlocked') {
        updates.push({ id: node.id, status: 'unlocked' });
      }
    } else {
      const allDone = nodeDeps.every((depId) => statusMap.get(depId) === 'done');
      const newStatus = allDone ? 'unlocked' : 'locked';
      if (node.status !== newStatus) {
        updates.push({ id: node.id, status: newStatus });
      }
    }
  }

  if (updates.length > 0) {
    const stmt = db.prepare('UPDATE nodes SET status = ?, updated_at = datetime(\'now\') WHERE id = ?');
    const tx = db.transaction(() => {
      for (const u of updates) {
        stmt.run(u.status, u.id);
      }
    });
    tx();
  }
}
