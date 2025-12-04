import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "export",
    trailingSlash: true,
    images: {
        unoptimized: true,
    },
    pageExtensions: ['tsx', 'js', 'jsx'],
    typescript: {
        ignoreBuildErrors: true,
    },
    reactStrictMode: false,
    eslint: {
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
