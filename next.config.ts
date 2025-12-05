import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Use standalone for production
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
