/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
    serverExternalPackages: ["unpdf"],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
          { key: 'X-Frame-Options', value: 'ALLOWALL' }
        ]
      }
    ];
  }
};
module.exports = nextConfig;
