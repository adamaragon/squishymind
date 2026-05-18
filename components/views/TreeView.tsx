'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FlowDirection, MindMapData, MindMapNode } from '@/lib/types';
import NodeDetailPanel from './NodeDetailPanel';
import { stripIncomingLinks } from '@/lib/canvas/layout';

// Same picker glyphs/labels as the canvas + detail panel so the three
// surfaces speak the same visual language.
const FLOW_DIRS: Array<{ value: FlowDirection; glyph: string; label: string }> = [
  { value: 'forward', glyph: '→', label: 'Forward (parent → child)' },
  { value: 'backward', glyph: '←', label: 'Reverse (child → parent)' },
  { value: 'both', glyph: '↔', label: 'Both directions' },
  { value: 'none', glyph: '—', label: 'No arrow' },
];

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
// 240 wide leaves enough room for the title plus the action chip row
// (Details + flags + delete-×) without anything wrapping at typical
// label lengths. 200 was tight the moment a card had 3 chips.
const CARD_WIDTH = 240;
const X_PER_DEPTH = 300;
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
  const doomed = new Set<string>();
  const drop = (n: string) => {
    doomed.add(n);
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
  // Deep-clone link arrays on survivors before stripping; cloneData only
  // shallow-clones the node records themselves.
  for (const surviving of Object.values(next.nodes)) {
    if (surviving.links && surviving.links.length > 0) {
      next.nodes[surviving.id] = { ...surviving, links: surviving.links.slice() };
    }
  }
  stripIncomingLinks(next.nodes, doomed);
  return next;
}

type Pos = { x: number; y: number };
type Layout = {
  positions: Record<string, Pos>;
  heights: Record<string, number>;
  width: number;
  height: number;
  order: string[];
};

// Per-node card height. Cards grow when they have a note (2-line clamp) and
// when they have a meta pill ("3 children" or "+N hidden"). Computing the
// height up front lets the layout reserve real vertical space so sibling
// cards don't overlap even when one carries a note + a pill.
const CARD_BASE = 56;
const NOTE_BLOCK = 22; // ~2 lines of 11px text + small margin
const META_BLOCK = 26; // pill + top margin
const ROOT_EXTRA = 4;
const ROW_GAP = 18;

function cardHeightFor(
  node: MindMapNode,
  hasChildren: boolean,
  isRoot: boolean,
): number {
  let h = CARD_BASE;
  if (node.note && node.note.trim()) h += NOTE_BLOCK;
  if (hasChildren) h += META_BLOCK;
  if (isRoot) h += ROOT_EXTRA;
  return h;
}

