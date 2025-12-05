import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Use standalone for production/render, export for static hosting
    output: process.env.NODE_ENV === "production" || !process.env.NEXT_PUBLIC_API_URL?.includes("localhost") ? "standalone" : "export",
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
