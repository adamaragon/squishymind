'use client';

import { useMemo, useState } from 'react';
import type { MindMapData, ViewMode } from '@/lib/types';

type Props = {
  mindmapId: string;
  initialData: MindMapData;
  initialTitle: string;
  readonly?: boolean;
  onSwitchView?: (mode: ViewMode) => void;
};

// Walk the tree depth-first and collect a path of node-ids for every leaf.
// Non-leaf nodes appear in the rows of their descendant leaves; nodes with
// zero children become their own one-row paths.
function computePaths(d: MindMapData): string[][] {
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
}: Props) {
  const [selected, setSelected] = useState<string | null>(initialData.rootId ?? null);
  const [hintForCellId, setHintForCellId] = useState<string | null>(null);

  // Data is read-only in Table view; never mutated here. Stays in sync with
  // whatever the parent passes in.
  const data = initialData;

  const paths = useMemo(() => computePaths(data), [data]);
  const maxDepth = useMemo(
    () => paths.reduce((acc, p) => Math.max(acc, p.length), 0),
    [paths],
  );

  function tryEdit(cellId: string) {
    if (readonly) return;
    setHintForCellId(cellId);
    setTimeout(() => setHintForCellId((curr) => (curr === cellId ? null : curr)), 3500);
  }

  // Avoid the unused warnings while keeping the prop signature stable for
  // future view switching from this component.
  void mindmapId;
  void initialTitle;

  return (
    <div className="table-view h-full flex flex-col">
      <div className="px-6 pt-5 pb-3 flex items-baseline justify-between gap-3 flex-wrap shrink-0">
        <div>
          <h2 className="text-base font-semibold">Table view</h2>
          <p className="text-xs text-[--text-dim] mt-1">
            One row per leaf path · {paths.length} {paths.length === 1 ? 'row' : 'rows'} ·{' '}
            {maxDepth} {maxDepth === 1 ? 'level' : 'levels'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[--text-dim]">Read-only —</span>
          <button
            type="button"
            onClick={() => onSwitchView?.('canvas')}
            className="btn btn-ghost text-xs"
            title="Switch to the Canvas view to edit this map"
          >
            🧠 Switch to Canvas to edit
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-6 pb-6">
        {paths.length === 0 ? (
          <p className="text-sm text-[--text-dim]">This map is empty.</p>
        ) : (
          <table className="table-view-grid">
            <thead>
              <tr>
                {Array.from({ length: maxDepth }).map((_, i) => (
                  <th key={i} scope="col">
                    Level {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paths.map((path, rowIdx) => {
                const prev = rowIdx > 0 ? paths[rowIdx - 1] : null;
                // Find the first column where this row diverges from the previous.
                // Cells before that are continuations (rendered dimmed); cells from
                // that column onward are "new" — fully visible.
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
                return (
                  <tr key={rowIdx}>
                    {Array.from({ length: maxDepth }).map((_, colIdx) => {
                      const id = path[colIdx];
                      if (!id) {
                        return (
                          <td
                            key={colIdx}
                            className="table-view-cell table-view-cell-empty"
                            aria-hidden
                          />
                        );
                      }
                      const node = data.nodes[id];
                      const isContinuation = colIdx < firstNew;
                      const isSelected = selected === id;
                      const cellKey = `${rowIdx}-${colIdx}`;
                      return (
                        <td
                          key={colIdx}
                          className={[
                            'table-view-cell',
                            isContinuation ? 'table-view-cell-continuation' : '',
                            isSelected ? 'table-view-cell-selected' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => setSelected(id)}
                          onDoubleClick={() => tryEdit(cellKey)}
                          title={node?.note || node?.label || ''}
                        >
                          <span className="table-view-label">{node?.label || 'Untitled'}</span>
                          {node?.note && (
                            <span
                              className="table-view-note-dot"
                              aria-label="has note"
                              title={node.note}
                            >
                              ◉
                            </span>
                          )}
                          {hintForCellId === cellKey && (
                            <span className="table-view-edit-hint">
                              Switch to Canvas to edit
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        .table-view-grid {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 13px;
        }
        .table-view-grid thead th {
          position: sticky;
          top: 0;
          z-index: 2;
          text-align: left;
          background: var(--ui-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: var(--ui-text-dim);
          font-size: 10px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          font-weight: 600;
          padding: 8px 12px;
          border-bottom: 1px solid var(--ui-border);
        }
        .table-view-cell {
          padding: 8px 12px;
          border-bottom: 1px solid color-mix(in srgb, var(--ui-border) 50%, transparent);
          vertical-align: top;
          cursor: pointer;
          position: relative;
          min-width: 160px;
          max-width: 280px;
          color: var(--node-text);
          transition: background 0.12s;
        }
        .table-view-cell:hover {
          background: color-mix(in srgb, var(--selection) 8%, transparent);
        }
        .table-view-cell-continuation {
          color: color-mix(in srgb, var(--node-text) 35%, transparent);
        }
        .table-view-cell-continuation .table-view-note-dot {
          opacity: 0.4;
        }
        .table-view-cell-selected {
          background: color-mix(in srgb, var(--selection) 18%, transparent);
        }
        .table-view-cell-empty {
          background: transparent;
          cursor: default;
          border-bottom-color: transparent;
        }
        .table-view-cell-empty:hover {
          background: transparent;
        }
        .table-view-label {
          display: inline-block;
          word-wrap: break-word;
          line-height: 1.35;
        }
        .table-view-note-dot {
          margin-left: 6px;
          color: var(--accent-2);
          font-size: 10px;
          vertical-align: super;
        }
        .table-view-edit-hint {
          position: absolute;
          top: -28px;
          left: 8px;
          background: var(--ui-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--ui-border);
          color: var(--ui-text);
          font-size: 10px;
          padding: 4px 8px;
          border-radius: 6px;
          white-space: nowrap;
          z-index: 3;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
