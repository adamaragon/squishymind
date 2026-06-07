'use client';

import { useMemo, useState } from 'react';
import { dispatchCanvasCommand } from '@/lib/canvas-bus';

// --- tiny colour helpers ---
function hexToHsl(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) => Math.round((v + mm) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

// Five harmonious accents from one primary: same S/L, hues fanned out.
function derive(primary: string): string[] {
  const [h, s0, l0] = hexToHsl(primary);
  const s = Math.min(0.85, Math.max(0.55, s0));
  const l = Math.min(0.7, Math.max(0.55, l0));
  return [0, 40, 80, 160, 240].map((d) => hslToHex(h + d, s, l));
}

export default function ThemePicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [primary, setPrimary] = useState('#8b5cf6');
  const palette = useMemo(() => derive(primary), [primary]);

  if (!open) return null;

  return (
    <div className="tp-backdrop" onMouseDown={onClose} role="dialog" aria-modal="true" aria-label="Custom colours">
      <div className="tp-panel" onMouseDown={(e) => e.stopPropagation()}>
        <header className="tp-head">
          <h2>Custom colours</h2>
          <button className="tp-close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <label className="tp-pick">
          <span>Pick a primary accent</span>
          <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} />
        </label>

        <div className="tp-swatches" aria-hidden>
          {palette.map((c, i) => (
            <div key={i} className="tp-sw" style={{ background: c }} title={c} />
          ))}
        </div>
        <p className="tp-hint">A harmonious five-colour palette, fanned from your pick. Applies to the canvas now.</p>

        <div className="tp-actions">
          <button
            className="tp-apply"
            onClick={() => { void dispatchCanvasCommand({ type: 'apply_custom_theme', accents: palette }); }}
          >
            Apply palette
          </button>
          <button
            className="tp-reset"
            onClick={() => { void dispatchCanvasCommand({ type: 'clear_custom_theme' }); }}
          >
            Reset to theme
          </button>
        </div>

        <style jsx>{`
          .tp-backdrop {
            position: absolute; inset: 0; z-index: 62;
            background: rgba(4, 5, 12, 0.5);
            backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            animation: tp-fade 0.16s ease;
          }
          @keyframes tp-fade { from { opacity: 0; } to { opacity: 1; } }
          .tp-panel {
            width: min(380px, 92vw);
            background: linear-gradient(180deg, rgba(20, 22, 44, 0.98), rgba(12, 13, 26, 0.99));
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 16px;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 30px 80px -16px rgba(0,0,0,0.7);
            padding: 18px;
            color: #e8eaff;
            animation: tp-in 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          }
          @keyframes tp-in { from { transform: translateY(-8px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
          .tp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
          .tp-head h2 { font-size: 16px; font-weight: 600; margin: 0; }
          .tp-close { background: transparent; border: 1px solid rgba(255,255,255,0.12); color: rgba(232,234,255,0.7); width: 28px; height: 28px; border-radius: 7px; cursor: pointer; }
          .tp-close:hover { background: rgba(255,255,255,0.06); color: #fff; }
          .tp-pick { display: flex; align-items: center; justify-content: space-between; font-size: 14px; margin-bottom: 16px; }
          .tp-pick input { width: 52px; height: 36px; border: 1px solid rgba(255,255,255,0.14); border-radius: 8px; background: transparent; cursor: pointer; }
          .tp-swatches { display: flex; gap: 8px; }
          .tp-sw { flex: 1; height: 44px; border-radius: 10px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12); }
          .tp-hint { font-size: 12px; color: rgba(232,234,255,0.5); margin: 12px 0 16px; line-height: 1.5; }
          .tp-actions { display: flex; gap: 8px; }
          .tp-apply { flex: 1; background: linear-gradient(135deg, #8b5cf6, #ec4899); color: #fff; border: none; border-radius: 10px; padding: 10px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 6px 18px rgba(139,92,246,0.3); }
          .tp-reset { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #e8eaff; border-radius: 10px; padding: 10px 14px; font-size: 13px; cursor: pointer; }
          .tp-reset:hover { background: rgba(255,255,255,0.12); }
        `}</style>
      </div>
    </div>
  );
}
