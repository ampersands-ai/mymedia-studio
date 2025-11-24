import { useState, useCallback, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useModels } from "@/hooks/useModels";
import { useModelSchema } from "@/hooks/useModelSchema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Separator } from "@/components/ui/separator";
import { ExecutionFlowVisualizer } from "@/components/admin/model-tester/ExecutionFlowVisualizer";
import { ExecutionControlPanel } from "@/components/admin/model-tester/ExecutionControlPanel";
import { LogStreamViewer } from "@/components/admin/model-tester/LogStreamViewer";
import { CodeViewer } from "@/components/admin/model-tester/CodeViewer";
import { TestRunHistoryBrowser } from "@/components/admin/model-tester/TestRunHistoryBrowser";
import { ImportReplayDialog } from "@/components/admin/model-tester/ImportReplayDialog";
import { PerformanceMetricsDashboard } from "@/components/admin/model-tester/PerformanceMetricsDashboard";
import { ComparisonViewer } from "@/components/admin/model-tester/ComparisonViewer";
import { KeyboardShortcutsDialog } from "@/components/admin/model-tester/KeyboardShortcutsDialog";
import { useKeyboardShortcuts, formatShortcut } from "@/hooks/useKeyboardShortcuts";
import {
  EnhancedExecutionTracker,
  createStepConfig,
  type ExecutionFlow,
} from "@/lib/admin/enhancedExecutionTracker";
import { getModel } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import { getGenerationType } from "@/lib/models/registry";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { toast } from "sonner";
import {
  Layers,
  Play,
  Download,
  Upload,
  History,
  Bookmark,
  FileCode2,
  Terminal,
} from "lucide-react";
import { initializeParameters } from "@/types/model-schema";
import { loadModelSourceCode, getModelFilePath } from "@/lib/admin/codeAnalysis";
import {
  EXECUTION_CONTEXT,
  STEP_TYPE,
  GENERATION_STATUS,
  TEST_MODE_CONFIG,
} from "@/constants/execution-constants";

