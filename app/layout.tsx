import type { Metadata } from 'next';
import './globals.css';
import SquishyWidget from '@/components/SquishyWidget';
import SquishyToolBridge from '@/components/SquishyToolBridge';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.squishymind.com',
  ),
  title: 'SquishyMind — Your brain, but squishier.',
  description:
    'A wobbly, lovely, infinite mind-mapping canvas. Free, sign-up takes 10 seconds.',
  openGraph: {
    title: 'SquishyMind — Your brain, but squishier.',
    description:
      'A wobbly, lovely, infinite mind-mapping canvas with a sentient pink brain in the corner. Free during beta.',
    url: '/',
    siteName: 'SquishyMind',
    images: [{ url: '/brain.svg', width: 800, height: 800, alt: 'SquishyMind' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SquishyMind — Your brain, but squishier.',
    description:
      'A wobbly, lovely, infinite mind-mapping canvas with a sentient pink brain in the corner.',
    images: ['/brain.svg'],
  },
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
