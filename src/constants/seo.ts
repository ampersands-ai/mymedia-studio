/**
 * SEO configuration for the Create page
 */

import { brand, brandUrl } from '@/config/brand';

export const CREATE_PAGE_SEO = {
  title: `Start Creating - ${brand.name} | AI Content Generator`,
  description: `Create stunning AI-generated videos, images, music, and text in the ${brand.name} studio. Start creating with 5 free credits.`,
  schemas: [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": `${brand.name} Create`,
      "applicationCategory": "MultimediaApplication",
      "description": "AI-powered creative studio for generating videos, images, music, and text content.",
      "url": brandUrl('/dashboard/custom-creation'),
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Start with 5 free credits"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": brandUrl('/')
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Dashboard",
          "item": brandUrl('/dashboard')
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Create",
          "item": brandUrl('/dashboard/custom-creation')
        }
      ]
    }
  ]
} as const;
