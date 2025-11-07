import { useEffect } from "react";

/**
 * SEO configuration interface
 */
interface SEOConfig {
  title: string;
  description: string;
  schemas: readonly any[];
}

/**
 * Hook to manage SEO meta tags and structured data
 * @param config - SEO configuration with title, description, and schemas
 */
export const useSEO = (config: SEOConfig) => {
  useEffect(() => {
    // Set document title
    document.title = config.title;
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', config.description);
    }
    
    // Add structured data scripts
    const scriptElements: HTMLScriptElement[] = [];
    config.schemas.forEach(schema => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
      scriptElements.push(script);
    });
    
    // Cleanup on unmount
    return () => {
      scriptElements.forEach(script => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
    };
  }, [config.title, config.description]);
};
