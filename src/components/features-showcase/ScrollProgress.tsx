import { motion } from "framer-motion";
import { chapters } from "@/data/features-showcase";
import { useChapterProgress } from "@/hooks/useChapterProgress";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export const ScrollProgress = () => {
  const { activeChapter, scrollToChapter } = useChapterProgress();
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      className="fixed right-6 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col items-center gap-4"
      initial={prefersReducedMotion ? false : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 1 }}
    >
      {/* Vertical line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 -translate-x-1/2" />

      {chapters.map((chapter, index) => {
        const isActive = activeChapter === chapter.id;
        const isPast = chapters.findIndex((c) => c.id === activeChapter) > index;

        return (
          <button
            key={chapter.id}
            onClick={() => scrollToChapter(chapter.id)}
            className="relative z-10 group flex items-center gap-3"
            aria-label={`Go to ${chapter.title}`}
          >
            {/* Dot */}
            <motion.div
              className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                isActive
                  ? "bg-primary-orange border-primary-orange scale-125"
                  : isPast
                  ? "bg-white/40 border-white/40"
                  : "bg-transparent border-white/30 group-hover:border-white/60"
              }`}
              whileHover={prefersReducedMotion ? {} : { scale: 1.3 }}
            />

            {/* Label (on hover) */}
            <span
              className={`text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "opacity-100 text-primary-orange"
                  : "opacity-0 group-hover:opacity-100 text-white/60"
              }`}
            >
              {chapter.title}
            </span>
          </button>
        );
      })}
    </motion.div>
  );
};
