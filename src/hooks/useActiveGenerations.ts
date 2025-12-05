import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getModel } from "@/lib/models/registry";
import { ACTIVE_GENERATION_STATUSES } from "@/constants/generation-status";
import { logger } from "@/lib/logger";
import { useUserRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

// Filter out generations older than this threshold (1 hour)
const STALE_GENERATION_THRESHOLD_MS = 60 * 60 * 1000;

export interface ActiveGeneration {
  id: string;
  model_id: string;
  model_name: string;
  content_type: string;
  prompt: string;
  status: string;
  created_at: string;
  model_record_id: string;
}

/**
 * Check if a generation is stale (older than threshold)
 */
const isStaleGeneration = (createdAt: string): boolean => {
  const createdTime = new Date(createdAt).getTime();
  const now = Date.now();
  return (now - createdTime) > STALE_GENERATION_THRESHOLD_MS;
};

export const useActiveGenerations = () => {
  const { user } = useAuth();

  const query = useQuery<ActiveGeneration[]>({
    queryKey: ["active-generations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("generations")
        .select("id, model_id, prompt, status, created_at, model_record_id")
        .eq("user_id", user.id)
        .in("status", ACTIVE_GENERATION_STATUSES as unknown as string[])
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // ADR 007: Enrich with model metadata from registry
      // Also filter out stale generations (older than 1 hour) client-side
      return (data || [])
        .filter((gen: Record<string, unknown>) => !isStaleGeneration(gen.created_at as string))
        .map((gen: Record<string, unknown>): ActiveGeneration => {
          let modelName = "Unknown";
          let contentType = "unknown";

          try {
            const model = getModel(gen.model_record_id as string);
            modelName = model.MODEL_CONFIG.modelName;
            contentType = model.MODEL_CONFIG.contentType;
          } catch (e) {
            logger.warn('Failed to load model from registry', { modelRecordId: gen.model_record_id, error: e });
          }

          return {
            id: gen.id as string,
            model_id: gen.model_id as string,
            model_name: modelName,
            content_type: contentType,
            prompt: gen.prompt as string,
            status: gen.status as string,
            created_at: gen.created_at as string,
            model_record_id: gen.model_record_id as string,
          };
        });
    },
    enabled: !!user?.id,
    // REMOVED: refetchInterval: 3000 (polling)
    // REPLACED WITH: Realtime subscription below (instant updates, 95% less DB load)
    staleTime: 30000, // Data stays fresh for 30s (Realtime keeps it updated)
  });

  // Subscribe to real-time updates for user's generations
  // Replaces 3-second polling with instant push notifications
  useUserRealtimeSubscription(
    "generations",
    user?.id,
    ["active-generations", user?.id],
    {
      event: '*', // Listen for INSERT, UPDATE, DELETE
    }
  );

  return query;
};
