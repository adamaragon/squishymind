import { publishedPosts, postImage } from '@/lib/blog-data';

const SITE = 'https://www.squishymind.com';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// RSS 2.0 feed of published posts. Rebuilt per request (cached 1h) so queued
// posts appear automatically once their publish date arrives.
export const revalidate = 3600;

export function GET() {
  const live = publishedPosts();
  const updated = live[0]?.date ?? new Date().toISOString().slice(0, 10);

  const items = live
    .map((p) => {
      const url = `${SITE}/blog/${p.slug}`;
      const img = `${SITE}${postImage(p.slug)}`;
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.date + 'T09:00:00Z').toUTCString()}</pubDate>
      <category>${esc(p.category)}</category>
      <description>${esc(p.excerpt)}</description>
      <enclosure url="${img}" type="image/jpeg" />
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The SquishyMind Blog</title>
    <link>${SITE}/blog</link>
    <atom:link href="${SITE}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <description>Mind mapping, focus, neurodivergent-friendly workflows, and AI-assisted thinking.</description>
    <language>en</language>
    <lastBuildDate>${new Date(updated + 'T09:00:00Z').toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
