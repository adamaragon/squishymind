const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root so Turbopack stops picking up a stray
  // /Users/adam/package-lock.json a level above the repo and emitting
  // "Next.js inferred your workspace root" on every build.
  turbopack: {
    root: __dirname,
  },
  // outputFileTracingRoot is the analogous knob for the non-Turbopack
  // production build path. Same value.
  outputFileTracingRoot: path.join(__dirname),
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'squishymind.com' }],
        destination: 'https://www.squishymind.com/:path*',
        permanent: true,
      },
    ];
  },
  // Baseline security headers. Deliberately permissive on CSP — adding
  // a strict one is a separate exercise because the ElevenLabs convai
  // widget loads scripts/styles inline and over websocket connections
  // that need allowlisting. These four headers are uncontroversial and
  // satisfy the Lighthouse Best Practices checks.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Disallow framing entirely — there's no legitimate reason any
          // page on the app should be embedded elsewhere.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Tell browsers not to MIME-sniff responses.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Don't leak full URLs (with query strings, share tokens, etc.)
          // in the Referer header on outbound links.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Squishy needs the mic; nobody else does. Explicit allowlist
          // makes that visible and disables the rest by default.
          {
            key: 'Permissions-Policy',
            value: 'microphone=(self), camera=(), geolocation=(), payment=()',
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
