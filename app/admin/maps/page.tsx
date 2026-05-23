import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  q?: string;
  vis?: 'all' | 'public' | 'unlisted' | 'private';
}>;

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

export default async function AdminMapsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const { q, vis } = await searchParams;
  const admin = createAdminClient();

  let query = admin
    .from('mindmaps')
    .select('id, title, slug, owner_id, visibility, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (q && q.trim()) {
    // Strip PostgREST .or() metacharacters from raw user input — see
    // app/admin/users/page.tsx for the same pattern.
    const safe = q.trim().replace(/[,()*]/g, '');
    query = query.or(`title.ilike.%${safe}%,slug.ilike.%${safe}%`);
  }
  if (vis && vis !== 'all') query = query.eq('visibility', vis);

  const { data: maps } = await query;
  const ownerIds = Array.from(new Set((maps || []).map((m) => m.owner_id)));

  // Look up owner emails for display — single batched read.
  const owners: Record<string, { email: string | null; display_name: string | null }> = {};
  if (ownerIds.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, email, display_name')
      .in('id', ownerIds);
    for (const p of profiles || []) {
      owners[p.id] = { email: p.email, display_name: p.display_name };
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-2xl font-semibold">Maps</h1>
        <span className="text-sm text-[--text-dim]">
          {maps?.length ?? 0} shown {maps?.length === 200 && '(cap)'}
        </span>
      </div>
      <p className="text-sm text-[--text-dim] mb-6">
        Search by title or slug. Click to inspect.
      </p>

      <form className="flex flex-wrap gap-2 mb-5 items-center">
        <input
          type="search"
          name="q"
          defaultValue={q || ''}
          placeholder="Search title or slug…"
          className="input flex-1 min-w-[12rem]"
          autoFocus
        />
        <select
          name="vis"
          defaultValue={vis || 'all'}
          className="input"
          style={{ width: 'auto' }}
        >
          <option value="all">All visibility</option>
          <option value="public">Public</option>
          <option value="unlisted">Unlisted</option>
          <option value="private">Private</option>
        </select>
        <button type="submit" className="btn btn-ghost text-sm">Apply</button>
        {(q || vis) && (
          <Link href="/admin/maps" className="btn btn-ghost text-sm">Clear</Link>
        )}
      </form>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-[--text-dim] border-b border-white/10">
              <th className="text-left py-3 px-4">Title</th>
              <th className="text-left py-3 px-3">Owner</th>
              <th className="text-left py-3 px-3">Slug</th>
              <th className="text-left py-3 px-3">Visibility</th>
              <th className="text-right py-3 px-4">Updated</th>
            </tr>
          </thead>
          <tbody>
            {(maps || []).map((m) => {
              const owner = owners[m.owner_id];
              return (
                <tr
                  key={m.id}
                  className="border-b border-white/5 hover:bg-white/[0.025]"
                >
                  <td className="py-3 px-4">
                    <Link href={`/admin/maps/${m.id}`} className="hover:underline">
                      {m.title || <span className="text-[--text-dim] italic">Untitled</span>}
                    </Link>
                  </td>
                  <td className="py-3 px-3 text-[--text-dim] text-xs">
                    {owner ? (
                      <Link
                        href={`/admin/users/${m.owner_id}`}
                        className="hover:underline"
                      >
                        {owner.email || owner.display_name || m.owner_id.slice(0, 8)}
                      </Link>
                    ) : (
                      <span className="font-mono">{m.owner_id.slice(0, 8)}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-[--text-dim] font-mono text-[11px]">
                    {m.slug ? `/${m.slug}` : '—'}
                  </td>
                  <td className="py-3 px-3">
                    <VisibilityPill v={m.visibility} />
                  </td>
                  <td className="py-3 px-4 text-right text-[11px] text-[--text-dim]">
                    {fmtDate(m.updated_at)}
                  </td>
                </tr>
              );
            })}
            {(!maps || maps.length === 0) && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[--text-dim] italic">
                  No maps match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VisibilityPill({ v }: { v: string }) {
  const tones: Record<string, string> = {
    public: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200',
    unlisted: 'bg-amber-500/15 border-amber-500/40 text-amber-200',
    private: 'bg-violet-500/15 border-violet-500/40 text-violet-200',
  };
  return (
    <span
      className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${tones[v] || 'bg-white/5 border-white/15 text-[--text-dim]'}`}
    >
      {v}
    </span>
  );
}
