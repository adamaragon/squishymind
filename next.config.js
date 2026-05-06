/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
