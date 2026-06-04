import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'SquishyMind vs Other Mind Mapping Tools — Honest Comparison',
  description:
    'How does SquishyMind compare to MindMeister, Miro, Mural, and Obsidian? Free to start, voice AI, real-time collaboration, and no lock-in. Free during beta.',
};

const SITE = 'https://www.squishymind.com';

const compareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
    { '@type': 'ListItem', position: 2, name: 'Compare', item: `${SITE}/compare` },
  ],
};

type CompRow = { feature: string; squishy: string; note?: string };

const FEATURE_MATRIX: CompRow[] = [
  { feature: 'Price to start', squishy: 'Free (beta)', note: 'No credit card ever required to get started' },
  { feature: 'Founder pricing', squishy: '$1.99/month forever', note: 'Locked in at signup during beta — not a trial rate' },
  { feature: 'Voice AI assistant', squishy: 'Yes — full canvas control', note: 'Squishy can add, move, expand nodes by voice' },
  { feature: 'AI text expansion', squishy: 'Yes', note: 'On any node, powered by GPT-4o-mini' },
  { feature: 'Real-time collaboration', squishy: 'Yes — live cursors + edits', note: 'Supabase Realtime, ~1s sync' },
  { feature: 'Threaded comments', squishy: 'Yes — on any node' },
  { feature: 'View modes', squishy: 'Canvas, Outline, Tree, Table' },
  { feature: 'Import formats', squishy: 'Markdown, CSV, OPML, JSON' },
  { feature: 'Export formats', squishy: 'PNG, PDF, JSON' },
  { feature: 'Templates', squishy: '8 pre-built templates' },
  { feature: 'PWA / installable', squishy: 'Yes' },
  { feature: 'Account deletion', squishy: '2 clicks, no exit interview' },
];

type Competitor = {
  slug: string;
  name: string;
  tagline: string;
  strengths: string[];
  weaknesses: string[];
  verdict: string;
};

const COMPETITORS: Competitor[] = [
  {
    slug: 'mindmeister',
    name: 'MindMeister',
    tagline: 'The established mind mapping tool',
    strengths: [
      'Long track record — in the market since 2007',
      'Polished presentation mode for sharing maps',
      'MeisterTask integration for project management',
    ],
    weaknesses: [
      'Free plan capped at 3 maps — forces upgrade fast',
      'No voice AI or conversational interface',
      'Dated UI — less expressive than modern tools',
      'More expensive at scale: $4.99–$8.99/month per user',
    ],
    verdict:
      'If you need presentation-quality output and don\'t mind a relatively old UI, MindMeister is solid. If you want voice AI, an animated canvas, and free access with no hard map cap, SquishyMind is the better call during beta.',
  },
  {
    slug: 'miro',
    name: 'Miro',
    tagline: 'The collaborative whiteboard platform',
    strengths: [
      'Extremely versatile — not just mind mapping',
      'Enterprise-grade — large teams, SSO, audit logs',
      'Huge template library',
    ],
    weaknesses: [
      'Free plan is read-only for guests and limited to 3 editable boards',
      'No dedicated mind map mode — everything is freeform',
      'Overkill for individual thinkers or small teams who just need maps',
      'No voice AI',
    ],
    verdict:
      'Miro is a whiteboard platform that happens to support mind maps. SquishyMind is a mind mapping app that happens to be collaborative. If mind mapping is your core use case — especially with voice AI — SquishyMind is more focused and more fun. If you need a general visual workspace for a large team, Miro is built for that.',
  },
  {
    slug: 'obsidian',
    name: 'Obsidian',
    tagline: 'The local-first knowledge base with graph view',
    strengths: [
      'Deeply local and private — all files live on your machine',
      'Hugely extensible plugin ecosystem',
      'Free for personal use',
    ],
    weaknesses: [
      'Graph view is not a mind mapping tool — it\'s a link graph',
      'No real-time collaboration built in (Sync is $10/month)',
      'Steep learning curve — you build your own system from scratch',
      'No voice AI',
    ],
    verdict:
      'Obsidian and SquishyMind are solving different problems. Obsidian is a local knowledge base for people who want full control of their files. SquishyMind is a visual thinking canvas for people who want to map ideas quickly — especially with voice. If you want Markdown-first, local, extensible: Obsidian. If you want visual, animated, collaborative, and voice-first: SquishyMind.',
  },
  {
    slug: 'coggle',
    name: 'Coggle',
    tagline: 'Simple collaborative mind maps',
    strengths: [
      'Very clean, simple UI — low learning curve',
      'Free plan is more generous than MindMeister',
      'Collaborative in real time',
    ],
    weaknesses: [
      'No voice AI or AI features of any kind',
      'Limited view modes — canvas only',
      'No import from Markdown, CSV, OPML',
      'Minimal template library',
    ],
    verdict:
      'Coggle is a clean, honest mind mapping tool. SquishyMind adds a voice AI assistant, multiple view modes, richer imports, and more personality. If simplicity is your only criterion, Coggle is fine. If you want voice, AI expansion, multiple views, and a mascot who argues with you sometimes, SquishyMind wins.',
  },
];

