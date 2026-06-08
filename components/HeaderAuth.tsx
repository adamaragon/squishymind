'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Auth/account pills, resolved client-side so the Header — and therefore every
// public page that renders it — can be statically rendered (no server cookie
// read). Renders the logged-out actions for the initial/static paint, then
// swaps to the account actions once Supabase confirms a session.
const PILL_GHOST =
  'px-4 py-1.5 rounded-full text-sm border border-white/10 text-[--text-dim] hover:text-white hover:border-white/25 transition-colors';
const PILL_ACCENT =
  'px-4 py-1.5 rounded-full text-sm font-medium border border-violet-500/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 transition-colors';
const PILL_PRIMARY =
  'px-5 py-1.5 rounded-full text-sm font-medium text-white border border-transparent transition-all hover:-translate-y-px';

export default function HeaderAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setIsLoggedIn(!!data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (isLoggedIn) {
    return (
      <>
        <Link href="/dashboard" className={PILL_ACCENT}>
          My maps
        </Link>
        <Link href="/account" className={PILL_GHOST}>
          Account
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href="/login" className={PILL_GHOST}>
        Log in
      </Link>
      <Link
        href="/signup"
        className={PILL_PRIMARY}
        style={{
          background:
            'linear-gradient(135deg, var(--accent-violet), var(--accent-pink))',
          boxShadow: '0 6px 20px rgba(139, 92, 246, 0.3)',
        }}
      >
        Sign up free
      </Link>
    </>
  );
}
