'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MindMapData, MindMapNode, ViewMode } from '@/lib/types';
import NodeDetailPanel from './NodeDetailPanel';
import { stripIncomingLinks } from '@/lib/canvas/layout';
import { createClient } from '@/lib/supabase/client';

type Props = {
  mindmapId: string;
  initialData: MindMapData;
  initialTitle: string;
  readonly?: boolean;
  onSwitchView?: (mode: ViewMode) => void;
  /** Called with the updated MindMapData when the detail panel mutates a
   *  node (label / note / image / attachments / done). Parent debounces save. */
  onDataChange?: (data: MindMapData) => void;
};

// Five-accent palette mirrors the canvas node colours so colorIdx maps to a
// recognisable tag regardless of which view a user is in.
const ACCENT_PALETTE = [
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#22d3ee', // sky
  '#f59e0b', // amber
];

// Indentation step (px) for the hierarchical Name column.
const INDENT_PX = 22;

// localStorage key for the chosen table mode. Per-user, not per-map. The 'smm:'
// prefix matches the rest of the app's local keys (e.g. smm:customAccents).
const TABLE_MODE_KEY = 'smm:tableMode';
type TableMode = 'tree' | 'flat';

function loadTableMode(): TableMode {
  if (typeof window === 'undefined') return 'tree';
  try {
    const v = window.localStorage.getItem(TABLE_MODE_KEY);
    if (v === 'tree' || v === 'flat') return v;
  } catch {
    /* private mode, disabled storage, etc. */
  }
  return 'tree';
}

function saveTableMode(mode: TableMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TABLE_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

// Remove a node + its subtree from a MindMapData. Returns a new data object;
// returns null if `id` is the root or doesn't exist (root is non-deletable).
function removeNodeFromData(d: MindMapData, id: string): MindMapData | null {
  if (id === d.rootId) return null;
  const node = d.nodes[id];
  if (!node) return null;
  const nodes = { ...d.nodes };
  const childIndex: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(d.childIndex)) childIndex[k] = v.slice();
  const doomed = new Set<string>();
  const drop = (n: string) => {
    doomed.add(n);
    for (const c of (childIndex[n] || []).slice()) drop(c);
    delete nodes[n];
    delete childIndex[n];
  };
  drop(id);
  if (node.parentId && childIndex[node.parentId]) {
    childIndex[node.parentId] = childIndex[node.parentId].filter(
      (c) => c !== id,
    );
  }
  // Clone any link-bearing nodes that survived, then strip references to
  // the deleted subtree. (We work on a shallow-cloned `nodes` already, but
  // the link arrays themselves are shared with the input data; deep-clone
  // those before mutating.)
  for (const surviving of Object.values(nodes)) {
    if (surviving.links && surviving.links.length > 0) {
      nodes[surviving.id] = { ...surviving, links: surviving.links.slice() };
    }
  }
  stripIncomingLinks(nodes, doomed);
  return { nodes, childIndex, rootId: d.rootId };
}

// One flattened row, shared shape between both modes. `depth` drives the
// hierarchical indent; `path` (breadcrumb labels) drives the flat Path column.
type Row = {
  id: string;
  depth: number;
  hasChildren: boolean;
  childCount: number;
  /** Ancestor + self labels, e.g. ['Root','Branch','Leaf']. */
  path: string[];
};

// Depth-first walk producing one Row per node, in tree order, skipping the
// subtrees of any node in `collapsed`. Root included (depth 0).
function buildHierRows(d: MindMapData, collapsed: Set<string>): Row[] {
  const rows: Row[] = [];
  if (!d.rootId) return rows;
  const walk = (id: string, depth: number, labels: string[]) => {
    const node = d.nodes[id];
    if (!node) return;
    const kids = d.childIndex[id] || [];
    const path = [...labels, node.label || 'Untitled'];
    rows.push({
      id,
      depth,
      hasChildren: kids.length > 0,
      childCount: kids.length,
      path,
    });
    if (collapsed.has(id)) return;
    for (const k of kids) walk(k, depth + 1, path);
  };
  walk(d.rootId, 0, []);
  return rows;
}

// Every node as its own row (no nesting), each carrying its full breadcrumb
// path. Order follows the same DFS so the default (unsorted) flat view still
// reads top-to-bottom like the tree.
function buildFlatRows(d: MindMapData): Row[] {
  const rows: Row[] = [];
  if (!d.rootId) return rows;
  const walk = (id: string, depth: number, labels: string[]) => {
    const node = d.nodes[id];
    if (!node) return;
    const kids = d.childIndex[id] || [];
    const path = [...labels, node.label || 'Untitled'];
    rows.push({
      id,
      depth,
      hasChildren: kids.length > 0,
      childCount: kids.length,
      path,
    });
    for (const k of kids) walk(k, depth + 1, path);
  };
  walk(d.rootId, 0, []);
  return rows;
}

// Sortable columns in the flat view.
type SortKey = 'label' | 'path' | 'note' | 'done' | 'children' | 'votes';
type SortDir = 'asc' | 'desc';

