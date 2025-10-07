import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ImageIcon, Upload, Coins, Sparkles, Download, History, Play, ChevronRight, Loader2, Clock } from "lucide-react";
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
import { useSignedUrl } from "@/hooks/useSignedUrl";

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

// Community creations data
const communityCreations = [
  {
    id: "CC-001",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop",
    contentType: "image",
    resolution: "HD",
    theme: "abstract",
    author: "Alex M.",
    likes: 342
  },
  {
    id: "CC-002",
    image: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=400&h=400&fit=crop",
    contentType: "image",
    resolution: "HD",
    theme: "cyberpunk",
    author: "Sarah K.",
    likes: 567
  },
  {
    id: "CC-003",
    image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=400&fit=crop",
    contentType: "image",
    resolution: "Native",
    theme: "fantasy",
    author: "Jordan P.",
    likes: 289
  },
  {
    id: "CC-004",
    image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=400&fit=crop",
    contentType: "image",
    resolution: "HD",
    theme: "anime",
    author: "Chris L.",
    likes: 891
  },
  {
    id: "CC-005",
    image: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=400&h=400&fit=crop",
    contentType: "image",
    resolution: "Native",
    theme: "realistic",
    author: "Emily R.",
    likes: 423
  },
  {
    id: "CC-006",
    image: "https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=400&h=400&fit=crop",
    contentType: "image",
    resolution: "Native",
    theme: "artistic",
    author: "Mike D.",
    likes: 678
  },
  {
    id: "CC-007",
    image: "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400&h=400&fit=crop",
    video: "https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_25fps.mp4",
    contentType: "video",
    resolution: "HD",
    theme: "abstract",
    author: "Taylor B.",
    likes: 534
  },
  {
    id: "CC-008",
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=400&fit=crop",
    video: "https://videos.pexels.com/video-files/6985001/6985001-uhd_2560_1440_25fps.mp4",
    contentType: "video",
    resolution: "HD",
    theme: "realistic",
    author: "Nina S.",
    likes: 756
  },
  {
    id: "CC-009",
    image: "https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?w=400&h=400&fit=crop",
    video: "https://videos.pexels.com/video-files/3141211/3141211-uhd_2560_1440_25fps.mp4",
    contentType: "video",
    resolution: "HD",
    theme: "fantasy",
    author: "David H.",
    likes: 412
  },
  {
    id: "CC-010",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
    contentType: "image",
    resolution: "HD",
    theme: "realistic",
    author: "Lisa W.",
    likes: 623
  },
  {
    id: "CC-011",
    image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop",
    contentType: "image",
    resolution: "HD",
    theme: "realistic",
    author: "Mark J.",
    likes: 489
  },
  {
    id: "CC-012",
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=400&fit=crop",
    contentType: "image",
    resolution: "Native",
    theme: "artistic",
    author: "Sophia T.",
    likes: 701
  },
];

