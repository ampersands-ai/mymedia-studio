import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ImageUploadFieldProps {
  value?: string; // base64 or URL
  onChange: (value: string | null) => void;
  className?: string;
}

export const ImageUploadField = ({ value, onChange, className }: ImageUploadFieldProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('Image size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onChange(base64);
      toast.success('Image uploaded');
    };
    reader.onerror = () => {
      toast.error('Failed to read image');
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Image removed');
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg transition-all cursor-pointer",
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          value ? "p-2" : "p-6"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onClick={!value ? handleClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {value ? (
          <div className="relative group">
            <img
              src={value}
              alt="Uploaded preview"
              className="w-full h-auto max-h-64 object-contain rounded"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleClick}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Replace
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleRemove}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center space-y-2">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
              isDragging ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <ImageIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {isDragging ? "Drop image here" : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, WEBP up to 10MB
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
