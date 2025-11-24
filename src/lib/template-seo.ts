import type { TemplateLandingPage } from "@/hooks/useTemplateLanding";

/**
 * Generate JSON-LD structured data for template landing pages
 */

export interface StructuredDataSchema {
  "@context": string;
  "@type": string;
  [key: string]: unknown;
}

/**
 * Generate SoftwareApplication schema for template pages
 */
export function generateSoftwareApplicationSchema(
  template: TemplateLandingPage
): StructuredDataSchema {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: template.title,
    description: template.subtitle || template.meta_description,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: template.use_count > 10 ? {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: template.use_count,
      bestRating: "5",
      worstRating: "1",
    } : undefined,
    image: template.hero_after_image || template.thumbnail_url,
    url: `https://artifio.ai/templates/${template.category_slug}/${template.slug}`,
  };
}

/**
 * Generate HowTo schema from template steps
 */
export function generateHowToSchema(
  template: TemplateLandingPage
): StructuredDataSchema | null {
  if (!template.steps || !Array.isArray(template.steps)) return null;

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to ${template.title}`,
    description: template.subtitle || template.meta_description,
    image: template.hero_after_image || template.thumbnail_url,
    totalTime: template.token_cost ? `PT${Math.ceil(template.token_cost / 10)}M` : undefined,
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: "0",
    },
    step: template.steps.map((step: { title?: string; description?: string; image_url?: string }, index: number) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.description,
      image: step.image_url,
    })),
  };
}

/**
 * Generate FAQPage schema from template FAQs
 */
export function generateFAQSchema(
  template: TemplateLandingPage
): StructuredDataSchema | null {
  if (!template.faqs || !Array.isArray(template.faqs)) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: template.faqs.map((faq: { question?: string; answer?: string }) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate BreadcrumbList schema for template pages
 */
export function generateBreadcrumbSchema(
  template: TemplateLandingPage
): StructuredDataSchema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://artifio.ai",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Templates",
        item: "https://artifio.ai/templates",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: template.category_slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        item: `https://artifio.ai/templates/${template.category_slug}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: template.title,
        item: `https://artifio.ai/templates/${template.category_slug}/${template.slug}`,
      },
    ],
  };
}

/**
 * Generate all structured data schemas for a template
 */
export function generateAllSchemas(template: TemplateLandingPage): StructuredDataSchema[] {
  const schemas: StructuredDataSchema[] = [
    generateSoftwareApplicationSchema(template),
    generateBreadcrumbSchema(template),
  ];

  const howToSchema = generateHowToSchema(template);
  if (howToSchema) schemas.push(howToSchema);

  const faqSchema = generateFAQSchema(template);
  if (faqSchema) schemas.push(faqSchema);

  return schemas;
}

/**
 * Inject structured data into page head
 */
export function injectStructuredData(schemas: StructuredDataSchema[]): void {
  // Remove existing schema scripts
  const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
  existingScripts.forEach((script) => script.remove());

  // Add new schema scripts
  schemas.forEach((schema) => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  });
}

/**
 * Update meta tag helper
 */
export function updateMetaTag(
  name: string,
  content: string,
  attribute: "name" | "property" = "name"
): void {
  let element = document.querySelector(`meta[${attribute}="${name}"]`);
  
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  
  element.setAttribute("content", content);
}

/**
 * Set canonical URL
 */
export function setCanonical(url: string): void {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  
  link.href = url;
}

/**
 * Generate sitemap entry for template
 */
export function generateSitemapEntry(template: TemplateLandingPage): string {
  return `
  <url>
    <loc>https://artifio.ai/templates/${template.category_slug}/${template.slug}</loc>
    <lastmod>${new Date(template.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${template.use_count > 100 ? '0.8' : '0.6'}</priority>
  </url>`;
}
