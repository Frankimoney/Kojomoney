import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Use export mode for static Firebase Hosting deployment
    // API routes will be skipped automatically
    output: "standalone",
    images: {
        unoptimized: true,
    },
    pageExtensions: ['tsx', 'ts', 'js', 'jsx'],
    typescript: {
        ignoreBuildErrors: true,
    },
    reactStrictMode: false,
    eslint: {
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
