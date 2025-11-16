import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Loader2, ExternalLink } from "lucide-react";
import { logger } from "@/lib/logger";

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  bucket?: string;
}

export function ImageUploader({ value, onChange, label, bucket = "generated-content" }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `template-assets/${fileName}`;

      const { error: uploadError } = await (supabase as any).storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = (supabase as any).storage
        .from(bucket)
        .getPublicUrl(filePath);

      onChange(urlData.publicUrl);

      toast({
        title: "Image uploaded",
        description: "Image uploaded successfully",
      });
    } catch (error: any) {
      logger.error('Template landing image upload failed', error, {
        component: 'ImageUploader',
        bucket,
        fileName: file?.name,
        fileSize: file?.size,
        operation: 'uploadImage'
      });
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    onChange("");
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      
      <div className="flex gap-2">
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter image URL or upload"
        />
        
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => document.getElementById(`file-upload-${label}`)?.click()}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
          </Button>
          
          {value && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open(value, "_blank")}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <input
        id={`file-upload-${label}`}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {value && (
        <div className="mt-2">
          <img src={value} alt="Preview" className="h-32 w-auto rounded border" />
        </div>
      )}
    </div>
  );
}
