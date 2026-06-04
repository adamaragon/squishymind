import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { competitors } from '@/lib/compare-data';

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
  { feature: 'Founder pricing', squishy: '$2.99/month forever', note: 'Locked in at signup during beta — not a trial rate' },
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

const COMPETITORS = competitors;

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
              <Link
                href={`/compare/${c.slug}`}
                className="inline-block mt-4 text-sm text-violet-300 hover:text-white transition-colors"
              >
                Read the full SquishyMind vs {c.name} comparison →
              </Link>
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
