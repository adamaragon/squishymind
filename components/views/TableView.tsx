'use client';

import { useMemo, useState } from 'react';
import type { MindMapData, MindMapNode, ViewMode } from '@/lib/types';
import NodeDetailPanel from './NodeDetailPanel';

type Props = {
  mindmapId: string;
  initialData: MindMapData;
  initialTitle: string;
  readonly?: boolean;
  onSwitchView?: (mode: ViewMode) => void;
  /** Called with the updated MindMapData when the detail panel mutates a
   *  node (label / note / image / attachments). Parent debounces save. */
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

function walkPaths(d: MindMapData): string[][] {
  const paths: string[][] = [];
  if (!d.rootId) return paths;
  function walk(id: string, path: string[]) {
    const node = d.nodes[id];
    if (!node) return;
    const next = [...path, id];
    const children = d.childIndex[id] || [];
    if (children.length === 0) {
      paths.push(next);
      return;
    }
    for (const c of children) walk(c, next);
  }
  walk(d.rootId, []);
  return paths;
}

export default function TableView({
  mindmapId,
  initialData,
  initialTitle,
  readonly = false,
  onSwitchView,
  onDataChange,
}: Props) {
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [hintForCellId, setHintForCellId] = useState<string | null>(null);
  const [density, setDensity] = useState<'comfy' | 'compact'>('comfy');
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  // Local data state so detail-panel edits feel immediate. Resyncs when the
  // parent reseeds with new initialData (view switch).
  const [data, setData] = useState<MindMapData>(initialData);
  // Keep state aligned when the parent supplies fresh data (e.g. after a
  // realtime sync). Cheap deep-equal via JSON to avoid spurious updates.
  useMemo(() => {
    if (JSON.stringify(initialData) !== JSON.stringify(data)) {
      setData(initialData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  function applyNodeUpdate(next: MindMapNode) {
    const updated: MindMapData = {
      ...data,
      nodes: { ...data.nodes, [next.id]: next },
    };
    setData(updated);
    onDataChange?.(updated);
  }

  const paths = useMemo(() => walkPaths(data), [data]);
  const maxDepth = useMemo(
    () => paths.reduce((acc, p) => Math.max(acc, p.length), 0),
    [paths],
  );

  // Stats for the header strip.
  const stats = useMemo(() => {
    const totalNodes = Object.keys(data.nodes).length;
    const leaves = paths.length;
    const noted = Object.values(data.nodes).filter((n) => n.note && n.note.trim()).length;
    const branches = totalNodes - leaves;
    return { totalNodes, leaves, branches, noted };
  }, [data, paths]);

  function tryEdit(cellId: string) {
    if (readonly) return;
    setHintForCellId(cellId);
    setTimeout(() => setHintForCellId((c) => (c === cellId ? null : c)), 2800);
  }

  void mindmapId;
  void initialTitle;

  const detailNode = detailNodeId ? data.nodes[detailNodeId] : null;

  return (
    <div className={`table-view h-full flex flex-col relative ${density}`}>
      {/* ---- Toolbar / stat strip ---- */}
      <div className="tv-toolbar shrink-0">
        <div className="tv-toolbar-left">
          <div className="tv-title">
            <span className="tv-title-icon" aria-hidden>▦</span>
            <h2>Table</h2>
            <span className="tv-readonly-pill">Read-only</span>
          </div>
          <div className="tv-stats">
            <span className="tv-stat">
              <span className="tv-stat-num">{stats.totalNodes}</span>
              <span className="tv-stat-lbl">nodes</span>
            </span>
            <span className="tv-stat-sep" aria-hidden>·</span>
            <span className="tv-stat">
              <span className="tv-stat-num">{stats.branches}</span>
              <span className="tv-stat-lbl">branches</span>
            </span>
            <span className="tv-stat-sep" aria-hidden>·</span>
            <span className="tv-stat">
              <span className="tv-stat-num">{stats.leaves}</span>
              <span className="tv-stat-lbl">leaves</span>
            </span>
            <span className="tv-stat-sep" aria-hidden>·</span>
            <span className="tv-stat">
              <span className="tv-stat-num">{maxDepth}</span>
              <span className="tv-stat-lbl">levels</span>
            </span>
            <span className="tv-stat-sep" aria-hidden>·</span>
            <span className="tv-stat">
              <span className="tv-stat-num">{stats.noted}</span>
              <span className="tv-stat-lbl">w/ notes</span>
            </span>
          </div>
        </div>
        <div className="tv-toolbar-right">
          <div className="tv-density" role="group" aria-label="Row density">
            <button
              type="button"
              className={`tv-density-btn ${density === 'comfy' ? 'is-active' : ''}`}
              onClick={() => setDensity('comfy')}
              title="Comfortable rows"
              aria-pressed={density === 'comfy'}
            >
              Comfy
            </button>
            <button
              type="button"
              className={`tv-density-btn ${density === 'compact' ? 'is-active' : ''}`}
              onClick={() => setDensity('compact')}
              title="Compact rows"
              aria-pressed={density === 'compact'}
            >
              Compact
            </button>
          </div>
          <button
            type="button"
            onClick={() => onSwitchView?.('canvas')}
            className="tv-canvas-btn"
            title="Switch to the Canvas view to edit this map"
          >
            <span aria-hidden>🧠</span>
            Edit on Canvas
          </button>
        </div>
      </div>

      {/* ---- Grid ---- */}
      <div className="tv-scroll">
        {paths.length === 0 ? (
          <div className="tv-empty">
            <div className="tv-empty-icon" aria-hidden>▦</div>
            <h3>No rows to show</h3>
            <p>This map is empty. Add a node on the canvas to see it here.</p>
          </div>
        ) : (
          <table className="tv-grid">
            <thead>
              <tr>
                <th className="tv-th tv-th-rowno" scope="col">
                  <span className="tv-th-rowno-inner">#</span>
                </th>
                <th className="tv-th tv-th-tag" scope="col" title="Leaf colour tag">
                  Tag
                </th>
                {Array.from({ length: maxDepth }).map((_, i) => (
                  <th key={i} className="tv-th" scope="col">
                    <div className="tv-th-inner">
                      <span className="tv-th-dot" data-depth={i % 5} aria-hidden />
                      <span className="tv-th-label">
                        L{i + 1}
                        <span className="tv-th-sub">
                          {i === 0 ? 'root' : i === maxDepth - 1 ? 'leaf' : 'branch'}
                        </span>
                      </span>
                    </div>
                  </th>
                ))}
                <th className="tv-th tv-th-note" scope="col" title="Per-row data: note, image, attachments">
                  Data
                </th>
              </tr>
            </thead>
            <tbody>
              {paths.map((path, rowIdx) => {
                const prev = rowIdx > 0 ? paths[rowIdx - 1] : null;
                let firstNew = 0;
                if (prev) {
                  while (
                    firstNew < path.length &&
                    firstNew < prev.length &&
                    path[firstNew] === prev[firstNew]
                  ) {
                    firstNew++;
                  }
                }
                const leafId = path[path.length - 1];
                const leafNode = data.nodes[leafId];
                const colorIdx = leafNode?.colorIdx ?? 0;
                const isSelected = selectedRow === rowIdx;
                return (
                  <tr
                    key={rowIdx}
                    className={`tv-row ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedRow(rowIdx)}
                  >
                    <td className="tv-cell tv-cell-rowno">
                      <span className="tv-rowno">{rowIdx + 1}</span>
                    </td>
                    <td className="tv-cell tv-cell-tag">
                      <span
                        className="tv-tag-pill"
                        style={{
                          background: `linear-gradient(135deg, ${ACCENT_PALETTE[colorIdx % 5]}, ${
                            ACCENT_PALETTE[(colorIdx + 2) % 5]
                          })`,
                        }}
                        aria-hidden
                      />
                    </td>
                    {Array.from({ length: maxDepth }).map((_, colIdx) => {
                      const id = path[colIdx];
                      if (!id) {
                        return (
                          <td
                            key={colIdx}
                            className="tv-cell tv-cell-empty"
                            aria-hidden
                          />
                        );
                      }
                      const node = data.nodes[id];
                      const isContinuation = colIdx < firstNew;
                      const isLeaf = colIdx === path.length - 1;
                      const cellKey = `${rowIdx}-${colIdx}`;
                      const hasNote = !!node?.note?.trim();
                      const hasImage = !!node?.imageUrl;
                      const attachCount = node?.attachments?.length ?? 0;
                      const hasData = hasNote || hasImage || attachCount > 0;
                      return (
                        <td
                          key={colIdx}
                          className={[
                            'tv-cell',
                            isContinuation ? 'tv-cell-continuation' : '',
                            isLeaf ? 'tv-cell-leaf' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            tryEdit(cellKey);
                          }}
                          title={node?.note || node?.label || ''}
                          data-depth={colIdx % 5}
                        >
                          {!isContinuation && (
                            <span className="tv-cell-rail" aria-hidden />
                          )}
                          <span className="tv-cell-label">
                            {node?.label || (
                              <span className="tv-cell-untitled">Untitled</span>
                            )}
                          </span>
                          {!isContinuation && hasData && (
                            <span className="tv-cell-flags">
                              {hasNote && (
                                <span
                                  className="tv-cell-flag has-note"
                                  data-tip="Has a note"
                                >
                                  ≡
                                </span>
                              )}
                              {hasImage && (
                                <span
                                  className="tv-cell-flag has-image"
                                  data-tip="Image attached"
                                >
                                  ▣
                                </span>
                              )}
                              {attachCount > 0 && (
                                <span
                                  className="tv-cell-flag has-attach"
                                  data-tip={`${attachCount} file attachment${attachCount === 1 ? '' : 's'}`}
                                >
                                  ◧{attachCount}
                                </span>
                              )}
                            </span>
                          )}
                          {!isContinuation && id && (
                            <button
                              type="button"
                              className="tv-cell-detail-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailNodeId(id);
                              }}
                              data-tip="Open details · note, image, attachments"
                              aria-label="Open node details"
                            >
                              ⓘ
                            </button>
                          )}
                          {hintForCellId === cellKey && (
                            <span className="tv-cell-hint">
                              Switch to Canvas to edit ↗
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="tv-cell tv-cell-noteflag">
                      <button
                        type="button"
                        className="tv-row-details-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (leafId) setDetailNodeId(leafId);
                        }}
                        title="Open this row's leaf node details"
                      >
                        <span className="tv-row-flags">
                          {leafNode?.note?.trim() && (
                            <span
                              className="tv-row-flag has-note"
                              data-tip="Has a note"
                            >
                              <span className="tv-row-flag-icon" aria-hidden>≡</span>
                              <span className="tv-row-flag-label">Note</span>
                            </span>
                          )}
                          {leafNode?.imageUrl && (
                            <span
                              className="tv-row-flag has-image"
                              data-tip="Image attached"
                            >
                              <span className="tv-row-flag-icon" aria-hidden>▣</span>
                              <span className="tv-row-flag-label">Image</span>
                            </span>
                          )}
                          {(leafNode?.attachments?.length ?? 0) > 0 && (
                            <span
                              className="tv-row-flag has-attach"
                              data-tip={`${leafNode!.attachments!.length} file attachment${
                                leafNode!.attachments!.length === 1 ? '' : 's'
                              }`}
                            >
                              <span className="tv-row-flag-icon" aria-hidden>◧</span>
                              <span className="tv-row-flag-label">
                                {leafNode!.attachments!.length}{' '}
                                {leafNode!.attachments!.length === 1 ? 'file' : 'files'}
                              </span>
                            </span>
                          )}
                          {!leafNode?.note?.trim() &&
                            !leafNode?.imageUrl &&
                            !(leafNode?.attachments?.length) && (
                              <span className="tv-row-flag tv-row-flag-empty">No extras</span>
                            )}
                        </span>
                        <span className="tv-row-details-cta">Open ↗</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="tv-foot">
                <td colSpan={maxDepth + 3}>
                  Showing {paths.length} of {paths.length} rows — every leaf path from root to tip.
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {detailNode && (
        <NodeDetailPanel
          node={detailNode}
          readonly={readonly}
          isRoot={detailNode.id === data.rootId}
          accentColor={ACCENT_PALETTE[(detailNode.colorIdx ?? 0) % 5]}
          onChange={applyNodeUpdate}
          onClose={() => setDetailNodeId(null)}
        />
      )}

      <style jsx>{`
        .table-view {
          color: var(--text);
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
          gap: 18px;
          padding: 14px 22px;
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
        }
        .tv-density {
          display: inline-flex;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 2px;
        }
        .tv-density-btn {
          background: transparent;
          color: var(--text-dim);
          border: none;
          font-size: 11px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .tv-density-btn:hover {
          color: var(--text);
        }
        .tv-density-btn.is-active {
          color: var(--text);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
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

        /* ---- Scroll container with grid background ---- */
        .tv-scroll {
          flex: 1;
          min-height: 0;
          overflow: auto;
          padding: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
          background-size: 32px 32px;
          background-position: -1px -1px;
        }

        /* ---- Empty state ---- */
        .tv-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          text-align: center;
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
        }
        .tv-empty p {
          font-size: 12px;
          color: var(--text-dim);
          margin: 0;
        }

        /* ---- Grid ---- */
        .tv-grid {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 13px;
          background: rgba(10, 11, 22, 0.4);
        }

        /* Headers — sticky, label-on-top */
        .tv-th {
          position: sticky;
          top: 0;
          z-index: 3;
          text-align: left;
          background: rgba(15, 17, 36, 0.92);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          color: var(--text-dim);
          font-size: 10px;
          letter-spacing: 0.9px;
          text-transform: uppercase;
          font-weight: 600;
          padding: 12px 14px;
          border-bottom: 1px solid var(--border-strong);
          border-right: 1px solid rgba(255, 255, 255, 0.04);
          white-space: nowrap;
        }
        .tv-th:last-child {
          border-right: none;
        }
        .tv-th-inner {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }
        .tv-th-label {
          display: inline-flex;
          align-items: baseline;
          gap: 5px;
          color: var(--text);
          font-size: 11px;
          letter-spacing: 0.6px;
        }
        .tv-th-sub {
          color: var(--text-dim);
          font-size: 9px;
          letter-spacing: 0.5px;
          text-transform: lowercase;
          font-weight: 400;
        }
        .tv-th-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
          display: inline-block;
        }
        .tv-th-dot[data-depth='0'] { background: #ec4899; }
        .tv-th-dot[data-depth='1'] { background: #8b5cf6; }
        .tv-th-dot[data-depth='2'] { background: #06b6d4; }
        .tv-th-dot[data-depth='3'] { background: #22d3ee; }
        .tv-th-dot[data-depth='4'] { background: #f59e0b; }

        .tv-th-rowno {
          width: 56px;
          padding: 12px 0;
          text-align: center;
        }
        .tv-th-rowno-inner {
          display: inline-block;
          color: var(--text-dim);
          font-size: 11px;
          letter-spacing: 0.6px;
        }
        .tv-th-tag {
          width: 60px;
          padding: 12px 8px;
        }
        .tv-th-note {
          width: 30%;
          min-width: 200px;
        }

        /* Rows */
        .tv-row {
          transition: background 0.1s;
          cursor: default;
        }
        .tv-row:nth-child(even) {
          background: rgba(255, 255, 255, 0.012);
        }
        .tv-row:hover {
          background: rgba(139, 92, 246, 0.05);
        }
        .tv-row.is-selected {
          background: linear-gradient(
            90deg,
            rgba(236, 72, 153, 0.12) 0%,
            rgba(139, 92, 246, 0.08) 100%
          );
          box-shadow: inset 3px 0 0 #ec4899;
        }

        /* Cells — densities are real: comfy gets roomy 16px/18px padding
           with bigger line-height; compact gets a tight 4px/12px so the
           toggle reads as "spreadsheet" vs "data grid". */
        .tv-cell {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          border-right: 1px solid rgba(255, 255, 255, 0.025);
          vertical-align: top;
          position: relative;
          min-width: 160px;
          max-width: 260px;
          color: var(--text);
          line-height: 1.5;
          font-size: 13px;
        }
        .tv-cell:last-child {
          border-right: none;
        }
        .comfy .tv-cell {
          padding: 16px 18px;
          line-height: 1.55;
          font-size: 13.5px;
        }
        .comfy .tv-th {
          padding: 16px 18px;
          font-size: 11px;
        }
        .compact .tv-cell {
          padding: 4px 12px;
          line-height: 1.35;
          font-size: 12px;
        }
        .compact .tv-th {
          padding: 6px 12px;
          font-size: 9.5px;
        }
        /* Compact also tightens the per-row data column so rows feel
           genuinely dense rather than just shorter. */
        .compact .tv-row-details-btn {
          padding: 4px 8px;
          font-size: 10px;
        }
        .compact .tv-row-flag {
          padding: 1px 6px 1px 5px;
          font-size: 9.5px;
        }

        .tv-cell-rowno {
          width: 56px;
          min-width: 56px;
          padding: 10px 0;
          text-align: center;
          color: var(--text-dim);
          font-variant-numeric: tabular-nums;
          font-size: 11px;
          background: rgba(0, 0, 0, 0.15);
          border-right: 1px solid var(--border);
        }
        .tv-rowno {
          display: inline-block;
          font-weight: 500;
        }
        .tv-row.is-selected .tv-rowno {
          color: var(--text);
          font-weight: 700;
        }

        .tv-cell-tag {
          width: 60px;
          min-width: 60px;
          padding: 10px 12px;
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

        .tv-cell-rail {
          position: absolute;
          left: 0;
          top: 14%;
          bottom: 14%;
          width: 2px;
          border-radius: 1px;
          opacity: 0.55;
        }
        .tv-cell[data-depth='0'] .tv-cell-rail { background: #ec4899; }
        .tv-cell[data-depth='1'] .tv-cell-rail { background: #8b5cf6; }
        .tv-cell[data-depth='2'] .tv-cell-rail { background: #06b6d4; }
        .tv-cell[data-depth='3'] .tv-cell-rail { background: #22d3ee; }
        .tv-cell[data-depth='4'] .tv-cell-rail { background: #f59e0b; }

        .tv-cell-continuation {
          color: rgba(232, 234, 255, 0.3);
          background: rgba(255, 255, 255, 0.008);
        }
        .tv-cell-leaf .tv-cell-label {
          font-weight: 500;
        }
        .tv-cell-empty {
          background: rgba(0, 0, 0, 0.12);
          border-bottom-color: transparent;
        }
        .tv-cell-label {
          display: inline-block;
          word-wrap: break-word;
        }
        .tv-cell-untitled {
          color: var(--text-dim);
          font-style: italic;
        }

        .tv-cell-noteflag {
          width: 220px;
          min-width: 180px;
          padding: 6px 10px;
        }
        .tv-row-details-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          width: 100%;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 6px 10px;
          border-radius: 8px;
          cursor: pointer;
          font: inherit;
          font-size: 11px;
          transition: all 0.15s;
        }
        .tv-row-details-btn:hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.4);
        }
        .tv-row-flags {
          display: inline-flex;
          gap: 5px;
          align-items: center;
          flex-wrap: wrap;
        }
        .tv-row-flag {
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
          cursor: default;
        }
        .tv-row-flag-icon {
          font-size: 10px;
          line-height: 1;
        }
        .tv-row-flag-label {
          font-weight: 500;
        }
        .tv-row-flag.has-note {
          background: rgba(6, 182, 212, 0.12);
          color: #a5f3fc;
        }
        .tv-row-flag.has-note .tv-row-flag-icon { color: #67e8f9; }
        .tv-row-flag.has-image {
          background: rgba(245, 158, 11, 0.12);
          color: #fcd34d;
        }
        .tv-row-flag.has-image .tv-row-flag-icon { color: #f59e0b; }
        .tv-row-flag.has-attach {
          background: rgba(236, 72, 153, 0.12);
          color: #fbcfe8;
          font-variant-numeric: tabular-nums;
        }
        .tv-row-flag.has-attach .tv-row-flag-icon { color: #ec4899; }
        .tv-row-flag-empty {
          color: var(--text-dim);
          font-style: italic;
          font-weight: 400;
          background: transparent;
          border-color: transparent;
        }
        .tv-row-details-cta {
          font-size: 10px;
          color: var(--text-dim);
          flex-shrink: 0;
          font-weight: 500;
        }
        .tv-row-details-btn:hover .tv-row-details-cta {
          color: var(--text);
        }

        /* Per-cell hover flags + details button */
        .tv-cell-flags {
          display: inline-flex;
          gap: 4px;
          margin-left: 8px;
          vertical-align: middle;
        }
        .tv-cell-flag {
          display: inline-flex;
          align-items: center;
          font-size: 10px;
          color: var(--text);
          background: rgba(255, 255, 255, 0.05);
          padding: 1px 6px;
          border-radius: 999px;
          font-weight: 600;
          cursor: default;
        }
        .tv-cell-flag.has-note {
          background: rgba(6, 182, 212, 0.15);
          color: #67e8f9;
        }
        .tv-cell-flag.has-image {
          background: rgba(245, 158, 11, 0.15);
          color: #fcd34d;
        }
        .tv-cell-flag.has-attach {
          background: rgba(236, 72, 153, 0.15);
          color: #f9a8d4;
          font-variant-numeric: tabular-nums;
        }
        .tv-cell-detail-btn {
          position: absolute;
          right: 6px;
          top: 6px;
          width: 20px;
          height: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 17, 36, 0.7);
          color: var(--text-dim);
          border: 1px solid var(--border);
          border-radius: 50%;
          font-size: 11px;
          cursor: pointer;
          opacity: 0;
          transform: scale(0.85);
          transition: all 0.15s;
          z-index: 2;
        }
        .tv-cell:hover .tv-cell-detail-btn {
          opacity: 1;
          transform: scale(1);
        }
        .tv-cell-detail-btn:hover {
          color: var(--text);
          background: rgba(139, 92, 246, 0.2);
          border-color: rgba(139, 92, 246, 0.5);
          transform: scale(1.1);
        }

        .tv-cell-hint {
          position: absolute;
          top: -34px;
          left: 8px;
          background: rgba(15, 17, 36, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--border-strong);
          color: var(--text);
          font-size: 10px;
          font-style: normal;
          font-weight: 500;
          padding: 5px 10px;
          border-radius: 6px;
          white-space: nowrap;
          z-index: 5;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
          pointer-events: none;
          animation: tv-hint-in 0.18s ease;
        }
        @keyframes tv-hint-in {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Footer */
        .tv-foot td {
          padding: 12px 14px;
          font-size: 11px;
          color: var(--text-dim);
          background: rgba(0, 0, 0, 0.15);
          border-top: 1px solid var(--border);
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
