import type { NextConfig } from "next";

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
  async redirects() {
    return [
      {
        source: '/discover',
        destination: '/community',
        permanent: true,
      },
      {
        source: '/community/reels',
        destination: '/community?type=reel',
        permanent: true,
      },
      {
        source: '/discover/reels',
        destination: '/community?type=reel',
        permanent: true,
      },
      {
        source: '/stories',
        destination: '/community?type=story',
        permanent: true,
      },
      {
        source: '/stories/:id',
        destination: '/community?story_id=:id',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
