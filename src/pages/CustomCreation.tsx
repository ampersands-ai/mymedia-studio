import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ImageIcon, Upload, Coins, Sparkles, Download, History, Play, ChevronRight, ChevronLeft } from "lucide-react";
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

// Template categories with square images and IDs
const templateCategories = {
  "Image Creation": [
    {
      id: "IMG-001",
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop",
      prompt: "Abstract art with vibrant colors and geometric shapes",
      contentType: "image",
      resolution: "HD",
      theme: "abstract",
    },
    {
      id: "IMG-002",
      image: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=400&h=400&fit=crop",
      prompt: "Futuristic cyberpunk cityscape with neon lights",
      contentType: "image",
      resolution: "HD",
      theme: "cyberpunk",
    },
    {
      id: "IMG-003",
      image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=400&fit=crop",
      prompt: "Fantasy dragon in mystical forest",
      contentType: "image",
      resolution: "Native",
      theme: "fantasy",
    },
    {
      id: "IMG-004",
      image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=400&fit=crop",
      prompt: "Anime character portrait",
      contentType: "image",
      resolution: "HD",
      theme: "anime",
    },
  ],
  "Photo Editing": [
    {
      id: "PHT-001",
      image: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=400&h=400&fit=crop",
      prompt: "Portrait enhancement with natural lighting",
      contentType: "image",
      resolution: "Native",
      theme: "realistic",
    },
    {
      id: "PHT-002",
      image: "https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=400&h=400&fit=crop",
      prompt: "Landscape color grading",
      contentType: "image",
      resolution: "Native",
      theme: "artistic",
    },
    {
      id: "PHT-003",
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop",
      prompt: "Sky replacement and enhancement",
      contentType: "image",
      resolution: "HD",
      theme: "realistic",
    },
    {
      id: "PHT-004",
      image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=400&fit=crop",
      prompt: "Night sky enhancement",
      contentType: "image",
      resolution: "HD",
      theme: "realistic",
    },
  ],
  "Product Photography": [
    {
      id: "PRD-001",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
      prompt: "Product on clean white background",
      contentType: "image",
      resolution: "HD",
      theme: "realistic",
    },
    {
      id: "PRD-002",
      image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop",
      prompt: "Luxury product with dramatic lighting",
      contentType: "image",
      resolution: "HD",
      theme: "realistic",
    },
    {
      id: "PRD-003",
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
      prompt: "Minimalist product showcase",
      contentType: "image",
      resolution: "Native",
      theme: "realistic",
    },
    {
      id: "PRD-004",
      image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=400&fit=crop",
      prompt: "Smartwatch product photography",
      contentType: "image",
      resolution: "HD",
      theme: "realistic",
    },
  ],
  "Social Media Content": [
    {
      id: "SOC-001",
      image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=400&fit=crop",
      prompt: "Instagram story template design",
      contentType: "image",
      resolution: "Native",
      theme: "artistic",
    },
    {
      id: "SOC-002",
      image: "https://images.unsplash.com/photo-1432821596592-e2c18b78144f?w=400&h=400&fit=crop",
      prompt: "Quote post with typography",
      contentType: "image",
      resolution: "Native",
      theme: "artistic",
    },
    {
      id: "SOC-003",
      image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=400&fit=crop",
      prompt: "Social media banner design",
      contentType: "image",
      resolution: "HD",
      theme: "abstract",
    },
    {
      id: "SOC-004",
      image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=400&fit=crop",
      prompt: "Business profile header",
      contentType: "image",
      resolution: "HD",
      theme: "realistic",
    },
  ],
  "Video Generation": [
    {
      id: "VID-001",
      image: "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400&h=400&fit=crop",
      video: "https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_25fps.mp4",
      prompt: "Animated logo reveal",
      contentType: "video",
      resolution: "HD",
      theme: "abstract",
    },
    {
      id: "VID-002",
      image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=400&fit=crop",
      video: "https://videos.pexels.com/video-files/6985001/6985001-uhd_2560_1440_25fps.mp4",
      prompt: "Product showcase animation",
      contentType: "video",
      resolution: "HD",
      theme: "realistic",
    },
    {
      id: "VID-003",
      image: "https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?w=400&h=400&fit=crop",
      video: "https://videos.pexels.com/video-files/3141211/3141211-uhd_2560_1440_25fps.mp4",
      prompt: "Cinematic intro sequence",
      contentType: "video",
      resolution: "HD",
      theme: "cinematic",
    },
    {
      id: "VID-004",
      image: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=400&h=400&fit=crop",
      video: "https://videos.pexels.com/video-files/7579955/7579955-uhd_2560_1440_25fps.mp4",
      prompt: "Social media video ad",
      contentType: "video",
      resolution: "Native",
      theme: "artistic",
    },
  ],
};

