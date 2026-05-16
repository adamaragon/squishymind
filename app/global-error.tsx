'use client';

import { useEffect } from 'react';

// Last-resort error boundary. Catches errors thrown in the root layout itself,
// which segment-level error.tsx files can't reach. Renders its own <html>/<body>
// because at this level Next.js hasn't rendered the layout chrome.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error', error, error?.digest);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0a0a14', color: '#e8e6f0', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 480, padding: 32, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            Squishy needs a moment.
          </h1>
          <p style={{ fontSize: 14, color: '#9a98ad', marginBottom: 20 }}>
            Something crashed before the page could load. Try reloading; if it
            keeps happening, send the error id below.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={reset}
              style={{ background: '#ff4ea1', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 999, fontSize: 14, cursor: 'pointer' }}
            >
              Try again
            </button>
            <a
              href="/dashboard"
              style={{ background: 'transparent', color: '#e8e6f0', border: '1px solid rgba(255,255,255,0.15)', padding: '8px 16px', borderRadius: 999, fontSize: 14, textDecoration: 'none' }}
            >
              Back to dashboard
            </a>
          </div>
          {error?.digest && (
            <p style={{ marginTop: 20, fontSize: 11, color: '#9a98ad', fontFamily: 'ui-monospace, monospace' }}>
              error id · {error.digest}
            </p>
          )}
          {error?.message && (
            <p style={{ marginTop: 8, fontSize: 11, color: '#ff8aa8', wordBreak: 'break-word' }}>
              {error.message}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
