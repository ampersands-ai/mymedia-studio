import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { useAllTemplates } from "@/hooks/useTemplates";
import { useWorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import { useAuth } from "@/contexts/AuthContext";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Image as ImageIcon, Video, Music, FileText, Download, Trash2, Clock, RefreshCw, AlertCircle, Wand2 } from "lucide-react";
import { WorkflowInputPanel } from "@/components/generation/WorkflowInputPanel";
import { GenerationProgress } from "@/components/generation/GenerationProgress";
import { GenerationPreview } from "@/components/generation/GenerationPreview";
import { toast } from "sonner";
import { format } from "date-fns";

// Generation interfaces
interface Generation {
  id: string;
  type: string;
  prompt: string;
  output_url: string | null;
  storage_path: string | null;
  status: string;
  tokens_used: number;
  created_at: string;
  enhanced_prompt: string | null;
  has_dispute?: boolean;
  dispute_status?: string;
}

// Component to render image with signed URL
const ImageWithSignedUrl = ({ generation, className }: { generation: Generation; className?: string }) => {
  const { signedUrl, isLoading } = useSignedUrl(generation.storage_path);
  
  if (isLoading || !signedUrl) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted`}>
        <ImageIcon className="h-8 w-8 text-muted-foreground animate-pulse" />
      </div>
    );
  }
  
  return <img src={signedUrl} alt="Generated content" className={className} />;
};

// Component to render video with signed URL
const VideoPreview = ({ generation, className, playOnHover = false }: { 
  generation: Generation; 
  className?: string;
  playOnHover?: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);
  
  if (!generation.storage_path || videoError) {
    return (
      <div className={`${className} flex flex-col items-center justify-center bg-muted gap-2 p-2`}>
        <Video className="h-8 w-8 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Unavailable</p>
      </div>
    );
  }

  const handleMouseEnter = () => {
    if (playOnHover && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (playOnHover && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <video
      ref={videoRef}
      src={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stream-content?bucket=generated-content&path=${encodeURIComponent(generation.storage_path || '')}`}
      className={className}
      preload="metadata"
      playsInline
      muted
      loop={playOnHover}
      crossOrigin="anonymous"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onError={() => setVideoError(true)}
    />
  );
};

