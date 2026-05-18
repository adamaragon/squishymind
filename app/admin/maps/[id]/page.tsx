import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import MapActions from './MapActions';

export const dynamic = 'force-dynamic';

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

type MapData = {
  nodes?: Record<string, { label?: string; note?: string; imageUrl?: string | null; attachments?: unknown[] }>;
  childIndex?: Record<string, string[]>;
  rootId?: string | null;
};

export default async function AdminMapDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const [{ data: map }, { data: collabs }, { count: commentsCount }] =
    await Promise.all([
      admin
        .from('mindmaps')
        .select('id, title, slug, owner_id, visibility, share_token, data, created_at, updated_at')
        .eq('id', id)
        .maybeSingle(),
      admin
        .from('collaborators')
        .select('user_id, role, invited_at')
        .eq('mindmap_id', id),
      admin
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('mindmap_id', id),
    ]);

  if (!map) notFound();

  // Resolve owner + collaborator emails for display
  const ids = [map.owner_id, ...(collabs || []).map((c) => c.user_id)];
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, display_name')
    .in('id', ids);
  const idToProfile: Record<string, { email: string | null; display_name: string | null }> = {};
  for (const p of profiles || []) {
    idToProfile[p.id] = { email: p.email, display_name: p.display_name };
  }
  const owner = idToProfile[map.owner_id];

  const data = (map.data || {}) as MapData;
  const nodeCount = data.nodes ? Object.keys(data.nodes).length : 0;
  const nodes = data.nodes || {};
  const withNotes = Object.values(nodes).filter((n) => n.note && n.note.trim()).length;
  const withImages = Object.values(nodes).filter((n) => n.imageUrl).length;
  const withAttach = Object.values(nodes).filter(
    (n) => Array.isArray(n.attachments) && n.attachments.length > 0,
  ).length;
  const maxDepth = computeMaxDepth(data);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/maps"
          className="text-xs text-[--text-dim] hover:text-white transition-colors"
        >
          ← All maps
        </Link>
      </div>

      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold mb-1 truncate">
              {map.title || 'Untitled mind map'}
            </h1>
            <div className="text-sm text-[--text-dim] truncate">
              owned by{' '}
              <Link
                href={`/admin/users/${map.owner_id}`}
                className="hover:text-white hover:underline"
              >
                {owner?.email || owner?.display_name || map.owner_id.slice(0, 8)}
              </Link>
            </div>
            <div className="text-[11px] text-[--text-dim] font-mono mt-1">{map.id}</div>
          </div>
          <div className="flex gap-2 flex-wrap items-start">
            <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border bg-white/5">
              {map.visibility}
            </span>
            {map.slug && (
              <Link
                href={`/m/${map.slug}`}
                target="_blank"
                className="text-[11px] font-mono text-[--text-dim] hover:text-white"
              >
                /m/{map.slug} ↗
              </Link>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
          <Stat label="Nodes" value={String(nodeCount)} />
          <Stat label="Max depth" value={String(maxDepth)} />
          <Stat label="Notes" value={String(withNotes)} />
          <Stat label="Images" value={String(withImages)} />
          <Stat label="Attachments" value={String(withAttach)} />
          <Stat label="Comments" value={String(commentsCount ?? 0)} />
          <Stat label="Collaborators" value={String(collabs?.length ?? 0)} />
          <Stat label="Created" value={fmtDate(map.created_at)} />
        </dl>
      </div>

      <MapActions
        mapId={map.id}
        title={map.title || 'Untitled'}
        slug={map.slug}
      />

      {/* Collaborators */}
      <section className="mt-8 glass rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10">
          <h2 className="font-semibold">Collaborators ({collabs?.length ?? 0})</h2>
        </div>
        {collabs && collabs.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[--text-dim] border-b border-white/10">
                <th className="text-left py-2 px-5">User</th>
                <th className="text-left py-2 px-3">Role</th>
                <th className="text-right py-2 px-5">Invited</th>
              </tr>
            </thead>
            <tbody>
              {collabs.map((c) => {
                const profile = idToProfile[c.user_id];
                return (
                  <tr
                    key={c.user_id}
                    className="border-b border-white/5 hover:bg-white/[0.025]"
                  >
                    <td className="py-2 px-5">
                      <Link
                        href={`/admin/users/${c.user_id}`}
                        className="hover:underline"
                      >
                        {profile?.email || profile?.display_name || c.user_id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="py-2 px-3 text-[--text-dim]">{c.role}</td>
                    <td className="py-2 px-5 text-right text-[11px] text-[--text-dim]">
                      {fmtDate(c.invited_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-5 py-6 text-sm text-[--text-dim] italic">
            No collaborators on this map.
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-[--text-dim]">{label}</dt>
      <dd className="text-sm mt-0.5 tabular-nums">{value}</dd>
    </div>
  );
}

function computeMaxDepth(data: MapData): number {
  if (!data.rootId || !data.childIndex) return 0;
  let max = 0;
  function walk(id: string, depth: number) {
    if (depth > max) max = depth;
    for (const k of data.childIndex?.[id] || []) walk(k, depth + 1);
  }
  walk(data.rootId, 0);
  return max + 1;
}
