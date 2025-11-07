import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNativeCamera } from "@/hooks/useNativeCamera";
import { IMAGE_UPLOAD_CONFIG } from "@/constants/custom-creation";
import { getImageFieldInfo } from "@/lib/custom-creation-utils";

/**
 * Image upload management with validation and native camera support
 */
export const useImageUpload = (currentModel: any) => {
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { pickImage, pickMultipleImages, isLoading: cameraLoading, isNative } = useNativeCamera();
  
  const imageFieldInfo = getImageFieldInfo(currentModel);

  /**
   * Handle file upload from input
   */
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const modelMaxImages = currentModel?.max_images ?? 0;
    
    // If max_images is 0, don't allow uploads
    if (modelMaxImages === 0) {
      toast.error("This model does not accept image uploads");
      return;
    }
    
    // Determine effective max images
    let effectiveMax = modelMaxImages;
    
    // For single image fields, max is 1
    if (!imageFieldInfo.isArray && imageFieldInfo.fieldName) {
      effectiveMax = 1;
    }
    
    // Check if adding files would exceed limit
    if (uploadedImages.length + files.length > effectiveMax) {
      if (effectiveMax === 1) {
        // Single image: replace existing
        toast.info("Replacing existing image");
        setUploadedImages([]); // Clear existing
      } else {
        toast.error(`Maximum ${effectiveMax} image(s) allowed for this model`);
        return;
      }
    }
    
    const validFiles: File[] = [];
    
    for (const file of files) {
      if (file.size > IMAGE_UPLOAD_CONFIG.MAX_FILE_SIZE) {
        toast.error(`"${file.name}" is too large (max 10MB)`);
        continue;
      }
      
      if (!(IMAGE_UPLOAD_CONFIG.VALID_TYPES as readonly string[]).includes(file.type)) {
        toast.error(`"${file.name}" has invalid type. Only JPEG, PNG, and WebP allowed.`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    if (validFiles.length > 0) {
      // For single image, replace; for array, append
      if (effectiveMax === 1) {
        setUploadedImages(validFiles.slice(0, 1));
      } else {
        setUploadedImages([...uploadedImages, ...validFiles]);
      }
      toast.success(`${validFiles.length} image(s) uploaded successfully`);
    }
  }, [uploadedImages, currentModel, imageFieldInfo]);

  /**
   * Remove image by index
   */
  const removeImage = useCallback((index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Upload images to Supabase storage and return signed URLs
   */
  const uploadImagesToStorage = useCallback(async (userId: string): Promise<string[]> => {
    if (uploadedImages.length === 0) return [];
    
    const timestamp = Date.now();
    const imageUrls: string[] = [];

    for (let i = 0; i < uploadedImages.length; i++) {
      const file = uploadedImages[i];
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/uploads/${timestamp}/${i}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('generated-content')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        throw new Error(`Failed to upload image: ${file.name}`);
      }

      // Generate signed URL
      const { data: signedData, error: signedError } = await supabase.storage
        .from('generated-content')
        .createSignedUrl(filePath, IMAGE_UPLOAD_CONFIG.SIGNED_URL_EXPIRY);

      if (signedError || !signedData) {
        throw new Error(`Failed to create secure URL for: ${file.name}`);
      }

      imageUrls.push(signedData.signedUrl);
    }

    return imageUrls;
  }, [uploadedImages]);

  /**
   * Handle native camera image pick
   */
  const handleNativeCameraPick = useCallback(async (source: 'camera' | 'gallery') => {
    const effectiveMax = imageFieldInfo.maxImages || 1;
    
    if (effectiveMax === 1 || source === 'camera') {
      // Single image
      const file = await pickImage(source);
      if (file) {
        setUploadedImages([file]);
        toast.success("Image captured successfully");
      }
    } else {
      // Multiple images (gallery only)
      const files = await pickMultipleImages(effectiveMax - uploadedImages.length);
      if (files.length > 0) {
        setUploadedImages([...uploadedImages, ...files]);
        toast.success(`${files.length} image(s) selected`);
      }
    }
  }, [pickImage, pickMultipleImages, uploadedImages, imageFieldInfo]);

  return {
    uploadedImages,
    setUploadedImages,
    handleFileUpload,
    removeImage,
    uploadImagesToStorage,
    handleNativeCameraPick,
    fileInputRef,
    cameraLoading,
    isNative,
    pickImage,
    pickMultipleImages,
  };
};
