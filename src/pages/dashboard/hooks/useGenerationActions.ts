import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { clientLogger } from "@/lib/logging/client-logger";
import type { Generation } from "./useGenerationHistory";

export const useGenerationActions = (userId: string | undefined) => {
  const queryClient = useQueryClient();

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
    queryClient.invalidateQueries({ queryKey: ["generations", userId] });
  };

  const handleDownload = async (storagePath: string | null, type: string, outputUrl?: string | null) => {
    // For video jobs with direct URLs, use the URL directly (legacy support)
    if (!storagePath && outputUrl) {
      toast.loading('Preparing your download...', { id: 'download-toast' });

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

        // Track activity
        clientLogger.activity({
          activityType: 'download',
          activityName: 'content_downloaded',
          routeName: 'History',
          description: `Downloaded ${type} from history`,
          metadata: {
            content_type: type,
            source: 'direct_url',
          },
        });

        return;
      } catch (error) {
        logger.error('Download error (direct URL)', error as Error, {
          component: 'History',
          operation: 'handleDownload',
          outputUrl: outputUrl.substring(0, 100)
        });
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

      // Track activity
      clientLogger.activity({
        activityType: 'download',
        activityName: 'content_downloaded',
        routeName: 'History',
        description: `Downloaded ${type} from history`,
        metadata: {
          content_type: type,
          storage_path: storagePath,
        },
      });
    } catch (error) {
      logger.error('Download error (storage)', error as Error, {
        component: 'History',
        operation: 'handleDownload',
        storagePath,
        type
      });
      toast.error('Failed to download file', { id: 'download-toast' });
    }
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
            user_id: userId,
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
            user_id: userId!,
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
            user_id: userId!,
            reason: reason,
          });

        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      const hasOutput = variables.generation.output_url || variables.generation.storage_path;

      if (!hasOutput) {
        // No output = instant refund
        toast.success(`Report submitted! ${Number(variables.generation.tokens_used)} credits will be refunded to your account.`);
      } else {
        // Has output = needs review
        toast.success("Report submitted! Our team will review it and respond shortly.");
      }
      queryClient.invalidateQueries({ queryKey: ["generations", userId] });
    },
    onError: (error) => {
      toast.error("Failed to submit report. Please try again.");
      logger.error('Failed to submit token issue report', error as Error, {
        component: 'History',
        operation: 'reportTokenIssue'
      });
    },
  });

  return {
    handleDelete,
    handleDownload,
    reportTokenIssue: reportTokenIssueMutation.mutate,
    isReportingIssue: reportTokenIssueMutation.isPending,
  };
};
