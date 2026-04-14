import { useState } from 'react';
import { shortId } from '../../lib/shortId';
import type { ColumnType, CardWithProgress } from '@kanban/shared';
import { useCreateCard } from '../../hooks/useCards';
import { CardTile } from './CardTile';
import { useDroppable } from '@dnd-kit/core';

interface ColumnProps {
  columnKey: ColumnType;
  label: string;
  cards: CardWithProgress[];
  boardId: string;
}

export function Column({ columnKey, label, cards, boardId }: ColumnProps) {
  const createCard = useCreateCard(boardId);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const { setNodeRef, isOver } = useDroppable({ id: columnKey });

  function handleAdd(): void {
    const title = newTitle.trim();
    if (!title) return;
    createCard.mutate(
      { id: shortId(), title, column: columnKey },
      { onSuccess: () => { setNewTitle(''); setIsAdding(false); } }
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 flex flex-col min-w-0 rounded-lg bg-gray-100/50 dark:bg-nord-surface/50 ${
        isOver ? 'ring-2 ring-blue-300 dark:ring-nord-accent/50' : ''
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-nord-muted">
          {label}
        </h2>
        <span className="text-xs text-gray-400 dark:text-nord-muted">{cards.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 pt-3 space-y-4">
        {cards.map((card) => (
          <CardTile key={card.id} card={card} boardId={boardId} />
        ))}
      </div>

      <div className="px-2 pb-2">
        {isAdding ? (
          <form
            onSubmit={(e) => { e.preventDefault(); handleAdd(); }}
            className="space-y-1"
          >
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setIsAdding(false)}
              placeholder="Card title"
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-nord-border rounded bg-white dark:bg-nord-bg focus:outline-none focus:border-blue-400 dark:focus:border-nord-accent"
            />
            <div className="flex gap-1">
              <button
                type="submit"
                className="px-2 py-1 text-xs bg-blue-500 dark:bg-nord-accent text-white dark:text-nord-bg rounded hover:bg-blue-600 dark:hover:bg-nord-accent/80"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-2 py-1 text-xs text-gray-500 dark:text-nord-muted hover:text-gray-700 dark:hover:text-nord-text"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-1.5 text-xs text-gray-400 dark:text-nord-muted hover:text-gray-600 dark:hover:text-nord-text hover:bg-gray-100 dark:hover:bg-nord-hover rounded transition-colors"
          >
            + Add card
          </button>
        )}
      </div>
    </div>
  );
}
