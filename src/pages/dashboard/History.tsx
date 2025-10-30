import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Clock, Sparkles, Image as ImageIcon, Video, Music, FileText, RefreshCw, X, AlertCircle, Flag, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useImageUrl, useVideoUrl, useAudioUrl } from "@/hooks/media";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Skeleton } from "@/components/ui/skeleton";
import { OptimizedGenerationImage } from "@/components/generation/OptimizedGenerationImage";

// Component to render image with optimized loading (no signed URL needed for public bucket)
const ImageWithOptimizedLoading = ({ generation, className }: { generation: Generation; className?: string }) => {
  if (!generation.storage_path) {
    return <Skeleton className={className} />;
  }
  
  // Add version parameter to bust cache, similar to video implementation
  const versionedPath = `${generation.storage_path}${generation.storage_path.includes('?') ? '&' : '?'}v=${encodeURIComponent(generation.created_at)}`;
  
  return (
    <OptimizedGenerationImage
      storagePath={versionedPath}
      alt="Generated content"
      className={className}
    />
  );
};

// Component to render audio with audio URL from new architecture
const AudioWithSignedUrl = ({ generation, className, showControls = false }: { 
  generation: Generation; 
  className?: string;
  showControls?: boolean;
}) => {
  const { url: signedUrl, isLoading, error } = useAudioUrl(
    generation.storage_path,
    { strategy: 'public-direct', bucket: 'generated-content' }
  );
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
  workflow_execution_id?: string | null;
  is_video_job?: boolean; // Flag for video jobs
  video_job_data?: any; // Original video job data
}

