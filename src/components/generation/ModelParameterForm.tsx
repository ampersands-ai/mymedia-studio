import { useMemo } from "react";
import { SchemaInput } from "./SchemaInput";
import type {
  ModelParameters,
  JsonSchemaProperty,
  ModelParameterValue,
  ModelJsonSchema,
} from "@/types/model-schema";
import {
  toModelJsonSchema,
  getSchemaProperty,
  getFieldOrder,
  initializeParameters,
  getFilteredEnum,
} from "@/types/model-schema";

interface ModelParameterFormProps {
  modelSchema: unknown;
  onChange: (params: ModelParameters) => void;
  currentValues?: ModelParameters;
  allowedKeys?: string[];
  modelId?: string;
  provider?: string;
}

/**
 * Controlled form for model parameters.
 *
 * Important: this component must NOT push defaults upstream during render/mount,
 * because that can fight user input (e.g. sliders) and trigger React warnings.
 * The parent is responsible for initializing defaults.
 */
export const ModelParameterForm = ({
  modelSchema: modelSchemaProp,
  onChange,
  currentValues = {},
  allowedKeys,
  modelId,
  provider,
}: ModelParameterFormProps) => {
  const modelSchema = toModelJsonSchema(modelSchemaProp);

  const parameters: ModelParameters = useMemo(() => {
    const initialized = initializeParameters(modelSchema, currentValues);

    // Rehydrate enums / empty values to schema defaults (UI safety)
    if (!modelSchema?.properties) return initialized;

    const rehydrated: ModelParameters = { ...initialized };
    Object.entries(modelSchema.properties).forEach(([key, schemaProp]) => {
      if (!schemaProp) return;
      const schema = schemaProp as JsonSchemaProperty;
      const val = currentValues[key];

      const enumValues = Array.isArray(schema.enum)
        ? (schema.enum as readonly unknown[])
        : null;
      const isEnumValueValid = !enumValues || enumValues.includes(val as unknown);

      if ((val === "" || val === undefined || val === null) && schema.default !== undefined) {
        rehydrated[key] = schema.default as ModelParameterValue;
      } else if (!isEnumValueValid && schema.default !== undefined) {
        rehydrated[key] = schema.default as ModelParameterValue;
      } else if (val !== undefined) {
        rehydrated[key] = val;
      }
    });

    return rehydrated;
  }, [modelSchema, currentValues]);

  const autoCorrectDependencies = (
    _changedField: string,
    _newValue: ModelParameterValue,
    updatedParams: ModelParameters
  ): ModelParameters => {
    return updatedParams;
  };

  const handleParameterChange = (key: string, value: ModelParameterValue) => {
    const updated = autoCorrectDependencies(key, value, { ...parameters, [key]: value });
    onChange(updated);
  };

  if (!modelSchema?.properties) {
    return null;
  }

  const properties = modelSchema.properties;
  const required = modelSchema.required || [];

  const order = getFieldOrder(modelSchema as ModelJsonSchema);

  // Use allowedKeys if provided, otherwise use order
  const filteredKeys = allowedKeys
    ? allowedKeys.filter((key) => properties[key])
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
            onParameterChange={handleParameterChange}
          />
        );
      })}
    </div>
  );
};
