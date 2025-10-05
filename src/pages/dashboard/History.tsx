import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Clock, Sparkles, Image as ImageIcon, Video, Music, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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

  const { data: generations, refetch } = useQuery({
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
        return <Badge className="bg-green-500">Completed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-500">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  useEffect(() => {
    document.title = "History - Artifio.ai";
  }, []);

  // No loading state - show empty state immediately or render data
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">GENERATION HISTORY</h1>
        <p className="text-lg text-foreground/80 font-medium">
          View and manage your AI creations
        </p>
      </div>

      {!generations || generations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold mb-2">No generations yet</h3>
            <p className="text-muted-foreground mb-6">
              Start creating to see your history here
            </p>
            <Button onClick={() => (window.location.href = "/dashboard/create")} className="bg-primary hover:bg-primary/90">
              Start Creating
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {generations.map((generation) => (
            <Card key={generation.id} className="overflow-hidden">
              {generation.output_url && generation.status === "completed" && (
                <div className="aspect-video relative overflow-hidden bg-muted">
                  {generation.type === "video" ? (
                    <video
                      src={generation.output_url}
                      className="w-full h-full object-cover"
                      controls
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
              
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(generation.type)}
                    <span className="font-bold text-sm capitalize">{generation.type}</span>
                  </div>
                  {getStatusBadge(generation.status)}
                </div>

                <p className="text-sm text-foreground/80 line-clamp-2">
                  {generation.enhanced_prompt || generation.prompt}
                </p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{format(new Date(generation.created_at), "MMM d, yyyy")}</span>
                  {generation.status !== 'failed' && (
                    <span>{generation.tokens_used} tokens</span>
                  )}
                </div>

                <div className="flex gap-2">
                  {generation.output_url && generation.status === "completed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      asChild
                    >
                      <a href={generation.output_url} download target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(generation.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
