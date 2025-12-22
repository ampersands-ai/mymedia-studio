import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Share2, CheckCircle, Image, Video, Music, Type, ArrowLeft, Coins, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { useImageUrl, useVideoUrl } from "@/hooks/media";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useIsMobile } from "@/hooks/use-mobile";

type GenerationRow = Database['public']['Tables']['generations']['Row'];
type CommunityCreationRow = Database['public']['Tables']['community_creations']['Row'];

interface Generation {
  id: string;
  user_id: string;
  model_id: string;
  model_record_id: string | null;
  type: string;
  prompt: string;
  original_prompt: string | null;
  status: string;
  output_url: string | null;
  storage_path: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  tokens_used: number;
  file_size_bytes: number | null;
  workflow_execution_id?: string | null;
  is_shared?: boolean;
}

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
}

interface UserSubscription {
  plan: string;
  status: string;
  tokens_remaining: number;
  tokens_total: number;
}

const getContentIcon = (type: string) => {
  switch (type) {
    case 'image':
      return <Image className="h-4 w-4" />;
    case 'video':
      return <Video className="h-4 w-4" />;
    case 'audio':
      return <Music className="h-4 w-4" />;
    case 'text':
      return <Type className="h-4 w-4" />;
    default:
      return null;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">Completed</Badge>;
    case 'processing':
      return <Badge variant="default" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Processing</Badge>;
    case 'pending':
      return <Badge variant="default" className="bg-blue-500/20 text-blue-500 border-blue-500/30">Pending</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const PreviewCell = ({ gen, onClick }: { gen: Generation; onClick: () => void }) => {
  const { url: imageUrl, isLoading: imageLoading } = useImageUrl(
    gen.type === 'image' ? gen.storage_path : null,
    { strategy: 'public-cdn', bucket: 'generated-content' }
  );
  const { url: videoUrl, isLoading: videoLoading } = useVideoUrl(
    gen.type === 'video' ? gen.storage_path : null,
    { strategy: 'public-direct', bucket: 'generated-content' }
  );
  
  const signedUrl = gen.type === 'image' ? imageUrl : videoUrl;
  const isLoading = imageLoading || videoLoading;

  if (!gen.output_url && !gen.storage_path) {
    return <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-xs">No preview</div>;
  }

  const displayUrl = signedUrl || gen.output_url;

  if (isLoading) {
    return <div className="w-16 h-16 bg-muted rounded flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  }

  return (
    <button onClick={onClick} className="focus:outline-none focus:ring-2 focus:ring-primary rounded">
      {gen.type === 'image' ? (
        <img 
          src={displayUrl || ''} 
          alt="Preview" 
          className="w-16 h-16 object-cover rounded border hover:opacity-80 transition-opacity cursor-pointer"
        />
      ) : gen.type === 'video' ? (
        <video 
          src={displayUrl || ''} 
          className="w-16 h-16 object-cover rounded border cursor-pointer"
          muted
          preload="metadata"
        />
      ) : (
        <Button size="sm" variant="outline">View</Button>
      )}
    </button>
  );
};

const PreviewContent = ({ gen }: { gen: Generation }) => {
  const { url: imageUrl, isLoading: imageLoading } = useImageUrl(
    gen.type === 'image' ? gen.storage_path : null,
    { strategy: 'public-cdn', bucket: 'generated-content' }
  );
  const { url: videoUrl, isLoading: videoLoading } = useVideoUrl(
    gen.type === 'video' ? gen.storage_path : null,
    { strategy: 'public-direct', bucket: 'generated-content' }
  );
  
  const signedUrl = gen.type === 'image' ? imageUrl : videoUrl;
  const isLoading = imageLoading || videoLoading;
  
  if (isLoading) {
    return <Loader2 className="h-8 w-8 animate-spin" />;
  }

  const displayUrl = signedUrl || gen.output_url;

  if (gen.type === 'image') {
    return <img src={displayUrl || ''} alt="Generation" className="max-w-full max-h-[60vh] object-contain" />;
  }
  
  if (gen.type === 'video') {
    return <video src={displayUrl || ''} controls className="max-w-full max-h-[60vh]" />;
  }

  return <p className="text-muted-foreground">Preview not available</p>;
};

export default function UserGenerations() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);

  const pagination = usePagination({
    pageSize: 50,
    initialPage: 1,
  });

  // Fetch user profile
  const { data: userProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['admin-user-profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!userId,
  });

  // Fetch user subscription
  const { data: userSubscription } = useQuery({
    queryKey: ['admin-user-subscription', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('plan, status, tokens_remaining, tokens_total')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as UserSubscription | null;
    },
    enabled: !!userId,
  });

  // Fetch user generations with stats
  const { data: queryResult, isLoading: isLoadingGenerations } = useQuery({
    queryKey: ['admin-user-generations', userId, pagination.page, pagination.pageSize],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const { data, error, count } = await supabase
        .from('generations')
        .select(
          '*',
          // @ts-expect-error Supabase types don't include count option overload
          { count: 'exact' }
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(pagination.from, pagination.to);

      if (error) throw error;

      if (count !== null) {
        pagination.setTotalCount(count);
      }

      // Check which generations are already shared
      const generationIds = (data || []).map((g: GenerationRow) => g.id);
      const { data: sharedData } = await supabase
        .from('community_creations')
        .select('generation_id')
        .in('generation_id', generationIds);

      const sharedIds = new Set(sharedData?.map((s: CommunityCreationRow) => s.generation_id) || []);

      const generations = (data || []).map((gen: GenerationRow) => ({
        ...gen,
        is_shared: sharedIds.has(gen.id),
      }));

      return {
        generations,
        totalCount: count || 0,
      };
    },
    enabled: !!userId,
  });

  // Fetch generation stats
  const { data: stats } = useQuery({
    queryKey: ['admin-user-generation-stats', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const { data, error } = await supabase
        .from('generations')
        .select('type, status, tokens_used')
        .eq('user_id', userId);

      if (error) throw error;

      const result = {
        total: data.length,
        images: data.filter((g: { type: string }) => g.type === 'image').length,
        videos: data.filter((g: { type: string }) => g.type === 'video').length,
        audio: data.filter((g: { type: string }) => g.type === 'audio').length,
        completed: data.filter((g: { status: string }) => g.status === 'completed').length,
        failed: data.filter((g: { status: string }) => g.status === 'failed').length,
        creditsUsed: data.reduce((acc: number, g: { tokens_used: number }) => acc + (g.tokens_used || 0), 0),
      };

      return result;
    },
    enabled: !!userId,
  });

  const generations = queryResult?.generations || [];
  const totalCount = queryResult?.totalCount || 0;

  const shareToCommunity = useMutation({
    mutationFn: async (generation: Generation) => {
      const { error } = await supabase
        .from('community_creations')
        .insert({
          generation_id: generation.id,
          user_id: generation.user_id,
          model_id: generation.model_id,
          model_record_id: generation.model_record_id,
          parameters: generation.settings || {},
          prompt: generation.prompt,
          output_url: generation.output_url,
          content_type: generation.type,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Shared to community",
        description: "Generation is now visible in community creations",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-user-generations'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to share",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const unshareFromCommunity = useMutation({
    mutationFn: async (generationId: string) => {
      const { error } = await supabase
        .from('community_creations')
        .delete()
        .eq('generation_id', generationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Removed from community",
        description: "Generation is no longer visible in community creations",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-user-generations'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const isLoading = isLoadingProfile || isLoadingGenerations;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isMobile = useIsMobile();

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <div>
        <h1 className="text-2xl md:text-3xl font-black">User Generations</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Viewing all generations for this user
        </p>
      </div>

      {/* User Info Card */}
      <Card className="border-2">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-sm md:text-base truncate">{userProfile?.email || 'Unknown'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {userProfile?.full_name && (
                <span className="text-xs md:text-sm text-muted-foreground">({userProfile.full_name})</span>
              )}
              <Badge variant="outline" className="capitalize text-xs">
                {userSubscription?.plan || 'freemium'}
              </Badge>
              <Badge variant={userSubscription?.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                {userSubscription?.status || 'inactive'}
              </Badge>
              <div className="flex items-center gap-1 text-xs md:text-sm">
                <Coins className="h-3 w-3 text-primary" />
                <span className="font-bold">{userSubscription?.tokens_remaining?.toLocaleString() || 0}</span>
                <span className="text-muted-foreground hidden sm:inline">/ {userSubscription?.tokens_total?.toLocaleString() || 0}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-4">
          <Card className="border-2">
            <CardContent className="p-3 md:p-4">
              <span className="text-xs text-muted-foreground">Total</span>
              <p className="text-xl md:text-2xl font-bold">{stats.total.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-1">
                <Image className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Images</span>
              </div>
              <p className="text-xl md:text-2xl font-bold">{stats.images.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-1">
                <Video className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Videos</span>
              </div>
              <p className="text-xl md:text-2xl font-bold">{stats.videos.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-1">
                <Music className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Audio</span>
              </div>
              <p className="text-xl md:text-2xl font-bold">{stats.audio.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="border-2 hidden sm:block">
            <CardContent className="p-3 md:p-4">
              <span className="text-xs text-muted-foreground">Completed</span>
              <p className="text-xl md:text-2xl font-bold text-green-500">{stats.completed.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="border-2 hidden sm:block">
            <CardContent className="p-3 md:p-4">
              <span className="text-xs text-muted-foreground">Failed</span>
              <p className="text-xl md:text-2xl font-bold text-red-500">{stats.failed.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="border-2 hidden lg:block">
            <CardContent className="p-3 md:p-4">
              <span className="text-xs text-muted-foreground">Credits Used</span>
              <p className="text-xl md:text-2xl font-bold">{stats.creditsUsed.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!selectedGeneration} onOpenChange={() => setSelectedGeneration(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Generation Preview</DialogTitle>
          </DialogHeader>
          {selectedGeneration && (
            <div className="space-y-4">
              <div className="flex items-center justify-center bg-muted rounded-lg p-4">
                <PreviewContent gen={selectedGeneration} />
              </div>
              <div className="space-y-2 text-sm">
                <p><strong>Type:</strong> {selectedGeneration.type}</p>
                <p><strong>Model:</strong> <code className="bg-muted px-2 py-1 rounded">{selectedGeneration.model_id}</code></p>
                <p><strong>Status:</strong> {getStatusBadge(selectedGeneration.status)}</p>
                {!selectedGeneration.workflow_execution_id ? (
                  <p><strong>Prompt:</strong> {selectedGeneration.prompt}</p>
                ) : (
                  <p><strong>Source:</strong> <span className="italic text-muted-foreground">Workflow generation</span></p>
                )}
                <p><strong>Credits Used:</strong> {selectedGeneration.tokens_used}</p>
                <p><strong>Created:</strong> {format(new Date(selectedGeneration.created_at), 'PPpp')}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Generations List */}
      <Card>
        <CardHeader className="px-3 md:px-6">
          <CardTitle className="text-base md:text-lg">
            {totalCount.toLocaleString()} Generations
            {generations.length > 0 && totalCount > generations.length && (
              <span className="text-xs md:text-sm font-normal text-muted-foreground ml-2">
                (Showing {generations.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          {generations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No generations found for this user
            </div>
          ) : isMobile ? (
            /* Mobile Card View */
            <div className="space-y-3">
              {generations.map((gen: Generation) => (
                <Card key={gen.id} className="border p-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <PreviewCell gen={gen} onClick={() => setSelectedGeneration(gen)} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        {getContentIcon(gen.type)}
                        <span className="capitalize text-sm font-medium">{gen.type}</span>
                        {getStatusBadge(gen.status)}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{gen.prompt}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <code className="bg-muted px-1 py-0.5 rounded text-[10px] truncate max-w-[100px]">
                          {gen.model_id}
                        </code>
                        <span>{gen.tokens_used} credits</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(gen.created_at), 'MMM d, HH:mm')}
                        </span>
                        {gen.status === 'completed' && (
                          gen.is_shared ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => unshareFromCommunity.mutate(gen.id)}
                              disabled={unshareFromCommunity.isPending}
                            >
                              <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                              Shared
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => shareToCommunity.mutate(gen)}
                              disabled={shareToCommunity.isPending}
                            >
                              <Share2 className="h-3 w-3 mr-1" />
                              Share
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            /* Desktop Table View */
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Prompt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generations.map((gen: Generation) => (
                    <TableRow key={gen.id}>
                      <TableCell>
                        <PreviewCell gen={gen} onClick={() => setSelectedGeneration(gen)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getContentIcon(gen.type)}
                          <span className="capitalize">{gen.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {gen.model_id}
                        </code>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={gen.prompt}>
                          {gen.prompt}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(gen.status)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(gen.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        {gen.tokens_used.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {gen.status === 'completed' && (
                            gen.is_shared ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => unshareFromCommunity.mutate(gen.id)}
                                disabled={unshareFromCommunity.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                                Shared
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => shareToCommunity.mutate(gen)}
                                disabled={shareToCommunity.isPending}
                              >
                                <Share2 className="h-4 w-4 mr-1" />
                                Share
                              </Button>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalCount > pagination.pageSize && (
            <div className="mt-4">
              <PaginationControls
                page={pagination.page}
                totalPages={pagination.totalPages}
                totalCount={totalCount}
                pageSize={pagination.pageSize}
                hasPrevious={pagination.hasPrevious}
                hasNext={pagination.hasNext}
                onPageChange={pagination.goToPage}
                onFirstPage={pagination.firstPage}
                onLastPage={pagination.lastPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
