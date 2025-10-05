import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { TemplateCard } from "@/components/TemplateCard";
import { useTemplatesByCategory } from "@/hooks/useTemplates";
import { Textarea } from "@/components/ui/textarea";
import { useGeneration } from "@/hooks/useGeneration";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const Create = () => {
  const navigate = useNavigate();
  const { templatesByCategory, templates, isLoading } = useTemplatesByCategory();
  const { generate, isGenerating } = useGeneration();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [prompt, setPrompt] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setPrompt("");
    setDialogOpen(true);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    try {
      const result = await generate({
        template_id: selectedTemplate.id,
        prompt: prompt.trim(),
      });
      
      setDialogOpen(false);
      toast.success("Generation complete! Check your History.");
      navigate("/dashboard/history");
    } catch (error) {
      // Error already handled in useGeneration hook
    }
  };

  // Show empty state immediately if no templates
  if (!isLoading && (!templatesByCategory || Object.keys(templatesByCategory).length === 0)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-4xl font-black mb-4">NO TEMPLATES AVAILABLE</h2>
          <p className="text-lg text-muted-foreground">Please contact your administrator to add templates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 space-y-1">
          <h2 className="text-4xl md:text-5xl font-black">WHAT YOU CAN CREATE</h2>
          <p className="text-lg text-foreground/80 font-medium">
            Professional-grade AI tools for every creative need—no experience required
          </p>
        </div>

        {/* Category Carousels - Mobile First */}
        <div className="space-y-8 mb-12">
          {templatesByCategory && Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg md:text-xl font-black capitalize">{category}</h3>
                <Badge className="bg-neon-yellow text-foreground border-2 border-black text-xs">
                  {categoryTemplates.length} templates
                </Badge>
              </div>
              
              <Carousel 
                className="w-full"
                opts={{
                  align: "start",
                  loop: false,
                }}
              >
                <CarouselContent className="-ml-2">
                  {categoryTemplates.map((template) => (
                    <CarouselItem key={template.id} className="pl-2 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/6">
                      <Card 
                        className="brutal-card-sm hover-lift cursor-pointer overflow-hidden"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <div className="aspect-square relative overflow-hidden">
                          <TemplateCard
                            image={template.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop"}
                            alt={template.name}
                            className="w-full h-full"
                          />
                          <div className="absolute top-2 left-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-black z-10">
                            {template.ai_models?.content_type?.toUpperCase() || "AI"}
                          </div>
                        </div>
                        <CardContent className="p-2">
                          <p className="text-xs font-bold mb-1 truncate">{template.name}</p>
                          <Button 
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs h-8"
                            size="sm"
                          >
                            Use Template
                          </Button>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex brutal-shadow -left-4" />
                <CarouselNext className="hidden sm:flex brutal-shadow -right-4" />
              </Carousel>
            </div>
          ))}
        </div>

        {/* Generation Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-black">{selectedTemplate?.name}</DialogTitle>
              <DialogDescription>
                {selectedTemplate?.description || "Enter your prompt to generate content"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Prompt</label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what you want to create..."
                  className="min-h-[100px] resize-none"
                  disabled={isGenerating}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1"
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  className="flex-1"
                  disabled={isGenerating || !prompt.trim()}
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
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Create;
