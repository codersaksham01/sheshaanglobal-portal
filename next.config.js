/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NETLIFY ? undefined : 'standalone',
  poweredByHeader: false,
  compress: true,
  allowedDevOrigins: [
    '127.0.0.1:3000',
    'localhost:3000'
  ],
  turbopack: {
    root: __dirname
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
