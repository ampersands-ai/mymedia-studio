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
  model_id: string | null;
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
 * Parse model_id string for display when registry lookup fails
 * Examples: "klingai:avatar@2.0-standard", "bytedance:2@2", "openai:4@1"
 */
const parseModelIdForDisplay = (modelId: string): { name: string; version: string; type: string } => {
  // Known model patterns with friendly names
  const knownModels: Record<string, { name: string; type: string }> = {
    'klingai:avatar': { name: 'KlingAI Avatar', type: 'Lip Sync' },
    'klingai:image': { name: 'KlingAI', type: 'Text to Image' },
    'klingai:video': { name: 'KlingAI', type: 'Image to Video' },
    'bytedance': { name: 'Bytedance', type: 'Image to Video' },
    'openai': { name: 'OpenAI DALL-E', type: 'Text to Image' },
    'stability': { name: 'Stability AI', type: 'Text to Image' },
    'midjourney': { name: 'Midjourney', type: 'Text to Image' },
    'replicate': { name: 'Replicate', type: 'Text to Image' },
  };

  // Try to match known patterns
  for (const [pattern, info] of Object.entries(knownModels)) {
    if (modelId.startsWith(pattern)) {
      // Extract version after @
      const versionMatch = modelId.match(/@(.+)$/);
      const version = versionMatch ? versionMatch[1].replace(/-/g, ' ') : '';
      return { name: info.name, version, type: info.type };
    }
  }

  // Fallback: parse generic pattern "provider:model@version"
  const match = modelId.match(/^([^:]+)(?::([^@]+))?(?:@(.+))?$/);
  if (match) {
    const [, provider, model, version] = match;
    const name = model 
      ? `${provider.charAt(0).toUpperCase() + provider.slice(1)} ${model}`
      : provider.charAt(0).toUpperCase() + provider.slice(1);
    return {
      name,
      version: version?.replace(/-/g, ' ') || '',
      type: 'Generation'
    };
  }

  return { name: modelId, version: '', type: 'Generation' };
};

/**
 * Determine credit status based on generation and dispute data
 * Credits are reserved (deducted) BEFORE generation starts.
 * For completed generations, credits were charged via the reserve.
 */
const determineCreditStatus = (
  generationStatus: string,
  _tokensCharged: number | null,
  _tokensUsed: number,
  hasDispute: boolean,
  disputeStatus?: string
): CreditStatus => {
  // Check dispute status first
  if (hasDispute) {
    if (disputeStatus === 'pending') return 'pending_refund';
    if (disputeStatus === 'resolved') return 'refunded';
    if (disputeStatus === 'rejected') return 'dispute_rejected';
  }

  // Failed or cancelled generations should show refunded
  if (generationStatus === 'failed' || generationStatus === 'cancelled') {
    return 'refunded';
  }

  // Still processing = reserved
  if (generationStatus === 'pending' || generationStatus === 'processing') {
    return 'reserved';
  }

  // Completed = charged (credits were reserved upfront)
  if (generationStatus === 'completed') {
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

  // Fetch current balance for cumulative calculation
  const balanceQuery = useQuery({
    queryKey: ["user-balance", user?.id],
    queryFn: async (): Promise<number> => {
      if (!user?.id) return 0;

      const { data, error } = await supabase
        .from("user_available_credits")
        .select("total_credits")
        .eq("user_id", user.id)
        .single();

      if (error) {
        logger.warn("Failed to fetch user balance for credit log", { error });
        return 0;
      }

      return data?.total_credits ?? 0;
    },
    enabled: !!user?.id,
  });

  const countQuery = useQuery({
    queryKey: ["credit-log-count", user?.id],
    queryFn: async (): Promise<number> => {
      if (!user?.id) return 0;

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
    queryKey: ["credit-log", user?.id, page, pageSize, balanceQuery.data],
    queryFn: async () => {
      if (!user?.id) return [];

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Fetch generations with pagination - include model_id for fallback
      const { data: generations, error: genError } = await supabase
        .from("generations")
        .select(`
          id,
          prompt,
          model_record_id,
          model_id,
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
        let modelType = "Generation";
        let modelName = "Unknown Model";
        let modelVersion = "";

        // Try registry lookup first
        if (gen.model_record_id) {
          try {
            const model = getModel(gen.model_record_id);
            modelType = getContentTypeLabel(model.MODEL_CONFIG.contentType);
            modelName = model.MODEL_CONFIG.modelName;
            modelVersion = model.MODEL_CONFIG.variantName || "";
          } catch {
            // Registry lookup failed, try parsing model_id
            if (gen.model_id) {
              const parsed = parseModelIdForDisplay(gen.model_id);
              modelName = parsed.name;
              modelVersion = parsed.version;
              modelType = parsed.type;
            }
          }
        } else if (gen.model_id) {
          // No model_record_id, parse model_id directly
          const parsed = parseModelIdForDisplay(gen.model_id);
          modelName = parsed.name;
          modelVersion = parsed.version;
          modelType = parsed.type;
        }

        const disputeInfo = disputeMap.get(gen.id) || { hasDispute: false };
        const creditStatus = determineCreditStatus(
          gen.status,
          gen.tokens_charged,
          gen.tokens_used,
          disputeInfo.hasDispute,
          disputeInfo.status
        );

        // For completed generations, credits were charged via tokens_used (reserved upfront)
        const creditsCharged = creditStatus === 'charged' 
          ? (gen.tokens_charged ?? gen.tokens_used)
          : (gen.tokens_charged ?? 0);
        
        const refundAmount = creditStatus === 'refunded' ? gen.tokens_used : 0;

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

      // Calculate cumulative balances
      // Entries are sorted newest-first, so the most recent entry should show current balance
      // Working backwards: balance BEFORE a charge was higher, BEFORE a refund was lower
      const currentBalance = balanceQuery.data ?? 0;
      
      if (page === 1) {
        // Start with current balance for the newest entry
        let runningBalance = currentBalance;
        
        for (let i = 0; i < entries.length; i++) {
          // This entry's balance is the running balance at this point in time
          entries[i].cumulativeBalance = runningBalance;
          
          // Calculate what the balance was BEFORE this transaction
          // If charged: before this charge, balance was higher by the charged amount
          // If refunded: before this refund, balance was lower by the refund amount
          if (entries[i].creditStatus === 'charged') {
            runningBalance += entries[i].creditsCharged;
          } else if (entries[i].creditStatus === 'refunded') {
            runningBalance -= entries[i].refundAmount;
          }
          // Reserved/pending don't affect the balance calculation for past entries
        }
      }

      return entries;
    },
    enabled: !!user?.id && balanceQuery.data !== undefined,
    staleTime: 30 * 1000,
  });

  return {
    entries: dataQuery.data || [],
    totalCount: countQuery.data || 0,
    totalPages: Math.ceil((countQuery.data || 0) / pageSize),
    isLoading: dataQuery.isLoading || countQuery.isLoading || balanceQuery.isLoading,
    error: dataQuery.error || countQuery.error,
    refetch: dataQuery.refetch,
    currentBalance: balanceQuery.data ?? 0,
  };
};
