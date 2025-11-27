import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Video, RefreshCw, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from '@/lib/logger';

const componentLogger = logger.child({ component: 'VideoGenerationProgress' });

interface VideoGenerationProgressProps {
  generationId: string;
  outputIndex: number;
  onStatusChange?: () => void;
}

export function VideoGenerationProgress({ 
  generationId, 
  outputIndex,
  onStatusChange 
}: VideoGenerationProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Automatic polling effect - check status every 5 seconds
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data: generation } = await supabase
          .from('generations')
          .select('status')
          .eq('id', generationId)
          .single();

        if (generation?.status === 'completed' || generation?.status === 'failed') {
          componentLogger.debug('Video generation status changed', {
            operation: 'autoPolling',
            generationId,
            status: generation.status
          });
          onStatusChange?.();
        }
      } catch (error) {
        componentLogger.error('Auto-polling error', error instanceof Error ? error : new Error(String(error)), {
          operation: 'autoPolling',
          generationId
        });
      }
    };

    // Initial check after 5 seconds
    const initialTimeout = setTimeout(checkStatus, 5000);
    
    // Then check every 5 seconds
    const pollInterval = setInterval(checkStatus, 5000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(pollInterval);
    };
  }, [generationId, onStatusChange]);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-video-generation-status', {
        body: { generation_id: generationId }
      });

      if (error) throw error;

      if (data.status === 'completed') {
        toast.success('Video generation completed!');
        onStatusChange?.();
      } else if (data.status === 'failed') {
        toast.error(data.message || 'Video generation failed');
        onStatusChange?.();
      } else {
        toast.info('Video is still being generated. Please wait...');
      }
    } catch (error) {
      componentLogger.error('Status check failed', error instanceof Error ? error : new Error(String(error)), {
        operation: 'handleCheckStatus',
        generationId
      });
      toast.error('Failed to check status. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const showCheckButton = elapsedSeconds > 120; // Show after 2 minutes

  return (
    <Card className="bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200/50 dark:border-purple-800/50">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Video className="h-10 w-10 text-purple-600 dark:text-purple-400" />
            <Loader2 className="h-4 w-4 text-purple-600 dark:text-purple-400 animate-spin absolute -bottom-1 -right-1" />
          </div>
          
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-foreground">
                Generating Video #{outputIndex + 1}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Creating your music video with AI...
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <span>Time elapsed: {formatTime(elapsedSeconds)}</span>
              </div>
              {elapsedSeconds < 60 && (
                <span className="text-xs text-muted-foreground">
                  (typically 30-60 seconds)
                </span>
              )}
            </div>

            {showCheckButton && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCheckStatus}
                  disabled={isChecking}
                  className="text-xs"
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Check Status
                    </>
                  )}
                </Button>
                
                {elapsedSeconds > 300 && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Taking longer than expected
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
