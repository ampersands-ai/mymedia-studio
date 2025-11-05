import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useWorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import { WorkflowInputPanel } from "@/components/generation/WorkflowInputPanel";
import { GenerationPreview } from "@/components/generation/GenerationPreview";
import { GenerationProgress } from "@/components/generation/GenerationProgress";
import { createSignedUrl, extractStoragePath } from "@/lib/storage-utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNativeDownload } from "@/hooks/useNativeDownload";
import { ArrowLeft, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { Skeleton } from "@/components/ui/skeleton";

const CreateWorkflow = () => {
  const [searchParams] = useSearchParams();
  const workflowId = searchParams.get("workflow");
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const { data: workflow, isLoading } = useWorkflowTemplate(workflowId || "");
  const { executeWorkflow, isExecuting, progress } = useWorkflowExecution();
  const { downloadFile } = useNativeDownload();
  
  const [result, setResult] = useState<{ url: string; tokens: number } | null>(null);
  const [generationCompleteTime, setGenerationCompleteTime] = useState<number | null>(null);
  const generationStartTimeRef = useRef<number | null>(null);
  const [templateBeforeImage, setTemplateBeforeImage] = useState<string | null>(null);
  const [templateAfterImage, setTemplateAfterImage] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  useEffect(() => {
    if (!workflowId) {
      navigate("/dashboard/custom-creation");
    }
  }, [workflowId, navigate]);

  useEffect(() => {
    const loadTemplateImages = async () => {
      console.log('🖼️ Loading template images...', {
        before_image_url: workflow?.before_image_url,
        after_image_url: workflow?.after_image_url
      });
      
      if (!workflow?.before_image_url && !workflow?.after_image_url) {
        console.log('⚠️ No template images available');
        return;
      }
      
      setIsLoadingPreview(true);
      
      try {
        const beforePath = workflow.before_image_url ? extractStoragePath(workflow.before_image_url) : null;
        const afterPath = workflow.after_image_url ? extractStoragePath(workflow.after_image_url) : null;
        
        console.log('📁 Extracted paths:', { beforePath, afterPath });
        
        const [beforeUrl, afterUrl] = await Promise.all([
          beforePath ? createSignedUrl('generated-content', beforePath) : null,
          afterPath ? createSignedUrl('generated-content', afterPath) : null,
        ]);
        
        console.log('🔗 Signed URLs:', { beforeUrl, afterUrl });
        
        setTemplateBeforeImage(beforeUrl);
        setTemplateAfterImage(afterUrl);
      } catch (error) {
        console.error('❌ Failed to load template images:', error);
      } finally {
        setIsLoadingPreview(false);
      }
    };
    
    loadTemplateImages();
  }, [workflow]);

  const handleExecute = async (formattedInputs: Record<string, any>) => {
    if (!workflow) return;

    setResult(null);
    setGenerationCompleteTime(null);
    generationStartTimeRef.current = Date.now();
    
    const result = await executeWorkflow({
      workflow_template_id: workflow.id,
      user_inputs: formattedInputs,
    });

    if (result?.final_output_url) {
      setGenerationCompleteTime(Date.now());
      setResult({ url: result.final_output_url, tokens: result.tokens_used });
      toast.success('Workflow completed!');
    } else {
      generationStartTimeRef.current = null;
      toast.error('Workflow failed');
    }
  };

  const handleDownload = async () => {
    if (!result?.url) return;
    
    try {
      const signedUrl = await createSignedUrl('generated-content', result.url);
      if (!signedUrl) {
        toast.error('Failed to create download link');
        return;
      }

      const extension = result.url.split('.').pop() || 'jpg';
      await downloadFile(signedUrl, `workflow-${Date.now()}.${extension}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading workflow...</p>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Workflow not found</p>
      </div>
    );
  }

  const showInputPanel = !isMobile || (!isExecuting && !result);
  const showOutputPanel = !isMobile || isExecuting || result;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 bg-background pb-32 md:pb-8">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        
        <div className="relative z-10 container mx-auto px-4 py-4 md:py-8">
          {/* Header */}
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-4xl font-black mb-2">CREATION STUDIO</h1>
            <p className="text-sm md:text-base text-foreground/80 font-medium">
              {workflow?.name || "Template Workflow"}
            </p>
          </div>

          {/* Main Grid Layout */}
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12">
            {/* Input Panel Card */}
            {showInputPanel && (
              <Card className="bg-card border border-gray-200 shadow-sm rounded-xl order-1">
                <div className="border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 bg-muted/30">
                  <h2 className="text-base md:text-lg font-bold">Input</h2>
                </div>
                
                <div className="p-4 md:p-8 space-y-6 pb-32 md:pb-8">
                  <WorkflowInputPanel
                    workflow={workflow}
                    onExecute={handleExecute}
                    onBack={() => navigate("/dashboard/templates")}
                    isExecuting={isExecuting}
                  />
                </div>
              </Card>
            )}

            {/* Output Panel Card */}
            {showOutputPanel && (
              <Card className="bg-card border border-gray-200 shadow-sm rounded-xl order-2">
                <div className="border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    {isMobile && (isExecuting || result) && (
                      <button
                        onClick={() => setResult(null)}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm">Back</span>
                      </button>
                    )}
                    <h2 className="text-base md:text-lg font-bold">Output</h2>
                  </div>
                </div>

                <div className="p-4 md:p-6">
                  {!isExecuting && !result && (
                    <div className="flex flex-col items-center justify-center min-h-[400px] lg:min-h-[calc(100vh-200px)] text-center px-4">
                      {isLoadingPreview ? (
                        <div className="w-full max-w-2xl space-y-4">
                          <Skeleton className="w-full aspect-video rounded-lg" />
                          <p className="text-sm text-muted-foreground">
                            Loading preview...
                          </p>
                        </div>
                      ) : templateBeforeImage && templateAfterImage ? (
                        <div className="w-full max-w-2xl space-y-4">
                          <BeforeAfterSlider
                            beforeImage={templateBeforeImage}
                            afterImage={templateAfterImage}
                            beforeLabel="Before"
                            afterLabel="After"
                            className="rounded-lg overflow-hidden shadow-lg"
                          />
                          <p className="text-sm text-muted-foreground">
                            Preview of what you'll create
                          </p>
                        </div>
                      ) : templateAfterImage || templateBeforeImage ? (
                        <div className="w-full max-w-2xl space-y-4">
                          <img
                            src={templateAfterImage || templateBeforeImage!}
                            alt="Template preview"
                            className="w-full rounded-lg shadow-lg"
                            onError={(e) => {
                              console.error('❌ Failed to load image:', e.currentTarget.src);
                            }}
                          />
                          <p className="text-sm text-muted-foreground">
                            Preview of what you'll create
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 mb-4 text-muted-foreground/30">
                            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M50 20L60 40L80 45L65 60L68 80L50 70L32 80L35 60L20 45L40 40L50 20Z" 
                                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <p className="text-muted-foreground text-sm max-w-md">
                            Fill in the inputs and click Create to generate your content
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {isExecuting && (
                    <div className="space-y-4">
                      <Card className="border border-gray-200 shadow-sm bg-muted/50 rounded-xl">
                        <CardContent className="p-4 space-y-4">
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground">
                              Feel free to navigate away - your generation will be saved in History
                            </p>
                          </div>

                          {generationStartTimeRef.current && (
                            <GenerationProgress
                              startTime={generationStartTimeRef.current}
                              isComplete={!!result}
                              completedAt={generationCompleteTime || undefined}
                              estimatedTimeSeconds={workflow?.estimated_time_seconds}
                            />
                          )}
                        </CardContent>
                      </Card>

                      {result && (
                        <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
                          <div className="rounded-lg border border-border overflow-hidden shadow-sm">
                            <GenerationPreview
                              storagePath={result.url}
                              contentType="image"
                              className="w-full h-auto"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!isExecuting && result && (
                    <div className="space-y-6 max-w-4xl mx-auto">
                      <div className="rounded-lg border border-border overflow-hidden shadow-sm">
                        <GenerationPreview
                          storagePath={result.url}
                          contentType="image"
                          className="w-full h-auto"
                        />
                      </div>
                      <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          Credits used: <span className="font-medium text-foreground">{result.tokens}</span>
                        </p>
                        <button
                          onClick={handleDownload}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkflow;
