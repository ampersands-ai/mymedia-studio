import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { useAllTemplates } from "@/hooks/useTemplates";
import { useWorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, Image as ImageIcon, Video, Music, FileText } from "lucide-react";
import { WorkflowInputPanel } from "@/components/generation/WorkflowInputPanel";
import { GenerationProgress } from "@/components/generation/GenerationProgress";
import { GenerationPreview } from "@/components/generation/GenerationPreview";
import { toast } from "sonner";


const Templates = () => {
  const { user } = useAuth();
  const { data: allTemplates, isLoading } = useAllTemplates();
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();
  
  // Workflow execution state
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const { data: selectedWorkflow } = useWorkflowTemplate(selectedWorkflowId || '');
  const { executeWorkflow, isExecuting, progress } = useWorkflowExecution();
  const [executionResult, setExecutionResult] = useState<{ url: string; tokens: number } | null>(null);
  const [executionStartTime, setExecutionStartTime] = useState<number | null>(null);
  const outputSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Templates - Artifio.ai";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Ready-to-use AI templates for videos, images, audio, and text. Start creating in seconds with professional templates.');
    }
  }, []);

  const categoryIcons: Record<string, any> = {
    "Video Creation": Video,
    "Image Generation": ImageIcon,
    "Portrait Headshots": ImageIcon,
    "Product Photos": ImageIcon,
    "Social Media Content": ImageIcon,
    "Audio Processing": Music,
    "Text Generation": FileText,
    "Creative Design": Sparkles,
    "Photo Editing": ImageIcon,
  };

  const getTemplateIcon = (category: string) => {
    return categoryIcons[category] || Sparkles;
  };

  const templates = allTemplates || [];
  const filteredTemplates = 
    activeTab === "all"
      ? templates
      : activeTab === "workflows"
        ? templates.filter(t => t.template_type === "workflow")
        : templates.filter(t => {
            if (t.template_type === "workflow") return false;
            const contentType = t.ai_models?.content_type?.toLowerCase();
            return contentType === activeTab;
          });

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
      navigate(`/dashboard/create?template=${template.id}`);
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <GlobalHeader />
      
      <main className="flex-1 bg-background">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24 bg-background">
          <div className="max-w-4xl mx-auto text-center">
            <Sparkles className="h-16 w-16 mx-auto mb-6 text-primary" />
            <h1 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
              Ready-to-Use Templates
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              Start creating in seconds with our professional templates
            </p>
          </div>
        </section>

        {/* Templates Grid with Tabs OR Workflow Execution */}
        <section className="container mx-auto px-4 py-12 md:py-16 bg-background">
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
            /* Template Grid View */
            <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
            <TabsList className="grid w-full grid-cols-6 mb-12">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="image">Image</TabsTrigger>
              <TabsTrigger value="video">Video</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="text">Text</TabsTrigger>
              <TabsTrigger value="workflows">Workflows</TabsTrigger>
            </TabsList>

            {/* Template Tabs */}
            {['all', 'image', 'video', 'audio', 'text', 'workflows'].map((tab) => (
              <TabsContent key={tab} value={tab} className="space-y-8">
                {isLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Card key={i} className="animate-pulse">
                        <div className="aspect-square bg-muted" />
                        <div className="p-2">
                          <div className="h-3 bg-muted rounded w-3/4" />
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-12">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No templates found in this category.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {filteredTemplates.map((template) => {
                      const Icon = getTemplateIcon(template.category || '');
                      const isWorkflow = template.template_type === 'workflow';
                      return (
                        <Card key={template.id} className="group hover:shadow-lg transition-all overflow-hidden">
                          <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10">
                            {template.thumbnail_url ? (
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
                            {isWorkflow && (
                              <Badge className="absolute top-1 left-1 text-xs px-1.5 py-0">
                                Workflow
                              </Badge>
                            )}
                            <Badge variant="secondary" className="absolute top-1 right-1 backdrop-blur-sm bg-background/80 text-xs px-1.5 py-0">
                              {template.category}
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
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
          )}
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <Card className="max-w-2xl mx-auto border-4 border-primary">
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
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Templates;
