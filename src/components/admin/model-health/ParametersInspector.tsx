import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ParameterMetadataCard } from "./ParameterMetadataCard";
import { Eye, EyeOff, Settings2, List } from "lucide-react";

interface ParametersInspectorProps {
  schema: any;
  parameters: Record<string, any>;
  onParameterChange: (name: string, value: any) => void;
  modifiedParameters?: string[];
  onPushParameterToSchema?: (paramName: string) => void;
  onPushAllToSchema?: () => void;
  onToggleAdvanced?: (paramName: string) => void;
}

export const ParametersInspector = ({
  schema,
  parameters,
  onParameterChange,
  modifiedParameters = [],
  onPushParameterToSchema,
  onPushAllToSchema,
  onToggleAdvanced,
}: ParametersInspectorProps) => {
  if (!schema?.properties) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Parameters</CardTitle>
          <CardDescription>This model has no configurable parameters</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const properties = schema.properties;
  const required = schema.required || [];

  // Categorize parameters
  const userVisible: string[] = [];
  const advanced: string[] = [];
  const backendOnly: string[] = [];
  const allParams: string[] = [];

  Object.keys(properties).forEach((key) => {
    const prop = properties[key];
    const showToUser = prop.showToUser !== false;
    const isAdvanced = prop.isAdvanced === true;

    allParams.push(key);

    if (!showToUser) {
      backendOnly.push(key);
    } else if (isAdvanced) {
      advanced.push(key);
    } else {
      userVisible.push(key);
    }
  });

  const renderParameterCards = (paramKeys: string[]) => {
    if (paramKeys.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No parameters in this category
        </div>
      );
    }

    return (
      <div className="grid gap-4">
        {paramKeys.map((key) => (
          <ParameterMetadataCard
            key={key}
            name={key}
            schema={properties[key]}
            value={parameters[key]}
            onChange={onParameterChange}
            isRequired={required.includes(key)}
            showToUser={properties[key].showToUser !== false}
            isAdvanced={properties[key].isAdvanced === true}
            isModified={modifiedParameters.includes(key)}
            onPushToSchema={onPushParameterToSchema ? () => onPushParameterToSchema(key) : undefined}
            onToggleAdvanced={onToggleAdvanced ? () => onToggleAdvanced(key) : undefined}
          />
        ))}
      </div>
    );
  };

  const stats = {
    total: allParams.length,
    required: required.length,
    userVisible: userVisible.length,
    advanced: advanced.length,
    backendOnly: backendOnly.length,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parameters Inspector</CardTitle>
        <CardDescription>
          View and edit all model parameters with complete metadata
        </CardDescription>
        <div className="flex gap-2 flex-wrap pt-2 items-center">
          <Badge variant="outline" className="gap-1">
            <List className="h-3 w-3" />
            {stats.total} Total
          </Badge>
          <Badge variant="destructive" className="gap-1">
            {stats.required} Required
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Eye className="h-3 w-3" />
            {stats.userVisible} User Visible
          </Badge>
          <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-700">
            <Settings2 className="h-3 w-3" />
            {stats.advanced} Advanced
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <EyeOff className="h-3 w-3" />
            {stats.backendOnly} Backend Only
          </Badge>
          {modifiedParameters.length > 0 && (
            <>
              <Badge variant="default" className="gap-1 bg-orange-500 hover:bg-orange-600">
                {modifiedParameters.length} Modified
              </Badge>
              {onPushAllToSchema && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onPushAllToSchema}
                  className="ml-auto"
                >
                  Push All to Schema
                </Button>
              )}
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="user-visible" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="user-visible" className="gap-1">
              <Eye className="h-3 w-3" />
              User ({userVisible.length})
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-1">
              <Settings2 className="h-3 w-3" />
              Advanced ({advanced.length})
            </TabsTrigger>
            <TabsTrigger value="backend" className="gap-1">
              <EyeOff className="h-3 w-3" />
              Backend ({backendOnly.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-1">
              <List className="h-3 w-3" />
              All ({allParams.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="user-visible" className="mt-4">
            {renderParameterCards(userVisible)}
          </TabsContent>

          <TabsContent value="advanced" className="mt-4">
            {renderParameterCards(advanced)}
          </TabsContent>

          <TabsContent value="backend" className="mt-4">
            {renderParameterCards(backendOnly)}
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            {renderParameterCards(allParams)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
