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
};
module.exports = nextConfig;
