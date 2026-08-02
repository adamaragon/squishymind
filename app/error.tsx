'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

// App-level error boundary. Catches errors in any route that doesn't have its
// own error.tsx. Distinct from global-error.tsx (which catches root-layout
// crashes) and /m/[id]/error.tsx (which handles the editor specifically).
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error('App error', error, error?.digest);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md w-full glass rounded-2xl p-8">
        <div
          className="mx-auto mb-4"
          style={{
            width: 64,
            height: 64,
            animation: 'err-wobble 5s ease-in-out infinite',
            filter: 'drop-shadow(0 6px 20px rgba(236, 72, 153, 0.3))',
          }}
        >
          <img src="/brain.svg" alt="" width={64} height={64} className="opacity-90" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Well, that was unexpected.</h1>
        <p className="text-sm text-[--text-dim] mb-5">
          Squishy tripped over something. Try again — she&apos;s usually more graceful than this.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button onClick={reset} className="btn btn-primary text-sm">Try again</button>
          <Link href="/dashboard" className="btn btn-ghost text-sm">Back to dashboard</Link>
        </div>
        {error?.digest && (
          <p className="mt-5 text-xs text-[--text-dim] font-mono">error id · {error.digest}</p>
        )}
        {/* Never surface raw error messages to end-users in production —
            they can leak stack traces, internal paths, or env names.
            The digest above is enough to look it up server-side. */}
        {process.env.NODE_ENV !== 'production' && error?.message && (
          <p className="mt-2 text-xs text-red-300 break-words">{error.message}</p>
        )}
      </div>
      <style>{`
        @keyframes err-wobble {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25%      { transform: scale(1.05) rotate(-3deg); }
          50%      { transform: scale(1.02) rotate(2deg); }
          75%      { transform: scale(1.06) rotate(3deg); }
        }
      `}</style>
    </main>
  );
}
