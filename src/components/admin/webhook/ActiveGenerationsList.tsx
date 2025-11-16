import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, XCircle, Clock, Image, Video, Music } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ActiveGeneration {
  id: string;
  user_id: string;
  type: string;
  prompt: string;
  model_id: string;
  status: string;
  created_at: string;
  provider_task_id: string | null;
}

export const ActiveGenerationsList = () => {
  const queryClient = useQueryClient();
  const [terminatingId, setTerminatingId] = useState<string | null>(null);

  const { data: activeGenerations, isLoading } = useQuery({
    queryKey: ['active-generations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ActiveGeneration[];
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const terminateGeneration = useMutation({
    mutationFn: async (generationId: string) => {
      const { data, error } = await supabase.functions.invoke('fix-stuck-generation', {
        body: { generationId, forceTerminate: true }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-generations'] });
      queryClient.invalidateQueries({ queryKey: ['webhook-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-webhooks'] });
      toast.success('Generation terminated successfully');
      setTerminatingId(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to terminate generation: ' + error.message);
      setTerminatingId(null);
    },
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Music className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'processing':
        return 'default';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Active Generations</CardTitle>
          <Badge variant="outline">
            {activeGenerations?.length || 0} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeGenerations && activeGenerations.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeGenerations.map((generation) => {
                  const durationMs = new Date().getTime() - new Date(generation.created_at).getTime();
                  const durationMinutes = Math.floor(durationMs / 60000);
                  const isStuck = durationMinutes > 5;

                  return (
                    <TableRow key={generation.id} className={isStuck ? 'bg-destructive/5' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(generation.type)}
                          <span className="text-sm capitalize">{generation.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {generation.model_id}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-sm truncate" title={generation.prompt}>
                          {generation.prompt}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(generation.status)}>
                          {generation.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(generation.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span className={`text-sm ${isStuck ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                            {durationMinutes}m
                          </span>
                          {isStuck && (
                            <Badge variant="destructive" className="text-xs ml-1">
                              Stuck
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={terminatingId === generation.id}
                            >
                              {terminatingId === generation.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Terminate
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Terminate Generation?</AlertDialogTitle>
                              <AlertDialogDescription className="space-y-2">
                                <p>
                                  This will immediately fail this generation and refund the tokens to the user.
                                </p>
                                <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                                  <p><strong>Generation ID:</strong> {generation.id.slice(0, 8)}...</p>
                                  <p><strong>Type:</strong> {generation.type}</p>
                                  <p><strong>Model:</strong> {generation.model_id}</p>
                                  <p><strong>Duration:</strong> {durationMinutes} minutes</p>
                                  {generation.provider_task_id && (
                                    <p><strong>Provider Task:</strong> {generation.provider_task_id}</p>
                                  )}
                                </div>
                                <p className="text-destructive">
                                  This action cannot be undone.
                                </p>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => {
                                  setTerminatingId(generation.id);
                                  terminateGeneration.mutate(generation.id);
                                }}
                              >
                                Terminate Generation
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No active generations</p>
            <p className="text-sm mt-1">All generations are completed or failed</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
