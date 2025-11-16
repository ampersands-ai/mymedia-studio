import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AIModel = Database['public']['Tables']['ai_models']['Row'];

/**
 * Fetch ALL models (active and inactive) for admin testing
 */
export const useAllModels = () => {
  return useQuery({
    queryKey: ['all-models'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .order('provider')
        .order('model_name');
      
      if (error) throw error;
      return data as AIModel[];
    },
  });
};
