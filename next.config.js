/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  allowedDevOrigins: [
    '127.0.0.1:3000',
    'localhost:3000'
  ],
  turbopack: {
    root: __dirname
  },
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
  async redirects() {
    return [
      { source: '/action-queue', destination: '/crm', permanent: false },
      { source: '/data-sources', destination: '/crm', permanent: false },
      { source: '/communications', destination: '/crm', permanent: false }
    ];
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
      ]
    }];
  }
};

module.exports = nextConfig;
