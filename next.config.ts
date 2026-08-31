import type { NextConfig } from "next";

const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "connect-src 'self' https://ozzxrzyahbnavldyrlms.supabase.co https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com",
  "img-src 'self' data: blob: https://ozzxrzyahbnavldyrlms.supabase.co https://www.google-analytics.com https://www.googletagmanager.com",
  "media-src 'self' blob: https://ozzxrzyahbnavldyrlms.supabase.co",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join('; ');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ozzxrzyahbnavldyrlms.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy-Report-Only',
            value: cspReportOnly,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
