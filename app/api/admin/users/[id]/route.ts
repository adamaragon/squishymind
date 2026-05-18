import { NextResponse, type NextRequest } from 'next/server';
import { requireAdminApi } from '@/lib/admin';

// PATCH — toggle is_founder / is_admin on a user's profile.
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  let body: { is_founder?: unknown; is_admin?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // Whitelist what can be patched. is_founder + is_admin are booleans.
  const patch: Record<string, boolean> = {};
  if (typeof body.is_founder === 'boolean') patch.is_founder = body.is_founder;
  if (typeof body.is_admin === 'boolean') patch.is_admin = body.is_admin;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no_valid_fields' }, { status: 400 });
  }

  // Belt + braces: don't let an admin demote themselves from admin in one
  // click — would lock them out. Use SQL directly for that case.
  if (patch.is_admin === false && id === gate.userId) {
    return NextResponse.json(
      { error: 'cannot_self_demote' },
      { status: 400 },
    );
  }

  const { data, error } = await gate.admin
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, profile: data });
}

// DELETE — permanently remove a user. Cascades through auth.users → profiles
// → mindmaps → collaborators → comments via the FK on-delete-cascade rules
// set in 0001_init.sql / 0002_comments.sql.
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;

  // Don't let an admin nuke themselves — would lock the session out and
  // leave dangling references in the audit trail.
  if (id === gate.userId) {
    return NextResponse.json({ error: 'cannot_delete_self' }, { status: 400 });
  }

  const { error } = await gate.admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
