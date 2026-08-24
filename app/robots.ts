import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/checkout/', '/account/', '/orders/', '/login/'],
      },
    ],
    sitemap: 'https://www.sastabazaronline.in/sitemap.xml',
    host: 'https://www.sastabazaronline.in',
  };
}
