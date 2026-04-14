import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useCardDoc, useUpdateCardDoc } from '../../hooks/useCardDoc';

const TEXT_SIZES = ['prose-sm text-[11px]', 'prose-base', 'prose-lg'] as const;
const STORAGE_KEY = 'kanban-doc-text-size';
const SIZE_LABELS = ['S', 'M', 'L'] as const;

interface DocContentProps {
  cardId: string;
  content: string | undefined;
  isLoading: boolean;
  textSize: string;
}

function DocContent({ cardId, content, isLoading, textSize }: DocContentProps) {
  if (isLoading) {
    return <div className="text-gray-400 dark:text-nord-muted">Loading...</div>;
  }

  if (content) {
    return (
      <div className={`prose prose-gray max-w-none ${textSize}`}>
        <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
      </div>
    );
  }

  return (
    <div className="text-center text-gray-400 dark:text-nord-muted py-16">
      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-nord-border" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
      <p className="text-sm">No documentation yet.</p>
      <p className="text-xs mt-1 font-mono">docs/{cardId}.md</p>
    </div>
  );
}

interface CardDocModalProps {
  cardId: string;
  cardTitle: string;
  onClose: () => void;
}

export function CardDocModal({ cardId, cardTitle, onClose }: CardDocModalProps) {
  const { data, isLoading } = useCardDoc(cardId);
  const updateDoc = useUpdateCardDoc(cardId);
  const [sizeIdx, setSizeIdx] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved !== null ? Number(saved) : 1;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSizeChange(i: number): void {
    setSizeIdx(i);
    localStorage.setItem(STORAGE_KEY, String(i));
  }

  function handleEditStart(): void {
    setDraft(data?.content ?? '');
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleCancel(): void {
    setIsEditing(false);
    setDraft('');
  }

  async function handleSave(): Promise<void> {
    await updateDoc.mutateAsync(draft);
    setIsEditing(false);
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          handleCancel();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, isEditing]);

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/60 flex items-center justify-center"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-nord-surface rounded-lg shadow-2xl w-[800px] max-w-[90vw] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-nord-border">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-nord-text-bright">{cardTitle}</h2>
            <span className="text-xs font-mono text-gray-400 dark:text-nord-muted">{cardId}</span>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <div className="flex items-center border border-gray-200 dark:border-nord-border rounded overflow-hidden">
                {TEXT_SIZES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handleSizeChange(i)}
                    className={`px-2 py-1 text-xs ${sizeIdx === i ? 'bg-gray-800 dark:bg-nord-accent text-white dark:text-nord-bg' : 'text-gray-500 dark:text-nord-muted hover:bg-gray-100 dark:hover:bg-nord-hover'}`}
                  >
                    {SIZE_LABELS[i]}
                  </button>
                ))}
              </div>
            )}
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-xs rounded border border-gray-200 dark:border-nord-border text-gray-500 dark:text-nord-muted hover:bg-gray-100 dark:hover:bg-nord-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateDoc.isPending}
                  className="px-3 py-1 text-xs rounded bg-gray-800 dark:bg-nord-accent text-white dark:text-nord-bg hover:bg-gray-700 dark:hover:bg-nord-accent/80 disabled:opacity-50"
                >
                  {updateDoc.isPending ? 'Saving…' : 'Save'}
                </button>
              </>
            ) : (
              <button
                onClick={handleEditStart}
                title="Edit documentation"
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-nord-hover text-gray-400 dark:text-nord-muted hover:text-gray-600 dark:hover:text-nord-text"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-nord-hover text-gray-400 dark:text-nord-muted hover:text-gray-600 dark:hover:text-nord-text"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-10 py-8">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full h-full min-h-[400px] bg-transparent text-sm font-mono text-gray-800 dark:text-nord-text resize-none outline-none leading-relaxed"
              placeholder="Write documentation in Markdown…"
              spellCheck={false}
            />
          ) : (
            <DocContent cardId={cardId} content={data?.content} isLoading={isLoading} textSize={TEXT_SIZES[sizeIdx]} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
