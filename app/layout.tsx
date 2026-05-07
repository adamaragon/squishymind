import type { Metadata } from 'next';
import './globals.css';
import SquishyWidget from '@/components/SquishyWidget';
import SquishyToolBridge from '@/components/SquishyToolBridge';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'SquishyMind — Your brain, but squishier.',
  description:
    'A wobbly, lovely, infinite mind-mapping canvas. Free, sign-up takes 10 seconds.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <html lang="en">
      <body>
        {children}
        <SquishyWidget isLoggedIn={isLoggedIn} />
        <SquishyToolBridge />
      </body>
    </html>
  );
}
