import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_FIELDS = ['data', 'title', 'visibility'] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('mindmaps')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const update: Partial<Record<AllowedField, unknown>> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no updatable fields provided' }, { status: 400 });
  }

  if (
    update.visibility !== undefined &&
    !['private', 'unlisted', 'public'].includes(update.visibility as string)
  ) {
    return NextResponse.json({ error: 'invalid visibility' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('mindmaps')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    // Either the row doesn't exist or RLS blocked the update.
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  return NextResponse.json(data);
}
