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

// Silence: setNote is kept around for parity with future note-editing UI.
void setNote;

// Five-accent palette aligned with the canvas/colorIdx system.
const ACCENT_PALETTE = [
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#22d3ee', // sky
  '#f59e0b', // amber
];

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
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
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

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setCollapsed(new Set());
  }

  function collapseAll() {
    // Collapse every node that has children (except root, so something is visible).
    const next = new Set<string>();
    for (const [pid, kids] of Object.entries(data.childIndex)) {
      if (kids.length > 0 && pid !== data.rootId) next.add(pid);
    }
    setCollapsed(next);
  }

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
    // Expanding the parent so the new child is visible.
    if (collapsed.has(parentId)) {
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
    }
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

  // Walk depth-first for rendering. Skip subtrees rooted at collapsed nodes.
  const rows: Array<{
    id: string;
    depth: number;
    hasChildren: boolean;
    childCount: number;
    descendantCount: number;
    ancestors: string[];
    isLast: boolean;
  }> = [];

  function countDescendants(id: string): number {
    const kids = data.childIndex[id] || [];
    let total = kids.length;
    for (const k of kids) total += countDescendants(k);
    return total;
  }

  if (data.rootId) {
    const walk = (id: string, depth: number, ancestors: string[], isLast: boolean) => {
      const kids = data.childIndex[id] || [];
      rows.push({
        id,
        depth,
        hasChildren: kids.length > 0,
        childCount: kids.length,
        descendantCount: countDescendants(id),
        ancestors,
        isLast,
      });
      if (collapsed.has(id)) return;
      for (let i = 0; i < kids.length; i++) {
        walk(kids[i], depth + 1, [...ancestors, id], i === kids.length - 1);
      }
    };
    walk(data.rootId, 0, [], true);
  }

  // For tree guides: figure out which ancestor levels still need a vertical
  // continuation line. An ancestor at depth k needs a guide if it's NOT the
  // last child of its parent (i.e., siblings still follow below).
  function ancestorContinues(ancestorId: string): boolean {
    const node = data.nodes[ancestorId];
    if (!node || !node.parentId) return false;
    const sibs = data.childIndex[node.parentId] || [];
    return sibs.indexOf(ancestorId) < sibs.length - 1;
  }

  const totalNodes = Object.keys(data.nodes).length;
  const visibleNodes = rows.length;
  const maxDepth = rows.reduce((acc, r) => Math.max(acc, r.depth), 0);

  return (
    <div className="outline-view h-full flex flex-col">
      {/* ---- Toolbar / stat strip ---- */}
      <div className="ol-toolbar shrink-0">
        <div className="ol-toolbar-left">
          <div className="ol-title">
            <span className="ol-title-icon" aria-hidden>⌘</span>
            <h2>Outline</h2>
            {readonly && <span className="ol-readonly-pill">Read-only</span>}
          </div>
          <div className="ol-stats">
            <span className="ol-stat">
              <span className="ol-stat-num">{visibleNodes}</span>
              <span className="ol-stat-lbl">visible</span>
            </span>
            <span className="ol-stat-sep" aria-hidden>·</span>
            <span className="ol-stat">
              <span className="ol-stat-num">{totalNodes}</span>
              <span className="ol-stat-lbl">total</span>
            </span>
            <span className="ol-stat-sep" aria-hidden>·</span>
            <span className="ol-stat">
              <span className="ol-stat-num">{maxDepth + 1}</span>
              <span className="ol-stat-lbl">levels</span>
            </span>
          </div>
        </div>
        <div className="ol-toolbar-right">
          <button
            type="button"
            className="ol-tool-btn"
            onClick={expandAll}
            title="Expand all sections"
          >
            <span aria-hidden>▾</span> Expand all
          </button>
          <button
            type="button"
            className="ol-tool-btn"
            onClick={collapseAll}
            title="Collapse all sections"
          >
            <span aria-hidden>▸</span> Collapse all
          </button>
        </div>
      </div>

      {/* ---- Outline body ---- */}
      <div className="ol-scroll">
        <div className="ol-paper">
          {rows.length === 0 && (
            <div className="ol-empty">
              <div className="ol-empty-icon" aria-hidden>≡</div>
              <h3>Nothing to outline yet</h3>
              <p>Add a node on the canvas to get started.</p>
            </div>
          )}

          <ul className="ol-list" role="tree">
            {rows.map(({ id, depth, hasChildren, childCount, descendantCount, ancestors }) => {
              const node = data.nodes[id];
              if (!node) return null;
              const isRoot = id === data.rootId;
              const isCollapsed = collapsed.has(id);
              const accent = ACCENT_PALETTE[(node.colorIdx ?? 0) % 5];
              const isFocused = focusedId === id;
              return (
                <li
                  key={id}
                  className={`ol-row ${isRoot ? 'is-root' : ''} ${isFocused ? 'is-focused' : ''}`}
                  role="treeitem"
                  aria-expanded={hasChildren ? !isCollapsed : undefined}
                  aria-level={depth + 1}
                  style={{
                    ['--ol-accent' as string]: accent,
                  }}
                  onMouseEnter={() => setFocusedId(id)}
                  onMouseLeave={() => setFocusedId((c) => (c === id ? null : c))}
                >
                  {/* Tree guides — one vertical line per ancestor depth */}
                  <div className="ol-guides" aria-hidden>
                    {ancestors.map((aid, i) => (
                      <span
                        key={i}
                        className={`ol-guide ${ancestorContinues(aid) ? 'ol-guide-active' : ''}`}
                      />
                    ))}
                  </div>

                  {/* Connector elbow into the row */}
                  {ancestors.length > 0 && (
                    <span
                      className="ol-elbow"
                      style={{ left: ancestors.length * INDENT_PX - 12 }}
                      aria-hidden
                    />
                  )}

                  {/* Disclosure triangle (or placeholder if leaf) */}
                  <button
                    type="button"
                    className={`ol-chev ${hasChildren ? '' : 'is-empty'} ${isCollapsed ? 'is-collapsed' : ''}`}
                    onClick={() => hasChildren && toggleCollapse(id)}
                    aria-label={
                      hasChildren
                        ? isCollapsed
                          ? `Expand ${node.label || 'node'}`
                          : `Collapse ${node.label || 'node'}`
                        : undefined
                    }
                    style={{ marginLeft: depth * INDENT_PX }}
                    disabled={!hasChildren}
                    tabIndex={hasChildren ? 0 : -1}
                  >
                    {hasChildren ? (isCollapsed ? '▸' : '▾') : '•'}
                  </button>

                  {/* Colour bullet */}
                  <span
                    className="ol-bullet"
                    aria-hidden
                    style={{
                      background: isRoot
                        ? 'linear-gradient(135deg, #ec4899, #8b5cf6)'
                        : `linear-gradient(135deg, ${accent}, ${
                            ACCENT_PALETTE[((node.colorIdx ?? 0) + 2) % 5]
                          })`,
                    }}
                  />

                  {/* Label + note column */}
                  <div className="ol-content">
                    <input
                      ref={(el) => {
                        if (el) inputRefs.current[id] = el;
                        else delete inputRefs.current[id];
                      }}
                      value={node.label}
                      onChange={(e) => onLabelChange(id, e.target.value)}
                      onKeyDown={(e) => handleKey(e, id)}
                      onFocus={() => setFocusedId(id)}
                      placeholder={isRoot ? 'Untitled mind map' : 'Untitled'}
                      spellCheck={false}
                      readOnly={readonly}
                      className="ol-input"
                      aria-label={`Node ${node.label || 'Untitled'}`}
                    />
                    {node.note && (
                      <p className="ol-note" title={node.note}>
                        {node.note}
                      </p>
                    )}
                  </div>

                  {/* Right column: metadata + actions */}
                  <div className="ol-meta">
                    {hasChildren && (
                      <span
                        className="ol-childcount"
                        title={`${childCount} direct child${childCount === 1 ? '' : 'ren'} · ${descendantCount} descendant${descendantCount === 1 ? '' : 's'}`}
                      >
                        {isCollapsed ? `${descendantCount} hidden` : `${childCount}`}
                      </span>
                    )}
                    {!readonly && (
                      <button
                        type="button"
                        className="ol-add-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddChild(id);
                        }}
                        title="Add child"
                        aria-label={`Add child to ${node.label || 'this node'}`}
                      >
                        +
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Keyboard hint footer */}
        {!readonly && rows.length > 0 && (
          <div className="ol-keyhint">
            <kbd>Enter</kbd> sibling ·{' '}
            <kbd>Tab</kbd> indent ·{' '}
            <kbd>⇧ Tab</kbd> outdent ·{' '}
            <kbd>⌫</kbd> on empty removes ·{' '}
            <kbd>▸</kbd> click to fold
          </div>
        )}
      </div>

      <style jsx>{`
        .outline-view {
          color: var(--text);
          background:
            radial-gradient(
              1100px 600px at 0% 0%,
              rgba(139, 92, 246, 0.05) 0%,
              transparent 55%
            ),
            radial-gradient(
              900px 500px at 100% 100%,
              rgba(236, 72, 153, 0.05) 0%,
              transparent 55%
            );
        }

        /* ---- Toolbar ---- */
        .ol-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px 22px;
          border-bottom: 1px solid var(--border);
          background: rgba(10, 11, 22, 0.6);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          flex-wrap: wrap;
        }
        .ol-toolbar-left {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
        }
        .ol-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ol-title-icon {
          font-size: 16px;
          line-height: 1;
          color: transparent;
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          background-clip: text;
          -webkit-background-clip: text;
          font-weight: 700;
        }
        .ol-title h2 {
          font-size: 14px;
          font-weight: 600;
          margin: 0;
          letter-spacing: 0.2px;
        }
        .ol-readonly-pill {
          font-size: 9px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          font-weight: 600;
          color: rgba(236, 72, 153, 0.9);
          background: rgba(236, 72, 153, 0.1);
          border: 1px solid rgba(236, 72, 153, 0.3);
          padding: 2px 7px;
          border-radius: 999px;
        }
        .ol-stats {
          display: flex;
          align-items: baseline;
          gap: 8px;
          font-size: 11px;
          color: var(--text-dim);
        }
        .ol-stat {
          display: inline-flex;
          align-items: baseline;
          gap: 4px;
        }
        .ol-stat-num {
          color: var(--text);
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          font-size: 13px;
        }
        .ol-stat-lbl {
          opacity: 0.7;
        }
        .ol-stat-sep {
          opacity: 0.3;
        }
        .ol-toolbar-right {
          display: flex;
          gap: 6px;
        }
        .ol-tool-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-dim);
          border: 1px solid var(--border);
          font-size: 11px;
          font-weight: 500;
          padding: 5px 10px;
          border-radius: 7px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ol-tool-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text);
          border-color: var(--border-strong);
        }

        /* ---- Scroll + paper ---- */
        .ol-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 24px 14px 80px;
        }
        .ol-paper {
          max-width: 880px;
          margin: 0 auto;
          background:
            linear-gradient(180deg, rgba(15, 17, 36, 0.5), rgba(15, 17, 36, 0.3)),
            repeating-linear-gradient(
              0deg,
              rgba(255, 255, 255, 0) 0px,
              rgba(255, 255, 255, 0) 31px,
              rgba(255, 255, 255, 0.025) 31px,
              rgba(255, 255, 255, 0.025) 32px
            );
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 18px 14px;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.04) inset,
            0 24px 60px rgba(0, 0, 0, 0.35);
        }

        /* ---- Empty state ---- */
        .ol-empty {
          padding: 60px 24px;
          text-align: center;
        }
        .ol-empty-icon {
          font-size: 48px;
          opacity: 0.25;
          margin-bottom: 12px;
        }
        .ol-empty h3 {
          font-size: 15px;
          font-weight: 600;
          margin: 0 0 6px;
        }
        .ol-empty p {
          font-size: 12px;
          color: var(--text-dim);
          margin: 0;
        }

        /* ---- List + rows ---- */
        .ol-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .ol-row {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 6px 10px 6px 6px;
          border-radius: 8px;
          transition: background 0.12s;
          min-height: 32px;
        }
        .ol-row:hover {
          background: linear-gradient(
            90deg,
            color-mix(in srgb, var(--ol-accent) 12%, transparent) 0%,
            rgba(255, 255, 255, 0.02) 70%
          );
          box-shadow: inset 2px 0 0 var(--ol-accent);
        }
        .ol-row.is-focused {
          background: linear-gradient(
            90deg,
            color-mix(in srgb, var(--ol-accent) 14%, transparent) 0%,
            rgba(255, 255, 255, 0.02) 70%
          );
          box-shadow: inset 2px 0 0 var(--ol-accent);
        }
        .ol-row.is-root {
          margin-bottom: 6px;
          padding-bottom: 10px;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.06);
        }

        /* Tree guides */
        .ol-guides {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 6px;
          display: flex;
          pointer-events: none;
        }
        .ol-guide {
          width: ${INDENT_PX}px;
          flex-shrink: 0;
          position: relative;
        }
        .ol-guide.ol-guide-active::before {
          content: '';
          position: absolute;
          left: 15px;
          top: 0;
          bottom: 0;
          width: 1px;
          background: rgba(255, 255, 255, 0.06);
        }

        /* Connector elbow from guide to row */
        .ol-elbow {
          position: absolute;
          top: 16px;
          width: 14px;
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          pointer-events: none;
        }

        /* Disclosure chevron */
        .ol-chev {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: var(--text-dim);
          border: none;
          border-radius: 4px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.12s;
          position: relative;
          z-index: 1;
        }
        .ol-chev:hover:not(.is-empty) {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text);
        }
        .ol-chev.is-empty {
          color: rgba(255, 255, 255, 0.18);
          cursor: default;
          font-size: 14px;
        }

        /* Colour bullet */
        .ol-bullet {
          flex-shrink: 0;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-top: 6px;
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.1),
            0 2px 6px rgba(0, 0, 0, 0.5);
          position: relative;
          z-index: 1;
        }
        .is-root .ol-bullet {
          width: 14px;
          height: 14px;
          margin-top: 4px;
          box-shadow:
            0 0 0 2px rgba(236, 72, 153, 0.25),
            0 4px 10px rgba(236, 72, 153, 0.4);
        }

        /* Label + note */
        .ol-content {
          flex: 1;
          min-width: 0;
        }
        .ol-input {
          width: 100%;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          color: var(--text);
          font: inherit;
          font-size: 14px;
          line-height: 1.4;
          font-weight: 500;
          padding: 3px 8px;
          margin-left: -8px;
          outline: none;
          transition: all 0.12s;
        }
        .is-root .ol-input {
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.2px;
          background: linear-gradient(135deg, #ec4899, #8b5cf6, #06b6d4);
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
        }
        .ol-input:focus {
          background: rgba(255, 255, 255, 0.04);
          border-color: var(--border-strong);
          color: var(--text);
        }
        .is-root .ol-input:focus {
          color: var(--text);
          background: rgba(255, 255, 255, 0.04);
          -webkit-text-fill-color: var(--text);
        }
        .ol-input::placeholder {
          color: var(--text-dim);
          font-style: italic;
        }
        .ol-note {
          margin: 2px 0 0 0;
          padding: 0 8px;
          font-size: 12px;
          line-height: 1.4;
          color: var(--text-dim);
          font-style: italic;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Meta + actions */
        .ol-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          margin-top: 2px;
          margin-left: 4px;
        }
        .ol-childcount {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.4px;
          color: var(--text-dim);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          padding: 2px 7px;
          border-radius: 999px;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .ol-row:hover .ol-childcount,
        .ol-row.is-focused .ol-childcount {
          color: var(--text);
          background: color-mix(in srgb, var(--ol-accent) 16%, transparent);
          border-color: color-mix(in srgb, var(--ol-accent) 38%, transparent);
        }
        .ol-add-btn {
          opacity: 0;
          width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          color: white;
          border: none;
          border-radius: 50%;
          font-size: 14px;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 4px 10px rgba(139, 92, 246, 0.4);
        }
        .ol-row:hover .ol-add-btn,
        .ol-row.is-focused .ol-add-btn,
        .ol-input:focus ~ .ol-meta .ol-add-btn {
          opacity: 1;
        }
        .ol-add-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 14px rgba(139, 92, 246, 0.55);
        }

        /* ---- Keyboard hint ---- */
        .ol-keyhint {
          max-width: 880px;
          margin: 18px auto 0;
          padding: 10px 14px;
          font-size: 11px;
          color: var(--text-dim);
          background: rgba(15, 17, 36, 0.4);
          border: 1px solid var(--border);
          border-radius: 10px;
          text-align: center;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
        .ol-keyhint :global(kbd) {
          display: inline-block;
          padding: 1px 6px;
          margin: 0 2px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid var(--border);
          border-radius: 4px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 10px;
          color: var(--text);
        }
      `}</style>
    </div>
  );
}
