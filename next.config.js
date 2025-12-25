/** @type {import('next').NextConfig} */

// Determine output mode based on environment
// - 'standalone' for server deployments (Render, Docker)
// - 'export' for static builds (Capacitor, Firebase Hosting)
const isServerBuild = process.env.BUILD_MODE === 'server' || process.env.RENDER === 'true';

const nextConfig = {
  // Use 'standalone' for server deployments (Render)
  // Use 'export' for mobile apps (Capacitor) and static hosting
  output: isServerBuild ? 'standalone' : 'export',
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true },
};

console.log(`[next.config.js] Build mode: ${isServerBuild ? 'standalone (server)' : 'export (static)'}`);

module.exports = nextConfig;
