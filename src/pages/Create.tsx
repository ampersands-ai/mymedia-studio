import { useEffect, useState, useMemo, lazy, Suspense, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Loader2, Download, History as HistoryIcon, Image as ImageIcon, Video, Clock, Info } from "lucide-react";
import { TemplateCard } from "@/components/TemplateCard";
import { useTemplatesByCategory } from "@/hooks/useTemplates";
import { Textarea } from "@/components/ui/textarea";
import { useGeneration } from "@/hooks/useGeneration";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatEstimatedTime } from "@/lib/time-utils";
import { GenerationPreview } from "@/components/generation/GenerationPreview";
import { GenerationProgress } from "@/components/generation/GenerationProgress";

import { SessionWarning } from "@/components/SessionWarning";
import { useOnboarding } from "@/hooks/useOnboarding";
import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { TokenCostPreview } from "@/components/onboarding/TokenCostPreview";
import { SuccessConfetti } from "@/components/onboarding/SuccessConfetti";
import { getExamplePrompt } from "@/data/examplePrompts";
import { useUserTokens } from "@/hooks/useUserTokens";
import type { ContentTemplate } from "@/hooks/useTemplates";

// Lazy load Carousel for code splitting
const Carousel = lazy(() => import("@/components/ui/carousel").then(m => ({ default: m.Carousel })));
const CarouselContent = lazy(() => import("@/components/ui/carousel").then(m => ({ default: m.CarouselContent })));
const CarouselItem = lazy(() => import("@/components/ui/carousel").then(m => ({ default: m.CarouselItem })));
const CarouselNext = lazy(() => import("@/components/ui/carousel").then(m => ({ default: m.CarouselNext })));
const CarouselPrevious = lazy(() => import("@/components/ui/carousel").then(m => ({ default: m.CarouselPrevious })));