export default function TableView({
  // initialTitle is part of the shared view-component interface; unused here.
  mindmapId,
  initialData,
  initialTitle: _initialTitle,
  readonly = false,
  onSwitchView,
  onDataChange,
}: Props) {
  const [mode, setMode] = useState<TableMode>('tree');
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Flat-mode controls.
  const [sortKey, setSortKey] = useState<SortKey>('path');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filter, setFilter] = useState('');

  // Dot-vote tallies per node id, fetched from node_votes and kept live.
  const [votes, setVotes] = useState<Record<string, { count: number; mine: boolean }>>({});
  const [canVote, setCanVote] = useState(false);
  const uidRef = useRef<string | null>(null);

  // Local data state so detail-panel edits feel immediate. Resyncs when the
  // parent reseeds with new initialData (view switch / realtime sync).
  const [data, setData] = useState<MindMapData>(initialData);
  // Keep state aligned when the parent supplies fresh data. Cheap deep-equal
  // via JSON to avoid spurious updates.
  useMemo(() => {
    if (JSON.stringify(initialData) !== JSON.stringify(data)) {
      setData(initialData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  // Read persisted mode once on mount (guarded for SSR).
  useEffect(() => {
    setMode(loadTableMode());
  }, []);

  function changeMode(next: TableMode) {
    setMode(next);
    saveTableMode(next);
  }

  function applyNodeUpdate(next: MindMapNode) {
    const updated: MindMapData = {
      ...data,
      nodes: { ...data.nodes, [next.id]: next },
    };
    setData(updated);
    onDataChange?.(updated);
  }

  function applyDeleteNode(id: string) {
    const updated = removeNodeFromData(data, id);
    if (!updated) return;
    setData(updated);
    if (detailNodeId === id) setDetailNodeId(null);
    onDataChange?.(updated);
  }

  // Toggle a node's `done` flag through the same immutable-update path as
  // every other mutation. No-op when readonly.
  function toggleDone(id: string) {
    if (readonly) return;
    const node = data.nodes[id];
    if (!node) return;
    applyNodeUpdate({ ...node, done: !node.done });
  }

  // ---- Dot-voting: fetch tallies + keep them live (mirrors the canvas) ----
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const refetch = async () => {
      const { data: rows, error } = await supabase
        .from('node_votes')
        .select('node_id,user_id')
        .eq('mindmap_id', mindmapId);
      if (error || !active) return;
      const next: Record<string, { count: number; mine: boolean }> = {};
      const uid = uidRef.current;
      for (const r of (rows as Array<{ node_id: string; user_id: string }> | null) || []) {
        if (!next[r.node_id]) next[r.node_id] = { count: 0, mine: false };
        next[r.node_id].count += 1;
        if (uid && r.user_id === uid) next[r.node_id].mine = true;
      }
      if (active) setVotes(next);
    };
    supabase.auth.getUser().then(({ data: u }) => {
      uidRef.current = u.user?.id ?? null;
      if (active) setCanVote(!!uidRef.current);
      void refetch();
    });
    const channel = supabase
      .channel(`map:${mindmapId}:votes:table`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'node_votes',
          filter: `mindmap_id=eq.${mindmapId}`,
        },
        () => {
          void refetch();
        },
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [mindmapId]);

  // Toggle the current user's vote on a node (optimistic; realtime reconciles).
  const toggleVote = useCallback(
    async (nodeId: string) => {
      const uid = uidRef.current;
      if (!uid) return;
      const wasMine = votes[nodeId]?.mine ?? false;
      const supabase = createClient();
      setVotes((prev) => {
        const cur = prev[nodeId] || { count: 0, mine: false };
        return {
          ...prev,
          [nodeId]: {
            count: Math.max(0, cur.count + (wasMine ? -1 : 1)),
            mine: !wasMine,
          },
        };
      });
      try {
        if (!wasMine) {
          await supabase
            .from('node_votes')
            .insert({ mindmap_id: mindmapId, node_id: nodeId, user_id: uid });
        } else {
          await supabase
            .from('node_votes')
            .delete()
            .eq('mindmap_id', mindmapId)
            .eq('node_id', nodeId)
            .eq('user_id', uid);
        }
      } catch {
        /* realtime refetch reconciles */
      }
    },
    [votes, mindmapId],
  );

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
    // Collapse every node that has children except the root, so the root row
    // (and its top-level children) stay visible.
    const next = new Set<string>();
    for (const [pid, kids] of Object.entries(data.childIndex)) {
      if (kids.length > 0 && pid !== data.rootId) next.add(pid);
    }
    setCollapsed(next);
  }

  function onSort(key: SortKey) {
    setSortDir((prevDir) => {
      // Same column → flip direction; new column → start ascending.
      if (key === sortKey) return prevDir === 'asc' ? 'desc' : 'asc';
      return 'asc';
    });
    setSortKey(key);
  }

  const rootLabel = data.rootId
    ? (data.nodes[data.rootId]?.label || 'Untitled mind map')
    : null;

  // Hierarchical rows (respects collapse).
  const hierRows = useMemo(
    () => buildHierRows(data, collapsed),
    [data, collapsed],
  );

  // Flat rows: build, filter, then sort. Filtering matches label / note /
  // breadcrumb path, case-insensitive.
  const flatRowsBase = useMemo(() => buildFlatRows(data), [data]);
  const flatRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let rows = flatRowsBase;
    if (q) {
      rows = rows.filter((r) => {
        const node = data.nodes[r.id];
        const label = (node?.label || '').toLowerCase();
        const note = (node?.note || '').toLowerCase();
        const path = r.path.join(' › ').toLowerCase();
        return label.includes(q) || note.includes(q) || path.includes(q);
      });
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    const sorted = rows.slice().sort((a, b) => {
      const na = data.nodes[a.id];
      const nb = data.nodes[b.id];
      let cmp = 0;
      switch (sortKey) {
        case 'label':
          cmp = (na?.label || '').localeCompare(nb?.label || '');
          break;
        case 'path':
          cmp = a.path.join(' › ').localeCompare(b.path.join(' › '));
          break;
        case 'note':
          cmp = (na?.note || '').localeCompare(nb?.note || '');
          break;
        case 'done':
          cmp = Number(!!na?.done) - Number(!!nb?.done);
          break;
        case 'children':
          cmp = a.childCount - b.childCount;
          break;
        case 'votes':
          cmp = (votes[a.id]?.count || 0) - (votes[b.id]?.count || 0);
          break;
      }
      return cmp * dir;
    });
    return sorted;
  }, [flatRowsBase, data, filter, sortKey, sortDir, votes]);

  // Stats for the header strip.
  const stats = useMemo(() => {
    const all = Object.values(data.nodes);
    const totalNodes = all.length;
    const noted = all.filter((n) => n.note && n.note.trim()).length;
    const done = all.filter((n) => n.done).length;
    let maxDepth = 0;
    for (const n of all) maxDepth = Math.max(maxDepth, n.depth ?? 0);
    return { totalNodes, noted, done, levels: maxDepth + 1 };
  }, [data]);

  const detailNode = detailNodeId ? data.nodes[detailNodeId] : null;
  const isEmpty = !data.rootId || Object.keys(data.nodes).length === 0;
  const visibleCount = mode === 'tree' ? hierRows.length : flatRows.length;

  // Column count for the flat header's sort arrows / a11y. Tag · Name · Path ·
  // Note · Image · Done · Children.
  return (
    <div className="table-view h-full flex flex-col relative">
      {/* ---- Toolbar / stat strip ---- */}
      <div className="tv-toolbar shrink-0">
        <div className="tv-toolbar-left">
          <div className="tv-title">
            <span className="tv-title-icon" aria-hidden>▦</span>
            <h2>Table</h2>
            {rootLabel && (
              <span className="tv-root-crumb" title="Root of this mind map">
                <span className="tv-root-icon" aria-hidden>🧠</span>
                <span className="tv-root-name">{rootLabel}</span>
              </span>
            )}
            {readonly && <span className="tv-readonly-pill">Read-only</span>}
          </div>
          <div className="tv-stats">
            <span className="tv-stat">
              <span className="tv-stat-num">{stats.totalNodes}</span>
              <span className="tv-stat-lbl">nodes</span>
            </span>
            <span className="tv-stat-sep" aria-hidden>·</span>
            <span className="tv-stat">
              <span className="tv-stat-num">{stats.levels}</span>
              <span className="tv-stat-lbl">levels</span>
            </span>
            <span className="tv-stat-sep" aria-hidden>·</span>
            <span className="tv-stat">
              <span className="tv-stat-num">{stats.noted}</span>
              <span className="tv-stat-lbl">w/ notes</span>
            </span>
            <span className="tv-stat-sep" aria-hidden>·</span>
            <span className="tv-stat">
              <span className="tv-stat-num">{stats.done}</span>
              <span className="tv-stat-lbl">done</span>
            </span>
          </div>
        </div>
        <div className="tv-toolbar-right">
          {/* Mode toggle — the headline control. */}
          <div className="tv-modeseg" role="group" aria-label="Table layout">
            <button
              type="button"
              className={`tv-mode-btn ${mode === 'tree' ? 'is-active' : ''}`}
              onClick={() => changeMode('tree')}
              aria-pressed={mode === 'tree'}
              title="Hierarchy — rows mirror the tree with indentation"
            >
              <span aria-hidden>⊟</span> Hierarchy
            </button>
            <button
              type="button"
              className={`tv-mode-btn ${mode === 'flat' ? 'is-active' : ''}`}
              onClick={() => changeMode('flat')}
              aria-pressed={mode === 'flat'}
              title="Spreadsheet — every node a flat, sortable row"
            >
              <span aria-hidden>▤</span> Spreadsheet
            </button>
          </div>

          {mode === 'tree' && !isEmpty && (
            <div className="tv-treetools" role="group" aria-label="Expand controls">
              <button
                type="button"
                className="tv-tool-btn"
                onClick={expandAll}
                title="Expand all rows"
              >
                <span aria-hidden>▾</span> Expand
              </button>
              <button
                type="button"
                className="tv-tool-btn"
                onClick={collapseAll}
                title="Collapse all rows"
              >
                <span aria-hidden>▸</span> Collapse
              </button>
            </div>
          )}

          {mode === 'flat' && !isEmpty && (
            <div className="tv-filter">
              <span className="tv-filter-icon" aria-hidden>⌕</span>
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter rows…"
                className="tv-filter-input"
                aria-label="Filter rows by label, note, or path"
                spellCheck={false}
              />
              {filter && (
                <button
                  type="button"
                  className="tv-filter-clear"
                  onClick={() => setFilter('')}
                  aria-label="Clear filter"
                  title="Clear filter"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => onSwitchView?.('canvas')}
            className="tv-canvas-btn"
            title="Switch to the wobbly spatial view"
          >
            <span aria-hidden>🧠</span>
            Open Canvas
          </button>
        </div>
      </div>

      {/* ---- Grid ---- */}
      <div className="tv-scroll">
        {isEmpty ? (
          <div className="tv-empty">
            <div className="tv-empty-icon" aria-hidden>▦</div>
            <h3>No rows to show</h3>
            <p>This map is empty. Add a node on the canvas to see it here.</p>
          </div>
        ) : mode === 'tree' ? (
          <HierTable
            rows={hierRows}
            data={data}
            readonly={readonly}
            collapsed={collapsed}
            rootId={data.rootId}
            onOpen={(id) => setDetailNodeId(id)}
            onToggleCollapse={toggleCollapse}
            onToggleDone={toggleDone}
            onDelete={applyDeleteNode}
            votes={votes}
            canVote={canVote}
            onToggleVote={toggleVote}
          />
        ) : (
          <FlatTable
            rows={flatRows}
            data={data}
            readonly={readonly}
            rootId={data.rootId}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
            onOpen={(id) => setDetailNodeId(id)}
            onToggleDone={toggleDone}
            onDelete={applyDeleteNode}
            votes={votes}
            canVote={canVote}
            onToggleVote={toggleVote}
          />
        )}
      </div>

      {!isEmpty && (
        <div className="tv-foot-bar">
          {mode === 'tree' ? (
            <>
              Showing {visibleCount}{' '}
              {visibleCount === 1 ? 'row' : 'rows'}
              {collapsed.size > 0
                ? ` · ${collapsed.size} branch${collapsed.size === 1 ? '' : 'es'} collapsed`
                : ' · fully expanded'}
              .
            </>
          ) : (
            <>
              Showing {visibleCount} of {flatRowsBase.length}{' '}
              {flatRowsBase.length === 1 ? 'node' : 'nodes'}
              {filter ? ` matching “${filter}”` : ''} · sorted by {sortKey} (
              {sortDir}).
            </>
          )}
        </div>
      )}

      {detailNode && (
        <NodeDetailPanel
          node={detailNode}
          readonly={readonly}
          isRoot={detailNode.id === data.rootId}
          accentColor={ACCENT_PALETTE[(detailNode.colorIdx ?? 0) % 5]}
          onChange={applyNodeUpdate}
          onDelete={() => {
            const id = detailNode.id;
            setDetailNodeId(null);
            applyDeleteNode(id);
          }}
          onClose={() => setDetailNodeId(null)}
        />
      )}

      <style jsx>{`
        .table-view {
          color: var(--text);
          min-width: 0;
          background:
            radial-gradient(
              1200px 600px at 0% -10%,
              rgba(139, 92, 246, 0.06) 0%,
              transparent 60%
            ),
            radial-gradient(
              900px 500px at 100% 110%,
              rgba(6, 182, 212, 0.06) 0%,
              transparent 60%
            );
        }

        /* ---- Toolbar ---- */
        .tv-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
          background: rgba(10, 11, 22, 0.6);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          flex-wrap: wrap;
        }
        .tv-toolbar-left {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
        }
        .tv-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .tv-title-icon {
          font-size: 16px;
          line-height: 1;
          color: transparent;
          background: linear-gradient(135deg, #8b5cf6, #06b6d4);
          background-clip: text;
          -webkit-background-clip: text;
          font-weight: 700;
        }
        .tv-title h2 {
          font-size: 14px;
          font-weight: 600;
          margin: 0;
          letter-spacing: 0.2px;
        }
        .tv-readonly-pill {
          font-size: 9px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          font-weight: 600;
          color: rgba(139, 92, 246, 0.9);
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.3);
          padding: 2px 7px;
          border-radius: 999px;
        }
        .tv-root-crumb {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text);
          background: linear-gradient(
            135deg,
            rgba(236, 72, 153, 0.16),
            rgba(139, 92, 246, 0.16)
          );
          border: 1px solid rgba(236, 72, 153, 0.32);
          padding: 3px 10px;
          border-radius: 999px;
          max-width: 240px;
        }
        .tv-root-icon {
          font-size: 12px;
          line-height: 1;
        }
        .tv-root-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .tv-stats {
          display: flex;
          align-items: baseline;
          gap: 8px;
          font-size: 11px;
          color: var(--text-dim);
        }
        .tv-stat {
          display: inline-flex;
          align-items: baseline;
          gap: 4px;
        }
        .tv-stat-num {
          color: var(--text);
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
          font-size: 13px;
        }
        .tv-stat-lbl {
          opacity: 0.7;
        }
        .tv-stat-sep {
          opacity: 0.3;
        }
        .tv-toolbar-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* Mode segmented control */
        .tv-modeseg {
          display: inline-flex;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border);
          border-radius: 9px;
          padding: 2px;
        }
        .tv-mode-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          color: var(--text-dim);
          border: none;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.2px;
          padding: 5px 12px;
          border-radius: 7px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .tv-mode-btn:hover {
          color: var(--text);
        }
        .tv-mode-btn.is-active {
          color: var(--text);
          background: linear-gradient(
            135deg,
            rgba(236, 72, 153, 0.22),
            rgba(139, 92, 246, 0.22)
          );
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .tv-treetools {
          display: inline-flex;
          gap: 6px;
        }
        .tv-tool-btn {
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
        .tv-tool-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text);
          border-color: var(--border-strong);
        }

        /* Filter input */
        .tv-filter {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 3px 8px;
          transition: border-color 0.15s;
        }
        .tv-filter:focus-within {
          border-color: rgba(139, 92, 246, 0.5);
        }
        .tv-filter-icon {
          font-size: 13px;
          color: var(--text-dim);
        }
        .tv-filter-input {
          background: transparent;
          border: none;
          outline: none;
          color: var(--text);
          font: inherit;
          font-size: 12px;
          width: 150px;
        }
        .tv-filter-input::placeholder {
          color: var(--text-dim);
        }
        .tv-filter-clear {
          background: transparent;
          border: none;
          color: var(--text-dim);
          font-size: 11px;
          cursor: pointer;
          padding: 0 2px;
          line-height: 1;
          transition: color 0.12s;
        }
        .tv-filter-clear:hover {
          color: var(--text);
        }

        .tv-canvas-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, rgba(236, 72, 153, 0.18), rgba(139, 92, 246, 0.18));
          border: 1px solid rgba(236, 72, 153, 0.32);
          color: var(--text);
          font-size: 11px;
          font-weight: 500;
          padding: 5px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .tv-canvas-btn:hover {
          background: linear-gradient(135deg, rgba(236, 72, 153, 0.28), rgba(139, 92, 246, 0.28));
          border-color: rgba(236, 72, 153, 0.5);
          transform: translateY(-1px);
        }

        /* ---- Scroll container ---- */
        .tv-scroll {
          flex: 1;
          min-height: 0;
          overflow: auto;
          padding: 0;
        }

        /* ---- Empty state ---- */
        .tv-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          text-align: center;
          background:
            radial-gradient(
              300px 200px at 50% 40%,
              rgba(139, 92, 246, 0.06) 0%,
              transparent 70%
            );
        }
        .tv-empty-icon {
          font-size: 48px;
          opacity: 0.25;
          margin-bottom: 12px;
        }
        .tv-empty h3 {
          font-size: 15px;
          font-weight: 600;
          margin: 0 0 6px;
          background: linear-gradient(135deg, #c4b5fd, #67e8f9);
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
        }
        .tv-empty p {
          font-size: 12px;
          color: var(--text-dim);
          margin: 0;
          max-width: 320px;
          line-height: 1.6;
        }

        /* ---- Footer bar ---- */
        .tv-foot-bar {
          flex-shrink: 0;
          padding: 8px 14px;
          font-size: 11px;
          color: var(--text-dim);
          background: rgba(10, 11, 22, 0.55);
          border-top: 1px solid var(--border);
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Hierarchical grid — rows mirror the tree via indentation.
// ============================================================================

type HierTableProps = {
  rows: Row[];
  data: MindMapData;
  readonly: boolean;
  collapsed: Set<string>;
  rootId: string | null;
  onOpen: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onToggleDone: (id: string) => void;
  onDelete: (id: string) => void;
  votes: Record<string, { count: number; mine: boolean }>;
  canVote: boolean;
  onToggleVote: (id: string) => void;
};

function HierTable({
  rows,
  data,
  readonly,
  collapsed,
  rootId,
  onOpen,
  onToggleCollapse,
  onToggleDone,
  onDelete,
  votes,
  canVote,
  onToggleVote,
}: HierTableProps) {
  return (
    <table className="tv-grid" aria-label="Mind map — hierarchical table">
      <thead>
        <tr>
          <th className="tv-th tv-th-tag" scope="col" title="Colour tag from the node's palette index">
            Tag
          </th>
          <th className="tv-th tv-th-name" scope="col">
            Name
          </th>
          <th className="tv-th tv-th-note" scope="col">
            Note
          </th>
          <th className="tv-th tv-th-image" scope="col">
            Image
          </th>
          <th className="tv-th tv-th-done" scope="col" title="Task completion">
            Done
          </th>
          <th className="tv-th tv-th-children" scope="col" title="Direct children">
            Children
          </th>
          <th className="tv-th tv-th-votes" scope="col" title="Dot-votes">
            Votes
          </th>
          {!readonly && (
            <th className="tv-th tv-th-actions" scope="col" aria-label="Row actions" />
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const node = data.nodes[row.id];
          if (!node) return null;
          const isRoot = row.id === rootId;
          const colorIdx = node.colorIdx ?? 0;
          const accent = ACCENT_PALETTE[colorIdx % 5];
          const isCollapsed = collapsed.has(row.id);
          const note = node.note?.trim() || '';
          const done = !!node.done;
          const v = votes[row.id] || { count: 0, mine: false };
          return (
            <tr
              key={row.id}
              className={`tv-row ${done ? 'is-done' : ''} ${isRoot ? 'is-root' : ''}`}
            >
              {/* Tag */}
              <td className="tv-cell tv-cell-tag">
                <span
                  className="tv-tag-pill"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, ${
                      ACCENT_PALETTE[(colorIdx + 2) % 5]
                    })`,
                  }}
                  title={`Colour ${colorIdx + 1}`}
                  aria-hidden
                />
              </td>

              {/* Name — indented, with caret + clickable label opening detail */}
              <td className="tv-cell tv-cell-name">
                <span
                  className="tv-name-indent"
                  style={{ paddingLeft: row.depth * INDENT_PX }}
                >
                  {row.hasChildren ? (
                    <button
                      type="button"
                      className={`tv-caret ${isCollapsed ? 'is-folded' : 'is-open'}`}
                      onClick={() => onToggleCollapse(row.id)}
                      aria-expanded={!isCollapsed}
                      aria-label={
                        isCollapsed
                          ? `Expand ${node.label || 'node'}`
                          : `Collapse ${node.label || 'node'}`
                      }
                    >
                      <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden>
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
                  ) : (
                    <span className="tv-caret is-empty" aria-hidden>
                      ·
                    </span>
                  )}
                  <button
                    type="button"
                    className="tv-name-btn"
                    onClick={() => onOpen(row.id)}
                    title={node.label || 'Untitled — open details'}
                  >
                    <span className="tv-name-label">
                      {node.label || <span className="tv-untitled">Untitled</span>}
                    </span>
                  </button>
                </span>
              </td>

              {/* Note (truncated, full text in tooltip) */}
              <td className="tv-cell tv-cell-note">
                {note ? (
                  <span className="tv-note-text" title={note}>
                    {note}
                  </span>
                ) : (
                  <span className="tv-dash" aria-hidden>
                    —
                  </span>
                )}
              </td>

              {/* Image thumbnail */}
              <td className="tv-cell tv-cell-image">
                {node.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={node.imageUrl}
                    alt={`Thumbnail for ${node.label || 'node'}`}
                    className="tv-thumb"
                  />
                ) : (
                  <span className="tv-dash" aria-hidden>
                    —
                  </span>
                )}
              </td>

              {/* Done checkbox */}
              <td className="tv-cell tv-cell-done">
                <button
                  type="button"
                  className={`tv-check ${done ? 'is-done' : ''}`}
                  onClick={() => onToggleDone(row.id)}
                  disabled={readonly}
                  role="checkbox"
                  aria-checked={done}
                  aria-label={
                    done
                      ? `Mark ${node.label || 'node'} not done`
                      : `Mark ${node.label || 'node'} done`
                  }
                  title={done ? 'Done — click to clear' : 'Mark done'}
                >
                  {done ? (
                    <svg viewBox="0 0 14 14" width="12" height="12" aria-hidden>
                      <path
                        d="M2.5 7.5 L6 11 L11.5 3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </button>
              </td>

              {/* Direct children count */}
              <td className="tv-cell tv-cell-children">
                {row.hasChildren ? (
                  <span className="tv-count">{row.childCount}</span>
                ) : (
                  <span className="tv-dash" aria-hidden>
                    —
                  </span>
                )}
              </td>

              {/* Dot-votes */}
              <td className="tv-cell tv-cell-votes">
                <button
                  type="button"
                  className={`tv-vote ${v.mine ? 'is-mine' : ''} ${v.count > 0 ? 'has-votes' : ''}`}
                  onClick={() => onToggleVote(row.id)}
                  disabled={!canVote || isRoot}
                  aria-pressed={v.mine}
                  aria-label={
                    v.mine
                      ? `Remove your vote (${v.count})`
                      : `Vote for ${node.label || 'node'} (${v.count})`
                  }
                  title={
                    isRoot
                      ? 'The root is not votable'
                      : canVote
                        ? v.mine
                          ? 'Remove your vote'
                          : 'Vote'
                        : 'Sign in to vote'
                  }
                >
                  <span className="tv-vote-caret" aria-hidden>▲</span>
                  <span className="tv-vote-count">{v.count}</span>
                </button>
              </td>

              {/* Delete action */}
              {!readonly && (
                <td className="tv-cell tv-cell-actions">
                  {!isRoot && (
                    <button
                      type="button"
                      className="tv-row-delete-btn"
                      onClick={() => {
                        if (
                          typeof window === 'undefined' ||
                          window.confirm(
                            `Delete "${node.label || 'this node'}" and everything beneath it? Removes it from the canvas too.`,
                          )
                        ) {
                          onDelete(row.id);
                        }
                      }}
                      aria-label={`Delete ${node.label || 'this node'}`}
                      title="Delete this node and subtree"
                    >
                      <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M2.5 3.5 H 11.5" />
                        <path d="M4 3.5 V 2.5 a1 1 0 0 1 1 -1 h4 a1 1 0 0 1 1 1 V 3.5" />
                        <path d="M3.5 3.5 V 11.5 a1 1 0 0 0 1 1 h5 a1 1 0 0 0 1 -1 V 3.5" />
                      </svg>
                    </button>
                  )}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>

      <style jsx>{tableStyles}</style>
    </table>
  );
}

// ============================================================================
// Flat spreadsheet — every node a row, sortable, with a breadcrumb Path column.
// ============================================================================

type FlatTableProps = {
  rows: Row[];
  data: MindMapData;
  readonly: boolean;
  rootId: string | null;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onOpen: (id: string) => void;
  onToggleDone: (id: string) => void;
  onDelete: (id: string) => void;
  votes: Record<string, { count: number; mine: boolean }>;
  canVote: boolean;
  onToggleVote: (id: string) => void;
};

function FlatTable({
  rows,
  data,
  readonly,
  rootId,
  sortKey,
  sortDir,
  onSort,
  onOpen,
  onToggleDone,
  onDelete,
  votes,
  canVote,
  onToggleVote,
}: FlatTableProps) {
  // A sortable header cell: a real <button> carrying aria-sort on its <th>.
  function SortHeader({
    col,
    label,
    className,
    title,
  }: {
    col: SortKey;
    label: string;
    className?: string;
    title?: string;
  }) {
    const active = sortKey === col;
    const ariaSort = active
      ? sortDir === 'asc'
        ? 'ascending'
        : 'descending'
      : 'none';
    return (
      <th
        className={`tv-th tv-th-sortable ${className || ''} ${active ? 'is-sorted' : ''}`}
        scope="col"
        aria-sort={ariaSort}
        title={title}
      >
        <button
          type="button"
          className="tv-sort-btn"
          onClick={() => onSort(col)}
          aria-label={`Sort by ${label} ${active && sortDir === 'asc' ? 'descending' : 'ascending'}`}
        >
          <span>{label}</span>
          <span className="tv-sort-arrow" aria-hidden>
            {active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </button>
      </th>
    );
  }

  return (
    <table className="tv-grid" aria-label="Mind map — flat spreadsheet">
      <thead>
        <tr>
          <th className="tv-th tv-th-tag" scope="col" title="Colour tag from the node's palette index">
            Tag
          </th>
          <SortHeader col="label" label="Label" className="tv-th-name" />
          <SortHeader
            col="path"
            label="Path"
            className="tv-th-path"
            title="Breadcrumb ancestry from the root"
          />
          <SortHeader col="note" label="Note" className="tv-th-note" />
          <th className="tv-th tv-th-image" scope="col">
            Image
          </th>
          <SortHeader col="done" label="Done" className="tv-th-done" title="Task completion" />
          <SortHeader
            col="children"
            label="Children"
            className="tv-th-children"
            title="Direct children"
          />
          <SortHeader col="votes" label="Votes" className="tv-th-votes" title="Dot-votes" />
          {!readonly && (
            <th className="tv-th tv-th-actions" scope="col" aria-label="Row actions" />
          )}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td className="tv-cell tv-noresults" colSpan={readonly ? 8 : 9}>
              No nodes match your filter.
            </td>
          </tr>
        ) : (
          rows.map((row) => {
            const node = data.nodes[row.id];
            if (!node) return null;
            const isRoot = row.id === rootId;
            const colorIdx = node.colorIdx ?? 0;
            const accent = ACCENT_PALETTE[colorIdx % 5];
            const note = node.note?.trim() || '';
            const done = !!node.done;
            const v = votes[row.id] || { count: 0, mine: false };
            // Path breadcrumb: drop the last element (== this node's own
            // label) so the column shows ancestry; show "—" for the root.
            const ancestry = row.path.slice(0, -1);
            return (
              <tr key={row.id} className={`tv-row ${done ? 'is-done' : ''}`}>
                {/* Tag */}
                <td className="tv-cell tv-cell-tag">
                  <span
                    className="tv-tag-pill"
                    style={{
                      background: `linear-gradient(135deg, ${accent}, ${
                        ACCENT_PALETTE[(colorIdx + 2) % 5]
                      })`,
                    }}
                    title={`Colour ${colorIdx + 1}`}
                    aria-hidden
                  />
                </td>

                {/* Label — clickable, opens detail */}
                <td className="tv-cell tv-cell-name">
                  <button
                    type="button"
                    className="tv-name-btn"
                    onClick={() => onOpen(row.id)}
                    title={node.label || 'Untitled — open details'}
                  >
                    <span className="tv-name-label">
                      {node.label || <span className="tv-untitled">Untitled</span>}
                    </span>
                  </button>
                </td>

                {/* Path breadcrumb */}
                <td className="tv-cell tv-cell-path">
                  {ancestry.length > 0 ? (
                    <span className="tv-path" title={row.path.join(' › ')}>
                      {ancestry.join(' › ')}
                    </span>
                  ) : (
                    <span className="tv-dash" aria-hidden>
                      —
                    </span>
                  )}
                </td>

                {/* Note */}
                <td className="tv-cell tv-cell-note">
                  {note ? (
                    <span className="tv-note-text" title={note}>
                      {note}
                    </span>
                  ) : (
                    <span className="tv-dash" aria-hidden>
                      —
                    </span>
                  )}
                </td>

                {/* Image thumbnail */}
                <td className="tv-cell tv-cell-image">
                  {node.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={node.imageUrl}
                      alt={`Thumbnail for ${node.label || 'node'}`}
                      className="tv-thumb"
                    />
                  ) : (
                    <span className="tv-dash" aria-hidden>
                      —
                    </span>
                  )}
                </td>

                {/* Done */}
                <td className="tv-cell tv-cell-done">
                  <button
                    type="button"
                    className={`tv-check ${done ? 'is-done' : ''}`}
                    onClick={() => onToggleDone(row.id)}
                    disabled={readonly}
                    role="checkbox"
                    aria-checked={done}
                    aria-label={
                      done
                        ? `Mark ${node.label || 'node'} not done`
                        : `Mark ${node.label || 'node'} done`
                    }
                    title={done ? 'Done — click to clear' : 'Mark done'}
                  >
                    {done ? (
                      <svg viewBox="0 0 14 14" width="12" height="12" aria-hidden>
                        <path
                          d="M2.5 7.5 L6 11 L11.5 3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </button>
                </td>

                {/* Children */}
                <td className="tv-cell tv-cell-children">
                  {row.hasChildren ? (
                    <span className="tv-count">{row.childCount}</span>
                  ) : (
                    <span className="tv-dash" aria-hidden>
                      —
                    </span>
                  )}
                </td>

                {/* Dot-votes */}
                <td className="tv-cell tv-cell-votes">
                  <button
                    type="button"
                    className={`tv-vote ${v.mine ? 'is-mine' : ''} ${v.count > 0 ? 'has-votes' : ''}`}
                    onClick={() => onToggleVote(row.id)}
                    disabled={!canVote || isRoot}
                    aria-pressed={v.mine}
                    aria-label={
                      v.mine
                        ? `Remove your vote (${v.count})`
                        : `Vote for ${node.label || 'node'} (${v.count})`
                    }
                    title={
                      isRoot
                        ? 'The root is not votable'
                        : canVote
                          ? v.mine
                            ? 'Remove your vote'
                            : 'Vote'
                          : 'Sign in to vote'
                    }
                  >
                    <span className="tv-vote-caret" aria-hidden>▲</span>
                    <span className="tv-vote-count">{v.count}</span>
                  </button>
                </td>

                {/* Delete */}
                {!readonly && (
                  <td className="tv-cell tv-cell-actions">
                    {!isRoot && (
                      <button
                        type="button"
                        className="tv-row-delete-btn"
                        onClick={() => {
                          if (
                            typeof window === 'undefined' ||
                            window.confirm(
                              `Delete "${node.label || 'this node'}" and everything beneath it? Removes it from the canvas too.`,
                            )
                          ) {
                            onDelete(row.id);
                          }
                        }}
                        aria-label={`Delete ${node.label || 'this node'}`}
                        title="Delete this node and subtree"
                      >
                        <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M2.5 3.5 H 11.5" />
                          <path d="M4 3.5 V 2.5 a1 1 0 0 1 1 -1 h4 a1 1 0 0 1 1 1 V 3.5" />
                          <path d="M3.5 3.5 V 11.5 a1 1 0 0 0 1 1 h5 a1 1 0 0 0 1 -1 V 3.5" />
                        </svg>
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })
        )}
      </tbody>

      <style jsx>{tableStyles}</style>
    </table>
  );
}

// Shared grid styles for both table modes. Kept as a string constant so the
// two sub-components stay self-contained inside this single file.
const tableStyles = `
  .tv-grid {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13px;
    background: rgba(10, 11, 22, 0.4);
  }

  /* Headers — sticky */
  .tv-th {
    position: sticky;
    top: 0;
    z-index: 3;
    text-align: left;
    background: rgba(15, 17, 36, 0.94);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    color: var(--text-dim);
    font-size: 10px;
    letter-spacing: 0.9px;
    text-transform: uppercase;
    font-weight: 600;
    padding: 11px 14px;
    border-bottom: 1px solid var(--border-strong);
    border-right: 1px solid rgba(255, 255, 255, 0.04);
    white-space: nowrap;
  }
  .tv-th:last-child {
    border-right: none;
  }
  .tv-th-sortable {
    padding: 0;
    transition: background 0.12s ease;
  }
  .tv-th-sortable:hover {
    background: rgba(139, 92, 246, 0.08);
  }
  .tv-th-sortable.is-sorted {
    color: var(--text);
    background: rgba(139, 92, 246, 0.05);
  }
  .tv-sort-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
    font-size: 10px;
    letter-spacing: 0.9px;
    text-transform: uppercase;
    font-weight: 600;
    padding: 11px 14px;
    cursor: pointer;
    transition: color 0.12s ease;
    border-radius: 0;
  }
  .tv-sort-btn:hover {
    color: var(--text);
  }
  .tv-sort-arrow {
    font-size: 8px;
    opacity: 0.7;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    display: inline-block;
  }
  .is-sorted .tv-sort-arrow {
    opacity: 1;
    color: #c4b5fd;
  }
  .tv-th-sortable[aria-sort="ascending"] .tv-sort-arrow {
    transform: rotate(0deg);
  }
  .tv-th-sortable[aria-sort="descending"] .tv-sort-arrow {
    transform: rotate(180deg);
  }

  .tv-th-tag {
    width: 50px;
    min-width: 50px;
    padding-left: 16px;
    padding-right: 8px;
  }
  .tv-th-name {
    min-width: 220px;
  }
  .tv-th-path {
    min-width: 200px;
  }
  .tv-th-note {
    min-width: 200px;
  }
  .tv-th-image {
    width: 64px;
    min-width: 64px;
    text-align: center;
  }
  .tv-th-done {
    width: 64px;
    min-width: 64px;
  }
  .tv-th-children {
    width: 86px;
    min-width: 86px;
  }
  .tv-th-actions {
    width: 46px;
    min-width: 46px;
  }

  /* Rows — zebra striping + hover + done state */
  .tv-row {
    transition: background 0.12s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .tv-row:nth-child(even) {
    background: rgba(255, 255, 255, 0.014);
  }
  .tv-row:hover {
    background: rgba(139, 92, 246, 0.07);
    box-shadow: inset 3px 0 0 rgba(139, 92, 246, 0.25);
  }
  .tv-row.is-root {
    background: linear-gradient(
      90deg,
      rgba(236, 72, 153, 0.08) 0%,
      rgba(139, 92, 246, 0.04) 60%,
      transparent 100%
    );
  }
  .tv-row.is-done .tv-name-label {
    text-decoration: line-through;
    color: var(--text-dim);
  }
  .tv-row.is-done {
    opacity: 0.78;
  }

  /* Cells */
  .tv-cell {
    padding: 9px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    border-right: 1px solid rgba(255, 255, 255, 0.025);
    vertical-align: middle;
    color: var(--text);
    line-height: 1.45;
    font-size: 13px;
  }
  .tv-cell:last-child {
    border-right: none;
  }
  .tv-noresults {
    text-align: center;
    color: var(--text-dim);
    font-style: italic;
    padding: 40px 14px;
  }

  /* Tag column */
  .tv-cell-tag {
    width: 50px;
    min-width: 50px;
    padding-left: 16px;
    padding-right: 8px;
    text-align: left;
  }
  .tv-tag-pill {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 4px;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.1),
      0 2px 6px rgba(0, 0, 0, 0.4);
  }

  /* Name column (hierarchical indent + caret) */
  .tv-cell-name {
    min-width: 220px;
    max-width: 360px;
  }
  .tv-name-indent {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    width: 100%;
  }
  .tv-caret {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--text-dim);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    padding: 0;
    transition: all 0.15s;
  }
  .tv-caret:hover:not(.is-empty) {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text);
  }
  .tv-caret svg {
    display: block;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .tv-caret.is-open svg {
    transform: rotate(90deg);
  }
  .tv-caret.is-empty {
    color: rgba(255, 255, 255, 0.18);
    cursor: default;
    font-size: 16px;
    line-height: 0;
  }
  .tv-name-btn {
    flex: 1;
    min-width: 0;
    text-align: left;
    background: transparent;
    border: 1px solid transparent;
    color: var(--text);
    font: inherit;
    font-size: 13.5px;
    font-weight: 500;
    padding: 3px 8px;
    border-radius: 6px;
    cursor: pointer;
    transition:
      background 0.12s cubic-bezier(0.16, 1, 0.3, 1),
      border-color 0.12s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .tv-name-btn:hover {
    background: rgba(139, 92, 246, 0.1);
    border-color: rgba(139, 92, 246, 0.32);
  }
  .tv-name-btn:focus-visible {
    outline: none;
    background: rgba(139, 92, 246, 0.08);
    border-color: rgba(139, 92, 246, 0.55);
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.18);
  }
  .tv-name-label {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tv-untitled {
    color: var(--text-dim);
    font-style: italic;
    font-weight: 400;
  }

  /* Path column */
  .tv-cell-path {
    min-width: 200px;
    max-width: 320px;
  }
  .tv-path {
    display: block;
    font-size: 11.5px;
    color: var(--text-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Note column */
  .tv-cell-note {
    min-width: 200px;
    max-width: 360px;
  }
  .tv-note-text {
    display: block;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12.5px;
  }

  /* Image column */
  .tv-cell-image {
    width: 64px;
    min-width: 64px;
    text-align: center;
  }
  .tv-thumb {
    width: 28px;
    height: 28px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid var(--border);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    vertical-align: middle;
  }

  /* Done column */
  .tv-cell-done {
    width: 64px;
    min-width: 64px;
    text-align: center;
  }
  .tv-check {
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.03);
    border: 1.5px solid var(--border-strong);
    border-radius: 5px;
    color: #fff;
    cursor: pointer;
    transition: all 0.15s;
    padding: 0;
  }
  .tv-check:hover:not(:disabled) {
    border-color: rgba(34, 197, 94, 0.6);
    background: rgba(34, 197, 94, 0.1);
  }
  .tv-check:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.45);
  }
  .tv-check.is-done {
    background: linear-gradient(135deg, #22c55e, #16a34a);
    border-color: #22c55e;
    color: #fff;
  }
  .tv-check:disabled {
    cursor: default;
    opacity: 0.7;
  }

  /* Children column */
  .tv-cell-children {
    width: 86px;
    min-width: 86px;
    text-align: left;
  }
  .tv-count {
    display: inline-block;
    min-width: 22px;
    text-align: center;
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
    color: var(--text);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border);
    padding: 2px 7px;
    border-radius: 999px;
  }

  /* Dot-votes column */
  .tv-cell-votes {
    width: 78px;
    min-width: 78px;
    text-align: left;
  }
  .tv-vote {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 9px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
    color: var(--text-dim);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: all 0.15s;
  }
  .tv-vote .tv-vote-caret {
    font-size: 8px;
    opacity: 0.8;
  }
  .tv-vote.has-votes {
    color: var(--text);
  }
  .tv-vote:hover:not(:disabled) {
    border-color: var(--border-strong);
    transform: translateY(-1px);
  }
  .tv-vote:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.5);
  }
  .tv-vote.is-mine {
    color: #fff;
    background: linear-gradient(135deg, #8b5cf6, #06b6d4);
    border-color: transparent;
  }
  .tv-vote:disabled {
    cursor: default;
    opacity: 0.6;
  }

  .tv-dash {
    color: var(--text-dim);
    opacity: 0.5;
  }

  /* Actions column */
  .tv-cell-actions {
    width: 46px;
    min-width: 46px;
    padding: 6px;
    text-align: center;
  }
  .tv-row-delete-btn {
    opacity: 0;
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(239, 68, 68, 0.08);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.15s;
    padding: 0;
    line-height: 0;
  }
  .tv-row:hover .tv-row-delete-btn {
    opacity: 1;
  }
  .tv-row-delete-btn:focus-visible {
    opacity: 1;
    outline: none;
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.45);
  }
  .tv-row-delete-btn:hover {
    background: rgba(239, 68, 68, 0.22);
    border-color: rgba(239, 68, 68, 0.6);
    color: #fee2e2;
    transform: scale(1.08);
  }
`;
