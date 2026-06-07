'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dispatchCanvasCommand, type CanvasCommand } from '@/lib/canvas-bus';

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  group: 'Squishy AI' | 'View' | 'Map' | 'Export' | 'Theme';
  keywords?: string;
  /** Edit-only commands are hidden on read-only maps. */
  editOnly?: boolean;
  /** AI commands run async with a spinner instead of closing immediately. */
  ai?: 'summarize' | 'gaps' | 'plan';
  run: () => void;
};

type Result =
  | { kind: 'summary'; text: string }
  | { kind: 'done'; text: string }
  | { kind: 'error'; text: string };

export default function CommandPalette({
  canEdit = true,
  canVersion = false,
}: {
  canEdit?: boolean;
  canVersion?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const send = useCallback((cmd: CanvasCommand) => {
    void dispatchCanvasCommand(cmd);
  }, []);

  const commands = useMemo<Cmd[]>(
    () => [
      // Squishy AI (run async; handled specially in `choose`)
      { id: 'ai-sum', label: 'Summarize this map', group: 'Squishy AI', keywords: 'tldr overview brief squishy ai recap', ai: 'summarize', run: () => {} },
      { id: 'ai-gaps', label: "Find what's missing", group: 'Squishy AI', keywords: 'gap analysis blind spots squishy ai review critique', editOnly: true, ai: 'gaps', run: () => {} },
      { id: 'ai-plan', label: 'Expand into an action plan', group: 'Squishy AI', keywords: 'steps todo plan squishy ai turn into', editOnly: true, ai: 'plan', run: () => {} },
      // View
      { id: 'view-canvas', label: 'Switch to Canvas view', group: 'View', keywords: 'spatial map', run: () => send({ type: 'switch_view', mode: 'canvas' }) },
      { id: 'view-outline', label: 'Switch to Outline view', group: 'View', keywords: 'list document', run: () => send({ type: 'switch_view', mode: 'outline' }) },
      { id: 'view-tree', label: 'Switch to Tree view', group: 'View', keywords: 'hierarchy', run: () => send({ type: 'switch_view', mode: 'tree' }) },
      { id: 'view-table', label: 'Switch to Table view', group: 'View', keywords: 'rows columns grid', run: () => send({ type: 'switch_view', mode: 'table' }) },
      // Map actions
      { id: 'present', label: 'Present (full screen)', group: 'Map', keywords: 'presentation slideshow demo walkthrough narrate', run: () => send({ type: 'present' }) },
      ...(canVersion
        ? [{ id: 'versions', label: 'Version history…', group: 'Map' as const, keywords: 'snapshot restore undo backup history save version', run: () => send({ type: 'open_versions' }) }]
        : []),
      { id: 'focus', label: 'Toggle Focus mode', hint: 'S', group: 'Map', keywords: 'spotlight dim branch concentrate', run: () => send({ type: 'toggle_focus_mode' }) },
      { id: 'done', label: 'Toggle done on selected node', hint: 'X', group: 'Map', keywords: 'task complete check off finish', editOnly: true, run: () => send({ type: 'toggle_done' }) },
      { id: 'fit', label: 'Fit map to screen', hint: 'F', group: 'Map', keywords: 'zoom center', run: () => send({ type: 'fit_to_screen' }) },
      { id: 'timer', label: 'Session timer (workshop)', group: 'Map', keywords: 'pomodoro countdown clock timebox meeting', run: () => send({ type: 'toggle_timer' }) },
      { id: 'reactions', label: 'Live reactions (workshop)', group: 'Map', keywords: 'emoji react vote feedback applause workshop live', run: () => send({ type: 'toggle_reactions' }) },
      // Export / import
      { id: 'exp-json', label: 'Export as JSON', group: 'Export', keywords: 'download backup', run: () => send({ type: 'export_map', format: 'json' }) },
      { id: 'exp-png', label: 'Export as PNG image', group: 'Export', keywords: 'download picture', run: () => send({ type: 'export_map', format: 'png' }) },
      { id: 'exp-pdf', label: 'Export as PDF', group: 'Export', keywords: 'download print', run: () => send({ type: 'export_map', format: 'pdf' }) },
      { id: 'exp-doc', label: 'Export as document (Markdown)', group: 'Export', keywords: 'download md outline text', run: () => send({ type: 'export_map', format: 'doc' }) },
      { id: 'import', label: 'Import JSON…', group: 'Export', keywords: 'upload restore', editOnly: true, run: () => send({ type: 'open_import' }) },
      // Theme
      { id: 'th-aurora', label: 'Theme: Aurora (dark)', group: 'Theme', run: () => send({ type: 'switch_theme', theme: 'aurora' }) },
      { id: 'th-sunrise', label: 'Theme: Sunrise (light)', group: 'Theme', run: () => send({ type: 'switch_theme', theme: 'sunrise' }) },
      { id: 'th-forest', label: 'Theme: Forest', group: 'Theme', run: () => send({ type: 'switch_theme', theme: 'forest' }) },
      { id: 'th-mono', label: 'Theme: Mono', group: 'Theme', run: () => send({ type: 'switch_theme', theme: 'mono' }) },
      { id: 'th-nebula', label: 'Theme: Nebula (cool)', group: 'Theme', run: () => send({ type: 'switch_theme', theme: 'nebula' }) },
      { id: 'th-ember', label: 'Theme: Ember (warm)', group: 'Theme', run: () => send({ type: 'switch_theme', theme: 'ember' }) },
      { id: 'th-custom', label: 'Custom colours…', group: 'Theme', keywords: 'palette accent pick colour color brand', run: () => send({ type: 'open_theme_picker' }) },
    ],
    [send, canVersion],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = commands.filter((c) => canEdit || !c.editOnly);
    if (!q) return pool;
    return pool.filter(
      (c) => (c.label + ' ' + c.group + ' ' + (c.keywords || '')).toLowerCase().includes(q),
    );
  }, [commands, query, canEdit]);

  // Global ⌘K / Ctrl+K to open, plus a custom event so a visible button can
  // open it (the shortcut alone isn't discoverable).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') {
        // Close from any sub-state (the search input has its own handler, but
        // the result/busy views don't render it).
        setOpen(false);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('squishymind:open-command-palette', onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('squishymind:open-command-palette', onOpenEvent);
    };
  }, []);

  // Reset + focus on open.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setBusy(null);
      setResult(null);
      // focus after paint
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Keep active index in range as results change.
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, results.length - 1)));
  }, [results.length]);

  const choose = useCallback(
    async (cmd: Cmd | undefined) => {
      if (!cmd) return;
      if (cmd.ai) {
        // Stay open, show a spinner, await the canvas's AI result.
        setBusy(cmd.label);
        setResult(null);
        const r = await dispatchCanvasCommand({ type: 'ai_assist', action: cmd.ai });
        setBusy(null);
        if (!r.success) {
          setResult({ kind: 'error', text: r.error || 'Squishy could not help with that.' });
          return;
        }
        const data = (r.data || {}) as { summary?: string; added?: number; container?: string };
        if (cmd.ai === 'summarize') {
          setResult({ kind: 'summary', text: data.summary || '(no summary)' });
        } else {
          setResult({
            kind: 'done',
            text: `Added ${data.added ?? ''} ${cmd.ai === 'gaps' ? 'gap' : 'plan'} item${data.added === 1 ? '' : 's'} as a new “${data.container || ''}” branch.`,
          });
          // brief confirmation, then close
          setTimeout(() => setOpen(false), 1400);
        }
        return;
      }
      setOpen(false);
      // let the overlay unmount before firing (some actions open file pickers)
      requestAnimationFrame(() => cmd.run());
    },
    [],
  );

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    }
  }

  // Scroll active item into view.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  if (!open) return null;

  let lastGroup = '';

  return (
    <div className="cmdk-backdrop" onMouseDown={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="cmdk-panel" onMouseDown={(e) => e.stopPropagation()}>
        {busy ? (
          <div className="cmdk-status">
            <span className="cmdk-spin" aria-hidden />
            <span>Squishy is thinking… <em>{busy}</em></span>
          </div>
        ) : result ? (
          <div className="cmdk-result">
            {result.kind === 'summary' && (
              <>
                <div className="cmdk-result-head">Summary</div>
                <p className="cmdk-summary">{result.text}</p>
                <div className="cmdk-result-actions">
                  <button
                    type="button"
                    className="cmdk-btn"
                    onClick={() => navigator.clipboard?.writeText(result.text)}
                  >
                    Copy
                  </button>
                  <button type="button" className="cmdk-btn" onClick={() => setResult(null)}>
                    Back
                  </button>
                </div>
              </>
            )}
            {result.kind === 'done' && <div className="cmdk-done">✦ {result.text}</div>}
            {result.kind === 'error' && (
              <>
                <div className="cmdk-err">{result.text}</div>
                <div className="cmdk-result-actions">
                  <button type="button" className="cmdk-btn" onClick={() => setResult(null)}>
                    Back
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              className="cmdk-input"
              placeholder="Type a command…  (try “summarize”, “focus”, “export”)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKey}
              aria-label="Command search"
            />
            <div className="cmdk-list" ref={listRef}>
              {results.length === 0 && <div className="cmdk-empty">No commands match “{query}”.</div>}
              {results.map((c, i) => {
                const showGroup = c.group !== lastGroup;
                lastGroup = c.group;
                return (
                  <div key={c.id}>
                    {showGroup && <div className="cmdk-group">{c.group}</div>}
                    <button
                      type="button"
                      data-idx={i}
                      className={`cmdk-item${i === active ? ' active' : ''}`}
                      onMouseMove={() => setActive(i)}
                      onClick={() => choose(c)}
                    >
                      <span className="cmdk-label">{c.label}</span>
                      {c.hint && <kbd className="cmdk-kbd">{c.hint}</kbd>}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="cmdk-foot">
              <span><kbd className="cmdk-kbd">↑</kbd><kbd className="cmdk-kbd">↓</kbd> navigate</span>
              <span><kbd className="cmdk-kbd">↵</kbd> run</span>
              <span><kbd className="cmdk-kbd">esc</kbd> close</span>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .cmdk-backdrop {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(4, 5, 12, 0.5);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 12vh;
          animation: cmdk-fade 0.14s ease;
        }
        @keyframes cmdk-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .cmdk-panel {
          width: min(560px, 92vw);
          max-height: 64vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(180deg, rgba(20, 22, 44, 0.98), rgba(12, 13, 26, 0.99));
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            0 30px 80px -16px rgba(0, 0, 0, 0.7),
            0 0 0 1px rgba(139, 92, 246, 0.12);
          overflow: hidden;
          animation: cmdk-in 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          color: #e8eaff;
        }
        @keyframes cmdk-in {
          from { transform: translateY(-10px) scale(0.98); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .cmdk-input {
          appearance: none;
          border: none;
          outline: none;
          background: transparent;
          color: #e8eaff;
          font-size: 16px;
          padding: 17px 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .cmdk-input::placeholder { color: rgba(232, 234, 255, 0.4); }
        .cmdk-list {
          overflow-y: auto;
          padding: 6px;
        }
        .cmdk-empty {
          padding: 22px 14px;
          text-align: center;
          color: rgba(232, 234, 255, 0.5);
          font-size: 14px;
        }
        .cmdk-group {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: rgba(232, 234, 255, 0.4);
          padding: 10px 12px 5px;
        }
        .cmdk-item {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border: none;
          background: transparent;
          color: #e8eaff;
          font-size: 14px;
          text-align: left;
          border-radius: 9px;
          cursor: pointer;
        }
        .cmdk-item.active {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.28), rgba(236, 72, 153, 0.18));
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }
        .cmdk-label { flex: 1; }
        .cmdk-kbd {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11px;
          color: rgba(232, 234, 255, 0.7);
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 5px;
          padding: 1px 6px;
          min-width: 18px;
          text-align: center;
        }
        .cmdk-foot {
          display: flex;
          gap: 16px;
          padding: 9px 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 11px;
          color: rgba(232, 234, 255, 0.45);
        }
        .cmdk-foot span { display: inline-flex; align-items: center; gap: 5px; }

        /* ---- AI: busy + result states ---- */
        .cmdk-status {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 22px 20px;
          font-size: 15px;
          color: #e8eaff;
        }
        .cmdk-status em { color: rgba(232, 234, 255, 0.6); font-style: normal; }
        .cmdk-spin {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid rgba(139, 92, 246, 0.25);
          border-top-color: #c4b5fd;
          animation: cmdk-spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes cmdk-spin {
          to { transform: rotate(360deg); }
        }
        .cmdk-result { padding: 18px 20px; }
        .cmdk-result-head {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: rgba(232, 234, 255, 0.4);
          margin-bottom: 8px;
        }
        .cmdk-summary {
          margin: 0 0 14px;
          font-size: 14.5px;
          line-height: 1.6;
          color: #e8eaff;
          max-height: 40vh;
          overflow-y: auto;
          white-space: pre-wrap;
        }
        .cmdk-result-actions { display: flex; gap: 8px; }
        .cmdk-btn {
          font-size: 13px;
          color: #e8eaff;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 6px 14px;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .cmdk-btn:hover { background: rgba(255, 255, 255, 0.12); }
        .cmdk-done {
          padding: 22px 20px;
          font-size: 14.5px;
          color: #a7f3d0;
          line-height: 1.5;
        }
        .cmdk-err {
          padding: 18px 20px 12px;
          font-size: 14px;
          color: #fca5a5;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
