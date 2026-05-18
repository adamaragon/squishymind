import { NextResponse, type NextRequest } from 'next/server';
import { requireAdminApi } from '@/lib/admin';

// DELETE — force-remove a mindmap from the admin client (bypasses RLS).
// Cascades to collaborators + comments via FK on-delete-cascade.
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const { error } = await gate.admin.from('mindmaps').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