function computeLayout(d: MindMapData, collapsed: Set<string>): Layout {
  const positions: Record<string, Pos> = {};
  const heights: Record<string, number> = {};
  const order: string[] = [];
  let yCursor = 0;

  function visit(id: string, depth: number): { centerY: number } {
    const node = d.nodes[id];
    if (!node) return { centerY: 0 };
    order.push(id);
    const rawChildren = d.childIndex[id] || [];
    const hasChildren = rawChildren.length > 0;
    const isCollapsed = collapsed.has(id);
    const visibleChildren = isCollapsed ? [] : rawChildren;
    const isRoot = id === d.rootId;
    // hasChildren passed to height calc so a collapsed parent still reserves
    // space for its meta pill (it shows "+N hidden" instead of "N children").
    const myHeight = cardHeightFor(node, hasChildren, isRoot);
    heights[id] = myHeight;

    if (visibleChildren.length === 0) {
      const y = yCursor;
      positions[id] = { x: depth * X_PER_DEPTH, y };
      yCursor += myHeight + ROW_GAP;
      return { centerY: y + myHeight / 2 };
    }

    const centers = visibleChildren.map((cid) => visit(cid, depth + 1).centerY);
    const center = (centers[0] + centers[centers.length - 1]) / 2;
    // Parent sits in its own column at the vertical centre of its children.
    // If the parent's card is taller than the span between first and last
    // child centres, pin the parent so it never extends past the top of its
    // first child (avoids the parent eating into the row above its subtree).
    const idealTop = center - myHeight / 2;
    const minTop = centers[0] - myHeight / 2; // can't sit above first child
    const maxTop = centers[centers.length - 1] - myHeight / 2; // or below last
    const y = Math.max(minTop, Math.min(maxTop, idealTop));
    positions[id] = { x: depth * X_PER_DEPTH, y };
    return { centerY: y + myHeight / 2 };
  }

  if (d.rootId) visit(d.rootId, 0);

  // Width: rightmost column edge + a card width + side padding.
  const xs = Object.values(positions).map((p) => p.x);
  const maxX = xs.length ? Math.max(...xs) : 0;

  // Height: bottom edge of the lowest card + bottom padding.
  let maxBottom = 0;
  for (const id of Object.keys(positions)) {
    const bottom = positions[id].y + (heights[id] ?? CARD_BASE);
    if (bottom > maxBottom) maxBottom = bottom;
  }

  return {
    positions,
    heights,
    width: maxX + CARD_WIDTH + PAD_X * 2,
    height: maxBottom + PAD_Y * 2,
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
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  // Flow-chip interaction state — mirrors the canvas's flow handle:
  // click → open a parent-edge picker on the same card; drag → start
  // creating a link, drop on another card to open a picker for the new
  // link's flow direction.
  const [flowDrag, setFlowDrag] = useState<{
    sourceId: string;
    anchorX: number;
    anchorY: number;
    startSX: number;
    startSY: number;
    cursorX: number;
    cursorY: number;
    moved: boolean;
  } | null>(null);
  const [parentPicker, setParentPicker] = useState<string | null>(null);
  const [linkPicker, setLinkPicker] = useState<{
    sourceId: string;
    targetId: string;
  } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const focusOnNextRender = useRef<{ id: string; caret?: 'end' } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Latest data snapshot for the document-level mouseup handler (the
  // effect installs once per drag, so a closed-over `data` would go
  // stale across re-renders during the drag).
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

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

  function applyNodeUpdate(next: MindMapNode) {
    const updated: MindMapData = {
      ...data,
      nodes: { ...data.nodes, [next.id]: next },
    };
    commit(updated);
    if (next.id === data.rootId) {
      onTitleChange?.(next.label || initialTitle);
    }
  }

  // Apply a parent-edge flow direction to a node. 'forward' persists as
  // undefined so we don't bloat the JSON with the default value
  // (matches the canvas behaviour).
  const applyParentFlow = useCallback(
    (nodeId: string, dir: FlowDirection) => {
      const src = dataRef.current;
      const node = src.nodes[nodeId];
      if (!node) return;
      const updated: MindMapData = {
        ...src,
        nodes: {
          ...src.nodes,
          [nodeId]: {
            ...node,
            flowDirection: dir === 'forward' ? undefined : dir,
          },
        },
      };
      commit(updated);
    },
    [commit],
  );

  // Apply a flow direction to a specific link in source.links. Same
  // 'forward' → undefined normalization as parent-edge flow.
  const applyLinkFlow = useCallback(
    (sourceId: string, targetId: string, dir: FlowDirection) => {
      const src = dataRef.current;
      const node = src.nodes[sourceId];
      if (!node) return;
      const links = (node.links || []).map((l) =>
        l.targetId === targetId
          ? { ...l, flowDirection: dir === 'forward' ? undefined : dir }
          : l,
      );
      const updated: MindMapData = {
        ...src,
        nodes: {
          ...src.nodes,
          [sourceId]: { ...node, links },
        },
      };
      commit(updated);
    },
    [commit],
  );

  // Try to create a non-structural link from source → target. Returns
  // true on success so the caller can open the new link's picker. Blocks:
  // self-link, direct parent (already connected by tree edge), direct
  // child (ditto), and duplicate links — same set of guards the canvas
  // uses to keep flow chips from drawing redundant lines.
  const createLink = useCallback(
    (sourceId: string, targetId: string): boolean => {
      const src = dataRef.current;
      if (sourceId === targetId) return false;
      const sourceNode = src.nodes[sourceId];
      const targetNode = src.nodes[targetId];
      if (!sourceNode || !targetNode) return false;
      if (sourceNode.parentId === targetId) return false;
      if (targetNode.parentId === sourceId) return false;
      if ((sourceNode.links || []).some((l) => l.targetId === targetId)) {
        return false;
      }
      const updated: MindMapData = {
        ...src,
        nodes: {
          ...src.nodes,
          [sourceId]: {
            ...sourceNode,
            links: [...(sourceNode.links || []), { targetId }],
          },
        },
      };
      commit(updated);
      return true;
    },
    [commit],
  );

  // Document-level mouse listeners for an active flow-chip drag. Installed
  // once per drag (when sourceId becomes non-null) and torn down on release.
  // Re-reads `dataRef` on drop so the latest links snapshot is checked.
  const flowDragSourceId = flowDrag?.sourceId ?? null;
  useEffect(() => {
    if (!flowDragSourceId) return;
    function onMove(ev: MouseEvent) {
      setFlowDrag((d) => {
        if (!d) return d;
        const moved =
          d.moved ||
          Math.hypot(ev.clientX - d.startSX, ev.clientY - d.startSY) > 4;
        return {
          ...d,
          cursorX: ev.clientX,
          cursorY: ev.clientY,
          moved,
        };
      });
    }
    function onUp(ev: MouseEvent) {
      setFlowDrag((d) => {
        if (!d) return d;
        if (!d.moved) {
          // Click — open the parent-edge picker. Root has no parent edge,
          // so the click is a no-op on root (drag still works there).
          const node = dataRef.current.nodes[d.sourceId];
          if (node?.parentId) {
            setParentPicker(d.sourceId);
          }
        } else {
          // Drag — hit-test the drop point for a target card.
          const dropEl = document.elementFromPoint(ev.clientX, ev.clientY);
          const cardEl =
            (dropEl?.closest('[data-tree-card-id]') as HTMLElement | null) ||
            null;
          const targetId = cardEl?.dataset.treeCardId || '';
          if (targetId && targetId !== d.sourceId) {
            if (createLink(d.sourceId, targetId)) {
              setLinkPicker({ sourceId: d.sourceId, targetId });
            }
          }
        }
        return null;
      });
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [flowDragSourceId, createLink]);

  // Outside-click dismissal for the open pickers. The card-anchored
  // pickers themselves stopPropagation on their own mousedown so we
  // don't immediately close on the same tick.
  useEffect(() => {
    if (!parentPicker && !linkPicker) return;
    function onDown(ev: MouseEvent) {
      const t = ev.target as HTMLElement | null;
      if (t && t.closest('.tr-flow-mini-picker')) return;
      setParentPicker(null);
      setLinkPicker(null);
    }
    // setTimeout so the click that opened the picker doesn't dismiss it.
    const id = setTimeout(
      () => document.addEventListener('mousedown', onDown, true),
      0,
    );
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', onDown, true);
    };
  }, [parentPicker, linkPicker]);

  // Start a flow-chip interaction. Captures the chip's screen-space
  // centre so the ghost line can anchor there for the duration of the drag.
  const onFlowMouseDown = useCallback(
    (sourceId: string, e: React.MouseEvent) => {
      if (readonly) return;
      e.stopPropagation();
      e.preventDefault();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setFlowDrag({
        sourceId,
        anchorX: rect.left + rect.width / 2,
        anchorY: rect.top + rect.height / 2,
        startSX: e.clientX,
        startSY: e.clientY,
        cursorX: e.clientX,
        cursorY: e.clientY,
        moved: false,
      });
      // Opening a flow drag/click also clears any leftover picker so we
      // don't stack two on screen.
      setParentPicker(null);
      setLinkPicker(null);
    },
    [readonly],
  );

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
    // Cmd/Ctrl+Delete (or Cmd/Ctrl+Backspace) deletes the focused node and
    // its subtree at any time, not just when the label is empty. Plain
    // Backspace on an empty label still works as a quick-clear shortcut.
    if (
      (e.key === 'Delete' || e.key === 'Backspace') &&
      (e.metaKey || e.ctrlKey) &&
      id !== data.rootId
    ) {
      e.preventDefault();
      onDelete(id);
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

  // Build tree edge paths. Gradient stroke ID per parent colorIdx so each
  // subtree has its own colour signature flowing outward.
  const edgePaths: Array<{
    d: string;
    colorIdx: number;
    key: string;
    /** DOM id for the path. animateMotion's <mpath href> references this
     *  so the flow arrows track the live edge curve. */
    pathId: string;
    isHighlight: boolean;
    /** Direction of flow — drives arrowhead placement. */
    flow: 'forward' | 'backward' | 'both' | 'none';
  }> = [];
  for (const [parentId, kids] of Object.entries(data.childIndex)) {
    if (collapsed.has(parentId)) continue;
    const p = layout.positions[parentId];
    if (!p) continue;
    const parentNode = data.nodes[parentId];
    for (const childId of kids) {
      const c = layout.positions[childId];
      if (!c) continue;
      const parentH = layout.heights[parentId] ?? CARD_BASE;
      const childH = layout.heights[childId] ?? CARD_BASE;
      const x1 = p.x + CARD_WIDTH + PAD_X;
      const y1 = p.y + parentH / 2 + PAD_Y;
      const x2 = c.x + PAD_X;
      const y2 = c.y + childH / 2 + PAD_Y;
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
        pathId: `tr-edge-${parentId}-${childId}`,
        isHighlight,
        flow: data.nodes[childId]?.flowDirection || 'forward',
      });
    }
  }

  // Build link paths. Non-structural edges between any two visible cards.
  // Endpoints anchor at the card MIDDLE on the side closer to the target,
  // so links don't always exit the right edge like tree edges do.
  const linkPaths: Array<{
    d: string;
    key: string;
    /** DOM id, used by animateMotion <mpath href>. */
    pathId: string;
    isHighlight: boolean;
    flow: 'forward' | 'backward' | 'both' | 'none';
  }> = [];
  for (const n of Object.values(data.nodes)) {
    if (!n.links || n.links.length === 0) continue;
    const sourcePos = layout.positions[n.id];
    if (!sourcePos) continue;
    const sourceH = layout.heights[n.id] ?? CARD_BASE;
    for (const lk of n.links) {
      const targetPos = layout.positions[lk.targetId];
      if (!targetPos) continue;
      const targetH = layout.heights[lk.targetId] ?? CARD_BASE;
      // Pick the side of each card that faces the other so the line
      // doesn't have to cut across the cards.
      const sCenter = sourcePos.x + CARD_WIDTH / 2;
      const tCenter = targetPos.x + CARD_WIDTH / 2;
      const fromRight = tCenter > sCenter;
      const x1 = sourcePos.x + (fromRight ? CARD_WIDTH : 0) + PAD_X;
      const y1 = sourcePos.y + sourceH / 2 + PAD_Y;
      const x2 = targetPos.x + (fromRight ? 0 : CARD_WIDTH) + PAD_X;
      const y2 = targetPos.y + targetH / 2 + PAD_Y;
      const cx = (x1 + x2) / 2;
      const isHighlight =
        selectedId === n.id ||
        selectedId === lk.targetId ||
        hoveredId === n.id ||
        hoveredId === lk.targetId;
      linkPaths.push({
        d: `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`,
        key: `link:${n.id}->${lk.targetId}`,
        pathId: `tr-link-${n.id}-${lk.targetId}`,
        isHighlight,
        flow: lk.flowDirection || 'forward',
      });
    }
  }

  return (
    <div className="tree-view h-full flex flex-col relative">
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
                    {/* Bumped opacity from 0.55→0.85 (start) and 0.18→0.45
                        (end). On a busy map with many edges in the same
                        column, the previous values made the connector fade
                        to invisible against the dark canvas — looked like
                        branches were missing when they were drawn but
                        nearly transparent at the child end. */}
                    <stop offset="0%" stopColor={c} stopOpacity="0.85" />
                    <stop offset="100%" stopColor={c} stopOpacity="0.45" />
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
                    <stop offset="100%" stopColor={c} stopOpacity="0.75" />
                  </linearGradient>
                ))}
                {/* Arrow markers — one pair per accent for tree edges,
                    plus one pair for link edges in a neutral tint. Each
                    marker is a filled triangle that inherits fill from
                    the path's `color` CSS property (which we set per
                    path), so a single marker def works for both
                    accent-coloured tree edges and dashed link edges. */}
                {ACCENT_PALETTE.map((c, i) => (
                  <g key={`m-${i}`}>
                    <marker
                      id={`tr-arrow-end-${i}`}
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 Z" fill={c} />
                    </marker>
                    <marker
                      id={`tr-arrow-start-${i}`}
                      viewBox="0 0 10 10"
                      refX="1"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 10 0 L 0 5 L 10 10 Z" fill={c} />
                    </marker>
                  </g>
                ))}
                <marker
                  id="tr-arrow-end-link"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 Z" fill="#cbd5e1" opacity="0.8" />
                </marker>
                <marker
                  id="tr-arrow-start-link"
                  viewBox="0 0 10 10"
                  refX="1"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M 10 0 L 0 5 L 10 10 Z" fill="#cbd5e1" opacity="0.8" />
                </marker>
              </defs>
              {edgePaths.map((e) => {
                const idx = e.colorIdx % 5;
                const markerEnd =
                  e.flow === 'forward' || e.flow === 'both'
                    ? `url(#tr-arrow-end-${idx})`
                    : undefined;
                const markerStart =
                  e.flow === 'backward' || e.flow === 'both'
                    ? `url(#tr-arrow-start-${idx})`
                    : undefined;
                return (
                  <path
                    key={e.key}
                    id={e.pathId}
                    d={e.d}
                    fill="none"
                    stroke={`url(#tr-edge${e.isHighlight ? '-hl' : ''}-${idx})`}
                    strokeWidth={e.isHighlight ? 3 : 2.2}
                    strokeLinecap="round"
                    markerStart={markerStart}
                    markerEnd={markerEnd}
                    className={e.isHighlight ? 'tr-edge-hl' : ''}
                  />
                );
              })}
              {/* Animated flow markers for tree edges — actual triangle
                  arrows riding the curve via SVG <animateMotion> +
                  <mpath> referencing the structural path id, so the
                  arrow tracks the live curve. Pulsed cycle: ~1.75s
                  slide → 0.5s fade → 2.75s pause. Forward uses
                  rotate="auto"; backward uses "auto-reverse" so the
                  triangle tip points in the direction of motion. */}
              {edgePaths.map((e) => {
                if (e.flow === 'none') return null;
                const out: React.ReactNode[] = [];
                if (e.flow === 'forward' || e.flow === 'both') {
                  out.push(
                    <g
                      key={`${e.key}-fwd`}
                      className="tr-flow-arrow tr-flow-arrow-fwd"
                      pointerEvents="none"
                    >
                      <path d="M -8 -6 L 4 0 L -8 6" />
                      <animateMotion
                        dur="5s"
                        repeatCount="indefinite"
                        rotate="auto"
                        keyTimes="0;0.35;1"
                        keyPoints="0;1;1"
                        calcMode="linear"
                      >
                        <mpath href={`#${e.pathId}`} />
                      </animateMotion>
                    </g>,
                  );
                }
                if (e.flow === 'backward' || e.flow === 'both') {
                  out.push(
                    <g
                      key={`${e.key}-back`}
                      className="tr-flow-arrow tr-flow-arrow-back"
                      pointerEvents="none"
                    >
                      <path d="M -8 -6 L 4 0 L -8 6" />
                      <animateMotion
                        dur="5s"
                        repeatCount="indefinite"
                        rotate="auto-reverse"
                        keyTimes="0;0.35;1"
                        keyPoints="1;0;0"
                        calcMode="linear"
                      >
                        <mpath href={`#${e.pathId}`} />
                      </animateMotion>
                    </g>,
                  );
                }
                return out;
              })}
              {/* Link edges — dashed, neutral colour, sit above tree edges
                  but below cards. Each gets its own arrow markers based
                  on the link's flow direction. */}
              {linkPaths.map((lk) => {
                const markerEnd =
                  lk.flow === 'forward' || lk.flow === 'both'
                    ? 'url(#tr-arrow-end-link)'
                    : undefined;
                const markerStart =
                  lk.flow === 'backward' || lk.flow === 'both'
                    ? 'url(#tr-arrow-start-link)'
                    : undefined;
                return (
                  <path
                    key={lk.key}
                    id={lk.pathId}
                    d={lk.d}
                    fill="none"
                    stroke="#cbd5e1"
                    strokeOpacity={lk.isHighlight ? 0.85 : 0.45}
                    strokeWidth={lk.isHighlight ? 2.2 : 1.6}
                    strokeLinecap="round"
                    markerStart={markerStart}
                    markerEnd={markerEnd}
                  />
                );
              })}
              {/* Same pulsed traveling-arrow treatment for links, with
                  lighter tints so a link arrow is distinguishable from a
                  tree-edge arrow if the two cross over each other. */}
              {linkPaths.map((lk) => {
                if (lk.flow === 'none') return null;
                const out: React.ReactNode[] = [];
                if (lk.flow === 'forward' || lk.flow === 'both') {
                  out.push(
                    <g
                      key={`${lk.key}-fwd`}
                      className="tr-flow-arrow tr-flow-arrow-link tr-flow-arrow-fwd"
                      pointerEvents="none"
                    >
                      <path d="M -8 -6 L 4 0 L -8 6" />
                      <animateMotion
                        dur="5s"
                        repeatCount="indefinite"
                        rotate="auto"
                        keyTimes="0;0.35;1"
                        keyPoints="0;1;1"
                        calcMode="linear"
                      >
                        <mpath href={`#${lk.pathId}`} />
                      </animateMotion>
                    </g>,
                  );
                }
                if (lk.flow === 'backward' || lk.flow === 'both') {
                  out.push(
                    <g
                      key={`${lk.key}-back`}
                      className="tr-flow-arrow tr-flow-arrow-link tr-flow-arrow-back"
                      pointerEvents="none"
                    >
                      <path d="M -8 -6 L 4 0 L -8 6" />
                      <animateMotion
                        dur="5s"
                        repeatCount="indefinite"
                        rotate="auto-reverse"
                        keyTimes="0;0.35;1"
                        keyPoints="1;0;0"
                        calcMode="linear"
                      >
                        <mpath href={`#${lk.pathId}`} />
                      </animateMotion>
                    </g>,
                  );
                }
                return out;
              })}
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
                  // Each card can host at most one picker at a time —
                  // either its own parent-edge picker, or it's the
                  // target of a freshly-created link picker.
                  parentPickerOpen={parentPicker === id}
                  linkPickerOpen={
                    linkPicker && linkPicker.targetId === id ? linkPicker : null
                  }
                  isDraggingFlow={flowDrag?.sourceId === id}
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
                  onOpenDetails={() => setDetailNodeId(id)}
                  onDelete={() => onDelete(id)}
                  onFlowMouseDown={(e) => onFlowMouseDown(id, e)}
                  onPickParentFlow={(v) => {
                    applyParentFlow(id, v);
                    setParentPicker(null);
                  }}
                  onPickLinkFlow={(v) => {
                    if (linkPicker && linkPicker.targetId === id) {
                      applyLinkFlow(linkPicker.sourceId, id, v);
                    }
                    setLinkPicker(null);
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Flow-chip drag ghost — dashed cubic curve from the chip anchor
          (captured at mousedown) to the live cursor position. Fixed-
          positioned overlay so we don't have to translate screen ↔ world
          coords mid-drag. pointer-events: none so the underlying
          elementFromPoint hit-test reaches the actual card. */}
      {flowDrag && flowDrag.moved && (
        <svg
          className="tr-flow-ghost-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 50,
          }}
          aria-hidden
        >
          {(() => {
            const x1 = flowDrag.anchorX;
            const y1 = flowDrag.anchorY;
            const x2 = flowDrag.cursorX;
            const y2 = flowDrag.cursorY;
            const dx = (x2 - x1) * 0.5;
            return (
              <path
                d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="6 5"
                strokeLinecap="round"
                opacity={0.7}
              />
            );
          })()}
        </svg>
      )}

      {detailNodeId && data.nodes[detailNodeId] && (
        <NodeDetailPanel
          node={data.nodes[detailNodeId]}
          readonly={readonly}
          isRoot={detailNodeId === data.rootId}
          accentColor={ACCENT_PALETTE[(data.nodes[detailNodeId].colorIdx ?? 0) % 5]}
          onChange={applyNodeUpdate}
          onDelete={() => {
            const id = detailNodeId;
            setDetailNodeId(null);
            onDelete(id);
          }}
          onClose={() => setDetailNodeId(null)}
          allNodes={(() => {
            // Exclude the focused node, its direct parent, and its direct
            // children — those already share a structural edge so a link
            // would render a second redundant line.
            const focused = data.nodes[detailNodeId];
            const childIds = new Set(data.childIndex[detailNodeId] || []);
            return Object.values(data.nodes)
              .filter(
                (n) =>
                  n.id !== detailNodeId &&
                  n.id !== focused?.parentId &&
                  !childIds.has(n.id),
              )
              .map((n) => ({ id: n.id, label: n.label }));
          })()}
        />
      )}

      {/* Hint footer */}
      {!readonly && (
        <div className="tr-keyhint">
          <kbd>Enter</kbd> child ·{' '}
          <kbd>⌘⌫</kbd> delete selected ·{' '}
          <kbd>▸</kbd> click to fold ·{' '}
          hover a card for actions
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

        /* Flow markers — actual triangle arrows riding the curve via SVG
           <animateMotion> + <mpath>. Pulsed: slide for the first 35 %
           of the 5s cycle, fade out, then pause before the next trip.
           Per-direction colour matches the canvas so the two views
           speak the same visual language.
           Backward direction uses rotate="auto-reverse" upstream so the
           triangle tip points in the direction of motion. */
        .tr-flow-arrow {
          animation: tr-flow-pulse 5s linear infinite;
        }
        @keyframes tr-flow-pulse {
          0%   { opacity: 0.6; }
          35%  { opacity: 0.6; }
          45%  { opacity: 0; }
          100% { opacity: 0; }
        }
        /* Stroked chevron (open V) — matches the canvas's lighter
           treatment so neither view feels heavier than the other. */
        .tr-flow-arrow path {
          fill: none;
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .tr-flow-arrow-fwd path {
          stroke: #10b981;
          filter: drop-shadow(0 0 3px rgba(16, 185, 129, 0.5));
        }
        .tr-flow-arrow-back path {
          stroke: #f59e0b;
          filter: drop-shadow(0 0 3px rgba(245, 158, 11, 0.5));
        }
        .tr-flow-arrow-link.tr-flow-arrow-fwd path {
          stroke: #6ee7b7;
          filter: drop-shadow(0 0 3px rgba(110, 231, 183, 0.45));
        }
        .tr-flow-arrow-link.tr-flow-arrow-back path {
          stroke: #fcd34d;
          filter: drop-shadow(0 0 3px rgba(252, 211, 77, 0.45));
        }
        @media (prefers-reduced-motion: reduce) {
          .tr-flow-arrow { display: none; }
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
  parentPickerOpen,
  linkPickerOpen,
  isDraggingFlow,
  inputRef,
  onSelect,
  onHoverChange,
  onLabelChange,
  onKeyDown,
  onAddChild,
  onToggleCollapse,
  onOpenDetails,
  onDelete,
  onFlowMouseDown,
  onPickParentFlow,
  onPickLinkFlow,
}: {
  node: MindMapNode;
  x: number;
  y: number;
  isRoot: boolean;
  isSelected: boolean;
  isCollapsed: boolean;
  childCount: number;
  readonly: boolean;
  parentPickerOpen: boolean;
  linkPickerOpen: { sourceId: string; targetId: string } | null;
  isDraggingFlow: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onSelect: () => void;
  onHoverChange: (hovered: boolean) => void;
  onLabelChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAddChild: () => void;
  onToggleCollapse: () => void;
  onOpenDetails: () => void;
  onDelete: () => void;
  onFlowMouseDown: (e: React.MouseEvent) => void;
  onPickParentFlow: (v: FlowDirection) => void;
  onPickLinkFlow: (v: FlowDirection) => void;
}) {
  const hasNote = !!node.note?.trim();
  const hasImage = !!node.imageUrl;
  const attachCount = node.attachments?.length ?? 0;
  const accent = ACCENT_PALETTE[(node.colorIdx ?? 0) % 5];
  const accentAlt = ACCENT_PALETTE[((node.colorIdx ?? 0) + 2) % 5];
  // Combined picker open flag — used to keep the chip visible while
  // either picker is showing (so the source/target relationship stays
  // legible). Card also surfaces a glow during an active drag.
  const anyPickerOpen = parentPickerOpen || !!linkPickerOpen;
  return (
    <div
      // data-tree-card-id powers the elementFromPoint hit-test that the
      // flow-chip drop handler uses to find which card the user
      // released over.
      data-tree-card-id={node.id}
      className={`tr-card ${isSelected ? 'is-selected' : ''} ${isRoot ? 'is-root' : ''} ${
        isCollapsed ? 'is-collapsed' : ''
      } ${childCount === 0 ? 'is-leaf' : ''} ${isDraggingFlow ? 'is-flow-source' : ''} ${
        anyPickerOpen ? 'has-picker' : ''
      }`}
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
        {/* Chip row directly under the title: the ⓘ details trigger sits
            first (always present), then the data flag chips. Co-locating
            the action with the data it surfaces — click ⓘ to view/edit
            whatever the chips advertise. */}
        <div className="tr-card-flags">
          <button
            type="button"
            className="tr-card-details-chip"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails();
            }}
            data-tip="Open details · note, image, attachments"
            aria-label="Open node details"
          >
            <span className="tr-card-details-chip-icon" aria-hidden>ⓘ</span>
            <span className="tr-card-details-chip-label">Details</span>
          </button>
          {!readonly && !isRoot && (
            <button
              type="button"
              className="tr-card-delete-chip"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              data-tip="Delete this node and its subtree"
              aria-label="Delete node"
            >
              <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 3 L9 9 M9 3 L3 9" />
              </svg>
            </button>
          )}
          {hasNote && (
            <span className="tr-card-flag has-note" data-tip="Has a note">
              <span className="tr-card-flag-icon" aria-hidden>≡</span>
              <span className="tr-card-flag-label">Note</span>
            </span>
          )}
          {hasImage && (
            <span className="tr-card-flag has-image" data-tip="Image attached">
              <span className="tr-card-flag-icon" aria-hidden>▣</span>
              <span className="tr-card-flag-label">Image</span>
            </span>
          )}
          {attachCount > 0 && (
            <span
              className="tr-card-flag has-attach"
              data-tip={`${attachCount} file attachment${attachCount === 1 ? '' : 's'}`}
            >
              <span className="tr-card-flag-icon" aria-hidden>◧</span>
              <span className="tr-card-flag-label">
                {attachCount} {attachCount === 1 ? 'file' : 'files'}
              </span>
            </span>
          )}
        </div>
        {node.note && (
          <p className="tr-card-note" title={node.note}>
            {node.note}
          </p>
        )}
        {childCount > 0 && (
          <div className="tr-card-meta">
            <span className="tr-card-childcount">
              {isCollapsed
                ? `+${childCount} hidden`
                : `${childCount} ${childCount === 1 ? 'child' : 'children'}`}
            </span>
          </div>
        )}
      </div>

      {/* Collapse toggle — SVG chevron that rotates: > when collapsed,
          rotates 90° to point down (∨) when expanded. Clearly a fold
          indicator, can't be confused with the gradient "Add" pill. */}
      {childCount > 0 && (
        <button
          type="button"
          className={`tr-card-toggle ${isCollapsed ? 'is-folded' : 'is-open'}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          aria-label={isCollapsed ? 'Expand subtree' : 'Collapse subtree'}
          data-tip={isCollapsed ? 'Expand subtree' : 'Collapse subtree'}
        >
          <svg
            className="tr-chev"
            viewBox="0 0 12 12"
            width="12"
            height="12"
            aria-hidden
          >
            <path
              d="M4 2.5 L8 6 L4 9.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* Add-child button (right edge, on hover/select) — gradient pink
          pill with a label so it can't be mistaken for the chevron toggle. */}
      {!readonly && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild();
          }}
          className="tr-card-add"
          aria-label="Add child node"
          data-tip="Add a child node"
        >
          <span className="tr-card-add-glyph" aria-hidden>＋</span>
          <span className="tr-card-add-label">Add</span>
        </button>
      )}

      {/* Flow chip — sits below the Add pill. Click opens a parent-edge
          flow picker (skipped on root since root has no parent edge);
          drag creates a link to whatever card you drop onto, then opens
          a picker for the new link's direction. Same UX as the canvas's
          .flow-handle so the two views feel like the same product. */}
      {!readonly && (
        <button
          type="button"
          className="tr-card-flow-chip"
          aria-label="Set flow direction or drag to link"
          data-tip="Click for flow · drag to link"
          onMouseDown={onFlowMouseDown}
          onClick={(e) => e.stopPropagation()}
        >
          <svg
            viewBox="0 0 16 16"
            width="11"
            height="11"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 8 H 11.5 M 8.5 5 L 12 8 L 8.5 11" />
          </svg>
        </button>
      )}

      {/* Inline picker — opens above the card. Two cases: parent-edge
          picker (clicking the chip on a non-root) and link picker (after
          dropping a flow drag onto this card). Only one renders at a
          time per card. */}
      {parentPickerOpen && (
        <div
          className="tr-flow-mini-picker"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {FLOW_DIRS.map(({ value, glyph, label }) => {
            const active = (node.flowDirection || 'forward') === value;
            return (
              <button
                key={value}
                type="button"
                className={`tr-flow-mini-btn ${active ? 'is-active' : ''}`}
                data-flow={value}
                title={label}
                aria-label={label}
                aria-pressed={active ? 'true' : 'false'}
                onClick={(e) => {
                  e.stopPropagation();
                  onPickParentFlow(value);
                }}
              >
                {glyph}
              </button>
            );
          })}
        </div>
      )}
      {linkPickerOpen && (
        <div
          className="tr-flow-mini-picker"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {FLOW_DIRS.map(({ value, glyph, label }) => {
            // 'forward' is the implicit default for new links so it
            // reads as active on first open.
            const active = value === 'forward';
            return (
              <button
                key={value}
                type="button"
                className={`tr-flow-mini-btn ${active ? 'is-active' : ''}`}
                data-flow={value}
                title={label}
                aria-label={label}
                onClick={(e) => {
                  e.stopPropagation();
                  onPickLinkFlow(value);
                }}
              >
                {glyph}
              </button>
            );
          })}
        </div>
      )}

      {/* (Details trigger moved inline into the chip row inside the
          card body so it sits next to the data flags it controls.) */}

      <style jsx>{`
        .tr-card {
          position: absolute;
          min-height: ${CARD_BASE}px;
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
        /* Flag chips sit directly under the title, before the note text,
           as a quick content scan. Tight 5px top margin so they read as
           "metadata of the label" rather than a separate section. */
        .tr-card-flags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 5px;
        }
        .tr-card-flag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.2px;
          padding: 2px 7px 2px 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          color: var(--text);
          /* No heavy border — these are annotations, not buttons. */
          border: 1px solid transparent;
          cursor: default;
        }
        .tr-card-flag-icon {
          font-size: 10px;
          line-height: 1;
          opacity: 0.9;
        }
        .tr-card-flag-label {
          font-weight: 500;
        }
        .tr-card-flag.has-note {
          background: rgba(6, 182, 212, 0.12);
          color: #a5f3fc;
        }
        .tr-card-flag.has-note .tr-card-flag-icon { color: #67e8f9; }
        .tr-card-flag.has-image {
          background: rgba(245, 158, 11, 0.12);
          color: #fcd34d;
        }
        .tr-card-flag.has-image .tr-card-flag-icon { color: #f59e0b; }
        .tr-card-flag.has-attach {
          background: rgba(236, 72, 153, 0.12);
          color: #fbcfe8;
          font-variant-numeric: tabular-nums;
        }
        .tr-card-flag.has-attach .tr-card-flag-icon { color: #ec4899; }
        .is-root .tr-card-flag {
          background: rgba(255, 255, 255, 0.18);
          color: white;
        }
        .is-root .tr-card-flag .tr-card-flag-icon { color: white; }
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

        /* Collapse toggle — SVG chevron, rotates from > (folded) to ∨
           (open). Accordion-style fold indicator. */
        .tr-card-toggle {
          position: absolute;
          right: -10px;
          top: 10px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 17, 36, 0.95);
          color: color-mix(in srgb, var(--tr-accent) 75%, white);
          border: 1px solid color-mix(in srgb, var(--tr-accent) 55%, rgba(255, 255, 255, 0.1));
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
          z-index: 2;
          padding: 0;
        }
        .tr-chev {
          display: block;
          transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
          /* Slight nudge to optically centre the chevron path inside the
             circle (its visual centre sits a hair right of geometric). */
          margin-left: 1px;
        }
        .tr-card-toggle.is-open .tr-chev {
          transform: rotate(90deg);
          margin-left: 0;
          margin-top: 1px;
        }
        .tr-card-toggle:hover {
          background: var(--tr-accent);
          color: white;
          transform: scale(1.1);
          border-color: color-mix(in srgb, var(--tr-accent) 90%, white);
        }
        .is-root .tr-card-toggle {
          background: rgba(0, 0, 0, 0.45);
          border-color: rgba(255, 255, 255, 0.4);
          color: white;
        }

        /* Add-child pill — gradient pink-violet with a label. Distinct
           from the dark chevron toggle in shape, colour, and copy. */
        .tr-card-add {
          position: absolute;
          right: -14px;
          bottom: 8px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px 4px 8px;
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          color: white;
          border: 1.5px solid rgba(15, 17, 36, 0.85);
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          line-height: 1;
          letter-spacing: 0.2px;
          cursor: pointer;
          opacity: 0;
          transform: translateX(6px) scale(0.85);
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 8px 18px rgba(139, 92, 246, 0.45);
          z-index: 2;
        }
        .tr-card-add-glyph {
          font-size: 13px;
          line-height: 1;
          margin-top: -1px;
        }
        .tr-card-add-label {
          font-weight: 600;
        }
        .tr-card:hover .tr-card-add,
        .tr-card.is-selected .tr-card-add {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
        .tr-card-add:hover {
          transform: translateX(0) scale(1.06);
          box-shadow: 0 10px 24px rgba(139, 92, 246, 0.6);
        }

        /* Details trigger — chip-styled, sits in the flag row next to
           the data chips it controls. Always visible (no hover-reveal)
           since it's the primary way to reach a node's note / image /
           attachments from this view. */
        .tr-card-details-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.2px;
          padding: 2px 8px 2px 7px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--tr-accent) 16%, rgba(255, 255, 255, 0.04));
          border: 1px solid color-mix(in srgb, var(--tr-accent) 35%, transparent);
          color: var(--text);
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }
        .tr-card-details-chip-icon {
          font-size: 11px;
          line-height: 1;
          color: color-mix(in srgb, var(--tr-accent) 80%, white);
        }
        .tr-card-details-chip-label {
          font-weight: 600;
        }
        .tr-card-details-chip:hover {
          background: color-mix(in srgb, var(--tr-accent) 30%, transparent);
          border-color: var(--tr-accent);
          transform: translateY(-1px);
        }
        .tr-card-details-chip:hover .tr-card-details-chip-icon {
          color: white;
        }
        .is-root .tr-card-details-chip {
          background: rgba(255, 255, 255, 0.18);
          border-color: rgba(255, 255, 255, 0.3);
          color: white;
        }
        .is-root .tr-card-details-chip-icon {
          color: white;
        }
        .is-root .tr-card-details-chip:hover {
          background: rgba(255, 255, 255, 0.28);
          border-color: rgba(255, 255, 255, 0.5);
        }

        /* Delete chip — icon-only round button (× is universally
           readable so the label was costing horizontal space without
           adding info). Danger styling, reveals on hover/select only,
           hidden on root. */
        .tr-card-delete-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          cursor: pointer;
          transition: all 0.15s;
          padding: 0;
          opacity: 0;
          transform: scale(0.9);
          line-height: 0;
        }
        .tr-card:hover .tr-card-delete-chip,
        .tr-card.is-selected .tr-card-delete-chip {
          opacity: 1;
          transform: scale(1);
        }
        .tr-card-delete-chip:hover {
          background: rgba(239, 68, 68, 0.24);
          border-color: rgba(239, 68, 68, 0.65);
          color: #fee2e2;
          transform: scale(1.08);
        }

        /* Flow chip — sits below the Add pill on the right edge. Smaller
           and more muted than Add so the primary action (add a child)
           still reads as primary. Reveals on hover/select like Add; also
           reveals while ANY picker is open so the relationship between
           chip and picker stays legible. */
        .tr-card-flow-chip {
          position: absolute;
          right: -10px;
          bottom: -10px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background: rgba(15, 17, 36, 0.95);
          color: color-mix(in srgb, var(--tr-accent) 80%, white);
          border: 1.5px solid color-mix(
            in srgb,
            var(--tr-accent) 55%,
            rgba(255, 255, 255, 0.12)
          );
          cursor: grab;
          opacity: 0;
          transform: scale(0.85);
          transition:
            transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
            background 0.15s,
            color 0.15s,
            box-shadow 0.15s,
            border-color 0.15s,
            opacity 0.15s;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.45);
          z-index: 2;
        }
        .tr-card-flow-chip:active {
          cursor: grabbing;
        }
        .tr-card:hover .tr-card-flow-chip,
        .tr-card.is-selected .tr-card-flow-chip,
        .tr-card.has-picker .tr-card-flow-chip,
        .tr-card.is-flow-source .tr-card-flow-chip {
          opacity: 1;
          transform: scale(1);
        }
        .tr-card-flow-chip:hover {
          background: var(--tr-accent);
          color: white;
          transform: scale(1.1);
          border-color: color-mix(in srgb, var(--tr-accent) 90%, white);
        }
        .tr-card.is-flow-source .tr-card-flow-chip {
          background: var(--tr-accent);
          color: white;
          border-color: color-mix(in srgb, var(--tr-accent) 90%, white);
          box-shadow:
            0 4px 10px rgba(0, 0, 0, 0.45),
            0 0 0 4px color-mix(in srgb, var(--tr-accent) 28%, transparent);
        }
        .is-root .tr-card-flow-chip {
          background: rgba(0, 0, 0, 0.45);
          border-color: rgba(255, 255, 255, 0.4);
          color: white;
        }
        .is-root .tr-card-flow-chip:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.7);
        }

        /* Flow-source glow on the card itself so the drag origin is
           obvious even when the cursor's far away. */
        .tr-card.is-flow-source {
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.08) inset,
            0 14px 36px rgba(0, 0, 0, 0.55),
            0 0 0 2px color-mix(in srgb, var(--tr-accent) 50%, transparent),
            0 0 42px color-mix(in srgb, var(--tr-accent) 35%, transparent);
        }

        /* Inline picker — 4-button popup that floats above the card.
           Same colour-coded active states as the canvas picker so the
           two surfaces speak the same visual language. */
        .tr-flow-mini-picker {
          position: absolute;
          top: -42px;
          left: 50%;
          transform: translateX(-50%);
          display: inline-flex;
          gap: 2px;
          padding: 3px;
          border-radius: 10px;
          background: rgba(8, 9, 18, 0.96);
          border: 1px solid var(--border);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.55);
          z-index: 10;
          animation: tr-flow-pop-in 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        @keyframes tr-flow-pop-in {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(4px) scale(0.85);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }
        .tr-flow-mini-btn {
          background: transparent;
          color: var(--text-dim);
          border: none;
          font-size: 13px;
          font-weight: 600;
          padding: 5px 9px;
          border-radius: 6px;
          cursor: pointer;
          font-family: inherit;
          line-height: 1;
          min-width: 26px;
          transition: all 0.12s;
        }
        .tr-flow-mini-btn:hover {
          color: var(--text);
          background: rgba(255, 255, 255, 0.08);
        }
        .tr-flow-mini-btn.is-active {
          color: white;
          background: rgba(255, 255, 255, 0.1);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
        }
        .tr-flow-mini-btn[data-flow='forward'].is-active {
          background: rgba(16, 185, 129, 0.34);
          box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.65);
        }
        .tr-flow-mini-btn[data-flow='backward'].is-active {
          background: rgba(245, 158, 11, 0.34);
          box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.65);
        }
        .tr-flow-mini-btn[data-flow='both'].is-active {
          background: rgba(6, 182, 212, 0.34);
          box-shadow: inset 0 0 0 1px rgba(6, 182, 212, 0.65);
        }
        .tr-flow-mini-btn[data-flow='none'].is-active {
          background: rgba(148, 163, 184, 0.34);
          box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.65);
        }
      `}</style>
    </div>
  );
}
