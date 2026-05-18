import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';

export const metadata = {
  title: 'Admin — SquishyMind',
};

const NAV: Array<{ href: string; label: string; emoji: string }> = [
  { href: '/admin', label: 'Overview', emoji: '🧠' },
  { href: '/admin/users', label: 'Users', emoji: '👤' },
  { href: '/admin/maps', label: 'Maps', emoji: '🗺' },
  { href: '/admin/comments', label: 'Comments', emoji: '💬' },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side gate. Non-admins are redirected to /dashboard.
  const { profile } = await requireAdmin();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar — distinct from the public Header so it's obvious you're in admin */}
      <header className="border-b border-white/10 bg-gradient-to-r from-pink-600/10 via-violet-600/10 to-cyan-600/10 backdrop-blur shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="flex items-center gap-2 font-semibold"
            >
              <img src="/brain.svg" alt="" width={26} height={26} />
              <span>
                SquishyMind <span className="text-pink-300">Admin</span>
              </span>
            </Link>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-pink-500/40 bg-pink-500/10 text-pink-200">
              Staff
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-[--text-dim]">
            <span>
              Signed in as{' '}
              <span className="text-white">{profile.email}</span>
            </span>
            <Link href="/dashboard" className="hover:text-white transition-colors">
              ← Exit admin
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-6 py-8 gap-8">
        {/* Sidebar — sticky on desktop */}
        <aside className="w-48 shrink-0 hidden md:block">
          <nav className="sticky top-6 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="admin-nav-link group"
              >
                <span className="text-base shrink-0">{item.emoji}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="mt-6 pt-4 border-t border-white/10 text-[10px] uppercase tracking-wider text-[--text-dim] px-3">
              Reference
            </div>
            <Link href="/changelog" className="admin-nav-link">
              <span className="text-base shrink-0">📜</span>
              <span>Changelog</span>
            </Link>
            <Link href="/founder-access" className="admin-nav-link">
              <span className="text-base shrink-0">🪙</span>
              <span>Founder copy</span>
            </Link>
          </nav>
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>

      <style>{`
        .admin-nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 14px;
          color: var(--text-dim);
          transition: all 0.15s;
        }
        .admin-nav-link:hover {
          background: rgba(255, 255, 255, 0.04);
          color: var(--text);
        }
      `}</style>
    </div>
  );
}
