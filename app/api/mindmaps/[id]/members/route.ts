import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Role = 'editor' | 'commenter';

type MemberDTO = {
  user_id: string;
  role: Role;
  invited_at: string;
  email: string | null;
  display_name: string | null;
};

async function assertOwnerOrCollaborator(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mindmapId: string,
  userId: string,
): Promise<'owner' | 'collaborator' | null> {
  const { data: map } = await supabase
    .from('mindmaps')
    .select('owner_id')
    .eq('id', mindmapId)
    .single();
  if (!map) return null;
  if (map.owner_id === userId) return 'owner';
  const { data: collab } = await supabase
    .from('collaborators')
    .select('user_id')
    .eq('mindmap_id', mindmapId)
    .eq('user_id', userId)
    .maybeSingle();
  if (collab) return 'collaborator';
  return null;
}

async function ownerOnly(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mindmapId: string,
  userId: string,
): Promise<boolean> {
  const { data: map } = await supabase
    .from('mindmaps')
    .select('owner_id')
    .eq('id', mindmapId)
    .single();
  return !!map && map.owner_id === userId;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const access = await assertOwnerOrCollaborator(supabase, id, user.id);
  if (!access) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: collabs, error } = await supabase
    .from('collaborators')
    .select('user_id, role, invited_at')
    .eq('mindmap_id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (collabs || []).map((c) => c.user_id);
  let profileMap = new Map<string, { email: string | null; display_name: string | null }>();
  if (ids.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .in('id', ids);
    profileMap = new Map(
      (profiles || []).map((p) => [
        p.id,
        { email: p.email, display_name: p.display_name },
      ]),
    );
  }

  const members: MemberDTO[] = (collabs || []).map((c) => ({
    user_id: c.user_id,
    role: c.role as Role,
    invited_at: c.invited_at,
    email: profileMap.get(c.user_id)?.email ?? null,
    display_name: profileMap.get(c.user_id)?.display_name ?? null,
  }));

  return NextResponse.json({ members });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  if (!(await ownerOnly(supabase, id, user.id))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: { user_id?: string; role?: Role };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const target = typeof body.user_id === 'string' ? body.user_id : '';
  const role = body.role;
  if (!target || (role !== 'editor' && role !== 'commenter')) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const { error } = await supabase
    .from('collaborators')
    .update({ role })
    .eq('mindmap_id', id)
    .eq('user_id', target);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  if (!(await ownerOnly(supabase, id, user.id))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const target = url.searchParams.get('user_id');
  if (!target) {
    return NextResponse.json({ error: 'missing_user' }, { status: 400 });
  }

  const { error } = await supabase
    .from('collaborators')
    .delete()
    .eq('mindmap_id', id)
    .eq('user_id', target);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
