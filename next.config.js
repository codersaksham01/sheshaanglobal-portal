/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    '127.0.0.1:3000',
    'localhost:3000'
  ],
  turbopack: {
    root: __dirname
  }
};

module.exports = nextConfig;
