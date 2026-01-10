import { useEffect } from "react";
import type { ModelPage } from "@/hooks/useModelPages";

interface ModelSEOHeadProps {
  modelPage: ModelPage;
}

export function ModelSEOHead({ modelPage }: ModelSEOHeadProps) {
  useEffect(() => {
    // Set page title
    document.title = modelPage.meta_title;

    // Helper to create/update meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement("meta");
        if (isProperty) {
          meta.setAttribute("property", name);
        } else {
          meta.setAttribute("name", name);
        }
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Basic meta tags
    updateMetaTag("description", modelPage.meta_description);
    if (modelPage.keywords?.length) {
      updateMetaTag("keywords", modelPage.keywords.join(", "));
    }

    // Open Graph tags
    updateMetaTag("og:title", modelPage.meta_title, true);
    updateMetaTag("og:description", modelPage.meta_description, true);
    updateMetaTag("og:type", "website", true);
    updateMetaTag("og:url", `https://artifio.ai/models/${modelPage.slug}`, true);
    if (modelPage.og_image_url) {
      updateMetaTag("og:image", modelPage.og_image_url, true);
    }

    // Twitter Card tags
    updateMetaTag("twitter:card", "summary_large_image");
    updateMetaTag("twitter:title", modelPage.meta_title);
    updateMetaTag("twitter:description", modelPage.meta_description);
    if (modelPage.og_image_url) {
      updateMetaTag("twitter:image", modelPage.og_image_url);
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `https://artifio.ai/models/${modelPage.slug}`;

    // Structured data - SoftwareApplication
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": `${modelPage.model_name} on ARTIFIO.ai`,
      "applicationCategory": getCategoryAppType(modelPage.category),
      "operatingSystem": "Web",
      "description": modelPage.meta_description,
      "url": `https://artifio.ai/models/${modelPage.slug}`,
      "provider": {
        "@type": "Organization",
        "name": modelPage.provider
      },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    };

    let scriptTag = document.querySelector('script[data-schema="model-page"]') as HTMLScriptElement;
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.type = "application/ld+json";
      scriptTag.setAttribute("data-schema", "model-page");
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(structuredData);

    // Breadcrumb structured data
    const breadcrumbData = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://artifio.ai"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Models",
          "item": "https://artifio.ai/models"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": modelPage.model_name,
          "item": `https://artifio.ai/models/${modelPage.slug}`
        }
      ]
    };

    let breadcrumbScript = document.querySelector('script[data-schema="breadcrumb"]') as HTMLScriptElement;
    if (!breadcrumbScript) {
      breadcrumbScript = document.createElement("script");
      breadcrumbScript.type = "application/ld+json";
      breadcrumbScript.setAttribute("data-schema", "breadcrumb");
      document.head.appendChild(breadcrumbScript);
    }
    breadcrumbScript.textContent = JSON.stringify(breadcrumbData);

    // FAQ structured data if FAQs exist
    if (modelPage.faqs && modelPage.faqs.length > 0) {
      const faqData = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": modelPage.faqs.map(faq => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer
          }
        }))
      };

      let faqScript = document.querySelector('script[data-schema="faq"]') as HTMLScriptElement;
      if (!faqScript) {
        faqScript = document.createElement("script");
        faqScript.type = "application/ld+json";
        faqScript.setAttribute("data-schema", "faq");
        document.head.appendChild(faqScript);
      }
      faqScript.textContent = JSON.stringify(faqData);
    }

    // Cleanup on unmount
    return () => {
      document.title = "ARTIFIO.ai - AI Content Creation";
    };
  }, [modelPage]);

  return null;
}

function getCategoryAppType(category: string): string {
  const categoryMap: Record<string, string> = {
    image: "DesignApplication",
    video: "MultimediaApplication",
    audio: "MusicApplication",
    avatar: "MultimediaApplication",
    voice: "MusicApplication",
  };
  return categoryMap[category] || "MultimediaApplication";
}
