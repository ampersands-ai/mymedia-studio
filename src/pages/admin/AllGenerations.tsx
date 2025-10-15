import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Share2, CheckCircle, Image, Video, Music, Type } from "lucide-react";
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
import { useSignedUrl } from "@/hooks/useSignedUrl";

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
  settings: any;
  created_at: string;
  tokens_used: number;
  file_size_bytes: number | null;
  is_shared?: boolean;
  profiles?: {
    email: string | null;
    full_name: string | null;
    phone_number: string | null;
  };
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

const PreviewCell = ({ gen, onClick }: { gen: Generation; onClick: () => void }) => {
  const { signedUrl, isLoading } = useSignedUrl(gen.storage_path);

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
  const { signedUrl, isLoading } = useSignedUrl(gen.storage_path);
  
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

export default function AllGenerations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);

  const { data: generations, isLoading } = useQuery({
    queryKey: ['admin-all-generations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generations')
        .select(`
          *,
          profiles:user_id (
            email,
            full_name,
            phone_number
          )
        `)
        .in('status', ['completed', 'processing', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check which generations are already shared
      const generationIds = data.map(g => g.id);
      const { data: sharedData } = await supabase
        .from('community_creations')
        .select('generation_id')
        .in('generation_id', generationIds);

      const sharedIds = new Set(sharedData?.map(s => s.generation_id) || []);

      return data.map(gen => ({
        ...gen,
        is_shared: sharedIds.has(gen.id)
      }));
    }
  });

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
      queryClient.invalidateQueries({ queryKey: ['admin-all-generations'] });
    },
    onError: (error: any) => {
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
      queryClient.invalidateQueries({ queryKey: ['admin-all-generations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const pollStatus = useMutation({
    mutationFn: async (generationId: string) => {
      const { data, error } = await supabase.functions.invoke('poll-kie-status', {
        body: { generation_id: generationId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Status checked",
        description: "Generation status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-all-generations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to check status",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">All Generations</h1>
        <p className="text-muted-foreground">
          View and manage all user generations across the platform
        </p>
      </div>

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
                <p><strong>Prompt:</strong> {selectedGeneration.prompt}</p>
                {selectedGeneration.profiles?.email && (
                  <p><strong>User:</strong> {selectedGeneration.profiles.email}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Total Generations: {generations?.length || 0}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>User Details</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Creation Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generations?.map((gen) => (
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
                      <div className="space-y-1">
                        {gen.profiles?.full_name && (
                          <div className="font-medium">{gen.profiles.full_name}</div>
                        )}
                        {gen.profiles?.email && (
                          <a 
                            href={`mailto:${gen.profiles.email}`}
                            className="text-xs text-foreground hover:underline"
                          >
                            {gen.profiles.email}
                          </a>
                        )}
                        <div className="font-mono text-xs text-muted-foreground">
                          ID: {gen.user_id.slice(0, 8)}...
                        </div>
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
                      <span className="text-sm capitalize">
                        Prompt to {gen.type}
                      </span>
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
                        {(gen.status === 'processing' || gen.status === 'pending') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => pollStatus.mutate(gen.id)}
                            disabled={pollStatus.isPending}
                          >
                            {pollStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check Status'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
