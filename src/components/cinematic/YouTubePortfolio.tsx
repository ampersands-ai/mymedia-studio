import { useState } from "react";
import { Play } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";

interface PortfolioItem {
  id: string;
  youtubeId: string;
  title: string;
  category: string;
}

const portfolioItems: PortfolioItem[] = [
  {
    id: "1",
    youtubeId: "dQw4w9WgXcQ",
    title: "Brand Film",
    category: "Commercial",
  },
  {
    id: "2",
    youtubeId: "L_jWHffIx5E",
    title: "Product Launch",
    category: "Marketing",
  },
  {
    id: "3",
    youtubeId: "fJ9rUzIMcZQ",
    title: "Documentary",
    category: "Film",
  },
  {
    id: "4",
    youtubeId: "9bZkp7q19f0",
    title: "Music Video",
    category: "Entertainment",
  },
  {
    id: "5",
    youtubeId: "kJQP7kiw5Fk",
    title: "Event Coverage",
    category: "Corporate",
  },
  {
    id: "6",
    youtubeId: "RgKAFK5djSk",
    title: "Short Film",
    category: "Cinematic",
  },
];

const YouTubeCard = ({ item, index }: { item: PortfolioItem; index: number }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <AnimatedSection delay={index * 100}>
      <div className="group relative aspect-video bg-neutral-900 rounded-lg overflow-hidden">
        {isPlaying ? (
          <iframe
            src={`https://www.youtube.com/embed/${item.youtubeId}?autoplay=1&rel=0`}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <>
            {/* Thumbnail */}
            <img
              src={`https://img.youtube.com/vi/${item.youtubeId}/maxresdefault.jpg`}
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />

            {/* Play Button */}
            <button
              onClick={() => setIsPlaying(true)}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 text-black ml-1" fill="currentColor" />
              </div>
            </button>

            {/* Info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-xs text-white/60 uppercase tracking-wider mb-1">
                {item.category}
              </p>
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
            </div>
          </>
        )}
      </div>
    </AnimatedSection>
  );
};

export const YouTubePortfolio = () => {
  return (
    <section id="portfolio" className="py-24 md:py-32 bg-black">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <AnimatedSection className="text-center mb-16">
          <p className="text-sm text-white/60 uppercase tracking-widest mb-4">
            Selected Works
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Our Portfolio
          </h2>
        </AnimatedSection>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolioItems.map((item, index) => (
            <YouTubeCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
