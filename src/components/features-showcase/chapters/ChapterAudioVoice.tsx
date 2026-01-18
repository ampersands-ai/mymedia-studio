import { Music } from "lucide-react";
import { FeatureChapter } from "../FeatureChapter";
import { FeatureCard } from "../FeatureCard";
import { WaveformVisualizer } from "../effects";
import { audioModels } from "@/data/features-showcase";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export const ChapterAudioVoice = () => {
  const { ref, inView } = useScrollReveal({ threshold: 0.1 });

  return (
    <FeatureChapter
      id="audio"
      title="Audio & Voice"
      subtitle="Clone any voice. Generate any song."
      background={
        <>
          <WaveformVisualizer />
          <div className="absolute inset-0 bg-black/80" />
        </>
      }
    >
      <div ref={ref} className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {audioModels.map((model, index) => (
            <FeatureCard
              key={model.id}
              name={model.name}
              provider={model.provider}
              description={model.description}
              features={model.features}
              icon={Music}
              delay={index}
              inView={inView}
            />
          ))}
        </div>
      </div>
    </FeatureChapter>
  );
};
