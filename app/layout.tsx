import type { Metadata } from 'next';
import './globals.css';
import SquishyWidget from '@/components/SquishyWidget';
import SquishyToolBridge from '@/components/SquishyToolBridge';

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
    type: 'website',
    // images intentionally omitted — Next auto-picks up
    // app/opengraph-image.tsx (and per-route overrides) and serves a
    // proper PNG. The previous SVG OG link rendered badly on Slack +
    // Twitter and didn't validate on LinkedIn at all.
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SquishyMind — Your brain, but squishier.',
    description:
      'A wobbly, lovely, infinite mind-mapping canvas with a sentient pink brain in the corner.',
    // Same — Next auto-detects app/twitter-image.tsx OR falls back to
    // opengraph-image.tsx, so we don't need to point at anything here.
  },
};

// Intentionally NOT async and does NOT read auth: keeping the root layout free
// of any server-side cookie read lets the public marketing/blog pages render
// statically / ISR. SquishyWidget resolves login state client-side.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <SquishyWidget />
        <SquishyToolBridge />
      </body>
    </html>
  );
}
