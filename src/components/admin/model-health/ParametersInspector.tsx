import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Download, Upload, RotateCcw } from "lucide-react";
import { ParameterMetadataCard } from "./ParameterMetadataCard";
import type { JsonSchema } from "@/types/schema";
import { useMemo, useState } from "react";

interface ParametersInspectorProps {
  schema: JsonSchema;
  originalSchema?: JsonSchema;
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
  onTogglePromptRenderer?: (enabled: boolean) => void;
  onToggleImageRenderer?: (enabled: boolean) => void;
  onToggleVoiceRenderer?: (enabled: boolean) => void;
  onToggleDurationRenderer?: (enabled: boolean) => void;
  onToggleIncrementRenderer?: (enabled: boolean) => void;
  onToggleOutputFormatRenderer?: (enabled: boolean) => void;
}

export const ParametersInspector = ({
  schema,
  originalSchema,
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
  onTogglePromptRenderer = () => {},
  onToggleImageRenderer = () => {},
  onToggleVoiceRenderer = () => {},
  onToggleDurationRenderer = () => {},
  onToggleIncrementRenderer = () => {},
  onToggleOutputFormatRenderer = () => {},
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
          <TabsList className="grid w-full grid-cols-5">
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
            <TabsTrigger value="renderers">
              Renderers
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
          <TabsContent value="renderers" className="mt-4">
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Renderer Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Control which fields use specialized renderers in the UI. Disabled renderers will fall back to generic schema inputs.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="space-y-0.5">
                    <Label htmlFor="prompt-renderer" className="text-sm font-medium">
                      Prompt Renderer
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Use specialized prompt input with character count and "Surprise Me"
                    </p>
                  </div>
                  <Switch
                    id="prompt-renderer"
                    checked={schema.usePromptRenderer ?? true}
                    onCheckedChange={onTogglePromptRenderer}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="space-y-0.5">
                    <Label htmlFor="image-renderer" className="text-sm font-medium">
                      Image Renderer
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Use specialized image upload UI with preview and camera support
                    </p>
                  </div>
                  <Switch
                    id="image-renderer"
                    checked={schema.useImageRenderer ?? true}
                    onCheckedChange={onToggleImageRenderer}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="space-y-0.5">
                    <Label htmlFor="voice-renderer" className="text-sm font-medium">
                      Voice Renderer
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Use specialized voice selector for ElevenLabs models
                    </p>
                  </div>
                  <Switch
                    id="voice-renderer"
                    checked={schema.useVoiceRenderer ?? false}
                    onCheckedChange={onToggleVoiceRenderer}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="space-y-0.5">
                    <Label htmlFor="duration-renderer" className="text-sm font-medium">
                      Duration Renderer
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Use specialized duration slider for audio/video length
                    </p>
                  </div>
                  <Switch
                    id="duration-renderer"
                    checked={schema.useDurationRenderer ?? false}
                    onCheckedChange={onToggleDurationRenderer}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="space-y-0.5">
                    <Label htmlFor="increment-renderer" className="text-sm font-medium">
                      Increment Renderer
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Use specialized toggle for "Continue from previous" functionality
                    </p>
                  </div>
                  <Switch
                    id="increment-renderer"
                    checked={schema.useIncrementRenderer ?? true}
                    onCheckedChange={onToggleIncrementRenderer}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="space-y-0.5">
                    <Label htmlFor="output-format-renderer" className="text-sm font-medium">
                      Output Format Renderer
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Use specialized selector for output format options
                    </p>
                  </div>
                  <Switch
                    id="output-format-renderer"
                    checked={schema.useOutputFormatRenderer ?? false}
                    onCheckedChange={onToggleOutputFormatRenderer}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
