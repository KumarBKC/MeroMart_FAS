/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: 'http://localhost:8080/MeroMart/backend/:path*'
      }
    ]
  },
  devIndicators: false,
  // Enable debugging
  // experimental: {} // (no experimental options needed)
}

module.exports = nextConfig
