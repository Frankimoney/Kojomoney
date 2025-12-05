import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: process.env.NEXT_OUTPUT_MODE === "export" ? "export" : "standalone",
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
