import type { NextConfig } from "next";

const proxyTarget = process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_URL;

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async rewrites() {
    if (!proxyTarget) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${proxyTarget.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
