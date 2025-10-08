import { useEffect, useState } from "react";
import { SchemaInput } from "./SchemaInput";

interface ModelParameterFormProps {
  modelSchema: any;
  onChange: (params: Record<string, any>) => void;
  currentValues?: Record<string, any>;
  excludeFields?: string[];
}

export const ModelParameterForm = ({ modelSchema, onChange, currentValues = {}, excludeFields = [] }: ModelParameterFormProps) => {
  const [parameters, setParameters] = useState<Record<string, any>>(currentValues);

  // Initialize with defaults from schema
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
    if (!modelSchema?.fieldDependencies) return updatedParams;
    
    const corrected = { ...updatedParams };
    
    // Check all other fields to see if they need correction
    Object.entries(modelSchema.properties).forEach(([fieldName, schema]: [string, any]) => {
      if (fieldName === changedField || !schema.enum) return;
      
      const filteredEnum = getFilteredEnum(fieldName, schema);
      if (filteredEnum && !filteredEnum.includes(corrected[fieldName])) {
        // Current value is invalid, set to first valid option
        corrected[fieldName] = filteredEnum[0];
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

  // Filter out excluded fields
  const filteredProperties = Object.entries(properties).filter(
    ([key]) => !excludeFields.includes(key)
  );

  return (
    <div className="space-y-4">
      {filteredProperties.map(([key, schema]: [string, any]) => (
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
      ))}
    </div>
  );
};