export default function ComparePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(compareJsonLd) }}
      />
      <Header />
      <main className="px-6">
        {/* Hero */}
        <section className="max-w-4xl mx-auto pt-16 pb-12 text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-5 leading-[1.05]">
            SquishyMind vs{' '}
            <span className="gradient-text">the alternatives</span>.
          </h1>
          <p className="text-lg text-[--text-dim] max-w-3xl mx-auto leading-relaxed mb-8">
            An honest comparison. We&apos;re not going to tell you MindMeister is evil or Miro is
            worthless. We&apos;ll tell you where we win, where they win, and let you decide.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {COMPETITORS.map((c) => (
              <a
                key={c.slug}
                href={`#${c.slug}`}
                className="px-4 py-1.5 rounded-full text-sm glass border border-white/10 text-[--text-dim] hover:text-white transition-colors"
              >
                vs {c.name}
              </a>
            ))}
          </div>
        </section>

        {/* Feature matrix */}
        <section className="max-w-4xl mx-auto pb-16">
          <h2 className="text-2xl font-semibold mb-6">What SquishyMind includes</h2>
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 font-medium text-[--text-dim]">Feature</th>
                  <th className="text-left px-6 py-4 font-medium">
                    <span className="gradient-text">SquishyMind</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_MATRIX.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={i < FEATURE_MATRIX.length - 1 ? 'border-b border-white/5' : ''}
                  >
                    <td className="px-6 py-3.5 text-[--text-dim]">
                      {row.feature}
                      {row.note && (
                        <span className="block text-xs text-[--text-dim] opacity-70 mt-0.5">
                          {row.note}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 font-medium">{row.squishy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Competitor comparisons */}
        {COMPETITORS.map((c, idx) => (
          <section
            key={c.slug}
            id={c.slug}
            className="max-w-4xl mx-auto pb-16 scroll-mt-8"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              SquishyMind vs {c.name}
            </h2>
            <p className="text-[--text-dim] mb-6 text-sm">{c.tagline}</p>
            <div className="grid md:grid-cols-2 gap-5 mb-6">
              <div className="glass rounded-2xl p-6">
                <h3 className="font-semibold mb-3 text-emerald-400">Where {c.name} wins</h3>
                <ul className="space-y-2">
                  {c.strengths.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-sm text-[--text-dim]">
                      <span className="text-emerald-400 shrink-0 mt-0.5" aria-hidden>+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass rounded-2xl p-6">
                <h3 className="font-semibold mb-3 text-pink-400">Where SquishyMind wins</h3>
                <ul className="space-y-2">
                  {c.weaknesses.map((w) => (
                    <li key={w} className="flex items-start gap-2 text-sm text-[--text-dim]">
                      <span className="text-violet-400 shrink-0 mt-0.5" aria-hidden>✓</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="glass rounded-2xl p-6 border-violet-500/20">
              <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-[--text-dim]">
                Bottom line
              </h3>
              <p className="text-sm leading-relaxed text-[--text-dim]">{c.verdict}</p>
            </div>
            {idx < COMPETITORS.length - 1 && <div className="mt-12 border-t border-white/5" />}
          </section>
        ))}

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            Try it and see for yourself.
          </h2>
          <p className="text-[--text-dim] mb-7 text-lg leading-relaxed">
            Free during beta. Sign up in 10 seconds, no credit card. If it&apos;s not for
            you, delete your account in two clicks.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/signup" className="btn btn-primary text-base px-7 py-3">
              Sign up free →
            </Link>
            <Link href="/features" className="btn btn-ghost text-base px-7 py-3">
              See all features
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
