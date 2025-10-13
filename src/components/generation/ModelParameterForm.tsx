import { useEffect, useState } from "react";
import { SchemaInput } from "./SchemaInput";

interface ModelParameterFormProps {
  modelSchema: any;
  onChange: (params: Record<string, any>) => void;
  currentValues?: Record<string, any>;
  excludeFields?: string[];
}

export const ModelParameterForm = ({ modelSchema, onChange, currentValues = {}, excludeFields = [] }: ModelParameterFormProps) => {
  // Initialize with defaults immediately to avoid timing issues
  const [parameters, setParameters] = useState<Record<string, any>>(() => {
    if (!modelSchema?.properties) return currentValues;
    
    const defaults: Record<string, any> = {};
    Object.entries(modelSchema.properties).forEach(([key, schema]: [string, any]) => {
      if (currentValues[key] !== undefined) {
        defaults[key] = currentValues[key];
      } else if (schema.default !== undefined) {
        defaults[key] = schema.default;
      }
    });
    
    return defaults;
  });

  // Update when model schema changes
  useEffect(() => {
    if (!modelSchema?.properties) return;

    const defaults: Record<string, any> = {};
    Object.entries(modelSchema.properties).forEach(([key, schema]: [string, any]) => {
      if (currentValues[key] !== undefined) {
        defaults[key] = currentValues[key];
      } else if (schema.default !== undefined) {
        defaults[key] = schema.default;
      }
    });

    setParameters(defaults);
    onChange(defaults);
  }, [modelSchema]);

  // Re-hydrate display when parent clears values (e.g., Reset)
  useEffect(() => {
    if (!modelSchema?.properties) return;
    
    const rehydrated: Record<string, any> = {};
    Object.entries(modelSchema.properties).forEach(([key, schema]: [string, any]) => {
      const val = currentValues[key];
      // If value is empty string, undefined, or null, use schema default
      if ((val === "" || val === undefined || val === null) && schema.default !== undefined) {
        rehydrated[key] = schema.default;
      } else {
        rehydrated[key] = val;
      }
    });
    
    setParameters(rehydrated);
  }, [currentValues, modelSchema]);

  // Get filtered enum based on field dependencies
  const getFilteredEnum = (fieldName: string, schema: any): any[] | undefined => {
    if (!modelSchema?.fieldDependencies || !schema.enum) return undefined;
    
    const dependencies = modelSchema.fieldDependencies[fieldName];
    if (!dependencies) return undefined;
    
    // Check each dependency rule
    for (const [dependentField, rules] of Object.entries(dependencies)) {
      const currentValue = parameters[dependentField];
      if (currentValue !== undefined && rules[currentValue]) {
        return rules[currentValue];
      }
    }
    
    return undefined;
  };

  // Auto-correct invalid combinations based on dependencies
  const autoCorrectDependencies = (changedField: string, newValue: any, updatedParams: Record<string, any>) => {
    if (!modelSchema?.properties) return updatedParams;
    
    const corrected = { ...updatedParams };
    
    // Check all fields to enforce enum validity
    Object.entries(modelSchema.properties).forEach(([fieldName, schema]: [string, any]) => {
      if (!schema.enum) return;
      
      // Get valid options (filtered by dependencies or all enum values)
      const filteredEnum = modelSchema?.fieldDependencies 
        ? getFilteredEnum(fieldName, schema) 
        : null;
      const validOptions = filteredEnum ?? schema.enum;
      
      const currentValue = corrected[fieldName];
      
      // If value is empty, undefined, null, or not in valid options
      if (currentValue === "" || currentValue === undefined || currentValue === null || !validOptions.includes(currentValue)) {
        // Use default if available, otherwise first valid option
        corrected[fieldName] = schema.default ?? validOptions[0];
      }
    });
    
    return corrected;
  };

  const handleParameterChange = (key: string, value: any) => {
    let updated = { ...parameters, [key]: value };
    
    // Auto-correct dependent fields
    updated = autoCorrectDependencies(key, value, updated);
    
    setParameters(updated);
    onChange(updated);
  };

  if (!modelSchema?.properties) {
    return null;
  }

  const properties = modelSchema.properties;
  const required = modelSchema.required || [];

  // Use x-order if available to maintain parameter order
  const order = Array.isArray(modelSchema["x-order"]) 
    ? modelSchema["x-order"] 
    : Object.keys(properties);
  
  // Filter out excluded fields while preserving order
  const filteredKeys = order.filter(
    (key: string) => !excludeFields.includes(key) && properties[key]
  );

  return (
    <div className="space-y-4">
      {filteredKeys.map((key: string) => {
        const schema = properties[key];
        return (
          <SchemaInput
            key={key}
            name={key}
            schema={schema}
            value={parameters[key]}
            onChange={(value) => handleParameterChange(key, value)}
            required={required.includes(key)}
            filteredEnum={getFilteredEnum(key, schema)}
            allValues={parameters}
          />
        );
      })}
    </div>
  );
};
