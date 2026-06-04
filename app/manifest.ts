import type { MetadataRoute } from 'next';

// PWA manifest — lets the app be installable on mobile + Chrome desktop,
// plus satisfies the Lighthouse PWA / Best Practices checks. Theme colour
// matches the dark bg-1 from globals.css so the OS chrome blends in.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SquishyMind',
    short_name: 'SquishyMind',
    description: 'Your brain, but squishier. A mind-mapping web app.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0b16',
    theme_color: '#8b5cf6',
    icons: [
      {
        src: '/brain.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
