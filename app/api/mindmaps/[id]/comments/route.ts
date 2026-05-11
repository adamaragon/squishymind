import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type CommentRow = {
  id: string;
  body: string;
  parent_comment_id: string | null;
  author_id: string;
  created_at: string;
  node_id: string;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const url = new URL(req.url);
  const nodeId = url.searchParams.get('node_id');
  if (!nodeId) {
    return NextResponse.json({ error: 'missing_node_id' }, { status: 400 });
  }

  // RLS on comments enforces who can read this map's comments. The query
  // below works for both anonymous share viewers (public/unlisted maps) and
  // owner/collaborator readers.
  const { data, error } = await supabase
    .from('comments')
    .select('id, body, parent_comment_id, author_id, created_at, node_id')
    .eq('mindmap_id', id)
    .eq('node_id', nodeId)
    .order('created_at', { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Join author profile info via a separate query (no FK between comments
  // and profiles directly; both reference auth.users).
  const rows = (data || []) as CommentRow[];
  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  let profileMap = new Map<
    string,
    { display_name: string | null; email: string | null }
  >();
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', authorIds);
    profileMap = new Map(
      (profiles || []).map((p) => [
        p.id,
        { display_name: p.display_name, email: p.email },
      ]),
    );
  }

  const comments = rows.map((r) => ({
    id: r.id,
    body: r.body,
    parent_comment_id: r.parent_comment_id,
    author_id: r.author_id,
    created_at: r.created_at,
    author_name:
      profileMap.get(r.author_id)?.display_name ||
      profileMap.get(r.author_id)?.email?.split('@')[0] ||
      'someone',
  }));

  return NextResponse.json({ comments });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: {
    node_id?: string;
    body?: string;
    parent_comment_id?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const nodeId = typeof body.node_id === 'string' ? body.node_id : '';
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  const parentId =
    typeof body.parent_comment_id === 'string' ? body.parent_comment_id : null;
  if (!nodeId || !text) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: 'too_long' }, { status: 413 });
  }

  // RLS enforces that author must be a collaborator/owner of this map.
  const { data, error } = await supabase
    .from('comments')
    .insert({
      mindmap_id: id,
      node_id: nodeId,
      body: text,
      parent_comment_id: parentId,
      author_id: user.id,
    })
    .select('id, body, parent_comment_id, author_id, created_at, node_id')
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'forbidden' },
      { status: 403 },
    );
  }

  return NextResponse.json({ comment: data });
}
