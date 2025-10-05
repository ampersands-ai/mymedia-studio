import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUserTokens = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-tokens", user?.id],
    queryFn: async () => {
      if (!user) return { tokens_remaining: 0, plan: "freemium" };

      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("tokens_remaining, plan")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 60 * 1000, // 1 minute
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
};
