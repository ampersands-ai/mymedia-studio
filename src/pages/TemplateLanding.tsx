import { useParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useTemplateLanding, useRelatedTemplates, useIncrementTemplateUse } from "@/hooks/useTemplateLanding";
import { useAuth } from "@/contexts/AuthContext";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { TemplateBreadcrumbs } from "@/components/template-landing/TemplateBreadcrumbs";
import { TemplateLandingHero } from "@/components/template-landing/TemplateLandingHero";
import { TemplateExampleGallery } from "@/components/template-landing/TemplateExampleGallery";
import { TemplateHowItWorks } from "@/components/template-landing/TemplateHowItWorks";
import { TemplateUseCases } from "@/components/template-landing/TemplateUseCases";
import { TemplateFAQ } from "@/components/template-landing/TemplateFAQ";
import { TemplateRelatedCards } from "@/components/template-landing/TemplateRelatedCards";
import { TemplateBottomCTA } from "@/components/template-landing/TemplateBottomCTA";
import { TemplateSEOHead } from "@/components/template-landing/TemplateSEOHead";
import { SmartLoader } from "@/components/ui/smart-loader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import DOMPurify from "dompurify";

export default function TemplateLanding() {
  const { category, slug } = useParams<{ category: string; slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const incrementUse = useIncrementTemplateUse();

  const { data: template, isLoading, error } = useTemplateLanding(category!, slug!);
  const { data: relatedTemplates } = useRelatedTemplates(template?.related_template_ids);

  // Sanitize long description to prevent XSS attacks
  const sanitizedLongDescription = useMemo(() => {
    if (!template?.long_description) return '';
    return DOMPurify.sanitize(template.long_description, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id']
    });
  }, [template?.long_description]);

  const handleTryTemplate = async () => {
    if (!template) return;

    // Increment use count
    incrementUse.mutate(template.id);

    // Check authentication
    if (!user) {
      navigate("/auth", { state: { from: window.location.pathname } });
      return;
    }

    // Navigate to creation workflow
    if (template.workflow_id) {
      navigate(`/dashboard/create-workflow?workflow=${template.workflow_id}`);
    } else {
      navigate("/dashboard/create-workflow");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <GlobalHeader />
        <div className="flex-1 flex items-center justify-center">
          <SmartLoader />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen flex flex-col">
        <GlobalHeader />
        <div className="flex-1 flex items-center justify-center p-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Template not found. It may have been unpublished or doesn't exist.
            </AlertDescription>
          </Alert>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TemplateSEOHead template={template} />
      <GlobalHeader />
      <TemplateBreadcrumbs
        category={template.category_slug}
        templateName={template.title}
      />

      <main className="flex-1">
        <TemplateLandingHero
          title={template.title}
          subtitle={template.subtitle}
          beforeImage={template.hero_before_image}
          afterImage={template.hero_after_image}
          tokenCost={template.token_cost}
          useCount={template.use_count}
          onTryTemplate={handleTryTemplate}
        />

        <TemplateExampleGallery examples={(template.example_images as unknown as Array<{url: string; caption?: string}>) || []} />

        <TemplateHowItWorks
          steps={(template.steps as unknown as Array<{title: string; description: string; icon?: string}>) || []}
          demoVideoUrl={template.demo_video_url}
        />

        <TemplateUseCases
          useCases={(template.use_cases as unknown as Array<{title: string; description: string}>) || []}
          targetAudience={template.target_audience}
        />

        {template.long_description && (
          <section className="py-16 px-4">
            <div className="container max-w-4xl mx-auto prose prose-gray dark:prose-invert">
              {/* Sanitized to prevent XSS */}
              <div dangerouslySetInnerHTML={{ __html: sanitizedLongDescription }} />
            </div>
          </section>
        )}

        <TemplateFAQ faqs={(template.faqs as unknown as Array<{question: string; answer: string}>) || []} />

        <TemplateRelatedCards templates={relatedTemplates || []} />

        <TemplateBottomCTA
          title={template.title}
          tokenCost={template.token_cost}
          onTryTemplate={handleTryTemplate}
        />
      </main>

      <Footer />
    </div>
  );
}
