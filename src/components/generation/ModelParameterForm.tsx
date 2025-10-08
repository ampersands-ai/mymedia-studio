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

  const handleParameterChange = (key: string, value: any) => {
    const updated = { ...parameters, [key]: value };
    setParameters(updated);
    // Call onChange immediately to trigger token recalculation
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
        />
      ))}
    </div>
  );
};
