import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseImport, type ImportFormat } from '@/lib/import';

const MAX_CONTENT_BYTES = 2 * 1024 * 1024; // 2 MB — generous for plain text

type ImportBody = {
  fileName?: string;
  contents?: string;
  format?: ImportFormat;
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: ImportBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const fileName = (body.fileName || '').slice(0, 200);
  const contents = body.contents;
  if (typeof contents !== 'string' || contents.trim().length === 0) {
    return NextResponse.json({ error: 'no_content' }, { status: 400 });
  }
  if (contents.length > MAX_CONTENT_BYTES) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 });
  }

  let result;
  try {
    result = await parseImport(fileName || 'pasted', contents, body.format);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'parse_failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('mindmaps')
    .insert({
      owner_id: user.id,
      title: result.suggestedTitle || 'Imported map',
      data: result.data,
    })
    .select('id')
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'insert_failed' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    mindmap_id: data.id,
    title: result.suggestedTitle,
    node_count: Object.keys(result.data.nodes).length,
  });
}