const Templates = () => {
  const { user } = useAuth();
  const { data: allTemplates, isLoading } = useAllTemplates();
  const [activeTab, setActiveTab] = useState("creations");
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed'>('completed');
  const [previewGeneration, setPreviewGeneration] = useState<Generation | null>(null);
  
  // Workflow execution state
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const { data: selectedWorkflow } = useWorkflowTemplate(selectedWorkflowId || '');
  const { executeWorkflow, isExecuting, progress } = useWorkflowExecution();
  const [executionResult, setExecutionResult] = useState<{ url: string; tokens: number } | null>(null);
  const [executionStartTime, setExecutionStartTime] = useState<number | null>(null);
  const outputSectionRef = useRef<HTMLDivElement>(null);

  // Fetch user generations
  const { data: generations, refetch: refetchGenerations, isRefetching } = useQuery({
    queryKey: ["generations", user?.id],
    queryFn: async () => {
      const { data: genData, error: genError } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .order("output_index", { ascending: true });

      if (genError) throw genError;

      const { data: disputes, error: disputeError } = await supabase
        .from("token_dispute_reports")
        .select("generation_id, status")
        .eq("user_id", user!.id);

      if (disputeError) console.error("Error fetching disputes:", disputeError);

      const disputeMap = new Map(disputes?.map(d => [d.generation_id, d.status]) || []);
      
      const enrichedGenerations = genData.map(gen => ({
        ...gen,
        has_dispute: disputeMap.has(gen.id),
        dispute_status: disputeMap.get(gen.id),
      }));

      return enrichedGenerations as Generation[];
    },
    enabled: !!user && activeTab === 'creations',
    staleTime: 30 * 1000,
  });

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
    activeTab === "all" || activeTab === "creations"
      ? templates
      : activeTab === "workflows"
        ? templates.filter(t => t.template_type === "workflow")
        : templates.filter(t => {
            if (t.template_type === "workflow") return false;
            const contentType = t.ai_models?.content_type?.toLowerCase();
            return contentType === activeTab;
          });

  const filteredGenerations = generations?.filter(g => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'completed') return g.status === 'completed';
    if (statusFilter === 'failed') return g.status === 'failed';
    return true;
  }) || [];

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

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("generations")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete generation");
      return;
    }

    toast.success("Generation deleted");
    refetchGenerations();
  };

  const handleDownload = async (storagePath: string, type: string) => {
    toast.loading('Preparing your download...', { id: 'download-toast' });
    
    try {
      const { data, error } = await supabase.storage
        .from('generated-content')
        .createSignedUrl(storagePath, 60);
      
      if (error || !data?.signedUrl) {
        toast.error('Failed to create download link', { id: 'download-toast' });
        return;
      }

      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const extension = storagePath.split('.').pop() || type;
      a.download = `artifio-${type}-${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
      toast.success('Download started successfully!', { id: 'download-toast' });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file', { id: 'download-toast' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500 text-white text-xs px-1.5 py-0">Done</Badge>;
      case "failed":
        return <Badge className="bg-red-500 text-white text-xs px-1.5 py-0">Failed</Badge>;
      case "pending":
      case "processing":
        return <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0">Processing</Badge>;
      default:
        return null;
    }
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
      <GlobalHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
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
        <section className="container mx-auto px-4 py-12 md:py-16">
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
            <TabsList className="grid w-full grid-cols-7 mb-12">
              <TabsTrigger value="creations">My Creations</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="image">Image</TabsTrigger>
              <TabsTrigger value="video">Video</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="text">Text</TabsTrigger>
              <TabsTrigger value="workflows">Workflows</TabsTrigger>
            </TabsList>

            {/* My Creations Tab */}
            <TabsContent value="creations" className="space-y-6">
              <div className="flex justify-between items-center">
                <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="w-auto">
                  <TabsList>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="failed">Failed</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchGenerations()}
                  disabled={isRefetching}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {!user ? (
                <Card className="p-12 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Sign in to view your creations</p>
                  <Button onClick={() => navigate('/auth')}>Sign In</Button>
                </Card>
              ) : filteredGenerations.length === 0 ? (
                <Card className="p-12 text-center">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">No creations yet</p>
                  <p className="text-sm text-muted-foreground mb-4">Start creating with templates</p>
                  <Button onClick={() => setActiveTab('all')}>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Browse Templates
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {filteredGenerations.map((generation) => (
                    <Card
                      key={generation.id}
                      className="group relative overflow-hidden cursor-pointer hover:shadow-lg transition-all"
                      onClick={() => generation.status === 'completed' && setPreviewGeneration(generation)}
                    >
                      <div className="aspect-square relative overflow-hidden bg-muted">
                        {generation.status === 'completed' && generation.storage_path ? (
                          generation.type === 'video' ? (
                            <VideoPreview generation={generation} className="w-full h-full object-cover" playOnHover />
                          ) : generation.type === 'audio' ? (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
                              <Music className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                          ) : (
                            <ImageWithSignedUrl generation={generation} className="w-full h-full object-cover" />
                          )
                        ) : generation.status === 'failed' ? (
                          <div className="w-full h-full flex items-center justify-center bg-red-50 dark:bg-red-950/20">
                            <AlertCircle className="h-8 w-8 text-red-500" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Clock className="h-8 w-8 text-muted-foreground animate-pulse" />
                          </div>
                        )}
                        
                        <div className="absolute top-1 left-1">
                          {getStatusBadge(generation.status)}
                        </div>

                        {generation.status === 'completed' && generation.storage_path && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(generation.storage_path!, generation.type);
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(generation.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="p-2">
                        <p className="text-xs truncate text-muted-foreground">
                          {format(new Date(generation.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

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
                              <Wand2 className="mr-1 h-3 w-3" />
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
                  <Link to="/dashboard/create">Start Creating</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/features">View All Features</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Preview Dialog */}
      <Dialog open={!!previewGeneration} onOpenChange={() => setPreviewGeneration(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generation Preview</DialogTitle>
          </DialogHeader>
          {previewGeneration && (
            <div className="space-y-4">
              {previewGeneration.type === 'image' && previewGeneration.storage_path && (
                <ImageWithSignedUrl generation={previewGeneration} className="w-full rounded-lg" />
              )}
              {previewGeneration.type === 'video' && previewGeneration.storage_path && (
                <VideoPreview generation={previewGeneration} className="w-full rounded-lg" />
              )}
              {previewGeneration.type === 'audio' && (
                <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
                  <Music className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
              )}
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Prompt:</strong> {previewGeneration.prompt}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Created:</strong> {format(new Date(previewGeneration.created_at), 'PPpp')}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Tokens Used:</strong> {previewGeneration.tokens_used}
                </p>
              </div>

              <div className="flex gap-2">
                {previewGeneration.storage_path && (
                  <Button
                    onClick={() => handleDownload(previewGeneration.storage_path!, previewGeneration.type)}
                    className="flex-1"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDelete(previewGeneration.id);
                    setPreviewGeneration(null);
                  }}
                  className="flex-1"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Templates;
