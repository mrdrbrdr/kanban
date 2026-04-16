import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import type { TreeNode, NodeDependency } from '@kanban/shared';
import { shortId } from '../../lib/shortId';
import { useNodes, useCreateNode, useUpdateNode, useDeleteNode, useAddDependency } from '../../hooks/useNodes';
import { useCards } from '../../hooks/useCards';
import { NodeDetail } from '../node/NodeDetail';
import { CardDocModal } from '../tree/CardDocModal';
import { GraphPanel } from '../tree/GraphPanel';
import { StatusGroup } from './StatusGroup';
import { NodeRow, type DepInfo } from './NodeRow';

interface GroupedNodes {
  in_progress: TreeNode[];
  unlocked: TreeNode[];
  locked: TreeNode[];
  done: TreeNode[];
}

function groupNodes(nodes: TreeNode[]): GroupedNodes {
  const groups: GroupedNodes = { in_progress: [], unlocked: [], locked: [], done: [] };
  for (const node of nodes) {
    groups[node.status].push(node);
  }
  return groups;
}

function sortGroups(grouped: GroupedNodes, deps: NodeDependency[], nodes: TreeNode[]): GroupedNodes {
  const statusById = new Map(nodes.map(n => [n.id, n.status]));

  // How many nodes depend on each node — higher means more impactful to complete
  const dependentCount = new Map<string, number>();
  for (const dep of deps) {
    dependentCount.set(dep.depends_on_id, (dependentCount.get(dep.depends_on_id) ?? 0) + 1);
  }

  // How many unmet (non-done) deps each node has — fewer means closer to ready
  const unmetDepCount = new Map<string, number>();
  for (const dep of deps) {
    if (statusById.get(dep.depends_on_id) !== 'done') {
      unmetDepCount.set(dep.node_id, (unmetDepCount.get(dep.node_id) ?? 0) + 1);
    }
  }

  const byImpact = (a: TreeNode, b: TreeNode) =>
    (dependentCount.get(b.id) ?? 0) - (dependentCount.get(a.id) ?? 0);

  return {
    unlocked:    [...grouped.unlocked].sort(byImpact),
    in_progress: [...grouped.in_progress].sort(byImpact),
    locked:      [...grouped.locked].sort((a, b) =>
      (unmetDepCount.get(a.id) ?? 0) - (unmetDepCount.get(b.id) ?? 0)
    ),
    done:        [...grouped.done].sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    ),
  };
}

function buildDepMap(nodes: TreeNode[], deps: NodeDependency[]): Map<string, DepInfo[]> {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const result = new Map<string, DepInfo[]>();
  for (const dep of deps) {
    const depNode = nodeMap.get(dep.depends_on_id);
    if (!depNode) continue;
    if (!result.has(dep.node_id)) result.set(dep.node_id, []);
    result.get(dep.node_id)!.push({ nodeId: dep.depends_on_id, title: depNode.title, status: depNode.status });
  }
  return result;
}

const GROUPS = [
  { key: 'unlocked' as const, label: 'Ready', icon: '\u25CB', collapsedByDefault: false },
  { key: 'in_progress' as const, label: 'In Progress', icon: '\u25D0', collapsedByDefault: false },
  { key: 'locked' as const, label: 'Blocked', icon: '\uD83D\uDD12', collapsedByDefault: true },
  { key: 'done' as const, label: 'Done', icon: '\u2713', collapsedByDefault: true },
];

const INITIAL_COLLAPSED: Record<string, boolean> = Object.fromEntries(
  GROUPS.filter(g => g.collapsedByDefault).map(g => [g.key, true]),
);

