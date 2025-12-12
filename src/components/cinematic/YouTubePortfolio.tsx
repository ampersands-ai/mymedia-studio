import { useRef } from "react";
import { AnimatedSection } from "./AnimatedSection";

interface PortfolioItem {
  id: string;
  videoSrc: string;
  title: string;
  category: string;
}

const portfolioItems: PortfolioItem[] = [
  {
    id: "1",
    videoSrc: "/hero-demo.mp4",
    title: "AI Commercial",
    category: "Video Generation",
  },
  {
    id: "2",
    videoSrc: "/hero-demo-2.mp4",
    title: "Product Showcase",
    category: "Image to Video",
  },
  {
    id: "3",
    videoSrc: "/hero-demo-3.mp4",
    title: "Brand Story",
    category: "Text to Video",
  },
  {
    id: "4",
    videoSrc: "/hero-demo-4.mp4",
    title: "Social Content",
    category: "AI Generation",
  },
  {
    id: "5",
    videoSrc: "/hero-demo-5.mp4",
    title: "Creative Campaign",
    category: "Video Production",
  },
  {
    id: "6",
    videoSrc: "/hero-demo-6.mp4",
    title: "Digital Art",
    category: "Image Generation",
  },
];

const VideoCard = ({ item, index }: { item: PortfolioItem; index: number }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleInteractionStart = () => {
    videoRef.current?.play().catch(() => {});
  };

  const handleInteractionEnd = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <AnimatedSection delay={index * 100}>
      <div 
        className="group relative aspect-video bg-white/5 overflow-hidden cursor-pointer"
        onMouseEnter={handleInteractionStart}
        onMouseLeave={handleInteractionEnd}
        onTouchStart={handleInteractionStart}
        onTouchEnd={handleInteractionEnd}
      >
        <video
          ref={videoRef}
          src={item.videoSrc}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          muted
          loop
          playsInline
          preload="metadata"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        {/* Content with frosted glass background */}
        <div className="absolute bottom-0 left-0 p-4 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
          <span className="inline-block text-xs font-medium uppercase tracking-wider text-primary-orange mb-1 backdrop-blur-md bg-black/40 rounded px-2 py-0.5 border border-white/10">
            {item.category}
          </span>
          <h3 className="inline-block text-lg font-bold text-white backdrop-blur-md bg-black/40 rounded px-2 py-1 border border-white/10">{item.title}</h3>
        </div>
      </div>
    </AnimatedSection>
  );
};

export const YouTubePortfolio = () => {
  return (
    <section id="portfolio" className="py-24 md:py-32 bg-black">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedSection>
          <div className="mb-16">
            <span className="text-sm font-medium uppercase tracking-widest text-primary-orange mb-4 block">
              Features
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight">
              What You Can Create
            </h2>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolioItems.map((item, index) => (
            <VideoCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
