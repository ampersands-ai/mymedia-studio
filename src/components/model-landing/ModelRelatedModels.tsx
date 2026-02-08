import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

interface RelatedModel {
  id: string;
  slug: string;
  model_name: string;
  provider: string;
  category: string;
  tagline: string | null;
  hero_image_url: string | null;
}

interface ModelRelatedModelsProps {
  relatedModels: RelatedModel[] | null;
  currentModelName?: string;
}

export function ModelRelatedModels({ relatedModels }: ModelRelatedModelsProps) {
  const router = useRouter();

  if (!relatedModels || relatedModels.length === 0) return null;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "image": return "🖼️";
      case "video": return "🎬";
      case "audio": return "🎵";
      case "avatar": return "🎭";
      default: return "✨";
    }
  };

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="container max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Related Models</h2>
            <p className="text-muted-foreground">
              More AI models you might like
            </p>
          </div>
          <Badge 
            variant="outline" 
            className="cursor-pointer hover:bg-muted"
            onClick={() => router.push("/models")}
          >
            View All
            <ArrowRight className="w-3 h-3 ml-1" />
          </Badge>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {relatedModels.slice(0, 6).map((model) => (
            <Card
              key={model.id}
              className="group overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              onClick={() => router.push(`/models/${model.slug}`)}
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
                    <span className="text-4xl">{getCategoryIcon(model.category)}</span>
                  </div>
                )}
                
                {/* Category badge */}
                <Badge 
                  variant="secondary" 
                  className="absolute top-2 right-2"
                >
                  {getCategoryIcon(model.category)} {model.category}
                </Badge>
              </div>

              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                    {model.model_name}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  by {model.provider}
                </p>
                {model.tagline && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {model.tagline}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
