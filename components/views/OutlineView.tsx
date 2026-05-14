'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MindMapData, MindMapNode } from '@/lib/types';

type Props = {
  mindmapId: string;
  initialData: MindMapData;
  initialTitle: string;
  readonly?: boolean;
  onDataChange?: (data: MindMapData) => void;
  onTitleChange?: (title: string) => void;
};

const SAVE_DEBOUNCE_MS = 800;
const COLOR_COUNT = 5;
const INDENT_PX = 24;

// Shallow-clone the MindMapData so React sees a new reference and we can
// freely mutate the copy before assigning.
function cloneData(d: MindMapData): MindMapData {
  return {
    nodes: { ...d.nodes },
    childIndex: Object.fromEntries(
      Object.entries(d.childIndex).map(([k, v]) => [k, v.slice()]),
    ),
    rootId: d.rootId,
  };
}

function newId(d: MindMapData): string {
  let max = 0;
  for (const id of Object.keys(d.nodes)) {
    const n = parseInt(id.replace(/^n/, ''), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `n${max + 1}`;
}

function recomputeDepths(d: MindMapData) {
  if (!d.rootId) return;
  const walk = (id: string, depth: number) => {
    const node = d.nodes[id];
    if (!node) return;
    node.depth = depth;
    const kids = d.childIndex[id] || [];
    for (const k of kids) walk(k, depth + 1);
  };
  walk(d.rootId, 0);
}

// ---- Mutations ----
// Each returns a new MindMapData; positions are computed via the same arc
// math the canvas uses for fresh maps so a switch back to canvas view
// gives a sensible layout.

function setLabel(d: MindMapData, id: string, label: string): MindMapData {
  const next = cloneData(d);
  const n = next.nodes[id];
  if (!n) return d;
  next.nodes[id] = { ...n, label };
  return next;
}

function setNote(d: MindMapData, id: string, note: string): MindMapData {
  const next = cloneData(d);
  const n = next.nodes[id];
  if (!n) return d;
  next.nodes[id] = { ...n, note };
  return next;
}

function addSiblingAfter(d: MindMapData, afterId: string): {
  data: MindMapData;
  newId: string;
} | null {
  const target = d.nodes[afterId];
  if (!target || target.parentId == null) return null;
  const parentId = target.parentId;
  const parent = d.nodes[parentId];
  if (!parent) return null;
  const next = cloneData(d);
  const id = newId(next);
  const siblings = next.childIndex[parentId] || [];
  const idx = siblings.indexOf(afterId);
  const insertAt = idx >= 0 ? idx + 1 : siblings.length;
  siblings.splice(insertAt, 0, id);
  next.childIndex[parentId] = siblings;
  next.nodes[id] = {
    id,
    label: '',
    x: parent.x + 200,
    y: parent.y + 60 * (insertAt + 1),
    parentId,
    depth: target.depth,
    colorIdx: ((target.colorIdx ?? 0) + 1) % COLOR_COUNT,
    note: '',
    createdAt: Date.now(),
  };
  next.childIndex[id] = [];
  return { data: next, newId: id };
}

function addChildEnd(d: MindMapData, parentId: string): {
  data: MindMapData;
  newId: string;
} | null {
  const parent = d.nodes[parentId];
  if (!parent) return null;
  const next = cloneData(d);
  const id = newId(next);
  const siblings = (next.childIndex[parentId] || []).slice();
  siblings.push(id);
  next.childIndex[parentId] = siblings;
  next.nodes[id] = {
    id,
    label: '',
    x: parent.x + 200,
    y: parent.y + 60 * siblings.length,
    parentId,
    depth: (parent.depth ?? 0) + 1,
    colorIdx: ((parent.colorIdx ?? 0) + 1) % COLOR_COUNT,
    note: '',
    createdAt: Date.now(),
  };
  next.childIndex[id] = [];
  return { data: next, newId: id };
}

// Indent: this node becomes the LAST child of its previous sibling.
function indentNode(d: MindMapData, id: string): MindMapData | null {
  const node = d.nodes[id];
  if (!node || node.parentId == null) return null;
  const siblings = d.childIndex[node.parentId] || [];
  const idx = siblings.indexOf(id);
  if (idx <= 0) return null; // no previous sibling
  const newParentId = siblings[idx - 1];
  return reparent(d, id, newParentId);
}

// Outdent: this node moves up to be a sibling of its parent.
function outdentNode(d: MindMapData, id: string): MindMapData | null {
  const node = d.nodes[id];
  if (!node || node.parentId == null) return null;
  const parent = d.nodes[node.parentId];
  if (!parent || parent.parentId == null) return null; // can't outdent past root
  return reparent(d, id, parent.parentId);
}

function reparent(
  d: MindMapData,
  id: string,
  newParentId: string,
): MindMapData | null {
  const node = d.nodes[id];
  const newParent = d.nodes[newParentId];
  if (!node || !newParent) return null;
  if (id === d.rootId) return null;
  if (id === newParentId) return null;
  // Cycle check: newParent must not be a descendant of id.
  const descendants = getDescendants(d, id);
  if (descendants.has(newParentId)) return null;

  const next = cloneData(d);
  const oldParentId = node.parentId;
  if (oldParentId) {
    next.childIndex[oldParentId] = (next.childIndex[oldParentId] || []).filter(
      (c) => c !== id,
    );
  }
  next.childIndex[newParentId] = (next.childIndex[newParentId] || []).slice();
  next.childIndex[newParentId].push(id);
  next.nodes[id] = { ...node, parentId: newParentId };
  recomputeDepths(next);
  return next;
}

function getDescendants(d: MindMapData, id: string): Set<string> {
  const out = new Set<string>();
  const stack = (d.childIndex[id] || []).slice();
  while (stack.length) {
    const cur = stack.pop()!;
    out.add(cur);
    for (const c of d.childIndex[cur] || []) stack.push(c);
  }
  return out;
}

function removeNode(d: MindMapData, id: string): MindMapData | null {
  if (id === d.rootId) return null;
  const node = d.nodes[id];
  if (!node) return null;
  const next = cloneData(d);
  const drop = (n: string) => {
    for (const c of (next.childIndex[n] || []).slice()) drop(c);
    delete next.nodes[n];
    delete next.childIndex[n];
  };
  drop(id);
  if (node.parentId) {
    next.childIndex[node.parentId] = (next.childIndex[node.parentId] || []).filter(
      (c) => c !== id,
    );
  }
  return next;
}

// ---- Component ----

export default function OutlineView({
  mindmapId,
  initialData,
  initialTitle,
  readonly = false,
  onDataChange,
  onTitleChange,
}: Props) {
  const [data, setData] = useState<MindMapData>(initialData);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const focusOnNextRender = useRef<{ id: string; caret?: 'end' | 'start' } | null>(null);

  // Reseed if the underlying map changes (e.g., view switch with new data).
  useEffect(() => {
    setData(initialData);
  }, [initialData, mindmapId]);

  const commit = useCallback(
    (next: MindMapData) => {
      setData(next);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        onDataChange?.(next);
      }, SAVE_DEBOUNCE_MS);
    },
    [onDataChange],
  );

  // After each commit that designates a focus target, move the cursor there.
  useEffect(() => {
    const target = focusOnNextRender.current;
    if (!target) return;
    focusOnNextRender.current = null;
    const el = inputRefs.current[target.id];
    if (!el) return;
    el.focus();
    if (target.caret === 'end') {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    } else if (target.caret === 'start') {
      el.setSelectionRange(0, 0);
    }
  }, [data]);

  function onLabelChange(id: string, label: string) {
    if (readonly) return;
    commit(setLabel(data, id, label));
    if (id === data.rootId) {
      onTitleChange?.(label || initialTitle);
    }
  }

  function onAddSibling(afterId: string) {
    if (readonly) return;
    const res = addSiblingAfter(data, afterId);
    if (!res) {
      // afterId is the root — adding a sibling at root level is undefined.
      // Fall back to adding a child of the root.
      if (data.rootId) onAddChild(data.rootId);
      return;
    }
    focusOnNextRender.current = { id: res.newId };
    commit(res.data);
  }

  function onAddChild(parentId: string) {
    if (readonly) return;
    const res = addChildEnd(data, parentId);
    if (!res) return;
    focusOnNextRender.current = { id: res.newId };
    commit(res.data);
  }

  function onIndent(id: string) {
    if (readonly) return;
    const next = indentNode(data, id);
    if (next) {
      focusOnNextRender.current = { id, caret: 'end' };
      commit(next);
    }
  }

  function onOutdent(id: string) {
    if (readonly) return;
    const next = outdentNode(data, id);
    if (next) {
      focusOnNextRender.current = { id, caret: 'end' };
      commit(next);
    }
  }

  function onDelete(id: string) {
    if (readonly) return;
    // Find a node to focus next: previous sibling, else parent.
    const node = data.nodes[id];
    let focusTarget: string | null = null;
    if (node?.parentId) {
      const siblings = data.childIndex[node.parentId] || [];
      const idx = siblings.indexOf(id);
      focusTarget =
        idx > 0 ? siblings[idx - 1] : node.parentId !== data.rootId ? node.parentId : null;
    }
    const next = removeNode(data, id);
    if (!next) return;
    if (focusTarget) focusOnNextRender.current = { id: focusTarget, caret: 'end' };
    commit(next);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>, id: string) {
    if (readonly) return;

    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      onAddSibling(id);
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) onOutdent(id);
      else onIndent(id);
      return;
    }
    if (e.key === 'Backspace') {
      const el = e.currentTarget;
      if (el.value === '' && id !== data.rootId) {
        e.preventDefault();
        onDelete(id);
      }
    }
  }

  // Walk depth-first for rendering.
  const rows: Array<{ id: string; depth: number }> = [];
  if (data.rootId) {
    const walk = (id: string, depth: number) => {
      rows.push({ id, depth });
      for (const c of data.childIndex[id] || []) walk(c, depth + 1);
    };
    walk(data.rootId, 0);
  }

  return (
    <div className="outline-view h-full overflow-y-auto p-6 md:p-10 max-w-3xl mx-auto">
      <div className="text-xs uppercase tracking-wider text-[--text-dim] mb-4">
        Outline · {Object.keys(data.nodes).length} nodes
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-[--text-dim]">This map is empty.</p>
      )}

      <ul className="outline-list">
        {rows.map(({ id, depth }) => {
          const node = data.nodes[id];
          if (!node) return null;
          const isRoot = id === data.rootId;
          return (
            <li
              key={id}
              className="outline-row group flex items-baseline gap-2 py-1.5 hover:bg-white/5 rounded px-2 -mx-2 transition-colors"
              style={{ paddingLeft: depth * INDENT_PX + 8 }}
            >
              <span
                className={`shrink-0 select-none text-[--text-dim] ${isRoot ? 'text-pink-400' : ''}`}
                aria-hidden
              >
                {isRoot ? '🧠' : '•'}
              </span>
              <input
                ref={(el) => {
                  if (el) inputRefs.current[id] = el;
                  else delete inputRefs.current[id];
                }}
                value={node.label}
                onChange={(e) => onLabelChange(id, e.target.value)}
                onKeyDown={(e) => handleKey(e, id)}
                placeholder={isRoot ? 'Untitled mind map' : 'Untitled'}
                spellCheck={false}
                readOnly={readonly}
                className="flex-1 bg-transparent border-none outline-none text-sm focus:bg-white/5 rounded px-1 py-0.5 min-w-0"
                aria-label={`Node ${node.label || 'Untitled'}`}
              />
              {node.note && (
                <span
                  className="text-xs text-[--text-dim] italic truncate max-w-xs hidden sm:inline"
                  title={node.note}
                >
                  {node.note}
                </span>
              )}
              {!readonly && (
                <button
                  type="button"
                  onClick={() => onAddChild(id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[--text-dim] hover:text-white px-2 py-0.5 rounded"
                  title="Add child"
                  aria-label="Add child"
                >
                  + child
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {!readonly && (
        <div className="mt-6 text-xs text-[--text-dim] leading-relaxed">
          <strong className="text-white">Keys:</strong>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Enter</kbd>{' '}
          adds a sibling ·{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Tab</kbd>{' '}
          indents ·{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Shift+Tab</kbd>{' '}
          outdents ·{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Backspace</kbd>{' '}
          on an empty line removes the node
        </div>
      )}
    </div>
  );
}
