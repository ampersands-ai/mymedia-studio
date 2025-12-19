import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ModelConfiguration } from "@/types/schema";
import { logger } from "@/lib/logger";

// Type stub for backward compatibility
type AIModel = ModelConfiguration;

const STORAGE_KEY_PREFIX = 'uploadedVideos_';

// Video upload configuration
export const VIDEO_UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  VALID_TYPES: [
    'video/mp4',           // mp4
    'video/quicktime',     // mov
    'video/x-matroska',    // mkv
    'video/webm',          // webm
    'video/x-msvideo',     // avi
  ] as const,
  SIGNED_URL_EXPIRY: 3600 * 24, // 24 hours
};

/**
 * Convert File to storable format (with data URL)
 */
const fileToStorable = async (file: File) => ({
  name: file.name,
  type: file.type,
  size: file.size,
  lastModified: file.lastModified,
  dataUrl: await fileToDataUrl(file),
});

/**
 * Convert File to base64 data URL
 */
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Reconstruct File from stored data
 */
const storableToFile = (stored: { dataUrl: string; type: string; name: string; lastModified?: number }): File => {
  const arr = stored.dataUrl.split(',');
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], stored.name, { 
    type: stored.type,
    lastModified: stored.lastModified,
  });
};

/**
 * Get storage key based on current model
 */
const getStorageKey = (modelId: string | null) => {
  return `${STORAGE_KEY_PREFIX}${modelId || 'default'}`;
};

/**
 * Get video duration from file
 */
export const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      reject(new Error('Failed to load video file'));
    };
    video.src = URL.createObjectURL(file);
  });
};

/**
 * Video upload management with validation and storage
 */
export const useVideoUpload = (currentModel: AIModel | null) => {
  const [uploadedVideos, setUploadedVideos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get video field info from schema
  const getVideoFieldInfo = useCallback((): {
    fieldName: string | null;
    isRequired: boolean;
    maxDuration: number | null;
    maxFileSize: number;
  } => {
    if (!currentModel?.input_schema) {
      return { fieldName: null, isRequired: false, maxDuration: null, maxFileSize: VIDEO_UPLOAD_CONFIG.MAX_FILE_SIZE };
    }

    const schema = currentModel.input_schema as { 
      videoInputField?: string; 
      properties?: Record<string, { maxDuration?: number; maxFileSize?: number }>; 
      required?: string[] 
    };
    const videoFieldName = schema.videoInputField;

    if (!videoFieldName) {
      return { fieldName: null, isRequired: false, maxDuration: null, maxFileSize: VIDEO_UPLOAD_CONFIG.MAX_FILE_SIZE };
    }

    const properties = schema.properties || {};
    const fieldSchema = properties[videoFieldName];

    if (!fieldSchema) {
      logger.warn(`Video field '${videoFieldName}' declared in schema but not found in properties`);
      return { fieldName: null, isRequired: false, maxDuration: null, maxFileSize: VIDEO_UPLOAD_CONFIG.MAX_FILE_SIZE };
    }

    const required = schema.required || [];
    const isRequired = required.includes(videoFieldName);
    const maxDuration = fieldSchema.maxDuration || null;
    const maxFileSize = fieldSchema.maxFileSize || VIDEO_UPLOAD_CONFIG.MAX_FILE_SIZE;

    return { fieldName: videoFieldName, isRequired, maxDuration, maxFileSize };
  }, [currentModel]);

  const videoFieldInfo = getVideoFieldInfo();

  // Load persisted videos from sessionStorage on mount or model change
  useEffect(() => {
    const storageKey = getStorageKey(currentModel?.record_id || null);
    const stored = sessionStorage.getItem(storageKey);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const files = parsed.map(storableToFile);
        setUploadedVideos(files);
        logger.info(`Restored ${files.length} videos from sessionStorage`);
      } catch (err) {
        logger.error('Failed to restore videos', err instanceof Error ? err : new Error(String(err)));
        sessionStorage.removeItem(storageKey);
      }
    } else {
      // Clear videos when switching models
      setUploadedVideos([]);
    }
  }, [currentModel?.record_id]);

  // Persist videos to sessionStorage when they change
  useEffect(() => {
    const storageKey = getStorageKey(currentModel?.record_id || null);

    if (uploadedVideos.length > 0) {
      const persistVideos = async () => {
        try {
          const storable = await Promise.all(uploadedVideos.map(fileToStorable));
          sessionStorage.setItem(storageKey, JSON.stringify(storable));
          logger.info(`Persisted ${storable.length} videos to sessionStorage`);
        } catch (err) {
          logger.error('Failed to persist videos', err as Error);
        }
      };

      persistVideos();
    } else {
      sessionStorage.removeItem(storageKey);
    }
  }, [uploadedVideos, currentModel?.record_id]);

  /**
   * Handle file upload from input
   */
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Single video file - replace existing
    const file = files[0];

    // Validate file size
    if (file.size > videoFieldInfo.maxFileSize) {
      const maxMB = Math.round(videoFieldInfo.maxFileSize / 1024 / 1024);
      toast.error(`"${file.name}" is too large (max ${maxMB}MB)`);
      return;
    }

    // Validate file type
    if (!(VIDEO_UPLOAD_CONFIG.VALID_TYPES as readonly string[]).includes(file.type)) {
      toast.error(`"${file.name}" has invalid type. Supported: MP4, MOV, MKV, WebM, AVI`);
      return;
    }

    // Validate duration if max is specified
    if (videoFieldInfo.maxDuration) {
      try {
        const duration = await getVideoDuration(file);
        if (duration > videoFieldInfo.maxDuration) {
          toast.error(`Video is too long. Maximum duration: ${videoFieldInfo.maxDuration} seconds`);
          return;
        }
      } catch (err) {
        logger.warn('Could not validate video duration', { error: err });
      }
    }

    setUploadedVideos([file]);
  }, [videoFieldInfo.maxDuration, videoFieldInfo.maxFileSize]);

  /**
   * Remove video
   */
  const removeVideo = useCallback(() => {
    setUploadedVideos([]);
  }, []);

  /**
   * Upload videos to Supabase storage and return signed URLs
   */
  const uploadVideosToStorage = useCallback(async (userId: string): Promise<string[]> => {
    if (uploadedVideos.length === 0) return [];
    
    const timestamp = Date.now();
    const videoUrls: string[] = [];

    for (let i = 0; i < uploadedVideos.length; i++) {
      const file = uploadedVideos[i];
      const fileExt = file.name.split('.').pop() || 'mp4';
      const filePath = `${userId}/uploads/${timestamp}/video-${i}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('generated-content')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        throw new Error(`Failed to upload video: ${file.name}`);
      }

      // Generate signed URL
      const { data: signedData, error: signedError } = await supabase.storage
        .from('generated-content')
        .createSignedUrl(filePath, VIDEO_UPLOAD_CONFIG.SIGNED_URL_EXPIRY);

      if (signedError || !signedData) {
        throw new Error(`Failed to create secure URL for: ${file.name}`);
      }

      videoUrls.push(signedData.signedUrl);
    }

    return videoUrls;
  }, [uploadedVideos]);

  return {
    uploadedVideos,
    setUploadedVideos,
    handleFileUpload,
    removeVideo,
    uploadVideosToStorage,
    getVideoDuration,
    fileInputRef,
    videoFieldInfo,
  };
};
