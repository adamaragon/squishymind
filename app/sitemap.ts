import type { MetadataRoute } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.squishymind.com';

// Static + dynamic sitemap. Includes the public marketing pages and every
// mindmap with visibility='public' (those are the only mindmaps we want
// crawled — unlisted maps deliberately aren't enumerable, private maps
// don't read without auth).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE}/pricing`, changeFrequency: 'monthly', priority: 0.8 },
    {
      url: `${SITE}/founder-access`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    { url: `${SITE}/changelog`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE}/signup`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/login`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  // Public mindmaps. Wrapped in try/catch so a Supabase outage during build
  // doesn't break the sitemap entirely — the static pages still ship.
  let publicMaps: MetadataRoute.Sitemap = [];
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('mindmaps')
      .select('share_token, slug, updated_at, visibility')
      .eq('visibility', 'public');
    if (data) {
      publicMaps = data
        .filter((m) => m.share_token)
        .map((m) => ({
          url: `${SITE}/share/${m.share_token}`,
          lastModified: m.updated_at ? new Date(m.updated_at) : undefined,
          changeFrequency: 'weekly' as const,
          priority: 0.4,
        }));
    }
  } catch {
    /* sitemap should never block deploy; degrade gracefully */
  }

  return [...staticPages, ...publicMaps];
}
