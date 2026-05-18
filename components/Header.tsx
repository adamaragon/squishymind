import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { NavShareButton } from '@/components/ShareButtons';

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
      <Link href="/" className="flex items-center gap-3 group">
        <img
          src="/brain.svg"
          alt=""
          width={36}
          height={36}
          className="transition-transform group-hover:rotate-3 group-hover:scale-110"
        />
        <span className="text-xl font-semibold gradient-text">SquishyMind</span>
      </Link>
      <nav className="flex items-center gap-2">
        {/* Compact share trigger — popover on desktop, native share
            sheet on mobile/Safari. Visible to everyone (signed in or
            out) since growth lives in the nav. */}
        <NavShareButton />
        {user ? (
          <>
            <Link href="/dashboard" className="btn btn-ghost">My maps</Link>
            <Link href="/account" className="btn btn-ghost">Account</Link>
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-ghost">Log in</Link>
            <Link href="/signup" className="btn btn-primary">Sign up free</Link>
          </>
        )}
      </nav>
    </header>
  );
}
