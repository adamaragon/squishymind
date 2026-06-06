import type { MetadataRoute } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.squishymind.com';

// Robots policy:
// - Allow all marketing + auth pages (signup/login show up in branded results)
// - Block authenticated UI (dashboard / account / m / share are per-user;
//   no SEO value, lots of duplicate-content risk)
// - Block admin entirely
// - Block API routes — those are JSON endpoints, never user-facing
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/features',
          '/templates',
          '/use-cases',
          '/compare',
          '/blog',
          '/pricing',
          '/founder-access',
          '/changelog',
          '/signup',
          '/login',
        ],
        disallow: [
          '/dashboard',
          '/account',
          '/m/',
          '/share/',
          '/admin',
          '/admin/',
          '/api/',
          '/auth/',
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
