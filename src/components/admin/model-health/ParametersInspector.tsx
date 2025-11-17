import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Upload, RotateCcw } from "lucide-react";
import { ParameterMetadataCard } from "./ParameterMetadataCard";
import type { JsonSchema } from "@/types/schema";
import { useMemo, useState } from "react";

interface ParametersInspectorProps {
  schema: JsonSchema;
  originalSchema?: JsonSchema;  // NEW: for comparing modifications
  currentValues: Record<string, any>;
  onValueChange: (name: string, value: any) => void;
  onPushToSchema: (name: string, value: any) => void;
  onToggleAdvanced: (name: string, currentState: boolean) => void;
  onToggleHidden?: (name: string, currentState: boolean) => void;
  onToggleRequired?: (name: string, currentState: boolean) => void;
  onPushAllToSchema: () => void;
  imageFields?: string[];
  onToggleImageField?: (name: string) => void;
  onRevertToDefault?: () => void;
}

export const ParametersInspector = ({
  schema,
  originalSchema,  // NEW
  currentValues,
  onValueChange,
  onPushToSchema,
  onToggleAdvanced,
  onToggleHidden = () => {},
  onToggleRequired = () => {},
  onPushAllToSchema,
  imageFields = [],
  onToggleImageField = () => {},
  onRevertToDefault,
}: ParametersInspectorProps) => {
  const [activeTab, setActiveTab] = useState('all');

  const { userVisible, advanced, backendOnly, allParams, modifiedCount } = useMemo(() => {
    const properties = schema.properties || {};
    const required = schema.required || [];

    const all: Array<{ name: string; schema: any; isRequired: boolean }> = [];
    const visible: typeof all = [];
    const adv: typeof all = [];
    const backend: typeof all = [];
    let modified = 0;

    Object.entries(properties).forEach(([name, propSchema]) => {
      const isRequired = required.includes(name);
      const item = { name, schema: propSchema, isRequired };
      
      const currentValue = currentValues[name];
      // Compare against original schema if available, otherwise current schema
      const originalDefault = originalSchema?.properties?.[name]?.default;
      const compareValue = originalDefault !== undefined ? originalDefault : propSchema.default;
      
      if (JSON.stringify(currentValue) !== JSON.stringify(compareValue)) {
        modified++;
      }

      all.push(item);

      if (propSchema.showToUser === false) {
        backend.push(item);
      } else if (propSchema.isAdvanced === true) {
        adv.push(item);
      } else {
        visible.push(item);
      }
    });

    return {
      userVisible: visible,
      advanced: adv,
      backendOnly: backend,
      allParams: all,
      modifiedCount: modified,
    };
  }, [schema, originalSchema, currentValues]);

  const exportConfiguration = () => {
    const config = {
      schema,
      currentValues,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderParameterList = (params: Array<{ name: string; schema: any; isRequired: boolean }>) => {
    if (params.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-8">No parameters in this category</p>;
    }

    return (
      <div className="space-y-4">
        {params.map(({ name, schema: paramSchema, isRequired }) => {
          const currentValue = currentValues[name];
          // Compare against original schema if available
          const originalDefault = originalSchema?.properties?.[name]?.default;
          const compareValue = originalDefault !== undefined ? originalDefault : paramSchema.default;
          const isModified = JSON.stringify(currentValue) !== JSON.stringify(compareValue);

          return (
            <ParameterMetadataCard
              key={name}
              name={name}
              schema={paramSchema}
              value={currentValue}
              defaultValue={paramSchema.default}
              isRequired={isRequired}
              isModified={isModified}
              onValueChange={onValueChange}
              onPushToSchema={onPushToSchema}
              onToggleAdvanced={onToggleAdvanced}
              onToggleHidden={onToggleHidden}
              onToggleRequired={onToggleRequired}
              onToggleImageField={onToggleImageField}
              isImageField={imageFields.includes(name)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Parameter Inspector</CardTitle>
            <CardDescription>
              Complete visibility of all model parameters with live editing
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {modifiedCount > 0 && (
              <>
                <Badge variant="destructive">{modifiedCount} Modified</Badge>
                {onRevertToDefault && (
                  <Button size="sm" variant="outline" onClick={onRevertToDefault}>
                    <RotateCcw className="h-3 w-3 mr-2" />
                    Revert All
                  </Button>
                )}
                <Button size="sm" onClick={onPushAllToSchema}>
                  <Upload className="h-3 w-3 mr-2" />
                  Push All to Schema
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={exportConfiguration}>
              <Download className="h-3 w-3 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              All ({allParams.length})
            </TabsTrigger>
            <TabsTrigger value="visible">
              User Visible ({userVisible.length})
            </TabsTrigger>
            <TabsTrigger value="advanced">
              Advanced ({advanced.length})
            </TabsTrigger>
            <TabsTrigger value="backend">
              Backend Only ({backendOnly.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            {renderParameterList(allParams)}
          </TabsContent>
          <TabsContent value="visible" className="mt-4">
            {renderParameterList(userVisible)}
          </TabsContent>
          <TabsContent value="advanced" className="mt-4">
            {renderParameterList(advanced)}
          </TabsContent>
          <TabsContent value="backend" className="mt-4">
            {renderParameterList(backendOnly)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
