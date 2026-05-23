import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin';
import CommentRow from './CommentRow';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ q?: string }>;

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const { q } = await searchParams;
  const admin = createAdminClient();

  let query = admin
    .from('comments')
    .select(
      'id, mindmap_id, node_id, parent_comment_id, author_id, body, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (q && q.trim()) {
    query = query.ilike('body', `%${q.trim()}%`);
  }

  const { data: comments } = await query;
  const mapIds = Array.from(new Set((comments || []).map((c) => c.mindmap_id)));
  const userIds = Array.from(new Set((comments || []).map((c) => c.author_id)));

  // Batched lookups for join data
  const [mapsRes, profilesRes] = await Promise.all([
    mapIds.length
      ? admin.from('mindmaps').select('id, title, slug').in('id', mapIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; slug: string | null }> }),
    userIds.length
      ? admin.from('profiles').select('id, email, display_name').in('id', userIds)
      : Promise.resolve({ data: [] as Array<{ id: string; email: string | null; display_name: string | null }> }),
  ]);

  const maps: Record<string, { title: string; slug: string | null }> = {};
  for (const m of mapsRes.data || []) maps[m.id] = { title: m.title, slug: m.slug };
  const profiles: Record<string, { email: string | null; display_name: string | null }> = {};
  for (const p of profilesRes.data || []) profiles[p.id] = { email: p.email, display_name: p.display_name };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-2xl font-semibold">Comments</h1>
        <span className="text-sm text-[--text-dim]">
          {comments?.length ?? 0} shown {comments?.length === 200 && '(cap)'}
        </span>
      </div>
      <p className="text-sm text-[--text-dim] mb-6">
        Most recent first. Substring search on body. Click 🗑 to remove a
        comment from a map.
      </p>

      <form className="flex gap-2 mb-5">
        <input
          type="search"
          name="q"
          defaultValue={q || ''}
          placeholder="Search comment body…"
          className="input flex-1"
          autoFocus
        />
        <button type="submit" className="btn btn-ghost text-sm">Apply</button>
        {q && (
          <Link href="/admin/comments" className="btn btn-ghost text-sm">Clear</Link>
        )}
      </form>

      <div className="glass rounded-2xl divide-y divide-white/5">
        {(comments || []).map((c) => (
          <CommentRow
            key={c.id}
            id={c.id}
            body={c.body}
            createdAt={c.created_at}
            nodeId={c.node_id}
            mapId={c.mindmap_id}
            mapTitle={maps[c.mindmap_id]?.title || 'Untitled'}
            mapSlug={maps[c.mindmap_id]?.slug || null}
            authorId={c.author_id}
            authorLabel={
              profiles[c.author_id]?.email ||
              profiles[c.author_id]?.display_name ||
              c.author_id.slice(0, 8)
            }
          />
        ))}
        {(!comments || comments.length === 0) && (
          <div className="px-5 py-12 text-center text-sm text-[--text-dim] italic">
            No comments match.
          </div>
        )}
      </div>
    </div>
  );
}