// Component to render video with signed URL and hover-to-play
const VideoPreview = ({ generation, className, showControls = false, playOnHover = false }: { 
  generation: Generation; 
  className?: string;
  showControls?: boolean;
  playOnHover?: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  
  // Build a source and get video URL using new architecture
  const sourceForSigning = generation.storage_path
    ? generation.storage_path
    : (generation.is_video_job ? generation.output_url : null);
  const { url: videoSignedUrl, isLoading: isLoadingVideoUrl } = useVideoUrl(
    sourceForSigning,
    { strategy: 'public-direct', bucket: 'generated-content' }
  );

  // Show download fallback if we encounter playback error or no signed URL
  if (!videoSignedUrl || videoError) {
    return (
      <div className={`${className} flex flex-col items-center justify-center bg-muted gap-2 p-4`}>
        <Video className="h-8 w-8 text-muted-foreground" />
        <p className="text-xs text-muted-foreground text-center">Video Preview Unavailable</p>
        <Button
          size="sm"
          variant="outline"
          onClick={async (e) => {
            e.stopPropagation();
            toast.loading('Preparing your download...', { id: 'video-download' });
            try {
              if (videoSignedUrl) {
                const response = await fetch(videoSignedUrl);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = `artifio-video-${Date.now()}.mp4`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(blobUrl);
                document.body.removeChild(a);
                toast.success('Download started successfully!', { id: 'video-download' });
              } else if (generation.is_video_job && generation.output_url) {
                // Fallback: direct URL download for video jobs
                const response = await fetch(generation.output_url);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = `artifio-video-${Date.now()}.mp4`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(blobUrl);
                document.body.removeChild(a);
                toast.success('Download started successfully!', { id: 'video-download' });
              } else if (generation.storage_path) {
                // Last resort: create a short-lived signed URL on the fly
                const { data } = await supabase.storage
                  .from('generated-content')
                  .createSignedUrl(generation.storage_path, 60);
                if (data?.signedUrl) {
                  const response = await fetch(data.signedUrl);
                  const blob = await response.blob();
                  const blobUrl = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = blobUrl;
                  a.download = `artifio-video-${Date.now()}.mp4`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(blobUrl);
                  document.body.removeChild(a);
                  toast.success('Download started successfully!', { id: 'video-download' });
                }
              }
            } catch (error) {
              toast.error('Failed to download', { id: 'video-download' });
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
      src={videoSignedUrl || undefined}
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
        console.error('Video playback error for:', videoSignedUrl);
        setVideoError(true);
      }}
      onLoadedMetadata={() => console.log('Video loaded successfully:', videoSignedUrl)}
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

  // SECURITY: Check if generation already has a dispute
  const { data: disputeStatus } = useQuery({
    queryKey: ['dispute-status', previewGeneration?.id],
    queryFn: async () => {
      if (!previewGeneration?.id) return null;
      
      // Check both active reports and history
      const [active, history] = await Promise.all([
        supabase
          .from('token_dispute_reports')
          .select('id, status')
          .eq('generation_id', previewGeneration.id)
          .maybeSingle(),
        supabase
          .from('token_dispute_history')
          .select('id, status, refund_amount')
          .eq('generation_id', previewGeneration.id)
          .maybeSingle()
      ]);
      
      return active.data || history.data;
    },
    enabled: !!previewGeneration?.id
  });

  // Track viewing result
  useEffect(() => {
    if (previewGeneration && progress && !progress.checklist.viewedResult) {
      updateProgress({ viewedResult: true });
    }
  }, [previewGeneration, progress]);

  const { data: generations, refetch, isRefetching } = useQuery<Generation[]>({
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

      // Get completed AND failed video jobs
      const { data: videoData, error: videoError } = await supabase
        .from("video_jobs")
        .select("*")
        .eq("user_id", user!.id)
        .in("status", ["completed", "failed"])
        .order("created_at", { ascending: false });

      if (videoError) console.error("Error fetching video jobs:", videoError);

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

      // Convert video jobs to generation-like format for unified display
      const videoGenerations = (videoData || []).map(video => {
        return {
          id: video.id,
          type: 'video',
          prompt: `Faceless Video: ${video.topic}`,
          output_url: video.final_video_url,
          storage_path: video.storage_path, // Use storage_path for deduplication
          status: video.status,
          tokens_used: video.cost_tokens,
          created_at: video.created_at,
          enhanced_prompt: null,
          ai_caption: video.ai_caption || null,
          ai_hashtags: video.ai_hashtags || null,
          caption_generated_at: video.caption_generated_at,
          provider_response: video.error_message ? { data: { failMsg: video.error_message } } : undefined,
          has_dispute: false,
          dispute_status: undefined,
          parent_generation_id: null,
          output_index: 0,
          is_batch_output: false,
          workflow_execution_id: null,
          is_video_job: true,
          video_job_data: video
        };
      });

      // Filter out generation entries that have the same storage_path as video jobs
      const videoStoragePaths = new Set(
        (videoData || [])
          .map(vj => vj.storage_path)
          .filter(Boolean) // Remove null/undefined
      );
      
      const regularGenerations = enrichedGenerations.filter(gen => 
        !gen.storage_path || !videoStoragePaths.has(gen.storage_path)
      );

      // Combine only regular generations with video generations (no duplicates)
      const all: Generation[] = ([...regularGenerations, ...videoGenerations] as unknown) as Generation[];

      const uniqueMap = new Map<string, Generation>();
      for (const item of all) {
        // Use storage_path as primary key for deduplication
        let key: string;
        
        if (item.storage_path) {
          // Normalize storage_path by removing query parameters
          const cleanPath = item.storage_path.split('?')[0];
          key = `path:${cleanPath}`;
        } else if (item.output_url) {
          // Extract path from URL if no storage_path
          const match = item.output_url.match(/\/object\/public\/[^/]+\/(.+?)(?:\?|$)/);
          key = match ? `path:${match[1]}` : `url:${item.output_url}`;
        } else {
          key = `id:${item.id}`;
        }
        
        const existing = uniqueMap.get(key);
        
        if (!existing) {
          uniqueMap.set(key, item);
        } else {
          // Always prefer video_job entries over generation entries
          if (!existing.is_video_job && item.is_video_job) {
            uniqueMap.set(key, item);
          }
        }
      }

      const combined = Array.from(uniqueMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return combined as Generation[];
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
      // SECURITY: Check if dispute already exists in active reports
      const { data: existingDispute } = await supabase
        .from('token_dispute_reports')
        .select('id')
        .eq('generation_id', generationId)
        .maybeSingle();

      if (existingDispute) {
        throw new Error('A dispute report already exists for this generation');
      }

      // SECURITY: Check history table for already-refunded generations
      const { data: historyDispute } = await supabase
        .from('token_dispute_history')
        .select('id, refund_amount')
        .eq('generation_id', generationId)
        .maybeSingle();

      if (historyDispute) {
        if (historyDispute.refund_amount && historyDispute.refund_amount > 0) {
          throw new Error('This generation was already refunded');
        } else {
          throw new Error('A dispute was already processed for this generation');
        }
      }

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
          throw new Error('Failed to refund credits');
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
      const hasOutput = variables.generation.output_url || variables.generation.storage_path;
      
      if (!hasOutput) {
        // No output = instant refund
        toast.success(`Report submitted! ${(Number(variables.generation.tokens_used)/100).toFixed(2)} credits will be refunded to your account.`);
      } else {
        // Has output = needs review
        toast.success("Report submitted! Our team will review it and respond shortly.");
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

  const handleDownload = async (storagePath: string | null, type: string, outputUrl?: string | null) => {
    // For video jobs with direct URLs, use the URL directly (legacy support)
    if (!storagePath && outputUrl) {
      toast.loading('Preparing your download...', { id: 'download-toast' });
      
      if (progress && !progress.checklist.downloadedResult) {
        updateProgress({ downloadedResult: true });
      }
      
      try {
        const response = await fetch(outputUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `artifio-video-${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
        toast.success('Download started successfully!', { id: 'download-toast' });
        return;
      } catch (error) {
        console.error('Download error:', error);
        toast.error('Failed to download file', { id: 'download-toast' });
        return;
      }
    }

    if (!storagePath) {
      toast.error('No file path available');
      return;
    }

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
      // Use artifio-video- prefix for videos
      const prefix = type === 'video' ? 'artifio-video' : `artifio-${type}`;
      a.download = `${prefix}-${Date.now()}.${extension}`;
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
                    <Badge className="text-[10px] px-1.5 py-0.5 bg-secondary text-secondary-foreground backdrop-blur-sm border border-secondary shadow-sm">
                      #{generation.output_index + 1}
                    </Badge>
                  </div>
                )}
                {generation.status === "failed" ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-red-500/10">
                    <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                    <span className="text-xs text-red-500 font-medium">Generation Failed</span>
                  </div>
                ) : ((generation.storage_path || (generation.is_video_job && generation.output_url)) && generation.status === "completed") ? (
                  <>
                    {generation.type === "video" ? (
                      <VideoPreview 
                        generation={generation}
                        className="w-full h-full object-cover"
                        playOnHover={true}
                      />
                    ) : generation.type === "image" ? (
                      <ImageWithOptimizedLoading 
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

                {!generation.workflow_execution_id && (
                  <p className="text-xs text-foreground/80 line-clamp-1">
                    {generation.enhanced_prompt || generation.prompt}
                  </p>
                )}
                {generation.workflow_execution_id && (
                  <p className="text-xs text-muted-foreground italic line-clamp-1">
                    Template Generation
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{format(new Date(generation.created_at), "MMM d")}</span>
                  {generation.is_batch_output && generation.tokens_used === 0 ? (
                    <span className="text-green-600 dark:text-green-400 font-medium">Batch output</span>
                  ) : (
                    <span>{Number(generation.tokens_used).toFixed(2)} credits</span>
                  )}
                </div>

                {/* Quick actions - Download without opening preview */}
                {(generation.storage_path || generation.output_url) && generation.status === "completed" && (
                  <div className="flex gap-1 pt-1 border-t mt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(generation.storage_path, generation.type, generation.output_url);
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
                        {Number(previewGeneration.tokens_used).toFixed(2)} credits were deducted for this generation attempt.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (previewGeneration.storage_path || previewGeneration.output_url) && previewGeneration.status === "completed" ? (
                <div className="aspect-video relative overflow-hidden bg-muted rounded-lg">
                  {previewGeneration.type === "video" ? (
                    previewGeneration.is_video_job && previewGeneration.output_url ? (
                      <video
                        src={previewGeneration.output_url}
                        className="w-full h-full object-contain"
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <VideoPreview 
                        generation={previewGeneration}
                        className="w-full h-full object-contain"
                        showControls={true}
                      />
                    )
                  ) : previewGeneration.type === "image" ? (
                    <ImageWithOptimizedLoading 
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

              {!previewGeneration.workflow_execution_id && (
                <div className="space-y-2">
                  <h4 className="font-bold text-sm">Prompt:</h4>
                  <p className="text-sm text-foreground/80">
                    {previewGeneration.enhanced_prompt || previewGeneration.prompt}
                  </p>
                </div>
              )}
              {previewGeneration.workflow_execution_id && (
                <div className="space-y-2">
                  <h4 className="font-bold text-sm">Type:</h4>
                  <p className="text-sm text-muted-foreground italic">
                    Template Generation
                  </p>
                </div>
              )}

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
                  <span>{previewGeneration.tokens_used} credits used</span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                {(previewGeneration.storage_path || previewGeneration.output_url) && previewGeneration.status === "completed" && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(previewGeneration.storage_path, previewGeneration.type, previewGeneration.output_url);
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
                  disabled={!!disputeStatus}
                  className="w-full sm:flex-1"
                >
                  {disputeStatus ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Already Reported
                    </>
                  ) : (
                    <>
                      <Flag className="h-4 w-4 mr-2" />
                      Report Credit Issue
                    </>
                  )}
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
              Report Credit Issue
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Generation Details:</p>
              <p className="text-muted-foreground text-xs">
                Type: {reportingGeneration?.type} | Credits: {Number((reportingGeneration?.tokens_used ?? 0) / 100).toFixed(2)}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Why do you think the credit cost was incorrect?
              </label>
              <Textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Please explain why you believe the credit consumption was incorrect. For example: 'Generation failed but credits were still deducted' or 'Credits charged don't match the model's cost'..."
                rows={5}
                className="resize-none"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg text-xs text-muted-foreground">
              {!reportingGeneration?.output_url && !reportingGeneration?.storage_path ? (
                <p>Since no output was recorded, your credits will be automatically refunded upon submission.</p>
              ) : (
                <p>Our team will review your report and investigate the credit consumption. If we find an error, we'll refund the credits to your account.</p>
              )}
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
