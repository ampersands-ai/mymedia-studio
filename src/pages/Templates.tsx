import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useAllTemplates } from "@/hooks/useTemplates";
import { useWorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, Package, Users, TrendingUp, Layers, Wand2 } from "lucide-react";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { WorkflowInputPanel } from "@/components/generation/WorkflowInputPanel";
import { GenerationProgress } from "@/components/generation/GenerationProgress";
import { GenerationPreview } from "@/components/generation/GenerationPreview";
import { toast } from "sonner";
import { createSignedUrl } from "@/lib/storage-utils";


const Templates = () => {
  const { user } = useAuth();
  const { data: allTemplates, isLoading } = useAllTemplates();
  const navigate = useNavigate();
  
  // Workflow execution state
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const { data: selectedWorkflow } = useWorkflowTemplate(selectedWorkflowId || '');
  const { executeWorkflow, isExecuting, progress } = useWorkflowExecution();
  const [executionResult, setExecutionResult] = useState<{ url: string; tokens: number } | null>(null);
  const [executionStartTime, setExecutionStartTime] = useState<number | null>(null);
  const outputSectionRef = useRef<HTMLDivElement>(null);
  
  // State for signed URLs for before/after images
  const [signedUrls, setSignedUrls] = useState<Record<string, { before: string | null, after: string | null }>>({});

  useEffect(() => {
    document.title = "Templates - Artifio.ai";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Ready-to-use AI templates for videos, images, audio, and text. Start creating in seconds with professional templates.');
    }
  }, []);

  // Generate signed URLs for templates with before/after images
  useEffect(() => {
    const generateSignedUrls = async () => {
      if (!allTemplates) return;
      
      const urlsToGenerate: Record<string, { before: string | null, after: string | null }> = {};
      
      for (const template of allTemplates) {
        if (template.before_image_url || template.after_image_url) {
          const beforeUrl = template.before_image_url 
            ? await createSignedUrl('generated-content', template.before_image_url)
            : null;
          const afterUrl = template.after_image_url 
            ? await createSignedUrl('generated-content', template.after_image_url)
            : null;
          
          urlsToGenerate[template.id] = { before: beforeUrl, after: afterUrl };
        }
      }
      
      setSignedUrls(urlsToGenerate);
    };
    
    generateSignedUrls();
  }, [allTemplates]);

  const getTemplateIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "product":
        return Package;
      case "marketing":
        return TrendingUp;
      case "fantasy":
        return Wand2;
      case "portraits":
        return Users;
      case "abstract":
        return Layers;
      default:
        return Sparkles;
    }
  };

  const getWorkflowContentType = (template: any): "Video" | "Image" => {
    // Check if template has workflow_steps to determine output type
    if (template.workflow_steps && Array.isArray(template.workflow_steps)) {
      const lastStep = template.workflow_steps[template.workflow_steps.length - 1];
      if (lastStep?.model_id) {
        const modelId = lastStep.model_id.toLowerCase();
        // Check for video model keywords
        if (modelId.includes("video") || modelId.includes("sora") || modelId.includes("runway") || 
            modelId.includes("kling") || modelId.includes("luma") || modelId.includes("veo") ||
            modelId.includes("hailuo") || modelId.includes("wan")) {
          return "Video";
        }
      }
    }
    // Also check category as fallback
    if (template.category?.toLowerCase().includes("video")) {
      return "Video";
    }
    return "Image";
  };

  // All templates are now workflows - filter by category
  const templates = (allTemplates || []).sort((a, b) => a.display_order - b.display_order);
  
  const productTemplates = templates.filter(t => t.category === "Product");
  const marketingTemplates = templates.filter(t => t.category === "Marketing");
  const fantasyTemplates = templates.filter(t => t.category === "Fantasy");
  const portraitsTemplates = templates.filter(t => t.category === "Portraits");
  const abstractTemplates = templates.filter(t => t.category === "Abstract");

  const handleUseTemplate = (template: any) => {
    if (template.template_type === 'workflow') {
      if (!user) {
        navigate('/auth');
        return;
      }
      // Show inline workflow execution
      setSelectedWorkflowId(template.id);
      setExecutionResult(null);
      setExecutionStartTime(null);
      // Scroll to output section on mobile
      setTimeout(() => {
        outputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } else {
      navigate(`/dashboard/custom-creation?template=${template.id}`);
    }
  };

  const handleExecuteWorkflow = async (inputs: Record<string, any>) => {
    if (!selectedWorkflow) return;

    // Inputs are already formatted correctly by WorkflowInputPanel
    setExecutionResult(null);
    setExecutionStartTime(Date.now());
    
    const result = await executeWorkflow({
      workflow_template_id: selectedWorkflow.id,
      user_inputs: inputs,
    });

    if (result?.final_output_url) {
      setExecutionResult({ url: result.final_output_url, tokens: result.tokens_used });
      toast.success('Workflow completed!');
    } else {
      toast.error('Workflow failed');
    }
  };

  const handleBackToTemplates = () => {
    setSelectedWorkflowId(null);
    setExecutionResult(null);
    setExecutionStartTime(null);
  };

  const renderWorkflowOutput = () => {
    if (!executionResult?.url || !selectedWorkflow) return null;
    
    const isSignedUrl = executionResult.url.startsWith('http');
    const contentType = selectedWorkflow.category?.toLowerCase().includes('video') ? 'video' : 'image';
    
    if (isSignedUrl) {
      // Direct signed URL - render media directly
      return contentType === 'video' ? (
        <video src={executionResult.url} controls className="w-full rounded-lg" />
      ) : (
        <img src={executionResult.url} alt="Generated output" className="w-full rounded-lg" />
      );
    } else {
      // Storage path - use GenerationPreview
      return <GenerationPreview storagePath={executionResult.url} contentType={contentType} />;
    }
  };

  const renderCarousel = (categoryTemplates: any[], categoryName: string) => {
    if (categoryTemplates.length === 0) return null;

    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-black">{categoryName}</h2>
        <Carousel className="w-full">
          <CarouselContent className="-ml-4">
            {categoryTemplates.map((template) => {
              const Icon = getTemplateIcon(template.category || '');
              const contentType = getWorkflowContentType(template);
              return (
                <CarouselItem key={template.id} className="pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
                  <Card className="group hover:shadow-brutal transition-all overflow-hidden border-2 border-black">
                    <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10">
                      {signedUrls[template.id]?.before && signedUrls[template.id]?.after ? (
                        <BeforeAfterSlider
                          beforeImage={signedUrls[template.id].before!}
                          afterImage={signedUrls[template.id].after!}
                          beforeLabel="Original"
                          afterLabel="Enhanced"
                          defaultPosition={50}
                          showHint={true}
                          className="w-full h-full"
                        />
                      ) : template.thumbnail_url ? (
                        <img 
                          src={template.thumbnail_url} 
                          alt={template.name || ''}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon className="h-12 w-12 text-primary/30" />
                        </div>
                      )}
                      <Badge variant="secondary" className="absolute top-1 right-1 backdrop-blur-sm bg-background/80 text-xs px-1.5 py-0">
                        {contentType}
                      </Badge>
                    </div>
                    
                    <div className="p-2 space-y-2">
                      <p className="text-xs font-medium line-clamp-1">{template.name}</p>
                      
                      <Button 
                        onClick={() => handleUseTemplate(template)}
                        className="w-full h-7 text-xs"
                        size="sm"
                      >
                        <Sparkles className="mr-1 h-3 w-3" />
                        Use
                      </Button>
                    </div>
                  </Card>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="border-2 border-black" />
          <CarouselNext className="border-2 border-black" />
        </Carousel>
      </div>
    );
  };

  return (
    <>
      {/* Templates Grid with Tabs OR Workflow Execution */}
      <section className="bg-background">
        <div className="container mx-auto px-4 py-12 md:py-16">
          {selectedWorkflow ? (
            /* Two-Panel Workflow Execution Layout */
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 md:gap-8">
                {/* Left Panel - Input */}
                <WorkflowInputPanel
                  workflow={selectedWorkflow}
                  onExecute={handleExecuteWorkflow}
                  onBack={handleBackToTemplates}
                  isExecuting={isExecuting}
                />

                {/* Right Panel - Output */}
                <div ref={outputSectionRef}>
                  <Card className="bg-card border border-border shadow-sm rounded-xl lg:sticky lg:top-24">
                    <div className="border-b border-border px-6 py-4 bg-muted/30">
                      <h2 className="text-lg font-bold">Output</h2>
                    </div>
                    <CardContent className="p-6 min-h-[400px] flex items-center justify-center">
                      {!isExecuting && !executionResult && (
                        <div className="text-center text-muted-foreground">
                          <Sparkles className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <p>Fill in the inputs and execute the workflow to see results</p>
                        </div>
                      )}

                      {isExecuting && (
                        <div className="w-full space-y-4">
                          <GenerationProgress
                            startTime={executionStartTime}
                            isComplete={false}
                            estimatedTimeSeconds={selectedWorkflow.estimated_time_seconds || undefined}
                          />
                          {progress && (
                            <div className="text-center text-sm text-muted-foreground">
                              <p>Step {progress.currentStep} of {progress.totalSteps}</p>
                              {progress.stepName && <p className="font-medium mt-1">{progress.stepName}</p>}
                            </div>
                          )}
                        </div>
                      )}

                      {executionResult && (
                        <div className="w-full space-y-4">
                          {renderWorkflowOutput()}
                          <div className="text-center">
                            <Badge variant="secondary">
                              {executionResult.tokens} tokens used
                            </Badge>
                            <div className="mt-4 flex gap-2 justify-center">
                              <Button onClick={handleBackToTemplates} variant="outline">
                                Create Another
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            /* Template Carousels */
            <div className="max-w-7xl mx-auto space-y-16">
              {renderCarousel(productTemplates, "Product")}
              {renderCarousel(marketingTemplates, "Marketing")}
              {renderCarousel(fantasyTemplates, "Fantasy")}
              {renderCarousel(portraitsTemplates, "Portraits")}
              {renderCarousel(abstractTemplates, "Abstract")}

              {/* Loading and Empty States */}
              {isLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <div className="aspect-square bg-muted" />
                      <div className="p-2">
                        <div className="h-3 bg-muted rounded w-3/4" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {!isLoading && templates.length === 0 && (
                <div className="text-center py-12">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No templates available.</p>
                </div>
              )}
            </div>
        )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-background">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <Card className="max-w-2xl mx-auto border-4 border-black shadow-brutal">
            <CardContent className="p-8 md:p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-black mb-4">Can't Find What You Need?</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Explore all our AI models for custom creations
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" variant="neon">
                  <Link to="/dashboard/custom-creation">Start Creating</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/features">View All Features</Link>
                </Button>
              </div>
          </CardContent>
        </Card>
        </div>
      </section>
    </>
  );
};

export default Templates;