const CustomCreation = () => {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [contentType, setContentType] = useState<"image" | "video" | "music" | "text">("image");
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [outputFormat, setOutputFormat] = useState<"PNG" | "JPEG">("PNG");
  const [resolution, setResolution] = useState<"Native" | "HD">("Native");
  const [theme, setTheme] = useState<string>("realistic");
  const [applyBrand, setApplyBrand] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [estimatedTokens, setEstimatedTokens] = useState(50);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Custom Creation Studio - Artifio.ai";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Create custom AI-generated content with advanced controls and fine-tuning options.');
    }
  }, []);

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
    
    if (prompt.length > 1000) {
      toast.error("Prompt is too long. Please keep it under 1000 characters.");
      return;
    }

    if (prompt.length < 3) {
      toast.error("Prompt is too short. Please provide more details.");
      return;
    }

    for (const image of uploadedImages) {
      if (image.size > 10 * 1024 * 1024) {
        toast.error(`Image "${image.name}" is too large. Maximum size is 10MB.`);
        return;
      }
      
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(image.type)) {
        toast.error(`Invalid file type for "${image.name}". Only JPEG, PNG, and WebP are supported.`);
        return;
      }
    }
    
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setGeneratedOutput("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=600&fit=crop");
      toast.success("Image generated successfully!");
    } catch (error: any) {
      console.error("Generation error:", error);
      
      if (error.message?.includes("Insufficient tokens")) {
        toast.error("You don't have enough tokens. Please upgrade your plan.");
      } else if (error.message?.includes("network")) {
        toast.error("Network error. Please check your connection and try again.");
      } else {
        toast.error(error.message || "Generation failed. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt first");
      return;
    }
    
    setIsEnhancing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const enhanced = `${prompt}. Ultra high quality, professional lighting, cinematic composition, 8K resolution, highly detailed`;
      setPrompt(enhanced);
      toast.success("Prompt enhanced!");
    } catch (error) {
      toast.error("Failed to enhance prompt");
    } finally {
      setIsEnhancing(false);
    }
  };

  const calculateTokens = () => {
    const baseTokens = {
      image: 50,
      video: 200,
      music: 150,
      text: 20
    };
    
    let tokens = baseTokens[contentType];
    if (resolution === "HD") tokens *= 1.5;
    if (uploadedImages.length > 0) tokens += uploadedImages.length * 10;
    if (applyBrand) tokens += 25;
    
    return Math.ceil(tokens);
  };

  useEffect(() => {
    setEstimatedTokens(calculateTokens());
  }, [contentType, resolution, uploadedImages, applyBrand]);

  const handleReset = () => {
    setPrompt("");
    setUploadedImages([]);
    setGeneratedOutput(null);
    setOutputFormat("PNG");
    setResolution("Native");
    setTheme("realistic");
    setApplyBrand(false);
  };

  const loadTemplate = (template: any) => {
    setPrompt(template.prompt);
    setContentType(template.contentType as typeof contentType);
    setResolution(template.resolution as typeof resolution);
    setTheme(template.theme);
    toast.success(`${template.id} loaded!`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
              {/* Content Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Content Type</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button
                    variant={contentType === "image" ? "default" : "outline"}
                    onClick={() => setContentType("image")}
                    className="h-11 md:h-10 text-sm"
                  >
                    <ImageIcon className="h-4 w-4 mr-1 md:mr-2" />
                    Image
                  </Button>
                  <Button
                    variant={contentType === "video" ? "default" : "outline"}
                    onClick={() => setContentType("video")}
                    className="h-11 md:h-10 text-sm"
                  >
                    <Play className="h-4 w-4 mr-1 md:mr-2" />
                    Video
                  </Button>
                  <Button
                    variant={contentType === "music" ? "default" : "outline"}
                    onClick={() => setContentType("music")}
                    className="h-11 md:h-10 text-sm"
                  >
                    🎵 Music
                  </Button>
                  <Button
                    variant={contentType === "text" ? "default" : "outline"}
                    onClick={() => setContentType("text")}
                    className="h-11 md:h-10 text-sm"
                  >
                    💬 Text
                  </Button>
                </div>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Prompt <span className="text-destructive">*</span></label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEnhancePrompt}
                    disabled={isEnhancing || !prompt}
                    className="h-8 text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {isEnhancing ? "..." : "Enhance"}
                  </Button>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what you want to create..."
                  className="min-h-[100px] md:min-h-[120px] resize-none text-sm md:text-base"
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
                  {/* Output Format */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Format</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={outputFormat === "PNG" ? "default" : "outline"}
                        onClick={() => setOutputFormat("PNG")}
                        className="h-11 md:h-10"
                      >
                        PNG
                      </Button>
                      <Button
                        variant={outputFormat === "JPEG" ? "default" : "outline"}
                        onClick={() => setOutputFormat("JPEG")}
                        className="h-11 md:h-10"
                      >
                        JPEG
                      </Button>
                    </div>
                  </div>

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

                  {/* Theme */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Theme</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {["realistic", "artistic", "anime", "abstract", "cyberpunk", "fantasy"].map((t) => (
                        <Button
                          key={t}
                          variant={theme === t ? "default" : "outline"}
                          onClick={() => setTheme(t)}
                          className="capitalize h-11 md:h-10 text-xs md:text-sm"
                          size="sm"
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Brand Toggle */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium">Apply Brand</label>
                      <p className="text-xs text-muted-foreground">+25 tokens</p>
                    </div>
                    <Button
                      variant={applyBrand ? "default" : "outline"}
                      size="sm"
                      onClick={() => setApplyBrand(!applyBrand)}
                    >
                      {applyBrand ? "ON" : "OFF"}
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Token Cost */}
              <div className="p-3 md:p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 md:h-5 w-4 md:w-5 text-primary" />
                    <span className="text-xs md:text-sm font-medium">Cost</span>
                  </div>
                  <div className="text-xl md:text-2xl font-black text-primary">{estimatedTokens}</div>
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
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = generatedOutput;
                        link.download = `artifio-${Date.now()}.${outputFormat.toLowerCase()}`;
                        link.click();
                        toast.success("Downloaded!");
                      }}
                      className="flex-1 h-11 md:h-10"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-11 md:h-10">
                      <History className="h-4 w-4 mr-2" />
                      History
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Sticky Bottom Action Bar - Mobile Only */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t-4 border-black lg:hidden z-40">
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset} className="flex-1 h-12">
              Reset
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!prompt || isGenerating}
              className="flex-1 h-12 bg-gradient-to-r from-primary to-purple-600"
            >
              <Play className="h-4 w-4 mr-2" />
              {isGenerating ? "..." : "Generate"}
            </Button>
          </div>
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden lg:flex gap-3 mb-12">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            Reset
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!prompt || isGenerating}
            className="flex-1 bg-gradient-to-r from-primary to-purple-600"
          >
            <Play className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate"}
          </Button>
        </div>

        {/* Template Categories */}
        <div className="mt-12 md:mt-16 space-y-8 md:space-y-12">
          <div className="text-center">
            <h2 className="text-2xl md:text-4xl font-black mb-2">TEMPLATES</h2>
            <p className="text-sm md:text-base text-foreground/80 font-medium">
              Quick start with pre-made templates
            </p>
          </div>

          {Object.entries(templateCategories).map(([category, templates]) => (
            <div key={category} className="space-y-4">
              <h3 className="text-lg md:text-xl font-black">{category}</h3>
              
              <div className="relative">
                <Carousel className="w-full" opts={{ align: "start", slidesToScroll: 1 }}>
                  <CarouselContent className="-ml-2 md:-ml-4">
                    {templates.map((template) => (
                      <CarouselItem key={template.id} className="pl-2 md:pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
                        <Card className="overflow-hidden hover-lift cursor-pointer group">
                          <div className="aspect-square overflow-hidden bg-muted relative">
                            <TemplateCard
                              image={template.image}
                              video={(template as any).video}
                              alt={template.id}
                              className="w-full h-full"
                            />
                            <div className="absolute top-2 left-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-black z-10">
                              {template.id}
                            </div>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                              <Button
                                onClick={() => loadTemplate(template)}
                                size="sm"
                                className="bg-primary hover:bg-primary/90 z-10"
                              >
                                Use Template
                              </Button>
                            </div>
                          </div>
                          <div className="p-3 bg-card">
                            <div className="text-center">
                              <p className="text-sm font-black">{template.id}</p>
                            </div>
                          </div>
                        </Card>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="hidden md:flex -left-4 bg-background border-2 border-black hover:bg-muted" />
                  <CarouselNext className="hidden md:flex -right-4 bg-background border-2 border-black hover:bg-muted" />
                </Carousel>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomCreation;
