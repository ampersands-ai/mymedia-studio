import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ImageIcon, Upload, Coins, Sparkles, Download, History, Play, ChevronRight, Loader2, Clock, Info, Camera, Share2, RefreshCw, CheckCircle2 } from "lucide-react";
import { useNativeCamera } from "@/hooks/useNativeCamera";
import { triggerHaptic } from "@/utils/capacitor-utils";

import { SessionWarning } from "@/components/SessionWarning";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { SuccessConfetti } from "@/components/onboarding/SuccessConfetti";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplateCard } from "@/components/TemplateCard";
import { useGeneration } from "@/hooks/useGeneration";
import { useModels } from "@/hooks/useModels";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ModelParameterForm } from "@/components/generation/ModelParameterForm";
import { formatEstimatedTime } from "@/lib/time-utils";
import { GenerationPreview } from "@/components/generation/GenerationPreview";
import { GenerationProgress } from "@/components/generation/GenerationProgress";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { createSignedUrl } from "@/lib/storage-utils";
import { OutputGrid } from "@/components/generation/OutputGrid";
import { OutputLightbox } from "@/components/generation/OutputLightbox";
import { downloadMultipleOutputs } from "@/lib/download-utils";

// Group type definition
type CreationGroup = "image_editing" | "prompt_to_image" | "prompt_to_video" | "image_to_video" | "prompt_to_audio";

// Group configuration
const CREATION_GROUPS = [
  { id: "image_editing" as CreationGroup, label: "Image Editing", icon: "🎨", description: "Modify existing images" },
  { id: "prompt_to_image" as CreationGroup, label: "Prompt to Image", icon: "🖼️", description: "Generate images from text" },
  { id: "prompt_to_video" as CreationGroup, label: "Prompt to Video", icon: "🎬", description: "Generate videos from text" },
  { id: "image_to_video" as CreationGroup, label: "Image to Video", icon: "🎞️", description: "Animate images into videos" },
  { id: "prompt_to_audio" as CreationGroup, label: "Prompt to Audio", icon: "🎵", description: "Generate audio from text" },
];


