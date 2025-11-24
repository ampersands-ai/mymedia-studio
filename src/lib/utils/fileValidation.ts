/**
 * File Validation Utility
 *
 * Provides reusable file validation functions for uploads.
 * Extracted from duplicate implementations across upload components.
 *
 * @module fileValidation
 */

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * File validation options
 */
export interface FileValidationOptions {
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Maximum file size in megabytes (alternative to maxSize) */
  maxSizeMB?: number;
  /** Allowed MIME types */
  allowedTypes?: string[];
  /** Allowed file extensions (with or without leading dot) */
  allowedExtensions?: string[];
  /** Minimum file size in bytes */
  minSize?: number;
}

/**
 * Common file type groups
 */
export const FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  VIDEOS: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ALL_MEDIA: [] as string[], // Will be populated below
} as const;

// Populate ALL_MEDIA
FILE_TYPES.ALL_MEDIA = [...FILE_TYPES.IMAGES, ...FILE_TYPES.VIDEOS, ...FILE_TYPES.AUDIO];

/**
 * Common file size limits
 */
export const FILE_SIZE_LIMITS = {
  IMAGE_10MB: 10 * 1024 * 1024,
  IMAGE_5MB: 5 * 1024 * 1024,
  VIDEO_100MB: 100 * 1024 * 1024,
  VIDEO_50MB: 50 * 1024 * 1024,
  AUDIO_10MB: 10 * 1024 * 1024,
  DOCUMENT_10MB: 10 * 1024 * 1024,
} as const;

/**
 * Validate file size
 *
 * @param file - File to validate
 * @param maxSizeMB - Maximum size in megabytes
 * @returns True if file is within size limit
 *
 * @example
 * ```typescript
 * if (!validateFileSize(file, 10)) {
 *   console.error('File too large (max 10MB)');
 * }
 * ```
 */
export function validateFileSize(file: File, maxSizeMB: number): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxBytes;
}

/**
 * Validate file type
 *
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns True if file type is allowed
 *
 * @example
 * ```typescript
 * if (!validateFileType(file, FILE_TYPES.IMAGES)) {
 *   console.error('Invalid file type');
 * }
 * ```
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Validate file extension
 *
 * @param file - File to validate
 * @param allowedExtensions - Array of allowed extensions (with or without leading dot)
 * @returns True if file extension is allowed
 *
 * @example
 * ```typescript
 * if (!validateFileExtension(file, ['.jpg', '.png'])) {
 *   console.error('Invalid file extension');
 * }
 * ```
 */
export function validateFileExtension(file: File, allowedExtensions: string[]): boolean {
  const fileName = file.name.toLowerCase();
  const normalizedExtensions = allowedExtensions.map(ext =>
    ext.startsWith('.') ? ext : `.${ext}`
  );
  return normalizedExtensions.some(ext => fileName.endsWith(ext));
}

/**
 * Comprehensive file validation
 *
 * Validates file against multiple criteria and returns detailed result
 *
 * @param file - File to validate
 * @param options - Validation options
 * @returns Validation result with error message if invalid
 *
 * @example
 * ```typescript
 * const result = validateFile(file, {
 *   maxSizeMB: 10,
 *   allowedTypes: FILE_TYPES.IMAGES,
 *   allowedExtensions: ['.jpg', '.png']
 * });
 *
 * if (!result.valid) {
 *   toast.error(result.error);
 * }
 * ```
 */
export function validateFile(
  file: File,
  options: FileValidationOptions
): FileValidationResult {
  const {
    maxSize,
    maxSizeMB,
    allowedTypes,
    allowedExtensions,
    minSize,
  } = options;

  // Validate minimum size
  if (minSize !== undefined && file.size < minSize) {
    return {
      valid: false,
      error: `File "${file.name}" is too small (minimum ${formatFileSize(minSize)})`
    };
  }

  // Validate maximum size (bytes)
  if (maxSize !== undefined && file.size > maxSize) {
    return {
      valid: false,
      error: `File "${file.name}" is too large (maximum ${formatFileSize(maxSize)})`
    };
  }

  // Validate maximum size (MB)
  if (maxSizeMB !== undefined) {
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return {
        valid: false,
        error: `File "${file.name}" is too large (maximum ${maxSizeMB}MB)`
      };
    }
  }

  // Validate file type
  if (allowedTypes && !validateFileType(file, allowedTypes)) {
    return {
      valid: false,
      error: `File "${file.name}" has invalid type. Only ${formatAllowedTypes(allowedTypes)} are allowed.`
    };
  }

  // Validate file extension
  if (allowedExtensions && !validateFileExtension(file, allowedExtensions)) {
    return {
      valid: false,
      error: `File "${file.name}" has invalid extension. Only ${allowedExtensions.join(', ')} are allowed.`
    };
  }

  return { valid: true };
}

