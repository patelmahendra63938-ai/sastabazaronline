import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // બધી જ એક્સટર્નલ ઈમેજ લિંક્સને સપોર્ટ કરવા માટે
      },
    ],
  },
};

export default nextConfig;