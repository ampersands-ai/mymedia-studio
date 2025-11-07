/**
 * SEO configuration for the Create page
 */

export const CREATE_PAGE_SEO = {
  title: "Start Creating - artifio.ai | AI Content Generator",
  description: "Create stunning AI-generated videos, images, music, and text in the artifio.ai studio. Start creating with 5 free credits.",
  schemas: [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "artifio.ai Create",
      "applicationCategory": "MultimediaApplication",
      "description": "AI-powered creative studio for generating videos, images, music, and text content.",
      "url": "https://artifio.ai/dashboard/custom-creation",
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
          "item": "https://artifio.ai/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Dashboard",
          "item": "https://artifio.ai/dashboard"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Create",
          "item": "https://artifio.ai/dashboard/custom-creation"
        }
      ]
    }
  ]
} as const;
