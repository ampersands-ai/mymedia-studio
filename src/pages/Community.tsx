import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createSignedUrl } from "@/lib/storage-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Heart, User, Calendar, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { GlobalHeader } from "@/components/GlobalHeader";
import { logger } from "@/lib/logger";

interface CommunityCreation {
  id: string;
  prompt: string;
  output_url: string | null;
  storage_path: string | null;
  content_type: string;
  model_id: string;
  likes_count: number;
  views_count: number;
  is_featured: boolean;
  shared_at: string;
  user_id: string;
  workflow_execution_id?: string | null;
}

const Community = () => {
  const [creations, setCreations] = useState<CommunityCreation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "image" | "video" | "audio">("all");
  const [sort, setSort] = useState<"recent" | "popular">("recent");
  const [communityEnabled, setCommunityEnabled] = useState(true);

  useEffect(() => {
    document.title = "Community Creations - artifio.ai | Explore AI Art";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Explore amazing AI-generated content from the artifio.ai community. Discover inspiring images, videos, and audio created by talented creators.');
    }
  }, []);

  useEffect(() => {
    const checkCommunityEnabled = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "community_enabled")
        .single();
      
      if (data && typeof data.setting_value === 'object' && data.setting_value !== null) {
        setCommunityEnabled((data.setting_value as { enabled: boolean }).enabled === true);
      }
    };
    
    checkCommunityEnabled();
    fetchCommunityCreations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort]);

  const fetchCommunityCreations = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("community_creations_public")
        .select(`
          *,
          generations!inner(storage_path, workflow_execution_id)
        `);

      // Apply filter
      if (filter !== "all") {
        query = query.eq("content_type", filter);
      }

      // Apply sort
      if (sort === "popular") {
        query = query.order("likes_count", { ascending: false });
      } else {
        query = query.order("shared_at", { ascending: false });
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      // Fetch signed URLs for all creations using storage_path from generations
      const creationsWithUrls = await Promise.all(
        (data || []).map(async (creation: any) => {
          const storagePath = creation.generations?.storage_path;
          const workflowExecutionId = creation.generations?.workflow_execution_id;
          if (storagePath) {
            const signedUrl = await createSignedUrl("generated-content", storagePath);
            return { ...creation, storage_path: storagePath, output_url: signedUrl, workflow_execution_id: workflowExecutionId };
          }
          return { ...creation, storage_path: null, output_url: null, workflow_execution_id: workflowExecutionId };
        })
      );

      setCreations(creationsWithUrls);
    } catch (error) {
      logger.error("Error fetching community creations", error instanceof Error ? error : new Error(String(error)), {
        component: 'Community',
        operation: 'fetchCreations',
        filter,
        sort
      });
      toast.error("Failed to load community creations");
    } finally {
      setLoading(false);
    }
  };

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case "image": return "bg-blue-500";
      case "video": return "bg-purple-500";
      case "audio": return "bg-pink-500";
      default: return "bg-gray-500";
    }
  };

  const getUserDisplayName = () => {
    return 'Community Creator';
  };

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {!communityEnabled ? (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-black">Community Currently Unavailable</h1>
              <p className="text-muted-foreground text-lg">
                Community creations are temporarily disabled. Check back soon!
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-6xl font-black mb-4 gradient-text">
                Community Creations
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Explore amazing AI-generated content from our creative community
              </p>
            </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-8">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList className="brutal-card-sm">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="image">Images</TabsTrigger>
              <TabsTrigger value="video">Videos</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <Button
              variant={sort === "recent" ? "default" : "outline"}
              onClick={() => setSort("recent")}
              className="brutal-card-sm"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Recent
            </Button>
            <Button
              variant={sort === "popular" ? "default" : "outline"}
              onClick={() => setSort("popular")}
              className="brutal-card-sm"
            >
              <Heart className="h-4 w-4 mr-2" />
              Popular
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="h-12 w-12 rounded-xl bg-gradient-primary border-3 border-black brutal-shadow flex items-center justify-center mx-auto animate-pulse">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <p className="mt-4 text-lg font-bold">Loading creations...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && creations.length === 0 && (
          <Card className="p-12 text-center">
            <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-2xl font-bold mb-2">No creations yet</h3>
            <p className="text-muted-foreground mb-6">
              Be the first to share your amazing AI creations with the community!
            </p>
            <Button onClick={() => window.location.href = "/dashboard/custom-creation"}>
              <Sparkles className="h-5 w-5 mr-2" />
              Start Creating
            </Button>
          </Card>
        )}

        {/* Grid of Creations */}
        {!loading && creations.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {creations.map((creation) => (
              <Card key={creation.id} className="overflow-hidden brutal-card hover:scale-105 transition-transform">
                {/* Media Preview */}
                <div className="relative aspect-square bg-muted">
                  {creation.output_url && (
                    <>
                      {creation.content_type === "image" && (
                        <img
                          src={creation.output_url}
                          alt={creation.prompt}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                      {creation.content_type === "video" && (
                        <video
                          src={creation.output_url}
                          className="w-full h-full object-cover"
                          controls
                          preload="metadata"
                        />
                      )}
                      {creation.content_type === "audio" && (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                          <audio src={creation.output_url} controls className="w-full px-4" />
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Featured Badge */}
                  {creation.is_featured && (
                    <Badge className="absolute top-3 right-3 bg-neon-yellow text-black font-black">
                      Featured
                    </Badge>
                  )}

                  {/* Content Type Badge */}
                  <Badge className={`absolute top-3 left-3 ${getContentTypeColor(creation.content_type)} text-white font-bold border border-white/20`}>
                    {creation.content_type}
                  </Badge>
                </div>

                {/* Info */}
                <div className="p-4 space-y-3">
                  {!creation.workflow_execution_id ? (
                    <p className="text-sm line-clamp-2 font-medium">
                      {creation.prompt}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Workflow generation
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{getUserDisplayName()}</span>
                    </div>
                    <span>{format(new Date(creation.shared_at), "MMM d, yyyy")}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{creation.views_count.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      <span>{creation.likes_count.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};

export default Community;