const CustomCreation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pickImage, pickMultipleImages, isLoading: cameraLoading, isNative } = useNativeCamera();
  const [selectedGroup, setSelectedGroup] = useState<CreationGroup>(() => {
    const saved = localStorage.getItem('customCreation_selectedGroup');
    return (saved as CreationGroup) || "prompt_to_image";
  });

  const { data: allModels, isLoading: modelsLoading } = useModels();
  const { generate, isGenerating, error, clearError } = useGeneration();
  const [prompt, setPrompt] = useState("");
  const [contentType, setContentType] = useState<"image" | "video" | "music" | "text">("image");
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [resolution, setResolution] = useState<"Native" | "HD">("Native");
  const [generatedOutput, setGeneratedOutput] = useState<string | null>(null);
  const [estimatedTokens, setEstimatedTokens] = useState(50);
  const [advancedOpen, setAdvancedOpen] = useState(() => {
    const saved = localStorage.getItem('customCreation_advancedOpen');
    return saved === 'true';
  });
  const advancedOptionsRef = useRef<HTMLDivElement>(null);
  const [enhancePrompt, setEnhancePrompt] = useState(false);

  useEffect(() => {
    localStorage.setItem('customCreation_selectedGroup', selectedGroup);
  }, [selectedGroup]);

  useEffect(() => {
    localStorage.setItem('customCreation_advancedOpen', advancedOpen.toString());
    // Auto-scroll to Advanced Options when opened on mobile
    if (advancedOpen && advancedOptionsRef.current && window.innerWidth < 768) {
      setTimeout(() => {
        advancedOptionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [advancedOpen]);
  const [generateCaption, setGenerateCaption] = useState(false);
  const [captionData, setCaptionData] = useState<{
    caption: string;
    hashtags: string[];
    generated_at: string;
  } | null>(null);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [localGenerating, setLocalGenerating] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [modelParameters, setModelParameters] = useState<Record<string, any>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pollingGenerationId, setPollingGenerationId] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [generatedOutputs, setGeneratedOutputs] = useState<Array<{
    id: string;
    storage_path: string;
    output_index: number;
  }>>([]);
  const [selectedOutputIndex, setSelectedOutputIndex] = useState<number>(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const generationStartTimeRef = useRef<number | null>(null);
  const [generationCompleteTime, setGenerationCompleteTime] = useState<number | null>(null);
  const { progress, updateProgress, markComplete, dismiss, setFirstGeneration } = useOnboarding();
  const [showConfetti, setShowConfetti] = useState(false);
  const outputSectionRef = useRef<HTMLDivElement>(null);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [hashtagsExpanded, setHashtagsExpanded] = useState(false);

  // Filter models by selected group
  const filteredModels = allModels?.filter(model => {
    const groups = model.groups as string[] || [];
    return groups.includes(selectedGroup);
  }).sort((a, b) => a.base_token_cost - b.base_token_cost) || [];

  // Helper function to get required fields from model schema
  const getSchemaRequiredFields = (): string[] => {
    if (!selectedModel) return [];
    const currentModel = filteredModels.find(m => m.record_id === selectedModel);
    return currentModel?.input_schema?.required || [];
  };

  // Dynamically detect image field from schema
  const getImageFieldInfo = (): { fieldName: string | null; isRequired: boolean; isArray: boolean; maxImages: number } => {
    if (!selectedModel) return { fieldName: null, isRequired: false, isArray: false, maxImages: 0 };
    
    const currentModel = filteredModels.find(m => m.record_id === selectedModel);
    if (!currentModel?.input_schema?.properties) return { fieldName: null, isRequired: false, isArray: false, maxImages: 0 };
    
    const properties = currentModel.input_schema.properties;
    const required = currentModel.input_schema.required || [];
    
    // Look for image-like fields
    const imageFieldNames = ['inputImage', 'image_urls', 'imageUrl', 'image_url', 'image', 'images', 'filesUrl', 'filesURL', 'file_urls', 'fileUrls', 'reference_image_urls'];
    for (const fieldName of imageFieldNames) {
      if (properties[fieldName]) {
        const schema = properties[fieldName];
        const isArray = schema.type === 'array';
        const isRequired = required.includes(fieldName);
        const maxImages = currentModel.max_images ?? 0;
        return { fieldName, isRequired, isArray, maxImages };
      }
    }
    
    return { fieldName: null, isRequired: false, isArray: false, maxImages: 0 };
  };

  const imageFieldInfo = getImageFieldInfo();
  const isImageRequired = imageFieldInfo.isRequired;
  const imageFieldName = imageFieldInfo.fieldName;
  const isImageArray = imageFieldInfo.isArray;
  const maxImages = imageFieldInfo.maxImages;

  // Check schema requirements for main form fields
  const schemaRequired = getSchemaRequiredFields();
  const isPromptRequiredBySchema = schemaRequired.includes('prompt');

  // Get current model schema
  const currentModelForSchema = filteredModels.find(m => m.record_id === selectedModel);
  const modelSchema = currentModelForSchema?.input_schema;

  // Use only schema-based requirements
  const isPromptRequired = isPromptRequiredBySchema;
  const [generatingSurprise, setGeneratingSurprise] = useState(false);

  // Determine max prompt length based on model and customMode
  const getMaxPromptLength = (): number => {
    if (!selectedModel) return 5000;
    
    const currentModel = filteredModels.find(m => m.record_id === selectedModel);
    if (!currentModel) return 5000;
    
    // Check if this is a Kie.ai audio model with customMode false
    const isKieAiAudio = currentModel.provider === 'kie_ai' && currentModel.content_type === 'audio';
    const customMode = modelParameters.customMode;
    
    // Kie.ai audio in non-custom mode has 500 char limit
    if (isKieAiAudio && customMode === false) {
      return 500;
    }
    
    // Default limit for all other cases
    return 5000;
  };

  const maxPromptLength = getMaxPromptLength();

  // Truncate prompt if it exceeds the new limit when model/parameters change
  useEffect(() => {
    if (prompt.length > maxPromptLength) {
      setPrompt(prompt.slice(0, maxPromptLength));
      toast.info(`Prompt truncated to ${maxPromptLength} characters for this model configuration`);
    }
  }, [maxPromptLength]); // Only depend on maxPromptLength, not prompt

  useEffect(() => {
    document.title = "Custom Creation Studio - artifio.ai";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Create custom AI-generated content with advanced controls and fine-tuning options.');
    }
  }, []);


  // Auto-save on state changes


  // Polling function to check generation status
  const pollGenerationStatus = async (generationId: string) => {
    try {
      // Fetch parent generation
      const { data: parentData, error: parentError } = await supabase
        .from('generations')
        .select('id, status, storage_path, type, output_index, is_batch_output')
        .eq('id', generationId)
        .single();

      if (parentError) throw parentError;

      // Check if generation is complete or failed
      if (parentData.status === 'completed' || parentData.status === 'failed') {
        // Stop polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setPollingGenerationId(null);
        setLocalGenerating(false);

        if (parentData.status === 'failed') {
          // Fetch the full generation to get error details
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
            id: 'generation-progress',
            duration: 8000
          });
        } else if (parentData.status === 'completed') {
          // Fetch all child outputs (if any)
          const { data: childrenData } = await supabase
            .from('generations')
            .select('id, storage_path, output_index')
            .eq('parent_generation_id', generationId)
            .order('output_index', { ascending: true });

          // Update onboarding progress for first generation
          if (progress && !progress.checklist.completedFirstGeneration) {
            updateProgress({ completedFirstGeneration: true });
            setFirstGeneration(generationId);
            setShowConfetti(true);
          }

          // Track onboarding: viewedResult
          if (progress && !progress.checklist.viewedResult) {
            updateProgress({ viewedResult: true });
          }

          // Combine parent + children
          const allOutputs = [
            {
              id: parentData.id,
              storage_path: parentData.storage_path,
              output_index: 0
            },
            ...(childrenData || [])
          ];

          setGeneratedOutputs(allOutputs);
          setGeneratedOutput(parentData.storage_path); // For backward compat
          setGenerationCompleteTime(Date.now());
          
          // Auto-scroll to output section on mobile
          setTimeout(() => {
            if (outputSectionRef.current && window.innerWidth < 1024) {
              outputSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 300);
          
          toast.success('✨ Your creation is ready!', { 
            id: 'generation-progress',
            description: `${allOutputs.length} output${allOutputs.length > 1 ? 's' : ''} generated successfully`
          });

          // Generate caption if checkbox was checked
          if (generateCaption && allOutputs.length > 0) {
            const firstOutput = allOutputs[0];
            setIsGeneratingCaption(true);
            
            try {
              const selectedModelData = filteredModels.find(m => m.record_id === selectedModel);
              const { data: captionResult, error: captionError } = await supabase.functions.invoke('generate-caption', {
                body: {
                  generation_id: firstOutput.id,
                  prompt: prompt,
                  content_type: selectedModelData?.content_type || 'image',
                  model_name: selectedModelData?.model_name || 'AI Model'
                }
              });
              
              if (captionError) throw captionError;
              
              setCaptionData({
                caption: captionResult.caption,
                hashtags: captionResult.hashtags,
                generated_at: captionResult.generated_at
              });
              
              toast.success("Caption and hashtags generated!");
            } catch (err) {
              console.error("Caption generation failed:", err);
              toast.error("Failed to generate caption. Your content is ready though!");
            } finally {
              setIsGeneratingCaption(false);
            }
          }
        } else {
          // Generation failed - dismiss loading toast
          toast.dismiss('generation-progress');
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  };

  // Start polling after generation request with optimized intervals
  useEffect(() => {
    if (pollingGenerationId) {
      const startTime = Date.now();
      const MAX_POLLING_DURATION = 20 * 60 * 1000; // 20 minutes
      
      let currentInterval = 5000; // Start with 5s
      
      const pollWithDynamicInterval = () => {
        const elapsed = Date.now() - startTime;
        
        // Stop if exceeded max duration
        if (elapsed >= MAX_POLLING_DURATION) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setPollingGenerationId(null);
          setLocalGenerating(false);
          toast.info('Generation is taking longer than expected. Check History for updates.', { 
            id: 'generation-progress' 
          });
          return;
        }
        
        // Adjust interval based on elapsed time
        let newInterval = currentInterval;
        if (elapsed < 2 * 60 * 1000) {
          // First 2 minutes: 5s interval
          newInterval = 5000;
        } else if (elapsed < 5 * 60 * 1000) {
          // 2-5 minutes: 15s interval
          newInterval = 15000;
        } else {
          // After 5 minutes: 30s interval
          newInterval = 30000;
        }
        
        // If interval changed, restart with new interval
        if (newInterval !== currentInterval) {
          currentInterval = newInterval;
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = setInterval(pollWithDynamicInterval, currentInterval);
          }
        }
        
        pollGenerationStatus(pollingGenerationId);
      };
      
      // Initial immediate poll
      pollGenerationStatus(pollingGenerationId);
      
      // Set up interval
      pollIntervalRef.current = setInterval(pollWithDynamicInterval, currentInterval);
      
      // Cleanup on unmount
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }
  }, [pollingGenerationId]);

  // Reset model selection when group changes
  useEffect(() => {
    setSelectedModel(null);
  }, [selectedGroup]);

  // Track onboarding: selectedTemplate
  useEffect(() => {
    if (selectedModel && progress && !progress.checklist.selectedTemplate) {
      updateProgress({ selectedTemplate: true });
    }
  }, [selectedModel, progress, updateProgress]);

  // Track onboarding: enteredPrompt
  useEffect(() => {
    if (prompt.length > 10 && progress && !progress.checklist.enteredPrompt) {
      updateProgress({ enteredPrompt: true });
    }
  }, [prompt, progress, updateProgress]);

  // Track onboarding: viewedTokenCost
  useEffect(() => {
    if (estimatedTokens > 0 && progress && !progress.checklist.viewedTokenCost) {
      updateProgress({ viewedTokenCost: true });
    }
  }, [estimatedTokens, progress, updateProgress]);

  // Auto-select first model when filtered models change
  useEffect(() => {
    if (filteredModels.length > 0 && !selectedModel) {
      setSelectedModel(String(filteredModels[0].record_id));
    }
  }, [filteredModels, selectedModel]);

  // Initialize schema defaults into modelParameters when model changes
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Get current model's max_images limit
    const currentModel = filteredModels.find(m => m.record_id === selectedModel);
    const modelMaxImages = currentModel?.max_images ?? 0;
    
    // If max_images is 0, don't allow uploads
    if (modelMaxImages === 0) {
      toast.error("This model does not accept image uploads");
      return;
    }
    
    // Determine effective max images
    let effectiveMax = modelMaxImages;
    
    // For single image fields, max is 1
    if (!isImageArray && imageFieldName) {
      effectiveMax = 1;
    }
    
    // Check if adding files would exceed limit
    if (uploadedImages.length + files.length > effectiveMax) {
      if (effectiveMax === 1) {
        // Single image: replace existing
        toast.info("Replacing existing image");
        setUploadedImages([]); // Clear existing
      } else {
        toast.error(`Maximum ${effectiveMax} image(s) allowed for this model`);
        return;
      }
    }
    
    const validFiles: File[] = [];
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" is too large (max 10MB)`);
        continue;
      }
      
      if (!validTypes.includes(file.type)) {
        toast.error(`"${file.name}" has invalid type. Only JPEG, PNG, and WebP allowed.`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    if (validFiles.length > 0) {
      // For single image, replace; for array, append
      if (effectiveMax === 1) {
        setUploadedImages(validFiles.slice(0, 1));
      } else {
        setUploadedImages([...uploadedImages, ...validFiles]);
      }
      toast.success(`${validFiles.length} image(s) uploaded successfully`);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    // Validate prompt requirement
    if (isPromptRequired && !prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    
    // Validate prompt length
    if (prompt.trim().length > maxPromptLength) {
      toast.error(`Prompt must be less than ${maxPromptLength} characters`);
      return;
    }
    
    // Validate image requirement
    if (isImageRequired && uploadedImages.length === 0) {
      toast.error("Please upload at least one image for this creation type");
      return;
    }

    // Validate model selection
    if (!selectedModel) {
      toast.error("Please select a model");
      return;
    }

      // Validate required fields from model schema (advanced options)
    const currentModel = filteredModels.find(m => m.record_id === selectedModel);
    if (currentModel?.input_schema) {
      const requiredFields = currentModel.input_schema.required || [];
      const schemaProperties = currentModel.input_schema.properties || {};
      const excludeFields = ['prompt', 'inputImage', 'image_urls', 'imageUrl', 'image_url', 'image', 'images', 'filesUrl', 'fileUrls', 'reference_image_urls']; // Already validated above

      for (const field of requiredFields) {
        if (excludeFields.includes(field)) continue;
        
        const value = modelParameters[field];
        if (value === undefined || value === null || value === '') {
          const fieldTitle = schemaProperties[field]?.title || field;
          toast.error(`Please provide a value for: ${fieldTitle}`);
          return;
        }
      }
    }

    if (!user?.id) {
      toast.error("Please sign in to upload images");
      return;
    }
    
    // Reset generation tracking
    generationStartTimeRef.current = Date.now();
    setGenerationCompleteTime(null);
    setGeneratedOutput(null);
    
    setLocalGenerating(true);
    
    try {
      // Build customParameters, filtering out conditional fields whose dependencies aren't met
      const customParameters: Record<string, any> = {};
      const currentModel = filteredModels.find(m => m.record_id === selectedModel);
      const inputSchema = (currentModel as any)?.input_schema;
      const conditionalFields = inputSchema?.conditionalFields || {};

      // Add all parameters from modelParameters, but exclude conditional ones whose deps aren't satisfied
      for (const [key, value] of Object.entries(modelParameters)) {
        const fieldConfig = conditionalFields[key];
        
        // If field has dependencies, check if they're satisfied
        if (fieldConfig?.dependsOn) {
          let shouldInclude = true;
          for (const [depKey, depValue] of Object.entries(fieldConfig.dependsOn)) {
            if (modelParameters[depKey] !== depValue) {
              shouldInclude = false;
              break;
            }
          }
          if (!shouldInclude) {
            console.log(`Excluding conditional parameter '${key}' because dependencies not met:`, fieldConfig.dependsOn);
            continue; // Skip this parameter
          }
        }
        
        customParameters[key] = value;
      }

      // Ensure customMode has explicit default if undefined
      if (inputSchema?.properties?.customMode && customParameters.customMode === undefined) {
        customParameters.customMode = false;
      }

      console.log('Final custom parameters after filtering:', customParameters);

      // Upload images to storage if required
      if (imageFieldName && uploadedImages.length > 0) {
        const timestamp = Date.now();
        const imageUrls: string[] = [];

        for (let i = 0; i < uploadedImages.length; i++) {
          const file = uploadedImages[i];
          const fileExt = file.name.split('.').pop();
          const filePath = `${user?.id}/uploads/${timestamp}/${i}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('generated-content')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            toast.error(`Failed to upload image: ${file.name}`);
            console.error('Upload error:', uploadError);
            return;
          }

          // Generate signed URL for secure access (valid for 1 hour)
          const { data: signedData, error: signedError } = await supabase.storage
            .from('generated-content')
            .createSignedUrl(filePath, 3600);

          if (signedError || !signedData) {
            toast.error(`Failed to create secure URL for: ${file.name}`);
            console.error('Signed URL error:', signedError);
            return;
          }

          imageUrls.push(signedData.signedUrl);
        }

        // Set parameter based on field type (single string or array)
        if (isImageArray) {
          customParameters[imageFieldName] = imageUrls;
        } else {
          customParameters[imageFieldName] = imageUrls[0]; // Single image
        }
        console.log(`Uploaded images to ${imageFieldName}:`, isImageArray ? imageUrls : imageUrls[0]);
      }

      console.log('Generation payload:', {
        model_record_id: selectedModel,
        prompt: prompt.trim(),
        custom_parameters: customParameters
      });

      const result = await generate({
        model_record_id: selectedModel,
        prompt: prompt.trim(),
        custom_parameters: customParameters,
        enhance_prompt: enhancePrompt,
      });


      // Start polling using normalized ID
      const genId = result?.id || result?.generation_id;
      if (genId) {
        setPollingGenerationId(genId);
      }

      if (result?.output_url) {
        setGeneratedOutput(result.output_url);
        setGenerationCompleteTime(Date.now());
        toast.success('Generation complete!', { id: 'generation-progress' });
      }
    } catch (error: any) {
      // Handle SESSION_EXPIRED error specifically
      if (error.message === "SESSION_EXPIRED") {
        toast.error("Session expired", {
          description: "Please log in again. Your work has been saved.",
          duration: 5000
        });
        setTimeout(() => {
          navigate("/auth");
        }, 2000);
        return;
      }
      
      console.error('Generation error:', error);
      generationStartTimeRef.current = null;
      // Error already handled in useGeneration hook
    } finally {
      setLocalGenerating(false);
    }
  };

  const calculateTokens = () => {
    if (!selectedModel || !filteredModels) return 50;

    const currentModel = filteredModels.find(m => m.record_id === selectedModel);
    if (!currentModel) return 50;

    let tokens = currentModel.base_token_cost;
    const multipliers = currentModel.cost_multipliers || {};
    
    for (const [paramName, multiplierConfig] of Object.entries(multipliers)) {
      const paramValue = modelParameters[paramName];
      
      if (paramValue === undefined || paramValue === null) continue;
      
      // Handle nested object (parameter-first structure)
      // Example: { "quality": { "Standard": 1, "HD": 1.5 } }
      if (typeof multiplierConfig === 'object' && !Array.isArray(multiplierConfig)) {
        // Get multiplier for the specific value, default to 1 if not defined
        const multiplier = multiplierConfig[paramValue] ?? 1;
        if (typeof multiplier === 'number') {
          tokens *= multiplier;
        }
      }
      // Legacy: Handle flat number (for backward compatibility)
      else if (typeof multiplierConfig === 'number') {
        if (typeof paramValue === 'boolean' && paramValue === true) {
          tokens *= multiplierConfig;
        }
        else if (Array.isArray(paramValue)) {
          tokens += (multiplierConfig * paramValue.length);
        }
        else if (typeof paramValue === 'number') {
          tokens += (multiplierConfig * paramValue);
        }
      }
    }
    
    // Legacy: Add cost for uploaded images if multiplier exists
    if (uploadedImages.length > 0 && multipliers.uploaded_image) {
      tokens += uploadedImages.length * multipliers.uploaded_image;
    }
    
    return Math.ceil(tokens);
  };

  useEffect(() => {
    let baseTokens = calculateTokens();
    if (generateCaption) {
      baseTokens += 8; // Add caption generation cost
    }
    setEstimatedTokens(baseTokens);
  }, [selectedModel, modelParameters, uploadedImages, selectedGroup, filteredModels, generateCaption]);

  const handleResetConfirm = () => {
    setPrompt("");
    setUploadedImages([]);
    setGeneratedOutput(null);
    setResolution("Native");
    setModelParameters({});
    setCaptionData(null);
    setGenerateCaption(false);
    setShowResetDialog(false);
    toast.success("Reset complete");
  };

  const handleSurpriseMe = async () => {
    setGeneratingSurprise(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-random-prompt', {
        body: { contentType: contentType }
      });

      if (error) throw error;

      if (data?.prompt) {
        setPrompt(data.prompt);
        toast.success("Unique prompt generated!");
      } else {
        throw new Error("No prompt returned");
      }
    } catch (error) {
      console.error('Surprise me error:', error);
      toast.error("Failed to generate prompt. Please try again.");
    } finally {
      setGeneratingSurprise(false);
    }
  };

  // Show empty state immediately if no models
  if (!modelsLoading && (!allModels || allModels.length === 0)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-4xl font-black mb-4">NO MODELS AVAILABLE</h2>
          <p className="text-lg text-muted-foreground">Please contact your administrator to add AI models.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="relative z-10 container mx-auto px-4 py-4 md:py-8">
        <SessionWarning />
        
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-black mb-2">CREATION STUDIO</h1>
          <p className="text-sm md:text-base text-foreground/80 font-medium">
            Choose your creation type and fine-tune every detail
          </p>
        </div>

        {/* Group Selection */}
        <div className="mb-6">
          <h2 className="text-base md:text-lg font-bold mb-3">Select Creation Type</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {CREATION_GROUPS.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                className={cn(
                  "p-3 md:p-4 rounded-xl transition-all duration-200 flex items-center gap-3",
                  selectedGroup === group.id
                    ? "bg-primary-500 border-2 border-primary/30 ring-2 ring-primary/20 shadow-sm text-neutral-900 font-bold"
                    : "bg-neutral-100 border border-gray-200 text-neutral-600 hover:bg-neutral-200 hover:text-secondary-700 hover:border-gray-300 shadow-sm hover:shadow-md"
                )}
              >
                <span className="text-2xl md:text-3xl">{group.icon}</span>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-xs md:text-sm">{group.label}</span>
                  <span className="text-[10px] md:text-xs opacity-70 hidden md:block">{group.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Mobile-First Layout - Stacked vertically on mobile, side-by-side on desktop */}
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12">
          {/* Input Panel */}
          <Card className="bg-card border border-gray-200 shadow-sm rounded-xl order-1">
            <div className="border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 bg-muted/30">
              <h2 className="text-base md:text-lg font-bold">Input</h2>
            </div>

            <div className="p-4 md:p-8 space-y-6 pb-32 md:pb-8">
              {/* Model Selection */}
              {filteredModels.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">AI Model</label>
                  <Select
                    value={selectedModel || undefined}
                    onValueChange={(value) => setSelectedModel(value)}
                  >
                    <SelectTrigger className="w-full h-auto py-3 px-4 bg-background border border-gray-200 hover:border-gray-300 shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 rounded-lg font-bold">
                      <SelectValue placeholder="Select a model...">
                        {selectedModel && (() => {
                          const model = filteredModels.find(m => String(m.record_id) === selectedModel);
                          if (!model) return null;
                          return (
                            <div className="flex items-center justify-between w-full">
                              <span className="font-bold text-sm">{model.model_name}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {model.base_token_cost} tokens
                                </Badge>
                                {model.estimated_time_seconds !== null && model.estimated_time_seconds !== undefined && (
                                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    ~{formatEstimatedTime(model.estimated_time_seconds)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-gray-200 shadow-lg rounded-lg z-50 max-w-[calc(100vw-2rem)] max-h-[60vh] overflow-y-auto">
                      {filteredModels.map((model) => {
                        const modelGroups = (model.groups as string[]) || [];
                        const otherGroups = modelGroups.filter(g => g !== selectedGroup);
                        const isSelected = String(selectedModel) === String(model.record_id);
                        
                        return (
                          <SelectItem
                            key={String(model.record_id)}
                            value={String(model.record_id)}
                            className={cn(
                              "cursor-pointer py-3 px-2 md:px-4 border-2 my-1 mx-1 rounded transition-all !pl-2 md:!pl-3 !pr-2 md:!pr-3 [&>span.absolute.left-2]:hidden",
                              isSelected
                                ? "bg-primary-500 hover:bg-primary-600 text-neutral-900 font-bold border-black"
                                : "hover:bg-muted border-border"
                            )}
                          >
                            <div className="w-full min-w-0">
                              <div className="flex items-center justify-between w-full gap-2 md:gap-4">
                                <span className="font-bold text-xs md:text-sm flex-shrink min-w-0 truncate">{model.model_name}</span>
                                <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                                  <Badge variant="secondary" className="text-[10px] md:text-xs whitespace-nowrap">
                                    {model.base_token_cost} tokens
                                  </Badge>
                                  {model.estimated_time_seconds !== null && model.estimated_time_seconds !== undefined && (
                                    <Badge variant="secondary" className="text-[10px] md:text-xs flex items-center gap-0.5 md:gap-1 whitespace-nowrap">
                                      <Clock className="h-2.5 md:h-3 w-2.5 md:w-3" />
                                      ~{formatEstimatedTime(model.estimated_time_seconds)}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {otherGroups.length > 0 && (
                                <div className="mt-1">
                                  <span className={cn(
                                    "text-[10px] md:text-xs",
                                    isSelected ? "text-white/60" : "text-muted-foreground/60"
                                  )}>
                                    Also in: {otherGroups.map(g => 
                                      CREATION_GROUPS.find(cg => cg.id === g)?.label
                                    ).join(", ")}
                                  </span>
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {filteredModels.length === 0 && !modelsLoading && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No models available for this creation type</p>
                </div>
              )}

              {/* Prompt - Only show if prompt field exists in schema */}
              {modelSchema?.properties?.prompt && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      Prompt {isPromptRequired && <span className="text-destructive">*</span>}
                    </label>
                    <div className="flex gap-2">
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={handleSurpriseMe}
                         className="h-10 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white font-bold border border-gray-200 shadow-sm hover:shadow-md hover:opacity-90 transition-all"
                         disabled={localGenerating || isGenerating || generatingSurprise || !!pollingGenerationId}
                       >
                        {generatingSurprise ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 mr-1" />
                            Surprise Me
                          </>
                        )}
                      </Button>
                       <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEnhancePrompt(!enhancePrompt)}
                        className={cn(
                          "h-10 transition-all font-bold",
                          enhancePrompt 
                            ? "bg-primary-500 text-neutral-900 hover:bg-primary-600 ring-2 ring-primary/20 border border-primary/30" 
                            : "bg-white text-neutral-700 hover:bg-neutral-100 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300"
                        )}
                      >
                        {enhancePrompt ? "✓ " : ""}Enhance
                      </Button>
                    </div>
                  </div>
                  
                  {/* Generate Caption Checkbox */}
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="generate-caption"
                      checked={generateCaption}
                      onCheckedChange={(checked) => setGenerateCaption(checked as boolean)}
                      disabled={localGenerating || isGenerating || !!pollingGenerationId}
                    />
                    <label 
                      htmlFor="generate-caption" 
                      className="text-sm font-medium cursor-pointer flex items-center gap-1"
                    >
                      Generate caption & hashtags 
                      <Badge variant="secondary" className="text-xs">+8 tokens</Badge>
                    </label>
                  </div>
                  
                   <Textarea
                     value={prompt}
                     onChange={(e) => setPrompt(e.target.value)}
                     placeholder="Describe what you want to create..."
                     className="min-h-[160px] md:min-h-[180px] resize-none text-sm md:text-base"
                     disabled={localGenerating || isGenerating || !!pollingGenerationId}
                     required={isPromptRequired}
                     maxLength={maxPromptLength}
                   />
                  <div className="flex justify-between items-center">
                    {maxPromptLength === 500 && (
                      <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400">
                        <Info className="h-3.5 w-3.5" />
                        <span className="font-medium">Non-custom mode limit</span>
                      </div>
                    )}
                    <span className={cn(
                      "text-xs ml-auto",
                      prompt.length > maxPromptLength ? "text-destructive font-medium" : "text-muted-foreground"
                    )}>
                      {prompt.length} / {maxPromptLength} characters
                    </span>
                  </div>
                </div>
              )}


              {/* Image Upload - Native camera support on mobile */}
              {imageFieldName && maxImages > 0 && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    {maxImages === 1 ? 'Image' : 'Images'} {isImageRequired && <span className="text-destructive">*</span>}
                  </label>

                  {uploadedImages.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 md:p-3 border rounded-lg bg-muted/30">
                      <div className="w-16 h-16 md:w-20 md:h-20 border rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img src={URL.createObjectURL(file)} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs md:text-sm flex-1 truncate">File {index + 1}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeImage(index)} className="h-8 text-xs">
                        Remove
                      </Button>
                    </div>
                  ))}

                  {/* Native camera buttons (mobile) or file input (web) */}
                  {isNative ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={async () => {
                          const file = await pickImage('camera');
                          if (file) {
                            handleFileUpload({ target: { files: [file] } } as any);
                            await triggerHaptic('light');
                          }
                        }}
                        disabled={cameraLoading || (maxImages ? uploadedImages.length >= maxImages : false)}
                        className="w-full border-dashed h-11"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Camera
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          if (maxImages === 1) {
                            const file = await pickImage('gallery');
                            if (file) {
                              handleFileUpload({ target: { files: [file] } } as any);
                              await triggerHaptic('light');
                            }
                          } else {
                            const files = await pickMultipleImages(maxImages - uploadedImages.length);
                            if (files.length > 0) {
                              handleFileUpload({ target: { files } } as any);
                              await triggerHaptic('light');
                            }
                          }
                        }}
                        disabled={cameraLoading || (maxImages ? uploadedImages.length >= maxImages : false)}
                        className="w-full border-dashed h-11"
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Gallery
                      </Button>
                    </div>
                  ) : (
                    <>
                      <input ref={fileInputRef} type="file" accept="image/*" multiple={maxImages !== 1} onChange={handleFileUpload} className="hidden" />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={maxImages ? uploadedImages.length >= maxImages : false}
                        className="w-full border-dashed h-11 md:h-10"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {maxImages === 1 
                          ? `Upload Image ${uploadedImages.length > 0 ? '(Replace)' : ''}` 
                          : maxImages 
                            ? `Add Images (${uploadedImages.length}/${maxImages})` 
                            : `Add Images (${uploadedImages.length})`
                        }
                      </Button>
                    </>
                  )}
                  
                  {isImageRequired && uploadedImages.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      This model requires at least one image
                    </p>
                  )}
                </div>
              )}


              {/* Collapsible Advanced Options */}
              <div ref={advancedOptionsRef}>
                <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full h-14 md:h-10 border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all"
                    >
                      <span className="font-semibold">Advanced Options</span>
                      <ChevronRight className={`h-4 w-4 ml-auto transition-transform ${advancedOpen ? 'rotate-90' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 mt-4">
                  {/* Dynamic Model Parameters */}
                  {selectedModel && filteredModels && (() => {
                    const currentModel = filteredModels.find(m => m.record_id === selectedModel);
                    return currentModel?.input_schema ? (
                      <ModelParameterForm
                        modelSchema={currentModel.input_schema}
                        onChange={setModelParameters}
                        currentValues={modelParameters}
                        excludeFields={['prompt', 'inputImage', 'image_urls', 'imageUrl', 'image_url', 'image', 'images', 'filesUrl', 'fileUrls', 'reference_image_urls']}
                      />
                    ) : (
                      // Legacy Resolution fallback if no schema
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Resolution</label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={resolution === "Native" ? "default" : "outline"}
                            onClick={() => setResolution("Native")}
                            className="h-11 md:h-10"
                          >
                            Native
                          </Button>
                          <Button
                            variant={resolution === "HD" ? "default" : "outline"}
                            onClick={() => setResolution("HD")}
                            className="h-11 md:h-10"
                          >
                            HD
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </CollapsibleContent>
              </Collapsible>
              </div>

               {/* Action Buttons */}
               <div className="hidden md:flex flex-col gap-2">
                 <Button 
                   onClick={handleGenerate} 
                   disabled={
                     localGenerating || 
                     isGenerating || 
                     !!pollingGenerationId ||
                     !selectedModel || 
                     (isPromptRequired && !prompt.trim()) || 
                     (isImageRequired && uploadedImages.length === 0)
                   }
                   size="lg"
                   className="w-full h-12 md:h-11 text-base font-bold bg-primary-500 hover:bg-primary-600 text-neutral-900 border-2 border-primary-600 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40"
                   title={pollingGenerationId ? "Generation in progress - please wait for it to complete" : ""}
                 >
                   {(localGenerating || isGenerating || pollingGenerationId) ? (
                     <>
                       <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                       {pollingGenerationId ? 'Processing...' : 'Generating...'}
                     </>
                    ) : (
                      <div className="flex flex-row items-center justify-center gap-2 md:gap-3 w-full md:relative">
                        <div className="flex items-center">
                          <Sparkles className="mr-2 h-5 w-5" />
                          Generate
                        </div>
                         <div className="flex items-center gap-1.5 bg-black/10 px-2.5 py-1 rounded md:absolute md:right-2">
                           <Coins className="h-4 w-4" />
                           <span className="text-sm font-bold">(-{estimatedTokens}<span className="hidden md:inline"> tokens</span>)</span>
                         </div>
                      </div>
                    )}
                 </Button>
                 {pollingGenerationId && (
                   <p className="text-xs text-muted-foreground text-center">
                     Please wait for the current generation to complete before starting a new one
                   </p>
                 )}
                 <Button
                  onClick={() => setShowResetDialog(true)} 
                  variant="outline" 
                  size="lg" 
                  className="w-full h-11 md:h-10"
                  disabled={localGenerating || isGenerating}
                >
                  Reset
                </Button>
              </div>
              
              {/* Mobile Sticky Generate Button */}
              <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] z-40 safe-area-padding-bottom">
                <Button 
                  onClick={handleGenerate} 
                  disabled={
                    localGenerating || 
                    isGenerating || 
                    !!pollingGenerationId ||
                    !selectedModel || 
                    (isPromptRequired && !prompt.trim()) || 
                    (isImageRequired && uploadedImages.length === 0)
                  }
                  size="lg"
                  className="w-full h-14 text-base font-bold bg-primary-500 hover:bg-primary-600 text-neutral-900 border-2 border-primary-600 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40"
                  title={pollingGenerationId ? "Generation in progress - please wait for it to complete" : ""}
                >
                  {(localGenerating || isGenerating || pollingGenerationId) ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {pollingGenerationId ? 'Processing...' : 'Generating...'}
                    </>
                  ) : (
                    <div className="flex items-center justify-center gap-2 w-full">
                      <Sparkles className="h-5 w-5" />
                      <span>Generate</span>
                      <div className="flex items-center gap-1.5 bg-black/10 px-2.5 py-1 rounded">
                        <Coins className="h-4 w-4" />
                        <span className="text-sm font-bold">-{estimatedTokens}</span>
                      </div>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Output Panel */}
          <Card ref={outputSectionRef} className="bg-card border border-gray-200 shadow-sm rounded-xl order-2">
            <div className="border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 bg-muted/30">
              <h2 className="text-base md:text-lg font-bold">Output</h2>
            </div>

            <div className="p-4 md:p-6">
              {(localGenerating || isGenerating || pollingGenerationId || generatedOutput) && generationStartTimeRef.current ? (
                <div className="space-y-4">
                  <Card className="border border-gray-200 shadow-sm bg-muted/50 rounded-xl">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          Feel free to navigate away - your generation will be saved in History
                        </p>
                      </div>

                      <GenerationProgress
                        startTime={generationStartTimeRef.current}
                        isComplete={!!generatedOutput}
                        completedAt={generationCompleteTime || undefined}
                      />

                      {generatedOutputs.length > 0 ? (
                        <div className="space-y-3 pt-2">
                          <OutputGrid
                            outputs={generatedOutputs}
                            contentType={selectedModel && filteredModels.find(m => m.record_id === selectedModel)?.content_type || "image"}
                            onSelectOutput={(index) => {
                              setSelectedOutputIndex(index);
                              setShowLightbox(true);
                            }}
                            onDownloadAll={async () => {
                              await downloadMultipleOutputs(
                                generatedOutputs,
                                selectedModel && filteredModels.find(m => m.record_id === selectedModel)?.content_type || "image",
                                () => {
                                  if (progress && !progress.checklist.downloadedResult) {
                                    updateProgress({ downloadedResult: true });
                                  }
                                }
                              );
                            }}
                          />

                          <OutputLightbox
                            outputs={generatedOutputs}
                            selectedIndex={selectedOutputIndex}
                            contentType={selectedModel && filteredModels.find(m => m.record_id === selectedModel)?.content_type || "image"}
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

                          {/* Action Buttons Row */}
                          {generatedOutputs.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 md:gap-3 animate-fade-in">
                              <Button
                                onClick={async () => {
                                  await downloadMultipleOutputs(
                                    generatedOutputs,
                                    selectedModel && filteredModels.find(m => m.record_id === selectedModel)?.content_type || "image",
                                    () => {
                                      if (progress && !progress.checklist.downloadedResult) {
                                        updateProgress({ downloadedResult: true });
                                      }
                                    }
                                  );
                                }}
                                className="w-full bg-primary-500 hover:bg-primary-600 text-neutral-900 font-bold border border-primary-600 shadow-sm hover:shadow-md transition-all"
                                size="default"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                              <Button
                                onClick={() => {
                                  // TODO: Implement share functionality
                                  toast.info("Share feature coming soon!");
                                }}
                                variant="outline"
                                className="w-full border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
                                size="default"
                              >
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </Button>
                            </div>
                          )}

                          {/* Caption & Hashtags Display */}
                          {captionData && (
                            <Card className="bg-muted/50 border border-gray-200 shadow-sm animate-fade-in">
                              <CardContent className="pt-6">
                                {/* Caption Section */}
                                <div className="mb-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                      <Sparkles className="h-4 w-4 text-primary" />
                                      Caption
                                    </h3>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        navigator.clipboard.writeText(captionData.caption);
                                        toast.success("Caption copied!");
                                      }}
                                      className="h-8 text-xs"
                                    >
                                      Copy
                                    </Button>
                                  </div>
                                  <div className="text-sm md:text-base bg-background p-4 rounded-md border border-gray-200 min-h-[120px]">
                                    {captionExpanded ? (
                                      <>
                                        <p className="whitespace-pre-wrap">{captionData.caption}</p>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setCaptionExpanded(false)}
                                          className="mt-2 h-9 px-4 text-xs text-primary hover:text-primary/80"
                                        >
                                          Show less
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <p className="line-clamp-4 whitespace-pre-wrap">{captionData.caption}</p>
                                        {captionData.caption.length > 150 && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setCaptionExpanded(true)}
                                            className="mt-2 h-9 px-4 text-xs text-primary hover:text-primary/80"
                                          >
                                            View full caption
                                          </Button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Hashtags Section */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold">
                                      Hashtags ({captionData.hashtags.length})
                                    </h3>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const hashtagText = captionData.hashtags.join(' ');
                                          navigator.clipboard.writeText(hashtagText);
                                          toast.success("All hashtags copied!");
                                        }}
                                        className="h-8 text-xs"
                                      >
                                        Copy All
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={async () => {
                                          setIsGeneratingCaption(true);
                                          try {
                                            const selectedModelData = filteredModels.find(m => m.record_id === selectedModel);
                                            const { data: captionResult, error: captionError } = await supabase.functions.invoke('generate-caption', {
                                              body: {
                                                generation_id: generatedOutputs[0].id,
                                                prompt: prompt,
                                                content_type: selectedModelData?.content_type || 'image',
                                                model_name: selectedModelData?.model_name || 'AI Model'
                                              }
                                            });
                                            
                                            if (captionError) throw captionError;
                                            
                                            setCaptionData({
                                              caption: captionResult.caption,
                                              hashtags: captionResult.hashtags,
                                              generated_at: captionResult.generated_at
                                            });
                                            
                                            toast.success("Caption regenerated!");
                                          } catch (err) {
                                            console.error("Caption regeneration failed:", err);
                                            toast.error("Failed to regenerate caption");
                                          } finally {
                                            setIsGeneratingCaption(false);
                                          }
                                        }}
                                        disabled={isGeneratingCaption}
                                        className="h-8 text-xs"
                                      >
                                        {isGeneratingCaption ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                                        Regenerate
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="bg-background p-3 rounded-md border border-gray-200">
                                    {hashtagsExpanded ? (
                                      <>
                                        <div className="flex flex-wrap gap-2">
                                          {captionData.hashtags.map((tag, idx) => (
                                            <Badge
                                              key={idx}
                                              variant="secondary"
                                              className="cursor-pointer hover:bg-primary/20 transition-colors"
                                              onClick={() => {
                                                navigator.clipboard.writeText(tag);
                                                toast.success(`Copied ${tag}`);
                                              }}
                                            >
                                              {tag}
                                            </Badge>
                                          ))}
                                        </div>
                                        {captionData.hashtags.length > 5 && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setHashtagsExpanded(false)}
                                            className="mt-2 h-7 text-xs text-primary hover:text-primary/80"
                                          >
                                            Show less
                                          </Button>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <div className="flex flex-wrap gap-2">
                                          {captionData.hashtags.slice(0, 5).map((tag, idx) => (
                                            <Badge
                                              key={idx}
                                              variant="secondary"
                                              className="cursor-pointer hover:bg-primary/20 transition-colors"
                                              onClick={() => {
                                                navigator.clipboard.writeText(tag);
                                                toast.success(`Copied ${tag}`);
                                              }}
                                            >
                                              {tag}
                                            </Badge>
                                          ))}
                                        </div>
                                        {captionData.hashtags.length > 5 && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setHashtagsExpanded(true)}
                                            className="mt-2 h-7 text-xs text-primary hover:text-primary/80"
                                          >
                                            Show all {captionData.hashtags.length} hashtags
                                          </Button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Generated {new Date(captionData.generated_at).toLocaleString()}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {isGeneratingCaption && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Generating caption and hashtags...
                            </div>
                          )}

                          <Button
                            onClick={() => navigate("/dashboard/history")}
                            variant="outline"
                            className="w-full border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
                            size="sm"
                          >
                            <History className="h-4 w-4 mr-2" />
                            View All in History
                          </Button>
                        </div>
                      ) : generatedOutput ? (
                        <div className="space-y-3 pt-2">
                          <div className="relative aspect-square bg-background rounded-lg overflow-hidden border">
                            <GenerationPreview
                              storagePath={generatedOutput}
                              contentType={selectedModel && filteredModels.find(m => m.record_id === selectedModel)?.content_type || "image"}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={async () => {
                                try {
                                  const { data } = await supabase.storage
                                    .from('generated-content')
                                    .createSignedUrl(generatedOutput, 60);
                                  if (data?.signedUrl) {
                                    const response = await fetch(data.signedUrl);
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    const extension = generatedOutput.split('.').pop() || 'file';
                                    a.download = `generation-${Date.now()}.${extension}`;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                    toast.success('Download started!');
                                  }
                                } catch (error) {
                                  toast.error('Failed to download');
                                }
                              }}
                              className="flex-1"
                              size="sm"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            <Button
                              onClick={() => navigate("/dashboard/history")}
                              className="flex-1"
                              size="sm"
                            >
                              <History className="h-4 w-4 mr-2" />
                              View in History
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center p-4 md:p-8">
                    <ImageIcon className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-sm md:text-base text-muted-foreground">
                      Your generated content will appear here
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>


        {/* Best Practices Section */}
        <Card className="bg-card border border-gray-200 shadow-sm rounded-xl">
          <div className="p-4 md:p-6">
            <h3 className="text-lg md:text-xl font-black mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              BEST PRACTICES
            </h3>
            <div className="grid md:grid-cols-2 gap-3 md:gap-4 text-sm">
              <div className="flex gap-3">
                <span className="font-bold text-black">01</span>
                <p className="text-foreground">Be specific and descriptive in your prompts for better results</p>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-black">02</span>
                <p className="text-foreground">Use the "Enhance" feature to automatically improve your prompts</p>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-black">03</span>
                <p className="text-foreground">Upload reference images to guide the AI's creative direction</p>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-black">04</span>
                <p className="text-foreground">Experiment with different models to find your perfect style</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Creation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all your inputs and uploaded images. If you generate again after resetting, 
              it will consume tokens. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetConfirm}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={error !== null} onOpenChange={(open) => !open && clearError()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generation Failed</AlertDialogTitle>
            <AlertDialogDescription>
              {error}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={clearError} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Onboarding Components */}
      {progress && !progress.isComplete && !progress.dismissed && (
        <OnboardingChecklist
          progress={progress}
          onComplete={markComplete}
          onDismiss={dismiss}
        />
      )}

      <SuccessConfetti
        trigger={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />
    </div>
  );
};

export default CustomCreation;
