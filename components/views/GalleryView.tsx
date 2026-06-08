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
// recognisable tag regardless of which view a user is in. (Copied verbatim
// from TableView so the two stay visually in lockstep.)
const ACCENT_PALETTE = [
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#22d3ee', // sky
  '#f59e0b', // amber
];

type Filter = 'all' | 'images';

export default function GalleryView({
  // mindmapId is part of the shared view-component interface so callers can
  // pass identical props to all views. GalleryView doesn't need it today;
  // underscore signals intentionally-unused.
  mindmapId: _mindmapId,
  initialData,
  initialTitle,
  readonly = false,
  onSwitchView,
  onDataChange,
}: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  // Image URLs that failed to load this session, keyed `${id}::${url}` so a
  // node whose image is later swapped gets a fresh attempt. A failed image
  // makes the card fall back to the text layout — mirroring the canvas, which
  // reverts a broken image node to a plain pill.
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  // Local data state so detail-panel edits feel immediate. Resyncs when the
  // parent reseeds with new initialData (view switch / realtime). Mirrors
  // TableView's approach exactly.
  const [data, setData] = useState<MindMapData>(initialData);
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

  // All nodes in a stable order: depth first, then creation time, so the grid
  // reads roughly root → branches → leaves rather than hash-map order.
  const allNodes = useMemo(() => {
    return Object.values(data.nodes).sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
  }, [data]);

  const imageCount = useMemo(
    () => allNodes.filter((n) => !!n.imageUrl).length,
    [allNodes],
  );

  const cards = useMemo(
    () => (filter === 'images' ? allNodes.filter((n) => !!n.imageUrl) : allNodes),
    [allNodes, filter],
  );

  const detailNode = detailNodeId ? data.nodes[detailNodeId] || null : null;

  const isEmpty = !data.rootId || allNodes.length === 0;

  return (
    <div className="gallery-view h-full flex flex-col relative">
      {/* ---- Header / filter strip ---- */}
      <div className="gv-toolbar shrink-0">
        <div className="gv-toolbar-left">
          <div className="gv-title">
            <span className="gv-title-icon" aria-hidden>
              ▦
            </span>
            <h2 title={initialTitle || 'Untitled mind map'}>
              {initialTitle || 'Untitled mind map'}
            </h2>
            {readonly && <span className="gv-readonly-pill">Read-only</span>}
          </div>
          <span className="gv-count" aria-live="polite">
            <span className="gv-count-num">{cards.length}</span>
            <span className="gv-count-lbl">
              {cards.length === 1 ? 'card' : 'cards'}
              {filter === 'images' ? ' · images only' : ''}
            </span>
          </span>
        </div>
        <div className="gv-toolbar-right">
          <div className="gv-filter" role="group" aria-label="Card filter">
            <button
              type="button"
              className={`gv-filter-btn ${filter === 'all' ? 'is-active' : ''}`}
              onClick={() => setFilter('all')}
              aria-pressed={filter === 'all'}
              title="Show every node"
            >
              All
            </button>
            <button
              type="button"
              className={`gv-filter-btn ${filter === 'images' ? 'is-active' : ''}`}
              onClick={() => setFilter('images')}
              aria-pressed={filter === 'images'}
              title="Show only nodes with an image"
            >
              With images
              <span className="gv-filter-count">{imageCount}</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => onSwitchView?.('canvas')}
            className="gv-canvas-btn"
            title="Switch to the wobbly spatial view"
          >
            <span aria-hidden>🧠</span>
            Open Canvas
          </button>
        </div>
      </div>

      {/* ---- Grid ---- */}
      <div className="gv-scroll">
        {isEmpty ? (
          <div className="gv-empty">
            <div className="gv-empty-icon" aria-hidden>
              🖼
            </div>
            <h3>Nothing to show yet</h3>
            <p>
              {data.rootId
                ? 'This map has no nodes yet. Add one on the canvas and it will appear here.'
                : 'This map is empty. Add a node on the canvas to start your moodboard.'}
            </p>
          </div>
        ) : cards.length === 0 ? (
          <div className="gv-empty">
            <div className="gv-empty-icon" aria-hidden>
              🖼
            </div>
            <h3>No image cards</h3>
            <p>
              None of these nodes have an image yet. Switch back to{' '}
              <button
                type="button"
                className="gv-inline-btn"
                onClick={() => setFilter('all')}
              >
                All
              </button>{' '}
              to see every node.
            </p>
          </div>
        ) : (
          <ul className="gv-grid" role="list">
            {cards.map((node) => {
              const colorIdx = node.colorIdx ?? 0;
              const accent = ACCENT_PALETTE[colorIdx % ACCENT_PALETTE.length];
              const imgKey = `${node.id}::${node.imageUrl ?? ''}`;
              const hasImage = !!node.imageUrl && !failedImages.has(imgKey);
              const note = node.note?.trim();
              const isDone = !!node.done;
              const label = node.label || 'Untitled';
              return (
                <li key={node.id} className="gv-cell" role="listitem">
                  <button
                    type="button"
                    className={[
                      'gv-card',
                      hasImage ? 'has-image' : 'text-card',
                      isDone ? 'is-done' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ ['--gv-accent' as string]: accent }}
                    onClick={() => setDetailNodeId(node.id)}
                    aria-label={`Open details for ${label}${
                      isDone ? ' (completed)' : ''
                    }`}
                    title={note || label}
                  >
                    {hasImage ? (
                      <>
                        <div className="gv-card-media">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={node.imageUrl as string}
                            alt={label}
                            className="gv-card-img"
                            loading="lazy"
                            onError={() =>
                              setFailedImages((prev) => {
                                if (prev.has(imgKey)) return prev;
                                const next = new Set(prev);
                                next.add(imgKey);
                                return next;
                              })
                            }
                          />
                          {isDone && (
                            <span className="gv-done-badge" aria-hidden>
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="gv-card-strip">
                          <span className="gv-card-title">{label}</span>
                          {note && <span className="gv-card-note">{note}</span>}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="gv-card-head">
                          <span className="gv-card-title">{label}</span>
                          {isDone && (
                            <span className="gv-done-badge inline" aria-hidden>
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="gv-card-body">
                          {note ? (
                            <span className="gv-card-body-note">{note}</span>
                          ) : (
                            <span className="gv-card-body-empty">No note</span>
                          )}
                        </div>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {detailNode && (
        <NodeDetailPanel
          node={detailNode}
          readonly={readonly}
          isRoot={detailNode.id === data.rootId}
          accentColor={ACCENT_PALETTE[(detailNode.colorIdx ?? 0) % ACCENT_PALETTE.length]}
          onChange={applyNodeUpdate}
          onClose={() => setDetailNodeId(null)}
        />
      )}

      <style jsx>{`
        .gallery-view {
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
        .gv-toolbar {
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
        .gv-toolbar-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          min-width: 0;
        }
        .gv-title {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .gv-title-icon {
          font-size: 16px;
          line-height: 1;
          color: transparent;
          background: linear-gradient(135deg, #8b5cf6, #06b6d4);
          background-clip: text;
          -webkit-background-clip: text;
          font-weight: 700;
          flex-shrink: 0;
        }
        .gv-title h2 {
          font-size: 14px;
          font-weight: 600;
          margin: 0;
          letter-spacing: 0.2px;
          max-width: 320px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .gv-readonly-pill {
          font-size: 9px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          font-weight: 600;
          color: rgba(139, 92, 246, 0.9);
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.3);
          padding: 2px 7px;
          border-radius: 999px;
          flex-shrink: 0;
        }
        .gv-count {
          display: inline-flex;
          align-items: baseline;
          gap: 5px;
          font-size: 11px;
          color: var(--text-dim);
        }
        .gv-count-num {
          color: var(--text);
          font-weight: 600;
          font-size: 13px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-variant-numeric: tabular-nums;
        }
        .gv-count-lbl {
          opacity: 0.7;
        }
        .gv-toolbar-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .gv-filter {
          display: inline-flex;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 2px;
        }
        .gv-filter-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
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
        .gv-filter-btn:hover {
          color: var(--text);
        }
        .gv-filter-btn.is-active {
          color: var(--text);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
        .gv-filter-count {
          font-size: 9.5px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          color: var(--text-dim);
          background: rgba(255, 255, 255, 0.06);
          border-radius: 999px;
          padding: 0 5px;
          line-height: 1.5;
        }
        .gv-filter-btn.is-active .gv-filter-count {
          color: var(--text);
          background: rgba(139, 92, 246, 0.25);
        }
        .gv-canvas-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(
            135deg,
            rgba(236, 72, 153, 0.18),
            rgba(139, 92, 246, 0.18)
          );
          border: 1px solid rgba(236, 72, 153, 0.32);
          color: var(--text);
          font-size: 11px;
          font-weight: 500;
          padding: 5px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .gv-canvas-btn:hover {
          background: linear-gradient(
            135deg,
            rgba(236, 72, 153, 0.28),
            rgba(139, 92, 246, 0.28)
          );
          border-color: rgba(236, 72, 153, 0.5);
          transform: translateY(-1px);
        }

        /* ---- Scroll container ---- */
        .gv-scroll {
          flex: 1;
          min-height: 0;
          overflow: auto;
          padding: 22px;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
          background-size: 32px 32px;
          background-position: -1px -1px;
        }

        /* ---- Empty state ---- */
        .gv-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          text-align: center;
        }
        .gv-empty-icon {
          font-size: 48px;
          opacity: 0.25;
          margin-bottom: 12px;
        }
        .gv-empty h3 {
          font-size: 15px;
          font-weight: 600;
          margin: 0 0 6px;
        }
        .gv-empty p {
          font-size: 12px;
          color: var(--text-dim);
          margin: 0;
          max-width: 360px;
          line-height: 1.5;
        }
        .gv-inline-btn {
          background: transparent;
          border: none;
          color: var(--accent-1, #8b5cf6);
          font: inherit;
          font-weight: 600;
          padding: 0;
          cursor: pointer;
          text-decoration: underline;
        }

        /* ---- Grid ---- */
        .gv-grid {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 18px;
        }
        .gv-cell {
          display: flex;
          min-width: 0;
        }

        /* ---- Card (shared) ---- */
        .gv-card {
          position: relative;
          display: flex;
          flex-direction: column;
          width: 100%;
          text-align: left;
          background: var(--node-bg, rgba(15, 17, 36, 0.85));
          border: 1px solid var(--border);
          border-left: 3px solid var(--gv-accent);
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          padding: 0;
          font: inherit;
          color: var(--text);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          transition:
            transform 0.16s cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 0.16s ease,
            border-color 0.16s ease;
        }
        .gv-card::before {
          /* thin accent wash along the top, on top of the left rail */
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--gv-accent);
          opacity: 0.65;
          z-index: 2;
        }
        .gv-card:hover {
          transform: translateY(-3px);
          border-color: color-mix(in srgb, var(--gv-accent) 45%, var(--border));
          box-shadow:
            0 12px 28px rgba(0, 0, 0, 0.45),
            0 0 0 1px color-mix(in srgb, var(--gv-accent) 25%, transparent);
        }
        .gv-card:focus-visible {
          outline: none;
          border-color: color-mix(in srgb, var(--gv-accent) 60%, transparent);
          box-shadow:
            0 0 0 2px color-mix(in srgb, var(--gv-accent) 55%, transparent),
            0 12px 28px rgba(0, 0, 0, 0.45);
        }

        /* ---- Image card ---- */
        .gv-card-media {
          position: relative;
          width: 100%;
          height: 150px;
          /* Frame the image the way the canvas image node does: an ~8px reveal
             on the top + sides lets the card surface peek around the artwork,
             and the image rounds its top corners (the strip rounds the bottom). */
          padding: 8px 8px 0;
          background: transparent;
          overflow: hidden;
        }
        .gv-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          border-radius: 8px 8px 0 0;
        }
        .gv-card-strip {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 9px 13px 10px;
          /* Echo the canvas caption bar: a node-bg-2 surface with an
             accent-tinted hairline along the top. */
          background: color-mix(in srgb, var(--node-bg-2, #232649) 88%, black 6%);
          border-top: 1px solid color-mix(in srgb, var(--gv-accent) 30%, transparent);
        }

        /* ---- Text card ---- */
        .text-card .gv-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 10px 12px;
          background: color-mix(in srgb, var(--gv-accent) 16%, transparent);
          border-bottom: 1px solid
            color-mix(in srgb, var(--gv-accent) 28%, var(--border));
        }
        .text-card .gv-card-head .gv-card-title {
          font-weight: 600;
        }
        .gv-card-body {
          flex: 1;
          padding: 12px;
          min-height: 88px;
        }
        .gv-card-body-note {
          font-size: 12px;
          line-height: 1.5;
          color: var(--text-dim);
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .gv-card-body-empty {
          font-size: 12px;
          font-style: italic;
          color: var(--text-dim);
          opacity: 0.6;
        }

        /* ---- Titles / notes ---- */
        .gv-card-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          word-break: break-word;
        }
        .gv-card-note {
          font-size: 11px;
          color: var(--text-dim);
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ---- Done state ---- */
        .gv-card.is-done .gv-card-title {
          text-decoration: line-through;
          opacity: 0.55;
        }
        .gv-card.is-done {
          opacity: 0.82;
        }
        .gv-done-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: #fff;
          background: #22c55e;
          border-radius: 50%;
          box-shadow:
            0 0 0 2px rgba(4, 5, 12, 0.6),
            0 2px 6px rgba(0, 0, 0, 0.4);
          z-index: 3;
        }
        .gv-done-badge.inline {
          position: static;
          width: 18px;
          height: 18px;
          font-size: 11px;
          flex-shrink: 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
}
