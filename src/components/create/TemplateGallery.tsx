import { lazy, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TemplateCard } from "@/components/TemplateCard";
import type { TemplatePreview } from "@/types/templates";

// Lazy load Carousel components
const Carousel = lazy(() => import("@/components/ui/carousel").then(m => ({ default: m.Carousel })));
const CarouselContent = lazy(() => import("@/components/ui/carousel").then(m => ({ default: m.CarouselContent })));
const CarouselItem = lazy(() => import("@/components/ui/carousel").then(m => ({ default: m.CarouselItem })));
const CarouselNext = lazy(() => import("@/components/ui/carousel").then(m => ({ default: m.CarouselNext })));
const CarouselPrevious = lazy(() => import("@/components/ui/carousel").then(m => ({ default: m.CarouselPrevious })));

interface TemplateGalleryProps {
  templatesByCategory: Record<string, TemplatePreview[]> | undefined;
  onTemplateSelect: (template: TemplatePreview) => void;
  isLoading: boolean;
}

/**
 * Gallery component displaying templates organized by category
 * Uses carousels for mobile-first responsive design
 */
export const TemplateGallery = ({
  templatesByCategory,
  onTemplateSelect,
  isLoading,
}: TemplateGalleryProps) => {
  if (isLoading) {
    return (
      <div className="space-y-8 mb-12">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              <div className="h-5 w-20 bg-muted animate-pulse rounded" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {[1, 2, 3, 4].map((j) => (
                <Card key={j} className="overflow-hidden">
                  <div className="aspect-square bg-muted animate-pulse" />
                  <CardContent className="p-2">
                    <div className="h-3 bg-muted animate-pulse rounded mb-2" />
                    <div className="h-8 bg-muted animate-pulse rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!templatesByCategory || Object.keys(templatesByCategory).length === 0) {
    return null;
  }

  return (
    <div className="space-y-8 mb-12">
      {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
        <div key={category} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg md:text-xl font-black capitalize">{category}</h3>
            <Badge className="bg-neon-yellow text-black border-2 border-black text-xs">
              {categoryTemplates.length} templates
            </Badge>
          </div>
          
          <Suspense fallback={<div className="h-48 animate-pulse bg-muted rounded-xl" />}>
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
                      className="brutal-card-sm gpu-accelerated card hover-lift cursor-pointer overflow-hidden"
                      onClick={() => onTemplateSelect(template)}
                    >
                      <div className="aspect-square relative overflow-hidden">
                        <TemplateCard
                          image={template.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop"}
                          alt={template.name}
                          className="w-full h-full"
                        />
                        <div className="absolute top-2 left-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-black z-10">
                          {template.primaryContentType.toUpperCase()}
                        </div>
                      </div>
                      <CardContent className="p-2">
                        <p className="text-xs font-bold mb-1 truncate">{template.name}</p>
                        <Button 
                          className="w-full bg-primary hover:bg-primary/90 text-black font-black text-xs h-8"
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
          </Suspense>
        </div>
      ))}
    </div>
  );
};
