import { useState, useEffect, useRef, useMemo } from 'react';
import type { NodeStatus, TreeNode, NodeDependency, UpdateNodePayload } from '@kanban/shared';
import { useUpdateNode, useAddDependency, useRemoveDependency } from '../../hooks/useNodes';
import { shortId } from '../../lib/shortId';
import { STATUS_ICON } from '../../lib/statusIcons';

interface NodeDetailProps {
  node: TreeNode;
  cardId: string;
  onClose: () => void;
  onDelete: () => void;
  allNodes?: TreeNode[];
  dependencies?: NodeDependency[];
  onAddDependent?: (parentId: string) => void;
  onSelectNode?: (nodeId: string) => void;
}

interface AutoTextareaProps {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder?: string;
}

function AutoTextarea({ value, onChange, onBlur, placeholder }: AutoTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = 'auto';
    ref.current.style.height = ref.current.scrollHeight + 'px';
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      rows={1}
      className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-nord-border rounded bg-white dark:bg-nord-bg focus:outline-none focus:border-blue-400 dark:focus:border-nord-accent resize-none overflow-hidden"
      placeholder={placeholder}
    />
  );
}

interface StatusOption {
  status: NodeStatus;
  icon: string;
  label: string;
  activeClass: string;
  hoverClass: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { status: 'unlocked', icon: '\u25CB', label: 'Ready',  activeClass: 'bg-blue-100 text-blue-700 dark:bg-nord-accent/20 dark:text-nord-accent font-medium',   hoverClass: 'hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-nord-accent/10 dark:hover:text-nord-accent' },
  { status: 'in_progress', icon: '\u25D0', label: 'Active', activeClass: 'bg-amber-100 text-amber-700 dark:bg-nord-yellow/20 dark:text-nord-yellow font-medium', hoverClass: 'hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-nord-yellow/10 dark:hover:text-nord-yellow' },
  { status: 'done', icon: '\u2713', label: 'Done',   activeClass: 'bg-green-100 text-green-700 dark:bg-nord-green/20 dark:text-nord-green font-medium', hoverClass: 'hover:bg-green-50 hover:text-green-600 dark:hover:bg-nord-green/10 dark:hover:text-nord-green' },
];

