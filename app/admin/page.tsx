import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

function timeAgo(date: string | null | undefined): string {
  if (!date) return '—';
  const ms = Date.now() - new Date(date).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(date).toLocaleDateString();
}

export default async function AdminOverview() {
  // Defense-in-depth: every admin page calls requireAdmin() directly so
  // an accidental layout opt-out can't leak service-role data. React.cache
  // memoizes this per-request, so the layout's call costs nothing here.
  await requireAdmin();
  const admin = createAdminClient();

  // Pull everything in parallel — admin client bypasses RLS so totals are honest.
  const [
    { count: totalUsers },
    { count: founderCount },
    { count: adminCount },
    { count: totalMaps },
    { count: publicMaps },
    { count: unlistedMaps },
    { count: totalComments },
    { count: totalCollaborators },
    { data: recentUsers },
    { data: recentMaps },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('is_founder', true),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('is_admin', true),
    admin.from('mindmaps').select('*', { count: 'exact', head: true }),
    admin.from('mindmaps').select('*', { count: 'exact', head: true }).eq('visibility', 'public'),
    admin.from('mindmaps').select('*', { count: 'exact', head: true }).eq('visibility', 'unlisted'),
    admin.from('comments').select('*', { count: 'exact', head: true }),
    admin.from('collaborators').select('*', { count: 'exact', head: true }),
    admin
      .from('profiles')
      .select('id, email, display_name, created_at, is_founder')
      .order('created_at', { ascending: false })
      .limit(8),
    admin
      .from('mindmaps')
      .select('id, title, slug, owner_id, visibility, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  // Signups: today, last 7d, last 30d
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [
    { count: signupsToday },
    { count: signupsWeek },
    { count: signupsMonth },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', startOfDay),
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
  ]);

  const founderPct = totalUsers
    ? Math.round(((founderCount ?? 0) / totalUsers) * 100)
    : 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Overview</h1>
      <p className="text-sm text-[--text-dim] mb-8">
        Live counts from the admin client — every row, no RLS scoping.
      </p>

      {/* KPI grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Kpi label="Total users" value={totalUsers ?? 0} sub={`${founderCount ?? 0} founders · ${founderPct}%`} accent="violet" />
        <Kpi label="Today" value={signupsToday ?? 0} sub="new signups" accent="pink" />
        <Kpi label="7-day signups" value={signupsWeek ?? 0} sub={`${signupsMonth ?? 0} in 30d`} accent="cyan" />
        <Kpi label="Staff" value={adminCount ?? 0} sub="is_admin = true" accent="amber" />
        <Kpi label="Total maps" value={totalMaps ?? 0} sub={`${publicMaps ?? 0} public · ${unlistedMaps ?? 0} unlisted`} accent="violet" />
        <Kpi label="Comments" value={totalComments ?? 0} sub="across all maps" accent="cyan" />
        <Kpi label="Collaborators" value={totalCollaborators ?? 0} sub="active invites" accent="amber" />
        <Kpi
          label="Maps / user"
          value={totalUsers ? Math.round(((totalMaps ?? 0) / totalUsers) * 10) / 10 : 0}
          sub="avg"
          accent="pink"
        />
      </section>

      {/* Recent activity — two columns on desktop */}
      <section className="grid md:grid-cols-2 gap-5">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Newest users</h2>
            <Link href="/admin/users" className="text-xs text-[--text-dim] hover:text-white">
              All users →
            </Link>
          </div>
          <ul className="divide-y divide-white/5 -mx-5">
            {(recentUsers || []).map((u) => (
              <li key={u.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <Link
                  href={`/admin/users/${u.id}`}
                  className="flex-1 min-w-0 hover:text-white transition-colors"
                >
                  <div className="text-sm truncate">{u.display_name || u.email || u.id.slice(0, 8)}</div>
                  <div className="text-[11px] text-[--text-dim] truncate">{u.email}</div>
                </Link>
                <div className="text-right text-[11px] text-[--text-dim] shrink-0">
                  {u.is_founder && (
                    <span className="inline-block mb-0.5 px-1.5 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-200 text-[9px] uppercase tracking-wider">
                      Founder
                    </span>
                  )}
                  <div>{timeAgo(u.created_at)}</div>
                </div>
              </li>
            ))}
            {(recentUsers || []).length === 0 && (
              <li className="px-5 py-6 text-sm text-[--text-dim] italic">
                No users yet.
              </li>
            )}
          </ul>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Newest maps</h2>
            <Link href="/admin/maps" className="text-xs text-[--text-dim] hover:text-white">
              All maps →
            </Link>
          </div>
          <ul className="divide-y divide-white/5 -mx-5">
            {(recentMaps || []).map((m) => (
              <li key={m.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <Link
                  href={`/admin/maps/${m.id}`}
                  className="flex-1 min-w-0 hover:text-white transition-colors"
                >
                  <div className="text-sm truncate">{m.title || 'Untitled mind map'}</div>
                  <div className="text-[11px] text-[--text-dim] truncate">
                    {m.slug ? `/${m.slug}` : m.id.slice(0, 8)} · {m.visibility}
                  </div>
                </Link>
                <div className="text-right text-[11px] text-[--text-dim] shrink-0">
                  {timeAgo(m.created_at)}
                </div>
              </li>
            ))}
            {(recentMaps || []).length === 0 && (
              <li className="px-5 py-6 text-sm text-[--text-dim] italic">
                No maps yet.
              </li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub: string;
  accent: 'pink' | 'violet' | 'cyan' | 'amber';
}) {
  const tones = {
    pink: 'from-pink-500/15 to-pink-500/0 border-pink-500/25',
    violet: 'from-violet-500/15 to-violet-500/0 border-violet-500/25',
    cyan: 'from-cyan-500/15 to-cyan-500/0 border-cyan-500/25',
    amber: 'from-amber-500/15 to-amber-500/0 border-amber-500/25',
  };
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-4 ${tones[accent]}`}
    >
      <div className="text-[10px] uppercase tracking-wider text-[--text-dim]">{label}</div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
      <div className="text-[11px] text-[--text-dim] mt-0.5">{sub}</div>
    </div>
  );
}
