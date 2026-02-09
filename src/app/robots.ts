import type { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_BRAND_APP_URL || 'https://artifio.ai';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/dashboard/', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
