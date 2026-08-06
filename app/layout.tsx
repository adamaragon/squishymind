import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import SquishyWidget from '@/components/SquishyWidget';
import SquishyToolBridge from '@/components/SquishyToolBridge';

// Umami Cloud. The id is public (it ships in the page HTML) so it lives here
// rather than in an env var that could silently go missing on a redeploy.
// data-domains is the pollution guard: localhost and preview deploys get
// hostnames outside this list, so the tracker no-ops there.
const UMAMI_WEBSITE_ID = '6ff5f51c-8504-4410-abdd-f781f8bc6647';
const UMAMI_DOMAINS = 'www.squishymind.com,squishymind.vercel.app';

export const viewport: Viewport = {
  themeColor: '#0a0b16',
  colorScheme: 'dark',
};

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
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SquishyMind — Your brain, but squishier.',
    description:
      'A wobbly, lovely, infinite mind-mapping canvas with a sentient pink brain in the corner.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" as="image" href="/brain.svg" />
      </head>
      <body>
        {children}
        <SquishyWidget />
        <SquishyToolBridge />
        <Script
          src="https://cloud.umami.is/script.js"
          strategy="afterInteractive"
          data-website-id={UMAMI_WEBSITE_ID}
          data-domains={UMAMI_DOMAINS}
          data-performance="true"
        />
      </body>
    </html>
  );
}
