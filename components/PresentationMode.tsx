'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MindMapData } from '@/lib/types';

type Slide = { id: string; label: string; note: string; depth: number; crumbs: string[] };

// Flatten a map into a depth-first slide list. Each slide is one node, with a
// breadcrumb of its ancestors so the audience keeps their place.
function buildSlides(data: MindMapData | null): Slide[] {
  if (!data || !data.rootId || !data.nodes[data.rootId]) return [];
  const slides: Slide[] = [];
  const walk = (id: string, depth: number, crumbs: string[]) => {
    const n = data.nodes[id];
    if (!n) return;
    slides.push({ id, label: n.label || '(untitled)', note: n.note || '', depth, crumbs });
    for (const cid of data.childIndex[id] || []) {
      walk(cid, depth + 1, [...crumbs, n.label || '(untitled)']);
    }
  };
  walk(data.rootId, 0, []);
  return slides;
}

const ACCENTS = ['#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#10b981'];

export default function PresentationMode({
  open,
  data,
  title,
  onClose,
}: {
  open: boolean;
  data: MindMapData | null;
  title: string;
  onClose: () => void;
}) {
  const slides = useMemo(() => buildSlides(data), [data]);
  const [i, setI] = useState(0);
  const [narrate, setNarrate] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const next = useCallback(() => setI((n) => Math.min(n + 1, slides.length - 1)), [slides.length]);
  const prev = useCallback(() => setI((n) => Math.max(n - 1, 0)), []);

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  // Narrate the current slide's label via the existing /api/tts endpoint.
  useEffect(() => {
    if (!open || !narrate || slides.length === 0) return;
    const label = slides[i]?.label;
    if (!label) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: label }),
        });
        if (!res.ok || cancelled) return;
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        const url = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }));
        if (audioRef.current) {
          audioRef.current.src = url;
          void audioRef.current.play().catch(() => {});
        }
      } catch {
        /* narration is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [i, narrate, open, slides]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, next, prev, onClose]);

  if (!open) return null;

  const slide = slides[i];
  const accent = ACCENTS[(slide?.depth ?? 0) % ACCENTS.length];
  const progress = slides.length ? ((i + 1) / slides.length) * 100 : 0;

  return (
    <div className="pm-root" role="dialog" aria-modal="true" aria-label="Presentation">
      <audio ref={audioRef} hidden />

      <div className="pm-bar" style={{ width: `${progress}%`, background: accent }} />

      <button className="pm-close" onClick={onClose} aria-label="Exit presentation (Esc)">✕</button>
      <button
        className={`pm-narrate${narrate ? ' on' : ''}`}
        onClick={() => setNarrate((n) => !n)}
        title="Toggle Squishy narration"
      >
        {narrate ? '🔊 Narrating' : '🔇 Narrate'}
      </button>

      {slides.length === 0 ? (
        <div className="pm-stage"><div className="pm-empty">This map is empty.</div></div>
      ) : (
        <div className="pm-stage" onClick={next}>
          {slide.crumbs.length > 0 && (
            <div className="pm-crumbs">{slide.crumbs.join('  ›  ')}</div>
          )}
          <h1 className="pm-title" style={{ color: slide.depth === 0 ? undefined : accent }}>
            {slide.label}
          </h1>
          {slide.note && <p className="pm-note">{slide.note}</p>}
        </div>
      )}

      <div className="pm-foot">
        <button className="pm-nav" onClick={prev} disabled={i === 0} aria-label="Previous">←</button>
        <span className="pm-count">{slides.length ? `${i + 1} / ${slides.length}` : '—'}</span>
        <button className="pm-nav" onClick={next} disabled={i >= slides.length - 1} aria-label="Next">→</button>
        <span className="pm-hint">{title}</span>
      </div>

      <style jsx>{`
        .pm-root {
          position: fixed;
          inset: 0;
          z-index: 300;
          background:
            radial-gradient(circle at 25% 15%, #15172e 0%, #0a0b16 55%),
            radial-gradient(circle at 80% 90%, #1a0b2e 0%, #0a0b16 55%);
          color: #e8eaff;
          display: flex;
          flex-direction: column;
          animation: pm-fade 0.2s ease;
        }
        @keyframes pm-fade { from { opacity: 0; } to { opacity: 1; } }
        .pm-bar {
          position: absolute;
          top: 0;
          left: 0;
          height: 3px;
          transition: width 0.3s ease;
          box-shadow: 0 0 12px currentColor;
        }
        .pm-close, .pm-narrate {
          position: absolute;
          top: 18px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #e8eaff;
          border-radius: 999px;
          cursor: pointer;
          z-index: 2;
          transition: background 0.15s ease;
        }
        .pm-close { right: 18px; width: 38px; height: 38px; font-size: 15px; }
        .pm-narrate { right: 66px; height: 38px; padding: 0 14px; font-size: 13px; }
        .pm-close:hover, .pm-narrate:hover { background: rgba(255, 255, 255, 0.14); }
        .pm-narrate.on { border-color: rgba(139, 92, 246, 0.6); background: rgba(139, 92, 246, 0.2); }
        .pm-stage {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 8vh 8vw;
          cursor: pointer;
          gap: 24px;
        }
        .pm-crumbs {
          font-size: clamp(13px, 1.6vw, 18px);
          color: rgba(232, 234, 255, 0.45);
          letter-spacing: 0.5px;
        }
        .pm-title {
          font-size: clamp(34px, 7vw, 88px);
          font-weight: 800;
          line-height: 1.08;
          letter-spacing: -0.02em;
          margin: 0;
          max-width: 18ch;
          animation: pm-rise 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pm-note {
          font-size: clamp(16px, 2.4vw, 26px);
          line-height: 1.5;
          color: rgba(232, 234, 255, 0.7);
          max-width: 30ch;
          margin: 0;
          animation: pm-rise 0.45s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes pm-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .pm-empty { font-size: 24px; color: rgba(232, 234, 255, 0.5); }
        .pm-foot {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 20px;
          position: relative;
        }
        .pm-nav {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #e8eaff;
          font-size: 18px;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .pm-nav:hover:not(:disabled) { background: rgba(255, 255, 255, 0.14); }
        .pm-nav:disabled { opacity: 0.3; cursor: default; }
        .pm-count {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 14px;
          color: rgba(232, 234, 255, 0.6);
          min-width: 72px;
          text-align: center;
        }
        .pm-hint {
          position: absolute;
          right: 20px;
          font-size: 13px;
          color: rgba(232, 234, 255, 0.35);
          max-width: 30vw;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        @media (max-width: 640px) { .pm-hint { display: none; } }
      `}</style>
    </div>
  );
}