export function NodeDetail({ node, cardId, onClose, onDelete, allNodes, dependencies, onAddDependent, onSelectNode }: NodeDetailProps) {
  const updateNode = useUpdateNode(cardId);
  const addDep = useAddDependency(cardId);
  const removeDep = useRemoveDependency(cardId);
  const [title, setTitle] = useState(node.title);
  const [description, setDescription] = useState(node.description);
  const [notes, setNotes] = useState(node.notes);
  const [deadline, setDeadline] = useState(node.deadline || '');
  const [depSearch, setDepSearch] = useState('');
  const [showDepDropdown, setShowDepDropdown] = useState(false);

  useEffect(() => {
    setTitle(node.title);
    setDescription(node.description);
    setNotes(node.notes);
    setDeadline(node.deadline || '');
    setDepSearch('');
    setShowDepDropdown(false);
  }, [node]);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [onClose]);

  function save(updates: UpdateNodePayload): void {
    updateNode.mutate({ id: node.id, ...updates });
  }

  function saveIfChanged(field: 'title' | 'description' | 'notes', value: string): void {
    const normalizedValue = field === 'title' ? value.trim() : value;
    if (normalizedValue !== node[field]) {
      save({ [field]: normalizedValue });
    }
  }

  const isLocked = node.status === 'locked';

  const nodeMap = useMemo(
    () => allNodes ? new Map(allNodes.map(n => [n.id, n])) : new Map<string, TreeNode>(),
    [allNodes],
  );

  const dependsOn = useMemo(() => {
    if (!dependencies || !allNodes) return [];
    return dependencies
      .filter(d => d.node_id === node.id)
      .map(d => {
        const depNode = nodeMap.get(d.depends_on_id);
        return {
          depId: d.id,
          nodeId: d.depends_on_id,
          title: depNode?.title ?? d.depends_on_id,
          status: depNode?.status ?? ('locked' as NodeStatus),
        };
      });
  }, [dependencies, allNodes, node.id, nodeMap]);

  const dependedOnBy = useMemo(() => {
    if (!dependencies || !allNodes) return [];
    return dependencies
      .filter(d => d.depends_on_id === node.id)
      .map(d => nodeMap.get(d.node_id))
      .filter((n): n is TreeNode => !!n);
  }, [dependencies, allNodes, node.id, nodeMap]);

  const availableForDep = useMemo(() => {
    if (!allNodes) return [];
    const existingDepIds = new Set(dependsOn.map(d => d.nodeId));
    existingDepIds.add(node.id);
    const searchLower = depSearch.toLowerCase();
    return allNodes
      .filter(n => !existingDepIds.has(n.id))
      .filter(n => !depSearch || n.title.toLowerCase().includes(searchLower));
  }, [allNodes, dependsOn, node.id, depSearch]);

  function handleAddDep(targetId: string) {
    addDep.mutate({ nodeId: node.id, id: shortId(), dependsOnId: targetId });
    setDepSearch('');
    setShowDepDropdown(false);
  }

  function handleRemoveDep(depId: string) {
    removeDep.mutate({ nodeId: node.id, depId });
  }

  const hasDeps = allNodes && dependencies;

  return (
    <div className="w-80 border-l border-gray-200 dark:border-nord-border bg-white dark:bg-nord-surface p-4 overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-nord-muted uppercase tracking-wider">
          Node detail
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 dark:text-nord-muted hover:text-gray-600 dark:hover:text-nord-text"
          title="Close (Esc)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4 flex-1">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-nord-muted mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => saveIfChanged('title', title)}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-nord-border rounded bg-white dark:bg-nord-bg focus:outline-none focus:border-blue-400 dark:focus:border-nord-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-nord-muted mb-1">Status</label>
          {isLocked ? (
            <div className="text-sm text-gray-400 dark:text-nord-muted italic">
              Locked (complete dependencies first)
            </div>
          ) : (
            <div className="flex gap-1">
              {STATUS_OPTIONS.map(({ status, icon, label, activeClass, hoverClass }) => {
                const isActive = node.status === status;
                return (
                  <button
                    key={status}
                    onClick={() => save({ status })}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-sm transition-colors ${
                      isActive ? activeClass : `bg-gray-50 dark:bg-nord-bg text-gray-400 dark:text-nord-muted ${hoverClass}`
                    }`}
                    title={label}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-nord-muted mb-1">Deadline</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => {
              setDeadline(e.target.value);
              save({ deadline: e.target.value || null });
            }}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-nord-border rounded bg-white dark:bg-nord-bg focus:outline-none focus:border-blue-400 dark:focus:border-nord-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-nord-muted mb-1">Description</label>
          <AutoTextarea
            value={description}
            onChange={setDescription}
            onBlur={() => saveIfChanged('description', description)}
            placeholder="What needs to be done..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-nord-muted mb-1">Notes</label>
          <AutoTextarea
            value={notes}
            onChange={setNotes}
            onBlur={() => saveIfChanged('notes', notes)}
            placeholder="Additional notes..."
          />
        </div>

        {/* Dependencies section — only shown when allNodes/dependencies are provided */}
        {hasDeps && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-nord-muted mb-1.5">Depends on</label>
              {dependsOn.length === 0 ? (
                <div className="text-xs text-gray-400 dark:text-nord-muted italic ml-1">None</div>
              ) : (
                <div className="space-y-0.5">
                  {dependsOn.map(dep => (
                    <div key={dep.depId} className="flex items-center justify-between group ml-1 py-0.5">
                      <button
                        onClick={() => onSelectNode?.(dep.nodeId)}
                        className="text-xs text-blue-500 dark:text-nord-accent hover:underline truncate text-left"
                      >
                        {STATUS_ICON[dep.status]} {dep.title}
                      </button>
                      <button
                        onClick={() => handleRemoveDep(dep.depId)}
                        className="text-xs text-gray-300 dark:text-nord-muted/50 hover:text-red-500 dark:hover:text-nord-red opacity-0 group-hover:opacity-100 transition-opacity px-1"
                        title="Remove dependency"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add dependency */}
              <div className="relative mt-1.5">
                <input
                  type="text"
                  value={depSearch}
                  onChange={(e) => { setDepSearch(e.target.value); setShowDepDropdown(true); }}
                  onFocus={() => setShowDepDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDepDropdown(false), 150)}
                  placeholder="+ Add dependency..."
                  className="w-full px-2.5 py-1 text-xs border border-gray-200 dark:border-nord-border rounded bg-white dark:bg-nord-bg focus:outline-none focus:border-blue-400 dark:focus:border-nord-accent"
                />
                {showDepDropdown && availableForDep.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-0.5 max-h-36 overflow-y-auto bg-white dark:bg-nord-surface border border-gray-200 dark:border-nord-border rounded shadow-lg">
                    {availableForDep.slice(0, 10).map(n => (
                      <button
                        key={n.id}
                        onMouseDown={(e) => { e.preventDefault(); handleAddDep(n.id); }}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-gray-700 dark:text-nord-text hover:bg-blue-50 dark:hover:bg-nord-accent/10 transition-colors"
                      >
                        {STATUS_ICON[n.status]} {n.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {dependedOnBy.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-nord-muted mb-1.5">Depended on by</label>
                <div className="space-y-0.5">
                  {dependedOnBy.map(n => (
                    <div key={n.id} className="ml-1 py-0.5">
                      <button
                        onClick={() => onSelectNode?.(n.id)}
                        className="text-xs text-gray-500 dark:text-nord-muted hover:text-blue-500 dark:hover:text-nord-accent hover:underline truncate text-left"
                      >
                        {STATUS_ICON[n.status]} {n.title}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {onAddDependent && (
              <button
                onClick={() => onAddDependent(node.id)}
                className="w-full py-1.5 text-xs text-blue-500 dark:text-nord-accent hover:bg-blue-50 dark:hover:bg-nord-accent/10 rounded transition-colors border border-dashed border-gray-200 dark:border-nord-border"
              >
                + Add dependent task
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-nord-border">
        <button
          onClick={() => {
            if (confirm('Delete this node and all its dependencies?')) {
              onDelete();
            }
          }}
          className="w-full py-1.5 text-sm text-red-500 dark:text-nord-red hover:bg-red-50 dark:hover:bg-nord-red/10 rounded transition-colors"
        >
          Delete node
        </button>
      </div>
    </div>
  );
}
