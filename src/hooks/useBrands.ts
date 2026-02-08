import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// 'brands' table exists in DB but not yet in auto-generated Supabase types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const brandsTable = () => (supabase as any).from('brands');

// ─── Types ─────────────────────────────────────────────────────────────

export interface Brand {
  id: string;
  slug: string;
  custom_domain: string | null;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
  support_email: string | null;
  privacy_email: string | null;
  alerts_email: string | null;
  noreply_email: string | null;
  social_links: Record<string, string> | null;
  theme: Record<string, string> | null;
  settings: Record<string, unknown> | null;
  owner_user_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type BrandInsert = Omit<Brand, 'id' | 'created_at' | 'updated_at'>;
export type BrandUpdate = Partial<BrandInsert>;

// ─── Hooks ─────────────────────────────────────────────────────────────

/** Fetch all brands (admin) */
export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await brandsTable()
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Brand[];
    },
  });
}

/** Fetch a single brand by ID */
export function useBrand(brandId: string | undefined) {
  return useQuery({
    queryKey: ['brands', brandId],
    queryFn: async () => {
      if (!brandId) return null;
      const { data, error } = await brandsTable()
        .select('*')
        .eq('id', brandId)
        .single();

      if (error) throw error;
      return data as Brand;
    },
    enabled: !!brandId,
  });
}

/** Fetch a brand by slug (for platform mode resolution) */
export function useBrandBySlug(slug: string | null) {
  return useQuery({
    queryKey: ['brands', 'slug', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await brandsTable()
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data as Brand;
    },
    enabled: !!slug,
  });
}

/** Create a new brand */
export function useCreateBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (brand: BrandInsert) => {
      const { data, error } = await brandsTable()
        .insert(brand)
        .select()
        .single();

      if (error) throw error;
      return data as Brand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Brand created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create brand: ${error.message}`);
    },
  });
}

/** Update an existing brand */
export function useUpdateBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: BrandUpdate & { id: string }) => {
      const { data, error } = await brandsTable()
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Brand;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['brands', data.id] });
      toast.success('Brand updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update brand: ${error.message}`);
    },
  });
}

/** Delete a brand */
export function useDeleteBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (brandId: string) => {
      const { error } = await brandsTable()
        .delete()
        .eq('id', brandId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Brand deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete brand: ${error.message}`);
    },
  });
}
