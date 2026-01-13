import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MediaAsset, MediaType } from '../types';
import { useVideoEditorStore } from '../store';

// Database record type
interface VideoEditorAssetRecord {
  id: string;
  user_id: string;
  type: string;
  name: string;
  url: string;
  thumbnail_url: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  size: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
  updated_at: string;
}

// Convert database record to MediaAsset
const toMediaAsset = (record: VideoEditorAssetRecord): MediaAsset => ({
  id: record.id,
  type: record.type as MediaType,
  name: record.name,
  url: record.url,
  thumbnailUrl: record.thumbnail_url || undefined,
  duration: record.duration || undefined,
  width: record.width || undefined,
  height: record.height || undefined,
  size: record.size,
  mimeType: record.mime_type,
  storagePath: record.storage_path,
  uploadedAt: record.created_at,
});

// Extract video duration from URL by loading metadata
const getVideoDurationFromUrl = (url: string): Promise<number> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.crossOrigin = 'anonymous';
    
    video.onloadedmetadata = () => {
      const duration = video.duration;
      video.src = '';
      resolve(isFinite(duration) ? duration : 0);
    };
    
    video.onerror = () => {
      resolve(0);
    };
    
    video.src = url;
  });
};

export const useVideoEditorAssets = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { removeAsset: removeAssetFromStore, addAsset, addClipFromAsset } = useVideoEditorStore();

  // Fetch assets from database
  const { 
    data: assets = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['video-editor-assets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('video_editor_assets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(toMediaAsset);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Delete asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const asset = assets.find((a: MediaAsset) => a.id === assetId);
      if (!asset) throw new Error('Asset not found');

      // Delete from storage first
      if (asset.storagePath) {
        const { error: storageError } = await supabase.storage
          .from('generated-content')
          .remove([asset.storagePath]);
        
        if (storageError) {
          console.warn('Failed to delete from storage:', storageError);
        }

        // Also delete thumbnail if it exists and is in storage
        if (asset.thumbnailUrl && asset.storagePath) {
          const thumbnailPath = asset.storagePath.replace(/\.[^.]+$/, '_thumb.jpg');
          await supabase.storage
            .from('generated-content')
            .remove([thumbnailPath])
            .catch(() => {}); // Ignore errors for thumbnail cleanup
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('video_editor_assets')
        .delete()
        .eq('id', assetId);

      if (dbError) throw dbError;
      
      return assetId;
    },
    onSuccess: (assetId) => {
      // Remove from store (clears clips referencing this asset)
      removeAssetFromStore(assetId);
      
      // Invalidate query to refetch
      queryClient.invalidateQueries({ 
        queryKey: ['video-editor-assets', user?.id] 
      });
      
      toast.success('Asset deleted');
    },
    onError: (error) => {
      console.error('Failed to delete asset:', error);
      toast.error('Failed to delete asset');
    },
  });

  // Add asset from URL (for adding generations)
  const addAssetFromUrlMutation = useMutation({
    mutationFn: async ({ url, type, name }: { url: string; type: 'image' | 'video'; name: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const mimeType = type === 'video' ? 'video/mp4' : 'image/png';
      
      // Extract video duration if type is video
      let duration: number | null = null;
      if (type === 'video') {
        duration = await getVideoDurationFromUrl(url);
        if (duration === 0) duration = null;
      }
      
      // Insert into database (the URL is already a storage URL)
      const { data: insertedAsset, error: dbError } = await supabase
        .from('video_editor_assets')
        .insert({
          user_id: user.id,
          type,
          name,
          url,
          thumbnail_url: type === 'image' ? url : null,
          duration,
          width: null,
          height: null,
          size: 0,
          mime_type: mimeType,
          storage_path: '',
        })
        .select()
        .single();

      if (dbError || !insertedAsset) {
        throw new Error(`Failed to add asset: ${dbError?.message || 'Unknown error'}`);
      }

      return insertedAsset;
    },
    onSuccess: (insertedAsset) => {
      const mediaAsset: MediaAsset = {
        id: insertedAsset.id,
        type: insertedAsset.type as MediaType,
        name: insertedAsset.name,
        url: insertedAsset.url,
        thumbnailUrl: insertedAsset.thumbnail_url || undefined,
        duration: insertedAsset.duration || undefined,
        size: insertedAsset.size,
        mimeType: insertedAsset.mime_type,
        uploadedAt: insertedAsset.created_at || new Date().toISOString(),
        storagePath: insertedAsset.storage_path || undefined,
      };

      addAsset(mediaAsset);
      addClipFromAsset(mediaAsset.id);

      queryClient.invalidateQueries({ 
        queryKey: ['video-editor-assets', user?.id] 
      });
    },
    onError: (error) => {
      console.error('Failed to add asset from URL:', error);
      toast.error('Failed to add asset');
    },
  });

  // Clear all assets mutation
  const clearAllAssetsMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get all user's assets
      const { data: userAssets, error: fetchError } = await supabase
        .from('video_editor_assets')
        .select('storage_path')
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;

      // Delete all files from storage (only ones with storage paths)
      if (userAssets && userAssets.length > 0) {
        const paths = userAssets
          .map((a: { storage_path: string }) => a.storage_path)
          .filter((p: string) => p && p.length > 0);
        if (paths.length > 0) {
          await supabase.storage
            .from('generated-content')
            .remove(paths)
            .catch(console.warn);
        }
      }

      // Delete all records from database
      const { error: deleteError } = await supabase
        .from('video_editor_assets')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['video-editor-assets', user?.id] 
      });
      toast.success('All assets cleared');
    },
    onError: (error) => {
      console.error('Failed to clear assets:', error);
      toast.error('Failed to clear assets');
    },
  });

  const addAssetFromUrl = async (url: string, type: 'image' | 'video', name: string) => {
    return addAssetFromUrlMutation.mutateAsync({ url, type, name });
  };

  return {
    assets,
    isLoading,
    error,
    refetch,
    deleteAsset: deleteAssetMutation.mutate,
    isDeletingAsset: deleteAssetMutation.isPending,
    addAssetFromUrl,
    isAddingAsset: addAssetFromUrlMutation.isPending,
    clearAllAssets: clearAllAssetsMutation.mutate,
    isClearingAssets: clearAllAssetsMutation.isPending,
  };
};
