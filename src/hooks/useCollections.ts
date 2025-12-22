import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_default: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  item_count?: number;
}

export interface CollectionItem {
  id: string;
  collection_id: string;
  generation_id: string;
  added_at: string | null;
  notes: string | null;
}

export const useCollections = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["collections", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("asset_collections")
        .select(`
          *,
          collection_items(count)
        `)
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;

      return (data || []).map((c: { collection_items?: { count: number }[] } & Omit<Collection, 'item_count'>) => ({
        ...c,
        item_count: c.collection_items?.[0]?.count || 0,
      })) as Collection[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCollectionItems = (collectionId: string | undefined) => {
  return useQuery({
    queryKey: ["collection-items", collectionId],
    queryFn: async () => {
      if (!collectionId) return [];

      const { data, error } = await supabase
        .from("collection_items")
        .select("*")
        .eq("collection_id", collectionId)
        .order("added_at", { ascending: false });

      if (error) throw error;
      return data as CollectionItem[];
    },
    enabled: !!collectionId,
  });
};

export const useGenerationCollections = (generationId: string | undefined) => {
  return useQuery({
    queryKey: ["generation-collections", generationId],
    queryFn: async () => {
      if (!generationId) return [];

      const { data, error } = await supabase
        .from("collection_items")
        .select("collection_id")
        .eq("generation_id", generationId);

      if (error) throw error;
      return data.map((item: { collection_id: string }) => item.collection_id);
    },
    enabled: !!generationId,
  });
};

export const useCollectionMutations = () => {
  const queryClient = useQueryClient();

  const createCollection = useMutation({
    mutationFn: async ({
      userId,
      name,
      description,
      color,
      icon,
    }: {
      userId: string;
      name: string;
      description?: string;
      color?: string;
      icon?: string;
    }) => {
      const { data, error } = await supabase
        .from("asset_collections")
        .insert({
          user_id: userId,
          name,
          description: description || null,
          color: color || "#6366f1",
          icon: icon || "folder",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection created");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("A collection with this name already exists");
      } else {
        toast.error("Failed to create collection");
      }
    },
  });

  const updateCollection = useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      color,
      icon,
    }: {
      id: string;
      name?: string;
      description?: string;
      color?: string;
      icon?: string;
    }) => {
      const updates: Partial<Collection> = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (color !== undefined) updates.color = color;
      if (icon !== undefined) updates.icon = icon;

      const { data, error } = await supabase
        .from("asset_collections")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection updated");
    },
    onError: () => {
      toast.error("Failed to update collection");
    },
  });

  const deleteCollection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("asset_collections")
        .delete()
        .eq("id", id)
        .eq("is_default", false); // Prevent deleting default collection

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection deleted");
    },
    onError: () => {
      toast.error("Failed to delete collection");
    },
  });

  const addToCollection = useMutation({
    mutationFn: async ({
      collectionId,
      generationId,
      notes,
    }: {
      collectionId: string;
      generationId: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("collection_items")
        .insert({
          collection_id: collectionId,
          generation_id: generationId,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["collection-items", variables.collectionId] });
      queryClient.invalidateQueries({ queryKey: ["generation-collections", variables.generationId] });
      toast.success("Added to collection");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.info("Already in this collection");
      } else {
        toast.error("Failed to add to collection");
      }
    },
  });

  const removeFromCollection = useMutation({
    mutationFn: async ({
      collectionId,
      generationId,
    }: {
      collectionId: string;
      generationId: string;
    }) => {
      const { error } = await supabase
        .from("collection_items")
        .delete()
        .eq("collection_id", collectionId)
        .eq("generation_id", generationId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["collection-items", variables.collectionId] });
      queryClient.invalidateQueries({ queryKey: ["generation-collections", variables.generationId] });
      toast.success("Removed from collection");
    },
    onError: () => {
      toast.error("Failed to remove from collection");
    },
  });

  const bulkAddToCollection = useMutation({
    mutationFn: async ({
      collectionId,
      generationIds,
    }: {
      collectionId: string;
      generationIds: string[];
    }) => {
      const items = generationIds.map((generationId) => ({
        collection_id: collectionId,
        generation_id: generationId,
      }));

      const { error } = await supabase
        .from("collection_items")
        .upsert(items, { onConflict: "collection_id,generation_id" });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["collection-items", variables.collectionId] });
      queryClient.invalidateQueries({ queryKey: ["generation-collections"] });
      toast.success(`Added ${variables.generationIds.length} items to collection`);
    },
    onError: () => {
      toast.error("Failed to add items to collection");
    },
  });

  return {
    createCollection,
    updateCollection,
    deleteCollection,
    addToCollection,
    removeFromCollection,
    bulkAddToCollection,
  };
};
