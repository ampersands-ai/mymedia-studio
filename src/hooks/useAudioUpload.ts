import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ModelConfiguration } from "@/types/schema";
import { logger } from "@/lib/logger";

// Type stub for backward compatibility
type AIModel = ModelConfiguration;

const STORAGE_KEY_PREFIX = 'uploadedAudios_';

// Audio upload configuration
export const AUDIO_UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  VALID_TYPES: [
    'audio/mpeg',      // mp3
    'audio/mp3',       // mp3 alternative
    'audio/wav',       // wav
    'audio/wave',      // wav alternative
    'audio/x-wav',     // wav alternative
    'audio/aac',       // aac
    'audio/mp4',       // m4a
    'audio/x-m4a',     // m4a alternative
    'audio/ogg',       // ogg
    'audio/flac',      // flac
    'audio/x-flac',    // flac alternative
    'audio/webm',      // webm audio
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
 * Get audio duration from file
 */
export const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
    };
    audio.onerror = () => {
      reject(new Error('Failed to load audio file'));
    };
    audio.src = URL.createObjectURL(file);
  });
};

/**
 * Audio upload management with validation and storage
 */
export const useAudioUpload = (currentModel: AIModel | null) => {
  const [uploadedAudios, setUploadedAudios] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get audio field info from schema
  const getAudioFieldInfo = useCallback((): {
    fieldName: string | null;
    isRequired: boolean;
    maxDuration: number | null;
  } => {
    if (!currentModel?.input_schema) {
      return { fieldName: null, isRequired: false, maxDuration: null };
    }

    const schema = currentModel.input_schema as { 
      audioInputField?: string; 
      properties?: Record<string, { maxDuration?: number }>; 
      required?: string[] 
    };
    const audioFieldName = schema.audioInputField;

    if (!audioFieldName) {
      return { fieldName: null, isRequired: false, maxDuration: null };
    }

    const properties = schema.properties || {};
    const fieldSchema = properties[audioFieldName];

    if (!fieldSchema) {
      logger.warn(`Audio field '${audioFieldName}' declared in schema but not found in properties`);
      return { fieldName: null, isRequired: false, maxDuration: null };
    }

    const required = schema.required || [];
    const isRequired = required.includes(audioFieldName);
    const maxDuration = fieldSchema.maxDuration || null;

    return { fieldName: audioFieldName, isRequired, maxDuration };
  }, [currentModel]);

  const audioFieldInfo = getAudioFieldInfo();

  // Load persisted audios from sessionStorage on mount or model change
  useEffect(() => {
    const storageKey = getStorageKey(currentModel?.record_id || null);
    const stored = sessionStorage.getItem(storageKey);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const files = parsed.map(storableToFile);
        setUploadedAudios(files);
        logger.info(`Restored ${files.length} audios from sessionStorage`);
      } catch (err) {
        logger.error('Failed to restore audios', err instanceof Error ? err : new Error(String(err)));
        sessionStorage.removeItem(storageKey);
      }
    } else {
      // Clear audios when switching models
      setUploadedAudios([]);
    }
  }, [currentModel?.record_id]);

  // Persist audios to sessionStorage when they change
  useEffect(() => {
    const storageKey = getStorageKey(currentModel?.record_id || null);

    if (uploadedAudios.length > 0) {
      const persistAudios = async () => {
        try {
          const storable = await Promise.all(uploadedAudios.map(fileToStorable));
          sessionStorage.setItem(storageKey, JSON.stringify(storable));
          logger.info(`Persisted ${storable.length} audios to sessionStorage`);
        } catch (err) {
          logger.error('Failed to persist audios', err as Error);
        }
      };

      persistAudios();
    } else {
      sessionStorage.removeItem(storageKey);
    }
  }, [uploadedAudios, currentModel?.record_id]);

  /**
   * Handle file upload from input
   */
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Single audio file - replace existing
    const file = files[0];

    // Validate file size
    if (file.size > AUDIO_UPLOAD_CONFIG.MAX_FILE_SIZE) {
      toast.error(`"${file.name}" is too large (max 10MB)`);
      return;
    }

    // Validate file type
    if (!(AUDIO_UPLOAD_CONFIG.VALID_TYPES as readonly string[]).includes(file.type)) {
      toast.error(`"${file.name}" has invalid type. Supported: MP3, WAV, AAC, M4A, OGG, FLAC`);
      return;
    }

    // Validate duration if max is specified
    if (audioFieldInfo.maxDuration) {
      try {
        const duration = await getAudioDuration(file);
        if (duration > audioFieldInfo.maxDuration) {
          toast.error(`Audio is too long. Maximum duration: ${audioFieldInfo.maxDuration} seconds`);
          return;
        }
      } catch (err) {
        logger.warn('Could not validate audio duration', { error: err });
      }
    }

    setUploadedAudios([file]);
  }, [audioFieldInfo.maxDuration]);

  /**
   * Remove audio
   */
  const removeAudio = useCallback(() => {
    setUploadedAudios([]);
  }, []);

  /**
   * Upload audios to Supabase storage and return signed URLs
   */
  const uploadAudiosToStorage = useCallback(async (userId: string): Promise<string[]> => {
    if (uploadedAudios.length === 0) return [];
    
    const timestamp = Date.now();
    const audioUrls: string[] = [];

    for (let i = 0; i < uploadedAudios.length; i++) {
      const file = uploadedAudios[i];
      const fileExt = file.name.split('.').pop() || 'mp3';
      const filePath = `${userId}/uploads/${timestamp}/audio-${i}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('generated-content')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        throw new Error(`Failed to upload audio: ${file.name}`);
      }

      // Generate signed URL
      const { data: signedData, error: signedError } = await supabase.storage
        .from('generated-content')
        .createSignedUrl(filePath, AUDIO_UPLOAD_CONFIG.SIGNED_URL_EXPIRY);

      if (signedError || !signedData) {
        throw new Error(`Failed to create secure URL for: ${file.name}`);
      }

      audioUrls.push(signedData.signedUrl);
    }

    return audioUrls;
  }, [uploadedAudios]);

  return {
    uploadedAudios,
    setUploadedAudios,
    handleFileUpload,
    removeAudio,
    uploadAudiosToStorage,
    getAudioDuration,
    fileInputRef,
    audioFieldInfo,
  };
};
