import { useState } from 'react';
import { useParams } from 'react-router';
import { DndContext, DragOverlay, type DragStartEvent, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useCards, useUpdateCard } from '../../hooks/useCards';
import { Column } from './Column';
import { CardTile } from './CardTile';
import type { ColumnType, CardWithProgress } from '@kanban/shared';

const COLUMNS: { key: ColumnType; label: string }[] = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'To-Do' },
  { key: 'active', label: 'Active' },
  { key: 'done', label: 'Done' },
];

const VALID_COLUMNS = new Set<string>(COLUMNS.map((c) => c.key));

export function BoardView() {
  const { boardId } = useParams();
  const { data: cards } = useCards(boardId);
  const updateCard = useUpdateCard(boardId || '');
  const [activeCard, setActiveCard] = useState<CardWithProgress | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  if (!boardId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 dark:text-nord-muted text-sm">
        Select or create a board to get started
      </div>
    );
  }

  const cardsByColumn = COLUMNS.map(({ key, label }) => ({
    key,
    label,
    cards: (cards || []).filter((c) => c.column === key)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0) || a.position - b.position),
  }));

  const handleDragStart = (event: DragStartEvent) => {
    const card = cards?.find((c) => c.id === event.active.id);
    setActiveCard(card ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const cardId = active.id as string;
    const targetColumn = over.id as ColumnType;

    if (!VALID_COLUMNS.has(targetColumn)) return;

    const currentCard = cards?.find((c) => c.id === cardId);
    if (!currentCard || currentCard.column === targetColumn) return;

    const targetCards = (cards || []).filter((c) => c.column === targetColumn);
    updateCard.mutate({
      id: cardId,
      column: targetColumn,
      position: targetCards.length,
    });
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 p-6 h-full overflow-hidden">
        {cardsByColumn.map(({ key, label, cards: columnCards }) => (
          <Column
            key={key}
            columnKey={key}
            label={label}
            cards={columnCards}
            boardId={boardId}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeCard && (
          <div className="bg-white dark:bg-nord-surface rounded-md border border-gray-200 dark:border-nord-border p-3 shadow-lg w-[280px] opacity-90">
            <div className="text-sm font-medium text-gray-800 dark:text-nord-text">{activeCard.title}</div>
            {activeCard.totalNodes > 0 && (
              <div className="text-xs text-gray-400 dark:text-nord-muted mt-1">
                {activeCard.doneNodes}/{activeCard.totalNodes} tasks
              </div>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
