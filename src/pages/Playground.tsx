import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ImageIcon, X, Upload, Coins, LogOut, Sparkles, Download, History, Play } from "lucide-react";

import { SessionWarning } from "@/components/SessionWarning";
import { logger } from "@/lib/logger";

const Playground = () => {
  const navigate = useNavigate();
  const { user, session, loading } = useAuth();
  const [tokensRemaining, setTokensRemaining] = useState(0);
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

  useEffect(() => {
    if (!loading && !session) {
      navigate("/auth");
      return;
    }
    if (user) {
      fetchTokenBalance(user.id);
    }
  }, [user, session, loading, navigate]);

  // Add structured data for Playground
  useEffect(() => {
    const webAppSchema = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Artifio.ai Playground",
      "applicationCategory": "MultimediaApplication",
      "description": "AI-powered creative playground for generating videos, images, music, and text content.",
      "url": "https://artifio.ai/playground",
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Start with 5 free credits"
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
          "name": "Playground",
          "item": "https://artifio.ai/playground"
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

    document.title = "Playground - Artifio.ai | Create AI Content Now";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Create stunning AI-generated videos, images, music, and text in the Artifio.ai Playground. Start creating with 5 free credits.');
    }

    return () => {
      scriptElements.forEach(script => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
    };
  }, []);

  const fetchTokenBalance = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("tokens_remaining")
      .eq("user_id", userId)
      .single();

    if (error) {
      logger.error("Error fetching tokens", error instanceof Error ? error : new Error(String(error)), {
        component: 'Playground',
        operation: 'fetchTokenBalance',
        userId
      });
      return;
    }
    setTokensRemaining(data?.tokens_remaining || 0);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-primary border-3 border-black brutal-shadow flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <p className="text-lg font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="relative z-10">
        <SessionWarning />
        
        {/* Header */}
        <header className="border-b-4 border-black bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="h-10 w-10 rounded-xl bg-gradient-primary border-3 border-black brutal-shadow flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-black gradient-text">ARTIFIO.AI</h1>
            </Link>
            <div className="flex items-center gap-4">
              <div className="brutal-card-sm px-4 py-2 bg-neon-yellow">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-black" />
                  <span className="font-black text-black">{tokensRemaining} credits</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
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
                    disabled={!prompt || isGenerating || tokensRemaining < estimatedTokens}
                    className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isGenerating ? "Generating..." : "Run"}
                  </Button>
                </div>

                {tokensRemaining < estimatedTokens && (
                  <div className="text-center p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="text-sm text-destructive font-bold">
                      ⚠️ Not enough tokens. Need {estimatedTokens} but have {tokensRemaining}
                    </p>
                  </div>
                )}
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

          {/* Example Gallery */}
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-xl font-black mb-1">COMMUNITY CREATIONS</h3>
              <p className="text-sm text-muted-foreground">See what others have created with Artifio.ai</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {exampleImages.map((example, index) => (
                <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-square bg-muted overflow-hidden">
                    <img
                      src={example.image}
                      alt={example.prompt}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-2 space-y-1">
                    <p className="text-xs font-medium line-clamp-2">{example.prompt}</p>
                    <div className="flex gap-1 text-xs">
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">{example.format}</Badge>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">{example.resolution}</Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const exampleImages = [
  {
    image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=500&h=500&fit=crop",
    prompt: "A futuristic cyberpunk cityscape at night with neon lights and flying cars",
    format: "PNG",
    resolution: "HD"
  },
  {
    image: "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=500&h=500&fit=crop",
    prompt: "Portrait of a magical forest fairy with glowing wings and flowers",
    format: "PNG",
    resolution: "Native"
  },
  {
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&h=500&fit=crop",
    prompt: "Abstract geometric shapes in vibrant colors floating in space",
    format: "JPEG",
    resolution: "HD"
  },
  {
    image: "https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=500&h=500&fit=crop",
    prompt: "A serene Japanese zen garden with cherry blossoms and koi pond",
    format: "PNG",
    resolution: "HD"
  },
  {
    image: "https://images.unsplash.com/photo-1620121478247-ec786b9be2fa?w=500&h=500&fit=crop",
    prompt: "Steampunk robot character with intricate mechanical details",
    format: "PNG",
    resolution: "Native"
  },
  {
    image: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=500&h=500&fit=crop",
    prompt: "Cosmic nebula with swirling galaxies and stars in deep space",
    format: "JPEG",
    resolution: "HD"
  }
];

export default Playground;
