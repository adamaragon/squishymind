import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log in — SquishyMind',
  description: 'Log back into SquishyMind to get to your maps and brain.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
