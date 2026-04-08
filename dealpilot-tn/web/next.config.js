/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["unpdf"],
  },
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
  ,
  webpack: (config, { dev }) => {
    // Avoid dev-time "EMFILE: too many open files" by switching
    // Watchpack/webpack to polling-based watching.
    if (dev) {
      config.watchOptions = {
        ...(config.watchOptions || {}),
        poll: 1000,
        aggregateTimeout: 300,
        // Keep this as a simple array: some webpack versions allow `ignored`
        // to be RegExp/string/function, and spreading it can crash.
        ignored: ['**/.next/**', '**/node_modules/**', '**/dist/**'],
      };
    }
    config.externals = [...(Array.isArray(config.externals) ? config.externals : []), { canvas: 'canvas' }]
    return config;
  },
};
module.exports = nextConfig;
