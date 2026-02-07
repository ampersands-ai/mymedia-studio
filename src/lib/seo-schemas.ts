import { brand, brandUrl } from '@/config/brand';

// SEO schema generation utilities - deferred for performance
export const generateSchemas = () => {
  const webApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": brand.name,
    "description": "Professional AI-powered platform for creating videos, images, music, and more. Generate portrait headshots, cinematic videos, product photography instantly.",
    "url": brand.appUrl,
    "applicationCategory": "DesignApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "AI Video Generation",
      "AI Image Creation",
      "Portrait Headshots",
      "Photo Editing",
      "Product Photography",
      "Social Media Content",
      "Audio Processing",
      "Text Generation"
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `What is ${brand.name}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `${brand.name} is a professional AI-powered platform for creating videos, images, music, and more. It provides access to cutting-edge AI models at a fraction of competitor costs.`
        }
      },
      {
        "@type": "Question",
        "name": `How much does ${brand.name} cost?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `${brand.name} offers plans starting at just $7.99/month, which is 50-80% less than competitors. You also get 5 free credits to start with no credit card required.`
        }
      },
      {
        "@type": "Question",
        "name": `What can I create with ${brand.name}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can create portrait headshots, cinematic videos, product photography, social media content, audio content including music and voiceovers, text generation, and much more using advanced AI models."
        }
      }
    ]
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": brand.name,
    "url": brand.appUrl,
    "logo": brandUrl('/logo.png'),
    "sameAs": [],
    "description": "Professional AI-powered platform for creating videos, images, music, and more."
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": brand.appUrl
      }
    ]
  };

  return {
    webApplicationSchema,
    faqSchema,
    organizationSchema,
    breadcrumbSchema
  };
};

export const injectSchemas = (schemas: ReturnType<typeof generateSchemas>) => {
  // Remove existing schemas
  document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    script.remove();
  });

  // Inject new schemas
  Object.values(schemas).forEach(schema => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
  });
};
