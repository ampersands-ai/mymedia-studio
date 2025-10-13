import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SchemaInputProps {
  name: string;
  schema: any;
  value: any;
  onChange: (value: any) => void;
  required?: boolean;
  filteredEnum?: any[];
  allValues?: Record<string, any>;
}

export const SchemaInput = ({ name, schema, value, onChange, required, filteredEnum, allValues }: SchemaInputProps) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const displayName = schema.title || name.split('_').map((word: string) => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  // Check if this is an image upload field (by explicit format or specific field name)
  const isImageUpload = 
    (schema.format === "base64" || schema.format === "binary" || schema.format === "data-url") ||
    name === "inputImage" || // FLUX.1 Kontext Pro
    name === "image_url" || // Qwen, Ideogram Remix
    name === "image" || // Google Image Upscale
    name === "filesUrl" || // ChatGPT 4o
    name === "image_urls" || // Midjourney
    schema.title?.toLowerCase().includes("upload") || // Catch any field with "upload" in title
    schema.description?.toLowerCase().includes("choose file"); // Catch descriptive hints

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImagePreview(base64String);
      onChange(base64String);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImagePreview(null);
    onChange(null);
  };

  // Handle image upload fields
  if (isImageUpload) {
    return (
      <div className="space-y-2">
        <Label>
          {displayName}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <div className="space-y-2">
          {(imagePreview || value) ? (
            <div className="space-y-2">
              <div className="relative inline-block">
                <img 
                  src={imagePreview || value} 
                  alt="Preview" 
                  className="max-w-full h-auto max-h-48 rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={clearImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id={`image-upload-${name}`}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById(`image-upload-${name}`)?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Change Image
              </Button>
            </div>
          ) : (
            <>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id={`image-upload-${name}`}
              />
              <button
                type="button"
                onClick={() => document.getElementById(`image-upload-${name}`)?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg p-8 hover:border-primary/50 transition-colors bg-background"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm font-medium">Upload Image</span>
                </div>
              </button>
              {schema.description && (
                <p className="text-xs text-muted-foreground">{schema.description}</p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Handle enum types (dropdown)
  if (schema.enum && Array.isArray(schema.enum)) {
    const enumOptions = filteredEnum ?? schema.enum;
    // Treat empty string, missing value, or invalid enum as requiring fallback to default
    const isInvalidValue = value === "" || value === undefined || value === null || !enumOptions.includes(value);
    const selected = isInvalidValue ? schema.default : value;
    
    return (
      <div className="space-y-2">
        <Label>
          {displayName}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {schema.description && (
          <p className="text-xs text-muted-foreground">{schema.description}</p>
        )}
        <Select value={selected?.toString()} onValueChange={(val) => {
          let newVal: any = val;
          if (schema.type === "boolean") {
            newVal = val === "true";
          } else if (schema.type === "integer") {
            const n = parseInt(val, 10);
            newVal = isNaN(n) ? val : n;
          } else if (schema.type === "number") {
            const n = parseFloat(val);
            newVal = isNaN(n) ? val : n;
          }
          onChange(newVal);
        }}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={`Select ${displayName.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {enumOptions.map((option: any) => (
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
          checked={value ?? schema.default ?? false}
          onCheckedChange={(checked) => onChange(!!checked)}
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
    // Treat empty string as missing value and fallback to default
    const numericValue = (value === "" || value === undefined || value === null) 
      ? (schema.default ?? schema.minimum) 
      : value;
    
    if (hasMinMax && schema.maximum - schema.minimum <= 100) {
      // Use slider for small ranges
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>
              {displayName}
              {required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <span className="text-sm text-muted-foreground">{numericValue ?? schema.minimum}</span>
          </div>
          {schema.description && (
            <p className="text-xs text-muted-foreground">{schema.description}</p>
          )}
          <Slider
            value={[numericValue ?? schema.minimum]}
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
          value={numericValue ?? ""}
          onChange={(e) => onChange(schema.type === "integer" ? parseInt(e.target.value) : parseFloat(e.target.value))}
          min={schema.minimum}
          max={schema.maximum}
          step={schema.type === "integer" ? 1 : 0.1}
          placeholder={`Enter ${displayName.toLowerCase()}`}
        />
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
        value={value ?? schema.default ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${displayName.toLowerCase()}`}
      />
    </div>
  );
};
