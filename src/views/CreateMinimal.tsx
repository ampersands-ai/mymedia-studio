import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MinimalSidebar } from "@/components/MinimalSidebar";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassButton } from "@/components/glass/GlassButton";
import { GlassTextarea } from "@/components/glass/GlassTextarea";
import { GlassSelect } from "@/components/glass/GlassSelect";
import { toast } from "sonner";
import { Sparkles, Download, History, Settings, ChevronDown } from "lucide-react";
import { useTemplates } from "@/hooks/useTemplates";
import { useModels } from "@/hooks/useModels";
import { useGeneration } from "@/hooks/useGeneration";
import { useGenerationPolling } from "@/hooks/useGenerationPolling";
import { OptimizedGenerationPreview } from "@/components/generation/OptimizedGenerationPreview";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { downloadFromStorage } from "@/lib/downloads/downloadManager";
import { useErrorHandler } from "@/hooks/useErrorHandler";

export default function CreateMinimal() {
  const router = useRouter();
  const { data: templates } = useTemplates();
  const { data: models } = useModels();
  const { generate, isGenerating } = useGeneration();
  const { execute } = useErrorHandler();

  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [prompt, setPrompt] = useState("");
  const [generatedOutput, setGeneratedOutput] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Use realtime + polling hook
  const { startPolling, isPolling } = useGenerationPolling({
    onComplete: (outputs) => {
      if (outputs && outputs.length > 0) {
        setGeneratedOutput(outputs[0].storage_path);
      }
    },
    onError: (error: string) => {
      toast.error('Generation failed', {
        description: error,
        duration: 5000
      });
    },
    onTimeout: () => {
      toast.info('Generation is taking longer than expected. Check History for updates.');
    }
  });

  // Auto-select first template and model
  useEffect(() => {
    if (templates && templates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(templates[0]);
    }
  }, [templates, selectedTemplate]);

  useEffect(() => {
    if (selectedTemplate && models) {
      const templateModel = models.find(m => m.id === selectedTemplate.model_id);
      if (templateModel) {
        setSelectedModel(templateModel);
      }
    }
  }, [selectedTemplate, models]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    setGeneratedOutput(null);

    const customParameters: Record<string, any> = {};

    if (selectedTemplate?.hidden_field_defaults) {
      Object.assign(customParameters, selectedTemplate.hidden_field_defaults);
    }

    if (selectedTemplate?.preset_parameters) {
      Object.assign(customParameters, selectedTemplate.preset_parameters);
    }

    const result = await execute(
      () => generate({
        template_id: selectedTemplate.id,
        prompt: prompt.trim(),
        custom_parameters: Object.keys(customParameters).length > 0 ? customParameters : undefined,
      }),
      {
        context: {
          component: 'CreateMinimal',
          operation: 'generate',
          templateId: selectedTemplate.id,
        },
        // Don't show auto success - we handle it with polling
        showSuccessToast: false,
        onError: (error) => {
          // Handle session expiration specially
          if (error.message === "SESSION_EXPIRED") {
            toast.error("Session expired. Please log in again.");
            setTimeout(() => router.push("/auth"), 2000);
          }
        }
      }
    );

    if (result) {
      const genId = result?.id || result?.generation_id;
      if (genId) {
        startPolling(genId);
      }

      if (result?.storage_path) {
        setGeneratedOutput(result.storage_path);
      }
    }
  };

  const handleDownload = async (storagePath: string) => {
    const extension = storagePath.split('.').pop() || 'file';
    await downloadFromStorage(storagePath, {
      filename: `generation-${Date.now()}.${extension}`,
      successMessage: 'Download started!',
      bucket: 'generated-content'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <MinimalSidebar />
      
      <div className="ml-20 min-h-screen p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-light text-gray-200 mb-2">Create</h1>
          <p className="text-gray-400 font-light">Generate stunning AI content</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] gap-6">
          {/* Left Column - Controls */}
          <div className="space-y-6">
            {/* Template Selector */}
            <GlassCard>
              <GlassSelect
                label="Template"
                value={selectedTemplate?.id || ""}
                onChange={(e) => {
                  const template = templates?.find(t => t.id === e.target.value);
                  setSelectedTemplate(template);
                }}
              >
                <option value="">Select template...</option>
                {templates?.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </GlassSelect>
            </GlassCard>

            {/* Model Info */}
            {selectedModel && (
              <GlassCard hover>
                <div className="space-y-2">
                  <p className="text-sm font-light text-gray-400">AI Model</p>
                  <p className="text-gray-200 font-medium">{selectedModel.name}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>Cost: {selectedModel.cost_per_unit} tokens</span>
                    <span>•</span>
                    <span>{selectedModel.content_type}</span>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Prompt Input */}
            <GlassCard>
              <GlassTextarea
                label="Your Prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to create..."
                rows={8}
              />
            </GlassCard>

            {/* Advanced Settings */}
            <GlassCard>
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between text-gray-300 hover:text-white transition-colors">
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      <span className="font-light">Advanced Settings</span>
                    </div>
                    <ChevronDown className={cn(
                      "w-5 h-5 transition-transform",
                      advancedOpen && "transform rotate-180"
                    )} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4">
                  <p className="text-sm text-gray-400 font-light">
                    Advanced settings coming soon...
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </GlassCard>

            {/* Generate Button */}
            <GlassButton
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleGenerate}
              loading={isGenerating || isPolling}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Generate
            </GlassButton>

            {/* Actions */}
            <div className="flex gap-3">
              <GlassButton
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => router.push("/dashboard/history")}
              >
                <History className="w-4 h-4 mr-2" />
                History
              </GlassButton>
              {generatedOutput && (
                <GlassButton
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDownload(generatedOutput)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </GlassButton>
              )}
            </div>
          </div>

          {/* Right Column - Preview */}
          <div>
            <GlassCard className="min-h-[600px] flex items-center justify-center">
              {generatedOutput ? (
                <div className="w-full">
                  <OptimizedGenerationPreview
                    storagePath={generatedOutput}
                    contentType={selectedModel?.content_type || 'image'}
                  />
                </div>
              ) : (isGenerating || isPolling) ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full border-4 border-white/10 border-t-white/50 animate-spin" />
                  <p className="text-gray-400 font-light">Generating your content...</p>
                </div>
              ) : (
                <div className="text-center space-y-4 max-w-md">
                  <div className="w-24 h-24 mx-auto rounded-full backdrop-blur-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-white/50" />
                  </div>
                  <p className="text-gray-400 font-light">
                    Your generated content will appear here
                  </p>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
