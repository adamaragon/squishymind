import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { NavShareButton } from '@/components/ShareButtons';

// Content links mirror the footer. Rendered as subtle pills in the top nav.
// Hidden below `lg` so the bar stays uncrowded on small screens — the footer
// still carries the full set there.
const NAV_LINKS: { href: string; label: string }[] = [
  { href: '/features', label: 'Features' },
  { href: '/templates', label: 'Templates' },
  { href: '/use-cases', label: 'Use cases' },
  { href: '/compare', label: 'Compare' },
  { href: '/blog', label: 'Blog' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/changelog', label: "What's new" },
];

// Shared pill styles. Content pills are quiet; auth/account pills get
// distinct, louder treatments so the primary actions stand out.
const PILL_CONTENT =
  'px-3.5 py-1.5 rounded-full text-sm glass border border-white/10 text-[--text-dim] hover:text-white hover:border-white/20 transition-colors';
const PILL_GHOST =
  'px-4 py-1.5 rounded-full text-sm border border-white/10 text-[--text-dim] hover:text-white hover:border-white/25 transition-colors';
const PILL_ACCENT =
  'px-4 py-1.5 rounded-full text-sm font-medium border border-violet-500/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 transition-colors';
const PILL_PRIMARY =
  'px-5 py-1.5 rounded-full text-sm font-medium text-white border border-transparent transition-all hover:-translate-y-px';

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-white/5">
      <Link href="/" className="flex items-center gap-3 group shrink-0">
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
        {/* Content pills — mirror the footer. Hidden on small screens where
            they'd overflow; the footer still lists them all there. */}
        <span className="hidden lg:flex items-center gap-1.5">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={PILL_CONTENT}>
              {l.label}
            </Link>
          ))}
          <span className="w-px h-5 bg-white/10 mx-1" aria-hidden />
        </span>

        {/* Compact share trigger — popover on desktop, native share sheet on
            mobile/Safari. Visible to everyone since growth lives in the nav. */}
        <NavShareButton />

        {/* Auth / account — distinct, louder pill treatments. */}
        {user ? (
          <>
            <Link href="/dashboard" className={PILL_ACCENT}>
              My maps
            </Link>
            <Link href="/account" className={PILL_GHOST}>
              Account
            </Link>
          </>
        ) : (
          <>
            <Link href="/login" className={PILL_GHOST}>
              Log in
            </Link>
            <Link
              href="/signup"
              className={PILL_PRIMARY}
              style={{
                background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-pink))',
                boxShadow: '0 6px 20px rgba(139, 92, 246, 0.3)',
              }}
            >
              Sign up free
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
