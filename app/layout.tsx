import type { Metadata } from 'next';
import './globals.css';
import SquishyWidget from '@/components/SquishyWidget';
import SquishyToolBridge from '@/components/SquishyToolBridge';

export const metadata: Metadata = {
  title: 'SquishyMind — Your brain, but squishier.',
  description:
    'A wobbly, lovely, infinite mind-mapping canvas. Free, sign-up takes 10 seconds.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
