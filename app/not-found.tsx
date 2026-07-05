import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Not found — SquishyMind',
  description: "That page wandered off. Squishy can't find it either.",
};

// Branded 404 — fires for app/page routes that don't match (or when a page
// calls notFound()). The previous default Next 404 was unstyled and made the
// app feel half-built. Keeps the global Header/Footer so navigation isn't
// dead-ended.
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="text-center max-w-md">
          <img
            src="/brain.svg"
            alt=""
            width={88}
            height={88}
            className="mx-auto opacity-70 mb-6"
            style={{
              animation: 'nf-wobble 6s ease-in-out infinite',
              filter: 'drop-shadow(0 8px 24px rgba(139, 92, 246, 0.35))',
            }}
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-3 gradient-text">
            That page squished away
          </h1>
          <p className="text-[--text-dim] mb-6 text-base leading-relaxed">
            Squishy looked. Squishy is back now. The page you were after isn&apos;t
            here.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/" className="btn btn-primary">
              Home
            </Link>
            <Link href="/dashboard" className="btn btn-ghost">
              My maps
            </Link>
            <Link href="/changelog" className="btn btn-ghost">
              What&apos;s new
            </Link>
          </div>
        </div>
      </main>
      <Footer />
      <style>{`
        @keyframes nf-wobble {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25%      { transform: scale(1.06) rotate(-4deg); }
          50%      { transform: scale(1.02) rotate(3deg); }
          75%      { transform: scale(1.08) rotate(4deg); }
        }
      `}</style>
    </div>
  );
}
