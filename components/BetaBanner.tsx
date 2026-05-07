'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'squishymind:beta-banner-dismissed';

export default function BetaBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* localStorage may be disabled */
    }
  }

  if (!visible) return null;

  return (
    <div className="flex justify-center px-6 pt-5">
      <div
        className="
          inline-flex items-center gap-3 max-w-3xl
          px-4 py-2 rounded-full text-sm
          bg-gradient-to-r from-pink-600/20 via-violet-600/20 to-cyan-600/20
          border border-white/10
          backdrop-blur-md
          shadow-[0_0_30px_rgba(236,72,153,0.12)]
        "
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" />
        <span className="text-center">
          <span className="font-medium">Now in beta.</span>{' '}
          <span className="text-[--text-dim]">
            Sign up now and it stays free forever.
          </span>
        </span>
        <button
          onClick={dismiss}
          className="text-[--text-dim] hover:text-white transition-colors text-xs leading-none"
          aria-label="Dismiss beta banner"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
