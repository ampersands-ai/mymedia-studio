import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Upload, X, Volume2, FileText, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { VoiceSelector } from "./VoiceSelector";
import { useState } from "react";
import type {
  JsonSchemaProperty,
  ModelJsonSchema,
  ModelParameters,
  ModelParameterValue
} from "@/types/model-schema";

interface SchemaInputProps {
  name: string;
  schema: JsonSchemaProperty;
  value: ModelParameterValue;
  onChange: (value: ModelParameterValue) => void;
  required?: boolean;
  filteredEnum?: unknown[];
  allValues?: ModelParameters;
  modelSchema?: ModelJsonSchema | null;
  rows?: number;
  modelId?: string;
  provider?: string;
}

export const SchemaInput = ({ name, schema, value, onChange, required, filteredEnum, allValues, modelSchema, rows, modelId, provider }: SchemaInputProps) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Check if showToUser flag should hide this field
  if (schema.showToUser === false) {
    return null;
  }
  
  // Check if this field should be visible based on conditional dependencies
  const shouldShowField = () => {
    if (!modelSchema?.conditionalFields?.[name]) return true;
    
    const dependency = modelSchema.conditionalFields[name].dependsOn;
    if (!dependency) return true;
    
    // Check if all dependency conditions are met
    for (const [depField, depValue] of Object.entries(dependency)) {
      if (allValues?.[depField] !== depValue) {
        return false;
      }
    }
    
    return true;
  };
  
  // Check if this field is conditionally required
  const isConditionallyRequired = () => {
    if (!modelSchema?.conditionalFields?.[name]) return required;
    
    const fieldConfig = modelSchema.conditionalFields[name];
    if (!shouldShowField()) return false; // Hidden fields can't be required
    
    return fieldConfig.required !== undefined ? fieldConfig.required : required;
  };
  
  // Don't render if conditions not met
  if (!shouldShowField()) {
    return null;
  }
  
  const isRequired = isConditionallyRequired();
  
  const displayName = schema.title || name.split('_').map((word: string) => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  // Check if this is an array of image objects (e.g., frameImages for Seedance)
  const isArrayOfImages = 
    schema.type === "array" && 
    schema.items?.type === "object" &&
    schema.items?.properties?.inputImage?.format === "uri";

  // Check if this is an array of image strings (e.g., ["url1", "url2", "url3"]) - for Veo Reference
  const isImageArray = 
    schema.type === "array" && 
    schema.items?.type === "string" &&
    schema.renderer === 'image';

  // Only use explicit renderer property
  const isImageUpload = schema.renderer === 'image' && !isArrayOfImages && !isImageArray;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      
      // If this is an array of image objects, store as [{ inputImage: "base64" }]
      if (isArrayOfImages) {
        onChange([{ inputImage: base64String }] as unknown as ModelParameterValue);
        setImagePreview(null);
      } else if (isImageArray) {
        // Handle array of strings (Veo Reference model)
        const currentArray = Array.isArray(value) ? value : [];
        const maxItems = schema.maxItems || 10;
        
        if (currentArray.length >= maxItems) {
          // Use toast if available
          console.warn(`Maximum ${maxItems} images allowed`);
          return;
        }
        
        onChange([...currentArray, base64String] as ModelParameterValue);
        setImagePreview(null);
      } else {
        setImagePreview(base64String);
        onChange(base64String);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      
      if (isArrayOfImages) {
        onChange([{ inputImage: base64String }] as unknown as ModelParameterValue);
        setImagePreview(null);
      } else if (isImageArray) {
        const currentImages = Array.isArray(value) ? value : [];
        onChange([...currentImages, base64String] as ModelParameterValue);
      } else {
        onChange(base64String as ModelParameterValue);
        setImagePreview(base64String);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImagePreview(null);
    onChange(null);
  };

  // Use explicit renderer or standard JSON schema properties only
  const isLikelyPrimaryText = 
    schema.renderer === 'prompt' ||
    (schema?.type === 'string' && 
     !schema?.enum && 
     !isImageUpload && 
     ['textarea', 'markdown'].includes(schema?.format || ''));

  // Detect secondary text fields based on maxLength only
  const isSecondaryTextField = (
    schema?.type === 'string' &&
    !schema?.enum &&
    !isImageUpload &&
    !isLikelyPrimaryText &&
    (typeof schema?.maxLength === 'number' && schema.maxLength >= 100 && schema.maxLength < 200)
  );

  // Elegant, large textarea for primary text
  if (isLikelyPrimaryText) {
    const stringValue = typeof value === 'string' ? value : (value || '');
    const charCount = String(stringValue).length;
    const maxChars = typeof schema.maxLength === 'number' ? schema.maxLength : 5000;
    
    return (
      <Card className="border-2 border-primary/20 shadow-sm hover:border-primary/30 transition-colors">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <Label className="text-base font-semibold">
              {displayName}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
          {schema.description && (
            <p className="text-sm text-muted-foreground">{schema.description}</p>
          )}
          <Textarea
            value={typeof stringValue === 'string' ? stringValue : String(stringValue)}
            onChange={(e) => onChange(e.target.value)}
            placeholder={String(schema.description || "Enter your text here...")}
            rows={10}
            className="min-h-[280px] md:min-h-[340px] resize-y text-base leading-relaxed focus-visible:ring-2 focus-visible:ring-primary"
            maxLength={maxChars}
          />
          <div className="flex justify-end">
            <span className={`text-xs ${charCount > maxChars * 0.9 ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
              {charCount} / {maxChars} characters
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact textarea for secondary text fields (negative prompt, etc.)
  if (isSecondaryTextField) {
    const stringValue = typeof value === 'string' ? value : String(value || '');
    const charCount = stringValue.length;
    const maxChars = typeof schema.maxLength === 'number' ? schema.maxLength : 500;
    
    return (
      <Card className="border border-border shadow-sm">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">
              {displayName}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
          {schema.description && (
            <p className="text-xs text-muted-foreground">{schema.description}</p>
          )}
          <Textarea
            value={stringValue || String(schema.default || "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={String(schema.description || `Enter ${displayName.toLowerCase()}...`)}
            rows={3}
            className="min-h-[90px] max-h-[140px] resize-y text-sm leading-relaxed"
            maxLength={maxChars}
          />
          <div className="flex justify-end">
            <span className="text-xs text-muted-foreground">
              {charCount} / {maxChars} characters
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle array of image objects (e.g., frameImages for Seedance)
  if (isArrayOfImages) {
    let imageUrl: string | null = null;
    
    if (Array.isArray(value) && value.length > 0) {
      const firstItem = value[0];
      if (firstItem && typeof firstItem === 'object' && !Array.isArray(firstItem)) {
        const itemAsRecord = firstItem as Record<string, unknown>;
        if ('inputImage' in itemAsRecord) {
          const inputImageValue = itemAsRecord.inputImage;
          if (inputImageValue) {
            imageUrl = String(inputImageValue);
          }
        }
      }
    }
    
    return (
      <div className="space-y-2">
        <Label>
          {displayName}
          {isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
        {schema.description && (
          <p className="text-xs text-muted-foreground mb-2">{schema.description}</p>
        )}
        <div className="space-y-2">
          {((imagePreview && (imagePreview.startsWith('http') || imagePreview.startsWith('data:image/'))) ||
            (typeof imageUrl === 'string' && (imageUrl.startsWith('http') || imageUrl.startsWith('data:image/')))) ? (
            <div className="space-y-2">
              <div className="relative inline-block">
                <img 
                  src={imagePreview || imageUrl as string} 
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
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full border-2 border-dashed rounded-lg p-8 transition-colors bg-background ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm font-medium">Drag and drop or click to upload</span>
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Render array of image strings (e.g., ["url1", "url2", "url3"]) - for Veo Reference model
  if (isImageArray) {
    const imageArray = (Array.isArray(value) ? value : []) as string[];
    const maxItems = schema.maxItems || 10;
    
    return (
      <div className="space-y-2">
        <Label>
          {displayName}
          {isRequired && <span className="text-destructive ml-1">*</span>}
          <span className="text-xs text-muted-foreground ml-2">
            ({imageArray.length}/{maxItems})
          </span>
        </Label>
        {schema.description && (
          <p className="text-xs text-muted-foreground mb-2">{schema.description}</p>
        )}
        
        {/* Grid of uploaded images with remove buttons */}
        {imageArray.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
            {imageArray.map((imgUrl, idx) => (
              <div key={idx} className="relative group">
                <img 
                  src={imgUrl} 
                  alt={`Reference ${idx + 1}`}
                  className="w-full h-24 object-cover rounded-lg border border-border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    const newArray = imageArray.filter((_, i) => i !== idx);
                    onChange(newArray.length > 0 ? newArray : null);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        {/* Upload button - show only if under max limit */}
        {imageArray.length < maxItems && (
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
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full border-2 border-dashed rounded-lg p-6 transition-colors bg-background ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex flex-col items-center justify-center gap-2">
                <Plus className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {imageArray.length > 0 ? 'Drag and drop or click to add more' : 'Drag and drop or click to upload'}
                </span>
              </div>
            </button>
          </>
        )}
      </div>
    );
  }

  // Handle image upload fields
  if (isImageUpload) {
    return (
      <div className="space-y-2">
        <Label>
          {displayName}
          {isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
        <div className="space-y-2">
          {((imagePreview && (imagePreview.startsWith('http') || imagePreview.startsWith('data:image/'))) ||
            (typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:image/')))) ? (
            <div className="space-y-2">
              <div className="relative inline-block">
                <img 
                  src={imagePreview || value as string} 
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
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full border-2 border-dashed rounded-lg p-8 transition-colors bg-background ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm font-medium">Drag and drop or click to upload</span>
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

  // Only use explicit renderer property
  const isVoiceField = schema.renderer === 'voice';

  if (isVoiceField) {
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>
          {displayName}
          {isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
        {schema.description && (
          <p className="text-xs text-muted-foreground mb-2">{schema.description}</p>
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              <Volume2 className="w-4 h-4 mr-2" />
              {String(value || schema.default || 'Select voice')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[85vh] p-6">
            <DialogHeader className="pb-4">
              <DialogTitle>Choose a Voice</DialogTitle>
            </DialogHeader>
            <VoiceSelector 
              selectedValue={String(value || schema.default || 'nPczCjzI2devNBz1zQrb')}
              onSelectVoice={(voiceId, voiceName) => onChange(voiceName)}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Handle enum types (dropdown)
  if (schema.enum && Array.isArray(schema.enum)) {
    const enumOptions = filteredEnum ?? schema.enum;
    // Only use default for truly empty values (undefined/null), not empty string
    const selected = (value === undefined || value === null) ? schema.default : value;
    
    return (
      <div className="space-y-2">
        <Label>
          {displayName}
          {isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
        {schema.description && (
          <p className="text-xs text-muted-foreground">{schema.description}</p>
        )}
        <Select value={selected?.toString() || ''} onValueChange={(val) => {
          let newVal: ModelParameterValue = val;
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
            {enumOptions.map((option: unknown) => (
              <SelectItem key={String(option)} value={String(option)}>
                {String(option)}
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
          checked={typeof value === 'boolean' ? value : (schema.default === true)}
          onCheckedChange={(checked) => onChange(!!checked)}
        />
        <Label htmlFor={name} className="cursor-pointer">
          {displayName}
          {isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
        {schema.description && (
          <p className="text-xs text-muted-foreground ml-2">{schema.description}</p>
        )}
      </div>
    );
  }

  // Special handling for duration renderer - use increment/decrement buttons
  if (schema.renderer === "duration" && (schema.type === "number" || schema.type === "integer")) {
    const defaultVal = typeof schema.default === 'number' ? schema.default : (typeof schema.minimum === 'number' ? schema.minimum : 1);
    const numericValue = (value === "" || value === undefined || value === null) 
      ? Math.round(defaultVal)
      : Math.round(Number(value));
    
    const step = 1; // Always use integer step for duration
    const min = schema.minimum ?? 0;
    const max = schema.maximum ?? 100;
    
    const handleDecrement = () => {
      const newValue = Math.max(min, numericValue - step);
      onChange(Math.round(newValue));
    };
    
    const handleIncrement = () => {
      const newValue = Math.min(max, numericValue + step);
      onChange(Math.round(newValue));
    };
    
    return (
      <div className="space-y-2">
        <Label>
          {displayName}
          {isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
        {schema.description && (
          <p className="text-xs text-muted-foreground">{schema.description}</p>
        )}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleDecrement}
            disabled={numericValue <= min}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <div className="flex-1 text-center">
            <Input
              type="number"
              value={numericValue}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) onChange(Math.round(Math.max(min, Math.min(max, val))));
              }}
              min={min}
              max={max}
              step={1}
              className="text-center"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleIncrement}
            disabled={numericValue >= max}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Handle number types
  if (schema.type === "number" || schema.type === "integer") {
    const hasMinMax = typeof schema.minimum === 'number' && typeof schema.maximum === 'number';
    // Treat empty string as missing value and fallback to default
    const defaultValue = typeof schema.default === 'number' ? schema.default : (typeof schema.minimum === 'number' ? schema.minimum : 0);
    const numericValue: number = (value === "" || value === undefined || value === null) 
      ? defaultValue
      : (typeof value === 'number' ? value : Number(value));
    
    // Smart step calculation based on range and type
    const calculateStep = () => {
      if (schema.type === "integer") return 1;
      
      // For ranges 0-1 or similar small fractional ranges, use 0.01
      if (hasMinMax && typeof schema.maximum === 'number' && typeof schema.minimum === 'number' && schema.maximum - schema.minimum <= 1) {
        return 0.01;
      }
      
      // Default to 0.1 for other number types
      return 0.1;
    };
    
    const minVal = typeof schema.minimum === 'number' ? schema.minimum : 0;
    const maxVal = typeof schema.maximum === 'number' ? schema.maximum : 100;
    
    // Show slider for ranges <= 100 or small fractional ranges (e.g., 0-1)
    if (hasMinMax && (maxVal - minVal <= 100 || (maxVal - minVal <= 1 && minVal >= 0))) {
      // Use slider for small ranges
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>
              {displayName}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <span className="text-sm text-muted-foreground">{numericValue}</span>
          </div>
          {schema.description && (
            <p className="text-xs text-muted-foreground">{schema.description}</p>
          )}
          <Slider
            value={[numericValue]}
            onValueChange={([val]) => onChange(val)}
            min={minVal}
            max={maxVal}
            step={calculateStep()}
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
          {isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
        {schema.description && (
          <p className="text-xs text-muted-foreground">{schema.description}</p>
        )}
        <Input
          type="number"
          value={numericValue !== null && numericValue !== undefined ? String(numericValue) : ""}
          onChange={(e) => onChange(schema.type === "integer" ? parseInt(e.target.value) : parseFloat(e.target.value))}
          min={minVal}
          max={maxVal}
          step={calculateStep()}
          placeholder={`Enter ${displayName.toLowerCase()}`}
        />
      </div>
    );
  }

  // Default to text input for strings and unknown types
  // Use Textarea if rows is specified (for longer text like prompts)
  if (rows) {
    const stringValue = typeof value === 'string' ? value : String(value || schema.default || "");
    return (
      <div className="space-y-2">
        <Textarea
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={String(schema.description || `Enter ${displayName.toLowerCase()}`)}
          rows={rows}
        />
      </div>
    );
  }

  const stringValue = typeof value === 'string' ? value : String(value || schema.default || "");
  return (
    <div className="space-y-2">
      <Label>
        {displayName}
        {isRequired && <span className="text-destructive ml-1">*</span>}
      </Label>
      {schema.description && (
        <p className="text-xs text-muted-foreground">{schema.description}</p>
      )}
      <Input
        type="text"
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${displayName.toLowerCase()}`}
      />
    </div>
  );
};
