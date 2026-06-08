import Link from 'next/link';
import { NavShareButton } from '@/components/ShareButtons';
import HeaderAuth from '@/components/HeaderAuth';

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

// Quiet content-pill styling. The louder auth/account pills live in HeaderAuth.
const PILL_CONTENT =
  'px-3.5 py-1.5 rounded-full text-sm glass border border-white/10 text-[--text-dim] hover:text-white hover:border-white/20 transition-colors';

// Server component — intentionally does NOT read auth. The account/login pills
// are a client island (HeaderAuth) so this header, and every page that renders
// it, can be statically rendered / ISR instead of forced dynamic.
export default function Header() {
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

        {/* Auth / account — client island so the header stays static. */}
        <HeaderAuth />
      </nav>
    </header>
  );
}
