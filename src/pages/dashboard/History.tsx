import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Clock, Sparkles, Image as ImageIcon, Video, Music, FileText, RefreshCw, X, AlertCircle, Flag } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOnboarding } from "@/hooks/useOnboarding";

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

// Component to render audio with signed URL
const AudioWithSignedUrl = ({ generation, className, showControls = false }: { 
  generation: Generation; 
  className?: string;
  showControls?: boolean;
}) => {
  const { signedUrl, isLoading, error } = useSignedUrl(generation.storage_path);
  const [audioError, setAudioError] = useState(false);

  // Show download fallback if we encounter error or no path
  if (!generation.storage_path || audioError || error) {
    return (
      <div className={`${className} flex flex-col items-center justify-center bg-muted gap-2 p-4`}>
        <Music className="h-8 w-8 text-gray-600 dark:text-gray-400" />
        <p className="text-xs text-muted-foreground text-center">Audio Preview Unavailable</p>
        <Button
          size="sm"
          variant="outline"
          onClick={async (e) => {
            e.stopPropagation();
            if (generation.storage_path) {
              toast.loading('Preparing your download...', { id: 'audio-download' });
              try {
                const { data } = await supabase.storage
                  .from('generated-content')
                  .createSignedUrl(generation.storage_path!, 60);
                if (data?.signedUrl) {
                  const response = await fetch(data.signedUrl);
                  const blob = await response.blob();
                  const blobUrl = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = blobUrl;
                  a.download = `audio-${Date.now()}.mp3`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(blobUrl);
                  document.body.removeChild(a);
                  toast.success('Download started successfully!', { id: 'audio-download' });
                }
              } catch (error) {
                toast.error('Failed to download', { id: 'audio-download' });
              }
            }
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Audio
        </Button>
      </div>
    );
  }

  if (isLoading || !signedUrl) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted`}>
        <Music className="h-8 w-8 text-gray-600 dark:text-gray-400 animate-pulse" />
      </div>
    );
  }

  if (showControls) {
    return (
      <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-background to-muted/30 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Music className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Audio File</p>
            <p className="text-xs text-muted-foreground">Generated audio content</p>
          </div>
        </div>
        <audio
          src={signedUrl}
          className="w-full"
          controls
          preload="metadata"
          onError={() => setAudioError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${className} flex items-center justify-center bg-gradient-to-br from-background to-muted/30`}>
      <Music className="h-8 w-8 text-green-600 dark:text-green-400" />
    </div>
  );
};

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
  ai_caption: string | null;
  ai_hashtags: string[] | null;
  caption_generated_at: string | null;
  provider_response?: {
    data?: {
      failMsg?: string;
    };
  };
  has_dispute?: boolean;
  dispute_status?: string;
  parent_generation_id?: string | null;
  output_index?: number;
  is_batch_output?: boolean;
}

