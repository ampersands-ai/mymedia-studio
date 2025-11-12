import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserTokens } from "./useUserTokens";

export const useConcurrentGenerationLimit = () => {
  const { data: userTokens } = useUserTokens();
  
  return useQuery({
    queryKey: ["concurrent-generation-limit", userTokens?.plan],
    queryFn: async () => {
      const plan = userTokens?.plan || "freemium";
      
      const { data, error } = await supabase
        .from("rate_limit_tiers")
        .select("max_concurrent_generations")
        .eq("tier", plan)
        .single();

      if (error) {
        console.error("Error fetching concurrent limit:", error);
        return 1; // Default to 1 for freemium
      }

      return data?.max_concurrent_generations || 1;
    },
    enabled: !!userTokens,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
