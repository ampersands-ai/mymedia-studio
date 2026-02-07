import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { clientLogger } from "@/lib/logging/client-logger";
import { downloadFilename } from "@/config/brand";
import type { Generation } from "./useGenerationHistory";

export const useGenerationActions = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("generations")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(`Failed to delete generation: ${error.message}`);
      return;
    }

    toast.success("Generation deleted");
    queryClient.invalidateQueries({ queryKey: ["generations", userId] });
  };

  const handleDownload = async (storagePath: string | null, type: string, outputUrl?: string | null) => {
    // For video jobs with direct URLs, use the URL directly (legacy support)
    if (!storagePath && outputUrl) {

      try {
        const response = await fetch(outputUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        const isVideo = type === 'video' || type === 'video_editor';
        a.download = isVideo
          ? downloadFilename('video', 'mp4')
          : downloadFilename(type, 'bin');
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);

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
        toast.error('Download blocked by browser. Opening in a new tab…', { id: 'download-toast' });
        window.open(outputUrl, '_blank', 'noopener,noreferrer');
        return;
      }
    }

    if (!storagePath) {
      toast.error('No file path available');
      return;
    }

    try {
      // Create signed URL for download
      const { data, error } = await supabase.storage
        .from('generated-content')
        .createSignedUrl(storagePath, 60); // 1 minute expiry

      if (error || !data?.signedUrl) {
        toast.error(`Failed to create download link: ${error?.message || 'No signed URL returned'}`, { id: 'download-toast' });
        return;
      }

      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const extension = storagePath.split('.').pop() || type;
      const isVideo = type === 'video' || type === 'video_editor';
      a.download = downloadFilename(isVideo ? 'video' : type, extension);
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);

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
      toast.error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'download-toast' });
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

      // Check if this is a failed generation - auto-refund tokens via dedicated endpoint
      if (generation.status === 'failed') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        // Use dedicated refund endpoint for failed generations (no admin role required)
        const refundResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/refund-failed-generation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            generation_id: generationId,
            reason: reason,
          }),
        });

        if (!refundResponse.ok) {
          const errorData = await refundResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to refund credits');
        }
      } else {
        // Normal dispute flow for non-failed generations - submit for admin review
        const { error } = await supabase
          .from("token_dispute_reports")
          .insert({
            generation_id: generationId,
            user_id: userId!,
            reason: reason,
          });

        if (error) throw error;

        // Send admin notification for pending disputes
        try {
          await supabase.functions.invoke('send-dispute-notification', {
            body: {
              generation_id: generationId,
              user_id: userId,
              reason: reason,
              refund_amount: generation.tokens_used,
              auto_resolved: false,
              status: 'pending'
            }
          });
        } catch {
          // Don't fail if notification fails
        }
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
      toast.error(`Failed to submit report: ${error instanceof Error ? error.message : 'Please try again'}`);
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
