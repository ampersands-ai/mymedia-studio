import { useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useModels } from "@/hooks/useModels";
import { useModelSchema } from "@/hooks/useModelSchema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExecutionFlowVisualizer } from "@/components/admin/model-tester/ExecutionFlowVisualizer";
import { ExecutionTracker } from "@/lib/admin/executionTracker";
import { getModel } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import { getGenerationType } from "@/lib/models/registry";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { toast } from "sonner";
import { Play, RefreshCw, FileText, Layers } from "lucide-react";
import type { ExecutionFlow } from "@/lib/admin/executionTracker";
import { initializeParameters } from "@/types/model-schema";

const ComprehensiveModelTester = () => {
  const { user } = useAuth();
  const { data: allModels, isLoading: modelsLoading } = useModels();

  // State
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [modelParameters, setModelParameters] = useState<Record<string, any>>({});
  const [executionFlow, setExecutionFlow] = useState<ExecutionFlow | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Get selected model
  const selectedModel = useMemo(
    () => allModels?.find(m => m.record_id === selectedModelId),
    [allModels, selectedModelId]
  );

  // Get model schema
  const { schema: modelSchema, loading: schemaLoading } = useModelSchema(
    selectedModel as any || null
  );

  // Initialize parameters when model or schema changes
  const handleModelChange = useCallback(
    (modelId: string) => {
      setSelectedModelId(modelId);
      setPrompt("");
      setModelParameters({});
      setExecutionFlow(null);

      // Load schema and initialize parameters
      const model = allModels?.find(m => m.record_id === modelId);
      if (model) {
        // Parameters will be initialized via useEffect when schema loads
      }
    },
    [allModels]
  );

  // Initialize parameters when schema is loaded
  useState(() => {
    if (modelSchema && selectedModel) {
      const initialized = initializeParameters(modelSchema, {});
      setModelParameters(initialized);
    }
  });

  /**
   * Instrumented Execution Engine
   * Executes the model with full step-by-step tracking
   */
  const executeWithInstrumentation = useCallback(async () => {
    if (!selectedModel || !user) {
      toast.error("Please select a model and ensure you're logged in");
      return;
    }

    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsExecuting(true);
    const tracker = new ExecutionTracker(
      selectedModel.record_id,
      selectedModel.model_name,
      user.id
    );

    // Subscribe to tracker updates
    const unsubscribe = tracker.subscribe((flow) => {
      setExecutionFlow({ ...flow });
    });

    try {
      // ====== STEP 1: Load Model from Registry ======
      const step1 = tracker.addStep({
        stepName: "Load Model from Registry",
        description: "Retrieve model module from the registry using record ID",
        functionPath: "src/lib/models/registry.ts",
        functionName: "getModel",
        inputs: { recordId: selectedModel.record_id },
        canEdit: false,
        canRerun: false,
      });

      tracker.startStep(step1.id);
      let modelModule: any;
      try {
        modelModule = getModel(selectedModel.record_id);
        tracker.completeStep(step1.id, {
          modelLoaded: true,
          modelName: modelModule.MODEL_CONFIG.modelName,
          provider: modelModule.MODEL_CONFIG.provider,
          contentType: modelModule.MODEL_CONFIG.contentType,
        });
      } catch (error) {
        tracker.failStep(step1.id, error instanceof Error ? error.message : String(error));
        throw error;
      }

      // ====== STEP 2: Prepare Inputs ======
      const step2 = tracker.addStep({
        stepName: "Prepare Inputs",
        description: "Merge prompt with model parameters",
        functionPath: selectedModel.is_locked
          ? `src/lib/models/locked/${selectedModel.content_type}/${selectedModel.model_name.replace(/\s+/g, '_')}.ts`
          : "inline",
        functionName: "prepareInputs",
        inputs: { prompt, modelParameters },
        canEdit: true,
        canRerun: true,
      });

      tracker.startStep(step2.id);
      const inputs = { ...modelParameters, prompt, positivePrompt: prompt };
      tracker.completeStep(step2.id, { mergedInputs: inputs });

      // ====== STEP 3: Validate Inputs ======
      const step3 = tracker.addStep({
        stepName: "Validate Inputs",
        description: "Validate input parameters against model schema",
        functionPath: selectedModel.is_locked
          ? `src/lib/models/locked/${selectedModel.content_type}/${selectedModel.model_name.replace(/\s+/g, '_')}.ts`
          : "inline",
        functionName: "validate",
        inputs: { inputs },
        canEdit: false,
        canRerun: true,
      });

      tracker.startStep(step3.id);
      if (modelModule.validate) {
        const validation = modelModule.validate(inputs);
        if (!validation.valid) {
          tracker.failStep(step3.id, validation.error || "Validation failed");
          toast.error("Validation failed: " + validation.error);
          return;
        }
        tracker.completeStep(step3.id, { valid: true, validation });
      } else {
        tracker.completeStep(step3.id, { valid: true, message: "No validation function" });
      }

      // ====== STEP 4: Calculate Cost ======
      const step4 = tracker.addStep({
        stepName: "Calculate Cost",
        description: "Calculate credit cost for this generation",
        functionPath: selectedModel.is_locked
          ? `src/lib/models/locked/${selectedModel.content_type}/${selectedModel.model_name.replace(/\s+/g, '_')}.ts`
          : "inline",
        functionName: "calculateCost",
        inputs: { inputs },
        canEdit: false,
        canRerun: true,
      });

      tracker.startStep(step4.id);
      let cost = selectedModel.base_token_cost;
      if (modelModule.calculateCost) {
        cost = modelModule.calculateCost(inputs);
      }
      tracker.completeStep(step4.id, { cost, credits: cost });

      // ====== STEP 5: Reserve Credits ======
      const step5 = tracker.addStep({
        stepName: "Reserve Credits",
        description: "Deduct credits from user account",
        functionPath: "src/lib/models/creditDeduction.ts",
        functionName: "reserveCredits",
        inputs: { userId: user.id, cost },
        canEdit: false,
        canRerun: false,
      });

      tracker.startStep(step5.id);
      try {
        await reserveCredits(user.id, cost);
        tracker.completeStep(step5.id, { creditsReserved: cost, success: true });
      } catch (error) {
        tracker.failStep(step5.id, error instanceof Error ? error.message : String(error));
        throw error;
      }

      // ====== STEP 6: Create Generation Record ======
      const step6 = tracker.addStep({
        stepName: "Create Generation Record",
        description: "Insert generation record into database",
        functionPath: "supabase/tables/generations",
        functionName: "insert",
        inputs: {
          user_id: user.id,
          model_id: selectedModel.model_id,
          model_record_id: selectedModel.record_id,
          type: getGenerationType(selectedModel.content_type),
          prompt,
          tokens_used: cost,
          status: "pending",
          settings: modelParameters,
        },
        canEdit: true,
        canRerun: false,
      });

      tracker.startStep(step6.id);
      const { data: gen, error: genError } = await supabase
        .from("generations")
        .insert({
          user_id: user.id,
          model_id: selectedModel.model_id,
          model_record_id: selectedModel.record_id,
          type: getGenerationType(selectedModel.content_type),
          prompt,
          tokens_used: cost,
          status: "pending",
          settings: modelParameters,
        })
        .select()
        .single();

      if (genError || !gen) {
        tracker.failStep(step6.id, genError?.message || "Failed to create generation");
        throw new Error(genError?.message || "Failed to create generation");
      }

      tracker.setGenerationId(gen.id);
      tracker.completeStep(step6.id, { generationId: gen.id, generation: gen });

      // ====== STEP 7: Prepare Payload ======
      const step7 = tracker.addStep({
        stepName: "Prepare API Payload",
        description: "Structure payload for API provider",
        functionPath: selectedModel.is_locked
          ? `src/lib/models/locked/${selectedModel.content_type}/${selectedModel.model_name.replace(/\s+/g, '_')}.ts`
          : "inline",
        functionName: "preparePayload",
        inputs: { inputs },
        canEdit: true,
        canRerun: true,
      });

      tracker.startStep(step7.id);
      let payload: any = {};
      if (modelModule.preparePayload) {
        payload = modelModule.preparePayload(inputs);
      } else {
        payload = inputs;
      }
      tracker.completeStep(step7.id, { payload }, {
        apiEndpoint: modelModule.MODEL_CONFIG.apiEndpoint,
        provider: modelModule.MODEL_CONFIG.provider,
      });

      // ====== STEP 8: Call Edge Function ======
      const step8 = tracker.addStep({
        stepName: "Call Edge Function",
        description: "Invoke generate-content edge function",
        functionPath: "supabase/functions/generate-content/index.ts",
        functionName: "invoke",
        inputs: {
          generationId: gen.id,
          model_config: modelModule.MODEL_CONFIG,
          model_schema: modelModule.SCHEMA,
          prompt: inputs.positivePrompt || prompt,
          custom_parameters: payload,
        },
        canEdit: true,
        canRerun: true,
      });

      tracker.startStep(step8.id);
      const { data: edgeData, error: funcError } = await supabase.functions.invoke(
        "generate-content",
        {
          body: {
            generationId: gen.id,
            model_config: modelModule.MODEL_CONFIG,
            model_schema: modelModule.SCHEMA,
            prompt: inputs.positivePrompt || prompt,
            custom_parameters: payload,
          },
        }
      );

      if (funcError) {
        tracker.failStep(step8.id, funcError.message);
        await supabase
          .from("generations")
          .update({ status: "failed" })
          .eq("id", gen.id);
        throw new Error(`Edge function failed: ${funcError.message}`);
      }

      tracker.completeStep(step8.id, {
        success: true,
        response: edgeData,
        message: "Edge function invoked successfully",
      });

      // ====== STEP 9: Start Polling ======
      const step9 = tracker.addStep({
        stepName: "Start Polling",
        description: "Monitor generation status via polling",
        functionPath: "src/hooks/useHybridGenerationPolling.ts",
        functionName: "startPolling",
        inputs: { generationId: gen.id },
        canEdit: false,
        canRerun: false,
      });

      tracker.startStep(step9.id);
      tracker.completeStep(step9.id, {
        pollingStarted: true,
        generationId: gen.id,
        message: "Polling will continue in background. Check generation history for results.",
      });

      // Complete execution
      tracker.complete();
      toast.success("Execution complete! Check History for results.", {
        description: `Generation ID: ${gen.id}`,
        action: {
          label: "View History",
          onClick: () => window.location.href = "/dashboard/history",
        },
      });

    } catch (error) {
      console.error("Execution failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Execution failed"
      );
    } finally {
      setIsExecuting(false);
      unsubscribe();
    }
  }, [selectedModel, user, prompt, modelParameters]);

  /**
   * Handle editing a step
   */
  const handleEditStep = useCallback(
    (stepId: string, newInputs: Record<string, any>) => {
      if (!executionFlow) return;

      // Update the step inputs
      const updatedSteps = executionFlow.steps.map(step =>
        step.id === stepId
          ? { ...step, inputs: newInputs, status: 'edited' as const }
          : step
      );

      setExecutionFlow({
        ...executionFlow,
        steps: updatedSteps,
      });

      toast.success("Step inputs updated. Click 'Rerun from this step' to execute.");
    },
    [executionFlow]
  );

  /**
   * Handle rerunning from a specific step
   */
  const handleRerunFromStep = useCallback(
    (stepId: string) => {
      toast.info("Rerun functionality coming soon!", {
        description: "This will re-execute from the selected step forward.",
      });
    },
    []
  );

  /**
   * Render model parameter inputs
   */
  const renderParameterInputs = () => {
    if (!modelSchema || !modelSchema.properties) return null;

    const properties = modelSchema.properties;

    return (
      <div className="space-y-3">
        {Object.entries(properties).map(([key, prop]: [string, any]) => {
          // Skip prompt field (handled separately)
          if (key === 'prompt' || key === 'positivePrompt') return null;

          const value = modelParameters[key];

          return (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key} className="text-sm">
                {prop.title || key}
                {prop.description && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {prop.description}
                  </span>
                )}
              </Label>

              {prop.enum ? (
                <Select
                  value={value}
                  onValueChange={(val) =>
                    setModelParameters(prev => ({ ...prev, [key]: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {prop.enum.map((option: string) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : prop.type === 'number' || prop.type === 'integer' ? (
                <Input
                  id={key}
                  type="number"
                  value={value ?? prop.default ?? ''}
                  onChange={(e) =>
                    setModelParameters(prev => ({
                      ...prev,
                      [key]: parseFloat(e.target.value),
                    }))
                  }
                  min={prop.minimum}
                  max={prop.maximum}
                />
              ) : prop.type === 'boolean' ? (
                <Select
                  value={String(value ?? prop.default ?? false)}
                  onValueChange={(val) =>
                    setModelParameters(prev => ({ ...prev, [key]: val === 'true' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={key}
                  type="text"
                  value={value ?? prop.default ?? ''}
                  onChange={(e) =>
                    setModelParameters(prev => ({ ...prev, [key]: e.target.value }))
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Layers className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Comprehensive Model Tester</h1>
        </div>
        <p className="text-muted-foreground">
          Test any model with complete transparency into execution flow, payloads, and responses
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Input */}
        <div className="space-y-6">
          {/* Model Selection */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Model Selection</h2>
                <Badge variant="secondary">
                  {allModels?.length || 0} models
                </Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model-select">Select Model</Label>
                <Select
                  value={selectedModelId}
                  onValueChange={handleModelChange}
                  disabled={modelsLoading}
                >
                  <SelectTrigger id="model-select">
                    <SelectValue placeholder="Choose a model to test..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allModels?.map(model => (
                      <SelectItem key={model.record_id} value={model.record_id}>
                        <div className="flex items-center gap-2">
                          <span>{model.model_name}</span>
                          {!model.is_active && (
                            <Badge variant="destructive" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                          {model.is_locked && (
                            <Badge variant="outline" className="text-xs">
                              Locked
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedModel && (
                <div className="pt-3 border-t space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provider:</span>
                    <span className="font-medium">{selectedModel.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">{selectedModel.content_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost:</span>
                    <span className="font-medium">
                      {selectedModel.base_token_cost} credits
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Input Parameters */}
          {selectedModel && (
            <Card className="p-6">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Input Parameters
                </h2>

                <div className="space-y-4">
                  {/* Prompt */}
                  <div className="space-y-2">
                    <Label htmlFor="prompt">Prompt</Label>
                    <Textarea
                      id="prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Enter your prompt here..."
                      rows={4}
                    />
                  </div>

                  {/* Model-specific parameters */}
                  {!schemaLoading && renderParameterInputs()}
                </div>

                {/* Execute Button */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={executeWithInstrumentation}
                  disabled={isExecuting || !prompt.trim() || !selectedModel}
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      Execute with Full Tracking
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Right Panel: Execution Flow */}
        <div>
          <Card className="p-6 h-full">
            {executionFlow ? (
              <ExecutionFlowVisualizer
                flow={executionFlow}
                onEditStep={handleEditStep}
                onRerunFromStep={handleRerunFromStep}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Layers className="h-16 w-16 text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Execution Yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Select a model and execute to see the complete execution flow with
                  full transparency into each step.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveModelTester;
