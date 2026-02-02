import { useParams, useNavigate } from "react-router-dom";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { SmartLoader } from "@/components/ui/smart-loader";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  useModelPage,
  useModelSamples,
  useModelPromptTemplates,
  useRelatedModels,
} from "@/hooks/useModelPages";
import {
  ModelSEOHead,
  ModelBreadcrumbs,
  ModelPageHero,
  ModelSampleGallery,
  ModelHighlights,
  ModelSpecifications,
  ModelUseCases,
  ModelPromptGuide,
  ModelComparisonBanner,
  ModelRelatedModels,
  ModelFAQ,
  ModelBottomCTA,
} from "@/components/model-landing";

export default function ModelLanding() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const { data: modelPage, isLoading, error } = useModelPage(slug || "");
  const { data: samples } = useModelSamples(modelPage?.id);
  const { data: promptTemplates } = useModelPromptTemplates(modelPage?.id);
  const { data: relatedModels } = useRelatedModels(modelPage?.category, modelPage?.id);

  const handleTryModel = () => {
    if (modelPage?.slug) {
      // Use slug for SEO-friendly, human-readable URLs
      navigate(`/dashboard/custom-creation?model=${encodeURIComponent(modelPage.slug)}`);
    } else {
      navigate("/dashboard/custom-creation");
    }
  };

  // Navigate to custom creation with specific variant record ID
  const handleTryVariant = (recordId: string) => {
    navigate(`/dashboard/custom-creation?model=${encodeURIComponent(recordId)}`);
  };

  const handleTryPrompt = (prompt: string) => {
    if (modelPage?.slug) {
      const encodedPrompt = encodeURIComponent(prompt);
      // Use slug for SEO-friendly URLs
      navigate(`/dashboard/custom-creation?model=${encodeURIComponent(modelPage.slug)}&prompt=${encodedPrompt}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <GlobalHeader />
        <main className="flex-1 flex items-center justify-center">
          <SmartLoader message="Loading model details..." />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !modelPage) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <GlobalHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Model Not Found</h1>
            <p className="text-muted-foreground">
              The model you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate("/models")} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Models
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <ModelSEOHead modelPage={modelPage} />
      
      <div className="min-h-screen bg-background flex flex-col">
        <GlobalHeader />
        
        <main className="flex-1 pt-20">
          {/* Breadcrumbs */}
          <div className="container mx-auto px-4 pt-6">
            <ModelBreadcrumbs 
              modelName={modelPage.model_name} 
              category={modelPage.category} 
            />
          </div>
          
          {/* Hero Section */}
          <ModelPageHero 
            modelPage={modelPage} 
            onTryModel={handleTryModel}
            onTryVariant={handleTryVariant}
          />
          
          {/* Sample Gallery */}
          {samples && samples.length > 0 && (
            <section className="container mx-auto px-4 py-12">
              <ModelSampleGallery 
                samples={samples}
                modelName={modelPage.model_name}
                onTryPrompt={handleTryPrompt}
              />
            </section>
          )}
          
          {/* Highlights */}
          {modelPage.highlights && modelPage.highlights.length > 0 && (
            <section className="container mx-auto px-4 py-12 bg-muted/30">
              <ModelHighlights highlights={modelPage.highlights} />
            </section>
          )}
          
          {/* Specifications */}
          {modelPage.specifications && Object.keys(modelPage.specifications).length > 0 && (
            <section className="container mx-auto px-4 py-12">
              <ModelSpecifications specifications={modelPage.specifications} />
            </section>
          )}
          
          {/* Use Cases */}
          {modelPage.use_cases && modelPage.use_cases.length > 0 && (
            <section className="container mx-auto px-4 py-12 bg-muted/30">
              <ModelUseCases useCases={modelPage.use_cases} />
            </section>
          )}
          
          {/* Prompt Guide */}
          {promptTemplates && promptTemplates.length > 0 && (
            <section className="container mx-auto px-4 py-12">
              <ModelPromptGuide 
                templates={promptTemplates}
                modelName={modelPage.model_name}
                onTryPrompt={handleTryPrompt}
              />
            </section>
          )}
          
          {/* Comparison Banner */}
          <ModelComparisonBanner 
            modelName={modelPage.model_name}
            pricingNote={modelPage.pricing_note}
            onTryModel={handleTryModel}
          />
          
          {/* Related Models */}
          {relatedModels && relatedModels.length > 0 && (
            <section className="container mx-auto px-4 py-12">
              <ModelRelatedModels relatedModels={relatedModels} />
            </section>
          )}
          
          {/* FAQ */}
          {modelPage.faqs && modelPage.faqs.length > 0 && (
            <section className="container mx-auto px-4 py-12 bg-muted/30">
              <ModelFAQ faqs={modelPage.faqs} modelName={modelPage.model_name} />
            </section>
          )}
          
          {/* Bottom CTA */}
          <ModelBottomCTA 
            modelName={modelPage.model_name}
            onTryModel={handleTryModel}
          />
        </main>
        
        <Footer />
      </div>
    </>
  );
}
