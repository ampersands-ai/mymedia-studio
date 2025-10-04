import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
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
  const navigate = useNavigate();

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
            onClick={() => navigate('/dashboard/custom-creation')}
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
                  <CarouselContent className="-ml-2 md:-ml-3">
                    {/* Main Category Card */}
                    <CarouselItem className="pl-2 md:pl-3 basis-1/2 md:basis-1/3 lg:basis-1/4">
                      <Card className="brutal-card hover-lift h-full">
                        <div className="relative h-32 overflow-hidden">
                          <img 
                            src={category.image} 
                            alt={category.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2 bg-neon-yellow px-2 py-0.5 rounded-full border-2 border-black text-xs font-black">
                            {category.badge}
                          </div>
                        </div>
                        <CardContent className="p-3 space-y-2">
                          <h4 className="text-lg font-black">{category.title}</h4>
                          <p className="text-foreground/80 font-medium text-sm line-clamp-2">{category.description}</p>
                          <Button 
                            className="w-full mt-2 bg-primary hover:bg-primary/90 text-white font-black text-sm"
                            onClick={() => navigate('/dashboard/custom-creation')}
                          >
                            Start Creating
                          </Button>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                    
                    {/* Template Cards */}
                    {category.templates.map((template, templateIndex) => (
                      <CarouselItem key={templateIndex} className="pl-2 md:pl-3 basis-1/2 md:basis-1/3 lg:basis-1/4">
                        <Card className="brutal-card-sm hover-lift h-full cursor-pointer" onClick={() => {
                          navigate('/dashboard/custom-creation');
                          toast.success(`Template "${template}" selected!`);
                        }}>
                          <CardContent className="p-3 space-y-2 h-full flex flex-col justify-between">
                            <div>
                              <h5 className="text-base font-black mb-1">{template}</h5>
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
    </div>
  );
};

export default Create;
