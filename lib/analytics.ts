import { createAdminClient } from '@/lib/supabase/admin';

/** Server-side analytics. Always uses the admin (service-role) client so the
 *  insert bypasses RLS. Errors are swallowed — analytics must never break
 *  the request path that triggered them. */
export async function trackServerEvent(opts: {
  userId?: string | null;
  anonId?: string | null;
  eventName: string;
  properties?: Record<string, unknown>;
  path?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('analytics_events').insert({
      user_id: opts.userId ?? null,
      anon_id: opts.anonId ?? null,
      event_name: opts.eventName.slice(0, 64),
      properties: opts.properties ?? {},
      path: opts.path ?? null,
    });
  } catch {
    // Intentionally silent — analytics failures must not surface to the user.
  }
}

/** Allow-list of event names the client may track via /api/track. Anything
 *  not in this set is rejected so a leaked endpoint can't be used to spam the
 *  table with arbitrary data. */
export const CLIENT_EVENTS = new Set<string>([
  'page_view',
  'view_switched',         // canvas → outline / tree / table
  'template_applied',
  'template_picker_opened',
  'ai_expand_used',
  'voice_widget_opened',
  'voice_widget_muted',
  'voice_widget_unmuted',
  'attachment_added',
  'image_added',
  'note_edited',
  'comment_posted',
  'share_link_copied',
  'export_clicked',
  'pricing_visited',
  'founder_access_visited',
]);
