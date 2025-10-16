import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MonthlyStats {
  totalCreations: number;
  totalTokens: number;
  byType: {
    video: { count: number; tokens: number };
    image: { count: number; tokens: number };
    audio: { count: number; tokens: number };
    text: { count: number; tokens: number };
  };
  mostUsedModel: { model_id: string; count: number } | null;
}

interface MonthlyBreakdown {
  month: string;
  monthLabel: string;
  totalCreations: number;
  totalTokens: number;
}

interface AllTimeStats extends MonthlyStats {
  monthlyBreakdown: MonthlyBreakdown[];
}

export const useTokenUsage = () => {
  const { user } = useAuth();

  const currentMonthStats = useQuery({
    queryKey: ["token-usage-current-month", user?.id],
    queryFn: async (): Promise<MonthlyStats> => {
      if (!user?.id) throw new Error("User not authenticated");

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: generations, error } = await supabase
        .from("generations")
        .select("type, tokens_used, model_id")
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString());

      if (error) throw error;

      const stats: MonthlyStats = {
        totalCreations: generations?.length || 0,
        totalTokens: 0,
        byType: {
          video: { count: 0, tokens: 0 },
          image: { count: 0, tokens: 0 },
          audio: { count: 0, tokens: 0 },
          text: { count: 0, tokens: 0 },
        },
        mostUsedModel: null,
      };

      const modelCounts: Record<string, number> = {};

      generations?.forEach((gen) => {
        stats.totalTokens += gen.tokens_used || 0;
        
        const type = gen.type as keyof typeof stats.byType;
        if (stats.byType[type]) {
          stats.byType[type].count++;
          stats.byType[type].tokens += gen.tokens_used || 0;
        }

        if (gen.model_id) {
          modelCounts[gen.model_id] = (modelCounts[gen.model_id] || 0) + 1;
        }
      });

      const sortedModels = Object.entries(modelCounts).sort((a, b) => b[1] - a[1]);
      if (sortedModels.length > 0) {
        stats.mostUsedModel = {
          model_id: sortedModels[0][0],
          count: sortedModels[0][1],
        };
      }

      return stats;
    },
    enabled: !!user?.id,
  });

  const allTimeStats = useQuery({
    queryKey: ["token-usage-all-time", user?.id],
    queryFn: async (): Promise<AllTimeStats> => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data: generations, error } = await supabase
        .from("generations")
        .select("type, tokens_used, model_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const stats: AllTimeStats = {
        totalCreations: generations?.length || 0,
        totalTokens: 0,
        byType: {
          video: { count: 0, tokens: 0 },
          image: { count: 0, tokens: 0 },
          audio: { count: 0, tokens: 0 },
          text: { count: 0, tokens: 0 },
        },
        mostUsedModel: null,
        monthlyBreakdown: [],
      };

      const modelCounts: Record<string, number> = {};
      const monthlyData: Record<string, { count: number; tokens: number }> = {};

      generations?.forEach((gen) => {
        stats.totalTokens += gen.tokens_used || 0;
        
        const type = gen.type as keyof typeof stats.byType;
        if (stats.byType[type]) {
          stats.byType[type].count++;
          stats.byType[type].tokens += gen.tokens_used || 0;
        }

        if (gen.model_id) {
          modelCounts[gen.model_id] = (modelCounts[gen.model_id] || 0) + 1;
        }

        const date = new Date(gen.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { count: 0, tokens: 0 };
        }
        monthlyData[monthKey].count++;
        monthlyData[monthKey].tokens += gen.tokens_used || 0;
      });

      const sortedModels = Object.entries(modelCounts).sort((a, b) => b[1] - a[1]);
      if (sortedModels.length > 0) {
        stats.mostUsedModel = {
          model_id: sortedModels[0][0],
          count: sortedModels[0][1],
        };
      }

      stats.monthlyBreakdown = Object.entries(monthlyData)
        .map(([month, data]) => {
          const [year, monthNum] = month.split('-');
          const date = new Date(parseInt(year), parseInt(monthNum) - 1);
          const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          
          return {
            month,
            monthLabel,
            totalCreations: data.count,
            totalTokens: data.tokens,
          };
        })
        .sort((a, b) => b.month.localeCompare(a.month));

      return stats;
    },
    enabled: false,
  });

  return {
    currentMonth: currentMonthStats.data,
    isLoadingCurrent: currentMonthStats.isLoading,
    allTime: allTimeStats.data,
    isLoadingAllTime: allTimeStats.isLoading,
    refetchAllTime: allTimeStats.refetch,
  };
};
