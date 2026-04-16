import {
  type Node as RFNode,
  type Edge as RFEdge,
  Position,
  MarkerType,
} from '@xyflow/react';
import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js';
import type { TreeNode, NodeDependency } from '@kanban/shared';

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 70;

const elk = new ELK();

export function measureNodeHeights(container?: HTMLElement | null): Map<string, number> {
  const heights = new Map<string, number>();
  const root = container ?? document;
  root.querySelectorAll<HTMLElement>('.react-flow__node').forEach((el) => {
    const id = el.dataset.id;
    if (id) heights.set(id, el.offsetHeight);
  });
  return heights;
}

export async function getLayoutedElements(
  nodes: RFNode[],
  edges: RFEdge[],
  nodeHeights?: Map<string, number>,
): Promise<{ nodes: RFNode[]; edges: RFEdge[] }> {
  if (nodes.length === 0) return { nodes: [], edges: [] };

  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '30',
      'elk.layered.spacing.nodeNodeBetweenLayers': '30',
      'elk.layered.spacing.edgeNodeBetweenLayers': '18',
      'elk.layered.spacing.edgeEdgeBetweenLayers': '10',
      'elk.spacing.edgeNode': '20',
      'elk.spacing.edgeEdge': '15',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.mergeEdges': 'false',
      'elk.layered.unnecessaryBendpoints': 'false',
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: NODE_WIDTH,
      height: nodeHeights?.get(n.id) ?? NODE_HEIGHT,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const layout = await elk.layout(elkGraph);

  const nodePositions = new Map(
    layout.children?.map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }]) ?? []
  );

  const layoutedNodes = nodes.map((n) => {
    const pos = nodePositions.get(n.id) ?? { x: 0, y: 0 };
    return {
      ...n,
      position: pos,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
    };
  });

  const edgeMap = new Map(
    layout.edges?.map((e) => [e.id, e]) ?? []
  );

  const TOL = 1;
  const HOP_R = 16;
  const HOP_STEPS = 8;

  interface Seg { x1: number; y1: number; x2: number; y2: number; edgeId: string; segIdx: number }
  const allSegments: Seg[] = [];
  const edgePoints = new Map<string, { x: number; y: number }[]>();

  for (const e of edges) {
    const section = edgeMap.get(e.id)?.sections?.[0];
    if (!section) continue;
    const pts = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint];
    edgePoints.set(e.id, pts);
    for (let i = 0; i < pts.length - 1; i++) {
      allSegments.push({ x1: pts[i].x, y1: pts[i].y, x2: pts[i + 1].x, y2: pts[i + 1].y, edgeId: e.id, segIdx: i });
    }
  }

  const crossingsPerEdge = new Map<string, Map<number, number[]>>();

  for (const hSeg of allSegments) {
    if (Math.abs(hSeg.y1 - hSeg.y2) > TOL) continue;
    for (const vSeg of allSegments) {
      if (Math.abs(vSeg.x1 - vSeg.x2) > TOL) continue;
      if (hSeg.edgeId === vSeg.edgeId) continue;
      const hMinX = Math.min(hSeg.x1, hSeg.x2);
      const hMaxX = Math.max(hSeg.x1, hSeg.x2);
      const vMinY = Math.min(vSeg.y1, vSeg.y2);
      const vMaxY = Math.max(vSeg.y1, vSeg.y2);
      const crossX = (vSeg.x1 + vSeg.x2) / 2;
      const crossY = (hSeg.y1 + hSeg.y2) / 2;
      if (crossX > hMinX + HOP_R && crossX < hMaxX - HOP_R && crossY > vMinY + TOL && crossY < vMaxY - TOL) {
        if (!crossingsPerEdge.has(hSeg.edgeId)) crossingsPerEdge.set(hSeg.edgeId, new Map());
        const segMap = crossingsPerEdge.get(hSeg.edgeId)!;
        if (!segMap.has(hSeg.segIdx)) segMap.set(hSeg.segIdx, []);
        segMap.get(hSeg.segIdx)!.push(crossX);
      }
    }
  }

  function hopPoints(cx: number, y: number, dir: number): string {
    let path = '';
    for (let s = 0; s <= HOP_STEPS; s++) {
      const angle = Math.PI * s / HOP_STEPS;
      const hx = cx + HOP_R * Math.cos(dir > 0 ? Math.PI - angle : angle);
      const hy = y - HOP_R * Math.sin(angle);
      path += ` L ${hx} ${hy}`;
    }
    return path;
  }

  const layoutedEdges = edges.map((e) => {
    const pts = edgePoints.get(e.id);
    if (!pts) return e;

    const segCrossings = crossingsPerEdge.get(e.id);
    let d = `M ${pts[0].x} ${pts[0].y}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const crosses = segCrossings?.get(i);

      if (crosses && crosses.length > 0 && Math.abs(p1.y - p2.y) <= TOL) {
        const dir = p2.x > p1.x ? 1 : -1;
        const sorted = [...crosses].sort((a, b) => (a - b) * dir);
        for (const cx of sorted) {
          d += ` L ${cx - HOP_R * dir} ${p1.y}`;
          d += hopPoints(cx, p1.y, dir);
        }
        d += ` L ${p2.x} ${p2.y}`;
      } else {
        d += ` L ${p2.x} ${p2.y}`;
      }
    }

    return {
      ...e,
      type: 'elk',
      data: { ...e.data, elkPath: d },
    };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
}

export function toRFData(
  nodes: TreeNode[],
  dependencies: NodeDependency[],
  dark: boolean,
  onAddChild?: (parentId: string) => void,
  selectedNodeId?: string | null,
): { rfNodes: RFNode[]; rfEdges: RFEdge[] } {
  const statusById = new Map(nodes.map((n) => [n.id, n.status]));

  const rfNodes: RFNode[] = nodes.map((n) => ({
    id: n.id,
    type: 'skillNode',
    position: { x: 0, y: 0 },
    data: { ...n, onAddChild, isSelected: n.id === selectedNodeId },
  }));

  const rfEdges: RFEdge[] = dependencies.map((d) => {
    const isLocked = statusById.get(d.node_id) === 'locked';
    return {
      id: d.id,
      source: d.depends_on_id,
      target: d.node_id,
      type: 'elk',
      animated: false,
      data: { isLocked },
      style: {
        stroke: isLocked
          ? (dark ? '#616e88' : '#d1d5db')
          : (dark ? '#81a1c1' : '#60a5fa'),
        strokeWidth: 2,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: dark ? '#616e88' : '#9ca3af' },
    };
  });

  return { rfNodes, rfEdges };
}
