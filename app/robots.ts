import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api',
          '/uploader',
          '/vision',
        ],
      },
    ],

    sitemap:
      'https://www.adhyeybrothers.in/sitemap.xml',

    host:
      'https://www.adhyeybrothers.in',
  };
}