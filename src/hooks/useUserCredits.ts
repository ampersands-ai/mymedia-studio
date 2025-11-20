import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserCreditsData {
  user_id: string;
  total_credits: number;
  reserved_credits: number;
  available_credits: number;
}

/**
 * Hook to fetch user credit information from user_available_credits view
 * Returns total credits, reserved (pending) credits, and available credits
 */
export const useUserCredits = () => {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['user-credits', user?.id],
    queryFn: async (): Promise<UserCreditsData> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('user_available_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user credits:', error);
        throw error;
      }

      return data as UserCreditsData;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  return {
    totalCredits: data?.total_credits ?? 0,
    reservedCredits: data?.reserved_credits ?? 0,
    availableCredits: data?.available_credits ?? 0,
    isLoading,
    error,
    refetch,
  };
};
