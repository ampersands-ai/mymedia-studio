import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

export const useActiveGenerations = () => {
  const { user } = useAuth();

  return useQuery<ActiveGeneration[]>({
    queryKey: ["active-generations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("generations")
        .select(`
          id,
          model_id,
          prompt,
          status,
          created_at,
          model_record_id,
          ai_models!inner(
            model_name,
            content_type
          )
        `)
        .eq("user_id", user.id)
        .in("status", ["pending", "processing"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      return (data || []).map((gen: Record<string, unknown>): ActiveGeneration => ({
        id: gen.id as string,
        model_id: gen.model_id as string,
        model_name: ((gen.ai_models as { model_name?: string })?.model_name) || "Unknown",
        content_type: ((gen.ai_models as { content_type?: string })?.content_type) || "unknown",
        prompt: gen.prompt as string,
        status: gen.status as string,
        created_at: gen.created_at as string,
        model_record_id: gen.model_record_id as string,
      }));
    },
    enabled: !!user?.id,
    refetchInterval: 3000, // Refetch every 3 seconds
    staleTime: 2000,
  });
};
