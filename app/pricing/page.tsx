import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ShareButtons from '@/components/ShareButtons';
import PageViewTracker from '@/components/PageViewTracker';

export const metadata = {
  title: 'Pricing — SquishyMind Mind Mapping App',
  description:
    'SquishyMind is free during beta. Sign up now and lock in Founder Access — $1.99/month forever when paid tiers launch. Unlimited maps, voice AI, and real-time collaboration.',
};

const SITE = 'https://www.squishymind.com';

const pricingJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Pricing', item: `${SITE}/pricing` },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'SquishyMind',
    description:
      'An infinite mind-mapping web app with voice AI, real-time collaboration, multiple view modes, and import/export.',
    url: `${SITE}/pricing`,
    brand: { '@type': 'Brand', name: 'SquishyMind' },
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: `${SITE}/signup`,
        description: '5 maps, 100 nodes per map, 20 voice minutes per month.',
      },
      {
        '@type': 'Offer',
        name: 'Squishy Premium',
        price: '3.99',
        priceCurrency: 'USD',
        billingIncrement: 1,
        priceValidUntil: '2026-12-31',
        availability: 'https://schema.org/PreOrder',
        url: `${SITE}/signup`,
        description: 'Unlimited maps and nodes, 200 voice minutes, AI expansion, collaboration.',
      },
      {
        '@type': 'Offer',
        name: 'Founder Access',
        price: '1.99',
        priceCurrency: 'USD',
        billingIncrement: 1,
        availability: 'https://schema.org/LimitedAvailability',
        url: `${SITE}/signup`,
        description: 'Half-price Premium forever, for beta-era signups only.',
      },
    ],
  },
];

type Tier = {
  name: string;
  badge?: string;
  badgeTone?: 'violet' | 'pink' | 'cyan';
  price: string;
  priceSub: string;
  tagline: string;
  features: string[];
  cta: { label: string; href: string; style: 'primary' | 'ghost' | 'muted' };
};

const TIERS: Tier[] = [
  {
    name: 'Free',
    price: '$0',
    priceSub: '/month',
    tagline: 'For trying things out.',
    features: [
      '5 maps',
      '100 nodes per map',
      '20 voice minutes/month',
      'Four themes',
      'Personal sharing (private / unlisted / public)',
    ],
    cta: { label: 'Sign up free', href: '/signup', style: 'ghost' },
  },
  {
    name: 'Squishy Premium',
    badge: 'Most popular',
    badgeTone: 'violet',
    price: '$3.99',
    priceSub: '/month — or $29.99/year',
    tagline: 'For people who think with their mouths open.',
    features: [
      'Unlimited maps',
      'Unlimited nodes',
      '200 voice minutes/month',
      'AI text expansion',
      'Image attachments',
      'Real-time collaboration (3 collaborators)',
      'Threaded comments',
      'All imports — Markdown, CSV, OPML, JSON',
      'All view modes — Canvas, Tree, Outline, Table',
      'PNG and PDF export',
      'No SquishyMind footer on shared maps',
    ],
    cta: {
      label: 'Coming soon — sign up during beta to lock in Founder pricing',
      href: '/signup',
      style: 'muted',
    },
  },
  {
    name: 'Founder Access',
    badge: 'Beta signups only',
    badgeTone: 'pink',
    price: '$1.99',
    priceSub: '/month — or $14.99/year, forever',
    tagline: 'For people who showed up early.',
    features: [
      'Everything in Premium',
      'Plus: a more generous free tier you keep even if you cancel — 8 maps, 150 nodes per map, 40 voice minutes/month',
      'Plus: Founder badge on your profile',
      'Plus: early access to new features',
    ],
    cta: {
      label: 'Sign up now — beta closes when paid tiers launch',
      href: '/signup',
      style: 'primary',
    },
  },
];

const BADGE_TONES: Record<NonNullable<Tier['badgeTone']>, string> = {
  violet: 'bg-violet-500/15 border-violet-500/40 text-violet-200',
  pink: 'bg-pink-500/15 border-pink-500/40 text-pink-200',
  cyan: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200',
};

export default function PricingPage() {
  return (
    <>
      {pricingJsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <PageViewTracker event="pricing_visited" />
      <Header />
      <main className="px-6">
        {/* Hero */}
        <section className="max-w-4xl mx-auto pt-16 pb-10 text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
            <span className="gradient-text">Simple pricing.</span> We say what we mean.
          </h1>
          <p className="text-lg text-[--text-dim] max-w-2xl mx-auto leading-relaxed">
            Beta is free. Founder Access pricing locks in when you sign up before we launch
            paid tiers.
          </p>
        </section>

        {/* Tiers */}
        <section className="max-w-6xl mx-auto pb-10 grid md:grid-cols-3 gap-5">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`glass rounded-2xl p-7 flex flex-col relative ${
                tier.name === 'Founder Access'
                  ? 'border-pink-500/40 shadow-[0_0_40px_rgba(236,72,153,0.15)]'
                  : ''
              }`}
            >
              {tier.badge && tier.badgeTone && (
                <span
                  className={`absolute -top-3 left-7 inline-block text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${BADGE_TONES[tier.badgeTone]}`}
                >
                  {tier.badge}
                </span>
              )}
              <h2 className="text-xl font-semibold mb-1">{tier.name}</h2>
              <p className="text-sm text-[--text-dim] mb-5">{tier.tagline}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">{tier.price}</span>
                <span className="text-sm text-[--text-dim] ml-1">{tier.priceSub}</span>
              </div>
              <ul className="text-sm space-y-2.5 mb-7 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-violet-400 mt-0.5 shrink-0" aria-hidden>
                      ✓
                    </span>
                    <span className="text-[--text-dim]">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={tier.cta.href}
                className={
                  tier.cta.style === 'primary'
                    ? 'btn btn-primary text-sm'
                    : tier.cta.style === 'ghost'
                      ? 'btn btn-ghost text-sm'
                      : 'btn btn-ghost text-sm opacity-70 cursor-default pointer-events-none'
                }
              >
                {tier.cta.label}
              </Link>
            </div>
          ))}
        </section>

        {/* Footnote */}
        <section className="max-w-3xl mx-auto pb-16 px-6 text-center">
          <p className="text-xs text-[--text-dim] leading-relaxed">
            Voice minute allowances reflect what we can sustainably offer given the cost
            of running our voice agent. Heavy use beyond the limit pauses voice until next
            month — everything else keeps working.
          </p>
          <p className="text-xs text-[--text-dim] leading-relaxed mt-3">
            Want the longer story? Read about{' '}
            <Link href="/founder-access" className="underline hover:text-white">
              Founder Access
            </Link>
            .
          </p>
        </section>

        <ShareButtons
          heading="Know someone who'd grab Founder pricing?"
          blurb="Share this page — it'll save them money for life."
          text="SquishyMind has $1.99/mo Founder pricing during beta — limited time"
        />
      </main>
      <Footer />
    </>
  );
}
