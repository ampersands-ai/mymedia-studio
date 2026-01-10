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

    // VideoObject schema for video models (image_to_video, prompt_to_video, video_to_video, lip_sync)
    const videoCategories = ['image_to_video', 'prompt_to_video', 'video_to_video', 'lip_sync', 'video'];
    if (videoCategories.includes(modelPage.category)) {
      const videoSchema = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": `AI Video Generation with ${modelPage.model_name}`,
        "description": modelPage.meta_description,
        "uploadDate": modelPage.created_at,
        ...(modelPage.hero_video_url && { "contentUrl": modelPage.hero_video_url }),
        ...(modelPage.hero_image_url && { "thumbnailUrl": modelPage.hero_image_url }),
        ...(modelPage.og_image_url && { "thumbnailUrl": modelPage.og_image_url }),
        "publisher": {
          "@type": "Organization",
          "name": "ARTIFIO.ai",
          "url": "https://artifio.ai"
        }
      };

      let videoScript = document.querySelector('script[data-schema="video-object"]') as HTMLScriptElement;
      if (!videoScript) {
        videoScript = document.createElement("script");
        videoScript.type = "application/ld+json";
        videoScript.setAttribute("data-schema", "video-object");
        document.head.appendChild(videoScript);
      }
      videoScript.textContent = JSON.stringify(videoSchema);
    }

    // ImageObject schema for image models (prompt_to_image, image_editing, image)
    const imageCategories = ['prompt_to_image', 'image_editing', 'image'];
    if (imageCategories.includes(modelPage.category)) {
      const imageSchema = {
        "@context": "https://schema.org",
        "@type": "ImageObject",
        "name": `AI Image Generation with ${modelPage.model_name}`,
        "description": modelPage.meta_description,
        "uploadDate": modelPage.created_at,
        ...(modelPage.hero_image_url && { "contentUrl": modelPage.hero_image_url }),
        ...(modelPage.og_image_url && { "contentUrl": modelPage.og_image_url }),
        "creator": {
          "@type": "Organization",
          "name": "ARTIFIO.ai",
          "url": "https://artifio.ai"
        }
      };

      let imageScript = document.querySelector('script[data-schema="image-object"]') as HTMLScriptElement;
      if (!imageScript) {
        imageScript = document.createElement("script");
        imageScript.type = "application/ld+json";
        imageScript.setAttribute("data-schema", "image-object");
        document.head.appendChild(imageScript);
      }
      imageScript.textContent = JSON.stringify(imageSchema);
    }

    // HowTo schema for models with use_cases (treated as steps)
    if (modelPage.use_cases && modelPage.use_cases.length > 0) {
      const howToSchema = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": `How to Use ${modelPage.model_name} for AI Content Creation`,
        "description": `Learn how to create stunning ${getCategoryDisplayName(modelPage.category)} with ${modelPage.model_name} on ARTIFIO.ai`,
        "step": modelPage.use_cases.map((useCase, index) => ({
          "@type": "HowToStep",
          "position": index + 1,
          "name": useCase.title,
          "text": useCase.description
        })),
        "tool": {
          "@type": "HowToTool",
          "name": modelPage.model_name
        }
      };

      let howToScript = document.querySelector('script[data-schema="how-to"]') as HTMLScriptElement;
      if (!howToScript) {
        howToScript = document.createElement("script");
        howToScript.type = "application/ld+json";
        howToScript.setAttribute("data-schema", "how-to");
        document.head.appendChild(howToScript);
      }
      howToScript.textContent = JSON.stringify(howToSchema);
    }

    // Cleanup on unmount
    return () => {
      document.title = "ARTIFIO.ai - AI Content Creation";
      // Remove dynamic schemas on unmount to prevent stale data
      const schemaScripts = document.querySelectorAll('script[data-schema]');
      schemaScripts.forEach(script => script.remove());
    };
  }, [modelPage]);

  return null;
}

function getCategoryAppType(category: string): string {
  const categoryMap: Record<string, string> = {
    image: "DesignApplication",
    prompt_to_image: "DesignApplication",
    image_editing: "DesignApplication",
    video: "MultimediaApplication",
    prompt_to_video: "MultimediaApplication",
    image_to_video: "MultimediaApplication",
    video_to_video: "MultimediaApplication",
    lip_sync: "MultimediaApplication",
    audio: "MusicApplication",
    prompt_to_audio: "MusicApplication",
    avatar: "MultimediaApplication",
    voice: "MusicApplication",
  };
  return categoryMap[category] || "MultimediaApplication";
}

function getCategoryDisplayName(category: string): string {
  const categoryMap: Record<string, string> = {
    image: "images",
    prompt_to_image: "AI-generated images",
    image_editing: "AI-edited images",
    video: "videos",
    prompt_to_video: "AI-generated videos",
    image_to_video: "videos from images",
    video_to_video: "video transformations",
    lip_sync: "lip-synced videos",
    audio: "audio content",
    prompt_to_audio: "AI-generated audio",
  };
  return categoryMap[category] || "AI content";
}
