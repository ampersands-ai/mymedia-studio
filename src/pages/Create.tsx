import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ImageIcon, Upload, Coins, Sparkles, Download, History, Play } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import portraitHeadshots from "@/assets/portrait-headshots.jpg";
import photoEditing from "@/assets/photo-editing.jpg";
import videoCreation from "@/assets/video-creation.jpg";
import productPhotos from "@/assets/product-photos.jpg";
import socialMedia from "@/assets/social-media.jpg";
import creativeDesign from "@/assets/creative-design.jpg";
import audioProcessing from "@/assets/audio-processing.jpg";
import textGeneration from "@/assets/text-generation.jpg";

const Create = () => {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add structured data for Create page
  useEffect(() => {
    const webAppSchema = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Artifio.ai Create",
      "applicationCategory": "MultimediaApplication",
      "description": "AI-powered creative studio for generating videos, images, music, and text content.",
      "url": "https://artifio.ai/dashboard/create",
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Start with 500 free tokens"
      }
    };

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://artifio.ai/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Dashboard",
          "item": "https://artifio.ai/dashboard"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Create",
          "item": "https://artifio.ai/dashboard/create"
        }
      ]
    };

    const schemas = [webAppSchema, breadcrumbSchema];
    const scriptElements: HTMLScriptElement[] = [];

    schemas.forEach(schema => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
      scriptElements.push(script);
    });

    document.title = "Start Creating - Artifio.ai | AI Content Generator";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Create stunning AI-generated videos, images, music, and text in the Artifio.ai studio. Start creating with 500 free tokens.');
    }

    return () => {
      scriptElements.forEach(script => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (uploadedImages.length + files.length > 10) {
      toast.error("Maximum 10 images allowed");
      return;
    }
    setUploadedImages([...uploadedImages, ...files]);
  };

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    
    setIsGenerating(true);
    try {
      // Simulate generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      setGeneratedOutput("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=600&fit=crop");
      toast.success("Image generated successfully!");
    } catch (error) {
      toast.error("Generation failed");
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
      // Simulate AI enhancement
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

  const categories = [
    {
      title: "Portrait Headshots",
      description: "Professional AI-generated headshots for business profiles and portfolios",
      badge: "Image Creation",
      image: portraitHeadshots,
      templates: ["Professional Business", "Creative Artist", "Corporate Executive", "Startup Founder"]
    },
    {
      title: "Photo Editing",
      description: "Enhance, retouch, and perfect your images with AI-powered editing tools",
      badge: "Image Editing",
      image: photoEditing,
      templates: ["Background Removal", "Color Enhancement", "Portrait Retouch", "Object Removal"]
    },
    {
      title: "Cinematic Videos",
      description: "Create stunning videos with professional effects and transitions",
      badge: "Video Generation",
      image: videoCreation,
      templates: ["Product Demo", "Social Ads", "Explainer Video", "Brand Story"]
    },
    {
      title: "Product Photography",
      description: "Generate perfect product shots for e-commerce and marketing",
      badge: "E-commerce",
      image: productPhotos,
      templates: ["White Background", "Lifestyle Scene", "360° View", "Close-up Detail"]
    },
    {
      title: "Social Media Content",
      description: "Design engaging posts, stories, and ads for all platforms",
      badge: "Marketing",
      image: socialMedia,
      templates: ["Instagram Story", "Facebook Post", "Twitter Header", "LinkedIn Banner"]
    },
    {
      title: "Creative Design",
      description: "Bring your artistic vision to life with AI-powered design tools",
      badge: "Creative",
      image: creativeDesign,
      templates: ["Logo Design", "Brand Identity", "Illustration", "Digital Art"]
    },
    {
      title: "Audio Processing",
      description: "Generate music, voiceovers, and process audio with AI",
      badge: "Audio",
      image: audioProcessing,
      templates: ["Background Music", "Voiceover", "Sound Effects", "Podcast Intro"]
    },
    {
      title: "Text Generation",
      description: "Create compelling content, documents, and copy instantly",
      badge: "Text Processing",
      image: textGeneration,
      templates: ["Blog Post", "Product Description", "Ad Copy", "Email Template"]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header with Start Custom Creation */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <h2 className="text-4xl md:text-5xl font-black">WHAT YOU CAN CREATE</h2>
            <p className="text-lg text-foreground/80 font-medium">
              Professional-grade AI tools for every creative need—no experience required
            </p>
          </div>
          <Button
            size="lg"
            className="brutal-card bg-gradient-to-r from-primary to-purple-600 text-white hover:from-primary/90 hover:to-purple-600/90 px-8 py-6 text-lg font-black shadow-lg hover:shadow-xl transition-all"
            onClick={() => {
              const customSection = document.getElementById('custom-creation');
              if (customSection) {
                customSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            <Sparkles className="h-6 w-6 mr-2" />
            START CUSTOM CREATION
          </Button>
        </div>

        {/* Category Carousels */}
        <div className="space-y-8 mb-12">
            {categories.map((category, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black">{category.title}</h3>
                  <Badge className="bg-neon-yellow text-foreground border-2 border-black">
                    {category.badge}
                  </Badge>
                </div>
                
                <Carousel className="w-full">
                  <CarouselContent className="-ml-2 md:-ml-4">
                    {/* Main Category Card */}
                    <CarouselItem className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                      <Card className="brutal-card hover-lift h-full">
                        <div className="relative h-48 overflow-hidden">
                          <img 
                            src={category.image} 
                            alt={category.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 right-3 bg-neon-yellow px-3 py-1 rounded-full border-2 border-black text-xs font-black">
                            {category.badge}
                          </div>
                        </div>
                        <CardContent className="p-6 space-y-2">
                          <h4 className="text-lg font-black">{category.title}</h4>
                          <p className="text-foreground/80 font-medium text-sm">{category.description}</p>
                          <Button 
                            className="w-full mt-4 bg-primary hover:bg-primary/90 text-white font-black"
                            onClick={() => {
                              setContentType(category.badge.includes('Video') ? 'video' : category.badge.includes('Audio') ? 'music' : category.badge.includes('Text') ? 'text' : 'image');
                              const customSection = document.getElementById('custom-creation');
                              if (customSection) {
                                customSection.scrollIntoView({ behavior: 'smooth' });
                              }
                            }}
                          >
                            Start Creating
                          </Button>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                    
                    {/* Template Cards */}
                    {category.templates.map((template, templateIndex) => (
                      <CarouselItem key={templateIndex} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                        <Card className="brutal-card-sm hover-lift h-full cursor-pointer" onClick={() => {
                          setPrompt(`Create ${template.toLowerCase()} style ${category.title.toLowerCase()}`);
                          setContentType(category.badge.includes('Video') ? 'video' : category.badge.includes('Audio') ? 'music' : category.badge.includes('Text') ? 'text' : 'image');
                          const customSection = document.getElementById('custom-creation');
                          if (customSection) {
                            customSection.scrollIntoView({ behavior: 'smooth' });
                          }
                          toast.success(`Template "${template}" loaded!`);
                        }}>
                          <CardContent className="p-6 space-y-3 h-full flex flex-col">
                            <div className="flex-1">
                              <h5 className="text-base font-black mb-2">{template}</h5>
                              <p className="text-sm text-foreground/70">Click to use this template</p>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                              <Sparkles className="h-5 w-5 text-primary" />
                              <span className="text-xs font-bold text-muted-foreground">TEMPLATE</span>
                            </div>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="brutal-shadow" />
                  <CarouselNext className="brutal-shadow" />
                </Carousel>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Creation Section */}
        <div id="custom-creation" className="scroll-mt-8">
          <div className="border-t-4 border-black my-12"></div>
          
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-black mb-2">CUSTOM CREATION STUDIO</h2>
            <p className="text-foreground/80 font-medium">
              Fine-tune every detail with advanced controls
            </p>
          </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* Input Panel */}
          <Card className="bg-card border">
            <div className="border-b px-6 py-4 bg-muted/30">
              <h3 className="text-lg font-bold">Input</h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Content Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Content Type</label>
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant={contentType === "image" ? "default" : "outline"}
                    onClick={() => setContentType("image")}
                    className={contentType === "image" ? "bg-blue-500 hover:bg-blue-600 text-white" : ""}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Image
                  </Button>
                  <Button
                    variant={contentType === "video" ? "default" : "outline"}
                    onClick={() => setContentType("video")}
                    className={contentType === "video" ? "bg-purple-500 hover:bg-purple-600 text-white" : ""}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Video
                  </Button>
                  <Button
                    variant={contentType === "music" ? "default" : "outline"}
                    onClick={() => setContentType("music")}
                    className={contentType === "music" ? "bg-pink-500 hover:bg-pink-600 text-white" : ""}
                  >
                    🎵 Music
                  </Button>
                  <Button
                    variant={contentType === "text" ? "default" : "outline"}
                    onClick={() => setContentType("text")}
                    className={contentType === "text" ? "bg-green-500 hover:bg-green-600 text-white" : ""}
                  >
                    💬 Text
                  </Button>
                </div>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    prompt <span className="text-destructive">*</span>
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEnhancePrompt}
                    disabled={isEnhancing || !prompt}
                    className="h-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    {isEnhancing ? "Enhancing..." : "Enhance"}
                  </Button>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="turn this photo into a character figure. Behind it, place a box with the character's image printed on it, and a computer showing the Blender modeling process on its screen..."
                  className="min-h-[120px] resize-none"
                />
                <p className="text-xs text-muted-foreground">Describe what you want to create</p>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    image_urls <span className="text-destructive">*</span>
                  </label>
                  {uploadedImages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadedImages([])}
                      className="h-8 text-muted-foreground hover:text-foreground"
                    >
                      Remove All
                    </Button>
                  )}
                </div>

                {uploadedImages.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm flex-1">File {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeImage(index)}
                      className="h-8 text-muted-foreground hover:text-foreground"
                    >
                      Remove
                    </Button>
                    <div className="w-24 h-24 border rounded-lg overflow-hidden bg-muted">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ))}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadedImages.length >= 10}
                  className="w-full border-dashed"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Add more files ({uploadedImages.length}/10)
                </Button>

                <p className="text-xs text-muted-foreground">
                  List of URLs of input images for editing, up to 10 images.
                </p>
              </div>

              {/* Output Format */}
              <div className="space-y-2">
                <label className="text-sm font-medium">output_format</label>
                <div className="flex gap-2">
                  <Button
                    variant={outputFormat === "PNG" ? "default" : "outline"}
                    onClick={() => setOutputFormat("PNG")}
                    className={outputFormat === "PNG" ? "flex-1 bg-blue-500 hover:bg-blue-600 text-white" : "flex-1"}
                  >
                    PNG
                  </Button>
                  <Button
                    variant={outputFormat === "JPEG" ? "default" : "outline"}
                    onClick={() => setOutputFormat("JPEG")}
                    className={outputFormat === "JPEG" ? "flex-1 bg-purple-500 hover:bg-purple-600 text-white" : "flex-1"}
                  >
                    JPEG
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Output format for the images</p>
              </div>

              {/* Resolution */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Resolution</label>
                <div className="flex gap-2">
                  <Button
                    variant={resolution === "Native" ? "default" : "outline"}
                    onClick={() => setResolution("Native")}
                    className={resolution === "Native" ? "flex-1 bg-green-500 hover:bg-green-600 text-white" : "flex-1"}
                  >
                    Native
                  </Button>
                  <Button
                    variant={resolution === "HD" ? "default" : "outline"}
                    onClick={() => setResolution("HD")}
                    className={resolution === "HD" ? "flex-1 bg-orange-500 hover:bg-orange-600 text-white" : "flex-1"}
                  >
                    HD
                  </Button>
                </div>
              </div>

              {/* Theme Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {["realistic", "artistic", "anime", "abstract", "cyberpunk", "fantasy"].map((t) => (
                    <Button
                      key={t}
                      variant={theme === t ? "default" : "outline"}
                      onClick={() => setTheme(t)}
                      className={theme === t ? "capitalize" : "capitalize"}
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
                  <p className="text-xs text-muted-foreground">Add your brand style to outputs (+25 tokens)</p>
                </div>
                <Button
                  variant={applyBrand ? "default" : "outline"}
                  size="sm"
                  onClick={() => setApplyBrand(!applyBrand)}
                  className={applyBrand ? "bg-indigo-500 hover:bg-indigo-600 text-white" : ""}
                >
                  {applyBrand ? "Enabled" : "Disabled"}
                </Button>
              </div>

              {/* Token Cost Display */}
              <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Estimated Cost</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-primary">{estimatedTokens}</div>
                    <div className="text-xs text-muted-foreground">tokens</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={handleReset} className="flex-1">
                  Reset
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={!prompt || isGenerating}
                  className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isGenerating ? "Generating..." : "Run"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Output Panel */}
          <Card className="bg-card border">
            <div className="border-b px-6 py-4 bg-muted/30">
              <h3 className="text-lg font-bold">Output</h3>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-muted-foreground mr-2">output type</span>
                  <Badge variant="secondary">image</Badge>
                </div>

                <div className="border rounded-lg overflow-hidden bg-muted/30 aspect-[4/3] flex items-center justify-center">
                  {generatedOutput ? (
                    <img
                      src={generatedOutput}
                      alt="Generated output"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Output will appear here</p>
                    </div>
                  )}
                </div>

                {generatedOutput && (
                  <div className="flex gap-3 justify-end">
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = generatedOutput;
                        link.download = `artifio-${Date.now()}.${outputFormat.toLowerCase()}`;
                        link.click();
                        toast.success("Image downloaded!");
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button size="sm" variant="outline">
                      <History className="h-4 w-4 mr-2" />
                      View full history
                     </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Create;
