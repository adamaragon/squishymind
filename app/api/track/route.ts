import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { trackServerEvent, CLIENT_EVENTS } from '@/lib/analytics';

// Accepts a single event from the client. Auth is optional — anonymous
// page views are interesting too. Event names are gated to the CLIENT_EVENTS
// allow-list so a leaked endpoint can't be used to pollute the table.

export async function POST(req: NextRequest) {
  let body: {
    event?: unknown;
    properties?: unknown;
    path?: unknown;
    anonId?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const event = typeof body.event === 'string' ? body.event : '';
  if (!event || !CLIENT_EVENTS.has(event)) {
    return NextResponse.json({ error: 'unknown_event' }, { status: 400 });
  }

  // Properties: must be a plain object, capped in size to keep the row tiny.
  let properties: Record<string, unknown> = {};
  if (body.properties && typeof body.properties === 'object' && !Array.isArray(body.properties)) {
    const serialized = JSON.stringify(body.properties);
    if (serialized.length < 4000) {
      properties = body.properties as Record<string, unknown>;
    }
  }

  const path = typeof body.path === 'string' && body.path.length < 200 ? body.path : null;
  const anonId =
    typeof body.anonId === 'string' && body.anonId.length < 64 ? body.anonId : null;

  // Try to attach user_id if signed in — analytics is more useful with it.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await trackServerEvent({
    userId: user?.id ?? null,
    anonId,
    eventName: event,
    properties,
    path,
  });

  return NextResponse.json({ ok: true });
}
