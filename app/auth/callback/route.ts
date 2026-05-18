import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { trackServerEvent } from '@/lib/analytics';

// Handles the email-confirmation callback. Supabase sends users here after
// they click the link in the confirmation email.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // First confirmed login after signup. Treat the callback hit as the
      // signup event — it's the most reliable single marker we have (the
      // raw row in profiles is created by a trigger we don't own and may
      // pre-exist before email is confirmed).
      const user = data?.user;
      if (user) {
        await trackServerEvent({
          userId: user.id,
          eventName: 'signup_confirmed',
          properties: {
            provider: user.app_metadata?.provider || 'email',
          },
          path: '/auth/callback',
        });
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=callback_failed`);
}
