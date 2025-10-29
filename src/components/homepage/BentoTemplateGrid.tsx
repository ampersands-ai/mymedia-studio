import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { OptimizedVideo } from "@/components/ui/optimized-video";
import { GlassCard } from "@/components/ui/glass-card";

interface TemplateCard {
  id: string;
  title: string;
  description: string;
  videoPlaceholder: string;
  emoji: string;
  badges: Array<{ text: string; color: string }>;
  gridClass: string;
  gradientFrom: string;
  gradientTo: string;
}

const templateCards: TemplateCard[] = [
  {
    id: "product-marketing",
    title: "Product Marketing",
    description: "Phone mockups → Glossy ad videos",
    videoPlaceholder: "10-sec product mockup video",
    emoji: "📱",
    badges: [
      { text: "60 seconds", color: "bg-primary/20 text-primary" },
      { text: "~$0.15", color: "bg-success/20 text-success" }
    ],
    gridClass: "row-span-1 md:row-span-2 lg:row-span-2",
    gradientFrom: "from-purple-900/20",
    gradientTo: "to-pink-900/20"
  },
  {
    id: "interior-design",
    title: "Interior Design",
    description: "Room photo → 10 styled renders",
    videoPlaceholder: "Room transformation split-screen",
    emoji: "🏠",
    badges: [
      { text: "18 seconds", color: "bg-primary/20 text-primary" },
      { text: "~$0.85", color: "bg-success/20 text-success" }
    ],
    gridClass: "row-span-1",
    gradientFrom: "from-orange-900/20",
    gradientTo: "to-yellow-900/20"
  },
  {
    id: "youtube-video",
    title: "Faceless YouTube",
    description: "Script → Complete video",
    videoPlaceholder: "Script-to-video workflow",
    emoji: "🎬",
    badges: [
      { text: "90 seconds", color: "bg-primary/20 text-primary" },
      { text: "~$1.20", color: "bg-success/20 text-success" }
    ],
    gridClass: "row-span-1",
    gradientFrom: "from-red-900/20",
    gradientTo: "to-orange-900/20"
  },
  {
    id: "social-carousel",
    title: "Social Carousel",
    description: "1 product → 10 Instagram slides",
    videoPlaceholder: "Instagram carousel animation",
    emoji: "📱",
    badges: [
      { text: "30 seconds", color: "bg-primary/20 text-primary" },
      { text: "~$0.40", color: "bg-success/20 text-success" }
    ],
    gridClass: "row-span-1",
    gradientFrom: "from-pink-900/20",
    gradientTo: "to-purple-900/20"
  },
  {
    id: "model-comparison",
    title: "Model Comparison",
    description: "Test multiple AI models instantly",
    videoPlaceholder: "Side-by-side model outputs",
    emoji: "⚡",
    badges: [
      { text: "Sora 2", color: "bg-accent/20 text-accent" },
      { text: "Veo 3.1", color: "bg-secondary/20 text-secondary" }
    ],
    gridClass: "row-span-1",
    gradientFrom: "from-blue-900/20",
    gradientTo: "to-cyan-900/20"
  },
  {
    id: "workflow-automation",
    title: "Workflow Automation",
    description: "Connect → Generate → Export",
    videoPlaceholder: "n8n workflow diagram animation",
    emoji: "🔄",
    badges: [
      { text: "Save 4 hrs/project", color: "bg-primary/20 text-primary" }
    ],
    gridClass: "row-span-1",
    gradientFrom: "from-green-900/20",
    gradientTo: "to-teal-900/20"
  }
];

export const BentoTemplateGrid = () => {
  const { ref, isVisible } = useScrollAnimation({
    threshold: 0.1,
    triggerOnce: true
  });

  return (
    <section 
      ref={ref}
      className="min-h-screen bg-background py-20 px-4"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Plug & Play Templates
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choose from our curated collection of AI-powered templates designed for speed and quality
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[300px]">
          {templateCards.map((card, index) => (
            <article
              key={card.id}
              className={`${card.gridClass} transition-all duration-500 ${
                isVisible 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-10'
              }`}
              style={{
                transitionDelay: isVisible ? `${index * 100}ms` : '0ms'
              }}
            >
              <GlassCard 
                className="h-full group cursor-pointer overflow-hidden hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] transition-all duration-300"
                hover={true}
              >
                {/* Video Placeholder Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo}`}>
                  <div className="w-full h-full flex items-center justify-center p-8">
                    <div className="text-center">
                      <div className="text-6xl md:text-7xl mb-4 animate-float">
                        {card.emoji}
                      </div>
                      <p className="text-foreground/60 text-lg font-semibold mb-2">
                        PLACEHOLDER_{card.id.toUpperCase().replace(/-/g, '_')}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Replace with: {card.videoPlaceholder}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Hover Overlay - Info Panel */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/70 to-transparent translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                    {card.title}
                  </h3>
                  <p className="text-white/80 text-sm mb-4">
                    {card.description}
                  </p>
                  
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    {card.badges.map((badge, badgeIndex) => (
                      <span
                        key={badgeIndex}
                        className={`px-3 py-1 ${badge.color} rounded-full text-xs font-medium`}
                      >
                        {badge.text}
                      </span>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <button className="mt-4 w-full py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors duration-200">
                    Use Template →
                  </button>
                </div>

                {/* Hover Border Glow Effect */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none border-2 border-primary/50" />
              </GlassCard>
            </article>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className={`text-center mt-16 transition-all duration-700 delay-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <p className="text-muted-foreground mb-4">
            Can't find what you need?
          </p>
          <button className="px-8 py-3 bg-gradient-to-r from-primary via-accent to-secondary text-white rounded-lg font-semibold hover:scale-105 transition-transform duration-200 shadow-lg hover:shadow-primary/50">
            Request Custom Template
          </button>
        </div>
      </div>
    </section>
  );
};
