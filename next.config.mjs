/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  poweredByHeader: false,
  images: { unoptimized: true },
  // লোকাল ডেভে /v/<slug> → /v পেজ (প্রোডাকশনে Firebase-এর rewrite কাজ করে)
  async rewrites() {
    return [{ source: '/v/:slug*', destination: '/v' }]
  },
}
export default nextConfig
