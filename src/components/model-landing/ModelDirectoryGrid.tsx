import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
import type { ModelPage } from "@/hooks/useModelPages";
import { getDisplayProvider } from "@/lib/utils/provider-display";

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
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden animate-pulse">
            <div className="aspect-video bg-muted" />
            <CardContent className="p-4 space-y-3">
              <div className="h-6 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-full" />
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
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {models.map((model) => (
        <Card
          key={model.id}
          className="group overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/30"
          onClick={() => navigate(`/models/${model.slug}`)}
        >
          {/* Image */}
          <div className="aspect-video relative overflow-hidden bg-muted">
            {model.hero_image_url ? (
              <img
                src={model.hero_image_url}
                alt={model.model_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                <span className="text-5xl">{getCategoryIcon(model.category)}</span>
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-2 left-2 flex gap-2">
              <Badge variant="secondary">
                {getCategoryIcon(model.category)} {model.category}
              </Badge>
            </div>

            {model.is_featured && (
              <Badge className="absolute top-2 right-2 bg-amber-500 text-white gap-1">
                <Star className="w-3 h-3" />
                Featured
              </Badge>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button variant="secondary" className="gap-2">
                Learn More
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-lg group-hover:text-primary transition-colors line-clamp-1">
                {model.model_name}
              </h3>
            </div>

            <p className="text-sm text-muted-foreground">
              by {getDisplayProvider(model.provider)}
            </p>

            {model.tagline && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {model.tagline}
              </p>
            )}

            {/* Highlights preview */}
            {model.highlights && model.highlights.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {model.highlights.slice(0, 3).map((highlight, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {highlight.title}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
