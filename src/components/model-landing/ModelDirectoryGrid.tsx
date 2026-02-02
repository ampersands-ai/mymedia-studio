import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
import type { ModelPage } from "@/hooks/useModelPages";
import { getDisplayProvider, getProviderLogo } from "@/lib/utils/provider-display";

interface ModelDirectoryGridProps {
  models: ModelPage[];
  isLoading?: boolean;
}

export function ModelDirectoryGrid({ models, isLoading }: ModelDirectoryGridProps) {
  const navigate = useNavigate();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "image": return "🖼️";
      case "video": return "🎬";
      case "audio": return "🎵";
      case "avatar": return "🎭";
      default: return "✨";
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i} className="overflow-hidden animate-pulse">
            <div className="aspect-[4/3] bg-muted" />
            <CardContent className="p-3 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg mb-4">
          No models found matching your criteria.
        </p>
        <Button variant="outline" onClick={() => navigate("/models")}>
          Clear Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {models.map((model) => {
        const displayProvider = model.display_provider || getDisplayProvider(model.provider);
        const logoPath = getProviderLogo(displayProvider);
        
        return (
          <Card
            key={model.id}
            className="group overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border hover:border-primary/30"
            onClick={() => navigate(`/models/${model.slug}`)}
          >
            {/* Logo as main image */}
            <div className="aspect-[4/3] relative overflow-hidden bg-white border-b">
              <div className="w-full h-full flex items-center justify-center p-6">
                <img
                  src={logoPath}
                  alt={model.model_name}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-md"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = '/logos/artifio.png';
                  }}
                />
              </div>

              {/* Badges */}
              <div className="absolute top-1.5 left-1.5">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                  {getCategoryIcon(model.category)} {model.category}
                </Badge>
              </div>

              {model.is_featured && (
                <Badge className="absolute top-1.5 right-1.5 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 gap-0.5">
                  <Star className="w-2.5 h-2.5" />
                  Featured
                </Badge>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                  Learn More
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <CardContent className="p-3 space-y-1.5">
              <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">
                {model.model_name}
              </h3>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-5 h-5 rounded bg-white p-0.5 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <img
                    src={logoPath}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = '/logos/artifio.png';
                    }}
                  />
                </div>
                <span className="truncate">by {displayProvider}</span>
              </div>

              {model.tagline && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {model.tagline}
                </p>
              )}

              {/* Highlights preview - smaller */}
              {model.highlights && model.highlights.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {model.highlights.slice(0, 2).map((highlight, idx) => (
                    <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0">
                      {highlight.title}
                    </Badge>
                  ))}
                  {model.highlights.length > 2 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      +{model.highlights.length - 2}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
