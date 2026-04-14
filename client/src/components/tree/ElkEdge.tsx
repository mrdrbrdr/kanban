import { type EdgeProps, BaseEdge } from '@xyflow/react';

function orthogonalFallback(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
): string {
  const midY = (sourceY + targetY) / 2;
  return `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;
}

export function ElkEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const path = (data?.elkPath as string)
    ?? orthogonalFallback(sourceX, sourceY, targetX, targetY);

  const isLocked = data?.isLocked as boolean;

  const animatedStyle = isLocked
    ? {
        ...style,
        strokeDasharray: '6 4',
        animation: 'elkEdgeFlow 0.5s linear infinite',
      }
    : style;

  return (
    <BaseEdge
      id={id}
      path={path}
      style={animatedStyle}
      markerEnd={markerEnd}
    />
  );
}
