/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: 'http://localhost/MeroMart/backend/:path*'
      }
    ]
  },
  // Enable debugging
  // experimental: {} // (no experimental options needed)
}

module.exports = nextConfig
