import { NextResponse, type NextRequest } from 'next/server';
import { requireAdminApi } from '@/lib/admin';

// DELETE — remove a single comment (replies cascade via parent_comment_id FK).
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const { error } = await gate.admin.from('comments').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
