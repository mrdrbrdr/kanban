import { useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node as RFNode,
  type Edge as RFEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNodes } from '../../hooks/useNodes';
import { useTheme } from '../../hooks/useTheme';
import { SkillNode } from './SkillNode';
import { ElkEdge } from './ElkEdge';
import { getLayoutedElements, toRFData, measureNodeHeights } from './graphLayout';

const nodeTypes = { skillNode: SkillNode };
const edgeTypes = { elk: ElkEdge };

interface GraphPanelProps {
  cardId: string;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
}

function GraphPanelInner({ cardId, selectedNodeId, onSelectNode }: GraphPanelProps) {
  const { dark } = useTheme();
  const { data, isLoading } = useNodes(cardId);
  const containerRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);

  const layoutPassRef = useRef(0);
  const lastFitSignatureRef = useRef<string>('');
  const selectedNodeIdRef = useRef(selectedNodeId);
  selectedNodeIdRef.current = selectedNodeId;
  const dataRef = useRef(data);
  dataRef.current = data;

  // Signature that changes only when the graph structure changes (nodes added/removed or deps added/removed).
  // Metadata edits (title, status, assignee, ...) don't touch this, so they don't trigger re-layout.
  const structureSig = useMemo(() => {
    if (!data) return '';
    return data.nodes.map((n) => n.id).sort().join(',') + '|' + data.dependencies.map((d) => d.id).sort().join(',');
  }, [data]);

  // Heavy layout pipeline — runs only on structural changes or theme switch
  useEffect(() => {
    const d = dataRef.current;
    if (!d) return;
    const pass = ++layoutPassRef.current;
    const { rfNodes, rfEdges } = toRFData(d.nodes, d.dependencies, dark, undefined, selectedNodeIdRef.current);

    const shouldFit = structureSig !== lastFitSignatureRef.current;
    lastFitSignatureRef.current = structureSig;

    getLayoutedElements(rfNodes, rfEdges).then(({ nodes: ln, edges: le }) => {
      if (pass !== layoutPassRef.current) return;
      setNodes(ln);
      setEdges(le);

      // Two RAFs: first paints the nodes, second guarantees layout has settled before measuring
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (pass !== layoutPassRef.current) return;
          const heights = measureNodeHeights(containerRef.current);
          if (heights.size === 0) {
            if (shouldFit) fitView({ padding: 0.2, duration: 0 });
            return;
          }
          getLayoutedElements(rfNodes, rfEdges, heights).then(({ nodes: ln2, edges: le2 }) => {
            if (pass !== layoutPassRef.current) return;
            setNodes(ln2);
            setEdges(le2);
            if (shouldFit) {
              requestAnimationFrame(() => {
                if (pass !== layoutPassRef.current) return;
                fitView({ padding: 0.2, duration: 0 });
              });
            }
          });
        });
      });
    });
  }, [structureSig, dark, setNodes, setEdges, fitView]);

  // Lightweight metadata sync — merges latest node/edge state without re-running ELK layout
  useEffect(() => {
    if (!data) return;
    const byId = new Map(data.nodes.map((n) => [n.id, n]));
    setNodes((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((n) => {
        const fresh = byId.get(n.id);
        if (!fresh) return n;
        return { ...n, data: { ...n.data, ...fresh } };
      });
    });
    setEdges((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((e) => {
        const target = byId.get(e.target as string);
        if (!target) return e;
        const isLocked = target.status === 'locked';
        if ((e.data as { isLocked?: boolean } | undefined)?.isLocked === isLocked) return e;
        const stroke = isLocked
          ? (dark ? '#616e88' : '#d1d5db')
          : (dark ? '#81a1c1' : '#60a5fa');
        return { ...e, data: { ...e.data, isLocked }, style: { ...e.style, stroke } };
      });
    });
  }, [data, dark, setNodes, setEdges]);

  // Lightweight selection update — no layout recompute
  useEffect(() => {
    setNodes((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const next = prev.map((n) => {
        const shouldBeSelected = n.id === selectedNodeId;
        if (n.data.isSelected === shouldBeSelected) return n;
        changed = true;
        return { ...n, data: { ...n.data, isSelected: shouldBeSelected } };
      });
      return changed ? next : prev;
    });
  }, [selectedNodeId, setNodes]);

  if (isLoading || !data || data.nodes.length === 0) {
    return (
      <div ref={containerRef} className="flex items-center justify-center h-full text-xs text-gray-400 dark:text-nord-muted">
        {isLoading ? 'Loading graph…' : 'No dependencies yet'}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        onPaneClick={() => onSelectNode(null)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        style={{ width: '100%', height: '100%', background: dark ? '#2e3440' : '#f9fafb' }}
      >
        <Background gap={20} size={1} color={dark ? '#434c5e' : '#e5e7eb'} />
      </ReactFlow>
    </div>
  );
}

export function GraphPanel(props: GraphPanelProps) {
  return (
    <ReactFlowProvider>
      <GraphPanelInner {...props} />
    </ReactFlowProvider>
  );
}
