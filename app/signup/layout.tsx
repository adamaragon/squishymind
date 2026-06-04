import type { Metadata } from 'next';

// Page-level metadata. The signup page itself is a client component
// (form state, redirect handling) so the metadata can't live there
// directly — a server-component layout wrapper carries it.
export const metadata: Metadata = {
  title: 'Sign up — SquishyMind',
  description:
    "Make a SquishyMind account. Free during beta — every beta signup locks in Founder pricing ($2.99/mo) for life.",
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
