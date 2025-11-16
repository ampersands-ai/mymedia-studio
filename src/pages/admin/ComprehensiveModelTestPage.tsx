import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, RotateCcw, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAllModels } from "@/hooks/useAllModels";
import { useModelByRecordId } from "@/hooks/useModels";
import { ParametersInspector } from "@/components/admin/model-health/ParametersInspector";
import { toast } from "sonner";
import { initializeParameters } from "@/types/model-schema";

export default function ComprehensiveModelTestPage() {
  const navigate = useNavigate();
  const { data: allModels, isLoading: isLoadingModels } = useAllModels();
  
  const [selectedRecordId, setSelectedRecordId] = useState<string>("");
  const { data: selectedModel } = useModelByRecordId(selectedRecordId);
  
  const [customParameters, setCustomParameters] = useState<Record<string, any>>({});

  // Initialize parameters when model changes
  useEffect(() => {
    if (selectedModel?.input_schema) {
      const initialized = initializeParameters(
        selectedModel.input_schema as any,
        {}
      );
      setCustomParameters(initialized);
    } else {
      setCustomParameters({});
    }
  }, [selectedModel]);

  const handleParameterChange = (name: string, value: any) => {
    setCustomParameters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleResetToDefaults = () => {
    if (selectedModel?.input_schema) {
      const initialized = initializeParameters(
        selectedModel.input_schema as any,
        {}
      );
      setCustomParameters(initialized);
      toast.success("Parameters reset to defaults");
    }
  };

  const handleExportConfiguration = () => {
    if (!selectedModel) return;

    const config = {
      model: {
        record_id: selectedModel.record_id,
        id: selectedModel.id,
        provider: selectedModel.provider,
        model_name: selectedModel.model_name,
        content_type: selectedModel.content_type,
      },
      parameters: customParameters,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `model-config-${selectedModel.id}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Configuration exported");
  };

  const handleRunTest = () => {
    if (!selectedModel) {
      toast.error("Please select a model first");
      return;
    }

    // Navigate to the actual test page with pre-configured parameters
    navigate(`/admin/model-health/test/${selectedModel.record_id}`);
    toast.info("Opening test page with selected model");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/model-health")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Model Health
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Comprehensive Model Testing</h1>
            <p className="text-muted-foreground">
              Test any model with complete parameter visibility and control
            </p>
          </div>
        </div>
      </div>

      {/* Model Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Model</CardTitle>
          <CardDescription>
            Choose any model (active or inactive) to inspect and test
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedRecordId} onValueChange={setSelectedRecordId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a model..." />
            </SelectTrigger>
            <SelectContent>
              {allModels?.map((model) => (
                <SelectItem key={model.record_id} value={model.record_id}>
                  <div className="flex items-center gap-2">
                    <span>{model.provider} / {model.model_name}</span>
                    {!model.is_active && (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedModel && (
        <>
          {/* Model Details */}
          <Card>
            <CardHeader>
              <CardTitle>Model Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Provider</div>
                <div className="font-semibold">{selectedModel.provider}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Model Name</div>
                <div className="font-semibold">{selectedModel.model_name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Content Type</div>
                <Badge>{selectedModel.content_type}</Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <Badge variant={selectedModel.is_active ? "default" : "secondary"}>
                  {selectedModel.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              {selectedModel.groups && (
                <div>
                  <div className="text-xs text-muted-foreground">Groups</div>
                  <div className="font-mono text-xs">
                    {JSON.stringify(selectedModel.groups)}
                  </div>
                </div>
              )}
              {selectedModel.api_endpoint && (
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">API Endpoint</div>
                  <div className="font-mono text-xs truncate">
                    {selectedModel.api_endpoint}
                  </div>
                </div>
              )}
              {selectedModel.payload_structure && (
                <div>
                  <div className="text-xs text-muted-foreground">Payload Structure</div>
                  <div className="font-mono text-xs">{selectedModel.payload_structure}</div>
                </div>
              )}
              {selectedModel.max_images !== null && (
                <div>
                  <div className="text-xs text-muted-foreground">Max Images</div>
                  <div className="font-semibold">{selectedModel.max_images}</div>
                </div>
              )}
              {selectedModel.estimated_time_seconds !== null && (
                <div>
                  <div className="text-xs text-muted-foreground">Estimated Time</div>
                  <div className="font-semibold">{selectedModel.estimated_time_seconds}s</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Parameters Inspector */}
          <ParametersInspector
            schema={selectedModel.input_schema}
            parameters={customParameters}
            onParameterChange={handleParameterChange}
          />

          <Separator />

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleRunTest}>
                  <Play className="h-4 w-4 mr-2" />
                  Test Model
                </Button>
                <Button variant="outline" onClick={handleResetToDefaults}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
                <Button variant="outline" onClick={handleExportConfiguration}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Configuration
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Click "Test Model" to open the full test page where you can provide prompts, upload images, and run the actual generation.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
