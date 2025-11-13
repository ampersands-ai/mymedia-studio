import { useEffect, useState } from "react";
import { SchemaInput } from "./SchemaInput";
import type {
  ModelJsonSchema,
  ModelParameters,
  JsonSchemaProperty,
  ModelParameterValue
} from "@/types/model-schema";
import {
  toModelJsonSchema,
  getSchemaProperty,
  getFieldOrder,
  initializeParameters,
  getFilteredEnum
} from "@/types/model-schema";

interface ModelParameterFormProps {
  modelSchema: unknown;
  onChange: (params: ModelParameters) => void;
  currentValues?: ModelParameters;
  excludeFields?: string[];
  modelId?: string;
  provider?: string;
}

export const ModelParameterForm = ({ 
  modelSchema: modelSchemaProp, 
  onChange, 
  currentValues = {}, 
  excludeFields = [], 
  modelId, 
  provider 
}: ModelParameterFormProps) => {
  // Convert and validate schema
  const modelSchema = toModelJsonSchema(modelSchemaProp);
  
  // Initialize with defaults immediately to avoid timing issues
  const [parameters, setParameters] = useState<ModelParameters>(() => {
    return initializeParameters(modelSchema, currentValues);
  });

  // Update when model schema changes
  useEffect(() => {
    if (!modelSchema) return;
    
    const defaults = initializeParameters(modelSchema, currentValues);
    setParameters(defaults);
    onChange(defaults);
  }, [modelSchema]);

  // Re-hydrate display when parent clears values (e.g., Reset)
  useEffect(() => {
    if (!modelSchema?.properties) return;
    
    const rehydrated: ModelParameters = {};
    Object.entries(modelSchema.properties).forEach(([key, schemaProp]) => {
      if (!schemaProp) return;
      const schema = schemaProp as JsonSchemaProperty;
      const val = currentValues[key];
      // If value is empty string, undefined, or null, use schema default
      if ((val === "" || val === undefined || val === null) && schema.default !== undefined) {
        rehydrated[key] = schema.default as ModelParameterValue;
      } else {
        rehydrated[key] = val;
      }
    });
    
    setParameters(rehydrated);
  }, [currentValues, modelSchema]);

  // Auto-correct invalid combinations based on dependencies
  const autoCorrectDependencies = (
    _changedField: string, 
    _newValue: ModelParameterValue, 
    updatedParams: ModelParameters
  ): ModelParameters => {
    // Only handle dependency-based corrections, not general enum validation
    // Let backend handle enum validation and defaults
    return updatedParams;
  };

  const handleParameterChange = (key: string, value: ModelParameterValue) => {
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
  const order = getFieldOrder(modelSchema);
  
  // Filter out excluded fields while preserving order
  const filteredKeys = order.filter(
    (key: string) => !excludeFields.includes(key) && properties[key]
  );

  return (
    <div className="space-y-4">
      {filteredKeys.map((key: string) => {
        const schemaProp = getSchemaProperty(modelSchema, key);
        if (!schemaProp) return null;
        
        return (
          <SchemaInput
            key={key}
            name={key}
            schema={schemaProp}
            value={parameters[key]}
            onChange={(value) => handleParameterChange(key, value)}
            required={required.includes(key)}
            filteredEnum={getFilteredEnum(modelSchema, key, schemaProp, parameters)}
            allValues={parameters}
            modelSchema={modelSchema}
            modelId={modelId}
            provider={provider}
          />
        );
      })}
    </div>
  );
};
