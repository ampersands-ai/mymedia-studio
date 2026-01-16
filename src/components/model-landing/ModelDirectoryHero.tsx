import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles } from "lucide-react";

interface ModelDirectoryHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalModels: number;
}

export function ModelDirectoryHero({
  searchQuery,
  onSearchChange,
  totalModels,
}: ModelDirectoryHeroProps) {
  return (
    <section className="relative py-12 md:py-16 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

      <div className="container max-w-4xl mx-auto px-4 relative">
        <div className="text-center space-y-6">
          {/* Badge */}
          <Badge variant="secondary" className="gap-2 px-4 py-2">
            <Sparkles className="w-4 h-4" />
            {totalModels}+ Premium AI Models
          </Badge>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            Explore AI Models
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover the most powerful AI models for image, video, audio, and avatar generation.
          </p>

          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search models by name or provider..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-12 h-12 text-base rounded-full border-2"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
