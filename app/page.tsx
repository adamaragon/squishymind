import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BetaBanner from '@/components/BetaBanner';
import SquishyCTA from '@/components/SquishyCTA';
import RecentShipped from '@/components/RecentShipped';
import FAQ from '@/components/FAQ';

export default function HomePage() {
  return (
    <>
      <Header />

      <main className="px-6">
        {/* HERO */}
        <section className="max-w-5xl mx-auto pt-10 md:pt-14 pb-16 text-center">
          <BetaBanner />
          <div className="flex justify-center mt-8 mb-6">
            <div className="animate-[wobble_3.6s_ease-in-out_infinite] origin-bottom">
              <img src="/brain.svg" alt="" width={160} height={130} />
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
            Your brain, but{' '}
            <span className="gradient-text">squishier</span>.
          </h1>
          <p className="text-lg md:text-xl text-[--text-dim] mb-9 max-w-3xl mx-auto leading-relaxed">
            A wobbly, slightly sentient mind-mapping canvas with a voice agent who flirts with the
            conversation and occasionally short-circuits. Or just{' '}
            <em className="text-white">click and drag</em> like a normal person — both work.{' '}
            <span className="text-white">Free during beta.</span>
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/signup" className="btn btn-primary text-base px-7 py-3">
              Lock in free forever →
            </Link>
            <Link href="#features" className="btn btn-ghost text-base px-7 py-3">
              Tell me more
            </Link>
          </div>
          <p className="text-xs text-[--text-dim] mt-5">
            No credit card. No email confirmation. No onboarding flow trying to learn your “goals.”
            10 seconds, then you&apos;re mapping.
          </p>
        </section>

        {/* Squishy section */}
        <SquishyCTA />

        {/* Feature grid */}
        <section
          id="features"
          className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-5"
        >
          <Feature
            title="She talks back"
            body="Squishy creates branches, moves them around, summarizes your structure, builds entire subtrees on command. Or you can ignore her. She copes."
          />
          <Feature
            title="Wobbly by design"
            body="Every node breathes. Every edge wiggles. The brain in the middle pulses gently. It feels alive because we put a lot of work into making it feel alive. We have priorities."
          />
          <Feature
            title="Mouse and keyboard work too"
            body="Voice is a feature, not a requirement. Click, drag, type, ignore Squishy entirely if that's your preference. SquishyMind is a perfectly good mind-mapping tool with a strange friend in the corner."
          />
          <Feature
            title="Auto-coloured branches"
            body="Every new child picks a colour different from its parent. Your maps look composed without you thinking about colour theory. We did the colour theory so you don't have to."
          />
          <Feature
            title="Yours across devices"
            body="Sign up once, your maps follow you to any browser. Sharing works with public, unlisted, and private links. Like a haunted notebook, but useful."
          />
          <Feature
            title="Free during beta. Actually forever."
            body="Sign up while the banner's still up and it stays free for you, regardless of what we charge later. Even if our future investors get ideas. We've put it in writing."
          />
        </section>

        {/* Recently shipped */}
        <RecentShipped />

        {/* FAQ */}
        <FAQ />

        {/* Final CTA */}
        <section className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            There&apos;s a brain in the corner waiting to meet you.
          </h2>
          <p className="text-[--text-dim] mb-7 text-lg leading-relaxed">
            Sign up while we&apos;re in beta and your account stays free forever.
            Or just click the brain in the bottom-right and have Squishy do the talking — your call.
          </p>
          <Link href="/signup" className="btn btn-primary text-base px-8 py-3">
            Sign up — free forever
          </Link>
          <p className="text-xs text-[--text-dim] mt-4">
            We promise this is the last time we&apos;ll ask.
          </p>
        </section>
      </main>

      <Footer />

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
