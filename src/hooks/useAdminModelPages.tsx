import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ModelPage, ModelSample, ModelPromptTemplate, HighlightItem, UseCaseItem, FAQItem } from "./useModelPages";

// Admin-specific types
export interface ModelPageInput {
  slug: string;
  model_name: string;
  model_record_id: string;
  provider: string;
  category: string;
  tagline?: string;
  description?: string;
  meta_title: string;
  meta_description: string;
  keywords?: string[];
  hero_image_url?: string;
  hero_video_url?: string;
  og_image_url?: string;
  highlights?: HighlightItem[];
  specifications?: Record<string, string | number>;
  use_cases?: UseCaseItem[];
  faqs?: FAQItem[];
  pricing_note?: string;
  is_published?: boolean;
  is_featured?: boolean;
  display_order?: number;
}

export interface ModelSampleInput {
  model_page_id: string;
  title?: string;
  prompt: string;
  negative_prompt?: string;
  output_url: string;
  output_type: string;
  thumbnail_url?: string;
  parameters?: Record<string, unknown>;
  is_featured?: boolean;
  display_order?: number;
}

export interface ModelPromptTemplateInput {
  model_page_id: string;
  title: string;
  prompt_template: string;
  description?: string;
  category?: string;
  display_order?: number;
}

// Fetch all model pages (including drafts) for admin
export function useAdminModelPages() {
  return useQuery({
    queryKey: ["admin-model-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("model_pages")
        .select("*")
        .order("display_order", { ascending: true })
        .order("model_name", { ascending: true });

      if (error) throw error;

      return (data || []).map((page: typeof data[number]) => ({
        ...page,
        highlights: (page.highlights as unknown as HighlightItem[]) || [],
        use_cases: (page.use_cases as unknown as UseCaseItem[]) || [],
        faqs: (page.faqs as unknown as FAQItem[]) || [],
        specifications: (page.specifications as Record<string, string | number>) || {},
      })) as ModelPage[];
    },
  });
}

// Fetch single model page for editing
export function useAdminModelPage(id: string) {
  return useQuery({
    queryKey: ["admin-model-page", id],
    queryFn: async () => {
      if (!id || id === "new") return null;

      const { data, error } = await supabase
        .from("model_pages")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      return {
        ...data,
        highlights: (data.highlights as unknown as HighlightItem[]) || [],
        use_cases: (data.use_cases as unknown as UseCaseItem[]) || [],
        faqs: (data.faqs as unknown as FAQItem[]) || [],
        specifications: (data.specifications as Record<string, string | number>) || {},
      } as ModelPage;
    },
    enabled: !!id && id !== "new",
  });
}

// Create model page
export function useCreateModelPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ModelPageInput) => {
      const { data, error } = await supabase
        .from("model_pages")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-model-pages"] });
      toast.success("Model page created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create model page: ${error.message}`);
    },
  });
}

// Update model page
export function useUpdateModelPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: ModelPageInput & { id: string }) => {
      const { data, error } = await supabase
        .from("model_pages")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-model-pages"] });
      queryClient.invalidateQueries({ queryKey: ["admin-model-page", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["model-directory"] });
      toast.success("Model page updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update model page: ${error.message}`);
    },
  });
}

// Delete model page
export function useDeleteModelPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("model_pages")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-model-pages"] });
      queryClient.invalidateQueries({ queryKey: ["model-directory"] });
      toast.success("Model page deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete model page: ${error.message}`);
    },
  });
}

// Toggle publish status
export function useToggleModelPagePublish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { data, error } = await supabase
        .from("model_pages")
        .update({ is_published })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-model-pages"] });
      queryClient.invalidateQueries({ queryKey: ["admin-model-page", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["model-directory"] });
      toast.success(variables.is_published ? "Model page published" : "Model page unpublished");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update publish status: ${error.message}`);
    },
  });
}

// ==================== Sample Management ====================

export function useAdminModelSamples(modelPageId: string | undefined) {
  return useQuery({
    queryKey: ["admin-model-samples", modelPageId],
    queryFn: async () => {
      if (!modelPageId) return [];

      const { data, error } = await supabase
        .from("model_samples")
        .select("*")
        .eq("model_page_id", modelPageId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as ModelSample[];
    },
    enabled: !!modelPageId,
  });
}

export function useCreateModelSample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ModelSampleInput) => {
      const { data, error } = await supabase
        .from("model_samples")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-model-samples", variables.model_page_id] });
      toast.success("Sample added successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add sample: ${error.message}`);
    },
  });
}

export function useUpdateModelSample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<ModelSampleInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("model_samples")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-model-samples", data.model_page_id] });
      toast.success("Sample updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update sample: ${error.message}`);
    },
  });
}

export function useDeleteModelSample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, modelPageId }: { id: string; modelPageId: string }) => {
      const { error } = await supabase
        .from("model_samples")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { modelPageId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-model-samples", data.modelPageId] });
      toast.success("Sample deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete sample: ${error.message}`);
    },
  });
}

// ==================== Prompt Template Management ====================

export function useAdminPromptTemplates(modelPageId: string | undefined) {
  return useQuery({
    queryKey: ["admin-prompt-templates", modelPageId],
    queryFn: async () => {
      if (!modelPageId) return [];

      const { data, error } = await supabase
        .from("model_prompt_templates")
        .select("*")
        .eq("model_page_id", modelPageId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as ModelPromptTemplate[];
    },
    enabled: !!modelPageId,
  });
}

export function useCreatePromptTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ModelPromptTemplateInput) => {
      const { data, error } = await supabase
        .from("model_prompt_templates")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-prompt-templates", variables.model_page_id] });
      toast.success("Prompt template added successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add prompt template: ${error.message}`);
    },
  });
}

export function useUpdatePromptTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<ModelPromptTemplateInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("model_prompt_templates")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-prompt-templates", data.model_page_id] });
      toast.success("Prompt template updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update prompt template: ${error.message}`);
    },
  });
}

export function useDeletePromptTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, modelPageId }: { id: string; modelPageId: string }) => {
      const { error } = await supabase
        .from("model_prompt_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { modelPageId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-prompt-templates", data.modelPageId] });
      toast.success("Prompt template deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete prompt template: ${error.message}`);
    },
  });
}

// ==================== Auto-Generate Pages ====================

export function useAutoGenerateModelPages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Fetch existing model pages to check what's already created
      const { data: existingPages, error: pagesError } = await supabase
        .from("model_pages")
        .select("model_record_id");

      if (pagesError) throw pagesError;

      // For now, return a message since we can't query ai_models directly
      // Admin should manually create pages or use a different approach
      return { 
        created: 0, 
        existing: existingPages?.length || 0,
        message: `Found ${existingPages?.length || 0} existing model pages. Use the Create Page button to add new ones.` 
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-model-pages"] });
      toast.success(result.message);
    },
    onError: (error: Error) => {
      toast.error(`Failed to check pages: ${error.message}`);
    },
  });
}
