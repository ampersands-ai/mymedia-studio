import { Video } from "lucide-react";
import { FeatureChapter } from "../FeatureChapter";
import { FeatureCard } from "../FeatureCard";
import { GradientBackground } from "../effects";
import { videoModels } from "@/data/features-showcase";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export const ChapterVideoGeneration = () => {
  const { ref, inView } = useScrollReveal({ threshold: 0.1 });

  return (
    <FeatureChapter
      id="video"
      title="Video Generation"
      subtitle="From script to screen in seconds. 7 world-class models."
      background={<GradientBackground />}
    >
      <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {videoModels.map((model, index) => (
          <FeatureCard
            key={model.id}
            name={model.name}
            provider={model.provider}
            description={model.description}
            icon={Video}
            delay={index}
            inView={inView}
          />
        ))}
      </div>
    </FeatureChapter>
  );
};
