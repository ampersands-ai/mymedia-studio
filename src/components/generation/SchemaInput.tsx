import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SchemaInputProps {
  name: string;
  schema: any;
  value: any;
  onChange: (value: any) => void;
  required?: boolean;
}

export const SchemaInput = ({ name, schema, value, onChange, required }: SchemaInputProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(value || "");
  
  const displayName = schema.title || name.split('_').map((word: string) => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  // Check if this is an imageUrl field (case-insensitive)
  const isImageUrlField = name.toLowerCase() === 'imageurl' || name.toLowerCase() === 'image_url';

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, and WebP images are allowed");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    if (!user?.id) {
      toast.error("Please sign in to upload images");
      return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/image-params/${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('generated-content')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        toast.error("Failed to upload image");
        console.error('Upload error:', uploadError);
        return;
      }

      // Generate signed URL for secure access (valid for 1 hour)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('generated-content')
        .createSignedUrl(filePath, 3600);

      if (signedError || !signedData) {
        toast.error("Failed to create secure URL");
        console.error('Signed URL error:', signedError);
        return;
      }

      setImagePreview(URL.createObjectURL(file));
      onChange(signedData.signedUrl);
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImagePreview("");
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle enum types (dropdown)
  if (schema.enum && Array.isArray(schema.enum)) {
    const currentValue = value?.toString() || schema.default?.toString();
    const defaultText = schema.default ? ` (default: ${schema.default})` : '';
    
    return (
      <div className="space-y-2">
        <Label>
          {displayName}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {schema.description && (
          <p className="text-xs text-muted-foreground">{schema.description}{defaultText}</p>
        )}
        <Select value={currentValue} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={`Select ${displayName.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {schema.enum.map((option: any) => (
              <SelectItem key={option} value={option.toString()}>
                {option.toString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Handle boolean types (checkbox)
  if (schema.type === "boolean") {
    return (
      <div className="flex items-center space-x-2">
        <Checkbox
          id={name}
          checked={value || false}
          onCheckedChange={onChange}
        />
        <Label htmlFor={name} className="cursor-pointer">
          {displayName}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {schema.description && (
          <p className="text-xs text-muted-foreground ml-2">{schema.description}</p>
        )}
      </div>
    );
  }

  // Handle number types
  if (schema.type === "number" || schema.type === "integer") {
    const hasMinMax = schema.minimum !== undefined && schema.maximum !== undefined;
    
    if (hasMinMax && schema.maximum - schema.minimum <= 100) {
      // Use slider for small ranges
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>
              {displayName}
              {required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <span className="text-sm text-muted-foreground">{value || schema.default || schema.minimum}</span>
          </div>
          {schema.description && (
            <p className="text-xs text-muted-foreground">{schema.description}</p>
          )}
          <Slider
            value={[value || schema.default || schema.minimum]}
            onValueChange={([val]) => onChange(val)}
            min={schema.minimum}
            max={schema.maximum}
            step={schema.type === "integer" ? 1 : 0.1}
            className="w-full"
          />
        </div>
      );
    }

    // Use number input for large ranges or no range
    return (
      <div className="space-y-2">
        <Label>
          {displayName}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {schema.description && (
          <p className="text-xs text-muted-foreground">{schema.description}</p>
        )}
        <Input
          type="number"
          value={value || schema.default || ""}
          onChange={(e) => onChange(schema.type === "integer" ? parseInt(e.target.value) : parseFloat(e.target.value))}
          min={schema.minimum}
          max={schema.maximum}
          step={schema.type === "integer" ? 1 : 0.1}
          placeholder={`Enter ${displayName.toLowerCase()}`}
        />
      </div>
    );
  }

  // Handle image URL fields with upload option
  if (isImageUrlField && schema.type === "string") {
    return (
      <div className="space-y-2">
        <Label>
          {displayName}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {schema.description && (
          <p className="text-xs text-muted-foreground">{schema.description}</p>
        )}
        
        {imagePreview && (
          <div className="relative inline-block">
            <img 
              src={imagePreview} 
              alt="Uploaded preview" 
              className="w-32 h-32 object-cover rounded-lg border-2 border-border"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={removeImage}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload} 
          className="hidden" 
        />
        
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : imagePreview ? "Change Image" : "Upload Image"}
        </Button>
        
        <p className="text-xs text-muted-foreground">
          Max 10MB (JPEG, PNG, WebP)
        </p>
      </div>
    );
  }

  // Default to text input for strings and unknown types
  return (
    <div className="space-y-2">
      <Label>
        {displayName}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {schema.description && (
        <p className="text-xs text-muted-foreground">{schema.description}</p>
      )}
      <Input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${displayName.toLowerCase()}`}
      />
    </div>
  );
};
