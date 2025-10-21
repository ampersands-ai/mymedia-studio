import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, ImageIcon, Palette, ImagePlus, Video, Film, Music } from "lucide-react";
import { SessionWarning } from "@/components/SessionWarning";
import { useGeneration } from "@/hooks/useGeneration";
import { useModels } from "@/hooks/useModels";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { createSignedUrl } from "@/lib/storage-utils";
import { OutputGrid } from "@/components/generation/OutputGrid";
import { OutputLightbox } from "@/components/generation/OutputLightbox";
import { trackEvent } from "@/lib/posthog";
import { CustomCreationInputPanel } from "@/components/generation/CustomCreationInputPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Group type definition
type CreationGroup = "image_editing" | "prompt_to_image" | "prompt_to_video" | "image_to_video" | "prompt_to_audio";

// Group configuration
const CREATION_GROUPS = [
  { id: "image_editing" as CreationGroup, label: "Image Editing", Icon: Palette },
  { id: "prompt_to_image" as CreationGroup, label: "Prompt to Image", Icon: ImagePlus },
  { id: "prompt_to_video" as CreationGroup, label: "Prompt to Video", Icon: Video },
  { id: "image_to_video" as CreationGroup, label: "Image to Video", Icon: Film },
  { id: "prompt_to_audio" as CreationGroup, label: "Prompt to Audio", Icon: Music },
];

