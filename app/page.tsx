import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ShareButtons from '@/components/ShareButtons';
import BetaBanner from '@/components/BetaBanner';
import SquishyCTA from '@/components/SquishyCTA';
import RecentShipped from '@/components/RecentShipped';
import FAQ from '@/components/FAQ';

const SITE = 'https://www.squishymind.com';

const homepageJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE}/#organization`,
      name: 'SquishyMind',
      url: SITE,
      logo: { '@type': 'ImageObject', url: `${SITE}/brain.svg` },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      url: SITE,
      name: 'SquishyMind',
      description: 'A wobbly, lovely, infinite mind-mapping canvas. Free, sign-up takes 10 seconds.',
      publisher: { '@id': `${SITE}/#organization` },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE}/#app`,
      name: 'SquishyMind',
      applicationCategory: 'ProductivityApplication',
      operatingSystem: 'Web',
      url: SITE,
      description:
        'A mind-mapping web app with a voice AI assistant, real-time collaboration, and beautiful animations. Free during beta.',
      featureList: [
        'Voice AI assistant (Squishy)',
        'Real-time collaboration with live cursors',
        'Infinite canvas mind mapping',
        'Multiple view modes — Canvas, Outline, Tree, Table',
        'Import from Markdown, CSV, OPML, JSON',
        'PNG and PDF export',
        'Threaded comments on nodes',
        'Pre-built templates',
        'AI text expansion',
        'Image attachments',
      ],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageJsonLd) }}
      />
      <Header />

      <main className="px-4 sm:px-6">
        {/* HERO */}
        <section className="max-w-5xl mx-auto pt-8 sm:pt-12 md:pt-20 pb-20 text-center">
          <BetaBanner />
          <div className="flex justify-center mt-8 sm:mt-10 mb-6 sm:mb-8">
            <div className="brain-enter animate-[wobble_3.6s_ease-in-out_infinite] origin-bottom w-[120px] h-[100px] sm:w-[240px] sm:h-[200px]" style={{ animationDelay: '0s, 0.8s' }}>
              <img src="/brain.svg" alt="" width={240} height={200} className="w-full h-full" />
            </div>
          </div>
          <h1 className="text-display font-bold tracking-display mb-8 leading-tight md:leading-[1.02]">
            Your brain, but{' '}
            <span className="gradient-text">squishier</span>.
          </h1>
          <p className="text-lg md:text-xl text-[--text-dim] mb-10 max-w-3xl mx-auto leading-relaxed">
            A wobbly, slightly sentient mind-mapping canvas you can talk to, build with friends, or
            click and drag like a normal person.{' '}
            <span className="text-white">
              Beta is free. Founders get a permanent discount when paid tiers launch.
            </span>
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/signup" className="btn btn-primary text-lg px-10 py-4">
              Claim Founder Access →
            </Link>
            <Link href="#features" className="btn btn-ghost text-base px-7 py-3">
              Tell me more
            </Link>
          </div>
          <p className="text-xs text-[--text-dim] mt-6">
            No credit card. No email confirmation. No onboarding flow trying to learn your &ldquo;goals.&rdquo;
            10 seconds, then you&apos;re mapping.
          </p>
        </section>

        {/* Squishy section */}
        <SquishyCTA />

        {/* Feature grid */}
        <section
          id="features"
          className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 grid md:grid-cols-3 gap-4 sm:gap-5"
        >
          <div className="glass rounded-2xl p-8 feature-card md:col-span-2 grid md:grid-cols-[auto,1fr] gap-7 items-center">
            <div
              className="feature-icon !w-[56px] !h-[56px] !rounded-[14px] flex-shrink-0"
              style={{
                background: ACCENT_STYLE.pink.bg,
                boxShadow: `0 12px 28px ${ACCENT_STYLE.pink.glow}, 0 0 0 1px ${ACCENT_STYLE.pink.ring} inset`,
                color: ACCENT_STYLE.pink.fg,
              }}
              aria-hidden
            >
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5 h13 a3 3 0 0 1 3 3 v6 a3 3 0 0 1 -3 3 h-5 l-4 3 v-3 h-4 a3 3 0 0 1 -3 -3 v-6 a3 3 0 0 1 3 -3 z" />
                <circle cx="9" cy="11" r="0.9" fill="currentColor" stroke="none" />
                <circle cx="13" cy="11" r="0.9" fill="currentColor" stroke="none" />
                <circle cx="17" cy="11" r="0.9" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-xl mb-2">She talks back</h3>
              <p className="text-sm text-[--text-dim] leading-relaxed">
                Squishy creates branches, moves them, summarizes your structure, builds entire subtrees on command. Or argues with you. She&apos;s been argued with.
              </p>
            </div>
          </div>
          <Feature
            accent="violet"
            icon={
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="8" height="8" rx="1.6" />
                <rect x="13" y="3" width="8" height="8" rx="1.6" />
                <rect x="3" y="13" width="8" height="8" rx="1.6" />
                <rect x="13" y="13" width="8" height="8" rx="1.6" fill="currentColor" stroke="none" opacity="0.35" />
              </svg>
            }
            title="Start from a template"
            body="Eight pre-built starting points — project plans, decision trees, second brains. Squishy can suggest one when you stare at an empty brain too long."
          />
          <Feature
            accent="cyan"
            icon={
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="8" r="3" />
                <path d="M3 20 c0 -3.3 2.7 -6 6 -6 s6 2.7 6 6" />
                <circle cx="17" cy="6" r="2.4" />
                <path d="M14.5 20 c0 -2.5 2 -4.5 4.5 -4.5 s4.5 2 4.5 4.5" />
              </svg>
            }
            title="Build together, live"
            body="Invite teammates as editors or commenters. See their cursors, watch their edits land in real time. Threaded comments on every node."
          />
          <Feature
            accent="amber"
            icon={
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2.5" y="5" width="14" height="10" rx="1.6" />
                <path d="M2.5 18 h14" />
                <rect x="17.5" y="9" width="5" height="11" rx="1.2" />
                <path d="M19 18.5 h2" />
              </svg>
            }
            title="Yours across devices"
            body="Sign up once, your maps follow you to any browser. Sharing works with public, unlisted, and private links. Like a haunted notebook, but useful."
          />
          <Feature
            accent="emerald"
            icon={
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2.5" width="6" height="13" rx="3" />
                <path d="M5.5 11.5 a6.5 6.5 0 0 0 13 0" />
                <path d="M12 18 v3.5" />
                <path d="M9 21.5 h6" />
              </svg>
            }
            title="Voice optional"
            body="Click, drag, type, ignore Squishy entirely if that's your preference. SquishyMind is a perfectly good mind-mapping tool with a strange friend in the corner."
          />
          <Feature
            accent="pink"
            icon={
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3 L13.8 9.2 L20 11 L13.8 12.8 L12 19 L10.2 12.8 L4 11 L10.2 9.2 Z" />
                <path d="M19 3.5 L19.7 5.3 L21.5 6 L19.7 6.7 L19 8.5 L18.3 6.7 L16.5 6 L18.3 5.3 Z" strokeWidth="1.3" />
                <path d="M5 16 L5.6 17.4 L7 18 L5.6 18.6 L5 20 L4.4 18.6 L3 18 L4.4 17.4 Z" strokeWidth="1.3" />
              </svg>
            }
            title="Free during beta. Forever."
            body="Sign up while the banner's still up and it stays free for you, regardless of what we charge later. Even if our future investors get ideas."
          />
        </section>

        {/* More good things — rotated-out feature cards live here */}
        <details className="more-good-things max-w-6xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16 group">
          <summary className="cursor-pointer text-center text-sm text-[--text-dim] hover:text-white transition-colors py-3 select-none list-none">
            <span className="inline-flex items-center gap-2">
              <span>More good things</span>
              <span className="inline-block transition-transform duration-200 group-open:rotate-180">
                ↓
              </span>
            </span>
          </summary>
          <div className="grid md:grid-cols-3 gap-5 mt-5">
            <Feature
              accent="violet"
              icon={
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 14 q 3 -7 6 0 t 6 0 t 6 0 t 6 0" />
                </svg>
              }
              title="Wobbly by design"
              body="Every node breathes. Every edge wiggles. The brain in the middle pulses gently. It feels alive because we put a lot of work into making it feel alive. We have priorities."
            />
            <Feature
              accent="cyan"
              icon={
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2.5 a9.5 9.5 0 1 0 0 19 c1.4 0 2.5 -1.1 2.5 -2.5 0 -.6 -.3 -1.2 -.7 -1.7 -.4 -.4 -.7 -1 -.7 -1.6 0 -1.2 1 -2.2 2.2 -2.2 h2.2 a4 4 0 0 0 4 -4 c0 -4 -4.4 -7 -9.5 -7 z" />
                  <circle cx="7.5" cy="11" r="1.2" fill="currentColor" stroke="none" />
                  <circle cx="12" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
                  <circle cx="16.5" cy="11" r="1.2" fill="currentColor" stroke="none" />
                </svg>
              }
              title="Auto-coloured branches"
              body="Every new child picks a colour different from its parent. Your maps look composed without you thinking about colour theory. We did the colour theory so you don't have to."
            />
            <Feature
              accent="amber"
              icon={
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6.5 H 20" />
                  <path d="M8 6.5 V 4.5 a1.5 1.5 0 0 1 1.5 -1.5 h5 a1.5 1.5 0 0 1 1.5 1.5 V 6.5" />
                  <path d="M6 6.5 V 19.5 a2 2 0 0 0 2 2 h8 a2 2 0 0 0 2 -2 V 6.5" />
                  <path d="M10 10.5 V 17.5" />
                  <path d="M14 10.5 V 17.5" />
                </svg>
              }
              title="Delete in two clicks"
              body="When you're done with us, you're done. Account page, two clicks, no email confirmation, no exit interview. Your maps go with you. Reluctantly, on our end."
            />
          </div>
        </details>

        {/* Share row — sits above Recently Shipped because share intent
            peaks right after someone's just read the feature pitch, not
            two scroll-screens later by the footer. */}
        <ShareButtons
          heading="Like SquishyMind? Pass it on."
          blurb="Beam the squishy brain to a friend on whatever they use — X, WhatsApp, Messenger, email…"
          text="Your brain, but squishier. Try SquishyMind →"
        />

        {/* Recently shipped */}
        <RecentShipped />

        {/* FAQ */}
        <FAQ />

        {/* Final CTA */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-5 leading-tight">
            There&apos;s a brain in the corner waiting to meet you.
          </h2>
          <p className="text-[--text-dim] mb-9 text-lg leading-relaxed">
            Sign up during beta to lock in Founder Access — Premium for 40% off,
            forever. Or just click the brain in the bottom-right and have Squishy do
            the talking — your call.
          </p>
          <Link href="/signup" className="btn btn-primary text-lg px-10 py-4">
            Sign up — claim Founder Access
          </Link>
          <p className="text-xs text-[--text-dim] mt-5">
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
        /* Hide the native disclosure triangle in Safari/old browsers so the
           caret in the summary is the only indicator. */
        .more-good-things summary::-webkit-details-marker { display: none; }
        .more-good-things summary::marker { content: ''; }

        /* Feature card — slight lift on hover so the grid responds to a
           reader's attention. The icon chip wiggles its head as a small
           personality moment when the card is hovered. */
        .feature-card {
          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            box-shadow 0.18s ease;
        }
        .feature-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.18);
        }
        .feature-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .feature-card:hover .feature-icon {
          animation: wobble 0.65s ease, glow-pulse 0.65s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes glow-pulse {
          0%   { filter: brightness(1) drop-shadow(0 0 0 transparent); }
          50%  { filter: brightness(1.25) drop-shadow(0 0 12px currentColor); }
          100% { filter: brightness(1) drop-shadow(0 0 0 transparent); }
        }
      `}</style>
    </>
  );
}

type FeatureAccent = 'pink' | 'violet' | 'cyan' | 'amber' | 'emerald';

// Per-accent gradient + glow colours for the icon chip. Each card picks an
// accent so the grid reads as five distinct flavours instead of one tone.
const ACCENT_STYLE: Record<FeatureAccent, { bg: string; glow: string; ring: string; fg: string }> = {
  pink: {
    bg: 'linear-gradient(135deg, #ec4899, #f43f6f)',
    glow: 'rgba(236, 72, 153, 0.35)',
    ring: 'rgba(236, 72, 153, 0.45)',
    fg: '#fff',
  },
  violet: {
    bg: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
    glow: 'rgba(139, 92, 246, 0.35)',
    ring: 'rgba(139, 92, 246, 0.45)',
    fg: '#fff',
  },
  cyan: {
    bg: 'linear-gradient(135deg, #06b6d4, #22d3ee)',
    glow: 'rgba(6, 182, 212, 0.35)',
    ring: 'rgba(6, 182, 212, 0.45)',
    fg: '#fff',
  },
  amber: {
    bg: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    glow: 'rgba(245, 158, 11, 0.35)',
    ring: 'rgba(245, 158, 11, 0.45)',
    fg: '#fff',
  },
  emerald: {
    bg: 'linear-gradient(135deg, #10b981, #34d399)',
    glow: 'rgba(16, 185, 129, 0.35)',
    ring: 'rgba(16, 185, 129, 0.45)',
    fg: '#fff',
  },
};

function Feature({
  title,
  body,
  icon,
  accent = 'violet',
}: {
  title: string;
  body: string;
  icon?: React.ReactNode;
  accent?: FeatureAccent;
}) {
  const style = ACCENT_STYLE[accent];
  return (
    <div className="glass rounded-2xl p-6 feature-card">
      {icon && (
        <div
          className="feature-icon"
          style={{
            background: style.bg,
            boxShadow: `0 8px 20px ${style.glow}, 0 0 0 1px ${style.ring} inset`,
            color: style.fg,
          }}
          aria-hidden
        >
          {icon}
        </div>
      )}
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-[--text-dim] leading-relaxed">{body}</p>
    </div>
  );
}