const CustomCreation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedGroup, setSelectedGroup] = useState<CreationGroup>("prompt_to_image");
  const { data: allModels, isLoading: modelsLoading } = useModels();
  const { generate, isGenerating } = useGeneration();
  const [prompt, setPrompt] = useState("");
  const [contentType, setContentType] = useState<"image" | "video" | "music" | "text">("image");
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [resolution, setResolution] = useState<"Native" | "HD">("Native");
  const [generatedOutput, setGeneratedOutput] = useState<string | null>(null);
  const [estimatedTokens, setEstimatedTokens] = useState(50);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [localGenerating, setLocalGenerating] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [modelParameters, setModelParameters] = useState<Record<string, any>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pollingGenerationId, setPollingGenerationId] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Check schema requirements for main form fields
  const schemaRequired = getSchemaRequiredFields();
  const isImageRequiredBySchema = schemaRequired.includes('image_urls');
  const isPromptRequiredBySchema = schemaRequired.includes('prompt');

  // Use only schema-based requirements
  const isImageRequired = isImageRequiredBySchema;
  const isPromptRequired = isPromptRequiredBySchema || true; // Prompt is always required unless schema says otherwise

  const surprisePrompts = [
    "A majestic dragon soaring over a cyberpunk city at sunset",
    "An underwater palace made of coral and bioluminescent creatures",
    "A steampunk robot gardener tending to a garden of mechanical flowers",
    "A cosmic library floating in space with books made of stardust",
    "An ancient tree with doors to different magical realms in its trunk",
    "A futuristic marketplace on Mars with diverse alien species",
    "A mystical forest where the trees are made of crystalline ice",
    "A floating island city powered by giant wind turbines and solar panels",
    "An enchanted bakery where pastries come to life at midnight",
    "A retrofuturistic train traveling through a neon-lit tunnel",
  ];

  useEffect(() => {
    document.title = "Custom Creation Studio - Artifio.ai";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Create custom AI-generated content with advanced controls and fine-tuning options.');
    }
  }, []);

  // Polling function to check generation status
  const pollGenerationStatus = async (generationId: string) => {
    try {
      const { data, error } = await supabase
        .from('generations')
        .select('status, storage_path, type')
        .eq('id', generationId)
        .single();

      if (error) throw error;

      // Check if generation is complete or failed
      if (data.status === 'completed' || data.status === 'failed') {
        // Stop polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setPollingGenerationId(null);
        setLocalGenerating(false);

        if (data.status === 'completed') {
          setGeneratedOutput(data.storage_path);
          toast.success('Generation complete! Check your History for the result.');
        } else {
          toast.error('Generation failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  };

  // Start polling after generation request
  useEffect(() => {
    if (pollingGenerationId) {
      const startTime = Date.now();
      const MAX_POLLING_DURATION = 20 * 60 * 1000; // 20 minutes

      // Poll every 1 minute (60 seconds)
      pollIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed >= MAX_POLLING_DURATION) {
          // Stop polling after 20 minutes
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
          setPollingGenerationId(null);
          setLocalGenerating(false);
          toast.info('Generation is taking longer than expected. Check History for updates.');
          return;
        }

        pollGenerationStatus(pollingGenerationId);
      }, 60000); // 60 seconds = 1 minute

      // Initial check after 30 seconds
      setTimeout(() => pollGenerationStatus(pollingGenerationId), 30000);

      // Cleanup on unmount
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [pollingGenerationId]);

  // Reset model selection when group changes
  useEffect(() => {
    setSelectedModel(null);
  }, [selectedGroup]);

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
    
    // Check if current model is Google Nano Banana
    const currentModel = filteredModels.find(m => m.record_id === selectedModel);
    const isNanoBanana = currentModel?.model_name?.toLowerCase().includes('nano') || 
                         currentModel?.model_name?.toLowerCase().includes('banana') ||
                         currentModel?.id === 'google/gemini-2.5-flash-image-preview';
    
    // Apply 10 image limit only for Nano Banana model
    if (isNanoBanana && uploadedImages.length + files.length > 10) {
      toast.error("Maximum 10 images allowed for Google Nano Banana");
      return;
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
      setUploadedImages([...uploadedImages, ...validFiles]);
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
    if (prompt.trim().length > 5000) {
      toast.error("Prompt must be less than 5000 characters");
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
      const excludeFields = ['prompt', 'image_urls']; // Already validated above

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
    
    setLocalGenerating(true);
    
    try {
      // Use only schema-defined parameters
      const customParameters: Record<string, any> = {
        ...modelParameters
      };

      // Upload images to storage if required
      if (isImageRequired && uploadedImages.length > 0) {
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

        customParameters.image_urls = imageUrls;
        console.log('Uploaded images:', imageUrls);
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
      });

      // Start polling for status updates
      if (result?.id) {
        setPollingGenerationId(result.id);
      }

      if (result?.output_url) {
        setGeneratedOutput(result.output_url);
      }
      
      toast.success("Generation started! Check your History for updates.");
    } catch (error: any) {
      console.error('Generation error:', error);
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
    setEstimatedTokens(calculateTokens());
  }, [selectedModel, modelParameters, uploadedImages, selectedGroup, filteredModels]);

  const handleResetConfirm = () => {
    setPrompt("");
    setUploadedImages([]);
    setGeneratedOutput(null);
    setResolution("Native");
    setModelParameters({});
    setShowResetDialog(false);
    toast.success("Reset complete");
  };

  const handleSurpriseMe = () => {
    const randomPrompt = surprisePrompts[Math.floor(Math.random() * surprisePrompts.length)];
    setPrompt(randomPrompt);
    toast.success("Random prompt generated!");
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
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="relative z-10 container mx-auto px-4 py-4 md:py-8">
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
                    ? "bg-[#FFEB00] border-[4px] border-black text-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    : "bg-gray-100 border-[4px] border-gray-300 text-gray-600 hover:bg-gray-200"
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
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-12">
          {/* Input Panel */}
          <Card className="bg-card border order-1">
            <div className="border-b px-4 md:px-6 py-3 md:py-4 bg-muted/30">
              <h2 className="text-base md:text-lg font-bold">Input</h2>
            </div>

            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Model Selection */}
              {filteredModels.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">AI Model</label>
                  <Select
                    value={selectedModel || undefined}
                    onValueChange={(value) => setSelectedModel(value)}
                  >
                    <SelectTrigger className="w-full h-auto py-3 px-4 bg-background border-2 border-black font-bold">
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
                                {model.estimated_time_minutes && (
                                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    ~{formatEstimatedTime(model.estimated_time_minutes)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-background border-2 border-black z-50">
                      {filteredModels.map((model) => {
                        const modelGroups = (model.groups as string[]) || [];
                        const otherGroups = modelGroups.filter(g => g !== selectedGroup);
                        const isSelected = String(selectedModel) === String(model.record_id);
                        
                        return (
                          <SelectItem
                            key={String(model.record_id)}
                            value={String(model.record_id)}
                            className={cn(
                              "cursor-pointer py-3 px-4 border-2 my-1 mx-1 rounded transition-all",
                              isSelected
                                ? "bg-red-500 hover:bg-red-600 text-white font-bold border-black"
                                : "hover:bg-muted border-border"
                            )}
                          >
                            <div className="flex items-start justify-between w-full gap-4">
                              <div className="flex flex-col gap-1 flex-1 min-w-0">
                                <span className="font-bold text-sm">{model.model_name}</span>
                                {otherGroups.length > 0 && (
                                  <span className={cn(
                                    "text-xs",
                                    isSelected ? "text-white/60" : "text-muted-foreground/60"
                                  )}>
                                    Also in: {otherGroups.map(g => 
                                      CREATION_GROUPS.find(cg => cg.id === g)?.label
                                    ).join(", ")}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge variant="secondary" className="text-xs">
                                  {model.base_token_cost} tokens
                                </Badge>
                                {model.estimated_time_minutes && (
                                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    ~{formatEstimatedTime(model.estimated_time_minutes)}
                                  </Badge>
                                )}
                              </div>
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

              {/* Prompt */}
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
                      className="h-8 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white font-bold border-2 border-black hover:opacity-90"
                      disabled={localGenerating || isGenerating}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Surprise Me
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEnhancePrompt(!enhancePrompt)}
                      className={cn(
                        "h-8 transition-all font-bold border-2 border-black",
                        enhancePrompt 
                          ? "bg-green-500 text-white hover:bg-green-600" 
                          : "bg-white text-black hover:bg-gray-100"
                      )}
                    >
                      {enhancePrompt ? "✓ " : ""}Enhance
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what you want to create..."
                  className="min-h-[100px] md:min-h-[120px] resize-none text-sm md:text-base"
                  disabled={localGenerating || isGenerating}
                  required={isPromptRequired}
                />
                <div className="flex justify-end">
                  <span className={cn(
                    "text-xs",
                    prompt.length > 5000 ? "text-destructive font-medium" : "text-muted-foreground"
                  )}>
                    {prompt.length} / 5000 characters
                  </span>
                </div>
              </div>


              {/* Image Upload - Only show if required by schema */}
              {isImageRequired && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    Images <span className="text-destructive">*</span>
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

                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadedImages.length >= 10}
                    className="w-full border-dashed h-11 md:h-10"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Add Images ({uploadedImages.length}/10)
                  </Button>
                  
                  {uploadedImages.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      This model requires at least one image
                    </p>
                  )}
                </div>
              )}


              {/* Collapsible Advanced Options */}
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full h-11 md:h-10">
                    Advanced Options
                    <ChevronRight className={`h-4 w-4 ml-2 transition-transform ${advancedOpen ? 'rotate-90' : ''}`} />
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
                        excludeFields={['prompt', 'image_urls']}
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

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleGenerate} 
                  disabled={
                    localGenerating || 
                    isGenerating || 
                    !selectedModel || 
                    (isPromptRequired && !prompt.trim()) || 
                    (isImageRequired && uploadedImages.length === 0)
                  }
                  size="lg"
                  className="w-full h-12 md:h-11 text-base font-bold bg-[#FFFF00] hover:bg-[#FFEB00] text-black border-2 border-black shadow-lg"
                >
                  {(localGenerating || isGenerating) ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <div className="flex items-center justify-center gap-3 w-full relative">
                      <div className="flex items-center">
                        <Sparkles className="mr-2 h-5 w-5" />
                        Generate
                      </div>
                      <div className="flex items-center gap-1.5 bg-black/10 px-2.5 py-1 rounded absolute right-2">
                        <Coins className="h-4 w-4" />
                        <span className="text-sm font-bold">-{estimatedTokens} tokens</span>
                      </div>
                    </div>
                  )}
                </Button>
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
            </div>
          </Card>

          {/* Output Panel */}
          <Card className="bg-card border order-2">
            <div className="border-b px-4 md:px-6 py-3 md:py-4 bg-muted/30">
              <h2 className="text-base md:text-lg font-bold">Output</h2>
            </div>

            <div className="p-4 md:p-6">
              {(localGenerating || isGenerating) ? (
                <div className="space-y-4">
                  {/* Shimmer animation */}
                  <div className="relative aspect-square bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" 
                         style={{ backgroundSize: '1000px 100%' }} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-purple-500 rounded-full blur-xl opacity-50 animate-glow-pulse" />
                        <Sparkles className="h-16 w-16 text-purple-600 animate-float relative z-10" />
                      </div>
                      <div className="mt-8 space-y-4 text-center">
                        <p className="text-lg font-bold text-purple-900 animate-bounce-subtle">
                          Creating your masterpiece...
                        </p>
                        <div className="flex gap-2 justify-center">
                          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <div className="relative h-2 w-48 mx-auto bg-purple-200 rounded-full overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 animate-shimmer" 
                               style={{ backgroundSize: '200% 100%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Informational banner */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-blue-900">
                          {selectedModel && filteredModels.find(m => m.id === selectedModel)?.content_type === 'video' 
                            ? '⏱️ Video generation typically takes 3-5 minutes'
                            : selectedModel && filteredModels.find(m => m.id === selectedModel)?.content_type === 'audio'
                            ? '⏱️ Audio generation typically takes 1-2 minutes'
                            : '⏱️ Creating your content...'}
                        </p>
                        <p className="text-xs text-blue-700">
                          You can safely navigate away. Your generation will continue in the background and appear in your History.
                        </p>
                        <Button 
                          variant="link" 
                          size="sm"
                          onClick={() => navigate("/dashboard/history")}
                          className="text-blue-600 underline h-auto p-0"
                        >
                          View History →
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : generatedOutput ? (
                <div className="space-y-4">
                  <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                    <GenerationPreview
                      storagePath={generatedOutput}
                      contentType={selectedModel && filteredModels.find(m => m.id === selectedModel)?.content_type || "image"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={async () => {
                        try {
                          // Create signed URL for download
                          const { data, error } = await supabase.storage
                            .from('generated-content')
                            .createSignedUrl(generatedOutput, 60);
                          
                          if (error || !data?.signedUrl) {
                            toast.error('Failed to create download link');
                            return;
                          }

                          const response = await fetch(data.signedUrl);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          const extension = generatedOutput.split('.').pop() || 'file';
                          a.download = `artifio-${Date.now()}.${extension}`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                          toast.success('Download started!');
                        } catch (error) {
                          console.error('Download failed:', error);
                          toast.error('Failed to download file');
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1" 
                      onClick={() => navigate("/dashboard/history")}
                    >
                      <History className="h-4 w-4 mr-2" />
                      History
                    </Button>
                  </div>
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

        {/* Community Creations Section */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-black">COMMUNITY CREATIONS</h2>
            <Button variant="outline" size="sm" className="h-8 md:h-9">
              View All
            </Button>
          </div>

          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {communityCreations.map((creation) => (
                <CarouselItem key={creation.id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4">
                  <Card className="overflow-hidden border-2 hover:border-primary transition-colors group">
                    <div className="relative aspect-square bg-muted">
                      {creation.video ? (
                        <video
                          src={creation.video}
                          className="w-full h-full object-cover"
                          loop
                          muted
                          playsInline
                          onMouseEnter={(e) => e.currentTarget.play()}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
                        />
                      ) : (
                        <img src={creation.image} alt={creation.theme} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      {creation.video && (
                        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                          <Play className="h-3 w-3" />
                          Video
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {creation.theme}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{creation.resolution}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{creation.author}</span>
                        <span className="text-xs text-muted-foreground">❤️ {creation.likes}</span>
                      </div>
                    </div>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>

        {/* Best Practices Section */}
        <Card className="bg-card border">
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
    </div>
  );
};

export default CustomCreation;
