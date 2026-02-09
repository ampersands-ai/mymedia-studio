import type { MetadataRoute } from 'next';

const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'artifio.ai';
const brandDescription =
  process.env.NEXT_PUBLIC_BRAND_DESCRIPTION ||
  'Professional AI-powered platform for creating videos, images, music, and more.';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brandName,
    short_name: brandName,
    description: brandDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#7c3aed',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['entertainment', 'productivity', 'utilities'],
  };
}
