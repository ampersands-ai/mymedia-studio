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
  return (
    <AnimatedSection delay={index * 100}>
      <div className="group relative aspect-video bg-white/5 overflow-hidden cursor-pointer">
        <video
          src={item.videoSrc}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          muted
          loop
          playsInline
          onMouseEnter={(e) => e.currentTarget.play()}
          onMouseLeave={(e) => {
            e.currentTarget.pause();
            e.currentTarget.currentTime = 0;
          }}
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <span className="text-xs font-medium uppercase tracking-wider text-red-500 mb-2 block">
            {item.category}
          </span>
          <h3 className="text-xl font-bold text-white">{item.title}</h3>
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
            <span className="text-sm font-medium uppercase tracking-widest text-red-600 mb-4 block">
              Portfolio
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight">
              Featured Work
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
