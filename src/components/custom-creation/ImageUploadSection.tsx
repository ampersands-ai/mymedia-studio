import { Button } from "@/components/ui/button";
import { Camera, ImageIcon, Upload, X, Loader2 } from "lucide-react";
import { useState } from "react";

interface ImageUploadSectionProps {
  images: File[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  maxImages: number;
  isRequired: boolean;
  isNative: boolean;
  cameraLoading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onNativeCameraPick: (source: 'camera' | 'gallery') => Promise<void>;
}

/**
 * Image upload UI with native camera support or file input
 */
export const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
  images,
  onUpload,
  onRemove,
  maxImages,
  isRequired,
  isNative,
  cameraLoading,
  fileInputRef,
  onNativeCameraPick,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (images.length < maxImages) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (images.length >= maxImages) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => 
      ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)
    );

    if (imageFiles.length > 0) {
      const syntheticEvent = {
        target: { files: imageFiles }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      onUpload(syntheticEvent);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        Upload Images {isRequired && <span className="text-destructive">*</span>}
        {maxImages > 1 && (
          <span className="text-xs text-muted-foreground ml-2">
            (Max {maxImages} images)
          </span>
        )}
      </label>

      {/* Uploaded images preview */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((file, index) => (
            <div key={index} className="relative">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted border border-border">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full shadow-lg z-10 border border-background"
                onClick={() => onRemove(index)}
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload buttons */}
      {images.length < maxImages && (
        <>
          {isNative ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => onNativeCameraPick('camera')}
                disabled={cameraLoading}
                className="w-full justify-center gap-2"
              >
                {cameraLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                Camera
              </Button>
              <Button
                variant="outline"
                onClick={() => onNativeCameraPick('gallery')}
                disabled={cameraLoading}
                className="w-full justify-center gap-2"
              >
                {cameraLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImageIcon className="h-4 w-4" />
                )}
                Gallery
              </Button>
            </div>
          ) : (
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center
                transition-all duration-200
                ${isDragging 
                  ? 'border-primary bg-primary/5 scale-[1.02]' 
                  : 'border-border hover:border-primary/50'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple={maxImages !== 1}
                onChange={onUpload}
                className="hidden"
              />
              
              {isDragging ? (
                <div className="space-y-2">
                  <Upload className="h-10 w-10 mx-auto text-primary animate-bounce" />
                  <p className="text-base font-medium text-primary">
                    Drop images here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                  <div>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="mb-2"
                    >
                      Choose Files
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      or drag and drop images here
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Supported formats: JPEG, PNG, WebP (max 10MB per image)
      </p>
    </div>
  );
};
