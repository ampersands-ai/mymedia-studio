import { ScrollProgress } from "./ScrollProgress";
import {
  ChapterHeroIntro,
  ChapterVideoGeneration,
  ChapterImageCreation,
  ChapterAudioVoice,
  ChapterSpecialtyTools,
  ChapterVideoEditor,
  ChapterPlatformBenefits,
  ChapterFinalCTA,
} from "./chapters";

interface FeaturesShowcaseProps {
  showHero?: boolean;
  showCTA?: boolean;
}

export const FeaturesShowcase = ({
  showHero = true,
  showCTA = true,
}: FeaturesShowcaseProps) => {
  return (
    <div className="relative bg-black text-white overflow-hidden">
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[1] opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Floating gradient orbs */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-secondary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary-orange/10 rounded-full blur-[120px]" />
      </div>

      {/* Scroll Progress Indicator */}
      <ScrollProgress />

      {/* Chapters */}
      <div className="relative z-10">
        {showHero && <ChapterHeroIntro />}
        <ChapterVideoGeneration />
        <ChapterImageCreation />
        <ChapterAudioVoice />
        <ChapterSpecialtyTools />
        <ChapterVideoEditor />
        <ChapterPlatformBenefits />
        {showCTA && <ChapterFinalCTA />}
      </div>
    </div>
  );
};
