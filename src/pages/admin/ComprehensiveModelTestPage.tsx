import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, RotateCcw, Play, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAllModels } from "@/hooks/useAllModels";
import { useModelByRecordId } from "@/hooks/useModels";
import { ParametersInspector } from "@/components/admin/model-health/ParametersInspector";
import { toast } from "sonner";
import { initializeParameters } from "@/types/model-schema";
import { supabase } from "@/integrations/supabase/client";

export default function ComprehensiveModelTestPage() {
  const navigate = useNavigate();
  const { data: allModels, isLoading: isLoadingModels } = useAllModels();
  
  const [selectedRecordId, setSelectedRecordId] = useState<string>("");
  const { data: selectedModel, refetch: refetchModel } = useModelByRecordId(selectedRecordId);
  
  const [customParameters, setCustomParameters] = useState<Record<string, any>>({});
  const [originalDefaults, setOriginalDefaults] = useState<Record<string, any>>({});
  const [documentationStatus, setDocumentationStatus] = useState<any>(null);
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [confirmPushDialog, setConfirmPushDialog] = useState<{
    show: boolean;
    paramName?: string;
    oldValue?: any;
    newValue?: any;
  }>({ show: false });

  // Fetch documentation status when model changes
  useEffect(() => {
    if (!selectedRecordId) {
      setDocumentationStatus(null);
      return;
    }

    const fetchDocumentation = async () => {
      const { data, error } = await supabase
        .from("model_documentation")
        .select("*")
        .eq("model_record_id", selectedRecordId)
        .maybeSingle();

      if (!error && data) {
        setDocumentationStatus(data);
      } else {
        setDocumentationStatus(null);
      }
    };

    fetchDocumentation();
  }, [selectedRecordId]);

  // Initialize parameters when model changes
  useEffect(() => {
    if (selectedModel?.input_schema) {
      const initialized = initializeParameters(
        selectedModel.input_schema as any,
        {}
      );
      setCustomParameters(initialized);
      
      // Store original defaults for comparison
      const defaults: Record<string, any> = {};
      const schema = selectedModel.input_schema as any;
      if (schema?.properties) {
        Object.keys(schema.properties).forEach(key => {
          defaults[key] = schema.properties[key].default;
        });
      }
      setOriginalDefaults(defaults);
    } else {
      setCustomParameters({});
      setOriginalDefaults({});
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

  const handleGenerateDocumentation = async () => {
    if (!selectedModel) return;

    setIsGeneratingDocs(true);
    try {
      const { error } = await supabase.functions.invoke("analyze-model-docs", {
        body: { modelRecordId: selectedModel.record_id },
      });

      if (error) throw error;

      toast.success("Documentation generated successfully");
      
      // Refetch documentation status
      const { data } = await supabase
        .from("model_documentation")
        .select("*")
        .eq("model_record_id", selectedRecordId)
        .maybeSingle();

      if (data) setDocumentationStatus(data);
    } catch (error: any) {
      console.error("Error generating documentation:", error);
      toast.error(error.message || "Failed to generate documentation");
    } finally {
      setIsGeneratingDocs(false);
    }
  };

  const getModifiedParameters = () => {
    const modified: string[] = [];
    Object.keys(customParameters).forEach(key => {
      if (customParameters[key] !== originalDefaults[key]) {
        modified.push(key);
      }
    });
    return modified;
  };

  const handlePushParameterToSchema = (paramName: string) => {
    setConfirmPushDialog({
      show: true,
      paramName,
      oldValue: originalDefaults[paramName],
      newValue: customParameters[paramName],
    });
  };

  const handleConfirmPushToSchema = async () => {
    if (!selectedModel || !confirmPushDialog.paramName) return;

    try {
      const schema = JSON.parse(JSON.stringify(selectedModel.input_schema));
      const paramName = confirmPushDialog.paramName;
      
      if (schema?.properties?.[paramName]) {
        schema.properties[paramName].default = customParameters[paramName];
      }

      const { error } = await supabase
        .from("ai_models")
        .update({ input_schema: schema })
        .eq("record_id", selectedModel.record_id);

      if (error) throw error;

      toast.success(`Updated default value for ${paramName}`);
      
      // Update original defaults
      setOriginalDefaults(prev => ({
        ...prev,
        [paramName]: customParameters[paramName],
      }));
      
      // Refetch model data
      refetchModel();
    } catch (error: any) {
      console.error("Error updating schema:", error);
      toast.error(error.message || "Failed to update schema");
    } finally {
      setConfirmPushDialog({ show: false });
    }
  };

  const handlePushAllToSchema = async () => {
    if (!selectedModel) return;

    const modified = getModifiedParameters();
    if (modified.length === 0) {
      toast.info("No modifications to push");
      return;
    }

    try {
      const schema = JSON.parse(JSON.stringify(selectedModel.input_schema));
      
      modified.forEach(paramName => {
        if (schema?.properties?.[paramName]) {
          schema.properties[paramName].default = customParameters[paramName];
        }
      });

      const { error } = await supabase
        .from("ai_models")
        .update({ input_schema: schema })
        .eq("record_id", selectedModel.record_id);

      if (error) throw error;

      toast.success(`Updated ${modified.length} parameter default(s)`);
      
      // Update original defaults
      const newDefaults = { ...originalDefaults };
      modified.forEach(key => {
        newDefaults[key] = customParameters[key];
      });
      setOriginalDefaults(newDefaults);
      
      // Refetch model data
      refetchModel();
    } catch (error: any) {
      console.error("Error updating schema:", error);
      toast.error(error.message || "Failed to update schema");
    }
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
          <Select
            value={selectedRecordId}
            onValueChange={setSelectedRecordId}
            disabled={isLoadingModels}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a model..." />
            </SelectTrigger>
            <SelectContent>
              {allModels?.map((model) => (
                <SelectItem key={model.record_id} value={model.record_id}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{model.provider}</span>
                    <span className="text-muted-foreground">-</span>
                    <span>{model.model_name}</span>
                    <Badge variant={model.is_active ? "default" : "secondary"} className="ml-2">
                      {model.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Model Details */}
      {selectedModel && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Model Details</CardTitle>
                  <CardDescription>
                    Configuration and metadata for the selected model
                  </CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">
                    {selectedModel.is_active ? "Active" : "Inactive"}
                  </Badge>
                  {documentationStatus && (
                    <Badge variant="secondary" className="gap-1">
                      <FileText className="h-3 w-3" />
                      Documentation: Updated {new Date(documentationStatus.updated_at).toLocaleDateString()}
                      {documentationStatus.analyzed_generations_count && 
                        ` (${documentationStatus.analyzed_generations_count} generations)`
                      }
                    </Badge>
                  )}
                  {!documentationStatus && selectedModel && (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      No Documentation
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Provider</div>
                  <div className="font-medium">{selectedModel.provider}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Model Name</div>
                  <div className="font-medium">{selectedModel.model_name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Content Type</div>
                  <div className="font-medium">{selectedModel.content_type}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">API Endpoint</div>
                  <div className="font-mono text-xs truncate">
                    {selectedModel.api_endpoint || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Payload Structure</div>
                  <div className="font-medium">{selectedModel.payload_structure}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Estimated Time</div>
                  <div className="font-medium">
                    {selectedModel.estimated_time_seconds
                      ? `${selectedModel.estimated_time_seconds}s`
                      : "N/A"}
                  </div>
                </div>
                {selectedModel.groups && (
                  <div className="col-span-full">
                    <div className="text-sm text-muted-foreground mb-1">Groups</div>
                    <div className="flex gap-1 flex-wrap">
                      {Object.entries(selectedModel.groups as Record<string, any>).map(
                        ([key, value]) => (
                          <Badge key={key} variant="outline">
                            {key}: {String(value)}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToDefaults}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportConfiguration}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Configuration
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateDocumentation}
              disabled={isGeneratingDocs}
            >
              {isGeneratingDocs ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Generate Documentation
            </Button>
            {documentationStatus && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDocumentation(true)}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Documentation
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleRunTest}
            >
              <Play className="h-4 w-4 mr-2" />
              Test Model
            </Button>
          </div>

          {/* Parameters Inspector */}
          {selectedModel.input_schema && (
            <ParametersInspector
              schema={selectedModel.input_schema as any}
              parameters={customParameters}
              onParameterChange={handleParameterChange}
              modifiedParameters={getModifiedParameters()}
              onPushParameterToSchema={handlePushParameterToSchema}
              onPushAllToSchema={handlePushAllToSchema}
            />
          )}
        </>
      )}

      {/* Push to Schema Confirmation Dialog */}
      <AlertDialog open={confirmPushDialog.show} onOpenChange={(open) => !open && setConfirmPushDialog({ show: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Schema Default Value?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the default value for <strong>{confirmPushDialog.paramName}</strong> in the model's schema.
              <div className="mt-4 space-y-2">
                <div className="flex gap-2 items-center">
                  <span className="text-muted-foreground">Old:</span>
                  <code className="px-2 py-1 bg-muted rounded text-sm">
                    {JSON.stringify(confirmPushDialog.oldValue)}
                  </code>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-muted-foreground">New:</span>
                  <code className="px-2 py-1 bg-muted rounded text-sm">
                    {JSON.stringify(confirmPushDialog.newValue)}
                  </code>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPushToSchema}>
              Update Schema
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Documentation Viewer Dialog */}
      <Dialog open={showDocumentation} onOpenChange={setShowDocumentation}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Model Documentation</DialogTitle>
            <DialogDescription>
              Generated from {documentationStatus?.analyzed_generations_count || 0} successful generations
            </DialogDescription>
          </DialogHeader>
          {documentationStatus && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Model:</span>{" "}
                  <span className="font-medium">{documentationStatus.model_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Provider:</span>{" "}
                  <span className="font-medium">{documentationStatus.provider}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Analyzed:</span>{" "}
                  <span className="font-medium">
                    {new Date(documentationStatus.last_analyzed_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Version:</span>{" "}
                  <span className="font-medium">{documentationStatus.documentation_version}</span>
                </div>
              </div>
              <div className="border-t pt-4">
                <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
                  {JSON.stringify(documentationStatus.documentation_data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
