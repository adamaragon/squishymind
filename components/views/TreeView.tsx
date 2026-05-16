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
const X_PER_DEPTH = 260;
const Y_PER_LEAF = 64;
const CARD_WIDTH = 200;
const CARD_HEIGHT = 56;
const PAD_X = 56;
const PAD_Y = 56;

// Five-accent palette mirroring the canvas.
const ACCENT_PALETTE = [
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#22d3ee', // sky
  '#f59e0b', // amber
];

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
// Keep recomputeDepths referenced so unused-warnings don't fire while the
// function is held for future re-layout work.
void recomputeDepths;

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
  order: string[];
};

function computeLayout(d: MindMapData, collapsed: Set<string>): Layout {
  const positions: Record<string, Pos> = {};
  const order: string[] = [];
  let leafCount = 0;

  function visit(id: string, depth: number): { topY: number; bottomY: number } {
    const node = d.nodes[id];
    if (!node) return { topY: 0, bottomY: 0 };
    order.push(id);
    const children = collapsed.has(id) ? [] : d.childIndex[id] || [];
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

export default function TreeView({
  mindmapId,
  initialData,
  initialTitle,
  readonly = false,
  onDataChange,
  onTitleChange,
}: Props) {
  const [data, setData] = useState<MindMapData>(initialData);
  const [selectedId, setSelectedId] = useState<string | null>(initialData.rootId ?? null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const focusOnNextRender = useRef<{ id: string; caret?: 'end' } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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

  const layout = useMemo(() => computeLayout(data, collapsed), [data, collapsed]);

  // Stats
  const stats = useMemo(() => {
    const totalNodes = Object.keys(data.nodes).length;
    const branches = Object.entries(data.childIndex).filter(([, v]) => v.length > 0).length;
    const leaves = totalNodes - branches;
    const maxDepth = Math.max(
      0,
      ...Object.values(data.nodes).map((n) => n.depth ?? 0),
    );
    return { totalNodes, branches, leaves, maxDepth: maxDepth + 1 };
  }, [data]);

  function onLabelChange(id: string, label: string) {
    if (readonly) return;
    commit(setLabel(data, id, label));
    if (id === data.rootId) onTitleChange?.(label || initialTitle);
  }

  function onAddChild(parentId: string) {
    if (readonly) return;
    const res = addChildEnd(data, parentId);
    if (!res) return;
    if (collapsed.has(parentId)) {
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
    }
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
    const next = new Set<string>();
    for (const [pid, kids] of Object.entries(data.childIndex)) {
      if (kids.length > 0 && pid !== data.rootId) next.add(pid);
    }
    setCollapsed(next);
  }

  function fitToScreen() {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const availW = el.clientWidth;
    const availH = el.clientHeight;
    const ratio = Math.min(availW / layout.width, availH / layout.height, 1);
    setZoom(Math.max(0.4, ratio));
    // Scroll to origin so we can see the whole tree.
    requestAnimationFrame(() => {
      el.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
    });
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>, id: string) {
    if (readonly) return;
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
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

  // Build edge paths. Gradient stroke ID per parent colorIdx so each subtree
  // has its own colour signature flowing outward.
  const edgePaths: Array<{
    d: string;
    colorIdx: number;
    key: string;
    isHighlight: boolean;
  }> = [];
  for (const [parentId, kids] of Object.entries(data.childIndex)) {
    if (collapsed.has(parentId)) continue;
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
      const isHighlight =
        selectedId === parentId ||
        selectedId === childId ||
        hoveredId === parentId ||
        hoveredId === childId;
      edgePaths.push({
        d: `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`,
        colorIdx: parentNode?.colorIdx ?? 0,
        key: `${parentId}->${childId}`,
        isHighlight,
      });
    }
  }

  return (
    <div className="tree-view h-full flex flex-col">
      {/* ---- Toolbar ---- */}
      <div className="tr-toolbar shrink-0">
        <div className="tr-toolbar-left">
          <div className="tr-title">
            <span className="tr-title-icon" aria-hidden>⌥</span>
            <h2>Tree</h2>
            {readonly && <span className="tr-readonly-pill">Read-only</span>}
          </div>
          <div className="tr-stats">
            <span className="tr-stat">
              <span className="tr-stat-num">{stats.totalNodes}</span>
              <span className="tr-stat-lbl">nodes</span>
            </span>
            <span className="tr-stat-sep" aria-hidden>·</span>
            <span className="tr-stat">
              <span className="tr-stat-num">{stats.branches}</span>
              <span className="tr-stat-lbl">branches</span>
            </span>
            <span className="tr-stat-sep" aria-hidden>·</span>
            <span className="tr-stat">
              <span className="tr-stat-num">{stats.leaves}</span>
              <span className="tr-stat-lbl">leaves</span>
            </span>
            <span className="tr-stat-sep" aria-hidden>·</span>
            <span className="tr-stat">
              <span className="tr-stat-num">{stats.maxDepth}</span>
              <span className="tr-stat-lbl">deep</span>
            </span>
          </div>
        </div>
        <div className="tr-toolbar-right">
          <div className="tr-zoom" role="group" aria-label="Zoom">
            <button
              type="button"
              className="tr-zoom-btn"
              onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}
              title="Zoom out"
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="tr-zoom-num">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="tr-zoom-btn"
              onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.1).toFixed(2)))}
              title="Zoom in"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              className="tr-zoom-btn tr-zoom-fit"
              onClick={fitToScreen}
              title="Fit to screen"
            >
              Fit
            </button>
          </div>
          <button type="button" className="tr-tool-btn" onClick={expandAll}>
            <span aria-hidden>▾</span> Expand all
          </button>
          <button type="button" className="tr-tool-btn" onClick={collapseAll}>
            <span aria-hidden>▸</span> Collapse all
          </button>
        </div>
      </div>

      {/* ---- Canvas / scroll area ---- */}
      <div className="tr-scroll" ref={scrollRef}>
        <div
          className="tr-stage"
          style={{
            width: layout.width * zoom,
            height: Math.max(layout.height, 360) * zoom,
          }}
        >
          <div
            className="tr-world"
            style={{
              width: layout.width,
              height: Math.max(layout.height, 360),
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {/* Edge SVG — gradient strokes per accent colour */}
            <svg
              className="tr-edges"
              width={layout.width}
              height={Math.max(layout.height, 360)}
              aria-hidden
            >
              <defs>
                {ACCENT_PALETTE.map((c, i) => (
                  <linearGradient
                    key={i}
                    id={`tr-edge-${i}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor={c} stopOpacity="0.55" />
                    <stop offset="100%" stopColor={c} stopOpacity="0.18" />
                  </linearGradient>
                ))}
                {ACCENT_PALETTE.map((c, i) => (
                  <linearGradient
                    key={`hl-${i}`}
                    id={`tr-edge-hl-${i}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor={c} stopOpacity="1" />
                    <stop offset="100%" stopColor={c} stopOpacity="0.6" />
                  </linearGradient>
                ))}
              </defs>
              {edgePaths.map((e) => (
                <path
                  key={e.key}
                  d={e.d}
                  fill="none"
                  stroke={`url(#tr-edge${e.isHighlight ? '-hl' : ''}-${e.colorIdx % 5})`}
                  strokeWidth={e.isHighlight ? 2.5 : 1.6}
                  strokeLinecap="round"
                  className={e.isHighlight ? 'tr-edge-hl' : ''}
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
              const isCollapsed = collapsed.has(id);
              const kids = data.childIndex[id] || [];
              const childCount = kids.length;
              return (
                <TreeNodeCard
                  key={id}
                  node={node}
                  x={pos.x + PAD_X}
                  y={pos.y + PAD_Y}
                  isRoot={isRoot}
                  isSelected={isSelected}
                  isCollapsed={isCollapsed}
                  childCount={childCount}
                  readonly={readonly}
                  inputRef={(el) => {
                    if (el) inputRefs.current[id] = el;
                    else delete inputRefs.current[id];
                  }}
                  onSelect={() => setSelectedId(id)}
                  onHoverChange={(h) => {
                    if (h) setHoveredId(id);
                    else setHoveredId((c) => (c === id ? null : c));
                  }}
                  onLabelChange={(v) => onLabelChange(id, v)}
                  onKeyDown={(e) => handleKey(e, id)}
                  onAddChild={() => onAddChild(id)}
                  onToggleCollapse={() => toggleCollapse(id)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Hint footer */}
      {!readonly && (
        <div className="tr-keyhint">
          <kbd>Enter</kbd> adds child ·{' '}
          <kbd>⌫</kbd> on empty removes ·{' '}
          <kbd>▸</kbd> click to fold subtree ·{' '}
          drag the canvas to pan
        </div>
      )}

      <style jsx>{`
        .tree-view {
          color: var(--text);
          background:
            radial-gradient(
              1400px 800px at 30% -10%,
              rgba(139, 92, 246, 0.07) 0%,
              transparent 55%
            ),
            radial-gradient(
              1000px 600px at 90% 110%,
              rgba(6, 182, 212, 0.06) 0%,
              transparent 55%
            );
        }

        /* ---- Toolbar ---- */
        .tr-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 14px 22px;
          border-bottom: 1px solid var(--border);
          background: rgba(10, 11, 22, 0.6);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          flex-wrap: wrap;
        }
        .tr-toolbar-left {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
        }
        .tr-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .tr-title-icon {
          font-size: 16px;
          line-height: 1;
          color: transparent;
          background: linear-gradient(135deg, #06b6d4, #8b5cf6);
          background-clip: text;
          -webkit-background-clip: text;
          font-weight: 700;
        }
        .tr-title h2 {
          font-size: 14px;
          font-weight: 600;
          margin: 0;
        }
        .tr-readonly-pill {
          font-size: 9px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          font-weight: 600;
          color: rgba(6, 182, 212, 0.9);
          background: rgba(6, 182, 212, 0.1);
          border: 1px solid rgba(6, 182, 212, 0.3);
          padding: 2px 7px;
          border-radius: 999px;
        }
        .tr-stats {
          display: flex;
          align-items: baseline;
          gap: 8px;
          font-size: 11px;
          color: var(--text-dim);
        }
        .tr-stat {
          display: inline-flex;
          align-items: baseline;
          gap: 4px;
        }
        .tr-stat-num {
          color: var(--text);
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          font-size: 13px;
        }
        .tr-stat-lbl {
          opacity: 0.7;
        }
        .tr-stat-sep {
          opacity: 0.3;
        }
        .tr-toolbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tr-zoom {
          display: inline-flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 2px;
        }
        .tr-zoom-btn {
          background: transparent;
          color: var(--text-dim);
          border: none;
          font-size: 13px;
          font-weight: 600;
          width: 24px;
          height: 22px;
          line-height: 1;
          border-radius: 5px;
          cursor: pointer;
          transition: all 0.12s;
        }
        .tr-zoom-btn:hover {
          color: var(--text);
          background: rgba(255, 255, 255, 0.06);
        }
        .tr-zoom-fit {
          width: auto;
          padding: 0 8px;
          font-size: 11px;
        }
        .tr-zoom-num {
          font-size: 11px;
          color: var(--text-dim);
          padding: 0 6px;
          font-variant-numeric: tabular-nums;
          min-width: 38px;
          text-align: center;
        }
        .tr-tool-btn {
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
        .tr-tool-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text);
          border-color: var(--border-strong);
        }

        /* ---- Scroll / world ---- */
        .tr-scroll {
          flex: 1;
          min-height: 0;
          overflow: auto;
          position: relative;
          /* Dot grid background — Figma-style */
          background-image: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.08) 1px,
            transparent 1px
          );
          background-size: 24px 24px;
          background-position: 0 0;
        }
        .tr-stage {
          position: relative;
          min-width: 100%;
          min-height: 100%;
        }
        .tr-world {
          position: absolute;
          left: 0;
          top: 0;
        }
        .tr-edges {
          position: absolute;
          left: 0;
          top: 0;
          pointer-events: none;
        }
        .tr-edge-hl {
          filter: drop-shadow(0 0 6px currentColor);
        }

        /* ---- Hint footer ---- */
        .tr-keyhint {
          position: absolute;
          bottom: 14px;
          left: 50%;
          transform: translateX(-50%);
          padding: 7px 14px;
          font-size: 11px;
          color: var(--text-dim);
          background: rgba(10, 11, 22, 0.85);
          border: 1px solid var(--border);
          border-radius: 999px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 5;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          pointer-events: none;
        }
        .tr-keyhint :global(kbd) {
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

function TreeNodeCard({
  node,
  x,
  y,
  isRoot,
  isSelected,
  isCollapsed,
  childCount,
  readonly,
  inputRef,
  onSelect,
  onHoverChange,
  onLabelChange,
  onKeyDown,
  onAddChild,
  onToggleCollapse,
}: {
  node: MindMapNode;
  x: number;
  y: number;
  isRoot: boolean;
  isSelected: boolean;
  isCollapsed: boolean;
  childCount: number;
  readonly: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onSelect: () => void;
  onHoverChange: (hovered: boolean) => void;
  onLabelChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAddChild: () => void;
  onToggleCollapse: () => void;
}) {
  const accent = ACCENT_PALETTE[(node.colorIdx ?? 0) % 5];
  const accentAlt = ACCENT_PALETTE[((node.colorIdx ?? 0) + 2) % 5];
  return (
    <div
      className={`tr-card ${isSelected ? 'is-selected' : ''} ${isRoot ? 'is-root' : ''} ${
        isCollapsed ? 'is-collapsed' : ''
      } ${childCount === 0 ? 'is-leaf' : ''}`}
      style={{
        left: x,
        top: y,
        width: CARD_WIDTH,
        ['--tr-accent' as string]: accent,
        ['--tr-accent-alt' as string]: accentAlt,
      }}
      onClick={onSelect}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      {/* Left colour rail */}
      <span className="tr-card-rail" aria-hidden />

      {/* Body */}
      <div className="tr-card-body">
        <input
          ref={inputRef}
          value={node.label}
          onChange={(e) => onLabelChange(e.target.value)}
          onKeyDown={onKeyDown}
          onClick={(e) => e.stopPropagation()}
          placeholder={isRoot ? 'Untitled mind map' : 'Untitled'}
          spellCheck={false}
          readOnly={readonly}
          className="tr-card-label"
          aria-label={`Node ${node.label || 'Untitled'}`}
        />
        {node.note && (
          <p className="tr-card-note" title={node.note}>
            {node.note}
          </p>
        )}
        {childCount > 0 && (
          <div className="tr-card-meta">
            <span className="tr-card-childcount">
              {isCollapsed ? `+${childCount} hidden` : `${childCount} ${childCount === 1 ? 'child' : 'children'}`}
            </span>
          </div>
        )}
      </div>

      {/* Collapse toggle on parent cards */}
      {childCount > 0 && (
        <button
          type="button"
          className="tr-card-toggle"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          title={isCollapsed ? 'Expand' : 'Collapse'}
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '+' : '−'}
        </button>
      )}

      {/* Add-child button (right edge, on hover/select) */}
      {!readonly && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild();
          }}
          className="tr-card-add"
          title="Add child"
          aria-label="Add child"
        >
          ＋
        </button>
      )}

      <style jsx>{`
        .tr-card {
          position: absolute;
          min-height: ${CARD_HEIGHT}px;
          background:
            linear-gradient(
              180deg,
              color-mix(in srgb, var(--tr-accent) 18%, rgba(15, 17, 36, 0.85)) 0%,
              rgba(15, 17, 36, 0.92) 80%
            );
          border: 1px solid color-mix(in srgb, var(--tr-accent) 32%, rgba(255, 255, 255, 0.08));
          border-radius: 12px;
          color: var(--text);
          font-size: 13px;
          padding: 10px 12px 10px 16px;
          cursor: pointer;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.06) inset,
            0 8px 24px rgba(0, 0, 0, 0.45),
            0 0 0 1px rgba(0, 0, 0, 0.2);
          transition:
            transform 0.16s ease,
            box-shadow 0.18s ease,
            border-color 0.18s ease;
          overflow: visible;
        }
        .tr-card:hover {
          transform: translateY(-2px);
          border-color: color-mix(in srgb, var(--tr-accent) 55%, rgba(255, 255, 255, 0.08));
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.08) inset,
            0 14px 36px rgba(0, 0, 0, 0.55),
            0 0 0 1px color-mix(in srgb, var(--tr-accent) 25%, transparent),
            0 0 32px color-mix(in srgb, var(--tr-accent) 22%, transparent);
        }
        .tr-card.is-selected {
          border-color: var(--tr-accent);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.08) inset,
            0 0 0 3px color-mix(in srgb, var(--tr-accent) 30%, transparent),
            0 14px 36px rgba(0, 0, 0, 0.55),
            0 0 38px color-mix(in srgb, var(--tr-accent) 28%, transparent);
        }
        .tr-card.is-root {
          background:
            linear-gradient(135deg, #ec4899 0%, #8b5cf6 55%, #06b6d4 110%);
          border-color: rgba(255, 255, 255, 0.25);
          color: white;
          font-weight: 600;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.2) inset,
            0 12px 30px rgba(236, 72, 153, 0.35),
            0 0 50px rgba(139, 92, 246, 0.35);
        }
        .tr-card.is-root:hover {
          transform: translateY(-3px);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.22) inset,
            0 18px 40px rgba(236, 72, 153, 0.5),
            0 0 70px rgba(139, 92, 246, 0.5);
        }

        /* Colour rail */
        .tr-card-rail {
          position: absolute;
          left: 0;
          top: 10px;
          bottom: 10px;
          width: 3px;
          border-radius: 0 2px 2px 0;
          background: linear-gradient(180deg, var(--tr-accent), var(--tr-accent-alt));
        }
        .is-root .tr-card-rail {
          display: none;
        }

        /* Body */
        .tr-card-body {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .tr-card-label {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: inherit;
          font: inherit;
          font-weight: 500;
          padding: 0;
          margin: 0;
          line-height: 1.25;
        }
        .tr-card-label::placeholder {
          color: var(--text-dim);
          font-style: italic;
        }
        .is-root .tr-card-label::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }
        .tr-card-note {
          font-size: 11px;
          line-height: 1.3;
          color: rgba(232, 234, 255, 0.55);
          margin: 4px 0 0;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .is-root .tr-card-note {
          color: rgba(255, 255, 255, 0.8);
        }
        .tr-card-meta {
          margin-top: 6px;
        }
        .tr-card-childcount {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.4px;
          color: var(--text-dim);
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 2px 7px;
          border-radius: 999px;
          font-variant-numeric: tabular-nums;
        }
        .is-collapsed .tr-card-childcount {
          background: color-mix(in srgb, var(--tr-accent) 22%, transparent);
          border-color: color-mix(in srgb, var(--tr-accent) 50%, transparent);
          color: var(--text);
        }
        .is-root .tr-card-childcount {
          background: rgba(255, 255, 255, 0.18);
          border-color: rgba(255, 255, 255, 0.28);
          color: white;
        }

        /* Collapse toggle */
        .tr-card-toggle {
          position: absolute;
          right: -10px;
          top: 10px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(15, 17, 36, 0.95);
          color: var(--text);
          border: 1px solid color-mix(in srgb, var(--tr-accent) 60%, rgba(255, 255, 255, 0.1));
          font-size: 13px;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
          z-index: 2;
        }
        .tr-card-toggle:hover {
          background: var(--tr-accent);
          color: white;
          transform: scale(1.1);
        }
        .is-root .tr-card-toggle {
          background: rgba(0, 0, 0, 0.45);
          border-color: rgba(255, 255, 255, 0.4);
          color: white;
        }

        /* Add-child button */
        .tr-card-add {
          position: absolute;
          right: -12px;
          bottom: 8px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          color: white;
          border: 1.5px solid rgba(15, 17, 36, 0.85);
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
          opacity: 0;
          transform: scale(0.7);
          transition: all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 6px 14px rgba(139, 92, 246, 0.45);
          z-index: 2;
        }
        .tr-card:hover .tr-card-add,
        .tr-card.is-selected .tr-card-add {
          opacity: 1;
          transform: scale(1);
        }
        .tr-card-add:hover {
          transform: scale(1.15);
          box-shadow: 0 8px 20px rgba(139, 92, 246, 0.6);
        }
      `}</style>
    </div>
  );
}
