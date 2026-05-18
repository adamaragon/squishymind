import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

/** Used by /admin server components and pages. Redirects to /dashboard if
 *  the current user isn't authed or isn't flagged is_admin. Returns the
 *  auth user + their profile row so callers don't need to refetch. */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, display_name, is_admin, is_founder, created_at')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) redirect('/dashboard');
  return { user, profile };
}

/** Same gate for API routes — returns the user when admin, otherwise a
 *  JSON 401/403 response the caller can return directly. */
export async function requireAdminApi(): Promise<
  | { ok: true; userId: string; admin: ReturnType<typeof createAdminClient> }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'unauthenticated' }, { status: 401 }),
    };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'forbidden' }, { status: 403 }),
    };
  }
  return { ok: true, userId: user.id, admin: createAdminClient() };
}