const Create = () => {
  const navigate = useNavigate();
  const { templatesByCategory, templates, isLoading } = useTemplatesByCategory();
  const { generate, isGenerating } = useGeneration();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [prompt, setPrompt] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<string | null>(null);
  const [pollingGenerationId, setPollingGenerationId] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const generationStartTimeRef = useRef<number | null>(null);
  const [generationCompleteTime, setGenerationCompleteTime] = useState<number | null>(null);
  const { progress, updateProgress, markComplete, dismiss, setFirstGeneration, isLoading: onboardingLoading } = useOnboarding();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { data: userTokenData } = useUserTokens();
  const userTokens = userTokenData?.tokens_remaining || 0;

  // Memoize SEO schemas for performance
  const schemas = useMemo(() => {
    const webAppSchema = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "artifio.ai Create",
      "applicationCategory": "MultimediaApplication",
      "description": "AI-powered creative studio for generating videos, images, music, and text content.",
      "url": "https://artifio.ai/dashboard/create",
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Start with 500 free tokens"
      }
    };

    const breadcrumbSchema = {
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
          "item": "https://artifio.ai/dashboard/create"
        }
      ]
    };

    return [webAppSchema, breadcrumbSchema];
  }, []);

  // Add structured data for Create page
  useEffect(() => {
    const scriptElements: HTMLScriptElement[] = [];

    schemas.forEach(schema => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
      scriptElements.push(script);
    });

    document.title = "Start Creating - artifio.ai | AI Content Generator";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Create stunning AI-generated videos, images, music, and text in the artifio.ai studio. Start creating with 500 free tokens.');
    }

    return () => {
      scriptElements.forEach(script => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
    };
  }, []);



  // Show welcome modal for new users
  useEffect(() => {
    if (progress && !onboardingLoading && progress.isNewUser && !progress.dismissed && !showWelcome) {
      setShowWelcome(true);
      updateProgress({ viewedTemplates: true });
    }
  }, [progress, onboardingLoading]);

  // Track prompt entry
  useEffect(() => {
    if (prompt.trim().length > 10 && progress && !progress.checklist.enteredPrompt) {
      updateProgress({ enteredPrompt: true });
    }
  }, [prompt, progress]);

  const handleTemplateSelect = (template: any, examplePrompt?: string) => {
    setSelectedTemplate(template);
    setPrompt(examplePrompt || "");
    setGeneratedOutput(null);
    setPollingGenerationId(null);
    generationStartTimeRef.current = null;
    setGenerationCompleteTime(null);
    setDialogOpen(true);
    
    if (progress && !progress.checklist.selectedTemplate) {
      updateProgress({ selectedTemplate: true });
    }
  };

  const handleWelcomeSelectTemplate = (template: ContentTemplate, examplePrompt: string) => {
    handleTemplateSelect(template, examplePrompt);
  };

  // Polling function to check generation status
  const pollGenerationStatus = async (generationId: string) => {
    try {
      const { data, error } = await supabase
        .from('generations')
        .select('status, storage_path, type')
        .eq('id', generationId)
        .single();

      if (error) throw error;

      if (data.status === 'completed' || data.status === 'failed') {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setPollingGenerationId(null);

        if (data.status === 'completed') {
          setGeneratedOutput(data.storage_path);
          setGenerationCompleteTime(Date.now());
          toast.success('Generation complete!', { id: 'generation-progress' });
          
          // Update onboarding progress
          if (progress && !progress.checklist.completedFirstGeneration) {
            updateProgress({ completedFirstGeneration: true });
            setFirstGeneration(generationId);
            setShowConfetti(true);
          }
        } else {
          // Generation failed - dismiss loading toast
          toast.dismiss('generation-progress');
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  };

  // Start polling when generation ID is set
  useEffect(() => {
    if (pollingGenerationId) {
      const startTime = Date.now();
      const MAX_POLLING_DURATION = 20 * 60 * 1000; // 20 minutes

      // Immediate poll at 5 seconds
      const poll5s = setTimeout(() => pollGenerationStatus(pollingGenerationId), 5000);
      
      // Then every 10 seconds for the first minute
      const poll10s = setInterval(() => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= 60000) {
          clearInterval(poll10s);
        } else {
          pollGenerationStatus(pollingGenerationId);
        }
      }, 10000);
      
      // Then every 30 seconds after the first minute
      const poll30s = setTimeout(() => {
        pollIntervalRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime;
          
          if (elapsed >= MAX_POLLING_DURATION) {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            setPollingGenerationId(null);
            toast.info('Generation is taking longer than expected. Check History for updates.', { id: 'generation-progress' });
            return;
          }

          pollGenerationStatus(pollingGenerationId);
        }, 30000);
      }, 60000);

      return () => {
        clearTimeout(poll5s);
        clearInterval(poll10s);
        clearTimeout(poll30s);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [pollingGenerationId]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    try {
      // Reset generation tracking
      generationStartTimeRef.current = Date.now();
      setGenerationCompleteTime(null);
      setGeneratedOutput(null);
      
      // Build custom parameters from template configuration
      const customParameters: Record<string, any> = {};
      
      // Merge hidden field defaults if available
      if (selectedTemplate?.hidden_field_defaults) {
        Object.assign(customParameters, selectedTemplate.hidden_field_defaults);
      }
      
      // Merge preset values if available
      if (selectedTemplate?.preset_parameters) {
        Object.assign(customParameters, selectedTemplate.preset_parameters);
      }

      const result = await generate({
        template_id: selectedTemplate.id,
        prompt: prompt.trim(),
        custom_parameters: Object.keys(customParameters).length > 0 ? customParameters : undefined,
      });
      
      
      // Start polling using normalized ID
      const genId = result?.id || result?.generation_id;
      if (genId) {
        setPollingGenerationId(genId);
      }

      // If immediate result, show it
      if (result?.storage_path) {
        setGeneratedOutput(result.storage_path);
        setGenerationCompleteTime(Date.now());
        toast.success('Generation complete!', { id: 'generation-progress' });
        
        // Update onboarding progress for immediate completion
        if (progress && !progress.checklist.completedFirstGeneration) {
          updateProgress({ completedFirstGeneration: true });
          const genId = result?.id || result?.generation_id;
          if (genId) setFirstGeneration(genId);
          setShowConfetti(true);
        }
      }
    } catch (error: any) {
      // Handle SESSION_EXPIRED error specifically
      if (error.message === "SESSION_EXPIRED") {
        toast.error("Session expired", {
          description: "Please log in again. Your work has been saved.",
          duration: 5000
        });
        setTimeout(() => {
          navigate("/auth");
        }, 2000);
        return;
      }
      
      // Other errors handled by useGeneration hook
      generationStartTimeRef.current = null;
    }
  };

  const handleDownload = async (storagePath: string) => {
    try {
      // Create signed URL for download
      const { data, error } = await supabase.storage
        .from('generated-content')
        .createSignedUrl(storagePath, 60); // 1 minute expiry
      
      if (error || !data?.signedUrl) {
        toast.error('Failed to create download link');
        return;
      }

      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = storagePath.split('.').pop() || 'file';
      a.download = `generation-${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started!');
      
      // Update onboarding progress
      if (progress && !progress.checklist.downloadedResult) {
        updateProgress({ downloadedResult: true });
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const handleViewHistory = () => {
    setDialogOpen(false);
    navigate("/dashboard/history");
  };

  // Show empty state immediately if no templates
  if (!isLoading && (!templatesByCategory || Object.keys(templatesByCategory).length === 0)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-4xl font-black mb-4">NO TEMPLATES AVAILABLE</h2>
          <p className="text-lg text-muted-foreground">Please contact your administrator to add templates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <SessionWarning />
        
        {/* Header */}
        <div className="mb-8 space-y-1">
          <h2 className="text-4xl md:text-5xl font-black">WHAT YOU CAN CREATE</h2>
          <p className="text-lg text-foreground/80 font-medium">
            Professional-grade AI tools for every creative need—no experience required
          </p>
        </div>

        {/* Category Carousels - Mobile First */}
        <div className="space-y-8 mb-12">
          {templatesByCategory && Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg md:text-xl font-black capitalize">{category}</h3>
                <Badge className="bg-neon-yellow text-black border-2 border-black text-xs">
                  {categoryTemplates.length} templates
                </Badge>
              </div>
              
              <Suspense fallback={<div className="h-48 animate-pulse bg-muted rounded-xl" />}>
                <Carousel 
                  className="w-full"
                  opts={{
                    align: "start",
                    loop: false,
                  }}
                >
                  <CarouselContent className="-ml-2">
                  {categoryTemplates.map((template) => (
                    <CarouselItem key={template.id} className="pl-2 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/6">
                      <Card 
                        className="brutal-card-sm hover-lift cursor-pointer overflow-hidden"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <div className="aspect-square relative overflow-hidden">
                          <TemplateCard
                            image={template.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop"}
                            alt={template.name}
                            className="w-full h-full"
                          />
                          <div className="absolute top-2 left-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-black z-10">
                            {template.ai_models?.content_type?.toUpperCase() || "AI"}
                          </div>
                        </div>
                        <CardContent className="p-2">
                          <p className="text-xs font-bold mb-1 truncate">{template.name}</p>
                          <Button 
                            className="w-full bg-primary hover:bg-primary/90 text-black font-black text-xs h-8"
                            size="sm"
                          >
                            Use Template
                          </Button>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                  </CarouselContent>
                  <CarouselPrevious className="hidden sm:flex brutal-shadow -left-4" />
                  <CarouselNext className="hidden sm:flex brutal-shadow -right-4" />
                </Carousel>
              </Suspense>
            </div>
          ))}
        </div>

        {/* Generation Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-black">{selectedTemplate?.name}</DialogTitle>
              <DialogDescription>
                {selectedTemplate?.description || "Enter your prompt to generate content"}
              </DialogDescription>
              {selectedTemplate?.estimated_time_seconds !== null && selectedTemplate?.estimated_time_seconds !== undefined && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <Clock className="h-4 w-4" />
                  <span>Estimated time: ~{formatEstimatedTime(selectedTemplate.estimated_time_seconds)}</span>
                </div>
              )}
            </DialogHeader>
            <div className="space-y-4">
              {!generatedOutput && !pollingGenerationId && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prompt</label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe what you want to create..."
                      className="min-h-[100px] resize-none"
                      disabled={isGenerating || !!pollingGenerationId}
                    />
                  </div>
                  
                  {/* Token Cost Preview */}
                  {selectedTemplate?.ai_models?.base_token_cost && (() => {
                    // Track viewed token cost on render
                    if (progress && !progress.checklist.viewedTokenCost) {
                      setTimeout(() => updateProgress({ viewedTokenCost: true }), 1000);
                    }
                    return (
                      <TokenCostPreview
                        baseCost={selectedTemplate.ai_models.base_token_cost}
                        totalCost={selectedTemplate.ai_models.base_token_cost}
                        userTokens={userTokens}
                      />
                    );
                  })()}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="flex-1"
                      disabled={isGenerating || !!pollingGenerationId}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleGenerate}
                      className="flex-1"
                      disabled={isGenerating || !!pollingGenerationId || !prompt.trim()}
                      title={pollingGenerationId ? "Generation in progress - please wait for it to complete" : ""}
                    >
                      {(isGenerating || pollingGenerationId) ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {pollingGenerationId ? 'Processing...' : 'Generating...'}
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate
                        </>
                      )}
                    </Button>
                  </div>
                  {pollingGenerationId && (
                    <p className="text-xs text-muted-foreground text-center">
                      Please wait for the current generation to complete before starting a new one
                    </p>
                  )}
                </>
              )}

              {/* Output Console */}
              {(pollingGenerationId || generatedOutput) && generationStartTimeRef.current && (
                <Card className="border-2 border-primary/20 bg-muted/50">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Feel free to navigate away - your generation will be saved in History
                      </p>
                    </div>

                    <GenerationProgress
                      startTime={generationStartTimeRef.current}
                      isComplete={!!generatedOutput}
                      completedAt={generationCompleteTime || undefined}
                    />

                    {generatedOutput && (
                      <div className="space-y-3 pt-2">
                        <div className="aspect-video relative overflow-hidden bg-background rounded-lg border">
                          <GenerationPreview
                            storagePath={generatedOutput}
                            contentType={selectedTemplate?.ai_models?.content_type || "image"}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleDownload(generatedOutput)}
                            className="flex-1"
                            size="sm"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <Button
                            onClick={handleViewHistory}
                            className="flex-1"
                            size="sm"
                          >
                            <HistoryIcon className="h-4 w-4 mr-2" />
                            View in History
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Onboarding Components */}
        <WelcomeModal
          isOpen={showWelcome}
          onClose={() => {
            setShowWelcome(false);
            dismiss();
          }}
          onSelectTemplate={handleWelcomeSelectTemplate}
        />

        {progress && !progress.isComplete && !progress.dismissed && (
          <OnboardingChecklist
            progress={progress}
            onComplete={markComplete}
            onDismiss={dismiss}
          />
        )}

        <SuccessConfetti
          trigger={showConfetti}
          onComplete={() => setShowConfetti(false)}
        />
      </div>
    </div>
  );
};

export default Create;
