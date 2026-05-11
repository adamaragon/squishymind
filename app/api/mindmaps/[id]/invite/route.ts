import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type InviteBody = {
  email?: string;
  role?: 'editor' | 'commenter';
};

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

  // Owner-only: the map's owner is the only one who can invite collaborators.
  const { data: map } = await supabase
    .from('mindmaps')
    .select('owner_id')
    .eq('id', id)
    .single();
  if (!map) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (map.owner_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: InviteBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = body.role;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (role !== 'editor' && role !== 'commenter') {
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
  }

  const admin = createAdminClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/m/${id}`;

  // Invite. If the user already exists, this returns their record without
  // sending another email. If they're new, an auth.users row is created and
  // a magic-link email is sent.
  let invitedUserId: string | null = null;
  const inviteResult = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (inviteResult.error) {
    const msg = inviteResult.error.message || '';
    // "already registered" / "already exists" → look up the user instead.
    if (/already|registered|exists/i.test(msg)) {
      // No direct lookup-by-email on the admin client; use listUsers with a filter.
      // listUsers paginates, but for our typical scale (one email) this is fine.
      const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list.data?.users?.find(
        (u) => u.email?.toLowerCase() === email,
      );
      if (existing) invitedUserId = existing.id;
    } else {
      return NextResponse.json(
        { error: msg || 'invite_failed' },
        { status: 500 },
      );
    }
  } else {
    invitedUserId = inviteResult.data?.user?.id ?? null;
  }

  if (!invitedUserId) {
    return NextResponse.json(
      { error: 'could_not_resolve_user' },
      { status: 500 },
    );
  }

  // Add to the map's collaborators (or update their role if already in).
  const { error: collabError } = await supabase
    .from('collaborators')
    .upsert(
      { mindmap_id: id, user_id: invitedUserId, role },
      { onConflict: 'mindmap_id,user_id' },
    );
  if (collabError) {
    return NextResponse.json({ error: collabError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user_id: invitedUserId, role });
}
