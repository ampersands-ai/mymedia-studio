import type { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_BRAND_APP_URL || 'https://artifio.ai';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    '',
    '/about',
    '/pricing',
    '/features',
    '/blog',
    '/community',
    '/faq',
    '/help',
    '/models',
    '/moderation-docs',
    '/privacy',
    '/terms',
  ];

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : route === '/pricing' ? 0.9 : 0.7,
  }));
}
