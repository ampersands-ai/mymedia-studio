import { Image } from "lucide-react";
import { FeatureChapter } from "../FeatureChapter";
import { FeatureCard } from "../FeatureCard";
import { MorphingGallery } from "../effects";
import { imageModels } from "@/data/features-showcase";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export const ChapterImageCreation = () => {
  const { ref, inView } = useScrollReveal({ threshold: 0.1 });

  return (
    <FeatureChapter
      id="image"
      title="Image Creation"
      subtitle="Photorealistic. Artistic. Impossible."
      background={
        <>
          <MorphingGallery />
          <div className="absolute inset-0 bg-black/70" />
        </>
      }
    >
      <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {imageModels.map((model, index) => (
          <FeatureCard
            key={model.id}
            name={model.name}
            provider={model.provider}
            description={model.description}
            icon={Image}
            delay={index}
            inView={inView}
          />
        ))}
      </div>
    </FeatureChapter>
  );
};
