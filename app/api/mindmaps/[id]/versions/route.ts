import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const KEEP = 50; // prune older snapshots beyond this per map

// GET — list a map's versions (newest first). RLS restricts to the owner.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data, error } = await supabase
    .from('map_versions')
    .select('id, label, kind, created_at')
    .eq('mindmap_id', id)
    .order('created_at', { ascending: false })
    .limit(KEEP);

  if (error) {
    // Most likely the table isn't migrated yet — degrade gracefully.
    return NextResponse.json({ versions: [], available: false });
  }
  return NextResponse.json({ versions: data ?? [], available: true });
}

// POST — save a snapshot of the map's current data. Body: { label?, kind? }.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  let body: { label?: string; kind?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine */
  }

  // Snapshot the current persisted data (RLS ensures the caller owns it).
  const { data: map, error: mapErr } = await supabase
    .from('mindmaps')
    .select('data')
    .eq('id', id)
    .single();
  if (mapErr || !map) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const kind = body.kind === 'auto' || body.kind === 'pre-restore' ? body.kind : 'manual';
  const label = typeof body.label === 'string' ? body.label.slice(0, 80) : null;

  const { data: inserted, error } = await supabase
    .from('map_versions')
    .insert({ mindmap_id: id, created_by: user.id, data: map.data, kind, label })
    .select('id, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: 'save_failed', detail: error.message }, { status: 502 });
  }

  // Light pruning: drop anything older than the KEEP-th most recent.
  const { data: keepRows } = await supabase
    .from('map_versions')
    .select('id')
    .eq('mindmap_id', id)
    .order('created_at', { ascending: false })
    .range(KEEP, KEEP + 200);
  if (keepRows && keepRows.length > 0) {
    await supabase.from('map_versions').delete().in('id', keepRows.map((r) => r.id));
  }

  return NextResponse.json({ id: inserted.id, created_at: inserted.created_at });
}
