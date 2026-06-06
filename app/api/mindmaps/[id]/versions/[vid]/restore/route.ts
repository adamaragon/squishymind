import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST — restore a map to a saved version. Snapshots the current state as a
// 'pre-restore' version first (so a restore is itself undoable), then writes
// the chosen version's data back onto the map. RLS restricts all of this to
// the map owner.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> },
) {
  const { id, vid } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  // The version we're restoring to.
  const { data: version, error: vErr } = await supabase
    .from('map_versions')
    .select('data')
    .eq('id', vid)
    .eq('mindmap_id', id)
    .single();
  if (vErr || !version) return NextResponse.json({ error: 'version_not_found' }, { status: 404 });

  // Snapshot current state before overwriting (best-effort).
  const { data: current } = await supabase.from('mindmaps').select('data').eq('id', id).single();
  if (current) {
    await supabase.from('map_versions').insert({
      mindmap_id: id,
      created_by: user.id,
      data: current.data,
      kind: 'pre-restore',
      label: 'Before restore',
    });
  }

  const { error: upErr } = await supabase
    .from('mindmaps')
    .update({ data: version.data })
    .eq('id', id);
  if (upErr) return NextResponse.json({ error: 'restore_failed', detail: upErr.message }, { status: 502 });

  return NextResponse.json({ ok: true });
}
