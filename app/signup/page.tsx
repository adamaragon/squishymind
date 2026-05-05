'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`,
      },
    });
    setBusy(false);
    if (err) { setError(err.message); return; }
    // If email confirmation is OFF in Supabase settings, the user is signed in immediately.
    // Otherwise they'll get a confirmation email.
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link href="/" className="flex items-center gap-3 mb-8 group">
        <img src="/brain.svg" alt="" width={48} height={48}
             className="transition-transform group-hover:rotate-3" />
        <span className="text-2xl font-semibold gradient-text">SquishyMind</span>
      </Link>
      <form onSubmit={onSubmit} className="glass rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-1">Create your account</h1>
        <p className="text-sm text-[--text-dim] mb-6">It's free. Email and a password is all we need.</p>

        <label className="block text-xs uppercase tracking-wide text-[--text-dim] mb-1">Email</label>
        <input className="input mb-3" type="email" required
               value={email} onChange={(e) => setEmail(e.target.value)}
               autoComplete="email" />

        <label className="block text-xs uppercase tracking-wide text-[--text-dim] mb-1">Password</label>
        <input className="input mb-3" type="password" required minLength={6}
               value={password} onChange={(e) => setPassword(e.target.value)}
               autoComplete="new-password" />

        {error && <p className="text-sm text-red-300 mb-3">{error}</p>}

        <button type="submit" className="btn btn-primary w-full mt-2" disabled={busy}>
          {busy ? 'Creating…' : 'Sign up'}
        </button>

        <p className="text-sm text-[--text-dim] mt-5 text-center">
          Already have an account? <Link href="/login" className="underline">Log in</Link>
        </p>
      </form>
    </main>
  );
}
