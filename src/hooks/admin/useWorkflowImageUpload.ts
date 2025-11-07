import { useState, useEffect } from 'react';
import type { WorkflowTemplate } from '@/hooks/useWorkflowTemplates';
import {
  uploadWorkflowImage,
  getSignedImageUrl,
  extractStoragePathFromUrl,
  createFilePreview,
} from '@/lib/admin/workflow-image-upload';

interface UseWorkflowImageUploadProps {
  workflow: Partial<WorkflowTemplate> | null;
  open: boolean;
}

/**
 * Custom hook to manage image upload state for workflow before/after images
 * @param props - Configuration object with workflow and open state
 * @returns Object with image state and operations for both before and after images
 */
export function useWorkflowImageUpload({
  workflow,
  open,
}: UseWorkflowImageUploadProps) {
  const [beforeImageFile, setBeforeImageFile] = useState<File | null>(null);
  const [afterImageFile, setAfterImageFile] = useState<File | null>(null);
  const [beforeImagePreview, setBeforeImagePreview] = useState<string | null>(null);
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null);
  const [beforeSignedPreview, setBeforeSignedPreview] = useState<string | null>(null);
  const [afterSignedPreview, setAfterSignedPreview] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Generate signed URLs for existing images when dialog opens
  useEffect(() => {
    const loadSignedUrls = async () => {
      if (!open) return;

      // Reset all states
      setBeforeImageFile(null);
      setAfterImageFile(null);
      setBeforeImagePreview(null);
      setAfterImagePreview(null);
      
      // Generate signed URL for before image
      if (workflow?.before_image_url) {
        const storagePath = extractStoragePathFromUrl(workflow.before_image_url);
        if (storagePath) {
          const signedUrl = await getSignedImageUrl(storagePath);
          setBeforeSignedPreview(signedUrl);
        } else if (workflow.before_image_url.startsWith('http')) {
          // Full URL that couldn't be extracted - use as-is
          setBeforeSignedPreview(workflow.before_image_url);
        }
      } else {
        setBeforeSignedPreview(null);
      }
      
      // Generate signed URL for after image
      if (workflow?.after_image_url) {
        const storagePath = extractStoragePathFromUrl(workflow.after_image_url);
        if (storagePath) {
          const signedUrl = await getSignedImageUrl(storagePath);
          setAfterSignedPreview(signedUrl);
        } else if (workflow.after_image_url.startsWith('http')) {
          // Full URL that couldn't be extracted - use as-is
          setAfterSignedPreview(workflow.after_image_url);
        }
      } else {
        setAfterSignedPreview(null);
      }
    };
    
    loadSignedUrls();
  }, [open, workflow]);

  /**
   * Handle image file selection and create preview
   */
  const handleImageUpload = async (file: File, type: 'before' | 'after') => {
    const preview = await createFilePreview(file);
    
    if (type === 'before') {
      setBeforeImageFile(file);
      setBeforeImagePreview(preview);
    } else {
      setAfterImageFile(file);
      setAfterImagePreview(preview);
    }
  };

  /**
   * Upload both images to storage and return their paths
   */
  const uploadImages = async (
    existingBeforeUrl?: string | null,
    existingAfterUrl?: string | null
  ): Promise<{
    beforeUrl: string | null | undefined;
    afterUrl: string | null | undefined;
  }> => {
    setUploadingImages(true);
    
    let beforeUrl = existingBeforeUrl;
    let afterUrl = existingAfterUrl;
    
    if (beforeImageFile) {
      beforeUrl = await uploadWorkflowImage(beforeImageFile, 'before');
    }
    if (afterImageFile) {
      afterUrl = await uploadWorkflowImage(afterImageFile, 'after');
    }
    
    setUploadingImages(false);
    
    return { beforeUrl, afterUrl };
  };

  /**
   * Remove image and clear all related state
   */
  const removeImage = (type: 'before' | 'after') => {
    if (type === 'before') {
      setBeforeImageFile(null);
      setBeforeImagePreview(null);
      setBeforeSignedPreview(null);
    } else {
      setAfterImageFile(null);
      setAfterImagePreview(null);
      setAfterSignedPreview(null);
    }
  };

  return {
    beforeImage: {
      file: beforeImageFile,
      preview: beforeImagePreview,
      signedPreview: beforeSignedPreview,
      upload: (file: File) => handleImageUpload(file, 'before'),
      remove: () => removeImage('before'),
    },
    afterImage: {
      file: afterImageFile,
      preview: afterImagePreview,
      signedPreview: afterSignedPreview,
      upload: (file: File) => handleImageUpload(file, 'after'),
      remove: () => removeImage('after'),
    },
    uploadImages,
    uploadingImages,
  };
}
