'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Footer from '@/components/Footer';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

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
    setConfirmed(true);
    setTimeout(() => {
      router.push('/dashboard');
      router.refresh();
    }, 400);
  }

  return (
    <>
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link href="/" className="flex items-center gap-3 mb-8 group">
        <img src="/brain.svg" alt="" width={48} height={48}
             className="transition-transform group-hover:rotate-3" />
        <span className="text-2xl font-semibold gradient-text">SquishyMind</span>
      </Link>
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className={`glass rounded-2xl p-8 w-full max-w-sm transition-all duration-500 ${confirmed ? 'signup-confirmed' : ''}`}
      >
        <h1 className="text-2xl font-semibold mb-1">Glad you&apos;re here.</h1>
        <p className="text-sm text-[--text-dim] mb-6">Squishy is excited to meet you. Email and a password, that&apos;s it.</p>

        <label className="block text-xs uppercase tracking-wide text-[--text-dim] mb-1">Email</label>
        <input className="input mb-3" type="email" required
               value={email} onChange={(e) => setEmail(e.target.value)}
               autoComplete="email" disabled={confirmed} />

        <label className="block text-xs uppercase tracking-wide text-[--text-dim] mb-1">Password</label>
        <input className="input mb-3" type="password" required minLength={6}
               value={password} onChange={(e) => setPassword(e.target.value)}
               autoComplete="new-password" disabled={confirmed} />

        {error && <p className="text-sm text-red-300 mb-3">{error}</p>}

        <button type="submit" className="btn btn-primary w-full mt-2" disabled={busy || confirmed}>
          {busy ? 'Creating…' : confirmed ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="check-icon" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3,8 7,12 13,4" />
              </svg>
              Created
            </span>
          ) : 'Sign up'}
        </button>

        {confirmed && (
          <p className="text-sm text-green-300 mt-3 text-center animate-fade-in">
            Squishy is clearing a spot for you…
          </p>
        )}

        {!confirmed && (
          <p className="text-sm text-[--text-dim] mt-5 text-center">
            Already have an account? <Link href="/login" className="underline">Log in</Link>
          </p>
        )}
      </form>
    </main>
    <Footer />
    <style>{`
      @keyframes fade-in {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .animate-fade-in { animation: fade-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
      .signup-confirmed { box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3), 0 0 40px rgba(16, 185, 129, 0.1); }
      .check-icon { animation: check-draw 0.35s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both; }
      @keyframes check-draw {
        from { stroke-dasharray: 16; stroke-dashoffset: 16; }
        to   { stroke-dashoffset: 0; }
      }
    `}</style>
    </>
  );
}
