import { useEffect, useState } from "react";
import { SchemaInput } from "./SchemaInput";
import type {
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
  allowedKeys?: string[];
  modelId?: string;
  provider?: string;
}

export const ModelParameterForm = ({ 
  modelSchema: modelSchemaProp, 
  onChange, 
  currentValues = {}, 
  allowedKeys, 
  modelId, 
  provider 
}: ModelParameterFormProps) => {
  const modelSchema = toModelJsonSchema(modelSchemaProp);
  
  const [parameters, setParameters] = useState<ModelParameters>(() => {
    return initializeParameters(modelSchema, currentValues);
  });

  useEffect(() => {
    if (!modelSchema) return;

    const defaults = initializeParameters(modelSchema, currentValues);
    setParameters(defaults);
    onChange(defaults);
  }, [modelSchema, currentValues, onChange]);

  useEffect(() => {
    if (!modelSchema?.properties) return;
    
    const rehydrated: ModelParameters = {};
    Object.entries(modelSchema.properties).forEach(([key, schemaProp]) => {
      if (!schemaProp) return;
      const schema = schemaProp as JsonSchemaProperty;
      const val = currentValues[key];

      const enumValues = Array.isArray(schema.enum) ? (schema.enum as readonly unknown[]) : null;
      const isEnumValueValid = !enumValues || enumValues.includes(val as unknown);

      if ((val === "" || val === undefined || val === null) && schema.default !== undefined) {
        rehydrated[key] = schema.default as ModelParameterValue;
      } else if (!isEnumValueValid && schema.default !== undefined) {
        rehydrated[key] = schema.default as ModelParameterValue;
      } else {
        rehydrated[key] = val;
      }
    });
    
    setParameters(rehydrated);
  }, [currentValues, modelSchema]);

  const autoCorrectDependencies = (
    _changedField: string, 
    _newValue: ModelParameterValue, 
    updatedParams: ModelParameters
  ): ModelParameters => {
    return updatedParams;
  };

  const handleParameterChange = (key: string, value: ModelParameterValue) => {
    let updated = { ...parameters, [key]: value };
    
    updated = autoCorrectDependencies(key, value, updated);
    
    setParameters(updated);
    onChange(updated);
  };

  if (!modelSchema?.properties) {
    return null;
  }

  const properties = modelSchema.properties;
  const required = modelSchema.required || [];

  const order = getFieldOrder(modelSchema);
  
  // Use allowedKeys if provided, otherwise use order
  const filteredKeys = allowedKeys 
    ? allowedKeys.filter(key => properties[key])
    : order.filter((key: string) => properties[key]);

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
