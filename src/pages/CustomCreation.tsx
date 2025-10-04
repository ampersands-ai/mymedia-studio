import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ImageIcon, Upload, Coins, Sparkles, Download, History, Play, ArrowLeft } from "lucide-react";

const CustomCreation = () => {
  const navigate = useNavigate();
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
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/create')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-black mb-2">CUSTOM CREATION STUDIO</h2>
            <p className="text-foreground/80 font-medium">
              Fine-tune every detail with advanced controls
            </p>
          </div>
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

export default CustomCreation;
