/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use 'export' for mobile apps (Capacitor) and static hosting
  // Use 'standalone' for server deployments only
  output: 'export',
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true },
};

module.exports = nextConfig;