export function ListView() {
  const { boardId, cardId } = useParams<{ boardId: string; cardId: string }>();
  const navigate = useNavigate();
  const { data: cards } = useCards(boardId);
  const { data, isLoading } = useNodes(cardId);
  const createNode = useCreateNode(cardId!);
  const updateNode = useUpdateNode(cardId!);
  const deleteNode = useDeleteNode(cardId!);
  const addDependency = useAddDependency(cardId!);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showDoc, setShowDoc] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(INITIAL_COLLAPSED);

  const card = cards?.find(c => c.id === cardId);
  const nodes = data?.nodes ?? [];
  const deps = data?.dependencies ?? [];

  const grouped = useMemo(() => sortGroups(groupNodes(nodes), deps, nodes), [nodes, deps]);
  const depMap = useMemo(() => buildDepMap(nodes, deps), [nodes, deps]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;
  const progress = card && card.totalNodes > 0 ? Math.round((card.doneNodes / card.totalNodes) * 100) : 0;

  function toggleGroup(key: string) {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function handleDepClick(nodeId: string) {
    setSelectedNodeId(nodeId);
    const targetNode = nodes.find(n => n.id === nodeId);
    if (targetNode) {
      const groupKey = targetNode.status;
      if (collapsedGroups[groupKey]) {
        setCollapsedGroups(prev => ({ ...prev, [groupKey]: false }));
      }
    }
    setTimeout(() => {
      document.getElementById(`node-row-${nodeId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }

  function handleAddNode() {
    createNode.mutate({ id: shortId(), title: 'New task' });
  }

  function handleDeleteNode(nodeId: string) {
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    deleteNode.mutate(nodeId);
  }

  function handleAddDependent(parentId: string) {
    const newId = shortId();
    createNode.mutate({ id: newId, title: 'New task' }, {
      onSuccess: () => {
        addDependency.mutate({ nodeId: newId, id: shortId(), dependsOnId: parentId });
        setSelectedNodeId(newId);
      },
    });
  }

  if (isLoading) {
    return <div className="p-10 text-gray-400 dark:text-nord-muted">Loading...</div>;
  }

  return (
    <div className="flex flex-col w-full h-full">
      {/* Full-width header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 dark:border-nord-border bg-white dark:bg-nord-surface shrink-0">
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => navigate(`/boards/${boardId}`)}
            className="px-2.5 py-1 text-sm text-gray-500 dark:text-nord-muted hover:text-gray-700 dark:hover:text-nord-text hover:bg-gray-100 dark:hover:bg-nord-hover rounded transition-colors"
          >
            &larr; Back
          </button>
          <button
            onClick={() => setShowDoc(true)}
            className="px-2.5 py-1 text-sm text-gray-500 dark:text-nord-muted hover:text-gray-700 dark:hover:text-nord-text hover:bg-gray-100 dark:hover:bg-nord-hover rounded transition-colors"
            title="Card documentation"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </button>
        </div>

        {card && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[10px] font-mono text-gray-400 dark:text-nord-muted bg-gray-100 dark:bg-nord-bg px-1.5 py-0.5 rounded select-all">{card.id}</span>
            <span className="text-sm font-medium text-gray-800 dark:text-nord-text truncate">{card.title}</span>
            {card.totalNodes > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-20 h-1 bg-gray-100 dark:bg-nord-hover rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-400 dark:bg-nord-green rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[11px] text-gray-400 dark:text-nord-muted">{card.doneNodes}/{card.totalNodes}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={handleAddNode}
            className="px-2.5 py-1 text-sm bg-blue-500 dark:bg-nord-accent text-white dark:text-nord-bg rounded hover:bg-blue-600 dark:hover:bg-nord-accent/80 transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Body: list (1/3) + embedded graph (2/3, wide screens) + node detail (right, overlay) */}
      <div className="relative flex flex-1 overflow-hidden">
        <div className="basis-1/3 grow shrink overflow-y-auto px-5 py-4 xl:basis-1/3 xl:grow-0">
          {nodes.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-nord-muted">
              <p className="text-sm">No tasks yet</p>
              <button
                onClick={handleAddNode}
                className="mt-2 text-sm text-blue-500 dark:text-nord-accent hover:underline"
              >
                + Add your first task
              </button>
            </div>
          ) : (
            GROUPS.map(({ key, label, icon }) => (
              <StatusGroup
                key={key}
                label={label}
                icon={icon}
                count={grouped[key].length}
                collapsed={!!collapsedGroups[key]}
                onToggle={() => toggleGroup(key)}
              >
                {grouped[key].map(node => (
                  <NodeRow
                    key={node.id}
                    id={node.id}
                    title={node.title}
                    status={node.status}
                    description={node.description}
                    notes={node.notes}
                    deadline={node.deadline}
                    isSelected={node.id === selectedNodeId}
                    onSelect={() => setSelectedNodeId(node.id)}
                    onStatusChange={(status) => updateNode.mutate({ id: node.id, status })}
                    deps={depMap.get(node.id) ?? []}
                    onDepClick={handleDepClick}
                  />
                ))}
              </StatusGroup>
            ))
          )}
        </div>

        {cardId && nodes.length > 0 && (
          <div className="hidden xl:block basis-2/3 grow-0 shrink-0 border-l border-gray-200 dark:border-nord-border bg-white dark:bg-nord-surface">
            <GraphPanel
              cardId={cardId}
              selectedNodeId={selectedNodeId}
              onSelectNode={(id) => (id ? handleDepClick(id) : setSelectedNodeId(null))}
            />
          </div>
        )}

        {selectedNode && (
          <NodeDetail
            node={selectedNode}
            cardId={cardId!}
            onClose={() => setSelectedNodeId(null)}
            onDelete={() => handleDeleteNode(selectedNode.id)}
            allNodes={nodes}
            dependencies={deps}
            onAddDependent={handleAddDependent}
            onSelectNode={handleDepClick}
          />
        )}
      </div>

      {showDoc && card && (
        <CardDocModal
          cardId={cardId!}
          cardTitle={card.title}
          onClose={() => setShowDoc(false)}
        />
      )}
    </div>
  );
}
