'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const PRESETS = [5, 15, 25]; // minutes

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

// A floating workshop timer — Pomodoro-style countdown for running an ideation
// session on a shared map. Pure client, no persistence. Chimes gently at zero.
export default function SessionTimer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [total, setTotal] = useState(PRESETS[1] * 60);
  const [left, setLeft] = useState(PRESETS[1] * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const chime = useCallback(() => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      [880, 1175, 1568].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = f;
        o.type = 'sine';
        o.connect(g);
        g.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.18;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        o.start(t);
        o.stop(t + 0.5);
      });
      setTimeout(() => ctx.close().catch(() => {}), 1500);
    } catch {
      /* audio is best-effort */
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    tick.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          setRunning(false);
          setDone(true);
          chime();
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [running, chime]);

  function setPreset(min: number) {
    setRunning(false);
    setDone(false);
    setTotal(min * 60);
    setLeft(min * 60);
  }
  function reset() {
    setRunning(false);
    setDone(false);
    setLeft(total);
  }

  if (!open) return null;

  const pct = total > 0 ? ((total - left) / total) * 100 : 0;
  const accentColor = done ? '#10b981' : left <= 10 ? '#ef4444' : left <= 60 ? '#f59e0b' : '#8b5cf6';

  return (
    <div className={`st-root${done ? ' done' : ''}`} role="timer" aria-label="Session timer">
      <div className="st-ring" style={{ background: `conic-gradient(${accentColor} ${pct}%, rgba(255,255,255,0.1) ${pct}%)` }}>
        <span className="st-time">{done ? "Time's up" : fmt(left)}</span>
      </div>
      <div className="st-controls">
        <div className="st-presets">
          {PRESETS.map((m) => (
            <button key={m} className={`st-preset${total === m * 60 ? ' on' : ''}`} onClick={() => setPreset(m)}>
              {m}m
            </button>
          ))}
        </div>
        <div className="st-row">
          <button className="st-btn primary" onClick={() => { setDone(false); setRunning((r) => !r); }}>
            {running ? 'Pause' : left === 0 ? 'Restart' : 'Start'}
          </button>
          <button className="st-btn" onClick={reset}>Reset</button>
          <button className="st-btn" onClick={onClose} aria-label="Close timer">✕</button>
        </div>
      </div>

      <style jsx>{`
        .st-root {
          position: fixed;
          top: 64px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 70;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          border-radius: 16px;
          background: rgba(15, 17, 36, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 18px 50px -12px rgba(0, 0, 0, 0.6);
          color: #e8eaff;
          --st-accent: #8b5cf6;
          animation: st-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes st-in { from { opacity: 0; transform: translate(-50%, -8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .st-root.done { --st-accent: #10b981; animation: st-pop 0.5s ease; }
        @keyframes st-pop { 0%,100% { box-shadow: 0 18px 50px -12px rgba(0,0,0,0.6); } 40% { box-shadow: 0 0 0 4px rgba(16,185,129,0.4), 0 18px 50px -12px rgba(0,0,0,0.6); } }
        .st-ring {
          width: 56px; height: 56px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .st-time {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 12px; font-weight: 600; color: #e8eaff;
          background: #0f1124; border-radius: 50%;
          width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
          text-align: center; line-height: 1.1;
        }
        .st-controls { display: flex; flex-direction: column; gap: 8px; }
        .st-presets { display: flex; gap: 4px; }
        .st-preset {
          font-size: 11px; padding: 3px 8px; border-radius: 6px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          color: rgba(232,234,255,0.7); cursor: pointer;
        }
        .st-preset.on { background: color-mix(in srgb, var(--st-accent) 22%, transparent); color: #fff; border-color: color-mix(in srgb, var(--st-accent) 50%, transparent); }
        .st-row { display: flex; gap: 6px; }
        .st-btn {
          font-size: 12px; padding: 5px 12px; border-radius: 8px;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
          color: #e8eaff; cursor: pointer;
        }
        .st-btn:hover { background: rgba(255,255,255,0.12); }
        .st-btn.primary { background: linear-gradient(135deg, #8b5cf6, #ec4899); border-color: transparent; font-weight: 600; }
      `}</style>
    </div>
  );
}
