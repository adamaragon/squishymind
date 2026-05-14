'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
const X_PER_DEPTH = 240;
const Y_PER_LEAF = 56;
const CARD_WIDTH = 184;
const CARD_HEIGHT = 44;
const PAD_X = 32;
const PAD_Y = 32;

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
    for (const k of d.childIndex[id] || []) walk(k, depth + 1);
  };
  walk(d.rootId, 0);
}

function setLabel(d: MindMapData, id: string, label: string): MindMapData {
  const next = cloneData(d);
  const n = next.nodes[id];
  if (!n) return d;
  next.nodes[id] = { ...n, label };
  return next;
}

function addChildEnd(
  d: MindMapData,
  parentId: string,
): { data: MindMapData; newId: string } | null {
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

type Pos = { x: number; y: number };
type Layout = {
  positions: Record<string, Pos>;
  width: number;
  height: number;
  order: string[]; // depth-first id order, useful for stable rendering
};

function computeLayout(d: MindMapData): Layout {
  const positions: Record<string, Pos> = {};
  const order: string[] = [];
  let leafCount = 0;

  function visit(id: string, depth: number): { topY: number; bottomY: number } {
    const node = d.nodes[id];
    if (!node) return { topY: 0, bottomY: 0 };
    order.push(id);
    const children = d.childIndex[id] || [];
    if (children.length === 0) {
      const y = leafCount * Y_PER_LEAF;
      positions[id] = { x: depth * X_PER_DEPTH, y };
      leafCount++;
      return { topY: y, bottomY: y };
    }
    const ranges = children.map((cid) => visit(cid, depth + 1));
    const top = ranges[0].topY;
    const bottom = ranges[ranges.length - 1].bottomY;
    positions[id] = { x: depth * X_PER_DEPTH, y: (top + bottom) / 2 };
    return { topY: top, bottomY: bottom };
  }

  if (d.rootId) visit(d.rootId, 0);

  const ys = Object.values(positions).map((p) => p.y);
  const xs = Object.values(positions).map((p) => p.x);
  const maxX = xs.length ? Math.max(...xs) : 0;
  const maxY = ys.length ? Math.max(...ys) : 0;
  return {
    positions,
    width: maxX + CARD_WIDTH + PAD_X * 2,
    height: maxY + CARD_HEIGHT + PAD_Y * 2,
    order,
  };
}

// Colour for a node card. Mirrors the canvas's --accent-1..5 palette via
// inline CSS variable so themes still apply.
function colorVars(colorIdx: number): React.CSSProperties {
  const a = (colorIdx % COLOR_COUNT) + 1;
  const b = ((colorIdx + 2) % COLOR_COUNT) + 1;
  return {
    ['--accent-c1' as string]: `var(--accent-${a})`,
    ['--accent-c2' as string]: `var(--accent-${b})`,
  } as React.CSSProperties;
}

export default function TreeView({
  mindmapId,
  initialData,
  initialTitle,
  readonly = false,
  onDataChange,
  onTitleChange,
}: Props) {
  const [data, setData] = useState<MindMapData>(initialData);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialData.rootId ?? null,
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const focusOnNextRender = useRef<{ id: string; caret?: 'end' } | null>(null);

  useEffect(() => {
    setData(initialData);
    setSelectedId(initialData.rootId ?? null);
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
    }
  }, [data]);

  const layout = useMemo(() => computeLayout(data), [data]);

  function onLabelChange(id: string, label: string) {
    if (readonly) return;
    commit(setLabel(data, id, label));
    if (id === data.rootId) onTitleChange?.(label || initialTitle);
  }

  function onAddChild(parentId: string) {
    if (readonly) return;
    const res = addChildEnd(data, parentId);
    if (!res) return;
    focusOnNextRender.current = { id: res.newId };
    setSelectedId(res.newId);
    commit(res.data);
  }

  function onDelete(id: string) {
    if (readonly || id === data.rootId) return;
    const node = data.nodes[id];
    const fallback = node?.parentId ?? null;
    const next = removeNode(data, id);
    if (!next) return;
    if (fallback) {
      focusOnNextRender.current = { id: fallback, caret: 'end' };
      setSelectedId(fallback);
    }
    commit(next);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>, id: string) {
    if (readonly) return;
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      // Enter in tree view adds a CHILD (visually intuitive — the
      // new card appears to the right of the focused one). Outline
      // uses Enter for siblings; tree's spatial model differs.
      onAddChild(id);
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

  // Build SVG edges: bezier from each parent's right edge to each child's left.
  const edgePaths: Array<{ d: string; colorIdx: number; key: string }> = [];
  for (const [parentId, kids] of Object.entries(data.childIndex)) {
    const p = layout.positions[parentId];
    if (!p) continue;
    const parentNode = data.nodes[parentId];
    for (const childId of kids) {
      const c = layout.positions[childId];
      if (!c) continue;
      const x1 = p.x + CARD_WIDTH + PAD_X;
      const y1 = p.y + CARD_HEIGHT / 2 + PAD_Y;
      const x2 = c.x + PAD_X;
      const y2 = c.y + CARD_HEIGHT / 2 + PAD_Y;
      const cx = (x1 + x2) / 2;
      edgePaths.push({
        d: `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`,
        colorIdx: parentNode?.colorIdx ?? 0,
        key: `${parentId}->${childId}`,
      });
    }
  }

  return (
    <div className="tree-view h-full overflow-auto p-4 relative">
      <div
        className="relative"
        style={{
          width: layout.width,
          height: Math.max(layout.height, 200),
        }}
      >
        {/* Edges */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={layout.width}
          height={Math.max(layout.height, 200)}
          aria-hidden
        >
          {edgePaths.map((e) => (
            <path
              key={e.key}
              d={e.d}
              fill="none"
              stroke="var(--edge)"
              strokeWidth={2}
              strokeOpacity={0.75}
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* Nodes */}
        {layout.order.map((id) => {
          const node = data.nodes[id];
          if (!node) return null;
          const pos = layout.positions[id];
          if (!pos) return null;
          const isRoot = id === data.rootId;
          const isSelected = id === selectedId;
          return (
            <TreeNodeCard
              key={id}
              node={node}
              x={pos.x + PAD_X}
              y={pos.y + PAD_Y}
              isRoot={isRoot}
              isSelected={isSelected}
              readonly={readonly}
              inputRef={(el) => {
                if (el) inputRefs.current[id] = el;
                else delete inputRefs.current[id];
              }}
              onSelect={() => setSelectedId(id)}
              onLabelChange={(v) => onLabelChange(id, v)}
              onKeyDown={(e) => handleKey(e, id)}
              onAddChild={() => onAddChild(id)}
            />
          );
        })}
      </div>

      {!readonly && (
        <div className="absolute bottom-3 right-3 text-[10px] text-[--text-dim] bg-[--ui-bg] backdrop-blur border border-white/10 rounded px-2 py-1">
          <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10">Enter</kbd>{' '}
          adds child ·{' '}
          <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10">Backspace</kbd>{' '}
          on empty removes
        </div>
      )}
    </div>
  );
}

function TreeNodeCard({
  node,
  x,
  y,
  isRoot,
  isSelected,
  readonly,
  inputRef,
  onSelect,
  onLabelChange,
  onKeyDown,
  onAddChild,
}: {
  node: MindMapNode;
  x: number;
  y: number;
  isRoot: boolean;
  isSelected: boolean;
  readonly: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onSelect: () => void;
  onLabelChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAddChild: () => void;
}) {
  return (
    <div
      className={`tree-node group absolute select-none ${isSelected ? 'tree-node-selected' : ''} ${isRoot ? 'tree-node-root' : ''}`}
      style={{
        left: x,
        top: y,
        width: CARD_WIDTH,
        minHeight: CARD_HEIGHT,
        ...colorVars(node.colorIdx),
      }}
      onClick={onSelect}
      title={node.note || undefined}
    >
      <input
        ref={inputRef}
        value={node.label}
        onChange={(e) => onLabelChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={isRoot ? 'Untitled mind map' : 'Untitled'}
        spellCheck={false}
        readOnly={readonly}
        className="tree-node-label"
        aria-label={`Node ${node.label || 'Untitled'}`}
      />
      {node.note && (
        <div className="tree-node-note" title={node.note}>
          {node.note}
        </div>
      )}
      {!readonly && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild();
          }}
          className="tree-node-add"
          title="Add child"
          aria-label="Add child"
        >
          +
        </button>
      )}

      <style jsx>{`
        .tree-node {
          background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--accent-c1, var(--accent-1)) 32%, var(--node-bg)) 0%,
            var(--node-bg-2) 70%
          );
          border: 1px solid
            color-mix(in srgb, var(--accent-c1, var(--accent-1)) 40%, var(--node-border));
          border-radius: 10px;
          padding: 8px 12px;
          color: var(--node-text);
          font-size: 13px;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.05) inset,
            0 6px 16px var(--node-shadow);
          cursor: pointer;
          transition: transform 0.12s, box-shadow 0.18s, border-color 0.18s;
        }
        .tree-node:hover {
          transform: translateY(-1px);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.07) inset,
            0 8px 22px var(--node-shadow);
        }
        .tree-node-selected {
          border-color: var(--selection);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.07) inset,
            0 0 0 3px color-mix(in srgb, var(--selection) 30%, transparent),
            0 8px 22px var(--node-shadow);
        }
        .tree-node-root {
          background: linear-gradient(
            135deg,
            var(--accent-1),
            var(--accent-3)
          );
          color: white;
          border-color: rgba(255, 255, 255, 0.18);
          font-weight: 600;
        }
        .tree-node-root .tree-node-label {
          color: white;
        }
        .tree-node-label {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: inherit;
          font: inherit;
          font-weight: 500;
          padding: 0;
          margin: 0;
        }
        .tree-node-note {
          margin-top: 3px;
          font-size: 11px;
          line-height: 1.3;
          color: var(--ui-text-dim);
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .tree-node-add {
          position: absolute;
          right: -10px;
          top: 50%;
          transform: translateY(-50%) scale(0);
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--selection);
          color: var(--bg-1);
          border: none;
          font-weight: 700;
          font-size: 14px;
          line-height: 1;
          cursor: pointer;
          transition: transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 10px var(--node-shadow);
        }
        .tree-node:hover .tree-node-add,
        .tree-node-selected .tree-node-add {
          transform: translateY(-50%) scale(1);
        }
        .tree-node-add:hover {
          background: color-mix(in srgb, var(--selection) 80%, white);
        }
      `}</style>
    </div>
  );
}
