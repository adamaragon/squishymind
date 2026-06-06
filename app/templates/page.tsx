import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ShareButtons from '@/components/ShareButtons';
import { templates } from '@/lib/templates';
import type { MindMapData } from '@/lib/types';

export const metadata = {
  title: 'Mind Map Templates — Campaigns, SEO, Web Builds & More | SquishyMind',
  description:
    'Free, professional mind map templates: marketing campaigns, SEO projects, website builds, product launches, content strategy, and creative briefs — real work, mapped.',
  alternates: { canonical: 'https://www.squishymind.com/templates' },
};

const SITE = 'https://www.squishymind.com';

// The deep professional templates lead; these ids get the full-outline treatment.
const PRO_IDS = [
  'marketing-campaign',
  'seo-project',
  'website-build',
  'product-launch',
  'content-strategy',
  'creative-brief',
  'fishbone',
  'priority-matrix',
  'roadmap-timeline',
  'kanban',
];

type OutlineNode = { label: string; note: string; children: OutlineNode[] };

// Turn template MindMapData into a nested outline (skipping the root).
function toOutline(data: MindMapData): OutlineNode[] {
  const build = (id: string): OutlineNode => {
    const n = data.nodes[id];
    return {
      label: n?.label ?? '',
      note: n?.note ?? '',
      children: (data.childIndex[id] || []).map(build),
    };
  };
  if (!data.rootId) return [];
  return (data.childIndex[data.rootId] || []).map(build);
}

function countNodes(data: MindMapData): number {
  return Object.keys(data.nodes).length;
}

function Branch({ node, depth }: { node: OutlineNode; depth: number }) {
  return (
    <li className="mt-1.5">
      <span className={depth === 0 ? 'font-semibold text-white' : 'text-[--text-dim]'}>
        {node.label}
      </span>
      {node.note && depth === 0 && (
        <span className="text-[--text-dim] text-xs italic ml-2">— {node.note}</span>
      )}
      {node.children.length > 0 && depth < 1 && (
        <ul className="ml-4 mt-1 border-l border-white/10 pl-3">
          {node.children.map((c, i) => (
            <Branch key={i} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function TemplatesPage() {
  const pro = PRO_IDS.map((id) => templates.find((t) => t.id === id)).filter(
    (t): t is NonNullable<typeof t> => Boolean(t),
  );
  const rest = templates.filter((t) => !PRO_IDS.includes(t.id));

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Templates', item: `${SITE}/templates` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'SquishyMind mind map templates',
      itemListElement: templates.map((t, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: t.name,
        description: t.description,
      })),
    },
  ];

  return (
    <>
      {jsonLd.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}
      <Header />
      <main className="px-6">
        {/* Hero */}
        <section className="max-w-4xl mx-auto pt-16 pb-10 text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 leading-[1.05]">
            Templates for <span className="gradient-text">real work</span>
          </h1>
          <p className="text-lg text-[--text-dim] max-w-2xl mx-auto leading-relaxed">
            Not blank canvases with a title. Each of these is a complete plan — a marketing
            campaign, an SEO project, a website build — mapped the way a pro would actually
            run it. Start from one and make it yours.
          </p>
          <div className="mt-7">
            <Link href="/signup" className="btn btn-primary text-base px-7 py-3">
              Start free with any template →
            </Link>
          </div>
        </section>

        {/* Pro templates — full outline */}
        <section className="max-w-5xl mx-auto pb-8 grid md:grid-cols-2 gap-5">
          {pro.map((t) => {
            const outline = toOutline(t.data);
            return (
              <div key={t.id} className="glass rounded-2xl p-7 flex flex-col">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl" aria-hidden>{t.icon}</span>
                  <h2 className="text-xl font-bold">{t.name}</h2>
                </div>
                <p className="text-sm text-[--text-dim] leading-relaxed mb-4">{t.description}</p>
                <div className="text-[11px] uppercase tracking-wider text-violet-300 mb-2">
                  {countNodes(t.data)} nodes · what’s inside
                </div>
                <ul className="text-sm flex-1">
                  {outline.map((n, i) => (
                    <Branch key={i} node={n} depth={0} />
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="btn btn-ghost text-sm mt-5 self-start"
                >
                  Use this template →
                </Link>
              </div>
            );
          })}
        </section>

        {/* The rest — compact */}
        <section className="max-w-5xl mx-auto pb-12">
          <h2 className="text-xl font-semibold mb-4">More starting points</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rest.map((t) => (
              <div key={t.id} className="glass rounded-xl p-5">
                <div className="text-2xl mb-2" aria-hidden>{t.icon}</div>
                <h3 className="font-semibold mb-1">{t.name}</h3>
                <p className="text-xs text-[--text-dim] leading-relaxed">{t.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-6 pb-14 text-center">
          <h2 className="text-3xl font-semibold mb-4">Or just tell Squishy what you’re working on.</h2>
          <p className="text-[--text-dim] mb-7 text-lg leading-relaxed">
            Describe your project out loud and the voice AI sets up the right structure for you —
            no template hunting required. Free during beta.
          </p>
          <Link href="/signup" className="btn btn-primary text-base px-7 py-3">
            Sign up free →
          </Link>
        </section>

        <ShareButtons
          heading="Know someone planning a campaign or a build?"
          blurb="Send them a starting point that isn’t a blank page."
          text="Free, deep mind map templates — campaigns, SEO, web builds & more, on SquishyMind →"
        />
      </main>
      <Footer />
    </>
  );
}
