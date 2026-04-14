import { useNavigate } from 'react-router';
import { useDraggable } from '@dnd-kit/core';
import type { CardWithProgress } from '@kanban/shared';
import { useDeleteCard, useUpdateCard } from '../../hooks/useCards';

interface CardTileProps {
  card: CardWithProgress;
  boardId: string;
}

export function CardTile({ card, boardId }: CardTileProps) {
  const navigate = useNavigate();
  const deleteCard = useDeleteCard(boardId);
  const updateCard = useUpdateCard(boardId);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { card },
  });

  const style = transform && !isDragging
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const progress = card.totalNodes > 0
    ? Math.round((card.doneNodes / card.totalNodes) * 100)
    : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group relative rounded-md border p-3 cursor-grab active:cursor-grabbing transition-all duration-300 mt-2 ${
        isDragging ? 'opacity-30' : ''
      } ${card.priority ? 'bg-white dark:bg-nord-surface border-yellow-300/60 dark:border-yellow-400/30 hover:border-yellow-300/80 dark:hover:border-yellow-400/50 shadow-[0_0_8px_-2px_rgba(250,204,21,0.25)] dark:shadow-[0_0_8px_-2px_rgba(250,204,21,0.15)]' : 'bg-white dark:bg-nord-surface border-gray-200 dark:border-nord-border hover:border-gray-300 dark:hover:border-nord-muted'}`}
    >
      <div className={`absolute -top-3 left-2 h-[18px] flex items-center border rounded-t border-b-0 transition-colors duration-300 ${card.priority ? 'bg-white dark:bg-nord-surface border-yellow-300/60 dark:border-yellow-400/30' : 'bg-white dark:bg-nord-surface border-gray-300 dark:border-nord-border'}`}>
        <span className={`text-[9px] font-mono px-1.5 select-all leading-none transition-colors duration-300 ${card.priority ? 'text-yellow-600 dark:text-yellow-400/70' : 'text-gray-500 dark:text-nord-muted'}`}>{card.id}</span>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            updateCard.mutate({ id: card.id, priority: card.priority ? 0 : 1 });
          }}
          className={`overflow-hidden transition-all duration-200 ease-out flex items-center cursor-pointer ${card.priority ? 'max-w-[24px] opacity-100 pr-1' : 'max-w-0 opacity-0 group-hover:max-w-[24px] group-hover:opacity-100 group-hover:pr-1'}`}
          title={card.priority ? 'Remove priority' : 'Mark as priority'}
        >
          <svg
            className={`w-2.5 h-2.5 shrink-0 transition-colors ${card.priority ? 'fill-yellow-400 stroke-yellow-400' : 'fill-none stroke-gray-400 dark:stroke-nord-muted hover:stroke-yellow-400 hover:fill-yellow-400'}`}
            viewBox="0 0 24 24" strokeWidth={1.8}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
          </svg>
        </button>
      </div>
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => navigate(`/boards/${boardId}/cards/${card.id}`)}
          className={`text-sm font-medium text-left transition-colors flex-1 ${card.priority ? 'text-yellow-700 dark:text-yellow-300/80 hover:text-yellow-800 dark:hover:text-yellow-200' : 'text-gray-800 dark:text-nord-text hover:text-blue-600 dark:hover:text-nord-accent'}`}
        >
          {card.title}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete "${card.title}"?`)) {
              deleteCard.mutate(card.id);
            }
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 dark:text-nord-muted hover:text-red-500 dark:hover:text-nord-red transition-opacity shrink-0"
          title="Delete card"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
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
  );
}
