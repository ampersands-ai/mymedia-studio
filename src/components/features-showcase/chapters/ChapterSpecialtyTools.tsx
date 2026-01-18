import { Wand2 } from "lucide-react";
import { FeatureChapter } from "../FeatureChapter";
import { FeatureCard } from "../FeatureCard";
import { specialtyTools } from "@/data/features-showcase";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export const ChapterSpecialtyTools = () => {
  const { ref, inView } = useScrollReveal({ threshold: 0.1 });

  // Separate hero tool from regular tools
  const heroTool = specialtyTools.find((t) => t.isHero);
  const regularTools = specialtyTools.filter((t) => !t.isHero);

  return (
    <FeatureChapter
      id="tools"
      title="Specialty Tools"
      subtitle="Built for creators who ship daily."
      background={
        <div className="absolute inset-0">
          {/* Split gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-black to-primary-orange/10" />
          <div className="absolute inset-0 bg-black/60" />
        </div>
      }
    >
      <div ref={ref} className="max-w-5xl mx-auto space-y-6">
        {/* Hero Card - Faceless Video */}
        {heroTool && (
          <FeatureCard
            name={heroTool.name}
            description={heroTool.description}
            features={heroTool.features}
            icon={Wand2}
            delay={0}
            isHero
            inView={inView}
          />
        )}

        {/* Regular Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {regularTools.map((tool, index) => (
            <FeatureCard
              key={tool.id}
              name={tool.name}
              description={tool.description}
              features={tool.features}
              icon={Wand2}
              delay={index + 1}
              inView={inView}
            />
          ))}
        </div>
      </div>
    </FeatureChapter>
  );
};
