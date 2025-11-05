import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CinematicPrompt {
  id: string;
  prompt: string;
  category: string;
  source: string;
  quality_score: number;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export const useAdminCinematicPrompts = () => {
  const queryClient = useQueryClient();

  const { data: prompts, isLoading } = useQuery({
    queryKey: ["admin-cinematic-prompts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cinematic_prompts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CinematicPrompt[];
    },
  });

  const createPrompt = useMutation({
    mutationFn: async (newPrompt: Omit<CinematicPrompt, "id" | "created_at" | "updated_at" | "created_by">) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("cinematic_prompts")
        .insert({
          ...newPrompt,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cinematic-prompts"] });
      toast.success("Prompt created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create prompt: ${error.message}`);
    },
  });

  const updatePrompt = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CinematicPrompt> & { id: string }) => {
      const { data, error } = await supabase
        .from("cinematic_prompts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cinematic-prompts"] });
      toast.success("Prompt updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update prompt: ${error.message}`);
    },
  });

  const deletePrompt = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cinematic_prompts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cinematic-prompts"] });
      toast.success("Prompt deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete prompt: ${error.message}`);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("cinematic_prompts")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cinematic-prompts"] });
      toast.success("Prompt status updated");
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  return {
    prompts,
    isLoading,
    createPrompt,
    updatePrompt,
    deletePrompt,
    toggleActive,
  };
};
