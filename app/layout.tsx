import type { Metadata, Viewport } from 'next';
import './globals.css';
import SquishyWidget from '@/components/SquishyWidget';
import SquishyToolBridge from '@/components/SquishyToolBridge';

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
      </body>
    </html>
  );
}
