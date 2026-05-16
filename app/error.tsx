'use client';

import { useEffect } from 'react';
import Link from 'next/link';

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
    console.error('App error', error, error?.digest);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md w-full glass rounded-2xl p-8">
        <img src="/brain.svg" alt="" width={56} height={56} className="mx-auto mb-3 opacity-80" />
        <h1 className="text-xl font-semibold mb-2">Something went sideways.</h1>
        <p className="text-sm text-[--text-dim] mb-5">
          Squishy crashed before this page could load. Try again, or head back to your maps.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button onClick={reset} className="btn btn-primary text-sm">Try again</button>
          <Link href="/dashboard" className="btn btn-ghost text-sm">Back to dashboard</Link>
        </div>
        {error?.digest && (
          <p className="mt-5 text-xs text-[--text-dim] font-mono">error id · {error.digest}</p>
        )}
        {error?.message && (
          <p className="mt-2 text-xs text-red-300 break-words">{error.message}</p>
        )}
      </div>
    </main>
  );
}
