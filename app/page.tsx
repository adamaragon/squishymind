import Link from 'next/link';
import Header from '@/components/Header';

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="px-6">
        {/* Hero */}
        <section className="max-w-4xl mx-auto pt-20 pb-16 text-center">
          <div className="inline-block mb-6 animate-[wobble_3.6s_ease-in-out_infinite]">
            <img src="/brain.svg" alt="" width={140} height={140} />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-5">
            Your brain, but{' '}
            <span className="gradient-text">squishier</span>.
          </h1>
          <p className="text-lg text-[--text-dim] mb-8 max-w-2xl mx-auto">
            A wobbly, lovely mind-mapping canvas with infinite room, animated
            connections, and a very pink central node. Free for everyone, no
            seat limits, no surprise upsells.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/signup" className="btn btn-primary">Start mapping — free</Link>
            <Link href="#features" className="btn btn-ghost">See features</Link>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-5xl mx-auto py-16 grid md:grid-cols-3 gap-5">
          <Feature title="Infinite squishy canvas" body="Pan, zoom, drag — every connection wiggles, every node breathes. Designed to feel alive." />
          <Feature title="Click to think deeper" body="Click any node to focus and zoom; click again to open it. Add notes, attach images, change colours." />
          <Feature title="Share or stay private" body="Three visibility modes: private to you, unlisted with a shareable link, or fully public. You choose." />
          <Feature title="Auto-coloured branches" body="Every new child picks a colour that's different from its parent. Your maps look composed without effort." />
          <Feature title="Free forever, no limits" body="Unlimited maps, unlimited collaborators, unlimited storage. We mean it." />
          <Feature title="Delete in two clicks" body="Tired of us? Account → Delete account → confirm. No emails, no waiting period. Your data, your call." />
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto py-16 text-center">
          <h2 className="text-3xl font-semibold mb-4">Build your first map in under a minute.</h2>
          <p className="text-[--text-dim] mb-7">
            No credit card. No onboarding flow. Just sign up and start drawing
            connections between things you care about.
          </p>
          <Link href="/signup" className="btn btn-primary">Sign up free</Link>
        </section>

        <footer className="border-t border-white/5 py-8 text-center text-sm text-[--text-dim]">
          Built with too much affection · {new Date().getFullYear()}
        </footer>
      </main>

      <style>{`
        @keyframes wobble {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25%      { transform: scale(1.06) rotate(-3deg); }
          50%      { transform: scale(1.02) rotate(2deg); }
          75%      { transform: scale(1.08) rotate(3deg); }
        }
      `}</style>
    </>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-[--text-dim] leading-relaxed">{body}</p>
    </div>
  );
}
