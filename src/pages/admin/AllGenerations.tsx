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
import { format } from "date-fns";

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

export default function AllGenerations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

      <Card>
        <CardHeader>
          <CardTitle>Total Generations: {generations?.length || 0}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>User Details</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Parameters</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generations?.map((gen) => (
                  <TableRow key={gen.id}>
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
                            className="text-xs text-primary hover:underline"
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
                      <details className="cursor-pointer">
                        <summary className="text-xs text-muted-foreground">
                          View params
                        </summary>
                        <pre className="text-xs mt-2 bg-muted p-2 rounded max-w-xs overflow-auto">
                          {JSON.stringify(gen.settings, null, 2)}
                        </pre>
                      </details>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          gen.status === 'completed'
                            ? 'default'
                            : gen.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {gen.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(gen.created_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-right">
                      {gen.tokens_used.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {gen.status === 'completed' && (
                        <>
                          {gen.is_shared ? (
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
                          )}
                        </>
                      )}
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
