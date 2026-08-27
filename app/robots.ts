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
          '/checkout',
          '/account',
          '/orders',
          '/login',
          '/cart',
          '/wishlist',
          '/uploader',
          '/vision',
        ],
      },
    ],
    sitemap: 'https://www.adhyeybrothers.in/sitemap.xml',
    host: 'https://www.adhyeybrothers.in',
  };
}