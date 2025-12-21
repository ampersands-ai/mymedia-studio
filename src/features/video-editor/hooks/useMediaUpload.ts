import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MediaAsset, MediaType, MAX_FILE_SIZE_MB, MAX_FILES } from '../types';
import { useVideoEditorStore } from '../store';

interface UseMediaUploadReturn {
  uploadFiles: (files: FileList | File[]) => Promise<void>;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
}

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/mp3'];

const getMediaType = (mimeType: string): MediaType | null => {
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return 'video';
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image';
  if (ALLOWED_AUDIO_TYPES.includes(mimeType)) return 'audio';
  return null;
};

const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      resolve(0);
    };
    video.src = URL.createObjectURL(file);
  });
};

const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve(audio.duration);
    };
    audio.onerror = () => {
      resolve(0);
    };
    audio.src = URL.createObjectURL(file);
  });
};

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = URL.createObjectURL(file);
  });
};

const generateVideoThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    
    video.onloadeddata = () => {
      video.currentTime = 1; // Seek to 1 second for thumbnail
    };
    
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      URL.revokeObjectURL(video.src);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    
    video.onerror = () => {
      resolve('');
    };
    
    video.src = URL.createObjectURL(file);
  });
};

export const useMediaUpload = (): UseMediaUploadReturn => {
  const { user } = useAuth();
  const { addAsset, assets, setIsUploading, setUploadProgress } = useVideoEditorStore();
  const [isUploading, setLocalUploading] = useState(false);
  const [uploadProgress, setLocalProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    if (!user) {
      toast.error('You must be logged in to upload files');
      return;
    }

    const fileArray = Array.from(files);
    
    // Validate file count
    if (assets.length + fileArray.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    // Validate file types and sizes
    for (const file of fileArray) {
      const mediaType = getMediaType(file.type);
      if (!mediaType) {
        toast.error(`Unsupported file type: ${file.name}`);
        return;
      }
      
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > MAX_FILE_SIZE_MB) {
        toast.error(`File too large: ${file.name} (max ${MAX_FILE_SIZE_MB}MB)`);
        return;
      }
    }

    setLocalUploading(true);
    setIsUploading(true);
    setError(null);
    setLocalProgress(0);
    setUploadProgress(0);

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const mediaType = getMediaType(file.type)!;
        
        // Generate unique file path
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${user.id}/video-editor/${timestamp}-${sanitizedName}`;
        
        // Upload to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from('generated-content')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('generated-content')
          .getPublicUrl(filePath);

        // Get media metadata
        let duration: number | undefined;
        let width: number | undefined;
        let height: number | undefined;
        let thumbnailUrl: string | undefined;

        if (mediaType === 'video') {
          duration = await getVideoDuration(file);
          thumbnailUrl = await generateVideoThumbnail(file);
        } else if (mediaType === 'audio') {
          duration = await getAudioDuration(file);
        } else if (mediaType === 'image') {
          const dimensions = await getImageDimensions(file);
          width = dimensions.width;
          height = dimensions.height;
          thumbnailUrl = URL.createObjectURL(file);
        }

        // Create asset
        const asset: MediaAsset = {
          id: crypto.randomUUID(),
          type: mediaType,
          name: file.name,
          url: urlData.publicUrl,
          thumbnailUrl,
          duration,
          width,
          height,
          size: file.size,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
        };

        addAsset(asset);
        
        // Update progress
        const progress = Math.round(((i + 1) / fileArray.length) * 100);
        setLocalProgress(progress);
        setUploadProgress(progress);
      }

      toast.success(`Uploaded ${fileArray.length} file(s) successfully`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      toast.error(message);
    } finally {
      setLocalUploading(false);
      setIsUploading(false);
    }
  }, [user, assets.length, addAsset, setIsUploading, setUploadProgress]);

  return {
    uploadFiles,
    isUploading,
    uploadProgress,
    error,
  };
};
