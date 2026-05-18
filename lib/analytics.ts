import { createAdminClient } from '@/lib/supabase/admin';

/** Server-side analytics. Always uses the admin (service-role) client so the
 *  insert bypasses RLS. Errors are swallowed — analytics must never break
 *  the request path that triggered them. Skipped in development so local
 *  dev (which uses the same .env.local pointing at prod Supabase) doesn't
 *  pollute the events table with test runs. */
export async function trackServerEvent(opts: {
  userId?: string | null;
  anonId?: string | null;
  eventName: string;
  properties?: Record<string, unknown>;
  path?: string | null;
}): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;
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
 *  not in this set is rejected so a leaked endpoint can't be used to spam
 *  the table with arbitrary data.
 *
 *  Each entry should be either CURRENTLY EMITTED somewhere in the codebase
 *  or actively planned for the next sprint — otherwise the list rots into a
 *  field-of-dreams that never gets cleaned. If you add an entry, add the
 *  track() call in the same commit. */
export const CLIENT_EVENTS = new Set<string>([
  'view_switched',          // EditorShell — canvas → outline / tree / table
  'template_applied',       // TemplatePicker — after a new map is created
  'ai_expand_used',         // MindMapCanvas — after AI children are accepted
  'image_added',            // MindMapCanvas — after an image upload succeeds
  'attachment_added',       // MindMapCanvas — after a file attachment uploads
  'comment_posted',         // MindMapCanvas — after a comment posts
  'share_link_copied',      // ShareDialog — copy button
  'pricing_visited',        // /pricing — PageViewTracker
  'founder_access_visited', // /founder-access — PageViewTracker
]);
