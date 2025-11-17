import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModelParameterForm } from "@/components/generation/ModelParameterForm";
import type { ModelParameters, ModelJsonSchema } from "@/types/model-schema";

interface AdvancedOptionsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelSchema: ModelJsonSchema | null;
  parameters: ModelParameters;
  onParametersChange: (params: ModelParameters) => void;
  excludeFields: string[];
  modelId: string;
  provider: string;
}

/**
 * Collapsible advanced options with ModelParameterForm
 */
export const AdvancedOptionsPanel: React.FC<AdvancedOptionsPanelProps> = ({
  open,
  onOpenChange,
  modelSchema,
  parameters,
  onParametersChange,
  excludeFields,
  modelId,
  provider,
}) => {
  // Type guard to check if modelSchema has properties
  if (!modelSchema?.properties) {
    return null;
  }

  // Check if there are any ADVANCED parameters specifically
  const advancedProperties = Object.keys(modelSchema.properties).filter(
    (key) => {
      const prop = modelSchema.properties![key];
      return prop.isAdvanced === true && !excludeFields.includes(key);
    }
  );

  // Only show Advanced Options if there are advanced parameters
  if (advancedProperties.length === 0) {
    return null;
  }

  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="space-y-2">
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between hover:bg-muted/50 transition-colors"
        >
          <span className="font-semibold">Advanced Options</span>
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              open && "rotate-90"
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-2">
        <div className="p-4 rounded-lg border border-border bg-muted/30">
          <ModelParameterForm
            modelSchema={modelSchema}
            onChange={onParametersChange}
            currentValues={parameters}
            excludeFields={excludeFields}
            modelId={modelId}
            provider={provider}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