const ComprehensiveModelTester = () => {
  const { user } = useAuth();
  const { data: allModels, isLoading: modelsLoading } = useModels();

  // State
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [modelParameters, setModelParameters] = useState<Record<string, any>>({});
  const [executionFlow, setExecutionFlow] = useState<ExecutionFlow | null>(null);
  const [tracker, setTracker] = useState<EnhancedExecutionTracker | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState("flow");
  const [showInactiveModels, setShowInactiveModels] = useState(true);

  // Phase 3 Advanced Features State
  const [showHistoryBrowser, setShowHistoryBrowser] = useState(false);
  const [comparisonRuns, setComparisonRuns] = useState<ExecutionFlow[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  // Get selected model
  const selectedModel = useMemo(
    () => allModels?.find(m => m.record_id === selectedModelId),
    [allModels, selectedModelId]
  );

  // Filter models based on toggle
  const filteredModels = useMemo(
    () => showInactiveModels
      ? allModels
      : allModels?.filter(m => m.is_active),
    [allModels, showInactiveModels]
  );

  // Get model schema
  const { schema: modelSchema, loading: schemaLoading } = useModelSchema(
    selectedModel as any || null
  );

  // Initialize parameters when model changes
  const handleModelChange = useCallback(
    (modelId: string) => {
      setSelectedModelId(modelId);
      setModelParameters({});
      setExecutionFlow(null);
      setTracker(null);
    },
    []
  );

  // Initialize parameters when schema is loaded
  useEffect(() => {
    if (modelSchema && selectedModel) {
      const initialized = initializeParameters(modelSchema, {});
      setModelParameters(initialized);
    }
  }, [modelSchema, selectedModel]);

  /**
   * Main execution function with full instrumentation
   */
  const executeWithInstrumentation = useCallback(async () => {
    if (!selectedModel || !user) {
      toast.error("Please select a model and ensure you're logged in");
      return;
    }

    setIsExecuting(true);

    // Create enhanced tracker
    const newTracker = new EnhancedExecutionTracker(
      selectedModel.record_id,
      selectedModel.model_name,
      selectedModel.provider || 'unknown',
      selectedModel.content_type || 'unknown',
      user.id,
      TEST_MODE_CONFIG.DEFAULT
    );

    setTracker(newTracker);

    // Subscribe to updates
    const unsubscribe = newTracker.subscribe((flow) => {
      setExecutionFlow({ ...flow });
    });

    const unsubscribeLogs = newTracker.subscribeToLogs((log) => {
      console.log('New log:', log);
    });

    try {
      // ====== STEP 1: Load Model from Registry ======
      const step1 = newTracker.addStep(createStepConfig(
        "Load Model from Registry",
        "Retrieve model module from the registry using record ID",
        "src/lib/models/registry.ts",
        "getModel",
        { recordId: selectedModel.record_id },
        {
          canEdit: false,
          canRerun: false,
          stepType: STEP_TYPE.MAIN,
          executionContext: EXECUTION_CONTEXT.CLIENT,
        }
      ));

      newTracker.startStep(step1.id, { selectedModel });

      let modelModule: any;
      try {
        modelModule = getModel(selectedModel.record_id);

        // Load source code
        const sourceCode = await loadModelSourceCode(selectedModel.record_id);
        step1.sourceCode = sourceCode;

        newTracker.completeStep(
          step1.id,
          {
            modelLoaded: true,
            modelName: modelModule.MODEL_CONFIG.modelName,
            provider: modelModule.MODEL_CONFIG.provider,
            contentType: modelModule.MODEL_CONFIG.contentType,
            hasValidate: !!modelModule.validate,
            hasCalculateCost: !!modelModule.calculateCost,
            hasPreparePayload: !!modelModule.preparePayload,
            hasExecute: !!modelModule.execute,
          },
          { modelModule },
          {
            modelId: modelModule.MODEL_CONFIG.modelId,
            apiEndpoint: modelModule.MODEL_CONFIG.apiEndpoint,
            baseCost: modelModule.MODEL_CONFIG.baseCreditCost,
          }
        );
      } catch (error) {
        newTracker.failStep(
          step1.id,
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error.stack : undefined
        );
        throw error;
      }

      // ====== STEP 2: Prepare Inputs ======
      const step2 = newTracker.addStep(createStepConfig(
        "Prepare Inputs",
        "Prepare model parameters for execution",
        getModelFilePath(selectedModel.content_type || '', selectedModel.model_name, selectedModel.is_locked || false),
        "prepareInputs",
        { modelParameters },
        {
          canEdit: true,
          canRerun: true,
          stepType: STEP_TYPE.MAIN,
          executionContext: EXECUTION_CONTEXT.CLIENT,
        }
      ));

      newTracker.startStep(step2.id, { modelParameters });
      const inputs = { ...modelParameters };
      // Support both 'prompt' and 'positivePrompt' conventions
      if (inputs.prompt && !inputs.positivePrompt) {
        inputs.positivePrompt = inputs.prompt;
      }
      newTracker.completeStep(step2.id, { mergedInputs: inputs }, { inputs });

      // ====== STEP 3: Validate Inputs ======
      const step3 = newTracker.addStep(createStepConfig(
        "Validate Inputs",
        "Validate input parameters against model schema",
        getModelFilePath(selectedModel.content_type || '', selectedModel.model_name, selectedModel.is_locked || false),
        "validate",
        { inputs },
        {
          canEdit: false,
          canRerun: true,
          stepType: 'main',
          executionContext: 'client',
          sourceCode: modelModule.validate ? modelModule.validate.toString() : undefined,
        }
      ));

      newTracker.startStep(step3.id, { inputs });

      if (modelModule.validate) {
        const validation = modelModule.validate(inputs);
        if (!validation.valid) {
          newTracker.failStep(step3.id, validation.error || "Validation failed");
          toast.error("Validation failed: " + validation.error);
          setIsExecuting(false);
          return;
        }
        newTracker.completeStep(step3.id, { valid: true, validation }, { validation });
      } else {
        newTracker.completeStep(step3.id, { valid: true, message: "No validation function" });
      }

      // ====== STEP 4: Calculate Cost ======
      const step4 = newTracker.addStep(createStepConfig(
        "Calculate Cost",
        "Calculate credit cost for this generation",
        getModelFilePath(selectedModel.content_type || '', selectedModel.model_name, selectedModel.is_locked || false),
        "calculateCost",
        { inputs },
        {
          canEdit: false,
          canRerun: true,
          stepType: 'main',
          executionContext: 'client',
          sourceCode: modelModule.calculateCost ? modelModule.calculateCost.toString() : undefined,
        }
      ));

      newTracker.startStep(step4.id, { inputs });
      let cost = selectedModel.base_token_cost;
      if (modelModule.calculateCost) {
        cost = modelModule.calculateCost(inputs);
      }
      newTracker.completeStep(step4.id, { cost, credits: cost }, { cost });

      // ====== STEP 5: Reserve Credits (SKIPPED IN TEST MODE) ======
      const step5 = newTracker.addStep(createStepConfig(
        "Reserve Credits (Test Mode: Skipped)",
        "Would deduct credits from user account (skipped in test mode)",
        "src/lib/models/creditDeduction.ts",
        "reserveCredits",
        { userId: user.id, cost },
        {
          canEdit: false,
          canRerun: false,
          stepType: STEP_TYPE.MAIN,
          executionContext: EXECUTION_CONTEXT.CLIENT,
        }
      ));

      newTracker.startStep(step5.id, { userId: user.id, cost });
      newTracker.completeStep(
        step5.id,
        {
          skipped: true,
          reason: "Test mode enabled - no actual credit deduction",
          wouldDeduct: cost,
        },
        { testMode: true }
      );

      // ====== STEP 6: Create Generation Record ======
      const step6 = newTracker.addStep(createStepConfig(
        "Create Generation Record",
        "Insert generation record into database",
        "supabase/tables/generations",
        "insert",
        {
          user_id: user.id,
          model_id: selectedModel.record_id,
          model_record_id: selectedModel.record_id,
          type: getGenerationType(selectedModel.content_type || ''),
          prompt: inputs.prompt || inputs.positivePrompt || null,
          tokens_used: cost,
          status: GENERATION_STATUS.PENDING,
          settings: modelParameters,
        },
        {
          canEdit: true,
          canRerun: false,
          stepType: STEP_TYPE.MAIN,
          executionContext: EXECUTION_CONTEXT.DATABASE,
        }
      ));

      newTracker.startStep(step6.id);
      const { data: gen, error: genError } = await supabase
        .from("generations")
        .insert({
          user_id: user.id,
          model_id: selectedModel.record_id,
          model_record_id: selectedModel.record_id,
          type: getGenerationType(selectedModel.content_type || ''),
          prompt: inputs.prompt || inputs.positivePrompt || null,
          tokens_used: cost,
          status: GENERATION_STATUS.PENDING,
          settings: modelParameters,
        })
        .select()
        .single();

      if (genError || !gen) {
        newTracker.failStep(step6.id, genError?.message || "Failed to create generation");
        throw new Error(genError?.message || "Failed to create generation");
      }

      newTracker.setGenerationId(gen.id);
      newTracker.completeStep(
        step6.id,
        { generationId: gen.id, generation: gen },
        { generation: gen },
        {
          tableName: 'generations',
          recordId: gen.id,
          insertedAt: gen.created_at,
        }
      );

      // ====== STEP 7: Prepare API Payload ======
      const step7 = newTracker.addStep(createStepConfig(
        "Prepare API Payload",
        "Structure payload for API provider",
        getModelFilePath(selectedModel.content_type || '', selectedModel.model_name, selectedModel.is_locked || false),
        "preparePayload",
        { inputs },
        {
          canEdit: true,
          canRerun: true,
          stepType: 'main',
          executionContext: 'client',
          sourceCode: modelModule.preparePayload ? modelModule.preparePayload.toString() : undefined,
        }
      ));

      newTracker.startStep(step7.id, { inputs });
      let payload: any = {};
      if (modelModule.preparePayload) {
        payload = modelModule.preparePayload(inputs);
      } else {
        payload = inputs;
      }
      newTracker.completeStep(
        step7.id,
        { payload },
        { payload },
        {
          apiEndpoint: modelModule.MODEL_CONFIG.apiEndpoint,
          provider: modelModule.MODEL_CONFIG.provider,
          payloadSize: JSON.stringify(payload).length,
        }
      );

      // ====== STEP 8: Call Edge Function ======
      const step8 = newTracker.addStep(createStepConfig(
        "Call Edge Function",
        "Invoke generate-content edge function with test_mode flag",
        "supabase/functions/generate-content/index.ts",
        "invoke",
        {
          generationId: gen.id,
          model_config: modelModule.MODEL_CONFIG,
          model_schema: modelModule.SCHEMA,
          prompt: inputs.prompt || inputs.positivePrompt || null,
          custom_parameters: payload,
          test_mode: true, // TEST MODE FLAG
        },
        {
          canEdit: true,
          canRerun: true,
          stepType: STEP_TYPE.MAIN,
          executionContext: EXECUTION_CONTEXT.EDGE_FUNCTION,
        }
      ));

      newTracker.startStep(step8.id);
      const { data: edgeData, error: funcError } = await supabase.functions.invoke(
        "generate-content",
        {
          body: {
            generationId: gen.id,
            model_config: modelModule.MODEL_CONFIG,
            model_schema: modelModule.SCHEMA,
            prompt: inputs.prompt || inputs.positivePrompt || null,
            custom_parameters: payload,
            test_mode: true,
          },
        }
      );

      if (funcError) {
        newTracker.failStep(step8.id, funcError.message, funcError.stack);
        await supabase
          .from("generations")
          .update({ status: GENERATION_STATUS.FAILED })
          .eq("id", gen.id);
        throw new Error(`Edge function failed: ${funcError.message}`);
      }

      newTracker.completeStep(
        step8.id,
        {
          success: true,
          response: edgeData,
          message: "Edge function invoked successfully (test mode)",
        },
        { edgeData },
        {
          functionName: 'generate-content',
          responseTime: 0,
          testMode: true,
        }
      );

      // ====== STEP 9: Polling Started ======
      const step9 = newTracker.addStep(createStepConfig(
        "Start Polling",
        "Monitor generation status (test mode - check History for results)",
        "src/hooks/useHybridGenerationPolling.ts",
        "startPolling",
        { generationId: gen.id },
        {
          canEdit: false,
          canRerun: false,
          stepType: STEP_TYPE.MAIN,
          executionContext: EXECUTION_CONTEXT.CLIENT,
        }
      ));

      newTracker.startStep(step9.id);
      newTracker.completeStep(
        step9.id,
        {
          pollingStarted: true,
          generationId: gen.id,
          message: "In test mode, check Generation History for actual results",
          tier: "hybrid",
        },
        {},
        {
          pollingInterval: 2000,
          timeout: 300000,
        }
      );

      // Complete execution
      newTracker.complete();
      toast.success("Test execution complete!", {
        description: `Generation ID: ${gen.id}. Check History for results.`,
        action: {
          label: "View History",
          onClick: () => (window.location.href = "/dashboard/history"),
        },
      });
    } catch (error) {
      console.error("Execution failed:", error);
      toast.error(error instanceof Error ? error.message : "Execution failed");
    } finally {
      setIsExecuting(false);
      unsubscribe();
      unsubscribeLogs();
    }
  }, [selectedModel, user, modelParameters]);

  /**
   * Handle execution control
   */
  const handlePlay = useCallback(() => {
    if (!tracker) {
      executeWithInstrumentation();
    } else {
      tracker.resume();
    }
  }, [tracker, executeWithInstrumentation]);

  const handlePause = useCallback(() => {
    if (tracker) {
      tracker.pause();
    }
  }, [tracker]);

  const handleStepForward = useCallback(() => {
    if (tracker) {
      tracker.stepForward();
    }
  }, [tracker]);

  const handleStop = useCallback(() => {
    if (tracker) {
      tracker.cancel();
      setTracker(null);
      setExecutionFlow(null);
    }
  }, [tracker]);

  const handleRestart = useCallback(() => {
    setTracker(null);
    setExecutionFlow(null);
    executeWithInstrumentation();
  }, [executeWithInstrumentation]);

  const handleExport = useCallback(() => {
    if (tracker) {
      const json = tracker.export();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `test-execution-${executionFlow?.testRunId}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Execution trace exported");
    }
  }, [tracker, executionFlow]);

  const handleBookmark = useCallback(async () => {
    if (tracker && executionFlow) {
      const name = window.prompt("Enter bookmark name:");
      if (name) {
        const promptValue = modelParameters.prompt || modelParameters.positivePrompt || '';
        await tracker.bookmark(name, [selectedModel?.provider || ''], promptValue);
        toast.success("Test run bookmarked");
      }
    }
  }, [tracker, executionFlow, selectedModel, modelParameters]);

  /**
   * Phase 3 Advanced Features Handlers
   */
  const handleLoadRun = useCallback(async (testRunId: string) => {
    try {
      const loadedTracker = await EnhancedExecutionTracker.loadFromDatabase(testRunId);
      if (loadedTracker) {
        setTracker(loadedTracker);
        const flow = loadedTracker['flow']; // Access private field for display
        setExecutionFlow(flow as ExecutionFlow);
        toast.success("Test run loaded successfully");
        setShowHistoryBrowser(false);
      }
    } catch (error) {
      toast.error("Failed to load test run");
      console.error(error);
    }
  }, []);

  const handleReplay = useCallback((executionData: ExecutionFlow) => {
    // Create new tracker with replayed data
    const newTracker = new EnhancedExecutionTracker(
      executionData.modelRecordId,
      executionData.modelName,
      executionData.modelProvider,
      executionData.modelContentType,
      user?.id || '',
      TEST_MODE_CONFIG.DEFAULT
    );

    setTracker(newTracker);
    setExecutionFlow(executionData);
    // Restore parameters from the execution data
    const replayStep = executionData.steps.find(s => s.inputs?.prompt || s.inputs?.modelParameters);
    if (replayStep?.inputs?.modelParameters) {
      setModelParameters(replayStep.inputs.modelParameters);
    } else if (replayStep?.inputs?.prompt) {
      setModelParameters(prev => ({ ...prev, prompt: replayStep.inputs.prompt }));
    }
    toast.success("Ready to replay execution");
  }, [user]);

  const handleCompareRuns = useCallback(async (runIds: string[]) => {
    try {
      const flows: ExecutionFlow[] = [];
      for (const runId of runIds) {
        const loadedTracker = await EnhancedExecutionTracker.loadFromDatabase(runId);
        if (loadedTracker) {
          const flow = loadedTracker['flow']; // Access private field
          flows.push(flow as ExecutionFlow);
        }
      }
      setComparisonRuns(flows);
      setShowComparison(true);
      setShowHistoryBrowser(false);
      toast.success(`Comparing ${flows.length} test runs`);
    } catch (error) {
      toast.error("Failed to load runs for comparison");
      console.error(error);
    }
  }, []);

  /**
   * Keyboard Shortcuts
   */
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: " ",
        description: "Play / Pause execution",
        action: () => {
          if (isExecuting || tracker?.getFlow().status === 'running') {
            handlePause();
          } else {
            handlePlay();
          }
        },
        disabled: !tracker && !selectedModel,
      },
      {
        key: "ArrowRight",
        description: "Step forward",
        action: handleStepForward,
        disabled: !tracker || isExecuting,
      },
      {
        key: "n",
        description: "Step forward (alternative)",
        action: handleStepForward,
        disabled: !tracker || isExecuting,
      },
      {
        key: "Escape",
        description: "Stop execution",
        action: handleStop,
        disabled: !tracker,
      },
      {
        key: "r",
        description: "Restart execution",
        action: handleRestart,
        disabled: !tracker || isExecuting,
      },
      {
        key: "e",
        description: "Export execution trace",
        action: handleExport,
        disabled: !tracker,
      },
      {
        key: "b",
        description: "Bookmark current run",
        action: handleBookmark,
        disabled: !tracker || !executionFlow,
      },
      {
        key: "h",
        description: "Toggle history browser",
        action: () => setShowHistoryBrowser(!showHistoryBrowser),
      },
      {
        key: "1",
        description: "Execution Flow tab",
        action: () => setActiveTab("flow"),
      },
      {
        key: "2",
        description: "Live Logs tab",
        action: () => setActiveTab("logs"),
      },
      {
        key: "3",
        description: "Source Code tab",
        action: () => setActiveTab("code"),
      },
      {
        key: "4",
        description: "Performance tab",
        action: () => setActiveTab("performance"),
      },
    ],
    enabled: true,
  });

  /**
   * Render model parameter inputs
   */
  const renderParameterInputs = () => {
    if (!modelSchema || !modelSchema.properties) return null;

    const properties = modelSchema.properties;

    return (
      <div className="space-y-3">
        {Object.entries(properties).map(([key, prop]: [string, any]) => {
          // Skip properties marked as showToUser: false
          if (prop.showToUser === false) return null;

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
              ) : key === 'prompt' || key === 'positivePrompt' ? (
                <Textarea
                  id={key}
                  value={value ?? prop.default ?? ''}
                  onChange={(e) =>
                    setModelParameters(prev => ({ ...prev, [key]: e.target.value }))
                  }
                  placeholder={`Enter ${prop.title || key}...`}
                  rows={4}
                  disabled={isExecuting}
                />
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
    <div className="container mx-auto p-6 max-w-[1800px]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Comprehensive Model Tester</h1>
              <p className="text-sm text-muted-foreground">
                100% transparent execution with database persistence and real-time logging
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistoryBrowser(!showHistoryBrowser)}
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
            <ImportReplayDialog onReplay={handleReplay}>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </ImportReplayDialog>
            <KeyboardShortcutsDialog shortcuts={[]}>
              <Button variant="ghost" size="sm">
                <span className="text-xs">?</span>
              </Button>
            </KeyboardShortcutsDialog>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Panel: Input & Controls (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Model Selection */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Model Selection</h2>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showInactiveModels}
                      onChange={(e) => setShowInactiveModels(e.target.checked)}
                      className="rounded"
                    />
                    Show inactive
                  </label>
                  <Badge variant="secondary">
                    {filteredModels?.length || 0} models
                  </Badge>
                </div>
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
                    {filteredModels?.map(model => (
                      <SelectItem key={model.record_id} value={model.record_id}>
                        <div className="flex items-center gap-2">
                          <span>{model.model_name}</span>
                          {!model.is_active && (
                            <Badge variant="destructive" className="text-xs">
                              Inactive
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

          {/* Execution Controls */}
          {executionFlow && (
            <ExecutionControlPanel
              flow={executionFlow}
              onPlay={handlePlay}
              onPause={handlePause}
              onStepForward={handleStepForward}
              onStop={handleStop}
              onRestart={handleRestart}
              onExport={handleExport}
              onBookmark={handleBookmark}
              disabled={isExecuting}
            />
          )}

          {/* Input Parameters */}
          {selectedModel && (
            <Card className="p-6">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileCode2 className="h-5 w-5" />
                  Input Parameters
                </h2>

                <div className="space-y-4">
                  {!schemaLoading && renderParameterInputs()}
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={executeWithInstrumentation}
                  disabled={isExecuting || !selectedModel}
                >
                  <Play className="mr-2 h-5 w-5" />
                  {isExecuting ? "Executing..." : "Execute with Full Tracking"}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Right Panel: Execution Visualization (3 columns) */}
        <div className="lg:col-span-3">
          <Card className="p-6 min-h-[800px]">
            {executionFlow ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="flow">
                    <Layers className="h-4 w-4 mr-2" />
                    Execution Flow
                  </TabsTrigger>
                  <TabsTrigger value="logs">
                    <Terminal className="h-4 w-4 mr-2" />
                    Live Logs
                  </TabsTrigger>
                  <TabsTrigger value="code">
                    <FileCode2 className="h-4 w-4 mr-2" />
                    Source Code
                  </TabsTrigger>
                  <TabsTrigger value="performance">
                    <Download className="h-4 w-4 mr-2" />
                    Performance
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="flow" className="mt-4">
                  <ExecutionFlowVisualizer
                    flow={executionFlow}
                    onEditStep={(stepId, newInputs) => {
                      if (tracker) {
                        tracker.updateStepInputs(stepId, newInputs);
                        toast.success("Step inputs updated");
                      }
                    }}
                    onRerunFromStep={(stepId) => {
                      toast.info("Rerun from step coming soon");
                    }}
                  />
                </TabsContent>

                <TabsContent value="logs" className="mt-4">
                  <LogStreamViewer
                    logs={executionFlow.logs}
                    autoScroll={true}
                    maxHeight="700px"
                    showFilters={true}
                  />
                </TabsContent>

                <TabsContent value="code" className="mt-4">
                  {selectedModel && (
                    <CodeViewer
                      code={executionFlow.steps[0]?.sourceCode || '// Loading source code...'}
                      language="typescript"
                      title={`${selectedModel.model_name} Source`}
                      filePath={getModelFilePath(
                        selectedModel.content_type || '',
                        selectedModel.model_name,
                        selectedModel.is_locked || false
                      )}
                      readOnly={true}
                    />
                  )}
                </TabsContent>

                <TabsContent value="performance" className="mt-4">
                  <PerformanceMetricsDashboard flow={executionFlow} />
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Layers className="h-24 w-24 text-muted-foreground/20 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Execution Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  Select a model, configure inputs, and click "Execute with Full Tracking"
                  to see the complete execution flow with database persistence, real-time
                  logs, and source code visualization.
                </p>
                <div className="grid grid-cols-2 gap-4 text-left text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                    <div>
                      <div className="font-medium">Database Persistence</div>
                      <div className="text-muted-foreground text-xs">
                        Auto-saved every 2 seconds
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                    <div>
                      <div className="font-medium">Real-Time Logs</div>
                      <div className="text-muted-foreground text-xs">
                        Stream from edge functions
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
                    <div>
                      <div className="font-medium">Code Inspection</div>
                      <div className="text-muted-foreground text-xs">
                        View actual TypeScript source
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5" />
                    <div>
                      <div className="font-medium">Test Mode</div>
                      <div className="text-muted-foreground text-xs">
                        No billing, safe testing
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Phase 3 Advanced Features: History Browser */}
      {showHistoryBrowser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-background rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
            <TestRunHistoryBrowser
              onLoadRun={handleLoadRun}
              onCompareRuns={handleCompareRuns}
              className="border-0"
            />
            <div className="p-4 border-t flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowHistoryBrowser(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 3 Advanced Features: Comparison Viewer */}
      {showComparison && comparisonRuns.length > 0 && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-background rounded-lg max-w-7xl w-full max-h-[90vh] overflow-auto">
            <ComparisonViewer
              runs={comparisonRuns}
              onClose={() => {
                setShowComparison(false);
                setComparisonRuns([]);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ComprehensiveModelTester;
