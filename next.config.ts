import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Use export mode for static Firebase Hosting deployment
    output: "export",
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
