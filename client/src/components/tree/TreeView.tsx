import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node as RFNode,
  type Edge as RFEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { shortId } from '../../lib/shortId';
import { useNodes, useCreateNode, useAddDependency, useDeleteNode, useRemoveDependency } from '../../hooks/useNodes';
import { useCards } from '../../hooks/useCards';
import { useTheme } from '../../hooks/useTheme';
import { SkillNode } from './SkillNode';
import { ElkEdge } from './ElkEdge';
import { NodeDetail } from '../node/NodeDetail';
import { CardDocModal } from './CardDocModal';
import { getLayoutedElements, toRFData, measureNodeHeights } from './graphLayout';

const nodeTypes = { skillNode: SkillNode };
const edgeTypes = { elk: ElkEdge };

function TreeViewInner() {
  const { boardId, cardId } = useParams();
  const navigate = useNavigate();
  const { dark } = useTheme();
  const { data: cards } = useCards(boardId);
  const card = cards?.find((c) => c.id === cardId);
  const progress = card && card.totalNodes > 0
    ? Math.round((card.doneNodes / card.totalNodes) * 100)
    : 0;
  const { data, isLoading } = useNodes(cardId);
  const createNode = useCreateNode(cardId!);
  const addDependency = useAddDependency(cardId!);
  const deleteNode = useDeleteNode(cardId!);
  const removeDependency = useRemoveDependency(cardId!);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showDoc, setShowDoc] = useState(false);

  const addChildRef = useRef<((parentId: string) => void) | undefined>(undefined);
  addChildRef.current = (parentId: string) => {
    const childId = shortId();
    const depId = shortId();
    createNode.mutate({ id: childId, title: 'New task' }, {
      onSuccess: () => {
        addDependency.mutate({ id: depId, nodeId: childId, dependsOnId: parentId });
      },
    });
  };

  const stableAddChild = useCallback((parentId: string) => {
    addChildRef.current?.(parentId);
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);

  const layoutPassRef = useRef(0);

  useEffect(() => {
    if (!data) return;
    const pass = ++layoutPassRef.current;
    const { rfNodes, rfEdges } = toRFData(data.nodes, data.dependencies, dark, stableAddChild, selectedNodeId);

    // First pass: layout with default heights to get nodes rendered
    getLayoutedElements(rfNodes, rfEdges).then(({ nodes: ln, edges: le }) => {
      if (pass !== layoutPassRef.current) return;
      setNodes(ln);
      setEdges(le);

      // Second pass: re-layout with measured DOM heights (two RAFs to ensure layout settled)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (pass !== layoutPassRef.current) return;
          const heights = measureNodeHeights();
          if (heights.size === 0) return;
          getLayoutedElements(rfNodes, rfEdges, heights).then(({ nodes: ln2, edges: le2 }) => {
            if (pass !== layoutPassRef.current) return;
            setNodes(ln2);
            setEdges(le2);
          });
        });
      });
    });
  }, [data, dark, stableAddChild, selectedNodeId, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      addDependency.mutate(
        { id: shortId(), nodeId: connection.target, dependsOnId: connection.source },
        { onError: (err) => alert(err.message) }
      );
    },
    [addDependency]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: RFNode) => {
    setSelectedNodeId(node.id);
  }, []);

  function handleAddNode(): void {
    createNode.mutate({ id: shortId(), title: 'New task' });
  }

  function handleDeleteNode(nodeId: string): void {
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    deleteNode.mutate(nodeId);
  }

  function handleDeleteEdge(edgeId: string): void {
    const dep = data?.dependencies.find((d) => d.id === edgeId);
    if (dep) {
      removeDependency.mutate({ nodeId: dep.node_id, depId: dep.id });
    }
  }

  const selectedNode = data?.nodes.find((n) => n.id === selectedNodeId) ?? null;

  if (isLoading) {
    return (
      <div style={{ padding: 40, color: dark ? '#616e88' : '#999' }}>Loading...</div>
    );
  }

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => navigate(`/boards/${boardId}/cards/${cardId}`)}
              className="px-3 py-1.5 text-sm bg-white dark:bg-nord-surface border border-gray-200 dark:border-nord-border rounded-md hover:bg-gray-50 dark:hover:bg-nord-hover shadow-sm"
            >
              &larr; List view
            </button>
            <button
              onClick={handleAddNode}
              className="px-3 py-1.5 text-sm bg-blue-500 dark:bg-nord-accent text-white dark:text-nord-bg rounded-md hover:bg-blue-600 dark:hover:bg-nord-accent/80 shadow-sm"
            >
              + Add node
            </button>
          </div>
          {card && (
            <div className="flex gap-2 mb-2 items-stretch">
              <div className="bg-white dark:bg-nord-surface rounded-md border border-gray-200 dark:border-nord-border p-3 shadow-sm max-w-[280px] relative">
                <span className="absolute -top-3 left-2 text-[9px] font-mono text-gray-500 dark:text-nord-muted bg-white dark:bg-nord-surface border border-gray-300 dark:border-nord-border px-1.5 py-0 rounded-t select-all leading-relaxed border-b-0">{card.id}</span>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-gray-800 dark:text-nord-text">{card.title}</span>
                </div>
                {card.totalNodes > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-400 dark:text-nord-muted mb-0.5">
                      <span>{card.doneNodes}/{card.totalNodes} tasks</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1 bg-gray-100 dark:bg-nord-hover rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 dark:bg-nord-green rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowDoc(true)}
                className="w-10 bg-white dark:bg-nord-surface rounded-md border border-gray-200 dark:border-nord-border shadow-sm hover:bg-gray-50 dark:hover:bg-nord-hover flex items-center justify-center"
                title="Card documentation"
              >
                <svg className="w-5 h-5 text-gray-500 dark:text-nord-muted" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelectedNodeId(null)}
          onEdgeClick={(_, edge) => {
            if (confirm('Remove this dependency?')) {
              handleDeleteEdge(edge.id);
            }
          }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={false}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          style={{ width: '100%', height: '100%', background: dark ? '#2e3440' : '#f9fafb' }}
        >
          <Background gap={20} size={1} color={dark ? '#434c5e' : '#e5e7eb'} />
        </ReactFlow>
      </div>

      {selectedNode && (
        <NodeDetail
          node={selectedNode}
          cardId={cardId!}
          onClose={() => setSelectedNodeId(null)}
          onDelete={() => handleDeleteNode(selectedNode.id)}
        />
      )}

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

export function TreeView() {
  return (
    <ReactFlowProvider>
      <TreeViewInner />
    </ReactFlowProvider>
  );
}
