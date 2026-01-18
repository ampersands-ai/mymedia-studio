import { motion } from "framer-motion";
import { chapters } from "@/data/features-showcase";
import { useChapterProgress } from "@/hooks/useChapterProgress";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface ScrollProgressProps {
  showHero?: boolean;
  showCTA?: boolean;
}

export const ScrollProgress = ({ showHero = true, showCTA = true }: ScrollProgressProps) => {
  const { activeChapter, scrollToChapter } = useChapterProgress();
  const prefersReducedMotion = usePrefersReducedMotion();

  // Filter chapters based on what's actually shown
  const visibleChapters = chapters.filter((chapter) => {
    if (chapter.id === "intro" && !showHero) return false;
    if (chapter.id === "cta" && !showCTA) return false;
    return true;
  });

  const activeIndex = visibleChapters.findIndex((c) => c.id === activeChapter);
  const isOnCTA = activeChapter === "cta";

  return (
    <motion.div
      className="fixed right-8 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col items-center"
      initial={prefersReducedMotion ? false : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 1 }}
    >
      <div className="relative flex flex-col items-center gap-0">
        {visibleChapters.map((chapter, index) => {
          const isActive = activeChapter === chapter.id;
          const isPast = activeIndex > index;
          const isLast = index === visibleChapters.length - 1;

          return (
            <div key={chapter.id} className="flex flex-col items-center">
              {/* Dot */}
              <button
                onClick={() => scrollToChapter(chapter.id)}
                className="relative z-10 group flex items-center gap-3"
                aria-label={`Go to ${chapter.title}`}
              >
                <motion.div
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-primary-orange scale-150"
                      : isPast
                      ? "bg-white/50"
                      : "bg-white/20"
                  }`}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.5 }}
                />

                {/* Label for last item (CTA) */}
                {isLast && showCTA && (
                  <span
                    className={`text-xs font-medium whitespace-nowrap transition-all duration-300 ${
                      isOnCTA
                        ? "opacity-100 text-primary-orange"
                        : "opacity-0 group-hover:opacity-100 text-white/60"
                    }`}
                  >
                    Get Started
                  </span>
                )}
              </button>

              {/* Connecting line (not after last item) */}
              {!isLast && (
                <div
                  className={`w-px h-6 transition-colors duration-300 ${
                    isPast ? "bg-white/30" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
