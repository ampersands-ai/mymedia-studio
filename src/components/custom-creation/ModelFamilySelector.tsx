import { useState, useEffect, useMemo } from "react";
import { AIModel } from "@/hooks/useModels";
import { CreationGroup } from "@/constants/creation-groups";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Coins, Clock, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelFamilySelectorProps {
  models: AIModel[];
  selectedModel: string | null;
  onModelChange: (modelId: string) => void;
  selectedGroup: CreationGroup;
  isLoading: boolean;
}

export const ModelFamilySelector: React.FC<ModelFamilySelectorProps> = ({
  models,
  selectedModel,
  onModelChange,
  selectedGroup,
  isLoading,
}) => {
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);

  // Group models by family
  const modelsByFamily = useMemo(() => {
    const grouped: Record<string, AIModel[]> = {};
    models.forEach(model => {
      const family = model.model_family || 'Other';
      if (!grouped[family]) grouped[family] = [];
      grouped[family].push(model);
    });
    
    // Sort models within each family by display_order_in_family
    Object.keys(grouped).forEach(family => {
      grouped[family].sort((a, b) => 
        (a.display_order_in_family || 0) - (b.display_order_in_family || 0)
      );
    });
    
    return grouped;
  }, [models]);

  // Get family of currently selected model
  const currentModel = models.find(m => m.record_id === selectedModel);
  
  // Initialize family from selected model or first available family (only once)
  useEffect(() => {
    if (selectedFamily) return; // Don't change if already set
    
    if (currentModel?.model_family) {
      setSelectedFamily(currentModel.model_family);
    } else if (Object.keys(modelsByFamily).length > 0 && !selectedModel) {
      // Only set first family if there's no model selected at all
      const firstFamily = Object.keys(modelsByFamily).sort()[0];
      setSelectedFamily(firstFamily);
    }
  }, [currentModel?.model_family, modelsByFamily, selectedModel, selectedFamily]);

  // Update family when selected model changes to a different family
  useEffect(() => {
    if (currentModel?.model_family && currentModel.model_family !== selectedFamily) {
      setSelectedFamily(currentModel.model_family);
    }
  }, [currentModel?.model_family, selectedFamily]);

  const handleFamilyChange = (family: string) => {
    setSelectedFamily(family);
    // Auto-select first model in new family
    if (modelsByFamily[family] && modelsByFamily[family].length > 0) {
      onModelChange(modelsByFamily[family][0].record_id);
    }
  };

  const variantsInSelectedFamily = selectedFamily ? modelsByFamily[selectedFamily] || [] : [];

  // Get logo from first model in family
  const getFamilyLogo = (family: string) => {
    const firstModel = modelsByFamily[family]?.[0];
    return firstModel?.logo_url;
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="h-24 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Family Selector */}
      <div className="space-y-2">
        <Label>Model Family</Label>
        <Select value={selectedFamily || undefined} onValueChange={handleFamilyChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a model family" />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(modelsByFamily).sort().map((family) => {
              const logo = getFamilyLogo(family);
              const count = modelsByFamily[family].length;
              return (
                <SelectItem key={family} value={family}>
                  <div className="flex items-center gap-2">
                    {logo && (
                      <div className="h-5 w-5 rounded bg-white/90 dark:bg-white/95 p-0.5 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <img 
                          src={logo} 
                          alt={family} 
                          className="h-full w-full object-contain"
                        />
                      </div>
                    )}
                    <span>{family}</span>
                    <span className="text-xs text-muted-foreground">({count} variant{count !== 1 ? 's' : ''})</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Variant Cards */}
      {selectedFamily && variantsInSelectedFamily.length > 0 && (
        <div className="space-y-2">
          <Label>Select Variant</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {variantsInSelectedFamily.map((model) => {
              const isSelected = model.record_id === selectedModel;
              const variantName = model.variant_name || model.model_name;
              const cost = model.base_token_cost;
              const duration = model.estimated_time_seconds;
              const outputs = model.default_outputs || 1;

              return (
                <button
                  key={model.record_id}
                  onClick={() => onModelChange(model.record_id)}
                  className={cn(
                    "relative p-4 rounded-lg border-2 transition-all text-left",
                    "hover:shadow-md hover:-translate-y-0.5",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-primary/50"
                  )}
                >
                  {/* Checkmark for selected */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  {/* Variant Name */}
                  <div className="font-semibold mb-3 pr-6">{variantName}</div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {/* Cost Badge */}
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent/50 text-accent-foreground">
                      <Coins className="w-3 h-3" />
                      <span>{cost}</span>
                    </div>

                    {/* Duration Badge */}
                    {duration && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>~{duration}s</span>
                      </div>
                    )}

                    {/* Outputs Badge */}
                    {outputs > 1 && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        <ImageIcon className="w-3 h-3" />
                        <span>×{outputs}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {selectedFamily && variantsInSelectedFamily.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No models available in this family for the selected content type.
        </div>
      )}
    </div>
  );
};
