import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Zap } from "lucide-react";
import type { ModelPage } from "@/hooks/useModelPages";
import { getDisplayProvider } from "@/lib/utils/provider-display";

interface ModelPageHeroProps {
  modelPage: ModelPage;
  onTryModel: () => void;
}

export function ModelPageHero({ modelPage, onTryModel }: ModelPageHeroProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "image":
        return "🖼️";
      case "video":
        return "🎬";
      case "audio":
        return "🎵";
      case "avatar":
        return "🎭";
      default:
        return "✨";
    }
  };

  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      <div className="container max-w-6xl mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-6">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-sm">
                {getCategoryIcon(modelPage.category)} {modelPage.category.charAt(0).toUpperCase() + modelPage.category.slice(1)}
              </Badge>
              <Badge variant="outline" className="text-sm">
                by {modelPage.display_provider || getDisplayProvider(modelPage.provider)}
              </Badge>
              {modelPage.is_featured && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  <Zap className="w-3 h-3 mr-1" />
                  Featured
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              {modelPage.model_name}
            </h1>

            {/* Tagline */}
            {modelPage.tagline && (
              <p className="text-xl md:text-2xl text-muted-foreground">
                {modelPage.tagline}
              </p>
            )}

            {/* Pricing note */}
            {modelPage.pricing_note && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">{modelPage.pricing_note}</span>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 pt-4">
              <Button 
                size="lg" 
                onClick={onTryModel}
                className="gap-2 text-lg px-8"
              >
                Generate with {modelPage.model_name}
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => document.getElementById("samples")?.scrollIntoView({ behavior: "smooth" })}
              >
                View Examples
              </Button>
            </div>
          </div>

          {/* Hero Image/Video */}
          <div className="relative">
            {modelPage.hero_video_url ? (
              <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border/50">
                <video
                  src={modelPage.hero_video_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            ) : modelPage.hero_image_url ? (
              <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border/50">
                <img
                  src={modelPage.hero_image_url}
                  alt={`${modelPage.model_name} example`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shadow-2xl ring-1 ring-border/50">
                <div className="text-center space-y-4">
                  <div className="text-6xl">
                    {getCategoryIcon(modelPage.category)}
                  </div>
                  <p className="text-muted-foreground">
                    {modelPage.model_name}
                  </p>
                </div>
              </div>
            )}

            {/* Decorative elements */}
            <div className="absolute -z-10 -top-4 -right-4 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute -z-10 -bottom-4 -left-4 w-48 h-48 bg-secondary/20 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
