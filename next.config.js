/** @type {import('next').NextConfig} */

// Determine output mode based on environment
// - undefined (default) for development - enables API routes
// - 'standalone' for server deployments (Render, Docker)
// - 'export' for static builds (Capacitor, Firebase Hosting)
const isDev = process.env.NODE_ENV === 'development';
const isServerBuild = process.env.BUILD_MODE === 'server' || process.env.RENDER === 'true';
const isStaticBuild = process.env.BUILD_MODE === 'static';

// Determine output mode
let outputMode;
if (isDev) {
  // Development: no output setting, enables API routes
  outputMode = undefined;
} else if (isServerBuild) {
  // Server deployment (Render): standalone mode
  outputMode = 'standalone';
} else if (isStaticBuild) {
  // Explicit static build for Capacitor/Firebase
  outputMode = 'export';
} else {
  // Default production build: standalone for API support
  outputMode = 'standalone';
}

const nextConfig = {
  ...(outputMode && { output: outputMode }),
  // Use trailing slash for static exports (Capacitor compatibility)
  ...(isStaticBuild && { trailingSlash: true }),
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" }, // In production replace * with your specific domain if needed
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ]
      }
    ]
  }
};

const modeLabel = isDev ? 'development (API enabled)' : (outputMode || 'default');
console.log(`[next.config.js] Build mode: ${modeLabel}`);

module.exports = nextConfig;
