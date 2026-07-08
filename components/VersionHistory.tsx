'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Version = {
  id: string;
  label: string | null;
  kind: string;
  created_at: string;
};

function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

const KIND_LABEL: Record<string, string> = {
  manual: 'Saved',
  auto: 'Auto',
  'pre-restore': 'Before restore',
};

export default function VersionHistory({
  open,
  onClose,
  mindmapId,
}: {
  open: boolean;
  onClose: () => void;
  mindmapId: string;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/mindmaps/${mindmapId}/versions`);
      const json = await res.json();
      setVersions(json.versions || []);
      setAvailable(json.available !== false);
    } catch {
      setError('Could not load versions.');
    } finally {
      setLoading(false);
    }
  }, [mindmapId]);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function saveNow() {
    setBusy('save');
    setError(null);
    try {
      const res = await fetch(`/api/mindmaps/${mindmapId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'manual' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.detail || 'Could not save a version.');
      } else {
        await refresh();
      }
    } catch {
      setError('Could not save a version.');
    } finally {
      setBusy(null);
    }
  }

  function handleRestoreClick(v: Version) {
    if (confirmingId === v.id) {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmingId(null);
      restore(v);
      return;
    }
    setConfirmingId(v.id);
    confirmTimerRef.current = setTimeout(() => {
      setConfirmingId(null);
      confirmTimerRef.current = null;
    }, 3000);
  }

  async function restore(v: Version) {
    setBusy(v.id);
    setError(null);
    try {
      const res = await fetch(`/api/mindmaps/${mindmapId}/versions/${v.id}/restore`, { method: 'POST' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.detail || 'Restore failed.');
        setBusy(null);
        return;
      }
      window.location.reload();
    } catch {
      setError('Restore failed.');
      setBusy(null);
    }
  }

  if (!open) return null;

  return (
    <div className="vh-backdrop" onMouseDown={onClose} role="dialog" aria-modal="true" aria-label="Version history">
      <div className="vh-panel" onMouseDown={(e) => e.stopPropagation()}>
        <header className="vh-head">
          <h2>Version history</h2>
          <button className="vh-close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="vh-actions">
          <button className="vh-save" onClick={saveNow} disabled={busy === 'save'}>
            {busy === 'save' ? 'Saving…' : '＋ Save a version'}
          </button>
          <span className="vh-hint">Snapshots your map right now so you can wind back later.</span>
        </div>

        {error && <div className="vh-err">{error}</div>}
        {!available && !error && (
          <div className="vh-err">Version history isn’t set up on this project yet.</div>
        )}

        <div className="vh-list">
          {loading ? (
            <div className="vh-empty flex items-center justify-center gap-2"><span className="spin" /> Loading…</div>
          ) : versions.length === 0 ? (
            <div className="vh-empty">No versions yet. Save one to start your history.</div>
          ) : (
            versions.map((v) => (
              <div key={v.id} className="vh-item">
                <div className="vh-item-main">
                  <span className={`vh-badge vh-${v.kind}`}>{KIND_LABEL[v.kind] || v.kind}</span>
                  <span className="vh-time">{relTime(v.created_at)}</span>
                  {v.label && <span className="vh-label">{v.label}</span>}
                </div>
                <button
                  className={`vh-restore${confirmingId === v.id ? ' vh-restore-confirm' : ''}`}
                  onClick={() => handleRestoreClick(v)}
                  disabled={busy === v.id}
                >
                  {busy === v.id ? '…' : confirmingId === v.id ? 'Really restore?' : 'Restore'}
                </button>
              </div>
            ))
          )}
        </div>

        <style jsx>{`
          .vh-backdrop {
            position: absolute;
            inset: 0;
            z-index: 60;
            background: rgba(4, 5, 12, 0.5);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            display: flex;
            justify-content: flex-end;
            animation: vh-fade 0.16s ease;
          }
          @keyframes vh-fade { from { opacity: 0; } to { opacity: 1; } }
          .vh-panel {
            width: min(380px, 100%);
            background: linear-gradient(180deg, rgba(15, 17, 36, 0.97), rgba(10, 11, 22, 0.98));
            border-left: 1px solid rgba(255, 255, 255, 0.12);
            box-shadow: -28px 0 60px rgba(0, 0, 0, 0.55);
            display: flex;
            flex-direction: column;
            color: #e8eaff;
            animation: vh-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          }
          @keyframes vh-in { from { transform: translateX(28px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          .vh-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 18px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }
          .vh-head h2 { font-size: 16px; font-weight: 600; margin: 0; }
          .vh-close {
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: rgba(232, 234, 255, 0.7);
            width: 28px; height: 28px; border-radius: 7px; cursor: pointer;
          }
          .vh-close:hover { background: rgba(255, 255, 255, 0.06); color: #fff; }
          .vh-actions { padding: 14px 18px 6px; }
          .vh-save {
            width: 100%;
            background: linear-gradient(135deg, #8b5cf6, #ec4899);
            color: #fff; border: none; border-radius: 10px;
            padding: 10px; font-size: 14px; font-weight: 600; cursor: pointer;
            box-shadow: 0 6px 18px rgba(139, 92, 246, 0.3);
          }
          .vh-save:disabled { opacity: 0.6; cursor: default; }
          .vh-hint { display: block; font-size: 11px; color: rgba(232, 234, 255, 0.45); margin-top: 8px; }
          .vh-err { margin: 8px 18px; padding: 8px 10px; font-size: 12px; color: #fca5a5; background: rgba(239, 68, 68, 0.1); border-radius: 8px; }
          .vh-list { flex: 1; overflow-y: auto; padding: 8px 12px 16px; }
          .vh-empty { padding: 24px 12px; text-align: center; color: rgba(232, 234, 255, 0.5); font-size: 13px; }
          .vh-item {
            display: flex; align-items: center; justify-content: space-between;
            gap: 10px; padding: 10px 8px; border-radius: 9px;
          }
          .vh-item:hover { background: rgba(255, 255, 255, 0.04); }
          .vh-item-main { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
          .vh-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 7px; border-radius: 999px; }
          .vh-manual { color: #c4b5fd; background: rgba(139, 92, 246, 0.16); }
          .vh-auto { color: #a5f3fc; background: rgba(6, 182, 212, 0.14); }
          .vh-pre-restore { color: #fcd34d; background: rgba(245, 158, 11, 0.14); }
          .vh-time { font-size: 13px; color: #e8eaff; }
          .vh-label { font-size: 12px; color: rgba(232, 234, 255, 0.55); }
          .vh-restore {
            background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12);
            color: #e8eaff; border-radius: 8px; padding: 5px 12px; font-size: 12px; cursor: pointer; flex-shrink: 0;
          }
          .vh-restore:hover:not(:disabled) { background: rgba(255, 255, 255, 0.12); }
          .vh-restore:disabled { opacity: 0.5; cursor: default; }
          .vh-restore-confirm { background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.35); color: #fca5a5; }
          .vh-restore-confirm:hover:not(:disabled) { background: rgba(239, 68, 68, 0.3); }
        `}</style>
      </div>
    </div>
  );
}
