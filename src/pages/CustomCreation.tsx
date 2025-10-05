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
import { useModelsByContentType } from "@/hooks/useModels";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
  const { modelsByContentType, isLoading: modelsLoading } = useModelsByContentType();
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

  // Auto-select first model when content type changes
  useEffect(() => {
    if (modelsByContentType && modelsByContentType[contentType]?.length > 0) {
      setSelectedModel(modelsByContentType[contentType][0].id);
    }
  }, [contentType, modelsByContentType]);

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
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
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
    if (!selectedModel || !modelsByContentType) return 50;

    const currentModel = modelsByContentType[contentType]?.find(m => m.id === selectedModel);
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
  }, [selectedModel, resolution, uploadedImages, contentType, modelsByContentType]);

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
  if (!modelsLoading && (!modelsByContentType || Object.keys(modelsByContentType).length === 0)) {
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
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="relative z-10 container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-black mb-2">CREATION STUDIO</h1>
          <p className="text-sm md:text-base text-foreground/80 font-medium">
            Fine-tune every detail
          </p>
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
              {modelsByContentType && modelsByContentType[contentType] && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">AI Model</label>
                  <div className="grid grid-cols-1 gap-2">
                    {modelsByContentType[contentType].map((model) => (
                      <Button
                        key={model.id}
                        variant="outline"
                        onClick={() => setSelectedModel(model.id)}
                        className={cn(
                          "h-auto py-3 px-4 justify-start text-left border-2 transition-all",
                          selectedModel === model.id 
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
                          <span className={cn("text-xs capitalize", selectedModel === model.id ? "text-white/80" : "text-muted-foreground")}>
                            {model.provider} • {model.content_type}
                          </span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Prompt <span className="text-destructive">*</span></label>
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
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Images (Optional)</label>

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

              {/* Action Buttons and Token Cost - Desktop: side by side, Mobile: buttons below cost */}
              <div className="space-y-3">
                {/* Desktop Layout: Buttons on left, Cost on right */}
                <div className="hidden md:flex gap-3 items-stretch">
                  <Button 
                    variant="outline" 
                    onClick={handleReset} 
                    className="flex-1 h-14"
                    disabled={isGenerating}
                  >
                    Reset
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={!prompt || !selectedModel || isGenerating}
                    className="flex-1 h-14 bg-neon-blue hover:bg-neon-blue/90 text-black font-bold"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                  <div className="p-4 bg-neon-yellow/20 rounded-lg border-2 border-neon-yellow/40 flex-1 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="h-5 w-5" />
                      <span className="text-sm font-medium">Cost</span>
                    </div>
                    <div className="text-2xl font-black">{estimatedTokens}</div>
                  </div>
                </div>

                {/* Mobile Layout: Cost first, then buttons below */}
                <div className="md:hidden space-y-3">
                  <div className="p-3 bg-neon-yellow/20 rounded-lg border-2 border-neon-yellow/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="h-5 w-5" />
                        <span className="text-sm font-medium">Estimated Cost</span>
                      </div>
                      <div className="text-2xl font-black">{estimatedTokens}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleReset} 
                      className="flex-1 h-11"
                      disabled={isGenerating}
                    >
                      Reset
                    </Button>
                    <Button
                      onClick={handleGenerate}
                      disabled={!prompt || !selectedModel || isGenerating}
                      className="flex-1 h-11 bg-neon-blue hover:bg-neon-blue/90 text-black font-bold"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Output Panel */}
          <Card className="bg-card border order-2">
            <div className="border-b px-4 md:px-6 py-3 md:py-4 bg-muted/30">
              <h2 className="text-base md:text-lg font-bold">Output</h2>
            </div>

            <div className="p-4 md:p-6">
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden bg-muted/30 aspect-[4/3] flex items-center justify-center">
                  {generatedOutput ? (
                    <img src={generatedOutput} alt="Generated output" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Output will appear here</p>
                    </div>
                  )}
                </div>

                {generatedOutput && (
                  <div className="flex gap-2 md:gap-3">
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => navigate("/dashboard/history")}
                      className="flex-1 h-11 md:h-10"
                    >
                      <History className="h-4 w-4 mr-2" />
                      View History
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>


        {/* Community Creations Section */}
        <div className="mt-12 md:mt-16 space-y-6 md:space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-4xl font-black">COMMUNITY CREATIONS</h2>
            <p className="text-sm md:text-base text-foreground/80 font-medium">
              Get inspired by what others are creating
            </p>
          </div>

          <Carousel className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {communityCreations.map((creation) => (
                <CarouselItem key={creation.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                  <Card className="overflow-hidden group cursor-pointer hover-lift">
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      {creation.contentType === "video" && creation.video ? (
                        <video
                          src={creation.video}
                          poster={creation.image}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          muted
                          loop
                          onMouseEnter={(e) => e.currentTarget.play()}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
                        />
                      ) : (
                        <img
                          src={creation.image}
                          alt={`Community creation ${creation.id}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      )}
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Badge className="bg-neon-blue text-black font-bold border-2 border-black">
                          {creation.resolution}
                        </Badge>
                        <Badge className="bg-background/90 backdrop-blur">
                          {creation.contentType}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3 md:p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neon-blue to-neon-green flex items-center justify-center text-xs font-black">
                            {creation.author.charAt(0)}
                          </div>
                          <span className="text-xs md:text-sm font-medium">{creation.author}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>❤️</span>
                          <span className="font-medium">{creation.likes}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 capitalize">{creation.theme} theme</p>
                    </div>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>

        {/* Best Practices - Use Cases */}
        <div className="mt-12 md:mt-16 space-y-6 md:space-y-8 pb-24 md:pb-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-4xl font-black">BEST PRACTICES</h2>
            <p className="text-sm md:text-base text-foreground/80 font-medium">
              Learn how to get the best results
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Image Creation */}
            <Card className="p-4 md:p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-black text-base md:text-lg">Image Creation</h3>
              </div>
              <ul className="space-y-2 text-xs md:text-sm text-foreground/80">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Be specific about style, colors, and composition</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Use HD resolution for detailed artwork</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Select appropriate theme for best results</span>
                </li>
              </ul>
            </Card>

            {/* Video Generation */}
            <Card className="p-4 md:p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Play className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-black text-base md:text-lg">Video Generation</h3>
              </div>
              <ul className="space-y-2 text-xs md:text-sm text-foreground/80">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Describe motion and camera movements clearly</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Keep scenes simple for better coherence</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Always use HD for professional quality</span>
                </li>
              </ul>
            </Card>

            {/* Photo Enhancement */}
            <Card className="p-4 md:p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-black text-base md:text-lg">Photo Enhancement</h3>
              </div>
              <ul className="space-y-2 text-xs md:text-sm text-foreground/80">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Upload high-quality source images</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Use realistic theme for natural edits</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Describe specific changes you want</span>
                </li>
              </ul>
            </Card>

            {/* Brand Integration */}
            <Card className="p-4 md:p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-black text-base md:text-lg">Brand Integration</h3>
              </div>
              <ul className="space-y-2 text-xs md:text-sm text-foreground/80">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Enable "Apply Brand" for consistent style</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Works best with your brand colors defined</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Adds +25 tokens to generation cost</span>
                </li>
              </ul>
            </Card>

            {/* Prompt Tips */}
            <Card className="p-4 md:p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-black text-lg">✍️</span>
                </div>
                <h3 className="font-black text-base md:text-lg">Prompt Writing</h3>
              </div>
              <ul className="space-y-2 text-xs md:text-sm text-foreground/80">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Use descriptive adjectives and details</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Click "Enhance" to improve your prompt</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Longer prompts = more specific results</span>
                </li>
              </ul>
            </Card>

            {/* Resolution Guide */}
            <Card className="p-4 md:p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-black text-lg">📐</span>
                </div>
                <h3 className="font-black text-base md:text-lg">Resolution Guide</h3>
              </div>
              <ul className="space-y-2 text-xs md:text-sm text-foreground/80">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Native: Fast generation, standard quality</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>HD: Professional quality, slower generation</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>HD costs more tokens but worth it</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomCreation;
