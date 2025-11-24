import { useEffect } from "react";
import { TemplateLandingPage } from "@/hooks/useTemplateLanding";

interface TemplateSEOHeadProps {
  template: TemplateLandingPage;
}

export function TemplateSEOHead({ template }: TemplateSEOHeadProps) {
  useEffect(() => {
    // Set page title
    document.title = template.meta_title;

    // Helper to update or create meta tags
    const updateMetaTag = (
      nameOrProperty: string,
      content: string,
      attr: "name" | "property" = "name"
    ) => {
      let tag = document.querySelector(`meta[${attr}="${nameOrProperty}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, nameOrProperty);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    // Basic meta tags
    updateMetaTag("description", template.meta_description);
    if (template.keywords && template.keywords.length > 0) {
      updateMetaTag("keywords", template.keywords.join(", "));
    }

    // Open Graph tags
    updateMetaTag("og:title", template.title, "property");
    updateMetaTag("og:description", template.subtitle || template.meta_description, "property");
    updateMetaTag("og:type", "website", "property");
    if (template.hero_after_image) {
      updateMetaTag("og:image", template.hero_after_image, "property");
    }

    // Twitter Card tags
    updateMetaTag("twitter:card", "summary_large_image");
    updateMetaTag("twitter:title", template.title);
    updateMetaTag("twitter:description", template.subtitle || template.meta_description);
    if (template.hero_after_image) {
      updateMetaTag("twitter:image", template.hero_after_image);
    }

    // Canonical URL
    const canonicalUrl = `${window.location.origin}/templates/${template.category_slug}/${template.slug}`;
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    // Structured data (Schema.org)
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: template.title,
      description: template.subtitle || template.meta_description,
      applicationCategory: "DesignApplication",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      ...(template.use_count > 0 && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.8",
          reviewCount: template.use_count,
        },
      }),
    };

    let scriptTag = document.querySelector('script[type="application/ld+json"]#template-schema') as HTMLScriptElement;
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.type = "application/ld+json";
      scriptTag.id = "template-schema";
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(structuredData);

    // Breadcrumb schema
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: window.location.origin,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Templates",
          item: `${window.location.origin}/templates`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: template.category_slug.replace(/-/g, " "),
          item: `${window.location.origin}/templates/${template.category_slug}`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: template.title,
          item: canonicalUrl,
        },
      ],
    };

    let breadcrumbScript = document.querySelector('script[type="application/ld+json"]#breadcrumb-schema') as HTMLScriptElement;
    if (!breadcrumbScript) {
      breadcrumbScript = document.createElement("script");
      breadcrumbScript.type = "application/ld+json";
      breadcrumbScript.id = "breadcrumb-schema";
      document.head.appendChild(breadcrumbScript);
    }
    breadcrumbScript.textContent = JSON.stringify(breadcrumbSchema);

    // FAQ schema if FAQs exist
    if (template.faqs && Array.isArray(template.faqs) && template.faqs.length > 0) {
      const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: template.faqs.map((faq: { question: string; answer: string }) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      };

      let faqScript = document.querySelector('script[type="application/ld+json"]#faq-schema') as HTMLScriptElement;
      if (!faqScript) {
        faqScript = document.createElement("script");
        faqScript.type = "application/ld+json";
        faqScript.id = "faq-schema";
        document.head.appendChild(faqScript);
      }
      faqScript.textContent = JSON.stringify(faqSchema);
    }

    // Cleanup function
    return () => {
      document.title = "artifio.ai - AI Content Platform";
    };
  }, [template]);

  return null;
}