// Component to render video with signed URL and hover-to-play
const VideoPreview = ({ generation, className, showControls = false, playOnHover = false }: { 
  generation: Generation; 
  className?: string;
  showControls?: boolean;
  playOnHover?: boolean;
}) => {
  const { signedUrl, isLoading, error } = useSignedUrl(generation.storage_path);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  

  // Show download fallback if we encounter playback error or no path
  if (!generation.storage_path || videoError) {
    return (
      <div className={`${className} flex flex-col items-center justify-center bg-muted gap-2 p-4`}>
        <Video className="h-8 w-8 text-muted-foreground" />
        <p className="text-xs text-muted-foreground text-center">Video Preview Unavailable</p>
        <Button
          size="sm"
          variant="outline"
          onClick={async (e) => {
            e.stopPropagation();
            if (generation.storage_path) {
              toast.loading('Preparing your download...', { id: 'video-download' });
              try {
                const { data } = await supabase.storage
                  .from('generated-content')
                  .createSignedUrl(generation.storage_path!, 60);
                if (data?.signedUrl) {
                  const response = await fetch(data.signedUrl);
                  const blob = await response.blob();
                  const blobUrl = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = blobUrl;
                  a.download = `video-${Date.now()}.mp4`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(blobUrl);
                  document.body.removeChild(a);
                  toast.success('Download started successfully!', { id: 'video-download' });
                }
              } catch (error) {
                toast.error('Failed to download', { id: 'video-download' });
              }
            }
          }}
        >
          <Download className="h-3 w-3 mr-1" />
          Download Video
        </Button>
      </div>
    );
  }

  const handleMouseEnter = () => {
    if (playOnHover && videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    if (playOnHover && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return (
    <video
      ref={videoRef}
      src={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stream-content?bucket=generated-content&path=${encodeURIComponent(generation.storage_path || '')}`}
      className={className}
      preload="metadata"
      controls={showControls}
      playsInline
      muted={!showControls}
      loop={playOnHover}
      crossOrigin="anonymous"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onError={() => {
        console.error('Video playback error for:', generation.storage_path);
        setVideoError(true);
      }}
      onLoadedMetadata={() => console.log('Video loaded successfully:', generation.storage_path)}
    />
  );
};

const History = () => {
  const { user } = useAuth();
  const [previewGeneration, setPreviewGeneration] = useState<Generation | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed'>('completed');
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportingGeneration, setReportingGeneration] = useState<Generation | null>(null);
  const queryClient = useQueryClient();
  const { progress, updateProgress } = useOnboarding();

  // Track viewing result
  useEffect(() => {
    if (previewGeneration && progress && !progress.checklist.viewedResult) {
      updateProgress({ viewedResult: true });
    }
  }, [previewGeneration, progress]);

  const { data: generations, refetch, isRefetching } = useQuery({
    queryKey: ["generations", user?.id],
    queryFn: async () => {
      // First get generations (including batch output fields)
      const { data: genData, error: genError } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .order("output_index", { ascending: true });

      if (genError) throw genError;

      // Then get all disputes for this user
      const { data: disputes, error: disputeError } = await supabase
        .from("token_dispute_reports")
        .select("generation_id, status")
        .eq("user_id", user!.id);

      if (disputeError) console.error("Error fetching disputes:", disputeError);

      // Map disputes to generations
      const disputeMap = new Map(disputes?.map(d => [d.generation_id, d.status]) || []);
      
      const enrichedGenerations = genData.map(gen => ({
        ...gen,
        has_dispute: disputeMap.has(gen.id),
        dispute_status: disputeMap.get(gen.id),
      }));

      return enrichedGenerations as Generation[];
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: (query) => {
      // Auto-refetch every minute if there are pending/processing generations
      const hasPending = query.state.data?.some(g => 
        g.status === 'pending' || g.status === 'processing'
      );
      return hasPending ? 60000 : false; // 60 seconds
    },
  });

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
    refetch();
  };

  const reportTokenIssueMutation = useMutation({
    mutationFn: async ({ generationId, reason, generation }: { generationId: string; reason: string; generation: Generation }) => {
      // Check if this is a failed generation - auto-refund tokens
      if (generation.status === 'failed') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        // Refund tokens automatically
        const refundResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-tokens`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            user_id: user!.id,
            amount: generation.tokens_used,
            action: 'add'
          }),
        });

        if (!refundResponse.ok) {
          throw new Error('Failed to refund tokens');
        }

        // Create dispute record as auto-resolved
        const errorMsg = generation.provider_response?.data?.failMsg || 'Generation failed';
        const { error } = await supabase
          .from("token_dispute_reports")
          .insert({
            generation_id: generationId,
            user_id: user!.id,
            reason: reason,
            status: 'resolved',
            auto_resolved: true,
            refund_amount: generation.tokens_used,
            admin_notes: `Auto-resolved on ${new Date().toISOString()}\nReason: Failed generation detected\nAction: Refunded ${generation.tokens_used} tokens automatically\nGeneration ID: ${generationId}\nError: ${errorMsg}`,
          });

        if (error) throw error;
      } else {
        // Normal dispute flow for non-failed generations
        const { error } = await supabase
          .from("token_dispute_reports")
          .insert({
            generation_id: generationId,
            user_id: user!.id,
            reason: reason,
          });

        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      if (variables.generation.status === 'failed') {
        toast.success(`Tokens automatically refunded! ${variables.generation.tokens_used} tokens returned to your account.`);
      } else {
        toast.success("Token issue reported successfully. We'll review it shortly.");
      }
      setShowReportDialog(false);
      setReportReason("");
      setReportingGeneration(null);
      queryClient.invalidateQueries({ queryKey: ["generations", user?.id] });
    },
    onError: (error) => {
      toast.error("Failed to submit report. Please try again.");
      console.error(error);
    },
  });

  const handleReportTokenIssue = (generation: Generation) => {
    // Check if dispute already exists
    if (generation.has_dispute) {
      const statusText = generation.dispute_status === 'pending' ? 'pending review' :
                         generation.dispute_status === 'reviewed' ? 'under review' :
                         generation.dispute_status === 'resolved' ? 'resolved' : 
                         generation.dispute_status === 'rejected' ? 'rejected' : 'being processed';
      
      toast.error(`You've already reported this generation. Status: ${statusText}`);
      return;
    }
    
    setReportingGeneration(generation);
    setShowReportDialog(true);
    setPreviewGeneration(null); // Close preview dialog
  };

  const submitReport = () => {
    if (!reportReason.trim()) {
      toast.error("Please provide a reason for your report");
      return;
    }
    if (!reportingGeneration) return;

    reportTokenIssueMutation.mutate({
      generationId: reportingGeneration.id,
      reason: reportReason,
      generation: reportingGeneration,
    });
  };

  const handleRefresh = async () => {
    await refetch();
    toast.success('History refreshed!');
  };

  const handleDownload = async (storagePath: string, type: string) => {
    // Show instant feedback
    toast.loading('Preparing your download...', { id: 'download-toast' });
    
    // Track download in onboarding
    if (progress && !progress.checklist.downloadedResult) {
      updateProgress({ downloadedResult: true });
    }
    
    try {
      // Create signed URL for download
      const { data, error } = await supabase.storage
        .from('generated-content')
        .createSignedUrl(storagePath, 60); // 1 minute expiry
      
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "image": return <ImageIcon className="h-4 w-4" />;
      case "video": return <Video className="h-4 w-4" />;
      case "audio": return <Music className="h-4 w-4" />;
      case "text": return <FileText className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string, createdAt?: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500 text-white text-xs px-1.5 py-0">Done</Badge>;
      case "failed":
        return <Badge className="bg-red-500 text-white text-xs px-1.5 py-0">Failed</Badge>;
      case "pending":
      case "processing":
        // Calculate time since creation for better status messages
        if (createdAt) {
          const minutesAgo = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
          if (minutesAgo > 30) {
            return <Badge className="bg-red-500 text-white text-xs px-1.5 py-0">Stuck</Badge>;
          }
          if (minutesAgo > 15) {
            return <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0">Long wait...</Badge>;
          }
        }
        return (
          <Badge className="bg-yellow-500 animate-pulse text-white text-xs px-1.5 py-0">
            <Clock className="h-2.5 w-2.5 mr-0.5 inline" />
            {status === 'processing' ? 'Processing' : 'Pending'}
          </Badge>
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    document.title = "My Creations - Artifio.ai";
  }, []);

  // Filter generations based on status filter
  const filteredGenerations = generations?.filter(g => {
    if (statusFilter === 'completed') return g.status === 'completed';
    if (statusFilter === 'failed') return g.status === 'failed';
    return true; // 'all'
  }) || [];

  // No loading state - show empty state immediately or render data
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black mb-2">MY CREATIONS</h1>
          <p className="text-lg text-foreground/80 font-medium">
            Your generated AI content
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="icon"
          disabled={isRefetching}
          className="brutal-card-sm"
        >
          <RefreshCw className={`h-5 w-5 ${isRefetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="mb-6">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="completed">Successful</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {!filteredGenerations || filteredGenerations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            {statusFilter === 'all' && (
              <>
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold mb-2">No creations yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start creating to see your content here
                </p>
                <Button onClick={() => (window.location.href = "/dashboard/custom-creation")} className="bg-primary hover:bg-primary/90">
                  Start Creating
                </Button>
              </>
            )}
            {statusFilter === 'completed' && (
              <>
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold mb-2">No successful generations yet</h3>
                <p className="text-muted-foreground">
                  Your completed creations will appear here
                </p>
              </>
            )}
            {statusFilter === 'failed' && (
              <>
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-xl font-bold mb-2">No failed generations!</h3>
                <p className="text-muted-foreground">
                  All your generations have been successful
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredGenerations.map((generation) => (
            <Card 
              key={generation.id} 
              className="overflow-hidden cursor-pointer hover-lift"
              onClick={() => setPreviewGeneration(generation)}
            >
              <div className="aspect-square relative overflow-hidden bg-muted">
                {generation.is_batch_output && generation.output_index !== undefined && (
                  <div className="absolute top-1 right-1 z-10">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-background/90 backdrop-blur-sm border shadow-sm">
                      #{generation.output_index + 1}
                    </Badge>
                  </div>
                )}
                {generation.status === "failed" ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-red-500/10">
                    <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                    <span className="text-xs text-red-500 font-medium">Generation Failed</span>
                  </div>
                ) : generation.storage_path && generation.status === "completed" ? (
                  <>
                    {generation.type === "video" ? (
                      <VideoPreview 
                        generation={generation}
                        className="w-full h-full object-cover"
                        playOnHover={true}
                      />
                    ) : generation.type === "image" ? (
                      <ImageWithSignedUrl 
                        generation={generation}
                        className="w-full h-full object-cover"
                      />
                    ) : generation.type === "audio" ? (
                      <AudioWithSignedUrl 
                        generation={generation}
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {getTypeIcon(generation.type)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {getTypeIcon(generation.type)}
                  </div>
                )}
              </div>
              
              <CardContent className="p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {getTypeIcon(generation.type)}
                    <span className="font-bold text-xs capitalize">{generation.type}</span>
                    {generation.ai_caption && (
                      <Sparkles className="h-3 w-3 text-primary" />
                    )}
                  </div>
                  {getStatusBadge(generation.status, generation.created_at)}
                </div>

                <p className="text-xs text-foreground/80 line-clamp-1">
                  {generation.enhanced_prompt || generation.prompt}
                </p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{format(new Date(generation.created_at), "MMM d")}</span>
                  {generation.is_batch_output && generation.tokens_used === 0 ? (
                    <span className="text-green-600 dark:text-green-400 font-medium">Batch output</span>
                  ) : (
                    <span>{generation.tokens_used} tokens</span>
                  )}
                </div>

                {/* Quick actions - Download without opening preview */}
                {generation.storage_path && generation.status === "completed" && (
                  <div className="flex gap-1 pt-1 border-t mt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(generation.storage_path!, generation.type);
                      }}
                      className="flex-1 h-7 text-xs"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewGeneration} onOpenChange={() => setPreviewGeneration(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-black flex items-center justify-between">
              <div className="flex items-center gap-2">
                {previewGeneration && getTypeIcon(previewGeneration.type)}
                <span className="capitalize">{previewGeneration?.type} Generation</span>
                {previewGeneration?.is_batch_output && previewGeneration.output_index !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    Output #{previewGeneration.output_index + 1}
                  </Badge>
                )}
              </div>
              {previewGeneration && getStatusBadge(previewGeneration.status, previewGeneration.created_at)}
            </DialogTitle>
          </DialogHeader>
          
          {previewGeneration && (
            <div className="space-y-4">
              {previewGeneration.status === "failed" ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-bold text-red-500 mb-2">Generation Failed</h4>
                      <p className="text-sm text-foreground/80 mb-3">
                        {previewGeneration.provider_response?.data?.failMsg || 
                         "An error occurred while generating your content. Please try again with different parameters."}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {previewGeneration.tokens_used} tokens were deducted for this generation attempt.
                      </p>
                    </div>
                  </div>
                </div>
              ) : previewGeneration.storage_path && previewGeneration.status === "completed" ? (
                <div className="aspect-video relative overflow-hidden bg-muted rounded-lg">
                  {previewGeneration.type === "video" ? (
                    <VideoPreview 
                      generation={previewGeneration}
                      className="w-full h-full object-contain"
                      showControls={true}
                    />
                  ) : previewGeneration.type === "image" ? (
                    <ImageWithSignedUrl 
                      generation={previewGeneration}
                      className="w-full h-full object-contain"
                    />
                  ) : previewGeneration.type === "audio" ? (
                    <AudioWithSignedUrl 
                      generation={previewGeneration}
                      className="w-full h-full"
                      showControls={true}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {getTypeIcon(previewGeneration.type)}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="space-y-2">
                <h4 className="font-bold text-sm">Prompt:</h4>
                <p className="text-sm text-foreground/80">
                  {previewGeneration.enhanced_prompt || previewGeneration.prompt}
                </p>
              </div>

              {previewGeneration.ai_caption && (
                <div className="space-y-2">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Caption:
                  </h4>
                  <p className="text-sm text-foreground/80 bg-muted/50 p-3 rounded-lg border">
                    {previewGeneration.ai_caption}
                  </p>
                </div>
              )}

              {previewGeneration.ai_hashtags && previewGeneration.ai_hashtags.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      AI Hashtags:
                    </h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(previewGeneration.ai_hashtags!.join(' '));
                        toast.success('Hashtags copied to clipboard!');
                      }}
                      className="h-7 text-xs"
                    >
                      Copy All
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 bg-muted/50 p-3 rounded-lg border">
                    {previewGeneration.ai_hashtags.map((tag, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary" 
                        className="text-xs cursor-pointer hover:bg-primary/20"
                        onClick={() => {
                          navigator.clipboard.writeText(tag);
                          toast.success(`Copied: ${tag}`);
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{format(new Date(previewGeneration.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                {previewGeneration.is_batch_output && previewGeneration.tokens_used === 0 ? (
                  <span className="text-primary font-medium">Part of batch generation</span>
                ) : (
                  <span>{previewGeneration.tokens_used} tokens used</span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                {previewGeneration.storage_path && previewGeneration.status === "completed" && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(previewGeneration.storage_path!, previewGeneration.type);
                    }}
                    className="w-full sm:flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReportTokenIssue(previewGeneration);
                  }}
                  className="w-full sm:flex-1"
                  disabled={previewGeneration.has_dispute}
                >
                  <Flag className="h-4 w-4 mr-2" />
                  {previewGeneration.has_dispute 
                    ? `Reported (${previewGeneration.dispute_status})`
                    : 'Report Token Issue'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(previewGeneration.id);
                    setPreviewGeneration(null);
                  }}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Report Token Issue Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Report Token Issue
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Generation Details:</p>
              <p className="text-muted-foreground text-xs">
                Type: {reportingGeneration?.type} | Tokens: {reportingGeneration?.tokens_used}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Why do you think the token cost was incorrect?
              </label>
              <Textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Please explain why you believe the token consumption was incorrect. For example: 'Generation failed but tokens were still deducted' or 'Tokens charged don't match the model's cost'..."
                rows={5}
                className="resize-none"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg text-xs text-muted-foreground">
              <p>Our team will review your report and investigate the token consumption. If we find an error, we'll refund the tokens to your account.</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReportDialog(false);
                  setReportReason("");
                  setReportingGeneration(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={submitReport}
                disabled={reportTokenIssueMutation.isPending || !reportReason.trim()}
                className="flex-1"
              >
                {reportTokenIssueMutation.isPending ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default History;
