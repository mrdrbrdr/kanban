import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (!data) return;
    const pass = ++layoutPassRef.current;
    const { rfNodes, rfEdges } = toRFData(data.nodes, data.dependencies, dark, undefined, selectedNodeId);

    // Only re-fit the viewport when the underlying graph structure changes (not on selection)
    const signature = data.nodes.map((n) => n.id).sort().join(',') + '|' + data.dependencies.length;
    const shouldFit = signature !== lastFitSignatureRef.current;
    lastFitSignatureRef.current = signature;

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
  }, [data, dark, selectedNodeId, setNodes, setEdges, fitView]);

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
