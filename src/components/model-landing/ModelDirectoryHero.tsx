
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Image, Video, Music, User } from "lucide-react";

interface ModelDirectoryHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  totalModels: number;
}

const categories = [
  { id: "all", label: "All Models", icon: Sparkles },
  { id: "image", label: "Image", icon: Image },
  { id: "video", label: "Video", icon: Video },
  { id: "audio", label: "Audio", icon: Music },
  { id: "avatar", label: "Avatar", icon: User },
];

export function ModelDirectoryHero({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  totalModels,
}: ModelDirectoryHeroProps) {
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

      <div className="container max-w-4xl mx-auto px-4 relative">
        <div className="text-center space-y-8">
          {/* Badge */}
          <Badge variant="secondary" className="gap-2 px-4 py-2">
            <Sparkles className="w-4 h-4" />
            {totalModels}+ Premium AI Models
          </Badge>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            Explore AI Models
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover the most powerful AI models for image, video, audio, and avatar generation. 
            All accessible through one platform.
          </p>

          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search models by name or provider..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-12 h-14 text-lg rounded-full border-2"
            />
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => onCategoryChange(category.id)}
                className="gap-2 rounded-full"
              >
                <category.icon className="w-4 h-4" />
                {category.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
