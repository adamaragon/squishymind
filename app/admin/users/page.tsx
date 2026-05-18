import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  q?: string;
  filter?: 'all' | 'founders' | 'admins';
}>;

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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q, filter } = await searchParams;
  const admin = createAdminClient();

  // Pull profiles + map counts. Cap to 200 rows for safety; the search input
  // narrows further. (Cursor pagination is a later concern — a few hundred
  // beta accounts fit comfortably in one page.)
  let query = admin
    .from('profiles')
    .select('id, email, display_name, created_at, is_founder, is_admin')
    .order('created_at', { ascending: false })
    .limit(200);

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    query = query.or(`email.ilike.${term},display_name.ilike.${term}`);
  }
  if (filter === 'founders') query = query.eq('is_founder', true);
  if (filter === 'admins') query = query.eq('is_admin', true);

  const { data: users } = await query;
  const userIds = (users || []).map((u) => u.id);

  // Map count per user — single grouped query.
  const counts: Record<string, number> = {};
  if (userIds.length > 0) {
    const { data: rows } = await admin
      .from('mindmaps')
      .select('owner_id')
      .in('owner_id', userIds);
    for (const row of rows || []) {
      counts[row.owner_id] = (counts[row.owner_id] || 0) + 1;
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-2xl font-semibold">Users</h1>
        <span className="text-sm text-[--text-dim]">
          {users?.length ?? 0} shown {users?.length === 200 && '(cap)'}
        </span>
      </div>
      <p className="text-sm text-[--text-dim] mb-6">
        Search by email or display name. Click a row to manage.
      </p>

      {/* Search + filter — GET form so it's stateless and shareable */}
      <form className="flex flex-wrap gap-2 mb-5 items-center">
        <input
          type="search"
          name="q"
          defaultValue={q || ''}
          placeholder="Search email or name…"
          className="input flex-1 min-w-[12rem]"
          autoFocus
        />
        <select
          name="filter"
          defaultValue={filter || 'all'}
          className="input"
          style={{ width: 'auto' }}
        >
          <option value="all">All users</option>
          <option value="founders">Founders only</option>
          <option value="admins">Admins only</option>
        </select>
        <button type="submit" className="btn btn-ghost text-sm">
          Apply
        </button>
        {(q || filter) && (
          <Link href="/admin/users" className="btn btn-ghost text-sm">
            Clear
          </Link>
        )}
      </form>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-[--text-dim] border-b border-white/10">
              <th className="text-left py-3 px-4">Email</th>
              <th className="text-left py-3 px-3">Name</th>
              <th className="text-left py-3 px-3">Flags</th>
              <th className="text-right py-3 px-3">Maps</th>
              <th className="text-right py-3 px-4">Joined</th>
            </tr>
          </thead>
          <tbody>
            {(users || []).map((u) => (
              <tr
                key={u.id}
                className="border-b border-white/5 hover:bg-white/[0.025] transition-colors"
              >
                <td className="py-3 px-4">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="text-white hover:underline"
                  >
                    {u.email || <span className="text-[--text-dim] italic">no email</span>}
                  </Link>
                </td>
                <td className="py-3 px-3 text-[--text-dim]">
                  {u.display_name || '—'}
                </td>
                <td className="py-3 px-3">
                  <div className="flex gap-1.5">
                    {u.is_admin && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-200">
                        Admin
                      </span>
                    )}
                    {u.is_founder && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/40 text-pink-200">
                        Founder
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-[--text-dim]">
                  {counts[u.id] ?? 0}
                </td>
                <td className="py-3 px-4 text-right text-[11px] text-[--text-dim]">
                  {timeAgo(u.created_at)}
                </td>
              </tr>
            ))}
            {(!users || users.length === 0) && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[--text-dim] italic">
                  No users match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
