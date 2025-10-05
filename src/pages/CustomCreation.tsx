import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ImageIcon, Upload, Coins, Sparkles, Download, History, Play, ChevronRight, Loader2 } from "lucide-react";
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
import { TemplateCard } from "@/components/TemplateCard";
import { useGeneration } from "@/hooks/useGeneration";
import { useModels } from "@/hooks/useModels";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter models by selected group
  const filteredModels = allModels?.filter(model => {
    const groups = model.groups as string[] || [];
    return groups.includes(selectedGroup);
  }) || [];

  // Determine if image upload is required for current group
  const isImageRequired = selectedGroup === "image_editing" || selectedGroup === "image_to_video";
  const isPromptRequired = selectedGroup !== "image_editing";

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

  // Reset model selection when group changes
  useEffect(() => {
    setSelectedModel(null);
  }, [selectedGroup]);

  // Auto-select first model when filtered models change
  useEffect(() => {
    if (filteredModels.length > 0 && !selectedModel) {
      setSelectedModel(String(filteredModels[0].id));
    }
  }, [filteredModels, selectedModel]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (uploadedImages.length + files.length > 10) {
      toast.error("Maximum 10 images allowed");
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
    // Validate based on group requirements
    if (isPromptRequired && !prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    
    if (isImageRequired && uploadedImages.length === 0) {
      toast.error("Please upload at least one image for this creation type");
      return;
    }

    if (!selectedModel) {
      toast.error("Please select a model");
      return;
    }
    
    try {
      const customParameters: Record<string, any> = {
        resolution: resolution.toLowerCase(),
      };

      const result = await generate({
        model_id: selectedModel,
        prompt: prompt.trim(),
        custom_parameters: customParameters,
      });

      if (result?.output_url) {
        const { data } = supabase.storage
          .from("generated-content")
          .getPublicUrl(result.output_url);
        
        setGeneratedOutput(data.publicUrl);
      }
      
      toast.success("Generation complete! Check your History.");
    } catch (error) {
      // Error already handled in useGeneration hook
    }
  };

  const calculateTokens = () => {
    if (!selectedModel || !filteredModels) return 50;

    const currentModel = filteredModels.find(m => m.id === selectedModel);
    if (!currentModel) return 50;

    let tokens = currentModel.base_token_cost;
    const multipliers = currentModel.cost_multipliers || {};
    
    if (resolution === "HD" && multipliers.hd) {
      tokens *= multipliers.hd;
    }
    
    if (uploadedImages.length > 0 && multipliers.uploaded_image) {
      tokens += uploadedImages.length * multipliers.uploaded_image;
    }
    
    return Math.ceil(tokens);
  };

  useEffect(() => {
    setEstimatedTokens(calculateTokens());
  }, [selectedModel, resolution, uploadedImages, selectedGroup, filteredModels]);

  const handleReset = () => {
    setPrompt("");
    setUploadedImages([]);
    setGeneratedOutput(null);
    setResolution("Native");
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
                  <div className="grid grid-cols-1 gap-2">
                    {filteredModels.map((model) => {
                      const modelGroups = (model.groups as string[]) || [];
                      const otherGroups = modelGroups.filter(g => g !== selectedGroup);
                      
                      return (
                        <Button
                          key={String(model.id)}
                          variant="outline"
                          onClick={() => setSelectedModel(String(model.id))}
                          className={cn(
                            "h-auto py-3 px-4 justify-start text-left border-2 transition-all",
                            String(selectedModel) === String(model.id) 
                              ? "bg-red-500 hover:bg-red-600 text-white font-bold border-black" 
                              : "hover:bg-muted border-border"
                          )}
                        >
                          <div className="flex flex-col gap-1 w-full">
                            <div className="flex items-center justify-between w-full">
                              <span className="font-bold text-sm">{model.model_name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {model.base_token_cost} tokens
                              </Badge>
                            </div>
                            <span className={cn("text-xs capitalize", String(selectedModel) === String(model.id) ? "text-white/80" : "text-muted-foreground")}>
                              {model.provider} • {model.content_type}
                            </span>
                            {otherGroups.length > 0 && (
                              <span className={cn("text-xs", String(selectedModel) === String(model.id) ? "text-white/60" : "text-muted-foreground/60")}>
                                Also in: {otherGroups.map(g => 
                                  CREATION_GROUPS.find(cg => cg.id === g)?.label
                                ).join(", ")}
                              </span>
                            )}
                          </div>
                        </Button>
                      );
                    })}
                  </div>
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
                      disabled={isGenerating}
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
                  disabled={isGenerating}
                  required={isPromptRequired}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Images {isImageRequired && <span className="text-destructive">*</span>}
                  {!isImageRequired && <span className="text-muted-foreground text-xs ml-1">(Optional)</span>}
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
                
                {isImageRequired && uploadedImages.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedGroup === "image_editing" ? "Upload an image to edit" : "Upload an image to animate"}
                  </p>
                )}
              </div>

              {/* Collapsible Advanced Options */}
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full h-11 md:h-10">
                    Advanced Options
                    <ChevronRight className={`h-4 w-4 ml-2 transition-transform ${advancedOpen ? 'rotate-90' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4">
                  {/* Resolution */}
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
                </CollapsibleContent>
              </Collapsible>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating || !selectedModel || (isPromptRequired && !prompt.trim()) || (isImageRequired && uploadedImages.length === 0)}
                  size="lg"
                  className="w-full h-12 md:h-11 text-base font-bold bg-yellow-400 hover:bg-yellow-500 text-black border-2 border-black shadow-lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <Sparkles className="mr-2 h-5 w-5" />
                        Generate
                      </div>
                      <div className="flex items-center gap-1.5 bg-black/10 px-2.5 py-1 rounded">
                        <Coins className="h-4 w-4" />
                        <span className="text-sm font-bold">{estimatedTokens}</span>
                      </div>
                    </div>
                  )}
                </Button>
                <Button onClick={handleReset} variant="outline" size="lg" className="w-full h-11 md:h-10">
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
              {generatedOutput ? (
                <div className="space-y-4">
                  <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                    <img src={generatedOutput} alt="Generated content" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" asChild>
                      <a href={generatedOutput} download>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => navigate("/dashboard/history")}>
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
        <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <div className="p-4 md:p-6">
            <h3 className="text-lg md:text-xl font-black mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              BEST PRACTICES
            </h3>
            <div className="grid md:grid-cols-2 gap-3 md:gap-4 text-sm">
              <div className="flex gap-3">
                <span className="text-primary font-bold">01</span>
                <p>Be specific and descriptive in your prompts for better results</p>
              </div>
              <div className="flex gap-3">
                <span className="text-primary font-bold">02</span>
                <p>Use the "Enhance" feature to automatically improve your prompts</p>
              </div>
              <div className="flex gap-3">
                <span className="text-primary font-bold">03</span>
                <p>Upload reference images to guide the AI's creative direction</p>
              </div>
              <div className="flex gap-3">
                <span className="text-primary font-bold">04</span>
                <p>Experiment with different models to find your perfect style</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CustomCreation;
