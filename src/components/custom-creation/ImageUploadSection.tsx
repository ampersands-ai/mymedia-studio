import { Button } from "@/components/ui/button";
import { Camera, ImageIcon, Upload, X, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

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
        <div className="grid grid-cols-2 gap-2">
          {images.map((file, index) => (
            <Card key={index} className="relative p-2 border-border bg-muted/30 overflow-visible">
              <div className="aspect-square rounded overflow-hidden bg-muted">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-lg z-10 border-2 border-background"
                onClick={() => onRemove(index)}
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {file.name}
              </p>
            </Card>
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
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple={maxImages !== 1}
                onChange={onUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full justify-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Images
              </Button>
            </>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Supported formats: JPEG, PNG, WebP (max 10MB per image)
      </p>
    </div>
  );
};
