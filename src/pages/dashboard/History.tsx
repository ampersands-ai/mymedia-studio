import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Flag } from "lucide-react";
import { toast } from "sonner";
import { useOnboarding } from "@/hooks/useOnboarding";
import { LoadingTransition } from "@/components/ui/loading-transition";
import { GallerySkeleton } from "@/components/ui/skeletons/GallerySkeleton";
import { useImagePreloader } from "@/hooks/useImagePreloader";
import { useGenerationHistory } from "./hooks/useGenerationHistory";
import { useGenerationFilters } from "./hooks/useGenerationFilters";
import { useGenerationActions } from "./hooks/useGenerationActions";
import { GenerationFilters } from "./components/GenerationFilters";
import { GenerationList } from "./components/GenerationList";
import { GenerationDetailsModal } from "./components/GenerationDetailsModal";
import type { Generation } from "./hooks/useGenerationHistory";

const ITEMS_PER_PAGE = 20;

const History = () => {
  const { user } = useAuth();
  const [previewGeneration, setPreviewGeneration] = useState<Generation | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportingGeneration, setReportingGeneration] = useState<Generation | null>(null);
  const { progress, updateProgress } = useOnboarding();

  // Filter state
  const {
    statusFilter,
    setStatusFilter,
    contentTypeFilter,
    setContentTypeFilter,
    currentPage,
    setCurrentPage,
  } = useGenerationFilters();

  // Fetch data
  const {
    generations,
    totalCount,
    isLoading: isLoadingGenerations,
    isRefetching,
    refetch,
  } = useGenerationHistory({
    userId: user?.id,
    currentPage,
    itemsPerPage: ITEMS_PER_PAGE,
    statusFilter,
    contentTypeFilter,
  });

  // Actions
  const {
    handleDelete,
    handleDownload,
    reportTokenIssue,
    isReportingIssue,
  } = useGenerationActions(user?.id);

  // SECURITY: Check if generation already has a dispute
  const { data: disputeStatus } = useQuery({
    queryKey: ['dispute-status', previewGeneration?.id],
    queryFn: async () => {
      if (!previewGeneration?.id) return null;

      // Check both active reports and history
      const [active, history] = await Promise.all([
        supabase
          .from('token_dispute_reports')
          .select('id, status')
          .eq('generation_id', previewGeneration.id)
          .maybeSingle(),
        supabase
          .from('token_dispute_history')
          .select('id, status, refund_amount')
          .eq('generation_id', previewGeneration.id)
          .maybeSingle()
      ]);

      return active.data || history.data;
    },
    enabled: !!previewGeneration?.id
  });

  // Track visiting My Creations for onboarding
  useEffect(() => {
    if (progress && !progress.checklist.visitedMyCreations) {
      updateProgress({ visitedMyCreations: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  // Extract image URLs for preloading
  const imageUrls = useMemo(() => {
    if (!generations) return [];
    return generations
      .filter(g => g.type === 'image' && g.storage_path && g.status === 'completed')
      .map(g => {
        const versionedPath = `${g.storage_path}${g.storage_path!.includes('?') ? '&' : '?'}v=${encodeURIComponent(g.created_at)}`;
        return versionedPath;
      });
  }, [generations]);

  // Preload images for current page
  const { isLoading: isLoadingImages } = useImagePreloader(imageUrls, {
    timeout: 4000,
    minLoadedPercentage: 60
  });

  const handleReportTokenIssue = (generation: Generation) => {
    setReportingGeneration(generation);
    setShowReportDialog(true);
    setPreviewGeneration(null); // Close preview dialog
  };

  const submitReport = () => {
    if (!reportReason.trim()) {
      toast.error("Please provide a reason for your report");
      return;
    }
    if (!reportingGeneration) return;

    reportTokenIssue({
      generationId: reportingGeneration.id,
      reason: reportReason,
      generation: reportingGeneration,
    });

    setShowReportDialog(false);
    setReportReason("");
    setReportingGeneration(null);
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const handleDownloadWithOnboarding = (storagePath: string | null, type: string, outputUrl?: string | null) => {
    handleDownload(storagePath, type, outputUrl);
    if (progress && !progress.checklist.downloadedResult) {
      updateProgress({ downloadedResult: true });
    }
  };

  useEffect(() => {
    document.title = "My Creations - Artifio.ai";
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black mb-2">MY CREATIONS</h1>
          <p className="text-lg text-foreground/80 font-medium">
            Your generated AI content
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="icon"
          disabled={isRefetching}
          className="brutal-card-sm"
        >
          <RefreshCw className={`h-5 w-5 ${isRefetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <GenerationFilters
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        contentTypeFilter={contentTypeFilter}
        onContentTypeFilterChange={setContentTypeFilter}
      />

      <LoadingTransition
        isLoading={isLoadingGenerations || isLoadingImages}
        skeleton={<GallerySkeleton count={12} />}
        transition="fade"
      >
        <GenerationList
          generations={generations || []}
          statusFilter={statusFilter}
          onView={setPreviewGeneration}
          onDownload={handleDownloadWithOnboarding}
        />
      </LoadingTransition>

      {/* Pagination Controls */}
      {generations && generations.length > 0 && (
        <div className="flex justify-center items-center gap-4 mt-8 mb-4">
          <Button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-4">
            Page {currentPage} of {Math.ceil((totalCount || 0) / ITEMS_PER_PAGE)}
          </span>
          <Button
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={generations.length < ITEMS_PER_PAGE}
            variant="outline"
            size="sm"
          >
            Next
          </Button>
        </div>
      )}

      {/* Preview Dialog */}
      <GenerationDetailsModal
        generation={previewGeneration}
        disputeStatus={disputeStatus}
        isOpen={!!previewGeneration}
        onClose={() => setPreviewGeneration(null)}
        onDownload={handleDownloadWithOnboarding}
        onDelete={handleDelete}
        onReport={handleReportTokenIssue}
      />

      {/* Report Token Issue Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Report Credit Issue
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Generation Details:</p>
              <p className="text-muted-foreground text-xs">
                Type: {reportingGeneration?.type} | Credits: {Number((reportingGeneration?.tokens_used ?? 0) / 100).toFixed(2)}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Why do you think the credit cost was incorrect?
              </label>
              <Textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Please explain why you believe the credit consumption was incorrect. For example: 'Generation failed but credits were still deducted' or 'Credits charged don't match the model's cost'..."
                rows={5}
                className="resize-none"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg text-xs text-muted-foreground">
              {!reportingGeneration?.output_url && !reportingGeneration?.storage_path ? (
                <p>Since no output was recorded, your credits will be automatically refunded upon submission.</p>
              ) : (
                <p>Our team will review your report and investigate the credit consumption. If we find an error, we'll refund the credits to your account.</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReportDialog(false);
                  setReportReason("");
                  setReportingGeneration(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={submitReport}
                disabled={isReportingIssue || !reportReason.trim()}
                className="flex-1"
              >
                {isReportingIssue ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default History;
