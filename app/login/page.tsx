'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Footer from '@/components/Footer';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) { setError(err.message); return; }
    const redirect = searchParams.get('redirect') || '/dashboard';
    router.push(redirect);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="glass rounded-2xl p-8 w-full max-w-sm">
      <h1 className="text-2xl font-semibold mb-1">Welcome back.</h1>
      <p className="text-sm text-[--text-dim] mb-6">Squishy missed you. Just a little.</p>

      <label className="block text-xs uppercase tracking-wide text-[--text-dim] mb-1">Email</label>
      <input className="input mb-3" type="email" required
             value={email} onChange={(e) => setEmail(e.target.value)}
             autoComplete="email" />

      <label className="block text-xs uppercase tracking-wide text-[--text-dim] mb-1">Password</label>
      <input className="input mb-3" type="password" required
             value={password} onChange={(e) => setPassword(e.target.value)}
             autoComplete="current-password" />

      {error && <p className="text-sm text-red-300 mb-3">{error}</p>}

      <button type="submit" className="btn btn-primary w-full mt-2" disabled={busy}>
        {busy ? 'Logging in…' : 'Log in'}
      </button>

      <p className="text-sm text-[--text-dim] mt-5 text-center">
        New here? <Link href="/signup" className="underline">Sign up free</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <>
      <main className="min-h-screen flex flex-col items-center justify-center px-6">
        <Link href="/" className="flex items-center gap-3 mb-8 group">
          <img src="/brain.svg" alt="" width={48} height={48}
               className="transition-transform group-hover:rotate-3" />
          <span className="text-2xl font-semibold gradient-text">SquishyMind</span>
        </Link>
        <Suspense>
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
