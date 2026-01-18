import { Film, Scissors, Subtitles, ImageIcon, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import { FeatureChapter } from "../FeatureChapter";
import { FeatureCard } from "../FeatureCard";
import { TimelineAnimation } from "../effects";
import { editorFeatures, aspectRatios } from "@/data/features-showcase";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const iconMap: Record<string, any> = {
  transitions: Scissors,
  subtitles: Subtitles,
  backgrounds: ImageIcon,
  audio: Volume2,
};

export const ChapterVideoEditor = () => {
  const { ref, inView } = useScrollReveal({ threshold: 0.1 });
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <FeatureChapter
      id="editor"
      title="Mini Video Editor"
      subtitle="Combine. Trim. Polish. Export."
      background={
        <>
          <TimelineAnimation />
          <div className="absolute inset-0 bg-black/80" />
        </>
      }
    >
      <div ref={ref} className="max-w-5xl mx-auto">
        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
          {editorFeatures.map((feature, index) => (
            <FeatureCard
              key={feature.id}
              name={feature.name}
              description={feature.description}
              icon={iconMap[feature.icon] || Film}
              delay={index}
              inView={inView}
            />
          ))}
        </div>

        {/* Aspect Ratio Badges */}
        <motion.div
          className="flex flex-wrap justify-center gap-3"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          {aspectRatios.map((ratio) => (
            <span
              key={ratio}
              className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-muted-foreground"
            >
              {ratio}
            </span>
          ))}
        </motion.div>
      </div>
    </FeatureChapter>
  );
};