const CustomCreation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("template");
  
  const [selectedGroup, setSelectedGroup] = useState<CreationGroup>("prompt_to_image");
  const { data: allModels, isLoading: modelsLoading } = useModels();
  const { generate, isGenerating } = useGeneration();
  
  const [prompt, setPrompt] = useState("");
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [generatedOutputs, setGeneratedOutputs] = useState<Array<{
    id: string;
    storage_path: string;
    output_index: number;
  }>>([]);
  const [estimatedTokens, setEstimatedTokens] = useState(50);
  const [enhancePrompt, setEnhancePrompt] = useState(false);
  const [generateCaption, setGenerateCaption] = useState(false);
  const [modelParameters, setModelParameters] = useState<Record<string, any>>({});
  const [pollingGenerationId, setPollingGenerationId] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedOutputIndex, setSelectedOutputIndex] = useState<number>(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [localGenerating, setLocalGenerating] = useState(false);

  // Filter models by selected group
  const filteredModels = allModels?.filter(model => {
    const groups = model.groups as string[] || [];
    return groups.includes(selectedGroup);
  }).sort((a, b) => a.base_token_cost - b.base_token_cost) || [];

  // Auto-select first model when filtered models change
  useEffect(() => {
    if (filteredModels.length > 0 && !selectedModel) {
      setSelectedModel(String(filteredModels[0].record_id));
    }
  }, [filteredModels, selectedModel]);

  // Initialize schema defaults when model changes
  useEffect(() => {
    if (!selectedModel) return;
    const currentModel = filteredModels.find(m => m.record_id === selectedModel);
    const props = currentModel?.input_schema?.properties;
    if (!props) return;

    const defaults: Record<string, any> = {};
    for (const [key, schema] of Object.entries<any>(props)) {
      if (schema?.default !== undefined && modelParameters[key] === undefined) {
        defaults[key] = schema.default;
      }
    }
    if (Object.keys(defaults).length > 0) {
      setModelParameters(prev => ({ ...defaults, ...prev }));
    }
  }, [selectedModel, filteredModels]);

  // Calculate token cost
  useEffect(() => {
    if (!selectedModel || !filteredModels) return;

    const currentModel = filteredModels.find(m => m.record_id === selectedModel);
    if (!currentModel) return;

    let tokens = currentModel.base_token_cost;
    const multipliers = currentModel.cost_multipliers || {};
    
    for (const [paramName, multiplierConfig] of Object.entries(multipliers)) {
      const paramValue = modelParameters[paramName];
      if (paramValue === undefined || paramValue === null) continue;
      
      if (typeof multiplierConfig === 'object' && !Array.isArray(multiplierConfig)) {
        const multiplier = (multiplierConfig as any)[paramValue] ?? 1;
        if (typeof multiplier === 'number') {
          tokens *= multiplier;
        }
      }
    }
    
    setEstimatedTokens(Math.round(tokens));
  }, [selectedModel, modelParameters, filteredModels]);

  // Get max prompt length
  const getMaxPromptLength = (): number => {
    if (!selectedModel) return 5000;
    const currentModel = filteredModels.find(m => m.record_id === selectedModel);
    if (!currentModel) return 5000;
    
    const isKieAiAudio = currentModel.provider === 'kie_ai' && currentModel.content_type === 'audio';
    const customMode = modelParameters.customMode;
    
    if (isKieAiAudio && customMode === false) {
      return 500;
    }
    
    return 5000;
  };

  // Polling function
  const pollGenerationStatus = async (generationId: string) => {
    try {
      const { data: parentData, error: parentError } = await supabase
        .from('generations')
        .select('id, status, storage_path, type, output_index, is_batch_output')
        .eq('id', generationId)
        .single();

      if (parentError) throw parentError;

      if (parentData.status === 'completed' || parentData.status === 'failed') {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setPollingGenerationId(null);
        setLocalGenerating(false);

        if (parentData.status === 'failed') {
          const { data: fullGenData } = await supabase
            .from('generations')
            .select('provider_response')
            .eq('id', generationId)
            .single();
          
          const providerResponse = fullGenData?.provider_response as any;
          const errorMessage = providerResponse?.error || 
                               providerResponse?.full_response?.data?.failMsg ||
                               'Generation failed. Please try again.';
          
          toast.error('Generation failed', {
            description: errorMessage,
            duration: 8000
          });
        } else if (parentData.status === 'completed') {
          const { data: childrenData } = await supabase
            .from('generations')
            .select('id, storage_path, output_index')
            .eq('parent_generation_id', generationId)
            .order('output_index', { ascending: true });

          const allOutputs = [
            { id: parentData.id, storage_path: parentData.storage_path, output_index: 0 },
            ...(childrenData || [])
          ];

          setGeneratedOutputs(allOutputs);
          toast.success('✨ Your creation is ready!', { 
            description: `${allOutputs.length} output${allOutputs.length > 1 ? 's' : ''} generated`
          });
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  };

  // Start polling
  useEffect(() => {
    if (pollingGenerationId) {
      pollGenerationStatus(pollingGenerationId);
      pollIntervalRef.current = setInterval(() => {
        pollGenerationStatus(pollingGenerationId);
      }, 5000);
      
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [pollingGenerationId]);

  // Get image field info
  const getImageFieldInfo = () => {
    if (!selectedModel) return { fieldName: null, isArray: false };
    const currentModel = filteredModels.find(m => m.record_id === selectedModel);
    if (!currentModel?.input_schema?.properties) return { fieldName: null, isArray: false };
    
    const properties = currentModel.input_schema.properties;
    const imageFieldNames = ['inputImage', 'image_urls', 'imageUrl', 'image_url', 'image', 'images', 'filesUrl', 'filesURL', 'file_urls', 'fileUrls', 'reference_image_urls'];
    
    for (const fieldName of imageFieldNames) {
      if (properties[fieldName]) {
        const isArray = properties[fieldName].type === 'array';
        return { fieldName, isArray };
      }
    }
    
    return { fieldName: null, isArray: false };
  };

  const handleGenerate = async () => {
    if (!selectedModel) {
      toast.error("Please select a model");
      return;
    }

    const currentModel = filteredModels.find(m => m.record_id === selectedModel);
    const schemaRequired = currentModel?.input_schema?.required || [];
    const isPromptRequired = schemaRequired.includes('prompt');
    
    if (isPromptRequired && !prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    const imageFieldInfo = getImageFieldInfo();
    const isImageRequired = schemaRequired.includes(imageFieldInfo.fieldName || '');
    
    if (isImageRequired && uploadedImages.length === 0) {
      toast.error("Please upload an image");
      return;
    }

    setLocalGenerating(true);
    
    try {
      const customParameters: Record<string, any> = { ...modelParameters };
      const imageFieldName = imageFieldInfo.fieldName;
      const isImageArray = imageFieldInfo.isArray;

      // Upload images if needed
      if (imageFieldName && uploadedImages.length > 0) {
        const timestamp = Date.now();
        const imageUrls: string[] = [];

        for (let i = 0; i < uploadedImages.length; i++) {
          const file = uploadedImages[i];
          const fileExt = file.name.split('.').pop();
          const filePath = `${user?.id}/uploads/${timestamp}/${i}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('generated-content')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });

          if (uploadError) {
            toast.error(`Failed to upload: ${file.name}`);
            return;
          }

          const { data: signedData, error: signedError } = await supabase.storage
            .from('generated-content')
            .createSignedUrl(filePath, 3600);

          if (signedError || !signedData) {
            toast.error(`Failed to create URL for: ${file.name}`);
            return;
          }

          imageUrls.push(signedData.signedUrl);
        }

        customParameters[imageFieldName] = isImageArray ? imageUrls : imageUrls[0];
      }

      const result = await generate({
        model_record_id: selectedModel,
        prompt: prompt.trim(),
        custom_parameters: customParameters,
        enhance_prompt: enhancePrompt,
      });

      const genId = result?.id || result?.generation_id;
      if (genId) {
        setPollingGenerationId(genId);
        toast.loading('Generating...', { id: 'generation-progress' });
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Generation failed');
    } finally {
      setLocalGenerating(false);
    }
  };

  const handleBack = () => {
    if (generatedOutputs.length > 0) {
      // If there are outputs, just clear them
      setGeneratedOutputs([]);
      setPrompt("");
      setUploadedImages([]);
      setModelParameters({});
    } else {
      // Otherwise go back to templates
      navigate("/dashboard/templates");
    }
  };

  if (!modelsLoading && (!allModels || allModels.length === 0)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-4xl font-black mb-4">NO MODELS AVAILABLE</h2>
          <p className="text-lg text-muted-foreground">Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  // If no model selected yet, show model selection
  if (!selectedModel && !templateId) {
    return (
      <div className="min-h-screen bg-background">
        <SessionWarning />
        
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black mb-2">CREATION STUDIO</h1>
            <p className="text-muted-foreground">Choose your creation type</p>
          </div>

          {/* Group Selection */}
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">Select Creation Type</h2>
            <div className="flex flex-wrap gap-3 justify-center max-w-4xl mx-auto">
              {CREATION_GROUPS.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  className={cn(
                    "p-4 rounded-xl transition-all flex items-center gap-3 min-w-[200px]",
                    selectedGroup === group.id
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  <group.Icon className="h-6 w-6" />
                  <span className="font-semibold text-sm">{group.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Model Selection */}
          {filteredModels.length > 0 && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-lg font-bold mb-4">Select AI Model</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredModels.map((model) => (
                  <Card
                    key={model.record_id}
                    className={cn(
                      "p-4 cursor-pointer transition-all hover:shadow-lg",
                      selectedModel === model.record_id && "ring-2 ring-primary"
                    )}
                    onClick={() => setSelectedModel(model.record_id)}
                  >
                    <h3 className="font-bold mb-2">{model.model_name}</h3>
                    <Badge variant="secondary" className="mt-2">
                      {model.base_token_cost} tokens
                    </Badge>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Split-panel layout when model is selected
  return (
    <div className="min-h-screen bg-background">
      <SessionWarning />
      
      <div className="h-screen flex flex-col lg:flex-row">
        {/* Left Panel - Input */}
        <div className="lg:w-1/2 border-r flex flex-col">
          <CustomCreationInputPanel
            selectedModel={selectedModel}
            models={filteredModels}
            prompt={prompt}
            onPromptChange={setPrompt}
            uploadedImages={uploadedImages}
            onImagesChange={setUploadedImages}
            modelParameters={modelParameters}
            onParametersChange={setModelParameters}
            enhancePrompt={enhancePrompt}
            onEnhancePromptChange={setEnhancePrompt}
            generateCaption={generateCaption}
            onGenerateCaptionChange={setGenerateCaption}
            estimatedTokens={estimatedTokens}
            isGenerating={localGenerating || isGenerating}
            maxPromptLength={getMaxPromptLength()}
            onGenerate={handleGenerate}
            onBack={handleBack}
          />
        </div>

        {/* Right Panel - Output */}
        <div className="lg:w-1/2 flex flex-col bg-muted/30">
          <div className="border-b px-6 py-4 bg-background">
            <h2 className="text-lg font-bold">Output</h2>
          </div>

          <div className="flex-1 flex items-center justify-center p-6">
            {generatedOutputs.length > 0 ? (
              <div className="w-full h-full">
                <OutputGrid
                  outputs={generatedOutputs}
                  contentType={filteredModels.find(m => m.record_id === selectedModel)?.content_type || "image"}
                  onSelectOutput={(index) => {
                    setSelectedOutputIndex(index);
                    setShowLightbox(true);
                  }}
                />
              </div>
            ) : (localGenerating || isGenerating) ? (
              <div className="text-center">
                <Sparkles className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse" />
                <p className="text-lg font-medium">Generating your creation...</p>
                <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
              </div>
            ) : (
              <div className="text-center">
                <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg text-muted-foreground">
                  Fill in the inputs and execute to see results
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <OutputLightbox
        outputs={generatedOutputs}
        selectedIndex={selectedOutputIndex}
        contentType={filteredModels.find(m => m.record_id === selectedModel)?.content_type || "image"}
        open={showLightbox}
        onOpenChange={setShowLightbox}
        onNavigate={(direction) => {
          if (direction === 'prev' && selectedOutputIndex > 0) {
            setSelectedOutputIndex(selectedOutputIndex - 1);
          } else if (direction === 'next' && selectedOutputIndex < generatedOutputs.length - 1) {
            setSelectedOutputIndex(selectedOutputIndex + 1);
          }
        }}
      />
    </div>
  );
};

export default CustomCreation;
