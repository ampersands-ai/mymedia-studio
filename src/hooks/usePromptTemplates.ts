import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PromptTemplate {
  id: string;
  prompt: string;
  category: string;
  tags: string[] | null;
  use_count: number | null;
  title: string | null;
  model_type: string | null;
  quality_score: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

export interface UserSavedPrompt {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  category: string;
  tags: string[] | null;
  source_generation_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type PromptCategory = 'all' | 'text_to_image' | 'text_to_video' | 'image_to_video' | 'video_to_video' | 'lip_sync' | 'text_to_audio' | 'image_editing';

export const usePromptTemplates = (category: PromptCategory = 'all', search?: string) => {
  return useQuery({
    queryKey: ["prompt-templates", category, search],
    queryFn: async () => {
      let query = supabase
        .from("cinematic_prompts")
        .select("*")
        .eq("is_active", true)
        .order("quality_score", { ascending: false, nullsFirst: false })
        .order("use_count", { ascending: false, nullsFirst: false })
        .limit(100);

      if (category !== 'all') {
        query = query.eq("category", category);
      }

      if (search && search.trim()) {
        query = query.or(`prompt.ilike.%${search}%,title.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PromptTemplate[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useSavedPrompts = (userId: string | undefined, category?: PromptCategory) => {
  return useQuery({
    queryKey: ["saved-prompts", userId, category],
    queryFn: async () => {
      if (!userId) return [];

      let query = supabase
        .from("user_saved_prompts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (category && category !== 'all') {
        query = query.eq("category", category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as UserSavedPrompt[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

export const usePromptMutations = () => {
  const queryClient = useQueryClient();

  const savePrompt = useMutation({
    mutationFn: async ({
      userId,
      title,
      prompt,
      category,
      tags,
      sourceGenerationId,
    }: {
      userId: string;
      title: string;
      prompt: string;
      category: string;
      tags?: string[];
      sourceGenerationId?: string;
    }) => {
      const { data, error } = await supabase
        .from("user_saved_prompts")
        .insert({
          user_id: userId,
          title,
          prompt,
          category,
          tags: tags || null,
          source_generation_id: sourceGenerationId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-prompts"] });
      toast.success("Prompt saved");
    },
    onError: () => {
      toast.error("Failed to save prompt");
    },
  });

  const deletePrompt = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_saved_prompts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-prompts"] });
      toast.success("Prompt deleted");
    },
    onError: () => {
      toast.error("Failed to delete prompt");
    },
  });

  const incrementUseCount = useMutation({
    mutationFn: async (promptId: string) => {
      // Call the database function to increment use count
      const { error } = await supabase.rpc("increment_prompt_use_count", {
        prompt_id: promptId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt-templates"] });
    },
  });

  return {
    savePrompt,
    deletePrompt,
    incrementUseCount,
  };
};
