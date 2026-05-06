import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase/server';

// Returns a 32-char hex string, matching the format Postgres produces with
// encode(gen_random_bytes(16), 'hex') — the schema's default for share_token.
function newShareToken() {
  return randomBytes(16).toString('hex');
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('mindmaps')
    .update({ share_token: newShareToken() })
    .eq('id', id)
    .select('share_token')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  return NextResponse.json({ share_token: data.share_token });
}
