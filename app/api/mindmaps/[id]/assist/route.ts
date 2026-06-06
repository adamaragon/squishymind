import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { openai } from '@/lib/openai';
import { assistSystemPrompt, assistUserPrompt, type AssistAction } from '@/lib/prompts';

type AssistBody = {
  action?: AssistAction;
  outline?: string;
  focusLabel?: string;
};

type Suggestion = { label: string; note: string };

const VALID: AssistAction[] = ['summarize', 'gaps', 'plan'];

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

  // RLS double-check.
  const { data: map } = await supabase.from('mindmaps').select('id').eq('id', id).single();
  if (!map) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let body: AssistBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const action = body.action;
  if (!action || !VALID.includes(action)) {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
  }
  const outline = (body.outline || '').slice(0, 8000).trim();
  if (!outline) {
    return NextResponse.json({ error: 'empty_map' }, { status: 400 });
  }

  let raw = '';
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: assistSystemPrompt(action) },
        { role: 'user', content: assistUserPrompt(action, outline, body.focusLabel) },
      ],
      response_format: { type: 'json_object' },
      temperature: action === 'summarize' ? 0.4 : 0.8,
      max_tokens: 700,
    });
    raw = completion.choices[0]?.message?.content || '{}';
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'openai_error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  let parsed: { summary?: unknown; children?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'parse_error' }, { status: 502 });
  }

  if (action === 'summarize') {
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
    if (!summary) return NextResponse.json({ error: 'no_summary' }, { status: 502 });
    return NextResponse.json({ summary });
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

  if (children.length === 0) {
    return NextResponse.json({ error: 'no_suggestions' }, { status: 502 });
  }
  return NextResponse.json({ children });
}