/**
 * Validate multiple files
 *
 * @param files - Files to validate
 * @param options - Validation options
 * @returns Array of validation results
 *
 * @example
 * ```typescript
 * const results = validateFiles(files, {
 *   maxSizeMB: 10,
 *   allowedTypes: FILE_TYPES.IMAGES
 * });
 *
 * const validFiles = files.filter((_, i) => results[i].valid);
 * const errors = results.filter(r => !r.valid).map(r => r.error);
 * ```
 */
export function validateFiles(
  files: File[],
  options: FileValidationOptions
): FileValidationResult[] {
  return files.map(file => validateFile(file, options));
}

/**
 * Filter valid files from array
 *
 * @param files - Files to filter
 * @param options - Validation options
 * @returns Array of valid files and array of error messages
 *
 * @example
 * ```typescript
 * const { validFiles, errors } = filterValidFiles(files, {
 *   maxSizeMB: 10,
 *   allowedTypes: FILE_TYPES.IMAGES
 * });
 *
 * if (errors.length > 0) {
 *   errors.forEach(error => toast.error(error));
 * }
 * ```
 */
export function filterValidFiles(
  files: File[],
  options: FileValidationOptions
): { validFiles: File[]; errors: string[] } {
  const validFiles: File[] = [];
  const errors: string[] = [];

  files.forEach(file => {
    const result = validateFile(file, options);
    if (result.valid) {
      validFiles.push(file);
    } else if (result.error) {
      errors.push(result.error);
    }
  });

  return { validFiles, errors };
}

/**
 * Format file size for display
 *
 * @param bytes - Size in bytes
 * @returns Formatted size string
 *
 * @example
 * ```typescript
 * formatFileSize(1024) // "1 KB"
 * formatFileSize(1536) // "1.5 KB"
 * formatFileSize(1048576) // "1 MB"
 * ```
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format allowed types for display
 *
 * @param types - Array of MIME types
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * formatAllowedTypes(['image/jpeg', 'image/png'])
 * // "JPEG and PNG"
 * ```
 */
export function formatAllowedTypes(types: string[]): string {
  const names = types.map(type => {
    const parts = type.split('/');
    return parts[1]?.toUpperCase() || type;
  });

  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;

  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

/**
 * Check if file is an image
 *
 * @param file - File to check
 * @returns True if file is an image
 */
export function isImage(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Check if file is a video
 *
 * @param file - File to check
 * @returns True if file is a video
 */
export function isVideo(file: File): boolean {
  return file.type.startsWith('video/');
}

/**
 * Check if file is audio
 *
 * @param file - File to check
 * @returns True if file is audio
 */
export function isAudio(file: File): boolean {
  return file.type.startsWith('audio/');
}

/**
 * Get file extension
 *
 * @param file - File to get extension from
 * @returns File extension (with leading dot) or empty string
 *
 * @example
 * ```typescript
 * getFileExtension(new File([], 'photo.jpg')) // ".jpg"
 * ```
 */
export function getFileExtension(file: File): string {
  const parts = file.name.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
}

/**
 * Convert File to base64 data URL
 *
 * @param file - File to convert
 * @returns Promise resolving to data URL
 *
 * @example
 * ```typescript
 * const dataUrl = await fileToDataUrl(file);
 * ```
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert File to ArrayBuffer
 *
 * @param file - File to convert
 * @returns Promise resolving to ArrayBuffer
 */
export function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
