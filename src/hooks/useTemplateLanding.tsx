import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePostHog } from "./usePostHog";

export interface TemplateLandingPage {
  id: string;
  slug: string;
  category_slug: string;
  title: string;
  subtitle: string | null;
  long_description: string | null;
  meta_title: string;
  meta_description: string;
  keywords: string[] | null;
  schema_markup: Record<string, unknown>;
  hero_before_image: string | null;
  hero_after_image: string | null;
  example_images: Record<string, unknown>;
  demo_video_url: string | null;
  thumbnail_url: string | null;
  steps: Record<string, unknown>;
  use_cases: Record<string, unknown>;
  target_audience: string[] | null;
  tutorial_content: string | null;
  tips: Record<string, unknown>;
  faqs: Record<string, unknown>;
  workflow_id: string | null;
  default_settings: Record<string, unknown>;
  token_cost: number | null;
  related_template_ids: string[] | null;
  view_count: number;
  use_count: number;
  conversion_rate: number | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  meta_title: string | null;
  meta_description: string | null;
  is_visible: boolean;
  created_at: string;
}

export function useTemplateLanding(category: string, slug: string) {
  const posthog = usePostHog();

  return useQuery({
    queryKey: ["template-landing", category, slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("template_landing_pages_public")
        .select("*")
        .eq("category_slug", category)
        .eq("slug", slug)
        .single();

      if (error) throw error;

      // Fire-and-forget view increment
      (supabase as any).rpc("increment_template_view_count", {
        template_id: data.id,
      });

      // Track page view
      const ph = posthog as any;
      if (ph?.capture) {
        ph.capture("template_page_viewed", {
          template_id: data.id,
          template_slug: data.slug,
          category: data.category_slug,
        });
      }

      return data as unknown as TemplateLandingPage;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useRelatedTemplates(templateIds: string[] | null) {
  return useQuery({
    queryKey: ["related-templates", templateIds],
    queryFn: async () => {
      if (!templateIds || templateIds.length === 0) return [];

      const { data, error } = await (supabase as any)
        .from("template_landing_pages_public")
        .select("id, slug, category_slug, title, subtitle, thumbnail_url, token_cost")
        .in("id", templateIds)
        .limit(4);

      if (error) throw error;
      return data as any[];
    },
    enabled: !!templateIds && templateIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });
}

export function useTemplateCategories() {
  return useQuery({
    queryKey: ["template-categories"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("template_categories")
        .select("*")
        .eq("is_visible", true)
        .order("sort_order");

      if (error) throw error;
      return data as unknown as TemplateCategory[];
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useIncrementTemplateUse() {
  const posthog = usePostHog();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await (supabase as any).rpc("increment_template_use_count", {
        template_id: templateId,
      });

      if (error) throw error;

      // Track usage
      const ph = posthog as any;
      if (ph?.capture) {
        ph.capture("template_try_clicked", {
          template_id: templateId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-landing"] });
    },
  });
}
