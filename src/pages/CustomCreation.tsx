import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ImageIcon, Upload, Coins, Sparkles, Download, History, Play } from "lucide-react";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exampleImages = [
    {
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop",
      prompt: "Abstract art with vibrant colors and geometric shapes",
      contentType: "image",
      resolution: "HD",
      theme: "abstract",
      tokens: 75
    },
    {
      image: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=400&h=400&fit=crop",
      prompt: "Futuristic cyberpunk cityscape with neon lights",
      contentType: "image",
      resolution: "HD",
      theme: "cyberpunk",
      tokens: 80
    },
    {
      image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=400&fit=crop",
      prompt: "Fantasy dragon in mystical forest with magical atmosphere",
      contentType: "image",
      resolution: "Native",
      theme: "fantasy",
      tokens: 65
    },
    {
      image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=400&fit=crop",
      prompt: "Anime character portrait with detailed background",
      contentType: "image",
      resolution: "HD",
      theme: "anime",
      tokens: 70
    },
    {
      image: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=400&h=400&fit=crop",
      prompt: "Photorealistic portrait with natural lighting",
      contentType: "image",
      resolution: "Native",
      theme: "realistic",
      tokens: 55
    },
    {
      image: "https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=400&h=400&fit=crop",
      prompt: "Artistic landscape painting with bold brushstrokes",
      contentType: "image",
      resolution: "Native",
      theme: "artistic",
      tokens: 60
    }
  ];

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
    
    // Validate each file before adding
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
    // Validation
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

    // Check for uploaded images file size
    for (const image of uploadedImages) {
      if (image.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`Image "${image.name}" is too large. Maximum size is 10MB.`);
        return;
      }
      
      // Check file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(image.type)) {
        toast.error(`Invalid file type for "${image.name}". Only JPEG, PNG, and WebP are supported.`);
        return;
      }
    }
    
    setIsGenerating(true);
    try {
      // TODO: Implement actual generation with token deduction
      // const tokensNeeded = calculateTokens();
      // await supabase.functions.invoke('deduct-tokens', {
      //   body: { tokens_to_deduct: tokensNeeded }
      // });
      
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

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
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

        {/* Community Creations Section */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-black mb-2">COMMUNITY CREATIONS</h2>
            <p className="text-foreground/80 font-medium">
              Get inspired by what others have created
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {exampleImages.map((example, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="aspect-square overflow-hidden bg-muted">
                  <img
                    src={example.image}
                    alt={example.prompt}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-xs font-medium line-clamp-2">{example.prompt}</p>
                  
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {example.contentType}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {example.resolution}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between pt-1.5 border-t">
                    <div className="flex items-center gap-1 text-primary">
                      <Coins className="h-3 w-3" />
                      <span className="text-xs font-bold">{example.tokens}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setPrompt(example.prompt);
                        setContentType(example.contentType as typeof contentType);
                        setResolution(example.resolution as typeof resolution);
                        setTheme(example.theme);
                        toast.success("Settings loaded!");
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-[10px] h-6 px-2"
                    >
                      Use
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomCreation;
