import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserTokens } from "./useUserTokens";
import { logger } from '@/lib/logger';

export const useConcurrentGenerationLimit = () => {
  const { data: userTokens } = useUserTokens();
  
  return useQuery({
    queryKey: ["concurrent-generation-limit", userTokens?.plan],
    queryFn: async () => {
      // Check if user is admin
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        
        // If admin, return effectively unlimited
        if (roleData) {
          return 999;
        }
      }
      
      // For non-admins, get tier limit
      const plan = userTokens?.plan || "freemium";
      
      const { data, error } = await supabase
        .from("rate_limit_tiers")
        .select("max_concurrent_generations")
        .eq("tier", plan)
        .single();

      if (error) {
        logger.error('Failed to fetch concurrent limit', error, {
          component: 'useConcurrentGenerationLimit',
          operation: 'fetchLimit',
          plan
        });
        return 1; // Default to 1 for freemium
      }

      return data?.max_concurrent_generations || 1;
    },
    enabled: !!userTokens,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
