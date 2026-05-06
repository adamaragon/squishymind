import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { openai } from '@/lib/openai';
import { expansionSystemPrompt, expansionUserPrompt } from '@/lib/prompts';

type ExpandBody = {
  nodeLabel?: string;
  nodeNote?: string;
  parentLabel?: string;
  siblingLabels?: string[];
};

type Suggestion = { label: string; note: string };

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

  // RLS double-check — if user can't read this map, they can't expand.
  const { data: map } = await supabase
    .from('mindmaps')
    .select('id')
    .eq('id', id)
    .single();
  if (!map) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let body: ExpandBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.nodeLabel || typeof body.nodeLabel !== 'string') {
    return NextResponse.json({ error: 'missing_node_label' }, { status: 400 });
  }

  let raw = '';
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: expansionSystemPrompt() },
        { role: 'user', content: expansionUserPrompt({
          nodeLabel: body.nodeLabel,
          nodeNote: body.nodeNote,
          parentLabel: body.parentLabel,
          siblingLabels: body.siblingLabels,
        }) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 600,
    });
    raw = completion.choices[0]?.message?.content || '{}';
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'openai_error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  let parsed: { children?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'parse_error' }, { status: 502 });
  }

  const incoming = Array.isArray(parsed.children) ? parsed.children : [];
  const children: Suggestion[] = incoming
    .map((c): Suggestion | null => {
      if (typeof c !== 'object' || c === null) return null;
      const obj = c as Record<string, unknown>;
      const label = typeof obj.label === 'string' ? obj.label.trim() : '';
      const note = typeof obj.note === 'string' ? obj.note.trim() : '';
      if (!label) return null;
      return { label, note };
    })
    .filter((c): c is Suggestion => c !== null)
    .slice(0, 8);

  return NextResponse.json({ children });
}
