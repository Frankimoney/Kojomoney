/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use 'standalone' for development and Render backend
  // Use 'export' only when building for Firebase static hosting
  output: process.env.BUILD_MODE === 'static' ? 'export' : 'standalone',
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true },
};

module.exports = nextConfig;
