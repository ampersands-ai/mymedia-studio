import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

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
  const displayName = schema.title || name.split('_').map((word: string) => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  // Handle enum types (dropdown)
  if (schema.enum && Array.isArray(schema.enum)) {
    const enumOptions = filteredEnum ?? schema.enum;
    
    return (
      <div className="space-y-2">
        <Label>
          {displayName}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {schema.description && (
          <p className="text-xs text-muted-foreground">{schema.description}</p>
        )}
        <Select value={value?.toString()} onValueChange={onChange}>
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
