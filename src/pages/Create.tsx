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
import { TemplateCard } from "@/components/TemplateCard";
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
      title: "Image Creation",
      badge: "Image",
      prefix: "IMG",
      image: portraitHeadshots,
      templates: [
        { id: "001", name: "Portrait Headshots", image: portraitHeadshots },
        { id: "002", name: "Professional Business", image: portraitHeadshots },
        { id: "003", name: "Creative Artist", image: portraitHeadshots },
        { id: "004", name: "Corporate Executive", image: portraitHeadshots },
      ]
    },
    {
      title: "Photo Editing",
      badge: "Edit",
      prefix: "EDT",
      image: photoEditing,
      templates: [
        { id: "001", name: "Background Removal", image: photoEditing },
        { id: "002", name: "Color Enhancement", image: photoEditing },
        { id: "003", name: "Portrait Retouch", image: photoEditing },
        { id: "004", name: "Object Removal", image: photoEditing },
      ]
    },
    {
      title: "Video Generation",
      badge: "Video",
      prefix: "VID",
      image: videoCreation,
      templates: [
        { id: "001", name: "Product Demo", image: videoCreation, video: "https://videos.pexels.com/video-files/3163534/3163534-uhd_2560_1440_25fps.mp4" },
        { id: "002", name: "Social Ads", image: videoCreation, video: "https://videos.pexels.com/video-files/7579955/7579955-uhd_2560_1440_25fps.mp4" },
        { id: "003", name: "Explainer Video", image: videoCreation, video: "https://videos.pexels.com/video-files/3252036/3252036-uhd_2560_1440_25fps.mp4" },
        { id: "004", name: "Brand Story", image: videoCreation, video: "https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_25fps.mp4" },
      ]
    },
    {
      title: "Product Photography",
      badge: "Product",
      prefix: "PRD",
      image: productPhotos,
      templates: [
        { id: "001", name: "White Background", image: productPhotos },
        { id: "002", name: "Lifestyle Scene", image: productPhotos },
        { id: "003", name: "360° View", image: productPhotos },
        { id: "004", name: "Close-up Detail", image: productPhotos },
      ]
    },
    {
      title: "Social Media Content",
      badge: "Social",
      prefix: "SOC",
      image: socialMedia,
      templates: [
        { id: "001", name: "Instagram Story", image: socialMedia },
        { id: "002", name: "Facebook Post", image: socialMedia },
        { id: "003", name: "Twitter Header", image: socialMedia },
        { id: "004", name: "LinkedIn Banner", image: socialMedia },
      ]
    },
    {
      title: "Creative Design",
      badge: "Design",
      prefix: "DSN",
      image: creativeDesign,
      templates: [
        { id: "001", name: "Logo Design", image: creativeDesign },
        { id: "002", name: "Brand Identity", image: creativeDesign },
        { id: "003", name: "Illustration", image: creativeDesign },
        { id: "004", name: "Digital Art", image: creativeDesign },
      ]
    },
    {
      title: "Audio Processing",
      badge: "Audio",
      prefix: "AUD",
      image: audioProcessing,
      templates: [
        { id: "001", name: "Background Music", image: audioProcessing },
        { id: "002", name: "Voiceover", image: audioProcessing },
        { id: "003", name: "Sound Effects", image: audioProcessing },
        { id: "004", name: "Podcast Intro", image: audioProcessing },
      ]
    },
    {
      title: "Text Generation",
      badge: "Text",
      prefix: "TXT",
      image: textGeneration,
      templates: [
        { id: "001", name: "Blog Post", image: textGeneration },
        { id: "002", name: "Product Description", image: textGeneration },
        { id: "003", name: "Ad Copy", image: textGeneration },
        { id: "004", name: "Email Template", image: textGeneration },
      ]
    }
  ];

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
          {categories.map((category, index) => (
            <div key={index} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg md:text-xl font-black">{category.title}</h3>
                <Badge className="bg-neon-yellow text-foreground border-2 border-black text-xs">
                  {category.badge}
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
                  {category.templates.map((template) => (
                    <CarouselItem key={template.id} className="pl-2 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/6">
                      <Card 
                        className="brutal-card-sm hover-lift cursor-pointer overflow-hidden"
                        onClick={() => {
                          navigate('/dashboard/custom-creation');
                          toast.success(`Template ${category.prefix}-${template.id} selected!`);
                        }}
                      >
                        <div className="aspect-square relative overflow-hidden">
                          <TemplateCard
                            image={template.image}
                            video={(template as any).video}
                            alt={`Template ${category.prefix}-${template.id}`}
                            className="w-full h-full"
                          />
                          <div className="absolute top-2 left-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-black z-10">
                            {category.prefix}-{template.id}
                          </div>
                        </div>
                        <CardContent className="p-2">
                          <Button 
                            className="w-full bg-primary hover:bg-primary/90 text-white font-black text-xs h-8"
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
      </div>
    </div>
  );
};

export default Create;
