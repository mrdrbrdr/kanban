import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { shortId } from '../../lib/shortId';
import { useBoards, useCreateBoard, useDeleteBoard } from '../../hooks/useBoards';
import { useTheme } from '../../hooks/useTheme';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { data: boards } = useBoards();
  const createBoard = useCreateBoard();
  const deleteBoard = useDeleteBoard();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const { dark, toggle: toggleTheme } = useTheme();

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const id = shortId();
    createBoard.mutate({ id, name }, {
      onSuccess: () => {
        setNewName('');
        setIsCreating(false);
        navigate(`/boards/${id}`);
      },
    });
  };

  return (
    <aside
      className={`border-r border-gray-200 dark:border-nord-border bg-white dark:bg-nord-surface flex flex-col transition-all duration-200 ${
        collapsed ? 'w-12' : 'w-56'
      }`}
    >
      <div className={`p-2 border-b border-gray-200 dark:border-nord-border flex ${collapsed ? 'flex-col items-center gap-1' : 'items-center justify-between'}`}>
        {!collapsed && <h1 className="text-lg font-semibold tracking-tight pl-2">Kanban</h1>}
        <div className={`flex ${collapsed ? 'flex-col' : ''} items-center gap-1`}>
          <button
            onClick={toggleTheme}
            className="p-1.5 text-gray-400 dark:text-nord-muted hover:text-gray-600 dark:hover:text-nord-text rounded hover:bg-gray-50 dark:hover:bg-nord-hover"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5" />
                <path strokeLinecap="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <button
            onClick={onToggle}
            className="p-1.5 text-gray-400 dark:text-nord-muted hover:text-gray-600 dark:hover:text-nord-text rounded hover:bg-gray-50 dark:hover:bg-nord-hover"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {collapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {boards?.map((board) => (
              <div key={board.id} className="group flex items-center">
                <NavLink
                  to={`/boards/${board.id}`}
                  className={({ isActive }) =>
                    `flex-1 block px-3 py-1.5 rounded text-sm truncate transition-colors ${
                      isActive
                        ? 'bg-gray-100 dark:bg-nord-hover font-medium text-gray-900 dark:text-nord-text-bright'
                        : 'text-gray-600 dark:text-nord-text hover:bg-gray-50 dark:hover:bg-nord-hover hover:text-gray-900 dark:hover:text-nord-text-bright'
                    }`
                  }
                >
                  {board.name}
                </NavLink>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${board.name}"?`)) {
                      deleteBoard.mutate(board.id, {
                        onSuccess: () => navigate('/boards'),
                      });
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 dark:text-nord-muted hover:text-red-500 dark:hover:text-nord-red transition-opacity"
                  title="Delete board"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </nav>

          <div className="p-2 border-t border-gray-200 dark:border-nord-border">
            {isCreating ? (
              <form
                onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
                className="flex gap-1"
              >
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setIsCreating(false)}
                  placeholder="Board name"
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-nord-border rounded bg-white dark:bg-nord-bg focus:outline-none focus:border-blue-400 dark:focus:border-nord-accent"
                />
                <button
                  type="submit"
                  className="px-2 py-1 text-sm bg-blue-500 dark:bg-nord-accent text-white dark:text-nord-bg rounded hover:bg-blue-600 dark:hover:bg-nord-accent/80"
                >
                  Add
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full px-3 py-1.5 text-sm text-gray-500 dark:text-nord-muted hover:text-gray-700 dark:hover:text-nord-text hover:bg-gray-50 dark:hover:bg-nord-hover rounded transition-colors text-left"
              >
                + New board
              </button>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
