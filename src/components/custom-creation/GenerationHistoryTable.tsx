import { useState, useEffect, useCallback, memo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ExternalLink, 
  Copy, 
  Clock, 
  Image as ImageIcon, 
  Video, 
  Music, 
  FileText,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { RECORD_ID_REGISTRY } from '@/lib/models/locked/index';
import { getDisplayableParameters } from '@/lib/utils/parameterDisplayFilter';

interface HistoryGeneration {
  id: string;
  type: string;
  prompt: string;
  status: string;
  tokens_used: number;
  created_at: string;
  completed_at: string | null;
  storage_path: string | null;
  output_url: string | null;
  model_id: string | null;
  model_record_id: string | null;
  settings: Record<string, unknown> | null;
}

const ITEMS_LIMIT = 10;

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'image': return <ImageIcon className="h-3.5 w-3.5" />;
    case 'video': return <Video className="h-3.5 w-3.5" />;
    case 'audio': return <Music className="h-3.5 w-3.5" />;
    default: return <FileText className="h-3.5 w-3.5" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge variant="outline" className="text-green-600 border-green-600/30 bg-green-500/10 text-[10px] px-1.5 py-0"><CheckCircle className="h-2.5 w-2.5 mr-0.5" />Done</Badge>;
    case 'failed':
      return <Badge variant="outline" className="text-red-600 border-red-600/30 bg-red-500/10 text-[10px] px-1.5 py-0"><XCircle className="h-2.5 w-2.5 mr-0.5" />Failed</Badge>;
    case 'pending':
    case 'processing':
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600/30 bg-yellow-500/10 text-[10px] px-1.5 py-0 animate-pulse"><Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />Processing</Badge>;
    default:
      return null;
  }
};

const getModelInfo = (recordId: string | null) => {
  if (!recordId) return null;
  const module = RECORD_ID_REGISTRY[recordId];
  if (!module?.MODEL_CONFIG) return null;
  return {
    name: module.MODEL_CONFIG.modelName,
    version: module.MODEL_CONFIG.variantName || '',
    group: formatContentType(module.MODEL_CONFIG.contentType),
  };
};

const formatContentType = (contentType: string): string => {
  const formatMap: Record<string, string> = {
    'prompt_to_image': 'Text to Image',
    'image_editing': 'Image Editing',
    'image_to_video': 'Image to Video',
    'prompt_to_video': 'Text to Video',
    'lip_sync': 'Lip Sync',
    'video_to_video': 'Video to Video',
    'prompt_to_audio': 'Audio',
  };
  return formatMap[contentType] || contentType;
};

const formatGenerationTime = (createdAt: string, completedAt: string | null): string | null => {
  if (!completedAt) return null;
  const startTime = new Date(createdAt).getTime();
  const endTime = new Date(completedAt).getTime();
  const seconds = Math.round((endTime - startTime) / 1000);
  if (seconds < 0 || seconds > 3600) return null;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
};


export const GenerationHistoryTable = memo(function GenerationHistoryTable() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());

  const toggleExpandPrompt = useCallback((id: string) => {
    setExpandedPrompts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Fetch recent generations
  const { data: generations, isLoading, refetch } = useQuery<HistoryGeneration[]>({
    queryKey: ['custom-creation-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_content_history')
        .select('id, type, prompt, status, tokens_used, created_at, completed_at, storage_path, output_url, model_id, model_record_id, settings')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(ITEMS_LIMIT);
      
      if (error) throw error;
      return (data || []) as HistoryGeneration[];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
    refetchInterval: (query) => {
      // Refetch more frequently if there are pending generations
      const hasPending = query.state.data?.some(g => 
        g.status === 'pending' || g.status === 'processing'
      );
      return hasPending ? 10000 : 60000;
    },
  });

  // Real-time subscription for updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('generation-history-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generations',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Invalidate and refetch on any change
          queryClient.invalidateQueries({ queryKey: ['custom-creation-history', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const copyPrompt = useCallback((prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success('Prompt copied to clipboard');
  }, []);

  const openOutput = useCallback((storagePath: string | null, outputUrl: string | null) => {
    // Prioritize output_url (already contains correct full URL from database)
    const url = outputUrl 
      || (storagePath 
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/generated-content/${storagePath}`
          : null);
    
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  if (!user) return null;

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Generations
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !generations || generations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No generations yet. Create your first one above!
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {generations.map((gen) => {
                const modelInfo = getModelInfo(gen.model_record_id);
                const genTime = formatGenerationTime(gen.created_at, gen.completed_at);
                const settings = getDisplayableParameters(gen.settings, gen.model_record_id);
                
                return (
                  <div 
                    key={gen.id} 
                    className="border rounded-lg p-3 space-y-2 hover:bg-muted/30 transition-colors"
                  >
                    {/* Header row: date, type, status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(gen.created_at), 'MMM d, h:mm a')}</span>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="flex items-center gap-1 capitalize">
                          {getTypeIcon(gen.type)}
                          {gen.type}
                        </span>
                      </div>
                      {getStatusBadge(gen.status)}
                    </div>

                    {/* Model info row */}
                    {modelInfo && (
                      <div className="flex items-center gap-1.5 text-[11px] text-foreground/80 flex-wrap">
                        <span className="font-medium">{modelInfo.name}</span>
                        {modelInfo.version && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="text-muted-foreground">{modelInfo.version}</span>
                          </>
                        )}
                        <span className="text-muted-foreground/50">•</span>
                        <span className="text-muted-foreground">{modelInfo.group}</span>
                        {genTime && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="text-muted-foreground">{genTime}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Parameters row */}
                    {settings.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {settings.slice(0, 5).map((param) => (
                          <Badge 
                            key={param.key} 
                            variant="secondary" 
                            className="text-[10px] px-1.5 py-0 font-normal"
                          >
                            {param.label}: {param.value}
                          </Badge>
                        ))}
                        {settings.length > 5 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                            +{settings.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Prompt row */}
                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <p className={cn(
                          "text-xs text-foreground/70 flex-1",
                          !expandedPrompts.has(gen.id) && "line-clamp-2"
                        )}>
                          {gen.prompt}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => copyPrompt(gen.prompt)}
                          title="Copy prompt"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {gen.prompt.length > 100 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 text-[10px] px-1 text-primary hover:text-primary"
                          onClick={() => toggleExpandPrompt(gen.id)}
                        >
                          {expandedPrompts.has(gen.id) ? (
                            <>Show less <ChevronUp className="h-3 w-3 ml-0.5" /></>
                          ) : (
                            <>Show more <ChevronDown className="h-3 w-3 ml-0.5" /></>
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Actions row */}
                    {gen.status === 'completed' && (gen.storage_path || gen.output_url) && (
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => openOutput(gen.storage_path, gen.output_url)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Output
                        </Button>
                        <span className="text-[10px] text-muted-foreground">
                          {gen.tokens_used.toFixed(2)} credits
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
});
