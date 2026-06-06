import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ShareButtons from '@/components/ShareButtons';
import { publishedPosts, postImage } from '@/lib/blog-data';

export const metadata = {
  title: 'Blog — Mind Mapping, Focus & Thinking Tools | SquishyMind',
  description:
    'Guides on mind mapping, ADHD-friendly focus, studying, team collaboration, and the SquishyMind voice AI. Think clearer, map faster — free during beta.',
  alternates: {
    canonical: 'https://www.squishymind.com/blog',
    types: {
      'application/rss+xml': 'https://www.squishymind.com/blog/feed.xml',
    },
  },
};

const SITE = 'https://www.squishymind.com';

const CATEGORY_TONE: Record<string, string> = {
  'Mind mapping': 'text-violet-300 border-violet-500/30 bg-violet-500/10',
  'ADHD & focus': 'text-pink-300 border-pink-500/30 bg-pink-500/10',
  Product: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10',
  Comparisons: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
  'How-to': 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
};

export default function BlogIndexPage() {
  const live = publishedPosts();
  const [featured, ...rest] = live;

  const blogJsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      '@id': `${SITE}/blog#blog`,
      name: 'The SquishyMind Blog',
      description:
        'Guides on mind mapping, ADHD-friendly focus, studying, collaboration, and AI-assisted thinking.',
      url: `${SITE}/blog`,
      publisher: { '@type': 'Organization', name: 'SquishyMind', url: SITE },
      blogPost: live.map((p) => ({
        '@type': 'BlogPosting',
        headline: p.title,
        description: p.description,
        datePublished: p.date,
        url: `${SITE}/blog/${p.slug}`,
        image: [`${SITE}${postImage(p.slug)}`],
        author: { '@type': 'Organization', name: p.author },
        keywords: p.tags.join(', '),
      })),
    },
  ];

  return (
    <>
      {blogJsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <Header />
      <main className="px-6">
        {/* Hero */}
        <section className="max-w-4xl mx-auto pt-16 pb-10 text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 leading-[1.05]">
            The <span className="gradient-text">SquishyMind</span> blog
          </h1>
          <p className="text-lg text-[--text-dim] max-w-2xl mx-auto leading-relaxed">
            Thinking out loud about mind mapping, focus, neurodivergent-friendly workflows,
            and what happens when you give a mind map a voice.
          </p>
        </section>

        {/* Featured post */}
        <section className="max-w-5xl mx-auto pb-12">
          <Link
            href={`/blog/${featured.slug}`}
            className="grid md:grid-cols-2 gap-6 md:gap-8 items-center glass rounded-3xl p-6 md:p-8 transition-all hover:border-white/20 hover:scale-[1.005] group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={postImage(featured.slug)}
              alt=""
              width={1200}
              height={800}
              className="w-full rounded-2xl border border-white/10 aspect-[3/2] object-cover order-first md:order-last"
            />
            <div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span
                className={`inline-block text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                  CATEGORY_TONE[featured.category] ?? 'text-[--text-dim] border-white/15'
                }`}
              >
                {featured.category}
              </span>
              <span className="text-xs text-[--text-dim]">
                {featured.dateDisplay} · {featured.readingMinutes} min read
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 leading-tight group-hover:text-white transition-colors">
              {featured.title}
            </h2>
            <p className="text-[--text-dim] leading-relaxed max-w-3xl">{featured.excerpt}</p>
            <span className="inline-block mt-5 text-sm text-violet-300 group-hover:text-white transition-colors">
              Read the article →
            </span>
            </div>
          </Link>
        </section>

        {/* Post grid */}
        <section className="max-w-5xl mx-auto pb-16 grid md:grid-cols-2 gap-5">
          {rest.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="glass rounded-2xl overflow-hidden flex flex-col transition-all hover:border-white/20 hover:scale-[1.01] group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={postImage(p.slug)}
                alt=""
                width={1200}
                height={800}
                className="w-full aspect-[3/2] object-cover border-b border-white/10"
              />
              <div className="p-6 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span
                  className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    CATEGORY_TONE[p.category] ?? 'text-[--text-dim] border-white/15'
                  }`}
                >
                  {p.category}
                </span>
                <span className="text-xs text-[--text-dim]">
                  {p.dateDisplay} · {p.readingMinutes} min
                </span>
              </div>
              <h3 className="font-semibold text-lg mb-2 leading-snug group-hover:text-white transition-colors">
                {p.title}
              </h3>
              <p className="text-sm text-[--text-dim] leading-relaxed flex-1">{p.excerpt}</p>
              </div>
            </Link>
          ))}
        </section>

        <ShareButtons
          heading="Read something useful?"
          blurb="Pass the SquishyMind blog to someone whose brain could use a squishier home."
          text="The SquishyMind blog — mind mapping, focus, and a voice AI that actually builds your map →"
        />
      </main>
      <Footer />
    </>
  );
}
