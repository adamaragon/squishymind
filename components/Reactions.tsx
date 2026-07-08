'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const EMOJI = ['👍', '❤️', '🎉', '😂', '💡', '🔥', '👀', '🧠'];

type Float = { key: number; emoji: string; left: number; drift: number };

// Live workshop reactions: a toggleable emoji bar that broadcasts over a
// dedicated Supabase realtime channel (map:<id>:reactions). Ephemeral — no DB.
// Each reaction floats up the screen for everyone who has the bar open.
export default function Reactions({
  open,
  onClose,
  mindmapId,
}: {
  open: boolean;
  onClose: () => void;
  mindmapId: string;
}) {
  const [floats, setFloats] = useState<Float[]>([]);
  const keyRef = useRef(0);
  const chanRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  function addFloat(emoji: string) {
    const key = keyRef.current++;
    const left = 8 + Math.random() * 84; // vw
    const drift = Math.random() * 40 - 20; // px sideways
    setFloats((f) => [...f, { key, emoji, left, drift }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.key !== key)), 2600);
  }

  // Subscribe while open; broadcast on click. Sender sees its own float
  // locally (no self-echo needed).
  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    const channel = supabase.channel(`map:${mindmapId}:reactions`);
    channel
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const e = (payload as { emoji?: string })?.emoji;
        if (typeof e === 'string') addFloat(e);
      })
      .subscribe();
    chanRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      chanRef.current = null;
    };
  }, [open, mindmapId]);

  function fire(emoji: string) {
    addFloat(emoji);
    chanRef.current?.send({ type: 'broadcast', event: 'reaction', payload: { emoji } });
  }

  if (!open) return null;

  return (
    <>
      {/* Floating layer */}
      <div className="rx-layer" aria-hidden>
        {floats.map((f) => (
          <span
            key={f.key}
            className="rx-float"
            style={{ left: `${f.left}vw`, ['--drift' as string]: `${f.drift}px` }}
          >
            {f.emoji}
          </span>
        ))}
      </div>

      {/* Emoji bar */}
      <div className="rx-bar" role="toolbar" aria-label="Reactions">
        {EMOJI.map((e) => (
          <button key={e} className="rx-btn" onClick={() => fire(e)} aria-label={`React ${e}`}>
            {e}
          </button>
        ))}
        <span className="rx-sep" />
        <button className="rx-close" onClick={onClose} aria-label="Close reactions">✕</button>
      </div>

      <style jsx>{`
        .rx-layer {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 80;
          overflow: hidden;
        }
        .rx-float {
          position: absolute;
          bottom: 84px;
          font-size: 30px;
          animation: rx-rise 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          will-change: transform, opacity;
        }
        @keyframes rx-rise {
          0% { opacity: 0; transform: translateY(0) scale(0.6); }
          12% { opacity: 1; transform: translateY(-30px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-46vh) translateX(var(--drift)) scale(1); }
        }
        .rx-bar {
          position: fixed;
          bottom: 18px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 81;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(15, 17, 36, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 14px 40px -10px rgba(0, 0, 0, 0.6);
          animation: rx-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @media (max-width: 639px) {
          .rx-bar { bottom: 80px; }
        }
        @keyframes rx-in { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .rx-btn {
          font-size: 20px;
          line-height: 1;
          background: transparent;
          border: none;
          border-radius: 10px;
          padding: 6px;
          cursor: pointer;
          transition: transform 0.12s ease, background 0.12s ease;
        }
        .rx-btn:hover { transform: scale(1.25); background: rgba(255, 255, 255, 0.08); }
        .rx-btn:active { transform: scale(0.9); }
        .rx-sep { width: 1px; align-self: stretch; background: rgba(255, 255, 255, 0.12); margin: 0 4px; }
        .rx-close {
          background: transparent;
          border: none;
          color: rgba(232, 234, 255, 0.6);
          font-size: 13px;
          cursor: pointer;
          padding: 6px 8px;
          border-radius: 8px;
        }
        .rx-close:hover { color: #fff; background: rgba(255, 255, 255, 0.08); }
      `}</style>
    </>
  );
}
