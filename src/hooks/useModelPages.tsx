import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePostHog } from "./usePostHog";

// Types
export interface ModelPage {
  id: string;
  slug: string;
  model_record_id: string;
  model_name: string;
  provider: string;
  category: string;
  tagline: string | null;
  description: string | null;
  highlights: HighlightItem[];
  specifications: Record<string, unknown>;
  use_cases: UseCaseItem[];
  pricing_note: string | null;
  faqs: FAQItem[];
  meta_title: string;
  meta_description: string;
  keywords: string[] | null;
  og_image_url: string | null;
  hero_image_url: string | null;
  hero_video_url: string | null;
  is_featured: boolean;
  is_published: boolean;
  display_order: number;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface HighlightItem {
  icon: string;
  title: string;
  description: string;
}

export interface UseCaseItem {
  title: string;
  description: string;
  icon?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface ModelSample {
  id: string;
  model_page_id: string;
  title: string | null;
  prompt: string;
  negative_prompt: string | null;
  input_url: string | null;
  input_type: string | null;
  output_url: string;
  output_type: string;
  thumbnail_url: string | null;
  parameters: Record<string, unknown>;
  is_featured: boolean;
  display_order: number;
  created_at: string;
}

export interface ModelPromptTemplate {
  id: string;
  model_page_id: string;
  category: string | null;
  title: string;
  prompt_template: string;
  description: string | null;
  display_order: number;
  created_at: string;
}

// Hook: Fetch all published model pages for directory
export function useModelDirectory(category?: string) {
  return useQuery({
    queryKey: ["model-directory", category],
    queryFn: async () => {
      let query = supabase
        .from("model_pages")
        .select("*")
        .eq("is_published", true)
        .order("display_order", { ascending: true })
        .order("model_name", { ascending: true });

      if (category && category !== "all") {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map((page: Record<string, unknown>) => ({
        ...page,
        highlights: (page.highlights as unknown as HighlightItem[]) || [],
        use_cases: (page.use_cases as unknown as UseCaseItem[]) || [],
        faqs: (page.faqs as unknown as FAQItem[]) || [],
        specifications: (page.specifications as Record<string, unknown>) || {},
      })) as ModelPage[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook: Fetch single model page by slug
export function useModelPage(slug: string) {
  const posthog = usePostHog();

  return useQuery({
    queryKey: ["model-page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("model_pages")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (error) throw error;
      if (!data?.id) throw new Error("Model page not found");

      // Fire-and-forget view increment
      supabase.rpc("increment_model_page_view_count", {
        page_id: data.id,
      });

      // Track page view
      if (posthog?.capture) {
        posthog.capture("model_page_viewed", {
          model_page_id: data.id,
          model_slug: data.slug,
          model_name: data.model_name,
          category: data.category,
        });
      }

      return {
        ...data,
        highlights: (data.highlights as unknown as HighlightItem[]) || [],
        use_cases: (data.use_cases as unknown as UseCaseItem[]) || [],
        faqs: (data.faqs as unknown as FAQItem[]) || [],
        specifications: (data.specifications as Record<string, unknown>) || {},
      } as ModelPage;
    },
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });
}

// Hook: Fetch samples for a model page
export function useModelSamples(modelPageId: string | undefined, options?: { featured?: boolean; limit?: number }) {
  return useQuery({
    queryKey: ["model-samples", modelPageId, options],
    queryFn: async () => {
      if (!modelPageId) return [];

      let query = supabase
        .from("model_samples")
        .select("*")
        .eq("model_page_id", modelPageId)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (options?.featured) {
        query = query.eq("is_featured", true);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map((sample: Record<string, unknown>) => ({
        ...sample,
        parameters: (sample.parameters as Record<string, unknown>) || {},
      })) as ModelSample[];
    },
    enabled: !!modelPageId,
    staleTime: 10 * 60 * 1000,
  });
}

// Hook: Fetch prompt templates for a model page
export function useModelPromptTemplates(modelPageId: string | undefined) {
  return useQuery({
    queryKey: ["model-prompt-templates", modelPageId],
    queryFn: async () => {
      if (!modelPageId) return [];

      const { data, error } = await supabase
        .from("model_prompt_templates")
        .select("*")
        .eq("model_page_id", modelPageId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return (data || []) as ModelPromptTemplate[];
    },
    enabled: !!modelPageId,
    staleTime: 10 * 60 * 1000,
  });
}

// Hook: Fetch related models by category
export function useRelatedModels(category: string | undefined, excludeId: string | undefined) {
  return useQuery({
    queryKey: ["related-models", category, excludeId],
    queryFn: async () => {
      if (!category) return [];

      const { data, error } = await supabase
        .from("model_pages")
        .select("id, slug, model_name, provider, category, tagline, hero_image_url")
        .eq("is_published", true)
        .eq("category", category)
        .neq("id", excludeId || "")
        .limit(6);

      if (error) throw error;
      return data || [];
    },
    enabled: !!category,
    staleTime: 10 * 60 * 1000,
  });
}

// Hook: Fetch featured models
export function useFeaturedModels() {
  return useQuery({
    queryKey: ["featured-models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("model_pages")
        .select("*")
        .eq("is_published", true)
        .eq("is_featured", true)
        .order("display_order", { ascending: true })
        .limit(8);

      if (error) throw error;
      
      return (data || []).map((page: typeof data[number]) => ({
        ...page,
        highlights: (page.highlights as unknown as HighlightItem[]) || [],
        use_cases: (page.use_cases as unknown as UseCaseItem[]) || [],
        faqs: (page.faqs as unknown as FAQItem[]) || [],
        specifications: (page.specifications as Record<string, unknown>) || {},
      })) as ModelPage[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

// Hook: Increment view count mutation
export function useIncrementModelPageView() {
  const posthog = usePostHog();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase.rpc("increment_model_page_view_count", {
        page_id: pageId,
      });

      if (error) throw error;

      // Track event
      if (posthog?.capture) {
        posthog.capture("model_page_view_incremented", {
          model_page_id: pageId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model-directory"] });
    },
  });
}

// Utility: Generate slug from model name
export function generateModelSlug(modelName: string): string {
  return modelName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Utility: Map content type to category
export function contentTypeToCategory(contentType: string): string {
  const categoryMap: Record<string, string> = {
    prompt_to_image: "image",
    image_editing: "image",
    image_to_image: "image",
    prompt_to_video: "video",
    image_to_video: "video",
    video_to_video: "video",
    lip_sync: "avatar",
    prompt_to_audio: "audio",
  };
  return categoryMap[contentType] || "image";
}
