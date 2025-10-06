import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Clock, Sparkles, Image as ImageIcon, Video, Music, FileText, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Generation {
  id: string;
  type: string;
  prompt: string;
  output_url: string | null;
  status: string;
  tokens_used: number;
  created_at: string;
  enhanced_prompt: string | null;
}

const History = () => {
  const { user } = useAuth();
  const [previewGeneration, setPreviewGeneration] = useState<Generation | null>(null);

  const { data: generations, refetch, isRefetching } = useQuery({
    queryKey: ["generations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Generation[];
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

  const handleRefresh = async () => {
    await refetch();
    toast.success('History refreshed!');
  };

  const handleDownload = async (url: string, type: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const extension = url.split('.').pop()?.split('?')[0] || type;
      a.download = `artifio-${type}-${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
      toast.success('Download started!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500 text-white text-xs px-1.5 py-0">Done</Badge>;
      case "pending":
      case "processing":
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

  // Filter out failed generations
  const successfulGenerations = generations?.filter(g => g.status !== 'failed') || [];

  // No loading state - show empty state immediately or render data
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black mb-2">MY CREATIONS</h1>
          <p className="text-lg text-foreground/80 font-medium">
            Your successfully generated AI content
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

      {!successfulGenerations || successfulGenerations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold mb-2">No creations yet</h3>
            <p className="text-muted-foreground mb-6">
              Start creating to see your content here
            </p>
            <Button onClick={() => (window.location.href = "/dashboard/create")} className="bg-primary hover:bg-primary/90">
              Start Creating
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {successfulGenerations.map((generation) => (
            <Card 
              key={generation.id} 
              className="overflow-hidden cursor-pointer hover-lift"
              onClick={() => setPreviewGeneration(generation)}
            >
              {generation.output_url && generation.status === "completed" && (
                <div className="aspect-square relative overflow-hidden bg-muted">
                  {generation.type === "video" ? (
                    <video
                      src={`${generation.output_url}#t=2`}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      onClick={(e) => e.stopPropagation()}
                      muted
                    />
                  ) : generation.type === "image" ? (
                    <img
                      src={generation.output_url}
                      alt="Generated content"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {getTypeIcon(generation.type)}
                    </div>
                  )}
                </div>
              )}
              
              <CardContent className="p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {getTypeIcon(generation.type)}
                    <span className="font-bold text-xs capitalize">{generation.type}</span>
                  </div>
                  {getStatusBadge(generation.status)}
                </div>

                <p className="text-xs text-foreground/80 line-clamp-1">
                  {generation.enhanced_prompt || generation.prompt}
                </p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{format(new Date(generation.created_at), "MMM d")}</span>
                  <span>{generation.tokens_used} tokens</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewGeneration} onOpenChange={() => setPreviewGeneration(null)}>
        <DialogContent className="sm:max-w-3xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-black flex items-center justify-between">
              <div className="flex items-center gap-2">
                {previewGeneration && getTypeIcon(previewGeneration.type)}
                <span className="capitalize">{previewGeneration?.type} Generation</span>
              </div>
              {previewGeneration && getStatusBadge(previewGeneration.status)}
            </DialogTitle>
          </DialogHeader>
          
          {previewGeneration && (
            <div className="space-y-4">
              {previewGeneration.output_url && previewGeneration.status === "completed" && (
                <div className="aspect-video relative overflow-hidden bg-muted rounded-lg">
                  {previewGeneration.type === "video" ? (
                    <video
                      src={previewGeneration.output_url}
                      className="w-full h-full object-contain"
                      preload="metadata"
                      controls
                    />
                  ) : previewGeneration.type === "image" ? (
                    <img
                      src={previewGeneration.output_url}
                      alt="Generated content"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {getTypeIcon(previewGeneration.type)}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-bold text-sm">Prompt:</h4>
                <p className="text-sm text-foreground/80">
                  {previewGeneration.enhanced_prompt || previewGeneration.prompt}
                </p>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{format(new Date(previewGeneration.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                <span>{previewGeneration.status === 'failed' ? '0' : previewGeneration.tokens_used} tokens used</span>
              </div>

              <div className="flex gap-2 pt-4">
                {previewGeneration.output_url && previewGeneration.status === "completed" && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(previewGeneration.output_url!, previewGeneration.type);
                    }}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(previewGeneration.id);
                    setPreviewGeneration(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default History;
