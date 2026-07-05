import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ShareButtons from '@/components/ShareButtons';
import { posts, getPost, isPublished, publishedPosts, postImage } from '@/lib/blog-data';

const SITE = 'https://www.squishymind.com';

// Pre-render every post at build time.
export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post || !isPublished(post)) return { title: 'Not found — SquishyMind' };

  const url = `${SITE}/blog/${post.slug}`;
  const image = `${SITE}${postImage(post.slug)}`;
  return {
    title: `${post.title} | SquishyMind`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
      images: [{ url: image, width: 1200, height: 800, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [image],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  // Unknown slug OR a queued (future-dated) post both 404 until publish day.
  if (!post || !isPublished(post)) notFound();

  const url = `${SITE}/blog/${post.slug}`;

  // Related posts: same category first, then fill from the rest, max 3 —
  // drawn only from posts that are already live.
  const live = publishedPosts().filter((p) => p.slug !== post.slug);
  const related = [
    ...live.filter((p) => p.category === post.category),
    ...live.filter((p) => p.category !== post.category),
  ].slice(0, 3);

  const articleJsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.date,
      author: { '@type': 'Organization', name: post.author, url: SITE },
      publisher: {
        '@type': 'Organization',
        name: 'SquishyMind',
        url: SITE,
        logo: { '@type': 'ImageObject', url: `${SITE}/brain.svg` },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      url,
      image: [`${SITE}${postImage(post.slug)}`],
      keywords: post.tags.join(', '),
      articleSection: post.category,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    },
  ];

  return (
    <>
      {articleJsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <Header />
      <main className="px-6">
        <article className="max-w-[65ch] mx-auto pt-12 pb-8">
          {/* Breadcrumb */}
          <nav className="text-xs text-[--text-dim] mb-6" aria-label="Breadcrumb">
            <Link href="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <span className="mx-2" aria-hidden>
              /
            </span>
            <span>{post.category}</span>
          </nav>

          {/* Header */}
          <header className="mb-10">
            <h1 className="text-3xl md:text-5xl font-bold tracking-display mb-5 leading-[1.1]">
              {post.title}
            </h1>
            <div className="flex items-center gap-3 text-sm text-[--text-dim] flex-wrap">
              <span>{post.author}</span>
              <span aria-hidden>·</span>
              <time dateTime={post.date}>{post.dateDisplay}</time>
              <span aria-hidden>·</span>
              <span>{post.readingMinutes} min read</span>
            </div>
          </header>

          {/* Hero image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={postImage(post.slug)}
            alt={post.coverAlt || post.title}
            width={1200}
            height={800}
            className="w-full rounded-2xl border border-white/10 mb-10 aspect-[3/2] object-cover"
          />

          {/* Body */}
          <div
            className="prose-squishy"
            dangerouslySetInnerHTML={{ __html: post.body }}
          />

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t border-white/10">
            {post.tags.map((t) => (
              <span
                key={t}
                className="text-xs text-[--text-dim] px-2.5 py-1 rounded-full border border-white/10"
              >
                #{t}
              </span>
            ))}
          </div>
        </article>

        {/* Inline CTA */}
        <section className="max-w-2xl mx-auto py-10 text-center">
          <div className="glass rounded-2xl p-8">
            <div className="inline-block mb-4">
              <img src="/brain.svg" alt="" width={64} height={64} className="opacity-90 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Try it with your own brain</h2>
            <p className="text-[--text-dim] mb-6 leading-relaxed">
              SquishyMind is free during beta. Sign up in 10 seconds and lock in
              Founder Access — 40% off Premium, forever.
            </p>
            <Link href="/signup" className="btn btn-primary text-base px-7 py-3">
              Sign up free →
            </Link>
          </div>
        </section>

        {/* Related posts */}
        {related.length > 0 && (
          <section className="max-w-4xl mx-auto py-12">
            <h2 className="text-2xl font-bold mb-6">Keep reading</h2>
            <div className="grid md:grid-cols-3 gap-5">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="glass rounded-2xl overflow-hidden transition-all hover:border-white/20 hover:scale-[1.01] group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={postImage(p.slug)}
                    alt={p.coverAlt || p.title}
                    width={1200}
                    height={800}
                    className="w-full aspect-[3/2] object-cover border-b border-white/10"
                  />
                  <div className="p-5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                    {p.category}
                  </span>
                  <h3 className="font-semibold mt-2 mb-2 leading-snug group-hover:text-white transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-xs text-[--text-dim] leading-relaxed">
                    {p.readingMinutes} min read
                  </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <ShareButtons
          heading="Found this useful?"
          blurb="Share it with someone whose brain could use a squishier home."
          text={`"${post.title}" — from the SquishyMind blog`}
        />
      </main>
      <Footer />
    </>
  );
}
