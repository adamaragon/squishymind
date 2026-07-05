import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ShareButtons from '@/components/ShareButtons';
import { competitors, getCompetitor } from '@/lib/compare-data';

const SITE = 'https://www.squishymind.com';

export function generateStaticParams() {
  return competitors.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getCompetitor(slug);
  if (!c) return { title: 'Not found — SquishyMind' };

  const url = `${SITE}/compare/${c.slug}`;
  return {
    title: `SquishyMind vs ${c.name} — Honest Comparison`,
    description: c.metaSeed,
    alternates: { canonical: url },
    openGraph: {
      title: `SquishyMind vs ${c.name}`,
      description: c.metaSeed,
      url,
      type: 'article',
    },
  };
}

export default async function CompareDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getCompetitor(slug);
  if (!c) notFound();

  const url = `${SITE}/compare/${c.slug}`;
  const others = competitors.filter((x) => x.slug !== c.slug);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Compare', item: `${SITE}/compare` },
        { '@type': 'ListItem', position: 3, name: `vs ${c.name}`, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `Is SquishyMind a good ${c.name} alternative?`,
          acceptedAnswer: { '@type': 'Answer', text: c.verdict },
        },
        {
          '@type': 'Question',
          name: `When should I pick ${c.name} over SquishyMind?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Pick ${c.name} if ${c.pickThemIf}`,
          },
        },
        {
          '@type': 'Question',
          name: `When should I pick SquishyMind over ${c.name}?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Pick SquishyMind if ${c.pickUsIf}`,
          },
        },
      ],
    },
  ];

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <Header />
      <main className="px-6">
        {/* Breadcrumb + hero */}
        <section className="max-w-3xl mx-auto pt-12 pb-10">
          <nav className="text-xs text-[--text-dim] mb-6" aria-label="Breadcrumb">
            <Link href="/compare" className="hover:text-white transition-colors">
              Compare
            </Link>
            <span className="mx-2" aria-hidden>/</span>
            <span>vs {c.name}</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-bold tracking-display mb-5 leading-[1.1]">
            SquishyMind vs <span className="gradient-text">{c.name}</span>
          </h1>
          <p className="text-sm text-[--text-dim] mb-6">{c.tagline}</p>
          <p className="text-lg text-[--text-dim] leading-relaxed">{c.intro}</p>
        </section>

        {/* Strengths / weaknesses */}
        <section className="max-w-4xl mx-auto pb-10 grid md:grid-cols-2 gap-5">
          <div className="glass rounded-2xl p-6">
            <h2 className="font-bold mb-3 text-emerald-400">Where {c.name} wins</h2>
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
            <h2 className="font-bold mb-3 text-pink-400">Where SquishyMind wins</h2>
            <ul className="space-y-2">
              {c.weaknesses.map((w) => (
                <li key={w} className="flex items-start gap-2 text-sm text-[--text-dim]">
                  <span className="text-violet-400 shrink-0 mt-0.5" aria-hidden>✓</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Decision guidance */}
        <section className="max-w-4xl mx-auto pb-10 grid md:grid-cols-2 gap-5">
          <div className="glass rounded-2xl p-6 border-white/10">
            <h2 className="font-bold mb-2">Pick {c.name} if…</h2>
            <p className="text-sm text-[--text-dim] leading-relaxed">{c.pickThemIf}</p>
          </div>
          <div className="glass rounded-2xl p-6 border-violet-500/20">
            <h2 className="font-bold mb-2">Pick SquishyMind if…</h2>
            <p className="text-sm text-[--text-dim] leading-relaxed">{c.pickUsIf}</p>
          </div>
        </section>

        {/* Bottom line */}
        <section className="max-w-3xl mx-auto pb-12">
          <div className="glass rounded-2xl p-7 border-violet-500/20">
            <h2 className="font-bold mb-3 text-sm uppercase tracking-wide text-[--text-dim]">
              Bottom line
            </h2>
            <p className="leading-relaxed text-[--text-dim]">{c.verdict}</p>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-6 pb-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Decide with your own hands.</h2>
          <p className="text-[--text-dim] mb-7 text-lg leading-relaxed">
            SquishyMind is free during beta. Sign up in 10 seconds, no credit card —
            and lock in Founder pricing for life.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/signup" className="btn btn-primary text-base px-7 py-3">
              Try SquishyMind free →
            </Link>
            <Link href="/features" className="btn btn-ghost text-base px-7 py-3">
              See all features
            </Link>
          </div>
        </section>

        {/* Other comparisons */}
        <section className="max-w-4xl mx-auto pb-12">
          <h2 className="text-xl font-bold mb-5">Compare with others</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/compare/${o.slug}`}
                className="glass rounded-xl p-4 text-sm transition-all hover:border-white/20 hover:scale-[1.01] group"
              >
                <span className="font-medium group-hover:text-white transition-colors">
                  vs {o.name}
                </span>
                <span className="block text-xs text-[--text-dim] mt-1">{o.tagline}</span>
              </Link>
            ))}
          </div>
        </section>

        <ShareButtons
          heading={`SquishyMind vs ${c.name}`}
          blurb="Know someone weighing up mind mapping tools? Send them the honest comparison."
          text={`SquishyMind vs ${c.name} — an honest comparison`}
        />
      </main>
      <Footer />
    </>
  );
}
