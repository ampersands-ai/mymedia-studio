import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getModel } from "@/lib/models/registry";
import { logger } from "@/lib/logger";
import type { CreditLogEntry, CreditStatus } from "@/types/credit-log";

interface UseCreditLogOptions {
  page?: number;
  pageSize?: number;
}

interface GenerationRow {
  id: string;
  prompt: string;
  model_record_id: string | null;
  created_at: string;
  tokens_used: number;
  tokens_charged: number | null;
  status: string;
}

interface DisputeRow {
  generation_id: string;
  status: string;
}

/**
 * Convert contentType to user-friendly label
 */
const getContentTypeLabel = (contentType: string): string => {
  const labelMap: Record<string, string> = {
    'prompt_to_image': 'Text to Image',
    'image_editing': 'Image Editing',
    'image_to_video': 'Image to Video',
    'prompt_to_video': 'Text to Video',
    'video_to_video': 'Video to Video',
    'lip_sync': 'Lip Sync',
    'prompt_to_audio': 'Audio',
  };
  return labelMap[contentType] || contentType;
};

/**
 * Determine credit status based on generation and dispute data
 */
const determineCreditStatus = (
  generationStatus: string,
  tokensCharged: number | null,
  hasDispute: boolean,
  disputeStatus?: string
): CreditStatus => {
  // Check dispute status first
  if (hasDispute) {
    if (disputeStatus === 'pending') return 'pending_refund';
    if (disputeStatus === 'resolved') return 'refunded';
    if (disputeStatus === 'rejected') return 'dispute_rejected';
  }

  // Check generation status
  if (generationStatus === 'failed') {
    return tokensCharged === 0 ? 'refunded' : 'failed';
  }

  if (generationStatus === 'pending' || generationStatus === 'processing') {
    return 'reserved';
  }

  if (generationStatus === 'completed') {
    if (tokensCharged === 0 || tokensCharged === null) {
      return 'refunded';
    }
    return 'charged';
  }

  return 'charged';
};

/**
 * Hook to fetch user's credit activity log
 */
export const useCreditLog = (options: UseCreditLogOptions = {}) => {
  const { user } = useAuth();
  const { page = 1, pageSize = 20 } = options;

  const countQuery = useQuery({
    queryKey: ["credit-log-count", user?.id],
    queryFn: async (): Promise<number> => {
      if (!user?.id) return 0;

      // Count generations for this user using a simple query approach
      // that works with Supabase's generated types
      const { data, error } = await supabase
        .from("generations")
        .select("id")
        .eq("user_id", user.id);

      if (error) {
        logger.error("Failed to fetch credit log count", error);
        return 0;
      }

      return data?.length || 0;
    },
    enabled: !!user?.id,
  });

  const dataQuery = useQuery<CreditLogEntry[]>({
    queryKey: ["credit-log", user?.id, page, pageSize],
    queryFn: async () => {
      if (!user?.id) return [];

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Fetch generations with pagination
      const { data: generations, error: genError } = await supabase
        .from("generations")
        .select(`
          id,
          prompt,
          model_record_id,
          created_at,
          tokens_used,
          tokens_charged,
          status
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (genError) {
        logger.error("Failed to fetch credit log", genError);
        return [];
      }

      if (!generations || generations.length === 0) return [];

      const typedGenerations = generations as GenerationRow[];

      // Fetch active disputes for these generations
      const generationIds = typedGenerations.map(g => g.id);
      const { data: disputes } = await supabase
        .from("token_dispute_reports")
        .select("generation_id, status")
        .in("generation_id", generationIds);

      // Also check dispute history for resolved/rejected disputes
      const { data: disputeHistory } = await supabase
        .from("token_dispute_history")
        .select("generation_id, status")
        .in("generation_id", generationIds);

      // Create a map of generation_id to dispute status
      const disputeMap = new Map<string, { hasDispute: boolean; status?: string }>();
      
      (disputes as DisputeRow[] | null)?.forEach((d) => {
        disputeMap.set(d.generation_id, { hasDispute: true, status: d.status });
      });
      
      (disputeHistory as DisputeRow[] | null)?.forEach((d) => {
        if (!disputeMap.has(d.generation_id)) {
          disputeMap.set(d.generation_id, { hasDispute: true, status: d.status });
        }
      });

      // Enrich with model data
      const entries: CreditLogEntry[] = typedGenerations.map((gen) => {
        let modelType = "Unknown";
        let modelName = "Unknown Model";
        let modelVersion = "";

        if (gen.model_record_id) {
          try {
            const model = getModel(gen.model_record_id);
            modelType = getContentTypeLabel(model.MODEL_CONFIG.contentType);
            modelName = model.MODEL_CONFIG.modelName;
            modelVersion = model.MODEL_CONFIG.variantName || "";
          } catch {
            // Model not found in registry
          }
        }

        const disputeInfo = disputeMap.get(gen.id) || { hasDispute: false };
        const creditStatus = determineCreditStatus(
          gen.status,
          gen.tokens_charged,
          disputeInfo.hasDispute,
          disputeInfo.status
        );

        const creditsCharged = gen.tokens_charged ?? 0;
        const refundAmount = creditStatus === 'refunded' ? gen.tokens_used - creditsCharged : 0;

        return {
          id: gen.id,
          date: new Date(gen.created_at),
          prompt: gen.prompt || "",
          modelType,
          modelName,
          modelVersion,
          creditsReserved: gen.tokens_used,
          creditsCharged,
          creditStatus,
          refundAmount,
          generationStatus: gen.status,
          hasDispute: disputeInfo.hasDispute,
          disputeStatus: disputeInfo.status,
        };
      });

      return entries;
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    entries: dataQuery.data || [],
    totalCount: countQuery.data || 0,
    totalPages: Math.ceil((countQuery.data || 0) / pageSize),
    isLoading: dataQuery.isLoading || countQuery.isLoading,
    error: dataQuery.error || countQuery.error,
    refetch: dataQuery.refetch,
  };
};
